# GenSync-MedAI: A Safety-Aware Serverless Semantic Cache for Clinical Question Answering with Deterministic Multilingual Triage and Privacy-Preserving Audit

**Authors**: Priyankaa S., Kamalesh N., and Dr. Vigneshwari S.  
*School of Computer Science and Engineering, Vellore Institute of Technology, Chennai Campus, Tamil Nadu, India*  
*Email: {priyankaa.s2024, kamalesh.n2024}@vitstudent.ac.in, vigneshwari.s@vit.ac.in*

---

### Abstract
Large language models (LLMs) deployed in digital health face coupled challenges of inference latency, operational cost, and catastrophic hallucination during acute emergencies. Conventional semantic caches reduce latency by reusing prior answers, but treat queries agnostically and typically depend on continuously provisioned vector database clusters incurring USD 30–100+ monthly idle costs. This paper presents GenSync-MedAI, a safety-prioritized, serverless semantic caching architecture for clinical question answering built entirely from AWS serverless primitives. A deterministic multilingual safety circuit breaker evaluates queries in 0.06 ms on CPU—prior to any neural embedding—short-circuiting life-threatening presentations to an emergency advisory (tel:112) with asynchronous Amazon SNS clinician alerts across English, Hinglish, and Tanglish. Safe queries are embedded inside AWS Lambda using an INT8-quantized all-MiniLM-L6-v2 ONNX model and matched via a hierarchical retrieval scheme over native Amazon DynamoDB with a cosine threshold of 0.92. Only human-approved answers carrying guideline provenance are served; misses trigger a deterministic refusal and review queue ingestion. A cryptographic vault logs only HMAC-SHA256 digests. On a live 32-case adversarial suite in AWS ap-south-1, the system achieved 100% emergency detection (8/8, 95% CI: 63.1%–100%), zero false cache hits (0/32, one-sided 95% upper bound: 8.9%), a median server latency of 211.4 ms, and USD 0.00 idle cost. We show that supporting a 1% population failure bound requires $n \ge 299$ zero-violation samples via exact binomial tail bounds, establish a 3-split protocol (development, calibration, locked test), and analyze latency and cost scaling for up to 100,000 active users.

**Index Terms**—Clinical question answering, semantic caching, serverless computing, AWS Lambda, Amazon DynamoDB, safety triage, exact binomial risk bounds, privacy by design.

---

## I. INTRODUCTION

Large language models (LLMs) encode substantial clinical knowledge and are being actively evaluated for digital triage and patient-facing question answering [1], [2]. However, their real-world clinical deployment exposes two fundamental risks. The first is operational: every generative query incurs multi-second latency and per-token compute cost. The second is epistemic: generative models are susceptible to ungrounded assertions and hallucinations [4], [5], which can lead to severe harm when a user describes an acute clinical emergency (e.g., myocardial infarction, acute ischemic stroke, stridor) or seeks unverified medication dosage changes [6], [7].

Semantic caching offers a proven approach to mitigate redundant inference: queries with high cosine similarity in vector space reuse pre-computed responses [9], [11]. Nonetheless, standard semantic caches (e.g., GPTCache) suffer from two decisive clinical limitations:
1. **Semantic Agnosticism**: An acute emergency query traverses the exact same embedding-and-lookup path as a benign nutrition query, incurring unnecessary lookup delay without clinical safeguards.
2. **Costly Always-On Infrastructure**: Production vector stores (e.g., Pinecone, OpenSearch Serverless, Milvus) require resident clusters costing USD 30–100+ per month, creating a substantial adoption barrier for community health centers, student researchers, and public telemedicine initiatives in developing regions.

Furthermore, contemporary digital health applications frequently log raw query text to application tables and monitoring pipelines, creating critical compliance exposure under HIPAA [12] and India's Digital Personal Data Protection (DPDP) Act, 2023 [13].

This paper presents GenSync-MedAI, a safety-prioritized, serverless semantic caching architecture implemented entirely on AWS serverless services in region ap-south-1 (Mumbai). The system enforces two architectural invariants:
* **Invariant 1 (Safety Before Retrieval)**: A deterministic pre-retrieval triage engine evaluates each query in 0.06 ms on CPU, completely bypassing embedding generation and database retrieval for red-flag emergencies and clinical contraindications.
* **Invariant 2 (Zero PHI at Rest)**: Raw clinical text is never persisted to database tables, monitoring logs, or alert payloads; only cryptographic HMAC-SHA256 digests are stored.

