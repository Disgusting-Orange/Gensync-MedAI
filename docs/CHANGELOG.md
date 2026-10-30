# Detailed Changelog: Manuscript Revisions Addressing Reviewer Critiques

**Target Paper**: `GenSync-MedAI: A Safety-Aware Serverless Semantic Cache for Clinical Question Answering with Deterministic Multilingual Triage and Privacy-Preserving Audit`  
**Generated Files**: 
- Word Document: [`docs/GenSync_MedAI_IEEE_Paper_Revised.docx`](file:///c:/Kamalesh/College/Academic%20Files/Semester%205%20(Fall%202026)/Cloud%20Architecture%20Design%20(CAD)/GenSync-MedAI/docs/GenSync_MedAI_IEEE_Paper_Revised.docx)
- Markdown Version: [`docs/PAPER_REVISED.md`](file:///c:/Kamalesh/College/Academic%20Files/Semester%205%20(Fall%202026)/Cloud%20Architecture%20Design%20(CAD)/GenSync-MedAI/docs/PAPER_REVISED.md)

---

## 1. Summary of Changes by Section

| Section | Prior State (Reviewer Red Flag) | Revised State (Defensible & Mathematically Sound) | Why Changed |
| :--- | :--- | :--- | :--- |
| **Title & Scope** | Claimed universal vector database replacement and $0.00 cost. | "A Safety-Aware Serverless Semantic Cache for Clinical Question Answering with Deterministic Multilingual Triage and Privacy-Preserving Audit." Cost framed as zero-idle scaling. | Honest positioning acknowledging DynamoDB native vector search and commercial traffic costs. |
| **Abstract** | Mixed hypothetical 10k figures and vague statistical bounds. | States exact 32-case feasibility numbers (8/8 emergency, 0/32 false hits) with exact Clopper-Pearson CIs ([63.1%, 100%] and [0%, 10.9%]). Derives $N=299$ requirement. | Purged all synthetic numbers; accurately reports sample size and uncertainty. |
| **Section I: Intro** | Referenced "course project benchmark" and USD 0.00. | Replaced with academic systems language. Highlights the closed-output safe refusal policy and human provenance. | IEEE reviewer standard phrasing; removes student course references. |
| **Section II: Related Work** | Missing vCache and unaddressed native DynamoDB vector search. | Added vCache [17] as risk-controlled caching baseline. Explicitly cited DynamoDB native vector search [29], [30] to define our novelty around safety triage, code-mixed regexes, and clinical frame verification. | Differentiates from existing 2026 AWS database features and prior caching literature. |
| **Section III: Threat Model** | Claimed 50ms constant-time padding solves timing side-channel. | Frankly acknowledges that a 50ms floor fails to mask 156ms misses or 2s cold starts. Positions serverless timing equalization as an open tradeoff. | Reviewer critique: 50ms padding does not achieve constant time. |
| **Section IV: Calibration Math** | Misused Hoeffding UCB formula claiming $N=299$ satisfies $\alpha=0.01$. | Mathematically proved Hoeffding requires $n \ge 18,444$. Correctly derived $N=299$ from the exact binomial zero-violation tail bound $(1 - \alpha)^N \le \delta$. | Major statistical error correction. |
| **Section V: Results & Latency** | Unreconciled 35ms vs 112ms embedding latency; cold start row non-additive. | Reconciled 35ms (desktop multi-core isolated ONNX run) vs 112ms (Lambda 512MB end-to-end tokenization + ONNX + pooling + L2 norm). Reconciled cold-start non-additivity. | Eliminates telemetry discrepancies. |
| **Section VI: Cost Scaling** | Claimed "$0.00 cost" for 100,000 users. | Recomputed from actual AWS list prices and GB-seconds ($0.5\text{ GB} \times 0.045\text{ s} \times 30\text{M} = 675,000\text{ GB-s} \to \$51.75/\text{month}$). | Replaces unrealistic free-tier extrapolation with real cloud economics. |
| **Section VII: Disclosures** | Missing IEEE author contributions and AI-assistance disclosures. | Added explicit IEEE-compliant Author Contributions and AI-Assistance disclosure statements. | Required by IEEE author guidelines. |
