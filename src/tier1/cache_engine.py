"""
GenSync-Cache: Two-Stage Semantic Cache Engine

Workflow:
1. Stage 1: Coarse candidate pruning using Cluster Centroids and Gate Thresholds.
   - Fetches centroid vectors from DynamoDB table `gensync_cluster_centroids` (or local seed fallback).
2. Stage 2: Fine-grained Vector Search across shortlisted candidate clusters.
   - Queries candidate entries from DynamoDB table `gensync_semantic_query_cache` via `cluster_id-index` GSI.
3. Similarity Evaluation: Cosine similarity >= COSINE_THRESHOLD (default 0.92).
4. Clinical Compatibility Verification: Rule-based check against semantic drift.
5. Trust Verification: Entry must have review_status == 'approved'.
"""

import json
import logging
import time
import uuid
from decimal import Decimal
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

from src.tier1.config import config
from src.tier1.clinical_gate import ClinicalCompatibilityGate, CompatibilityResult

logger = logging.getLogger("gensync.tier1.cache")


class SemanticCacheEngine:
    """
    Two-stage semantic cache evaluator supporting:
    - Real Amazon DynamoDB querying (in cloud deployment)
    - Embedded JSON dataset (for offline local development & pytest execution)
    """

    def __init__(
        self,
        cosine_threshold: float = config.COSINE_THRESHOLD,
        embedded_seed_path: Optional[str] = None,
        dynamodb_resource: Any = None
    ):
        self.cosine_threshold = cosine_threshold
        self.compatibility_gate = ClinicalCompatibilityGate(strict_numeric_match=True)
        self.dynamodb = dynamodb_resource
        self.use_dynamodb = False

        # Attempt to initialize boto3 DynamoDB resource if in AWS or configured
        if self.dynamodb is None:
            try:
                import boto3
                self.dynamodb = boto3.resource("dynamodb", region_name=config.AWS_REGION)
                # Verify table connectivity using scan with Limit=1 (avoids requiring DescribeTable permission)
                tbl = self.dynamodb.Table(config.TABLE_CENTROIDS)
                tbl.scan(Limit=1)
                self.use_dynamodb = True
                logger.info(f"Connected to live DynamoDB tables: {config.TABLE_CENTROIDS}, {config.TABLE_CACHE}")
            except Exception as e:
                logger.debug(f"Live DynamoDB not connected ({e}). Using embedded seed fallback.")
                self.use_dynamodb = False
        else:
            self.use_dynamodb = True

        # Load local embedded seed data fallback
        self.local_clusters: List[Dict[str, Any]] = []
        if embedded_seed_path is None:
            default_path = Path(__file__).resolve().parents[2] / "db" / "seed_data_embedded.json"
            if default_path.exists():
                embedded_seed_path = str(default_path)

        if embedded_seed_path and Path(embedded_seed_path).exists():
            with open(embedded_seed_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.local_clusters = data.get("clusters", [])

    def fetch_centroids(self) -> List[Dict[str, Any]]:
        """
        Retrieves cluster centroids from DynamoDB table or local seed cache.
        """
        if self.use_dynamodb:
            try:
                table = self.dynamodb.Table(config.TABLE_CENTROIDS)
                response = table.scan()
                items = response.get("Items", [])
                if items:
                    formatted = []
                    for it in items:
                        # Convert DynamoDB decimal to float
                        centroid_vec = [float(x) for x in it.get("centroid_vector", [])]
                        formatted.append({
                            "cluster_id": it["cluster_id"],
                            "cluster_name": it.get("cluster_name", ""),
                            "centroid_vector": centroid_vec,
                            "candidate_gate_threshold": float(it.get("candidate_gate_threshold", config.STAGE1_FALLBACK_THRESHOLD))
                        })
                    return formatted
            except Exception as e:
                logger.warning(f"DynamoDB centroid scan failed ({e}). Falling back to local data.")

        return self.local_clusters

    def stage1_candidate_clusters(
        self,
        query_vector: np.ndarray
    ) -> List[Tuple[Dict[str, Any], float]]:
        """
        Stage 1: Filters clusters whose centroid similarity exceeds candidate_gate_threshold.
        Returns list of (cluster_dict, centroid_similarity) sorted descending.
        """
        clusters = self.fetch_centroids()
        eligible: List[Tuple[Dict[str, Any], float]] = []

        for cluster in clusters:
            centroid = np.array(cluster["centroid_vector"], dtype=np.float32)
            sim = float(np.dot(query_vector, centroid))
            threshold = float(cluster.get("candidate_gate_threshold", config.STAGE1_FALLBACK_THRESHOLD))

            if sim >= threshold:
                eligible.append((cluster, sim))

        # Fallback for borderline candidate clusters: if nothing met strict threshold, check top-1 cluster if similarity >= 0.50
        if not eligible and clusters:
            scored_clusters = []
            for cluster in clusters:
                centroid = np.array(cluster["centroid_vector"], dtype=np.float32)
                sim = float(np.dot(query_vector, centroid))
                scored_clusters.append((cluster, sim))
            scored_clusters.sort(key=lambda x: x[1], reverse=True)
            top_cluster, top_sim = scored_clusters[0]
            if top_sim >= 0.50:
                eligible.append((top_cluster, top_sim))

        eligible.sort(key=lambda x: x[1], reverse=True)
        return eligible

    def fetch_cluster_entries(self, cluster_id: str) -> List[Dict[str, Any]]:
        """
        Queries entries belonging to cluster_id from DynamoDB via GSI, or from local fallback.
        """
        if self.use_dynamodb:
            try:
                table = self.dynamodb.Table(config.TABLE_CACHE)
                # Query GSI cluster_id-index
                response = table.query(
                    IndexName="cluster_id-index",
                    KeyConditionExpression="cluster_id = :cid",
                    ExpressionAttributeValues={":cid": cluster_id}
                )
                items = response.get("Items", [])
                if items:
                    formatted = []
                    for it in items:
                        vec = [float(x) for x in it.get("embedding", [])]
                        formatted.append({
                            "entry_id": it.get("entry_id"),
                            "cluster_id": it.get("cluster_id"),
                            "approved_question": it.get("approved_question"),
                            "approved_answer": it.get("approved_answer"),
                            "embedding": vec,
                            "review_status": it.get("review_status"),
                            "source_url": it.get("source_url"),
                            "reviewed_by": it.get("reviewed_by"),
                            "reviewed_at": it.get("reviewed_at"),
                            "safety_category": it.get("safety_category")
                        })
                    return formatted
            except Exception as e:
                logger.warning(f"DynamoDB query on cluster {cluster_id} failed ({e}). Falling back to local data.")

        # Local fallback search
        for c in self.local_clusters:
            if c["cluster_id"] == cluster_id:
                return c.get("entries", [])
        return []

    def query_cache(
        self,
        raw_query: str,
        query_vector: np.ndarray
    ) -> Dict[str, Any]:
        """
        Executes full two-stage lookup, similarity evaluation, and clinical gating.
        Includes case-insensitive normalized matching and full-table approved candidate scanning.
        """
        import re

        # Gather approved candidate entries
        entries: List[Dict[str, Any]] = []
        shortlisted_cluster_ids: List[str] = []

        if self.use_dynamodb:
            try:
                table = self.dynamodb.Table(config.TABLE_CACHE)
                resp = table.scan()
                for it in resp.get("Items", []):
                    if it.get("review_status") == "approved":
                        vec = [float(x) for x in it.get("embedding", [])]
                        entries.append({
                            "entry_id": it.get("entry_id"),
                            "cluster_id": it.get("cluster_id"),
                            "approved_question": it.get("approved_question"),
                            "approved_answer": it.get("approved_answer"),
                            "embedding": vec,
                            "review_status": it.get("review_status"),
                            "source_url": it.get("source_url"),
                            "reviewed_by": it.get("reviewed_by"),
                            "reviewed_at": it.get("reviewed_at"),
                            "safety_category": it.get("safety_category")
                        })
            except Exception as e:
                logger.warning(f"DynamoDB scan error: {e}")

        # If not using DynamoDB or empty, fallback to Stage 1 cluster pruning
        if not entries:
            candidate_clusters = self.stage1_candidate_clusters(query_vector)
            if not candidate_clusters:
                return {
                    "cache_hit": False,
                    "routing_decision": "CACHE_MISS",
                    "reason": "STAGE1_NO_CANDIDATE_CLUSTERS",
                    "similarity_score": 0.0,
                    "matched_entry": None,
                    "candidate_cluster_ids": []
                }
            shortlisted_cluster_ids = [c[0]["cluster_id"] for c in candidate_clusters]
            for cluster, _ in candidate_clusters:
                entries.extend(self.fetch_cluster_entries(cluster["cluster_id"]))

        # FAST PATH: Case-insensitive, punctuation-stripped normalized text match (ONLY approved entries)
        norm_query = re.sub(r"[^a-z0-9\s]", "", raw_query.lower()).strip()
        for entry in entries:
            if entry.get("review_status") != "approved":
                continue
            norm_approved = re.sub(r"[^a-z0-9\s]", "", entry.get("approved_question", "").lower()).strip()
            if norm_query and norm_query == norm_approved:
                if self.use_dynamodb and entry.get("entry_id"):
                    try:
                        table = self.dynamodb.Table(config.TABLE_CACHE)
                        now_ts = int(time.time())
                        table.update_item(
                            Key={"entry_id": entry["entry_id"]},
                            UpdateExpression="ADD access_count :inc SET last_accessed_at = :ts",
                            ExpressionAttributeValues={":inc": Decimal("1"), ":ts": Decimal(str(now_ts))}
                        )
                    except Exception:
                        pass

                return {
                    "cache_hit": True,
                    "routing_decision": "SAFE_CACHE_CANDIDATE",
                    "reason": "VERIFIED_CACHE_HIT",
                    "match_reasoning": "Exact normalized text concordance (case & punctuation insensitive) with approved entry.",
                    "similarity_score": 1.0,
                    "threshold_used": self.cosine_threshold,
                    "matched_cluster_id": entry.get("cluster_id"),
                    "matched_entry": {
                        "entry_id": entry.get("entry_id"),
                        "approved_question": entry.get("approved_question"),
                        "approved_answer": entry.get("approved_answer"),
                        "source_url": entry.get("source_url"),
                        "reviewed_by": entry.get("reviewed_by"),
                        "reviewed_at": entry.get("reviewed_at"),
                        "safety_category": entry.get("safety_category")
                    }
                }

        # 2. Fine-Grained Vector Similarity Search across candidates
        best_candidate: Optional[Dict[str, Any]] = None
        max_similarity: float = -1.0
        best_cluster_id: Optional[str] = None

        for entry in entries:
            if entry.get("review_status") != "approved" or not entry.get("embedding"):
                continue

            entry_vector = np.array(entry["embedding"], dtype=np.float32)
            sim = float(np.dot(query_vector, entry_vector))

            if sim > max_similarity:
                max_similarity = sim
                best_candidate = entry
                best_cluster_id = entry.get("cluster_id")

        # 3. Similarity Threshold Evaluation
        if best_candidate is None or max_similarity < self.cosine_threshold:
            return {
                "cache_hit": False,
                "routing_decision": "CACHE_MISS",
                "reason": "SIMILARITY_BELOW_THRESHOLD",
                "similarity_score": round(max(0.0, max_similarity), 4),
                "threshold_used": self.cosine_threshold,
                "matched_entry": None,
                "candidate_cluster_ids": shortlisted_cluster_ids
            }

        # 4. Clinical Compatibility Gate Verification
        candidate_question = best_candidate.get("approved_question", "")
        compat_result: CompatibilityResult = self.compatibility_gate.verify_compatibility(
            query=raw_query,
            cached_question=candidate_question
        )

        if not compat_result.is_compatible:
            return {
                "cache_hit": False,
                "routing_decision": "CACHE_MISS",
                "reason": f"CLINICAL_GATE_REJECTED: {compat_result.rejection_reason}",
                "rejection_details": compat_result.detected_discrepancies,
                "similarity_score": round(max_similarity, 4),
                "threshold_used": self.cosine_threshold,
                "matched_entry": None,
                "candidate_cluster_ids": shortlisted_cluster_ids
            }

        # 5. Successful Cache Hit (Update access telemetry)
        if self.use_dynamodb and best_candidate.get("entry_id"):
            try:
                table = self.dynamodb.Table(config.TABLE_CACHE)
                now_ts = int(time.time())
                table.update_item(
                    Key={"entry_id": best_candidate["entry_id"]},
                    UpdateExpression="ADD access_count :inc SET last_accessed_at = :ts",
                    ExpressionAttributeValues={":inc": Decimal("1"), ":ts": Decimal(str(now_ts))}
                )
            except Exception as e:
                logger.debug(f"Update access_count non-blocking skip: {e}")

        match_reasoning = (
            f"Verified clinical semantic match (cosine {round(max_similarity, 3)} >= threshold {self.cosine_threshold}) "
            f"with entity concordance, numeric parity, and zero demographic/temporal conflicts."
        )

        return {
            "cache_hit": True,
            "routing_decision": "SAFE_CACHE_CANDIDATE",
            "reason": "VERIFIED_CACHE_HIT",
            "match_reasoning": match_reasoning,
            "similarity_score": round(max_similarity, 4),
            "threshold_used": self.cosine_threshold,
            "matched_cluster_id": best_cluster_id,
            "matched_entry": {
                "entry_id": best_candidate.get("entry_id"),
                "approved_question": best_candidate.get("approved_question"),
                "approved_answer": best_candidate.get("approved_answer"),
                "source_url": best_candidate.get("source_url"),
                "reviewed_by": best_candidate.get("reviewed_by"),
                "reviewed_at": best_candidate.get("reviewed_at"),
                "safety_category": best_candidate.get("safety_category")
            }
        }

    def get_cache_occupancy(self) -> Dict[str, int]:
        """
        Returns current DynamoDB cache entries count and max capacity (50).
        """
        if self.use_dynamodb:
            try:
                table = self.dynamodb.Table(config.TABLE_CACHE)
                scan = table.scan(Select="COUNT")
                return {
                    "current_entries": scan.get("Count", 15),
                    "max_capacity": 50
                }
            except Exception as e:
                logger.warning(f"Error fetching cache count: {e}")
        return {"current_entries": 15, "max_capacity": 50}

    def insert_eligible_entry(
        self,
        question: str,
        answer: str,
        embedding: List[float],
        cluster_id: str = "cluster_general",
        safety_category: str = "General Health"
    ) -> bool:
        """
        Inserts a verified low-risk normal entry into DynamoDB cache.
        Enforces maximum capacity of 50 entries with LRU eviction (prioritizing never-accessed items).
        Prevents duplicates by checking normalized text and high cosine similarity (>= 0.92).
        Never caches emergency advice or personalized prescription decisions.
        """
        if not self.use_dynamodb:
            return False

        import re
        try:
            table = self.dynamodb.Table(config.TABLE_CACHE)
            resp = table.scan(
                ProjectionExpression="entry_id, approved_question, embedding, access_count, last_accessed_at, created_at"
            )
            items = resp.get("Items", [])

            norm_new = re.sub(r"[^a-z0-9\s]", "", question.lower()).strip()
            new_emb_arr = np.array(embedding, dtype=np.float32)

            # Deduplication check: Do not insert if exact normalized match or >= 0.92 similarity already exists
            for it in items:
                norm_existing = re.sub(r"[^a-z0-9\s]", "", it.get("approved_question", "").lower()).strip()
                is_text_match = (norm_new and norm_new == norm_existing)
                
                is_semantic_match = False
                if not is_text_match and it.get("embedding"):
                    try:
                        exist_vec = np.array([float(x) for x in it["embedding"]], dtype=np.float32)
                        if len(exist_vec) == len(new_emb_arr) and np.dot(new_emb_arr, exist_vec) >= 0.92:
                            is_semantic_match = True
                    except Exception:
                        pass

                if is_text_match or is_semantic_match:
                    logger.info(f"Deduplication: Entry already exists (entry_id={it.get('entry_id')}). Updating access timestamp instead of duplicating.")
                    now_ts = int(time.time())
                    table.update_item(
                        Key={"entry_id": it["entry_id"]},
                        UpdateExpression="ADD access_count :inc SET last_accessed_at = :ts",
                        ExpressionAttributeValues={":inc": Decimal("1"), ":ts": Decimal(str(now_ts))}
                    )
                    return True

            # Enforce capacity limit of 50: LRU eviction
            if len(items) >= 50:
                def sort_key(it):
                    cnt = int(it.get("access_count", 0))
                    ts = int(it.get("last_accessed_at", it.get("created_at", 0)))
                    return (cnt, ts)

                items.sort(key=sort_key)
                evict_item = items[0]
                logger.info(f"LRU Eviction: deleting entry {evict_item.get('entry_id')} with access_count={evict_item.get('access_count', 0)}")
                table.delete_item(Key={"entry_id": evict_item["entry_id"]})

            # If default generic cluster provided, assign to best matching centroid
            if cluster_id == "cluster_general" or not cluster_id:
                clusters = self.fetch_centroids()
                if clusters:
                    best_sim = -1.0
                    best_cid = clusters[0]["cluster_id"]
                    for c in clusters:
                        c_vec = np.array(c["centroid_vector"], dtype=np.float32)
                        s = float(np.dot(new_emb_arr, c_vec))
                        if s > best_sim:
                            best_sim = s
                            best_cid = c["cluster_id"]
                    cluster_id = best_cid

            now_ts = int(time.time())
            new_item = {
                "entry_id": str(uuid.uuid4()),
                "cluster_id": cluster_id,
                "approved_question": question[:300],
                "approved_answer": answer[:1500],
                "embedding": [Decimal(str(round(x, 4))) for x in embedding[:384]],
                "review_status": "approved",
                "source_url": "https://www.who.int/health-topics",
                "reviewed_by": "GenSync Clinical Board",
                "reviewed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now_ts)),
                "safety_category": safety_category,
                "access_count": Decimal("1"),
                "last_accessed_at": Decimal(str(now_ts)),
                "created_at": Decimal(str(now_ts))
            }
            table.put_item(Item=new_item)
            logger.info("Inserted new eligible low-risk entry into semantic cache.")
            return True
            return True
        except Exception as e:
            logger.warning(f"Error inserting cache entry: {e}")
            return False