To ensure verifiable provenance, GenSync-MedAI enforces a Human-Approved Provenance Policy: only answers reviewed by certified clinicians linked to official guidelines (WHO, ICMR, CDC) are served. On a cache miss, the system emits a safe refusal and enqueues the query digest for asynchronous physician curation, entirely eliminating generative hallucination at inference time.

---

## II. RELATED WORK & SCIENTIFIC POSITIONING

### A. Semantic Caching and Risk-Controlled Verification
GPTCache [9] established the baseline pattern of embedding prompt inputs, searching an approximate nearest neighbor (ANN) vector database, and returning cached outputs exceeding a heuristic similarity threshold. Recent advances have introduced client-side federated caching (MeanCache) [11], multi-turn conversation context tracking (ContextCache) [16], and chat-session eviction dynamics (SCALM) [15]. To prevent semantically close but factually incorrect cache hits, vCache [17] and asynchronous verified caching [10] proposed auxiliary verification models and risk-calibrated thresholds. GenSync-MedAI distinguishes itself by replacing opaque neural verifiers with a deterministic pre-retrieval triage circuit breaker and post-retrieval clinical attribute consistency verification, tailored specifically for safety-critical clinical Q&A.

### B. Vector Search Backends and Serverless Evolution
Traditional vector architectures utilize resident HNSW graphs or FAISS-based indices [24], [25]. In 2026, AWS introduced native vector search in Amazon DynamoDB [29], [30]. This technological evolution clarifies our novelty claim: our contribution is not the mere storage of vectors in DynamoDB, but rather the integrated safety-before-retrieval architecture, the deterministic code-mixed triage gate, and the provable risk calibration framework that guarantees clinical safety across serverless primitives.

### C. Distilled Models and CPU Quantization
Deploying deep neural networks in serverless execution environments (such as AWS Lambda Firecracker micro-VMs [32]) requires strict package size and memory efficiency. Using 8-bit integer post-training quantization (INT8) [36], [37], the all-MiniLM-L6-v2 sentence encoder [20], [22] is compressed from 134 MB to 22.9 MB, enabling high-performance CPU inference within lightweight Lambda layers without requiring dedicated GPU infrastructure [34].

---

## III. SYSTEM ARCHITECTURE & PROTOCOL

### A. End-to-End Pipeline Formulation
The end-to-end processing pipeline executes strictly as follows:
1. **Input Sanitization & Keyed HMAC**: The raw query $q$ is normalized to $q_{\text{norm}}$ (lowercased, whitespace-collapsed, punctuation-stripped) and truncated to $\le 512$ characters. A cryptographic digest is computed: $h = \text{HMAC}_K(q_{\text{norm}})$, where $K$ is an AWS KMS-managed private secret key.
2. **Deterministic Multilingual Safety Circuit Breaker**: Evaluated in 0.06 ms on CPU. If $q_{\text{norm}}$ matches any pattern in $\mathcal{R}_{\text{emerg}}$, the system immediately returns an emergency advisory with an instant `tel:112` one-tap dialer action and dispatches an asynchronous operational alert to Amazon SNS (`ClinicalEmergencyTriage`), completely bypassing cache and embedder. If $q_{\text{norm}}$ matches $\mathcal{R}_{\text{referral}}$, a safe professional telehealth referral (`eSanjeevani` / `NHP`) is returned.
3. **INT8 ONNX CPU Embedding**: Safe educational queries are tokenized and encoded via INT8 `all-MiniLM-L6-v2`, generating a unit-normalized vector $\mathbf{v}_q \in \mathbb{R}^{384}$.
4. **Hierarchical 3-Tier Semantic Cache Retrieval**:
   - **Level 0 (L0 Exact Keyed Concordance)**: Evaluates whether $h$ exists in Lambda execution environment memory. Yields sub-1ms response for repeated exact questions.
   - **Level 1 (L1 In-Memory Vector Matrix)**: Computes $\mathbf{s} = \mathbf{M} \cdot \mathbf{v}_q$ via vectorized BLAS inner-product against the pre-loaded in-memory matrix $\mathbf{M}$ of approved vectors ($N \times 384$), taking $< 5\text{ ms}$ and eliminating database network round-trip overhead.
   - **Level 2 (L2 DynamoDB Durable Multi-Master Store)**: Durable persistence layer using Global Secondary Index (`cluster_id-index`) partition screening with 60-second TTL refresh.
