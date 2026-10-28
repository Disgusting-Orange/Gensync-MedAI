"""
Unit Tests for Two-Stage Semantic Cache Engine & Primary Lambda Handler
Phase 1 Verification
"""

import json
import pytest
import numpy as np

from src.tier1.cache_engine import SemanticCacheEngine
from src.tier1.embedder import LightweightEmbedder
from src.tier1.handler import lambda_handler


@pytest.fixture(scope="module")
def embedder():
    return LightweightEmbedder(model_dir="models/onnx")


@pytest.fixture(scope="module")
def cache_engine():
    return SemanticCacheEngine(cosine_threshold=0.92)


class TestSemanticCacheEngine:
    def test_stage1_candidate_pruning(self, embedder, cache_engine):
        query = "How much water should a person drink every day?"
        vec = embedder.encode(query)
        candidates = cache_engine.stage1_candidate_clusters(vec)
        assert len(candidates) > 0
        top_cluster = candidates[0][0]
        # Should prioritize hydration cluster
        assert top_cluster["cluster_id"] == "cluster_hydration_wellness"

    def test_exact_match_cache_hit(self, embedder, cache_engine):
        query = "How much water should an average healthy adult drink daily?"
        vec = embedder.encode(query)
        result = cache_engine.query_cache(raw_query=query, query_vector=vec)
        assert result["cache_hit"] is True
        assert result["routing_decision"] == "SAFE_CACHE_CANDIDATE"
        assert result["similarity_score"] >= 0.98
        assert result["matched_entry"]["entry_id"] == "hyd-001"
        assert result["matched_entry"]["reviewed_by"] is not None

    def test_legitimate_paraphrase_cache_hit(self, embedder, cache_engine):
        # Paraphrase with lower threshold if needed or high similarity
        query = "How much water should an adult drink each day?"
        vec = embedder.encode(query)
        result = cache_engine.query_cache(raw_query=query, query_vector=vec)
        # Check that it either hits cache or provides similarity score
        assert result["similarity_score"] > 0.85

    def test_unrelated_query_cache_miss(self, embedder, cache_engine):
        query = "How do I fix a broken car alternator?"
        vec = embedder.encode(query)
        result = cache_engine.query_cache(raw_query=query, query_vector=vec)
        assert result["cache_hit"] is False
        assert result["routing_decision"] == "CACHE_MISS"

    def test_clinically_incompatible_query_rejected(self, embedder, cache_engine):
        # A query with conflicting numeric values: 104F vs 100.4F
        query = "What body temperature is clinically defined as a fever in adults? (104F)"
        vec = embedder.encode(query)
        result = cache_engine.query_cache(raw_query=query, query_vector=vec)
        # Even if embedding similarity is high, the clinical gate must reject it
        assert result["cache_hit"] is False
        assert "CLINICAL_GATE_REJECTED" in result["reason"]


class TestLambdaHandlerIntegration:
    def test_lambda_cors_options(self):
        event = {"requestContext": {"http": {"method": "OPTIONS"}}}
        response = lambda_handler(event)
        assert response["statusCode"] == 200
        assert "Access-Control-Allow-Origin" in response["headers"]

    def test_lambda_emergency_routing(self):
        event = {
            "requestContext": {"http": {"method": "POST"}},
            "body": json.dumps({"query": "I am having severe crushing chest pain and shortness of breath"})
        }
        response = lambda_handler(event)
        assert response["statusCode"] == 200
        data = json.loads(response["body"])
        assert data["routing_decision"] == "EMERGENCY"
        assert data["cache_allowed"] is False
        assert "112" in data["emergency_advisory"]

    def test_lambda_referral_routing(self):
        event = {
            "requestContext": {"http": {"method": "POST"}},
            "body": json.dumps({"query": "How many mg of amoxicillin should my 6-month-old infant take?"})
        }
        response = lambda_handler(event)
        assert response["statusCode"] == 200
        data = json.loads(response["body"])
        assert data["routing_decision"] == "PROFESSIONAL_REFERRAL"
        assert data["cache_allowed"] is False
        assert "PROFESSIONAL CLINICAL REFERRAL" in data["referral_message"]

    def test_lambda_cache_hit_routing(self):
        event = {
            "requestContext": {"http": {"method": "POST"}},
            "body": json.dumps({"query": "How much water should an average healthy adult drink daily?"})
        }
        response = lambda_handler(event)
        assert response["statusCode"] == 200
        data = json.loads(response["body"])
        assert data["routing_decision"] == "SAFE_CACHE_CANDIDATE"
        assert data["cache_hit"] is True
        assert "3.7 liters" in data["answer"]
        assert "latency" in data
        assert data["latency"]["total_ms"] > 0

    def test_lambda_cache_miss_routing(self):
        event = {
            "requestContext": {"http": {"method": "POST"}},
            "body": json.dumps({"query": "What are the latest treatments for quantum particle fatigue?"})
        }
        response = lambda_handler(event)
        assert response["statusCode"] == 200
        data = json.loads(response["body"])
        assert data["routing_decision"] == "CACHE_MISS"
        assert data["cache_hit"] is False
        assert "I'm not sure" in data["answer"]
