"""
GenSync-Cache: Privacy-Preserving Audit & Operational Notification Layer

Privacy Invariants:
1. NEVER log raw clinical query text in CloudWatch, DynamoDB, or SNS.
2. Only cryptographic SHA-256 digests (or HMACs) are persisted.
3. SNS alerts contain only operational metadata, category, and timestamps.
4. Failure of SNS publishing does NOT impede the delivery of emergency advisories to the user.
"""

import hashlib
import json
import logging
import time
import uuid
from typing import Dict, Any, Optional

logger = logging.getLogger("gensync.tier1.audit")
logger.setLevel(logging.INFO)


def compute_query_hash(query: str) -> str:
    """
    Computes standard SHA-256 hex digest of the normalized query string.
    """
    normalized = query.strip().lower()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def publish_emergency_alert(
    query_sha256: str,
    matched_category: str,
    correlation_id: str,
    topic_arn: Optional[str] = None,
    sns_client: Any = None
) -> str:
    """
    Publishes an operational alert payload to the SNS Emergency topic.
    Returns: 'published', 'failed', or 'not_configured'.
    
    CRITICAL: Does NOT include raw health query text in the SNS message.
    """
    if not topic_arn or not topic_arn.strip():
        logger.warning("SNS topic ARN not configured. Operational alert skipped.")
        return "not_configured"

    payload = {
        "event_type": "CLINICAL_EMERGENCY_TRIAGE_ALERT",
        "query_sha256": query_sha256,
        "matched_category": matched_category,
        "correlation_id": correlation_id,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "operational_notice": "Automated deterministic triage triggered emergency protocol."
    }

    try:
        if sns_client is None:
            import boto3
            sns_client = boto3.client("sns")

        sns_client.publish(
            TopicArn=topic_arn,
            Subject=f"ALERT: Clinical Emergency Pattern Matched [{matched_category}]",
            Message=json.dumps(payload, indent=2)
        )
        logger.info(f"Published emergency triage alert to SNS. CorrelationId={correlation_id}")
        return "published"
    except Exception as e:
        logger.error(f"SNS publish failed (non-blocking): {str(e)}")
        return "failed"


def create_audit_record(
    query_sha256: str,
    routing_decision: str,
    correlation_id: str,
    rule_set_version: str = "1.0.0",
    notification_status: str = "not_applicable",
    latency_ms: Optional[float] = None,
    extra_metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Assembles a privacy-compliant audit dictionary. Zero raw clinical text.
    """
    record = {
        "audit_id": str(uuid.uuid4()),
        "query_sha256": query_sha256,
        "routing_decision": routing_decision,
        "rule_set_version": rule_set_version,
        "notification_status": notification_status,
        "correlation_id": correlation_id,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    if latency_ms is not None:
        record["latency_ms"] = round(latency_ms, 2)
    if extra_metadata:
        # Strictly ensure no raw query leaked into metadata
        safe_meta = {k: v for k, v in extra_metadata.items() if "query" not in k.lower()}
        record.update(safe_meta)
    return record


def persist_audit_record(
    record: Dict[str, Any],
    table_name: str,
    dynamodb_client: Any = None
) -> bool:
    """
    Persists audit record to DynamoDB. Fails gracefully to CloudWatch log if table is unavailable.
    """
    # Safe structured log to CloudWatch
    logger.info(f"AUDIT_RECORD: {json.dumps(record)}")

    if not table_name:
        return False

    try:
        if dynamodb_client is None:
            import boto3
            dynamodb = boto3.resource("dynamodb")
            table = dynamodb.Table(table_name)
            table.put_item(Item=record)
        else:
            dynamodb_client.put_item(
                TableName=table_name,
                Item={k: {"S": str(v)} for k, v in record.items()}
            )
        return True
    except Exception as e:
        logger.warning(f"DynamoDB audit write skipped/failed: {str(e)}")
        return False