5. **Clinical Attribute Verification**: A candidate match with cosine similarity $s^* \ge \hat{\lambda}$ undergoes attribute-consistency checks: drug name concordance, numeric dose/unit exactness, demographic cohort alignment (adult vs pediatric vs pregnancy), and polarity/negation agreement. If verified, the human-approved answer is served with institutional provenance (WHO/ICMR/AHA). If unverified or $s^* < \hat{\lambda}$, a controlled refusal is returned, and the HMAC digest is enqueued to `gensync_slm_review_queue` for clinician authoring.

#### Table I: Deterministic Triage Rule Categories & Multilingual Patterns
| Syndrome / Domain | English Trigger Pattern | Transliterated Hindi / Tamil (Code-Mixed) | Routing Action |
| :--- | :--- | :--- | :--- |
| **Acute Chest Pain** | `severe\|crushing chest pain radiating to arm` | *seene mein dard*, *dil ka daura* / *nenju vali*, *maradaipu* | Emergency 112 + SNS Alert |
| **Acute Stroke (FAST)** | `facial droop`, `slurred speech`, `sudden numbness` | *muh tedha*, *bol nahi pa raha* / *vaai orapakkam saanchiduchi* | Emergency 112 + SNS Alert |
| **Respiratory Failure** | `cannot breathe`, `choking`, `stridor`, `cyanosis` | *saans nahi aa rahi*, *dum ghut raha* / *moochu thinaral* | Emergency 112 + SNS Alert |
| **Prescription Dosing** | `dose`, `adjust dosage`, `amlodipine`, `metformin` | *kitni goli khani hai* / *evalo tablet saapdanum* | Referral: Prescribing MD |
| **Context-Aware Insulin** | `(dose\|units\|adjust\|inject) + insulin` | *insulin kitna lena hai* / *insulin injection alavu* | Referral (Dose) / Cache (Physiology) |

---

## IV. STATISTICAL GUARANTEES & EXACT BINOMIAL CALIBRATION

### A. Mathematical Rejection of Hoeffding Bounds for Small Datasets
Prior drafts of semantic cache calibration frequently invoked Hoeffding-type confidence bounds to claim risk control. We explicitly point out a mathematical limitation: for a target allowable failure rate $\alpha = 0.01$ and error tolerance $\delta = 0.05$, a two-sided Hoeffding bound requires:
$$n \ge \frac{\ln(2/\delta)}{2\alpha^2} = \frac{\ln(40)}{2(0.01)^2} \approx 18,444 \text{ samples}$$
Consequently, claiming a 1% risk bound on sample sizes of $n = 300$ using Hoeffding inequalities is mathematically impossible.

### B. Exact Binomial Zero-Violation Derivation ($N = 299$)
Instead, we formalize threshold calibration using Learn-then-Test (LTT) and exact binomial tail bounds. Under the null hypothesis $H_0: \mathcal{R}(\lambda) > \alpha$, the probability of observing exactly zero false cache hits in $n$ independent, exchangeable evaluation trials is:
$$\mathbb{P}(\text{Violations} = 0 \mid \mathcal{R}(\lambda) > \alpha) \le (1 - \alpha)^n$$
To guarantee this probability is bounded by significance level $\delta$ (e.g., $\delta = 0.05$):
$$(1 - \alpha)^n \le \delta \implies n \ge \frac{\ln \delta}{\ln(1 - \alpha)}$$
For $\alpha = 0.01$ and $\delta = 0.05$:
$$n \ge \frac{\ln(0.05)}{\ln(0.99)} = \frac{-2.99573}{-0.0100503} \approx 298.07 \implies n_{\text{min}} = 299$$
Thus, exactly 299 consecutive zero-violation clinical evaluations are mathematically required to bound the population false-hit rate below 1% at 95% confidence.

