# GenSync-Cache: Safety-Aware Serverless Semantic Caching for Clinical Question Answering

> [!WARNING]
> **Research Prototype Disclaimer**: This repository is an academic research prototype built for Cloud Architecture Design (CAD). It is **NOT** a diagnostic system, certified medical device, or substitute for professional medical consultation. It does not provide medical diagnoses or guaranteed emergency response.

---

## 1. Project Purpose & Scope

GenSync-Cache investigates whether a serverless semantic cache equipped with a **deterministic clinical compatibility gate** can safely reduce repetitive answer-processing latency and operating cost, while preventing clinically adversarial queries from receiving inappropriate cached answers.

### Key Architectural Tenets:
1. **Safety Before Retrieval**: Deterministic emergency and referral rules execute prior to embedding generation or cache lookup.
2. **Emergency Routing**: Confirmed emergency symptoms route to immediate guidance (`EMERGENCY_NUMBER`, default `112`) and dispatch an operational SNS alert (`ClinicalEmergencyTriage`).
3. **Professional Referral**: Pediatric, dosing, prescription, and pregnancy queries divert to verified referral paths.
4. **Answer Trust Hierarchy**: Only human-reviewed entries are returned as trusted cached answers. SLM-generated answers are marked `UNVERIFIED` and placed in a pending review queue.
5. **Zero Raw PHI Logging**: Audit records store only SHA-256 query digests.

---

## 2. Architecture Overview

```
React Frontend -> API Gateway HTTP API -> Tier-1 Lambda (Python 3.11, INT8 ONNX) -> DynamoDB
                                                                                -> SNS (Triage Alert)
                                                                                -> (Optional) Tier-2 SLM
```

---

## 3. Cost Kill-Switch

This section outlines critical procedures to halt traffic, teardown infrastructure, and eliminate cloud spending.

### How to Stop Application Traffic
1. **Immediate API Throttling**: In the AWS Console or via AWS CLI, set API Gateway route throttling to `0` RPS or disable the route:
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
- **Budgets Are Not Hard Spending Caps**: An AWS Budget alert notifies you when spend exceeds a threshold (e.g., \$0.01 or \$1.00); it **does not** automatically stop AWS services or prevent further billing.
- **Billing Data Delays**: AWS Cost Explorer and Free Tier metrics typically experience an **8 to 24-hour reporting delay**. A display of \$0.00 right now does not guarantee zero incurred charges for today's requests.
- **Undeployed / Lingering Resources**: CloudWatch Log Groups, retained S3 buckets, and non-empty ECR repositories continue to incur storage fees even after Lambdas are deleted unless explicitly destroyed.

---

## 4. Local Environment & Setup

### Prerequisites
- Python 3.11+
- Node.js v18+ & npm
- AWS CLI v2 (`aws configure` completed)
- Terraform (install via `winget install HashiCorp.Terraform`)

### Initial Configuration
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

---

## 5. Phased Roadmap & Gates

- [x] **Phase 0**: Environment inspection, cost guards, and teardown safeguards. *(Current Phase)*
- [ ] **Phase 1**: Database schema, approved seed dataset, embeddings, deterministic triage rules, and Tier-1 Lambda.
- [ ] **Phase 2**: Optional Tier-2 SLM container (SmolLM-135M-Instruct).
- [ ] **Phase 3**: Modular Terraform planning & approval gate.
- [ ] **Phase 4**: Deployment & integration health verification.
- [ ] **Phase 5**: Responsive React frontend application.
- [ ] **Phase 6**: Adversarial benchmarking, latency evaluation, and final report.
