# GenSync-Cache — Future Ideas & Research Horizons

This document captures forward-looking architectural extensions, research ideas, and potential capabilities separated by implementation horizon.

---

## 1. Near-Term Improvements (Prototyping & Academic Evaluation)

### Two-Stage Centroid-plus-Vector vs. Plain HNSW Benchmark
- Compare end-to-end lookup latency, memory consumption, and candidate pruning efficiency between a two-stage filter (Centroid gate -> Partitioned scan) vs. global flat/HNSW vector search.
- Evaluate whether centroid clustering provides adequate safety isolation for clinical queries.

### Keyed Query Digests (HMAC-SHA256)
- **Current Baseline**: Query auditing uses plain SHA-256 digests (`hashlib.sha256(query.encode()).hexdigest()`) to protect patient privacy in CloudWatch and DynamoDB logs.
- **Improvement**: Replace static SHA-256 with an HMAC keyed with a KMS customer-managed key or environment secret to eliminate dictionary/rainbow-table reversal attacks on common clinical queries (e.g., "headache relief").

### Per-Cluster Adaptive Similarity Thresholds
- Replace the global static cosine similarity threshold (`0.92`) with calibrated per-cluster thresholds based on cluster dispersion and clinical risk profile (e.g., tighter thresholds for cardiovascular symptoms, looser for general wellness/hydration).

### Labelled Clinical Adversarial Test Suite
- Expand the adversarial evaluation dataset to 100+ clinical query pairs covering dosage swaps (5mg vs 50mg), pediatric vs adult, temporal framing (acute vs chronic), and contraindicated combinations.

---

## 2. Medium-Term Improvements (Pre-Clinical / Partnered Research)

### RAG over Verified WHO & National Health Mission (NHM) Guidelines
- When a safe cache miss occurs, retrieve authoritative, version-controlled markdown snippets directly from published WHO/NHM clinical guidelines with permanent DOI/URL citations.

### Doctor-in-the-Loop Review Workflow for `slm_review_queue`
- Build an authenticated clinician dashboard displaying pending SLM-generated answers.
- Allow clinicians to edit, tag, approve, or reject entries before promoting them into `semantic_query_cache`.

### Cache-Poisoning & Prompt-Injection Defenses
- Implement strict input sanitization preventing adversarial users from attempting to inject prompt instructions or manipulate embeddings to match high-confidence clinical answers.

---

## 3. Long-Term Horizons (Requiring Clinical Partnerships & Regulatory Scope)

### Multilingual Indian Language Embeddings (Tamil, Hindi, Telugu)
- Evaluate multilingual transformer models (e.g., IndicBERT, multilingual MiniLM) on vernacular clinical queries with localized emergency phrasing.

### Verified Teleconsultation Hand-off
- Integration with certified national telemedicine systems (e.g., eSanjeevani in India) to initiate verified hand-offs for queries categorized as `PROFESSIONAL_REFERRAL`.
