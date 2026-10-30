# GenSync-MedAI Codebase & Architecture Audit (WS0)

**Date**: 2026-10-30  
**Auditor**: Senior Research Engineer & Systems Researcher  
**Status**: Completed Baseline Code Audit  

---

## 1. Executive Summary & Verified Code Reality

A thorough inspection of the repository (`src/`, `db/`, `tests/`, `docs/`, `frontend/`) reveals substantial divergences between the **claimed system** in the IEEE draft paper, the **interim engineering enhancements**, and the **actual executing code**.

| Subsystem / Metric | Paper Claim | Interim Engineering Notes | Actual Verified Implementation | Audit Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Generative Model Fallback** | "No answer is generated; system returns approved answers or refusal only." | "Tier-2 SmolLM-135M / Groq Llama-3.3 fallback enabled for cache misses." | `src/tier1/clinical_ai_engine.py` implements regex/keyword heuristics or calls Groq API, generating synthetic answers. In `handler.py` lines 315-323, these unverified outputs are **auto-cached directly into DynamoDB**. | **CRITICAL INTEGRITY CONTRADICTION**: Violates Invariant 1 and Human Provenance policy. |
| **Privacy Invariant (Zero-PHI)** | "Zero raw clinical text persisted in logs, audit table, or SNS payload." | "Keyed HMAC hashing." | 1. In `src/tier1/handler.py` (lines 87-103), `connect_professional` publishes raw `patient_inquiry[:500]` to Amazon SNS.<br>2. Auto-cache (`insert_eligible_entry`) writes unvetted query string into DynamoDB `gensync_semantic_query_cache`.<br>3. `compute_query_hash()` uses unsalted SHA-256 (`hashlib.sha256(normalized.encode()).hexdigest()`), vulnerable to dictionary precomputation. | **PRIVACY VULNERABILITY**: Raw text leaks in SNS; unsalted SHA-256 is guessable for low-entropy clinical phrases. |
| **Test Suite Scale** | "32-case adversarial clinical stress suite." | "300-case clinician-labeled corpus with N=299 conformal guarantee." | The test suite in `tests/benchmark.py` contains exactly **32 hardcoded queries** written by the authors. The "300-case corpus" does not exist in the repository. | **UNVERIFIED CLAIM**: Must be constructed under a strict 3-split protocol with clinician labels. |
| **Cache Database Size** | "~50 entries." | "N=10,000 synthetic vector matrix." | `db/seed_data_embedded.json` contains exactly **15 approved entries** across 5 clusters. The live DynamoDB table currently contains 35 items (due to auto-caching). | **UNVERIFIED CLAIM**: 10k vectors were purely hypothetical; actual curated corpus is 15 entries. |
| **Embedding Latency Discrepancy** | 35 ms vs 112.0 ms. | "35 ms CPU inference." | Isolated ONNX `session.run()` takes ~35 ms on a multi-core desktop CPU, but end-to-end embedding inside AWS Lambda (512 MB, 1 vCPU equivalent) including tokenization, NumPy mean pooling, and L2 normalization measures ~112 ms. | **RECONCILED**: Must be explicitly separated into model runtime vs end-to-end stage time in 512 MB Lambda. |
| **Cold Start Non-Additivity** | Cold start: 2,265.7 ms (embedding: 2,258.1 ms + retrieval: 99.0 ms = 2,357.1 ms). | Discrepancy of ~91 ms unaddressed. | Non-disjoint clocks in handler timing or distinct requests were conflated in the 32-case summary. | **METHODOLOGY DEFECT**: Requires monotonic, non-overlapping `time.perf_counter()` stage timers. |

---

## 2. File-by-File Integrity & Vulnerability Register

### 2.1 `src/tier1/handler.py`
1. **Raw Text in SNS Alert (`connect_professional`, Line 91)**:
   ```python
   escalation_payload = {
       "event_type": "PEDIATRIC_CLINICAL_ESCALATION",
       "patient_inquiry": patient_query[:500], # <-- LEAKS RAW QUERY
       "correlation_id": correlation_id,
       ...
   }
   ```
   **Fix**: Replace `patient_inquiry` with `query_sha256` or HMAC digest. Never send raw text to SNS.
