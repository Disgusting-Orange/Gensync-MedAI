# GenSync-MedAI: Running Experimentation & Audit Log

**Repository**: `GenSync-MedAI`  
**Primary Platform**: AWS Lambda (Python 3.11, `ap-south-1`) + DynamoDB + API Gateway  

---

## Experiment Run Registry

| Run ID | Date / Time | Git Commit | Focus / Workstream | Target AWS Environment | Key Finding / Artifact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `EXP-WS0-AUDIT` | 2026-10-30 15:38 | `be499c0` | WS0: Baseline Codebase Audit | Local Workspace + AWS inspection | Uncovered raw query in SNS, unsalted SHA-256, auto-caching unapproved text, and 15-entry seed corpus. Documented in `docs/audit.md`. |

---
