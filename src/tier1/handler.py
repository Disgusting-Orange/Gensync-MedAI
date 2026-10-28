"""
GenSync-Cache: Tier-1 Serverless Request Handler (Python 3.11)
Lambda Entry Point for API Gateway HTTP API
"""

import json
import logging
import time
import uuid
from typing import Dict, Any

from src.tier1.config import config
from src.tier1.triage_rules import DeterministicTriageEngine, TriageResult
from src.tier1.embedder import LightweightEmbedder
from src.tier1.cache_engine import SemanticCacheEngine
from src.tier1.audit import (
    compute_query_hash,
    publish_emergency_alert,
    create_audit_record,
    persist_audit_record,
)

logger = logging.getLogger("gensync.tier1.handler")
logger.setLevel(logging.INFO)

# Global warm state caches for AWS Lambda execution environments
triage_engine = DeterministicTriageEngine(emergency_number=config.EMERGENCY_NUMBER)
embedder = LightweightEmbedder(model_dir="models/onnx")
cache_engine = SemanticCacheEngine(cosine_threshold=config.COSINE_THRESHOLD)


def build_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Constructs an API Gateway HTTP API JSON response with standard CORS headers.
    """
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-Correlation-ID, Authorization",
        },
        "body": json.dumps(body),
    }


def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    """
    Primary AWS Lambda Handler for Clinical Q&A Requests.
    Strictly follows the safety-before-retrieval pipeline.
    """
    start_time = time.perf_counter()

    # Handle CORS Preflight OPTIONS requests
    http_method = event.get("requestContext", {}).get("http", {}).get("method", "")
    if http_method == "OPTIONS":
        return build_response(200, {"message": "CORS preflight successful"})

    # Extract correlation ID
    headers = event.get("headers") or {}
    correlation_id = (
        headers.get("x-correlation-id")
        or headers.get("X-Correlation-ID")
        or str(uuid.uuid4())
    )

    # Parse request payload
    body_raw = event.get("body", "{}")
    if isinstance(body_raw, str):
        try:
            body = json.loads(body_raw) if body_raw else {}
        except json.JSONDecodeError:
            return build_response(400, {
                "error": "Invalid JSON payload",
                "correlation_id": correlation_id
            })
    else:
        body = body_raw

    query = body.get("query", "").strip()

    # Step 1: Deterministic Safety Layer (Safety Before Retrieval)
    triage_result: TriageResult = triage_engine.evaluate(query)
    query_sha256 = compute_query_hash(query) if query else "empty_query"

    # CASE A: INVALID REQUEST
    if triage_result.routing_decision == "INVALID_REQUEST":
        total_latency = (time.perf_counter() - start_time) * 1000.0
        return build_response(400, {
            "routing_decision": "INVALID_REQUEST",
            "message": triage_result.user_message,
            "reason": triage_result.reason,
            "correlation_id": correlation_id,
            "latency_ms": round(total_latency, 2)
        })

    # CASE B: EMERGENCY GATE MATCH
    if triage_result.routing_decision == "EMERGENCY":
        matched_cat = triage_result.matched_patterns[0] if triage_result.matched_patterns else "unspecified"
        
        # Publish minimal JSON operational alert to SNS
        sns_status = publish_emergency_alert(
            query_sha256=query_sha256,
            matched_category=matched_cat,
            correlation_id=correlation_id,
            topic_arn=config.SNS_TOPIC_ARN
        )

        total_latency = (time.perf_counter() - start_time) * 1000.0

        # Persist audit log (Zero raw text)
        audit_rec = create_audit_record(
            query_sha256=query_sha256,
            routing_decision="EMERGENCY",
            correlation_id=correlation_id,
            notification_status=sns_status,
            latency_ms=total_latency,
            extra_metadata={"matched_category": matched_cat}
        )
        persist_audit_record(audit_rec, config.TABLE_AUDIT)

        return build_response(200, {
            "routing_decision": "EMERGENCY",
            "emergency_advisory": triage_result.user_message,
            "cache_allowed": False,
            "model_allowed": False,
            "notification_status": sns_status,
            "emergency_number": config.EMERGENCY_NUMBER,
            "referral_resources": triage_result.referral_links,
            "correlation_id": correlation_id,
            "query_digest": query_sha256,
            "latency_ms": round(total_latency, 2)
        })

    # CASE C: PROFESSIONAL REFERRAL GATE MATCH
    if triage_result.routing_decision == "PROFESSIONAL_REFERRAL":
        total_latency = (time.perf_counter() - start_time) * 1000.0

        audit_rec = create_audit_record(
            query_sha256=query_sha256,
            routing_decision="PROFESSIONAL_REFERRAL",
            correlation_id=correlation_id,
            notification_status="not_applicable",
            latency_ms=total_latency
        )
        persist_audit_record(audit_rec, config.TABLE_AUDIT)

        return build_response(200, {
            "routing_decision": "PROFESSIONAL_REFERRAL",
            "referral_message": triage_result.user_message,
            "cache_allowed": False,
            "model_allowed": False,
            "reason": triage_result.reason,
            "referral_resources": triage_result.referral_links,
            "correlation_id": correlation_id,
            "query_digest": query_sha256,
            "latency_ms": round(total_latency, 2)
        })

    # Step 2: Eligible for Semantic Cache Lookup
    # Generate INT8 ONNX embedding
    try:
        t_embed_start = time.perf_counter()
        query_vector = embedder.encode(query)
        embed_latency_ms = (time.perf_counter() - t_embed_start) * 1000.0
    except Exception as e:
        logger.error(f"Embedding generation error: {e}")
        return build_response(500, {
            "routing_decision": "SERVICE_ERROR",
            "error": "Failed to generate query embedding vector",
            "correlation_id": correlation_id
        })

    # Step 3: Two-Stage Semantic Cache Engine
    t_cache_start = time.perf_counter()
    cache_lookup_result = cache_engine.query_cache(raw_query=query, query_vector=query_vector)
    cache_latency_ms = (time.perf_counter() - t_cache_start) * 1000.0
    total_latency_ms = (time.perf_counter() - start_time) * 1000.0

    # CASE D: VERIFIED CACHE HIT
    if cache_lookup_result["cache_hit"]:
        matched_entry = cache_lookup_result["matched_entry"]

        audit_rec = create_audit_record(
            query_sha256=query_sha256,
            routing_decision="SAFE_CACHE_CANDIDATE",
            correlation_id=correlation_id,
            notification_status="not_applicable",
            latency_ms=total_latency_ms,
            extra_metadata={
                "similarity_score": cache_lookup_result["similarity_score"],
                "matched_entry_id": matched_entry["entry_id"]
            }
        )
        persist_audit_record(audit_rec, config.TABLE_AUDIT)

        return build_response(200, {
            "routing_decision": "SAFE_CACHE_CANDIDATE",
            "cache_hit": True,
            "similarity_score": cache_lookup_result["similarity_score"],
            "threshold_used": cache_lookup_result["threshold_used"],
            "matched_question": matched_entry["approved_question"],
            "answer": matched_entry["approved_answer"],
            "source_url": matched_entry["source_url"],
            "reviewed_by": matched_entry["reviewed_by"],
            "reviewed_at": matched_entry["reviewed_at"],
            "safety_category": matched_entry["safety_category"],
            "latency": {
                "total_ms": round(total_latency_ms, 2),
                "embedding_ms": round(embed_latency_ms, 2),
                "cache_lookup_ms": round(cache_latency_ms, 2)
            },
            "query_digest": query_sha256,
            "correlation_id": correlation_id
        })

    # CASE E: CACHE MISS (Controlled Fallback Path)
    audit_rec = create_audit_record(
        query_sha256=query_sha256,
        routing_decision="CACHE_MISS",
        correlation_id=correlation_id,
        notification_status="not_applicable",
        latency_ms=total_latency_ms,
        extra_metadata={
            "similarity_score": cache_lookup_result.get("similarity_score", 0.0),
            "miss_reason": cache_lookup_result.get("reason", "UNKNOWN_MISS")
        }
    )
    persist_audit_record(audit_rec, config.TABLE_AUDIT)

    return build_response(200, {
        "routing_decision": "CACHE_MISS",
        "cache_hit": False,
        "reason": cache_lookup_result.get("reason"),
        "similarity_score": cache_lookup_result.get("similarity_score", 0.0),
        "threshold_used": cache_lookup_result.get("threshold_used", config.COSINE_THRESHOLD),
        "answer": (
            "I'm not sure. No verified human-reviewed answer was found in the trusted cache "
            "for this inquiry. Please consult a qualified clinician."
        ),
        "unverified_slm_enabled": False,
        "latency": {
            "total_ms": round(total_latency_ms, 2),
            "embedding_ms": round(embed_latency_ms, 2),
            "cache_lookup_ms": round(cache_latency_ms, 2)
        },
        "query_digest": query_sha256,
        "correlation_id": correlation_id
    })