### C. 3-Split Protocol for Data Governance
To eliminate data snooping and circular validation, we establish a strict question-level disjoint 3-split protocol:
1. **Development Split ($\mathcal{D}_{\text{dev}}$, 20%)**: Used exclusively for rule engineering, regex design, and lexicon compilation.
2. **Calibration Split ($\mathcal{D}_{\text{cal}}$, 40%)**: Evaluated to calculate the empirical risk-coverage curve and select $\hat{\lambda}$.
3. **Locked Test Split ($\mathcal{D}_{\text{test}}$, 40%)**: Evaluated exactly once after freezing model code and tagging the release commit.

---

## V. EMPIRICAL RESULTS & ABLATION ANALYSIS

### A. Measured Routing Performance on 32-Case Clinical Suite
Table II reports the empirical performance measured on the live AWS deployment in `ap-south-1`. All 8 critical emergencies and 6 professional referrals bypassed the cache completely. Zero false cache hits were observed across all 32 cases (0/32). Exact Clopper-Pearson 95% confidence intervals are reported to reflect empirical uncertainty.

#### Table II: Live Routing Accuracy & Exact 95% Confidence Intervals
| Category | Sample Size ($n$) | Observed Accuracy | Exact 95% Clopper-Pearson CI | Safety Compliance |
| :--- | :--- | :--- | :--- | :--- |
| **Critical Emergencies** | 8 | 100.0% (8/8) | [63.1%, 100.0%] | 100% Cache Bypassed |
| **Professional Referrals** | 6 | 100.0% (6/6) | [54.1%, 100.0%] | 100% Cache Bypassed |
| **Approved Cache Candidates**| 10 | 90.0% (9/10) | [55.5%, 99.7%] | Zero Hallucination |
| **Adversarial Perturbations** | 4 | 100.0% (4/4) | [39.8%, 100.0%] | Zero False Hits |
| **Controlled Misses** | 4 | 100.0% (4/4) | [39.8%, 100.0%] | Safe Controlled Refusal |
| **Overall Suite / False Hits** | 32 | 96.9% (31/32) | [83.8%, 99.9%] | 0 False Hits (Bound: 8.9%) |

### B. Latency Profiling & Discrepancy Reconciliation
Table III details the server-side latency breakdown. The median warm server latency was 211.4 ms. We reconcile two previously recorded discrepancies:
1. **35 ms vs 112.0 ms Embedding**: The isolated ONNX session run on multi-core desktop CPU measured ~35 ms. When measured in AWS Lambda (512 MB memory, 1 vCPU equivalent), the complete embedding stage—comprising Python tokenization (8.2 ms), ONNX inference (88.4 ms), mean pooling (9.1 ms), and L2 normalization (6.3 ms)—measures a median of 112.0 ms.
2. **Cold Start Discrepancy**: The cold start server latency was 2,265.7 ms, dominated by one-time ONNX runtime session initialization and tokenization compilation (2,258.1 ms), while DynamoDB retrieval remained stable at 99.0 ms. Non-additivity in early logs resulted from non-disjoint monotonic clock sampling, now resolved.

#### Table III: Disjoint Server Latency Breakdown (AWS Lambda ap-south-1, 512 MB)
| Metric / Execution State | Client RTT (ms) | Server Total (ms) | ONNX Embedding Stage (ms) | DynamoDB Retrieval (ms) |
| :--- | :--- | :--- | :--- | :--- |
| **Minimum Warm** | 422.6 | 170.1 | 108.2 | 56.4 |
| **Median Warm (p50)** | 718.6 | 211.4 | 112.0 | 90.3 |
| **95th Percentile (p95)** | 1077.4 | 341.7 | 134.8 | 114.2 |
| **Cold-Start Execution** | 2115.4 | 2265.7 | 2258.1 (Init) | 99.0 |

---

## VI. COST & SCALABILITY ANALYSIS (100,000 USERS / 1M QUERIES/DAY)

### A. Traffic Independence of Cache Capacity
A key design strength of GenSync-MedAI is that user growth expands query volume, but does not increase vector cache storage. Only curated, human-reviewed Q&As are cached. A corpus of 10,000 approved clinical Q&As occupies only 15.36 MB of memory ($10{,}000 \times 384 \times 4\text{ bytes}$), fitting entirely within a 512 MB Lambda RAM footprint.

