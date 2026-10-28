# GenSync-MedAI: Safety-Aware Serverless Semantic Caching for Clinical Q&A

> [!WARNING]
> **Clinical Research Prototype Disclaimer**: This repository is an academic research prototype engineered for Cloud Architecture Design (CAD). It is **NOT** a diagnostic system, medical device, clinical decision-support tool, or substitute for professional medical consultation. It does not provide medical diagnoses or guaranteed emergency dispatch.

---

## 1. Project Purpose & Scope

GenSync-MedAI investigates whether a serverless semantic cache equipped with a **deterministic clinical compatibility gate** can safely reduce repetitive query processing latency while preventing clinically adversarial or incompatible queries from receiving inappropriate cached answers.

### Key Architectural Tenets:
1. **Safety Before Retrieval**: Deterministic emergency and professional-referral safety gates execute before any embedding generation, vector distance computation, or cache lookup.
2. **Emergency Routing**: Critical symptoms route to immediate guidance (`EMERGENCY_NUMBER`, default `112` for India) and dispatch an operational SNS alert (`ClinicalEmergencyTriage`). Vector lookup is completely bypassed (0 ms lookup).
3. **Professional Clinical Referral**: Pediatric, drug-interaction, dosing, prescription, and pregnancy queries divert to verified referral paths with links to official healthcare portals (National Health Portal India, eSanjeevani Telemedicine, NHS 111, CDC).
4. **Two-Stage Clustered Retrieval (Amazon DynamoDB)**:
   - **Stage 1**: Screens query vectors against cluster centroids in table `gensync_cluster_centroids`.
   - **Stage 2**: Queries candidate partition entries from `gensync_semantic_query_cache` via standard DynamoDB Global Secondary Index (`cluster_id-index`).
   - Fine-grained cosine similarity calculation ($\ge 0.92$) and clinical compatibility checks occur inside the Lambda runtime.
   - *Note: This design explicitly uses standard DynamoDB GSIs rather than unreleased native vector search features, ensuring 100% provider and SDK compatibility.*
5. **Answer Trust Hierarchy**: Only human-reviewed entries with verified institutional provenance (Mayo Clinic, CDC, WHO, AHA, ADA) are returned as trusted cached answers. Unverified SLM generation is strictly disabled.
6. **Zero Raw PHI Logging**: Audit records store only one-way cryptographic SHA-256 query digests. Raw clinical text is never persisted to DynamoDB, CloudWatch, or SNS alerts.

---

## 2. System Architecture

```
User / Evaluator
       │
       ▼
React Clinical Console (Vite + React 19 + Vitest)
       │
       ▼  (HTTPS POST /query)
Amazon API Gateway (HTTP API CORS Enabled)
       │
       ▼
AWS Lambda Tier-1 Handler (Python 3.11 x86_64)
  ├── 1. Deterministic Triage Rules (Emergency & Referral)
  │      └── Matched? ──► [SNS Topic: ClinicalEmergencyTriage] (Bypasses Cache)
  ├── 2. INT8 Quantized ONNX Embedder (all-MiniLM-L6-v2)
  ├── 3. Two-Stage DynamoDB Retrieval:
  │      ├── Stage 1: Cluster Centroids Table (gensync_cluster_centroids)
  │      └── Stage 2: Candidate Query via GSI (gensync_semantic_query_cache / cluster_id-index)
  ├── 4. Cosine Similarity & Clinical Compatibility Gate
  └── 5. Audit Logger (Zero Raw PHI: SHA-256 Digest -> gensync_triage_audit_log)
```

---

## 3. Local Development & Quickstart

### Prerequisites
- Python 3.11+
- Node.js v18+ & npm
- AWS CLI v2 (`aws configure` completed)
- Terraform v1.5+

### 1. Backend Setup & Testing
```powershell
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install Python dependencies
pip install -r src/tier1/requirements.txt
pip install pytest boto3 requests

# Run backend unit test suite (53 tests)
python -m pytest tests/
```

### 2. Frontend Console Setup & Testing
```powershell
cd frontend

# Install frontend dependencies
npm install

# Run automated frontend test suite (8 tests)
npm test

# Build production bundle
npm run build

# Start local development server (http://localhost:5173)
npm run dev
```

### 3. Run Live Adversarial Benchmark Suite
Executes 32 categorized clinical test cases against the live deployed API Gateway in `ap-south-1`:
```powershell
python tests/benchmark.py
```
Outputs live metrics and writes raw results to `docs/benchmark_results.json`.

---

## 4. Empirical Benchmark Results

Full report available in [`docs/BENCHMARKS.md`](docs/BENCHMARKS.md).

| Metric | Result | Target |
| :--- | :---: | :---: |
| **Total Test Cases** | 32 | $\ge 30$ |
| **Overall Pass Rate** | **96.9% (31 / 32)** | $\ge 90\%$ |
| **Emergency Gate Accuracy** | **100.0% (8 / 8)** | 100.0% |
| **Referral Gate Accuracy** | **100.0% (6 / 6)** | 100.0% |
| **False Cache Hits (Safety Invariant)** | **0.0% (0 / 32)** | **0 (Zero Tolerance)** |
| **Controlled Miss Accuracy** | **100.0% (4 / 4)** | 100.0% |
| **Warm Two-Stage DynamoDB Lookup** | **90.3 ms** | $< 150\text{ ms}$ |
| **Warm INT8 ONNX Embedding** | **119.7 ms** | $< 150\text{ ms}$ |
| **Median Server Total (p50)** | **211.4 ms** | $< 350\text{ ms}$ |

> **Documented Limitation on `HIT-10`:** Test case `HIT-10` ("How does regular physical exercise benefit insulin sensitivity?") was safely diverted to `PROFESSIONAL_REFERRAL` because it mentions prescription insulin. The Stage 1 safety gate prioritized conservative medication referral over cache lookup, intentionally favoring safety over recall.

---

## 5. Cost Kill-Switch & Safeguards

All deployed infrastructure operates within AWS Always Free Tier limits:
- **Active AWS Budget Alert:** Configured at `$0.01 USD` threshold notifying `kamaleshn2006@gmail.com`.
- **Current Actual Spend:** `$0.00 USD`.

### How to Stop Application Traffic
1. **Throttling Ingress to Zero**:
   ```powershell
   aws apigatewayv2 update-stage --api-id <API_ID> --stage-name '$default' --default-route-settings "ThrottlingBurstLimit=0,ThrottlingRateLimit=0" --region ap-south-1
   ```
2. **Lambda Concurrency Cap**:
   ```powershell
   aws lambda put-function-concurrency --function-name gensync-tier1-handler --reserved-concurrent-executions 0 --region ap-south-1
   ```

### How to Teardown All Application Resources
Run the automated teardown safeguard script:
- **PowerShell (Windows)**: `.\scripts\destroy.ps1 -Region ap-south-1`
- **Bash (Linux/macOS)**: `./scripts/destroy.sh ap-south-1`

The script requires explicit interactive confirmation (`yes`), executes `terraform destroy`, purges any transient project ECR images, and audits cloud state.
