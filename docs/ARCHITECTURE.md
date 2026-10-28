# GenSync-Cache — Architecture & Systems Specification

## Overview

**GenSync-Cache** is a research prototype evaluating safety-aware serverless semantic caching for clinical question answering. The central research hypothesis is whether deterministic clinical compatibility gating combined with serverless two-stage vector retrieval can safely reduce repetitive answer-processing latency and cost while preventing clinically incompatible queries from receiving cached answers.

```
+---------------------------------------------------------------------------------------+
|                                    User Interface                                     |
|                            (React Dashboard / Vite / Tailwind)                        |
+-------------------------------------------+-------------------------------------------+
                                            | HTTPS / JSON
                                            v
+---------------------------------------------------------------------------------------+
|                               Amazon API Gateway (HTTP API)                           |
+-------------------------------------------+-------------------------------------------+
                                            | Lambda Proxy Integration
                                            v
+---------------------------------------------------------------------------------------+
|                              Tier-1 Lambda (Python 3.11)                              |
|                                                                                       |
|   1. Request Validation & Sanitization                                                |
|   2. Deterministic Rule Layer:                                                        |
|      * Emergency Gate (Severe chest pain, stroke, breathing difficulty, etc.)         |
|        --> MATCH? Publish minimal JSON SNS alert (ClinicalEmergencyTriage)             |
|            & Return immediate emergency advisory (Dial 112). Zero cache/model access. |
|      * Professional Referral Gate (Pediatrics, dosing, pregnancy, interactions)       |
|        --> MATCH? Return verified clinical referral links. Zero cache/model access.   |
|   3. INT8 all-MiniLM-L6-v2 Embedding (ONNX Runtime + tokenizers via Lambda Layer)     |
|   4. Stage 1: Centroid Distance Pruning (gensync_cluster_centroids)                   |
|   5. Stage 2: Candidate Retrieval via DynamoDB GSI (cluster_id-index)                 |
|      * Note: Uses standard DynamoDB GSI partition queries (NOT unreleased native       |
|        vector indexes), ensuring 100% provider & SDK compatibility.                   |
|   6. Compute Layer In-Memory Cosine Similarity & Threshold Evaluation (>= 0.92)       |
|   7. Deterministic Clinical Compatibility Gate (Negation, Dosage, Demographic checks)|
|   8. Trust Verification Gate (review_status == 'approved')                            |
|   9. Query Privacy Audit Logging (SHA-256 Digest -> gensync_triage_audit_log)         |
+-------------------------------------+-------------------------------------------------+
                                      |
                 +--------------------+--------------------+
                 | CACHE HIT                               | CACHE MISS
                 v                                         v
   +---------------------------+              +---------------------------+
   | Return Approved Answer    |              | Controlled Fallback Path  |
   | Source URL + Review Date  |              | Safe message: "I'm not    |
   +---------------------------+              | sure. Please consult a    |
                                              | qualified clinician."     |
                                              +---------------------------+
```

---

## Non-Negotiable System Invariants

1. **Safety Before Retrieval**: No embedding search, cache lookup, or SLM generation may occur prior to the evaluation of deterministic emergency and professional-referral rules.
2. **Deterministic Precedence**: No language model or probabilistic classifier decides whether a query is safe or an emergency.
3. **Transparent Database Architecture**: DynamoDB uses a two-stage clustered architecture:
   - Centroid screening prunes unpromising topic clusters.
   - Standard Global Secondary Index (`cluster_id-index`) queries retrieve candidate vectors.
   - Lambda compute computes fine-grained cosine similarity and executes clinical compatibility checks.
   - Does **NOT** rely on or falsely claim unreleased/unsupported DynamoDB native vector index search.
4. **No Automatic Cache Promotion**: Output from any optional fallback model is never written to `semantic_query_cache`. It is placed in `slm_review_queue` as `pending`.
5. **Zero Raw Clinical Text in Audit Logs**: Only SHA-256 digests (`hashlib.sha256(q).hexdigest()`) and categorical routing decisions are persisted in audit stores or CloudWatch logs.
6. **Serverless & Cost Conscious**:
   - Lambda runs outside VPCs (eliminating NAT Gateway and VPC Endpoint costs).
   - Zero provisioned concurrency.
   - CloudWatch log retention capped strictly at 7 days.