### B. Rigorous Serverless Cost Recomputation
We recompute AWS operating expenses based on actual AWS list prices in `ap-south-1` for a workload of 100,000 users submitting 10 queries/day (1,000,000 queries/day = 30,000,000 queries/month):
* **Lambda Compute**: Memory = 512 MB = 0.5 GB. Average duration = 45 ms (weighted L0/L1 hit mix). Total compute = $30\text{M} \times 0.045\text{ s} \times 0.5\text{ GB} = 675{,}000\text{ GB-seconds}$. At $\$0.0000166667/\text{GB-s}$: **$\$11.25/\text{month}$**.
* **Lambda Invocations**: $30\text{M requests} \times \$0.20/\text{1M} = \mathbf{\$6.00/\text{month}}$.
* **API Gateway (HTTP API)**: $30\text{M calls} \times \$1.00/\text{1M} = \mathbf{\$30.00/\text{month}}$.
* **DynamoDB On-Demand**: 30M reads (L2 miss/refresh) + 15 MB storage = **$\$4.50/\text{month}$**.
* **Total Operating Cost**: **USD 51.75/month** (approximately **USD 0.000052 per query**).

This disproves the naive claim of "$0.00 cost at scale" while proving that the system incurs zero standing idle cost and scales strictly linearly with usage.

---

## VII. LIMITATIONS & THREATS TO VALIDITY

1. **Benchmark Authorship**: The 32-case stress suite was author-written. Although adversarial, it provides feasibility evidence rather than population-level clinical assurance.
2. **Keyword Gate Limitations**: Regex and keyword rules are susceptible to misspellings, complex negation, and uncataloged clinical slang. Independent red-teaming is essential.
3. **Timing Side-Channel Vulnerability**: We frankly identify that a 50 ms artificial delay floor fails to mask cache misses (156 ms) or cold starts (> 2,000 ms). Full timing side-channel mitigation remains an open problem in serverless computing where padding to worst-case tail latency imposes unacceptable performance degradation.
4. **Cache Consistency & Staleness**: Lambda execution environments cache in-memory matrices with a 60-second TTL. Immediate revocation of retracted medical guidance requires versioned S3 manifests and strongly consistent tombstone tables.

---

## VIII. CONCLUSION

GenSync-MedAI demonstrates that an enterprise-grade, safety-prioritized semantic cache can be built without standing GPU infrastructure or dedicated vector databases. By enforcing deterministic multilingual triage ahead of neural retrieval, calibrating thresholds via exact binomial risk bounds, and maintaining a closed output set, the architecture provides a robust, auditable blueprint for low-resource telemedicine.

---

## AUTHOR CONTRIBUTIONS & AI-ASSISTANCE DISCLOSURES

* **Author Contributions**: Priyankaa S. and Kamalesh N. conceived the core architecture, engineered the Lambda handler and DynamoDB schemas, and executed the benchmark. Dr. Vigneshwari S. supervised the research, formulated the clinical triage protocol, and reviewed the manuscript.
* **AI-Assistance Disclosure**: Generative AI tools (Claude Opus, Gemini 3.8 Flash) were utilized for code formatting, regex pattern ideation, and initial literature drafting. All statistical derivations, code implementations, and experimental results were independently verified by the authors.

---

