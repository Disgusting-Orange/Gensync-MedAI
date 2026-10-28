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

### DEV-002: Existing AWS Budget Configuration
- **Date Recorded**: 2026-10-28
- **Original Requirement**: Create an AWS Budget with a \$0.01 threshold.
- **Actual State**: An existing AWS Budget named `"My Zero-Spend Budget"` with a limit of \$1.00 USD already exists in the account (`471597060887`), currently tracking actual spend (\$0.00) and forecasted spend (\$0.096).
- **Feasible Alternative / Resolution**:
  - Recommend adding a dedicated budget `gensync-budget-1cent` ($0.01 limit) with the user's specific email alert, or updating the existing Zero-Spend budget notification subscriber.
- **Approval Required**: User confirmation of alert recipient email address and explicit approval before modifying or creating budgets.
- **Cost Impact**: First 2 action-enabled budgets are within the AWS Free Tier.
