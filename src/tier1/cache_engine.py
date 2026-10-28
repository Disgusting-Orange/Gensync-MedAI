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
                # Verify table exists
                tbl = self.dynamodb.Table(config.TABLE_CENTROIDS)
                tbl.load()
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
        """
        # 1. Stage 1 Pruning
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

        # 2. Stage 2 Fine-Grained Search across shortlisted clusters
        best_candidate: Optional[Dict[str, Any]] = None
        max_similarity: float = -1.0
        best_cluster_id: Optional[str] = None

        for cluster, _ in candidate_clusters:
            cluster_id = cluster["cluster_id"]
            entries = self.fetch_cluster_entries(cluster_id)

            for entry in entries:
                # Trust Invariant: Only human-reviewed entries may serve as trusted cache answers
                if entry.get("review_status") != "approved":
                    continue

                entry_vector = np.array(entry["embedding"], dtype=np.float32)
                sim = float(np.dot(query_vector, entry_vector))

                if sim > max_similarity:
                    max_similarity = sim
                    best_candidate = entry
                    best_cluster_id = cluster_id

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

        # 5. Successful Cache Hit
        return {
            "cache_hit": True,
            "routing_decision": "SAFE_CACHE_CANDIDATE",
            "reason": "VERIFIED_CACHE_HIT",
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
