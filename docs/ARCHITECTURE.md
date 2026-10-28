# GenSync-Cache — Architecture & Systems Specification

## Overview

**GenSync-Cache** is a research prototype evaluating safety-aware serverless semantic caching for clinical question answering. The central research hypothesis is whether deterministic clinical compatibility gating combined with serverless vector search can safely reduce repetitive answer-processing latency and cost while preventing clinically incompatible queries from receiving cached answers.

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
|      * Emergency Check (Chest pain, stroke, severe bleeding, anaphylaxis, overdose)   |
|        --> MATCH? Publish SNS Alert (ClinicalEmergencyTriage) & Return Emergency Msg  |
|      * Professional Referral Check (Pediatrics, dosing, pregnancy, interactions)      |
|        --> MATCH? Return Verified Referral Link & Advice (No cache/model invoked)     |
|   3. INT8 all-MiniLM-L6-v2 Embedding (ONNX Runtime + tokenizers)                      |
|   4. Stage 1: Centroid Distance Pruning (cluster_centroids)                          |
|   5. Stage 2: Semantic Cache Lookup (semantic_query_cache)                            |
|   6. Deterministic Clinical Compatibility Gate (Cosine Similarity >= 0.92 + Checks)   |
|   7. Human-Reviewed Verification Gate (status == 'approved')                          |
|   8. Query Privacy Audit Logging (SHA-256 Digest -> triage_audit_log)                 |
+-------------------------------------+-------------------------------------------------+
                                      |
                 +--------------------+--------------------+
                 | CACHE HIT                               | CACHE MISS
                 v                                         v
   +---------------------------+              +---------------------------+
   | Return Approved Answer    |              | Controlled Fallback Path  |
   | Source URL + Review Date  |              | Optional Tier-2 SLM       |
   +---------------------------+              | (SmolLM-135M-Instruct)    |
                                              | * Write to Review Queue   |
                                              | * Label: UNVERIFIED       |
                                              +---------------------------+
```

---

## Non-Negotiable System Invariants

1. **Safety Before Retrieval**: No embedding search, cache lookup, or SLM generation may occur prior to the evaluation of deterministic emergency and professional-referral rules.
2. **Deterministic Precedence**: No language model or probabilistic classifier decides whether a query is safe or an emergency.
3. **No Automatic Cache Promotion**: Output from the SLM is never written to `semantic_query_cache`. It is placed in `slm_review_queue` as `pending`.
4. **Zero Raw Clinical Text in Audit Logs**: Only SHA-256 digests (`hashlib.sha256(q).hexdigest()`) and categorical routing decisions are persisted in audit stores or CloudWatch logs.
5. **Serverless & Cost Conscious**:
   - Both Lambdas run outside VPCs (eliminating NAT Gateway and VPC Endpoint costs).
   - Zero provisioned concurrency.
   - CloudWatch log retention capped at 7 days.
