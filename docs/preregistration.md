# GenSync-MedAI: Scientific Analysis Pre-Registration (OSF/IEEE Standard)

**Date**: 2026-10-30  
**Registration Status**: LOCKED (Pre-Study Protocol)  
**Authors**: Priyankaa S., Kamalesh N., Dr. Vigneshwari S.  

---

## 1. Study Objectives & Primary Research Hypotheses

This study investigates whether a deterministic safety-gated, risk-calibrated serverless semantic cache can reduce redundant processing while providing mathematical guarantees against unsafe clinical answer reuse on adversarial queries.

### Formal Hypotheses
* **H1 (Emergency Gate Recall)**: A deterministic keyword and regular-expression pre-retrieval gate achieves $\ge 99.0\%$ sensitivity on life-threatening presentations across English, Hindi, Tamil, Hinglish, and Tanglish, with zero cache lookups.
* **H2 (Clinical Frame Compatibility)**: An attribute-consistency verifier (drug, dosage, demographic cohort, negation, temporal severity) reduces false cache hits on semantically similar hard negatives by $\ge 90\%$ compared to an unconstrained cosine similarity baseline at $\tau = 0.92$.
* **H3 (Exact Binomial Risk Calibration)**: Using Learn-then-Test (LTT) / fixed-sequence exact binomial risk calibration on calibration split $\mathcal{D}_{\text{cal}}$, the selected similarity threshold $\hat{\lambda}$ guarantees that the end-to-end false cache hit rate on the locked test set $\mathcal{D}_{\text{test}}$ does not exceed $\alpha = 0.01$ at confidence level $1 - \delta = 0.95$.
* **H4 (Zero Idle Infrastructure & Sub-Second Latency)**: An entirely serverless retrieval architecture on AWS Lambda (512 MB, INT8 ONNX MiniLM) and Amazon DynamoDB delivers median warm server latency $< 150\text{ ms}$ with $\$0.00$ standing/idle cost.

---

## 2. Dataset Design & Splitting Discipline

### Disjoint Question-Level 3-Split Protocol
To avoid data leakage, data is split at the **underlying clinical concept/question level** (not at the query pair level):
1. **Development Split ($\mathcal{D}_{\text{dev}}$, $20\%$)**: Used for rule engineering, regex drafting, lexicon expansion, and bug fixing.
2. **Calibration Split ($\mathcal{D}_{\text{cal}}$, $40\%$)**: Locked during rule authoring. Used solely for threshold calibration and Learn-then-Test statistical bounds.
3. **Locked Test Split ($\mathcal{D}_{\text{test}}$, $40\%$)**: Strictly locked. Zero inspection, zero error analysis, zero hyperparameter tuning. Evaluated **exactly once** at the conclusion of the study, after freezing the code and tagging the git commit.

### Target Sample Sizes
* **Locked Test Split Target**:
  - $\ge 300$ Clinician-adjudicated hard-negative pairs (systematic perturbations across: Drug Name, Dose/Unit, Frequency, Demographic/Population, Negation/Polarity, Temporal/Severity, Clinical Intent).
  - $\ge 300$ Clinician-adjudicated legitimate paraphrase pairs (clinically identical intent).
  - $\ge 150$ Unrelated distractor queries.
* **Emergency Triage Evaluation Set**:
  - 8 Acute clinical syndromes $\times$ 5 language variants (English, Hindi Devanagari, Tamil script, Hinglish transliteration, Tanglish transliteration) = $\ge 200$ positive emergencies.
  - $\ge 200$ Safe negatives (benign lifestyle queries, queries with negation e.g., "no chest pain", "past history of fever").

---

## 3. Metrics & Statistical Testing

### 3.1 Safety & Routing Metrics
* **Emergency Sensitivity**: $\text{TP}_{\text{emerg}} / (\text{TP}_{\text{emerg}} + \text{FN}_{\text{emerg}})$ with exact two-sided Clopper-Pearson 95% Confidence Intervals.
* **False Cache Hit Rate**: Fraction of hard negatives or clinically incompatible queries erroneously served a cached answer.
* **Effective Cache Utility / Coverage**: Fraction of legitimate paraphrase queries successfully served from cache ($\text{Cosine} \ge \hat{\lambda}$ and frame verified).

### 3.2 Learn-then-Test (LTT) Exact Binomial Bound
For an allowable false hit risk $\alpha = 0.01$ and confidence $\delta = 0.05$:
$$\mathbb{P}_{D_{\text{test}}}\left( \mathcal{R}(\hat{\lambda}) > \alpha \right) \le \delta$$
Evaluated over the end-to-end retrieval decision $\max_{i \in \text{Corpus}} \text{Score}(q, y_i)$. Under zero observed violations in $n$ calibration samples, the exact binomial tail condition is:
$$(1 - \alpha)^n \le \delta \implies n \ge \frac{\ln \delta}{\ln(1 - \alpha)} = \frac{\ln(0.05)}{\ln(0.99)} \approx 298.07 \implies n \ge 299$$

### 3.3 Latency & Systems Metrics
* Disjoint clock measurements: $T_{\text{gate}}$, $T_{\text{tokenize}}$, $T_{\text{onnx}}$, $T_{\text{pool\_norm}}$, $T_{\text{retrieval}}$, $T_{\text{audit}}$.
* Percentiles: P50, P90, P95, P99 across $N \ge 1,000$ warm invocations and $N \ge 30$ forced cold starts.
* Timing attack vulnerability: ROC-AUC of a timing classifier distinguishing cache hit vs miss.

---

## 4. Stopping Rules & Pre-Determined Non-Negotiables

1. If the exact binomial bound fails at $\alpha = 0.01$ on $\mathcal{D}_{\text{cal}}$, report the exact empirical risk and empirical coverage curve; do not retroactively alter the test set.
2. If the attribute-consistency verifier increases latency beyond $10\text{ ms}$ or decreases legitimate cache hit coverage by $> 15\%$, report this precision-coverage tradeoff as an empirical finding.
3. No generative AI text is permitted in the core system: cache misses must strictly result in a controlled refusal, referral resource link, and audit digest.
