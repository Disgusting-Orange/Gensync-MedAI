# GenSync-Cache — Security & Privacy Architecture

## 1. Threat Model & Clinical Risk Boundaries

GenSync-Cache is a **research prototype** designed for academic evaluation under Cloud Architecture Design (CAD). It is explicitly **NOT a medical device**, diagnostic aid, or replacement for qualified healthcare professionals.

### Primary Risks & Mitigations
| Threat Vector | Risk Description | Architectural Mitigation |
| :--- | :--- | :--- |
| **Emergency Condition** | User inputs critical symptoms (e.g. myocardial infarction, stroke). | Deterministic keyword/pattern matching intercepts query before cache or LLM; returns emergency advisory immediately; publishes asynchronous operational alert to SNS. |
| **High-Risk Medical Advice** | User asks for pediatric dosing, drug interactions, or self-treatment. | Deterministic professional-referral gate diverts query to verified clinic/telemedicine referral directory. |
| **Semantic Drift / False Hit** | Paraphrased query matches cached answer with conflicting clinical nuances (e.g., 5mg vs 50mg, child vs adult). | Deterministic Clinical Compatibility Gate verifies negation, dosage, and entity alignment in addition to cosine similarity threshold. |
| **Cache Poisoning** | Untrusted SLM output polluting the trusted cache. | SLM output strictly diverted to `slm_review_queue` with status `pending`. Cache reads filter exclusively for `status = 'approved'`. |
| **PHI / Query Leakage** | Patient queries logged in CloudWatch, analytics, or error traces. | Cryptographic SHA-256 digest logging (`hashlib.sha256().hexdigest()`). No raw clinical query text in audit logs or exceptions. |

---

## 2. Cryptographic Audit Limitations

- **SHA-256 Digest**: Raw query text is hashed using SHA-256 before being written to `gensync_triage_audit_log` or logged to CloudWatch.
- **Known Limitation**: For short, highly predictable questions (e.g., "What is normal blood pressure?"), precomputed rainbow tables or dictionary attacks can potentially identify the input. In production healthcare systems, an HMAC with an account-managed KMS secret key is recommended (see [IDEAS.md](IDEAS.md)).

---

## 3. IAM & Infrastructure Security

- **Least-Privilege Execution**: Tier-1 Lambda is granted permissions strictly for:
  - `dynamodb:GetItem`, `dynamodb:Query`, `dynamodb:PutItem` on specific GenSync tables.
  - `sns:Publish` on topic `ClinicalEmergencyTriage`.
  - `logs:CreateLogStream`, `logs:PutLogEvents` on `/aws/lambda/gensync-*`.
- **Zero VPC Traversal Fees**: Lambdas run serverless outside a VPC, eliminating the requirement for \$32+/month AWS NAT Gateways while preserving security via IAM-authenticated AWS service APIs.
- **Frontend Isolation**: No AWS credentials, secrets, or internal service ARNs are ever exposed to the client browser. All communication is brokered through Amazon API Gateway HTTP API.
