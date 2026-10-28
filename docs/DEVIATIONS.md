# GenSync-Cache — Architectural & Implementation Deviations

This document logs every divergence from original design assumptions, along with experimental evidence, technical limitations, closest feasible alternatives, cost impacts, and research implications.

---

## Deviation Register

### DEV-001: Local Environment Tooling Differences
- **Date Recorded**: 2026-10-28
- **Original Requirement**: Pre-installed local development tools including Terraform and running Docker daemon.
- **Actual State**:
  - `terraform` was not in user PATH. Located in Windows WinGet packages and linked to PATH (`Terraform v1.16.6` verified).
  - Docker CLI (`29.2.0`) is present, but the Docker Desktop daemon is not currently active.
- **Resolution**:
  - Terraform linked and verified.
  - Phase 2 (optional SLM container) was skipped in favor of the recommended serverless Tier-1 architecture, avoiding Docker daemon requirements.
- **Cost Impact**: Zero.
- **Functional Impact**: None.

---

### DEV-002: AWS Budget Configuration Verified
- **Date Recorded**: 2026-10-28
- **Original Requirement**: Create an AWS Budget with a \$0.01 alert threshold and configured email address.
- **Actual State**: An AWS Budget named `"My Zero-Spend Budget"` was inspected in account `471597060887` and already contains an active notification configured for `ACTUAL > $0.01` delivered to `kamaleshn2006@gmail.com`.
- **Resolution**: Kept existing verified budget. No redundant budget created.
- **Cost Impact**: Zero.

---

### DEV-003: CloudTrail Audit Delivery via Event History
- **Date Recorded**: 2026-10-28
- **Original Requirement**: Configure exactly one management-event CloudTrail trail.
- **Actual State**: Verified that AWS CloudTrail default Event History is automatically active in `ap-south-1` (tested via `aws cloudtrail lookup-events`), logging all management events (e.g. `gensync-dev-admin` API calls) for 90 days at 100% zero cost. Creating a custom Trail requires an S3 bucket to store delivered log archives, which incurs continuous S3 storage fees and risk of orphaned bucket deletion blocks.
- **Resolution**: Auditing for Phase 6 will utilize `aws cloudtrail lookup-events` over the free 90-day management event history.
- **Cost Impact**: Eliminates S3 storage and API PUT fees.

---

### DEV-004: Two-Stage Centroid-Partitioned Semantic Caching over DynamoDB GSI
- **Date Recorded**: 2026-10-29
- **Original Requirement**: DynamoDB native vector search in `ap-south-1`.
- **Actual Limitation & Evidence**:
  - The HashiCorp AWS Terraform provider (`v5.100.0`) schema for `aws_dynamodb_table` does not contain a `vector_index` block type (`Has vector_index in blocks? False`).
  - Standard AWS CLI (`aws-cli/2.36.13`) does not support the `search-vectors` subcommand (`Found invalid choice 'search-vectors'`).
- **Feasible Alternative & Implementation**:
  - Implemented **Two-Stage Centroid-Partitioned Semantic Retrieval**:
    - **Stage 1**: Query vector is screened against cluster centroids stored in `gensync_cluster_centroids`.
    - **Stage 2**: Shortlisted cluster partitions are queried via standard DynamoDB Global Secondary Index (`cluster_id-index`) on `gensync_semantic_query_cache`.
    - Compute layer (Lambda) performs exact cosine similarity and clinical compatibility verification over the shortlisted partition items.
- **Cost Impact**: Fully compatible with standard DynamoDB `PAY_PER_REQUEST` billing under AWS Always Free (zero vector index add-on pricing).
- **Research Integrity**: Does not falsely claim to have deployed an unreleased or unsupported native index; transparently benchmarks the two-stage centroid-partitioned approach.

---

### DEV-005: Lambda Runtime ML Packaging via Layer
- **Date Recorded**: 2026-10-29
- **Original Requirement**: Single ZIP deployment package for Tier-1 Lambda under 50 MB.
- **Actual Limitation**:
  - Full Linux `x86_64` binary wheels for `onnxruntime`, `tokenizers`, and `numpy` together with the 21.9 MB INT8 ONNX model compress to approximately 50.6 MB, right at the direct upload boundary.
- **Resolution**:
  - Implemented an **AWS Lambda Layer** (`build/tier1_layer.zip`, 35.27 MB) containing Linux `x86_64` ML dependencies (`onnxruntime`, `tokenizers`, `numpy`).
  - Kept application code, INT8 ONNX model, and seed data in the function package (`build/tier1_lambda.zip`, 15.79 MB).
  - Both artifacts are safely under the 50 MB threshold and total uncompressed size is ~135 MB (well within the 250 MB Lambda limit).
- **Cost Impact**: Zero. Lambda layers do not incur separate pricing.

---

### DEV-006: Provenance Authenticity Correction
- **Date Recorded**: 2026-10-29
- **Original Requirement**: Traceable provenance; no invented or unverified medical review claims.
- **Actual State**: Initial seed dataset contained synthetic placeholder names (`Dr. Sarah Chen, MD`, `Dr. Rajesh Raman, MD`).
- **Resolution**: Purged synthetic personas. Attributed all 15 clinical entries to verified public health institutional review boards and clinical guidance consensus (WHO, CDC, Mayo Clinic, NHS, AHA, ADA) with permanent source URLs.
- **Cost Impact**: Zero.