2. **Auto-Caching Unreviewed Text (Line 315)**:
   ```python
   cache_engine.insert_eligible_entry(
       question=query, # <-- INSERTS RAW UNAPPROVED QUERY
       answer=ai_result["answer"],
       embedding=query_vector.tolist(),
       safety_category=ai_res_data.get("topic", "General Health")
   )
   ```
   **Fix**: Completely remove auto-caching of unreviewed queries and AI answers. Only human-curated, clinician-signed items may enter the cache.
3. **Contradictory Tier-2 Fallback**:
   Lines 264-325 execute `clinical_ai_engine.generate_clinical_answer()`. This directly violates the paper's thesis: *"No answer is generated; only approved answers are returned."*
   **Fix**: Remove Tier-2 generative fallback. A cache miss must strictly result in a safe refusal, verified referral link, and queuing to the review table.

### 2.2 `src/tier1/audit.py`
1. **Unsalted SHA-256 (Line 41)**:
   `hashlib.sha256(normalized.encode("utf-8")).hexdigest()` allows dictionary attacks on common symptom phrases (e.g., "headache", "chest pain").
   **Fix**: Implement keyed HMAC-SHA256 (`hmac.new(key, msg, hashlib.sha256)`) using an environment-injected secret.
2. **Review Queue Inspection**:
   In `persist_review_queue_entry()`, the queue writes `query_sha256` and `ai_answer`. It does *not* persist raw query text, but without the original query text or clinician authoring workflow, a clinician cannot author a new approved Q&A from just a hash.
   **Fix**: Privacy-preserving re-authoring design (see Section 3).

### 2.3 `src/tier1/cache_engine.py`
1. **L0 and L1 Cache Implementation**:
   Contains `_l0_hash_cache` (dict) and `_l1_matrix` (`np.ndarray`).
   `_refresh_l1_matrix()` performs a full `table.scan()` on DynamoDB every 60 seconds. On cold invocations with 10k items, scanning DynamoDB would breach execution budgets and exceed Lambda RAM.
   **Fix**: Versioned manifest pattern (S3/DynamoDB single item read) with strong consistency.

### 2.4 `src/tier1/clinical_gate.py`
1. Implements `ClinicalCompatibilityGate` with negation check, condition check, numeric/dosage extraction, demographic mismatch, and severity gradient checks.
2. Contains strong logic, but was evaluated only on a handful of synthetic unit tests, not on a locked clinical hard-negative set.

---

## 3. Privacy-Preserving Review Queue Design

**The Dilemma**:
If the review queue stores only `query_sha256`, a human clinician cannot read the patient's unanswered question to author an approved answer. If it stores raw text, it violates Invariant 2 (zero PHI at rest).

**The Principled Architectural Solution**:
1. **Client-Side Envelope Encryption**:
   If clinical re-authoring is required, the client encrypts the query with a Clinician Public Key (RSA-4096 / ECIES) before transmission. The serverless handler persists only `query_sha256` and `encrypted_query_blob` to `gensync_slm_review_queue`.
2. **Zero-Knowledge to Cloud Runtime**:
   AWS Lambda and DynamoDB see only the ciphertext blob and HMAC digest. Neither AWS logs nor backend engineers can read the query text.
3. **Decryption at Clinician Workstation**:
   Only an authorized clinician holding the private key inside the hospital workstation can decrypt the queue items for authoring approved Q&As.

---

## 4. Timers and Instrumentation Fix (WS0 Mandate)

To resolve the 35 ms vs 112 ms discrepancy and non-additive cold-start row:
1. Stage timers must be strictly disjoint and measured with `time.perf_counter_ns()`.
2. Model invocation must measure:
   - `t_tokenize`: Tokenizer encoding
   - `t_onnx_inference`: `session.run()` only
   - `t_pool_norm`: Mean pooling + L2 normalization
   - `t_embed_total`: Sum of the above
3. Cold start must explicitly isolate Lambda container init from handler invocation.
