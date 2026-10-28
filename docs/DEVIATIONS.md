# GenSync-Cache — Architectural & Implementation Deviations

This document logs every divergence from original design assumptions, along with experimental evidence, technical limitations, closest feasible alternatives, cost impacts, and research implications.

---

## Deviation Register

### DEV-001: Local Environment Tooling Differences
- **Date Recorded**: 2026-10-28
- **Original Requirement**: Pre-installed local development tools including Terraform and running Docker daemon.
- **Actual State**:
  - `terraform` is not pre-installed on the host system PATH. (Windows Package Manager `winget` is available for installation: `winget install HashiCorp.Terraform`).
  - Docker CLI (`29.2.0`) is present, but the Docker Desktop daemon is not currently active (`npipe:////./pipe/dockerDesktopLinuxEngine` not found).
- **Evidence**:
  ```powershell
  # terraform : The term 'terraform' is not recognized
  # docker ps : failed to connect to the docker API at npipe
  ```
- **Feasible Alternative / Resolution**:
  - Terraform will be installed via `winget` prior to Phase 3 infrastructure planning.
  - Tier-1 Lambda packaging (Phase 1) is a lightweight Python 3.11 `.zip` using ONNX Runtime, requiring no Docker.
  - Docker Desktop daemon will only be required during Phase 2 (Tier-2 SLM container build).
- **Cost Impact**: Zero.
- **Functional Impact**: None on Phase 0 or Phase 1.

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