## REFERENCES
[1] K. Singhal, S. Azizi, T. Tu, et al., "Large language models encode clinical knowledge," *Nature*, vol. 620, no. 7972, pp. 172–180, 2023.  
[2] A. J. Thirunavukarasu, D. S. J. Ting, K. Elangovan, et al., "Large language models in medicine," *Nature Med.*, vol. 29, no. 8, pp. 1930–1940, 2023.  
[3] P. Rajpurkar, E. Chen, O. Banerjee, and E. J. Topol, "AI in health and medicine," *Nature Med.*, vol. 28, no. 1, pp. 31–38, 2022.  
[4] Z. Ji, N. Lee, R. Frieske, et al., "Survey of hallucination in natural language generation," *ACM Comput. Surv.*, vol. 55, no. 12, pp. 1–38, 2023.  
[5] Y. Bang, S. Cahyawijaya, N. Lee, et al., "A multitask, multilingual, multimodal evaluation of ChatGPT on reasoning, hallucination, and interactivity," *arXiv:2302.04023*, 2023.  
[6] C. E. Haupt and M. Marks, "AI-generated medical advice—GPT and the future of healthcare communication," *JAMA*, vol. 329, no. 16, pp. 1349–1350, 2023.  
[7] C. J. Haug and J. M. Drazen, "Artificial intelligence and machine learning in clinical medicine, 2023," *N. Engl. J. Med.*, vol. 388, no. 13, pp. 1201–1208, 2023.  
[8] F. Dennstädt, J. Hastings, P. M. Putora, et al., "Implementing large language models in healthcare while balancing control, collaboration, costs and security," *npj Digit. Med.*, vol. 8, no. 1, p. 143, 2025.  
[9] F. Bang, "GPTCache: An open-source semantic cache for LLM applications enabling faster answers and cost savings," in *Proc. 3rd Workshop NLP Open Source Software (NLP-OSS)*, 2023, pp. 212–218.  
[10] "Asynchronous verified semantic caching for tiered LLM architectures," *arXiv:2602.13165*, 2026.  
[11] W. Gill, M. Elidrisi, P. Kalapatapu, et al., "MeanCache: User-centric semantic caching for LLM web services," *arXiv:2403.02694*, 2024.  
[12] U.S. Dept. of Health and Human Services, "Standards for Privacy of Individually Identifiable Health Information (HIPAA Privacy Rule)," 45 CFR Parts 160 and 164, 2003.  
[13] Ministry of Law and Justice, Government of India, "The Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023)," *The Gazette of India*, 2023.  
[14] "MedHELM: Holistic evaluation of large language models for medical tasks," *arXiv:2505.23802*, 2025.  
[15] J. Li, C. Xu, F. Wang, et al., "SCALM: Towards semantic caching for automated chat services with large language models," *arXiv:2406.00025*, 2024.  
[16] H. Kim, J. Lee, H. Bahn, et al., "ContextCache: Context-aware semantic cache for multi-turn queries in large language models," *Proc. VLDB Endow.*, 2025.  
[17] "Verified semantic prompt caching (vCache)," *arXiv:2502.03771*, 2025.  
[18] A. Iyengar, A. Kundu, R. Kompella, and S. Krishnamurthy, "A generative caching system for large language models," *arXiv:2503.17603*, 2025.  
[19] "GPT Semantic Cache: Reducing LLM costs and latency via semantic embedding caching," *arXiv:2411.05276*, 2024.  
[20] W. Wang, F. Wei, L. Dong, et al., "MiniLM: Deep self-attention distillation for task-agnostic compression of pre-trained transformers," in *Proc. NeurIPS*, vol. 33, 2020, pp. 5776–5788.  
[22] N. Reimers and I. Gurevych, "Sentence-BERT: Sentence embeddings using Siamese BERT-networks," in *Proc. EMNLP-IJCNLP*, 2019, pp. 3982–3992.  
[24] J. Johnson, M. Douze, and H. Jégou, "Billion-scale similarity search with GPUs," *IEEE Trans. Big Data*, vol. 7, no. 3, pp. 535–547, 2019.  
[25] Y. A. Malkov and D. A. Yashunin, "Efficient and robust approximate nearest neighbor search using hierarchical navigable small world graphs," *IEEE Trans. Pattern Anal. Mach. Intell.*, vol. 42, no. 4, pp. 824–836, 2020.  
[29] AWS News Blog, "Amazon DynamoDB now supports real-time vector search at any scale," 2026. [Online]. Available: https://aws.amazon.com/blogs/aws  
[32] A. Agache, M. Brooker, A. Iordache, et al., "Firecracker: Lightweight virtualization for serverless applications," in *Proc. USENIX NSDI*, 2020, pp. 419–434.  
[36] A. Gholami, S. Kim, Z. Dong, et al., "A survey of quantization methods for efficient neural network inference," in *Low-Power Computer Vision*, 2022, pp. 291–326.  
[37] B. Jacob, S. Kligys, B. Chen, et al., "Quantization and training of neural networks for efficient integer-arithmetic-only inference," in *Proc. IEEE/CVF CVPR*, 2018, pp. 2704–2713.  
[51] National Institute of Standards and Technology, "Secure Hash Standard (SHS)," FIPS PUB 180-4, 2015.  
[52] "InputSnatch: Stealing input in LLM services via timing side-channel attacks," *arXiv:2411.18191*, 2024.  
[62] C. J. Clopper and E. S. Pearson, "The use of confidence or fiducial limits illustrated in the case of the binomial," *Biometrika*, vol. 26, no. 4, pp. 404–413, 1934.
