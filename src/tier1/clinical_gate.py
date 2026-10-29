"""
GenSync-Cache: Deterministic Clinical Compatibility Gate
Stage 2 Post-retrieval Safety Verification & Hybrid Matching

Evaluates whether a semantically similar candidate query is clinically compatible
with the incoming user query. Prevents false cache hits caused by:
1. Primary medical entity / condition divergence (e.g. Fever vs Common Cold)
2. Numeric / dosage / temperature differences
3. Polarity / negation discrepancies ("with fever" vs "without fever")
4. Demographic cohort divergence (adult vs pediatric vs geriatric)
5. Severity / temporal mismatch (acute vs chronic)
"""

import re
from dataclasses import dataclass
from typing import Tuple, List, Set, Optional, Dict


@dataclass
class CompatibilityResult:
    is_compatible: bool
    rejection_reason: Optional[str]
    detected_discrepancies: List[str]


# Negation and Polarity Markers
NEGATION_WORDS = {
    "no", "not", "never", "without", "none", "neither", "nor", "hardly", "scarcely",
    "cannot", "can't", "won't", "don't", "doesn't", "didn't", "isn't", "aren't"
}

# Demographic / Cohort Identifiers
DEMOGRAPHIC_GROUPS = {
    "pediatric": {"infant", "baby", "newborn", "toddler", "child", "kid", "pediatric", "paediatric"},
    "geriatric": {"elderly", "senior", "older", "geriatric", "aged", "retiree"},
    "youth": {"teen", "teenager", "adolescent", "young", "youth"},
    "adult": {"adult", "middle-aged"},
    "gender_female": {"female", "woman", "women", "girl", "pregnant", "pregnancy"},
    "gender_male": {"male", "man", "men", "boy"},
}

# Severity / Temporal Modifiers
SEVERITY_MODIFIERS = {
    "acute": {"sudden", "acute", "abrupt", "instant", "sharp"},
    "chronic": {"chronic", "persistent", "constant", "recurring", "ongoing", "long-term"},
    "mild": {"mild", "slight", "minor", "gentle"},
    "severe": {"severe", "intense", "extreme", "excruciating", "debilitating"},
}

# Primary Medical Condition & Symptom Entities
PRIMARY_CONDITIONS = {
    "fever": {"fever", "pyrexia", "high temperature", "febrile", "feverish"},
    "cold": {"common cold", "cold symptoms", "rhinovirus", "runny nose", "congestion"},
    "cough": {"cough", "coughing", "dry cough", "wet cough", "phlegm", "bronchitis"},
    "headache": {"headache", "migraine", "cephalea", "head pain", "tension headache"},
    "hypertension": {"blood pressure", "hypertension", "systolic", "diastolic", "high bp"},
    "diabetes": {"diabetes", "blood sugar", "glucose", "insulin", "hba1c", "hyperglycemia"},
    "cardiac": {"chest pain", "heart", "cardiac", "myocardial", "angina"},
    "allergy": {"allergy", "allergic", "hives", "rash", "anaphylaxis"},
    "asthma": {"asthma", "wheezing", "bronchospasm", "inhaler"},
    "hydration": {"water", "hydration", "fluid intake", "dehydration", "drink water"},
}


