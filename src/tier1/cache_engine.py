"""
GenSync-Cache: Two-Stage Semantic Cache Engine

Workflow:
1. Stage 1: Coarse candidate pruning using Cluster Centroids and Gate Thresholds.
2. Stage 2: Fine-grained Vector Search across shortlisted candidate clusters.
3. Similarity Evaluation: Cosine similarity >= COSINE_THRESHOLD (default 0.92).
4. Clinical Compatibility Verification: Rule-based check against semantic drift.
5. Trust Verification: Entry must have review_status == 'approved'.
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

from src.tier1.config import config
from src.tier1.clinical_gate import ClinicalCompatibilityGate, CompatibilityResult


class SemanticCacheEngine:
    """
    Two-stage semantic cache evaluator.
    Supports in-memory cached seed data (for local testing) and DynamoDB (for AWS deployment).
    """

    def __init__(
        self,
        cosine_threshold: float = config.COSINE_THRESHOLD,
        embedded_seed_path: Optional[str] = None,
        dynamodb_client: Any = None
    ):
        self.cosine_threshold = cosine_threshold
        self.compatibility_gate = ClinicalCompatibilityGate(strict_numeric_match=True)
        self.dynamodb_client = dynamodb_client
        
        # Load local embedded seed data if available
        self.clusters: List[Dict[str, Any]] = []
        if embedded_seed_path is None:
            default_path = Path(__file__).resolve().parents[2] / "db" / "seed_data_embedded.json"
            if default_path.exists():
                embedded_seed_path = str(default_path)

        if embedded_seed_path and Path(embedded_seed_path).exists():
            with open(embedded_seed_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.clusters = data.get("clusters", [])

    def stage1_candidate_clusters(
        self,
        query_vector: np.ndarray
    ) -> List[Tuple[Dict[str, Any], float]]:
        """
        Stage 1: Filters clusters whose centroid similarity exceeds candidate_gate_threshold.
        Returns list of (cluster_dict, centroid_similarity) sorted descending by similarity.
        """
        eligible: List[Tuple[Dict[str, Any], float]] = []

        for cluster in self.clusters:
            centroid = np.array(cluster["centroid_vector"], dtype=np.float32)
            # Dot product equals cosine similarity because both are L2 unit vectors
            sim = float(np.dot(query_vector, centroid))
            threshold = cluster.get("candidate_gate_threshold", config.STAGE1_FALLBACK_THRESHOLD)

            if sim >= threshold:
                eligible.append((cluster, sim))

        eligible.sort(key=lambda x: x[1], reverse=True)
        return eligible

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
            for entry in cluster.get("entries", []):
                # Trust Invariant: Only human-reviewed entries may serve as trusted cache answers
                if entry.get("review_status") != "approved":
                    continue

                entry_vector = np.array(entry["embedding"], dtype=np.float32)
                sim = float(np.dot(query_vector, entry_vector))

                if sim > max_similarity:
                    max_similarity = sim
                    best_candidate = entry
                    best_cluster_id = cluster["cluster_id"]

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
