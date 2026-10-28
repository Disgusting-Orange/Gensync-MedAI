# GenSync-Cache — Database Design & Seed Data Specification

## 1. Overview & Data Architecture

GenSync-Cache manages clinical question-answering cache data across two primary engines:
1. **Primary Production (Amazon DynamoDB)**:
   - Uses a **Two-Stage Centroid-Partitioned Architecture** over standard DynamoDB tables.
   - Stage 1 screens query vectors against cluster centroids in `gensync_cluster_centroids`.
   - Stage 2 retrieves candidate records using a standard Global Secondary Index (`cluster_id-index`) on `gensync_semantic_query_cache`.
   - Exact cosine similarity and clinical compatibility checks are computed inside the Tier-1 Lambda environment.
   - **Architectural Clarification**: This design explicitly uses standard DynamoDB GSI partitioning rather than unsupported or unreleased native `vector_index` constructs, ensuring complete compatibility with the official HashiCorp AWS Terraform provider (`v5.100.0`) and standard AWS SDKs in `ap-south-1`.
2. **Relational Fallback**: PostgreSQL / Neon with `pgvector` extension (documented in `db/schema.sql`).

---

## 2. Table Specifications

### A. `gensync_cluster_centroids`
Stores Stage 1 semantic cluster boundaries for coarse-grained candidate filtering.

| Attribute | DynamoDB Type | Description |
| :--- | :--- | :--- |
| `cluster_id` (PK) | `S` (String) | Unique cluster slug (e.g. `cluster_hydration_wellness`) |
| `cluster_name` | `S` (String) | Human-readable cluster title |
| `centroid_vector` | `L` (List of Numbers) | 384-dimensional unit vector computed as the mean of constituent embeddings |
| `cluster_radius` | `N` (Number) | Maximum cosine distance from centroid to any member in the cluster |
| `candidate_gate_threshold` | `N` (Number) | Minimum cosine similarity to centroid required to consider cluster as candidate |
| `model_name` | `S` (String) | Embedding model (`all-MiniLM-L6-v2`) |
| `updated_at` | `S` (ISO8601) | Timestamp of last recalculation |

### B. `gensync_semantic_query_cache`
Stores approved clinical questions and vetted educational answers with traceable institutional provenance.

| Attribute | DynamoDB Type | Description |
| :--- | :--- | :--- |
| `entry_id` (PK) | `S` (UUID) | Unique cache entry identifier |
| `cluster_id` (GSI PK) | `S` (String) | Associated cluster for candidate partitioning via `cluster_id-index` |
| `approved_question` | `S` (String) | Canonical query |
| `approved_answer` | `S` (String) | Vetted educational answer text |
| `embedding` | `L` (List of Numbers) | 384-dimensional L2-normalized float vector |
| `source_type` | `S` (String) | Enum: `seed`, `slm`, `human_reviewed` |
| `review_status` | `S` (String) | Enum: `pending`, `approved`, `rejected` (Cache hits require `approved`) |
| `source_url` | `S` (String) | Authoritative reference link (WHO, CDC, NHS, Mayo Clinic) |
| `reviewed_by` | `S` (String) | Institutional review board / consensus guideline citation |
| `reviewed_at` | `S` (ISO8601) | Review timestamp |
| `content_version` | `S` (String) | Content revision tracking |
| `safety_category` | `S` (String) | Clinical domain tag |

### C. `gensync_triage_audit_log`
Strict privacy audit store. **Zero raw clinical query text is ever stored.**

| Attribute | DynamoDB Type | Description |
| :--- | :--- | :--- |
| `audit_id` (PK) | `S` (UUID) | Unique audit record identifier |
| `query_sha256` (GSI PK) | `S` (Hex 64) | SHA-256 cryptographic digest of incoming query text |
| `routing_decision` | `S` (String) | `EMERGENCY`, `PROFESSIONAL_REFERRAL`, `SAFE_CACHE_CANDIDATE`, `CACHE_MISS`, etc. |
| `rule_set_version` | `S` (String) | Version of deterministic rule engine (`1.0.0`) |
| `notification_status`| `S` (String) | SNS delivery status: `published`, `failed`, `not_configured`, `not_applicable` |
| `correlation_id` | `S` (String) | Trace ID for request correlation |
| `created_at` | `S` (ISO8601) | Event timestamp |

### D. `gensync_slm_review_queue`
Quarantine storage for optional Tier-2 language model outputs.

| Attribute | DynamoDB Type | Description |
| :--- | :--- | :--- |
| `queue_id` (PK) | `S` (UUID) | Review item identifier |
| `query_sha256` | `S` (Hex 64) | Query digest |
| `slm_generated_answer` | `S` (String) | Raw model output |
| `review_status` | `S` (String) | Starts as `pending`; only explicit approval promotes to cache |
| `model_identifier` | `S` (String) | Model tag (e.g. `SmolLM-135M-Instruct-Q4_K_M`) |
| `created_at` | `S` (ISO8601) | Generation timestamp |