class ClinicalCompatibilityGate:
    """
    Deterministic gate that runs AFTER candidate retrieval.
    Rejects candidates that are semantically close in vector space but clinically discordant.
    """

    def __init__(self, strict_numeric_match: bool = True):
        self.strict_numeric_match = strict_numeric_match

    @staticmethod
    def _extract_numbers_with_units(text: str) -> Set[str]:
        """
        Extracts numbers and associated clinical units (mg, g, ml, F, C, mmhg, etc.).
        e.g., '100.4F', '50mg', '120/80'
        """
        pattern = r"\b(\d+(?:\.\d+)?(?:\/\d+)?(?:\s*(?:mg|g|kg|ml|l|cups|liters|mm\s*hg|°?[fc]|days?|hours?|weeks?))?)\b"
        matches = re.findall(pattern, text.lower())
        return {re.sub(r"\s+", "", m) for m in matches if m}

    @staticmethod
    def _extract_negations(text: str) -> Set[str]:
        """
        Extracts negation words from normalized token stream.
        """
        tokens = re.findall(r"\b[a-z']+\b", text.lower())
        return {t for t in tokens if t in NEGATION_WORDS}

    @staticmethod
    def _detect_demographic_categories(text: str) -> Set[str]:
        """
        Categorizes mentions of specific demographic cohorts.
        """
        tokens = set(re.findall(r"\b[a-z]+\b", text.lower()))
        detected = set()
        for category, terms in DEMOGRAPHIC_GROUPS.items():
            if not tokens.isdisjoint(terms):
                detected.add(category)
        return detected

    @staticmethod
    def _detect_severity_categories(text: str) -> Set[str]:
        """
        Categorizes mentions of severity and temporal indicators.
        """
        tokens = set(re.findall(r"\b[a-z]+\b", text.lower()))
        detected = set()
        for category, terms in SEVERITY_MODIFIERS.items():
            if not tokens.isdisjoint(terms):
                detected.add(category)
        return detected

    @staticmethod
    def _detect_primary_conditions(text: str) -> Set[str]:
        """
        Detects primary clinical symptom / disease entities.
        """
        lower = text.lower()
        detected = set()
        for condition, terms in PRIMARY_CONDITIONS.items():
            for term in terms:
                if re.search(r"\b" + re.escape(term) + r"\b", lower):
                    detected.add(condition)
                    break
        return detected

    def verify_compatibility(
        self,
        query: str,
        cached_question: str
    ) -> CompatibilityResult:
        """
        Verifies clinical compatibility between user query and cached candidate question.
        Returns CompatibilityResult.
        """
        discrepancies: List[str] = []

        # 1. POLARITY / NEGATION CHECK
        query_negs = self._extract_negations(query)
        cache_negs = self._extract_negations(cached_question)
        if bool(query_negs) != bool(cache_negs):
            discrepancies.append(
                f"Polarity mismatch: query has negations {query_negs}, "
                f"cache has {cache_negs}"
            )
            return CompatibilityResult(
                is_compatible=False,
                rejection_reason="POLARITY_MISMATCH",
                detected_discrepancies=discrepancies
            )

        # 2. PRIMARY CLINICAL ENTITY / CONDITION CHECK (e.g. Fever vs Cold)
        query_conditions = self._detect_primary_conditions(query)
        cache_conditions = self._detect_primary_conditions(cached_question)
        if query_conditions and cache_conditions:
            # If both have detected conditions and they have no overlap
            if query_conditions.isdisjoint(cache_conditions):
                discrepancies.append(
                    f"Primary medical condition mismatch: query asks about {query_conditions}, "
                    f"cache contains {cache_conditions}"
                )
                return CompatibilityResult(
                    is_compatible=False,
                    rejection_reason="PRIMARY_CONDITION_MISMATCH",
                    detected_discrepancies=discrepancies
                )

        # 3. NUMERIC / DOSAGE / VALUE CHECK
        if self.strict_numeric_match:
            query_nums = self._extract_numbers_with_units(query)
            cache_nums = self._extract_numbers_with_units(cached_question)
            if query_nums != cache_nums:
                diff_query = query_nums - cache_nums
                diff_cache = cache_nums - query_nums
                discrepancies.append(
                    f"Numeric value mismatch: query={diff_query}, cache={diff_cache}"
                )
                return CompatibilityResult(
                    is_compatible=False,
                    rejection_reason="NUMERIC_VALUE_MISMATCH",
                    detected_discrepancies=discrepancies
                )

        # 4. DEMOGRAPHIC COHORT CHECK (Adult vs Pediatric vs Geriatric vs Youth)
        query_demo = self._detect_demographic_categories(query)
        cache_demo = self._detect_demographic_categories(cached_question)
        if query_demo and cache_demo:
            age_cohorts = {"pediatric", "youth", "adult", "geriatric"}
            q_age = query_demo & age_cohorts
            c_age = cache_demo & age_cohorts
            if q_age and c_age and q_age.isdisjoint(c_age):
                discrepancies.append(
                    f"Demographic group conflict: query={q_age}, cache={c_age}"
                )
                return CompatibilityResult(
                    is_compatible=False,
                    rejection_reason="DEMOGRAPHIC_MISMATCH",
                    detected_discrepancies=discrepancies
                )

            gender_cohorts = {"gender_female", "gender_male"}
            q_gender = query_demo & gender_cohorts
            c_gender = cache_demo & gender_cohorts
            if q_gender and c_gender and q_gender.isdisjoint(c_gender):
                discrepancies.append(
                    f"Gender cohort conflict: query={q_gender}, cache={c_gender}"
                )
                return CompatibilityResult(
                    is_compatible=False,
                    rejection_reason="DEMOGRAPHIC_MISMATCH",
                    detected_discrepancies=discrepancies
                )

        # 5. SEVERITY / TEMPORAL CHECK (e.g. Acute vs Chronic, Mild vs Severe)
        query_sev = self._detect_severity_categories(query)
        cache_sev = self._detect_severity_categories(cached_question)
        
        # Conflict: one is acute and one is chronic
        if ("acute" in query_sev and "chronic" in cache_sev) or ("chronic" in query_sev and "acute" in cache_sev):
            discrepancies.append("Temporal mismatch: acute vs chronic conflict")
            return CompatibilityResult(
                is_compatible=False,
                rejection_reason="TEMPORAL_SEVERITY_MISMATCH",
                detected_discrepancies=discrepancies
            )

        # Conflict: one is mild and one is severe
        if ("mild" in query_sev and "severe" in cache_sev) or ("severe" in query_sev and "mild" in cache_sev):
            discrepancies.append("Severity gradient mismatch: mild vs severe conflict")
            return CompatibilityResult(
                is_compatible=False,
                rejection_reason="SEVERITY_GRADIENT_MISMATCH",
                detected_discrepancies=discrepancies
            )

        return CompatibilityResult(
            is_compatible=True,
            rejection_reason=None,
            detected_discrepancies=[]
        )
