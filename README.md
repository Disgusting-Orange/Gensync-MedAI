# GenSync-Cache: Safety-Aware Serverless Semantic Caching for Clinical Question Answering

> [!WARNING]
> **Research Prototype Disclaimer**: This repository is an academic research prototype built for Cloud Architecture Design (CAD). It is **NOT** a diagnostic system, certified medical device, or substitute for professional medical consultation. It does not provide medical diagnoses or guaranteed emergency response.

---

## 1. Project Purpose & Scope

GenSync-Cache investigates whether a serverless semantic cache equipped with a **deterministic clinical compatibility gate** can safely reduce repetitive answer-processing latency and operating cost, while preventing clinically adversarial queries from receiving inappropriate cached answers.

### Key Architectural Tenets:
1. **Safety Before Retrieval**: Deterministic emergency and referral rules execute prior to embedding generation or cache lookup.
2. **Emergency Routing**: Confirmed emergency symptoms route to immediate guidance (`EMERGENCY_NUMBER`, default `112`) and dispatch an operational SNS alert (`ClinicalEmergencyTriage`). Zero cache or model access occurs.
3. **Professional Referral**: Pediatric, dosing, prescription, and pregnancy queries divert to verified referral paths. Zero cache or model access occurs.
4. **Two-Stage Clustered Retrieval**:
   - **Stage 1**: Screen query vectors against cluster centroids in `gensync_cluster_centroids`.
   - **Stage 2**: Query candidate partition entries from `gensync_semantic_query_cache` via standard DynamoDB Global Secondary Index (`cluster_id-index`).
   - Fine-grained cosine similarity calculation and clinical compatibility checks occur inside the Lambda runtime.
   - *Note: This design explicitly avoids unreleased or unsupported DynamoDB native vector index features, ensuring 100% provider and SDK compatibility.*
5. **Answer Trust Hierarchy**: Only human-reviewed entries with verified institutional provenance are returned as trusted cached answers.
6. **Zero Raw PHI Logging**: Audit records store only SHA-256 query digests.

---

## 2. Architecture Overview

```
React Frontend -> API Gateway HTTP API -> Tier-1 Lambda (Python 3.11, INT8 ONNX Layer) -> DynamoDB (Centroids & GSI Cache)
                                                                                        -> SNS (Triage Alert)
```

---

## 3. Cost Kill-Switch

This section outlines critical procedures to halt traffic, teardown infrastructure, and eliminate cloud spending.

### How to Stop Application Traffic
1. **Immediate API Throttling**: In the AWS Console or via AWS CLI, set API Gateway route throttling to `0` RPS:
   ```powershell
   aws apigatewayv2 update-stage --api-id <API_ID> --stage-name '$default' --default-route-settings "ThrottlingBurstLimit=0,ThrottlingRateLimit=0" --region ap-south-1
   ```
2. **Lambda Concurrency Cap**: Set Lambda reserved concurrency to `0` to instantly stop execution:
   ```powershell
   aws lambda put-function-concurrency --function-name gensync-tier1-handler --reserved-concurrent-executions 0 --region ap-south-1
   ```

### How to Teardown All Application Resources
Run the provided automated teardown safeguards:
- **Bash / Linux**: `./scripts/destroy.sh`
- **PowerShell / Windows**: `.\scripts\destroy.ps1`

The script requires explicit interactive confirmation (`yes`), executes `terraform destroy`, purges project ECR images, and audits remaining cloud resources.

### Important Billing Realities
- **Budgets Are Not Hard Spending Caps**: An AWS Budget alert notifies you when spend exceeds a threshold (e.g., \$0.01 or \$1.00); it **does not** automatically shut down AWS services.
- **Billing Data Delays**: AWS Cost Explorer and Free Tier metrics typically experience an **8 to 24-hour reporting delay**.
- **Undeployed / Lingering Resources**: CloudWatch Log Groups and retained resources continue to incur storage fees unless explicitly destroyed.

---

## 4. Local Environment & Setup

### Prerequisites
- Python 3.11+
- Node.js v18+ & npm
- AWS CLI v2 (`aws configure` completed)
- Terraform v1.5+

### Initial Configuration
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
