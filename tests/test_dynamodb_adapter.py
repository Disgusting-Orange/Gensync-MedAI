"""
Verification Test: DynamoDB GSI Adapter & Distinction from Native Vector Search
"""

import pytest
from unittest.mock import MagicMock
import numpy as np

from src.tier1.cache_engine import SemanticCacheEngine


class TestDynamoDBAdapterGSI:
    def test_gsi_candidate_retrieval(self):
        # Mock DynamoDB resource
        mock_dynamo = MagicMock()
        mock_centroids_table = MagicMock()
        mock_cache_table = MagicMock()

        def get_table(name):
            if "centroids" in name:
                return mock_centroids_table
            return mock_cache_table

        mock_dynamo.Table.side_effect = get_table

        # 1. Mock Centroids Table Scan
        mock_centroids_table.scan.return_value = {
            "Items": [
                {
                    "cluster_id": "cluster_hydration_wellness",
                    "cluster_name": "Hydration and General Wellness",
                    "centroid_vector": [0.05] * 384,
                    "candidate_gate_threshold": "0.60"
                }
            ]
        }

        # 2. Mock Cache Table GSI Query on cluster_id-index
        mock_cache_table.query.return_value = {
            "Items": [
                {
                    "entry_id": "hyd-001",
                    "cluster_id": "cluster_hydration_wellness",
                    "approved_question": "How much water should an average healthy adult drink daily?",
                    "approved_answer": "An adequate daily fluid intake is roughly 3.7 liters for men and 2.7 liters for women.",
                    "embedding": [0.05] * 384,
                    "review_status": "approved",
                    "source_url": "https://www.mayoclinic.org/healthy-lifestyle/nutrition-and-healthy-eating/in-depth/water/art-20044256",
                    "reviewed_by": "Institutional Clinical Reference: Mayo Clinic Health Information Review Board",
                    "safety_category": "GENERAL_WELLNESS"
                }
            ]
        }

        # Initialize engine with mocked live DynamoDB
        engine = SemanticCacheEngine(cosine_threshold=0.85, dynamodb_resource=mock_dynamo)
        assert engine.use_dynamodb is True

        # Run Stage 1: Centroids fetch
        centroids = engine.fetch_centroids()
        assert len(centroids) == 1
        assert centroids[0]["cluster_id"] == "cluster_hydration_wellness"
        mock_centroids_table.scan.assert_called_once()

        # Run Stage 2: GSI Query on cluster_id-index
        entries = engine.fetch_cluster_entries("cluster_hydration_wellness")
        assert len(entries) == 1
        assert entries[0]["entry_id"] == "hyd-001"
        mock_cache_table.query.assert_called_once_with(
            IndexName="cluster_id-index",
            KeyConditionExpression="cluster_id = :cid",
            ExpressionAttributeValues={":cid": "cluster_hydration_wellness"}
        )

        # Run complete query_cache
        query_vec = np.array([0.05] * 384, dtype=np.float32)
        norm = np.linalg.norm(query_vec)
        query_vec /= norm

        result = engine.query_cache(
            raw_query="How much water should an average healthy adult drink daily?",
            query_vector=query_vec
        )
        assert result["cache_hit"] is True
        assert result["matched_entry"]["entry_id"] == "hyd-001"
