-- ==============================================================================
-- GenSync-Cache: Relational & Vector Schema (PostgreSQL / Neon + pgvector Fallback)
-- ==============================================================================
-- Note: The primary production architecture utilizes Amazon DynamoDB with native
-- vector attributes or centroid-partitioned querying. This SQL schema serves as
-- the fully compatible relational fallback for local testing or Neon Postgres.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Cluster Centroids
-- Used for Stage 1 candidate pruning before granular vector similarity search.
CREATE TABLE IF NOT EXISTS cluster_centroids (
    cluster_id VARCHAR(64) PRIMARY KEY,
    cluster_name VARCHAR(128) NOT NULL,
    description TEXT,
    centroid_vector vector(384) NOT NULL,
    cluster_radius FLOAT NOT NULL,
    candidate_gate_threshold FLOAT NOT NULL DEFAULT 0.70,
    model_name VARCHAR(64) NOT NULL DEFAULT 'all-MiniLM-L6-v2',
    model_version VARCHAR(32) NOT NULL DEFAULT 'onnx-int8-v1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Semantic Query Cache
-- Stores approved, human-reviewed clinical questions and verified answers.
-- Strictly filters for review_status = 'approved' prior to serving cache hits.
CREATE TABLE IF NOT EXISTS semantic_query_cache (
    entry_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id VARCHAR(64) NOT NULL REFERENCES cluster_centroids(cluster_id) ON DELETE RESTRICT,
    approved_question TEXT NOT NULL,
    approved_answer TEXT NOT NULL,
    embedding vector(384) NOT NULL,
    source_type VARCHAR(32) NOT NULL CHECK (source_type IN ('seed', 'slm', 'human_reviewed')),
    review_status VARCHAR(32) NOT NULL CHECK (review_status IN ('pending', 'approved', 'rejected')),
    source_url TEXT,
    reviewed_by VARCHAR(128),
    reviewed_at TIMESTAMPTZ,
    content_version VARCHAR(32) NOT NULL DEFAULT '1.0',
    safety_category VARCHAR(64) NOT NULL DEFAULT 'GENERAL_WELLNESS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ
);

-- Index for Stage 2 Cosine Vector Search
CREATE INDEX IF NOT EXISTS idx_semantic_cache_embedding 
ON semantic_query_cache 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 10);

-- Index for cluster-scoped queries
CREATE INDEX IF NOT EXISTS idx_semantic_cache_cluster 
ON semantic_query_cache(cluster_id, review_status);

-- 3. Triage Audit Log
-- Privacy invariant: NEVER store raw clinical query text.
-- Stores SHA-256 digests and categorical routing outcomes only.
CREATE TABLE IF NOT EXISTS triage_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_sha256 VARCHAR(64) NOT NULL,
    routing_decision VARCHAR(64) NOT NULL CHECK (
        routing_decision IN (
            'SAFE_CACHE_CANDIDATE',
            'CACHE_MISS',
            'PROFESSIONAL_REFERRAL',
            'EMERGENCY',
            'INVALID_REQUEST',
            'SERVICE_ERROR'
        )
    ),
    rule_set_version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    notification_status VARCHAR(32) NOT NULL DEFAULT 'not_applicable' CHECK (
        notification_status IN ('published', 'failed', 'not_configured', 'not_applicable')
    ),
    correlation_id VARCHAR(64) NOT NULL,
    latency_ms FLOAT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_triage_audit_sha256 
ON triage_audit_log(query_sha256);

CREATE INDEX IF NOT EXISTS idx_triage_audit_created 
ON triage_audit_log(created_at);

-- 4. SLM Review Queue
-- Quarantine buffer for Tier-2 language model outputs.
-- SLM output is NEVER automatically promoted to the trusted cache.
CREATE TABLE IF NOT EXISTS slm_review_queue (
    queue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_sha256 VARCHAR(64) NOT NULL,
    sanitized_prompt_context TEXT,
    slm_generated_answer TEXT NOT NULL,
    review_status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (
        review_status IN ('pending', 'approved', 'rejected')
    ),
    model_identifier VARCHAR(64) NOT NULL,
    reviewer_notes TEXT,
    reviewed_by VARCHAR(128),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_slm_review_status 
ON slm_review_queue(review_status);
