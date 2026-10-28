"""
Verification Test: Safety Invariants & Trust Hierarchy
Verifies:
1. Emergency & Referral bypass (zero cache access)
2. Incompatible candidate rejection by Clinical Compatibility Gate
3. Controlled cache miss fallback
4. Strict quarantine: unreviewed/pending entries CANNOT be served
"""

import pytest
import numpy as np

from src.tier1.triage_rules import DeterministicTriageEngine
from src.tier1.clinical_gate import ClinicalCompatibilityGate
from src.tier1.cache_engine import SemanticCacheEngine


class TestSafetyInvariants:
    def test_emergency_bypass_invariants(self):
        engine = DeterministicTriageEngine(emergency_number="112")
        queries = [
            "Severe crushing chest pain radiating to left arm",
            "Patient has facial drooping and speech difficulty",
            "Person cannot breathe and is choking turning blue",
            "Took too many pills overdose suicide",
        ]
        for q in queries:
            res = engine.evaluate(q)
            assert res.routing_decision == "EMERGENCY"
            assert res.cache_allowed is False
            assert res.model_allowed is False
            assert "112" in res.user_message

    def test_referral_bypass_invariants(self):
        engine = DeterministicTriageEngine(emergency_number="112")
        queries = [
            "What is the dosage of amoxicillin for my 4-month-old infant?",
            "Can I combine metformin with my blood pressure medications?",
            "Can I take ibuprofen during the third trimester of pregnancy?",
            "I have penicillin allergy, what antibiotic can I take?",
        ]
        for q in queries:
            res = engine.evaluate(q)
            assert res.routing_decision == "PROFESSIONAL_REFERRAL"
            assert res.cache_allowed is False
            assert res.model_allowed is False
            assert len(res.referral_links) > 0

    def test_incompatible_candidates_rejected(self):
        gate = ClinicalCompatibilityGate(strict_numeric_match=True)
        # Polarity mismatch
        res_pol = gate.verify_compatibility(
            "Headache with fever",
            "Headache without fever"
        )
        assert res_pol.is_compatible is False
        assert res_pol.rejection_reason == "POLARITY_MISMATCH"

        # Dosage / Numeric mismatch
        res_num = gate.verify_compatibility(
            "What are the benefits of 50mg zinc daily?",
            "What are the benefits of 5mg zinc daily?"
        )
        assert res_num.is_compatible is False
        assert res_num.rejection_reason == "NUMERIC_VALUE_MISMATCH"

    def test_unreviewed_pending_entries_cannot_be_served(self):
        """
        Trust Invariant: If an entry has review_status == 'pending',
        even with 1.0 similarity, it MUST NOT be served as a trusted answer.
        """
        dummy_cluster = {
            "cluster_id": "test_cluster",
            "centroid_vector": [0.05] * 384,
            "candidate_gate_threshold": 0.5,
            "entries": [
                {
                    "entry_id": "unapproved-001",
                    "approved_question": "What is normal blood pressure?",
                    "approved_answer": "This is an unapproved SLM generated draft.",
                    "embedding": [0.05] * 384,
                    "review_status": "pending",  # Unapproved!
                    "source_url": "https://example.com"
                }
            ]
        }
        engine = SemanticCacheEngine(cosine_threshold=0.80)
        engine.local_clusters = [dummy_cluster]
        engine.use_dynamodb = False

        query_vec = np.array([0.05] * 384, dtype=np.float32)
        norm = np.linalg.norm(query_vec)
        query_vec /= norm

        # Run query_cache with identical vector
        result = engine.query_cache(
            raw_query="What is normal blood pressure?",
            query_vector=query_vec
        )
        # Must be CACHE_MISS because review_status != 'approved'
        assert result["cache_hit"] is False
        assert result["routing_decision"] == "CACHE_MISS"
        assert result["matched_entry"] is None
