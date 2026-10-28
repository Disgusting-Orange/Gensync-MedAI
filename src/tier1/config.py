"""
GenSync-Cache: Tier-1 Configuration
"""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Tier1Config:
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-south-1")
    EMERGENCY_NUMBER: str = os.getenv("EMERGENCY_NUMBER", "112")
    COSINE_THRESHOLD: float = float(os.getenv("COSINE_THRESHOLD", "0.92"))
    STAGE1_FALLBACK_THRESHOLD: float = float(os.getenv("STAGE1_FALLBACK_THRESHOLD", "0.70"))
    
    # DynamoDB Tables
    TABLE_CACHE: str = os.getenv("DYNAMODB_TABLE_CACHE", "gensync_semantic_query_cache")
    TABLE_CENTROIDS: str = os.getenv("DYNAMODB_TABLE_CENTROIDS", "gensync_cluster_centroids")
    TABLE_AUDIT: str = os.getenv("DYNAMODB_TABLE_AUDIT", "gensync_triage_audit_log")
    TABLE_REVIEW_QUEUE: str = os.getenv("DYNAMODB_TABLE_REVIEW_QUEUE", "gensync_slm_review_queue")
    
    # SNS
    SNS_TOPIC_ARN: str = os.getenv(
        "SNS_TOPIC_ARN",
        "arn:aws:sns:ap-south-1:471597060887:ClinicalEmergencyTriage"
    )
    
    # Model
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIM: int = 384
    RULE_SET_VERSION: str = "1.0.0"


config = Tier1Config()
