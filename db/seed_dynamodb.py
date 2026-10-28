"""
GenSync-Cache: DynamoDB Table Seeding Script
Reads db/seed_data_embedded.json and populates:
1. gensync_cluster_centroids
2. gensync_semantic_query_cache
"""

import json
import logging
from decimal import Decimal
from pathlib import Path
import boto3

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gensync.seed_dynamodb")


def float_to_decimal(obj):
    """
    Recursively converts float values to Decimal for DynamoDB serialization.
    """
    if isinstance(obj, float):
        return Decimal(str(round(obj, 6)))
    if isinstance(obj, dict):
        return {k: float_to_decimal(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [float_to_decimal(x) for x in obj]
    return obj


def seed_tables(
    data_file: str = "db/seed_data_embedded.json",
    region: str = "ap-south-1",
    centroids_table: str = "gensync_cluster_centroids",
    cache_table: str = "gensync_semantic_query_cache"
):
    logger.info(f"Loading embedded seed data from {data_file}...")
    with open(data_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    dynamodb = boto3.resource("dynamodb", region_name=region)
    tbl_centroids = dynamodb.Table(centroids_table)
    tbl_cache = dynamodb.Table(cache_table)

    clusters = data.get("clusters", [])
    total_entries = 0

    logger.info(f"Seeding {len(clusters)} clusters into {centroids_table}...")
    for cluster in clusters:
        centroid_item = {
            "cluster_id": cluster["cluster_id"],
            "cluster_name": cluster["cluster_name"],
            "description": cluster["description"],
            "model_name": cluster.get("model_name", "all-MiniLM-L6-v2"),
            "embedding_dim": cluster.get("embedding_dim", 384),
            "centroid_vector": float_to_decimal(cluster["centroid_vector"]),
            "cluster_radius": float_to_decimal(cluster["cluster_radius"]),
            "candidate_gate_threshold": float_to_decimal(cluster["candidate_gate_threshold"]),
            "entry_count": len(cluster.get("entries", [])),
        }
        tbl_centroids.put_item(Item=centroid_item)
        logger.info(f"  -> Seeded centroid for {cluster['cluster_id']}")

        # Seed entries
        entries = cluster.get("entries", [])
        for entry in entries:
            entry_item = {
                "entry_id": entry["entry_id"],
                "cluster_id": cluster["cluster_id"],
                "approved_question": entry["approved_question"],
                "approved_answer": entry["approved_answer"],
                "embedding": float_to_decimal(entry["embedding"]),
                "source_type": entry.get("source_type", "human_reviewed"),
                "review_status": entry.get("review_status", "approved"),
                "source_url": entry.get("source_url", ""),
                "reviewed_by": entry.get("reviewed_by", ""),
                "reviewed_at": entry.get("reviewed_at", ""),
                "safety_category": entry.get("safety_category", "GENERAL_WELLNESS"),
            }
            tbl_cache.put_item(Item=entry_item)
            total_entries += 1

    logger.info(f"SUCCESS: Seeded {len(clusters)} centroids and {total_entries} approved entries into DynamoDB.")


if __name__ == "__main__":
    seed_tables()
