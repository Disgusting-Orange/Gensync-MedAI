"""
GenSync-Cache: Deterministic Clinical Triage Rules
Stage 1 Pre-retrieval Safety Layer

Invariants:
1. Deterministic rules execute BEFORE any embedding generation, vector lookup, or LLM call.
2. No language model may decide whether a query is safe or an emergency.
3. Emergency rules strictly supersede professional-referral rules.
4. Ambiguous queries fail closed to PROFESSIONAL_REFERRAL.
"""

import re
from dataclasses import dataclass
from typing import Optional, List, Dict, Any


@dataclass
class TriageResult:
    routing_decision: str  # EMERGENCY, PROFESSIONAL_REFERRAL, SAFE_CACHE_CANDIDATE, INVALID_REQUEST
    cache_allowed: bool
    model_allowed: bool
    reason: str
    matched_patterns: List[str]
    user_message: str
    referral_links: List[Dict[str, str]]


# Verified Referral Resource Links (Official National / Public Health Portals)
VERIFIED_REFERRAL_RESOURCES = [
    {
        "title": "National Health Portal (NHP) India - Directory of Health Services",
        "url": "https://www.nhp.gov.in/",
        "description": "Government of India portal for verified hospitals, primary care centers, and certified clinical providers."
    },
    {
        "title": "eSanjeevani National Telemedicine Service",
        "url": "https://esanjeevani.mohfw.gov.in/",
        "description": "Official Ministry of Health & Family Welfare citizen-to-doctor teleconsultation platform."
    },
    {
        "title": "Kiran Mental Health Rehabilitation Helpline (Toll-Free 1800-599-0019)",
        "url": "https://depwd.gov.in/",
        "description": "24/7 national mental health and crisis support helpline."
    }
]


# Deterministic Emergency Patterns
EMERGENCY_PATTERNS = {
    "severe_chest_pain": [
        r"\b(severe|crushing|squeezing|radiating)\s+(chest\s+pain|chest\s+pressure|heart\s+pain)\b",
        r"\b(chest\s+pain|chest\s+tightness)\s+(with|and)\s+(left\s+arm|jaw\s+pain|shortness\s+of\s+breath|sweating)\b",
        r"\b(having|suspect|signs\s+of)\s+a?\s*(heart\s+attack|myocardial\s+infarction)\b",
    ],
    "stroke_indicators": [
        r"\b(face\s+droop|facial\s+drooping|arm\s+weakness|slurred\s+speech|speech\s+difficulty)\b",
        r"\b(sudden\s+numbness|sudden\s+loss\s+of\s+vision|sudden\s+inability\s+to\s+speak)\b",
        r"\b(having|signs\s+of)\s+a?\s*(stroke|cerebrovascular\s+accident|tia|mini\s+stroke)\b",
    ],
    "severe_breathing_difficulty": [
        r"\b(cannot\s+breathe|gasping\s+for\s+air|unable\s+to\s+breathe|severe\s+shortness\s+of\s+breath)\b",
        r"\b(choking|throat\s+closing|turning\s+blue|cyanosis)\b",
        r"\b(respiratory\s+failure|suffocation|stridor)\b",
    ],
    "suspected_overdose_poisoning": [
        r"\b(swallowed|ingested|drank)\s+(poison|bleach|detergent|battery|pesticide|cleaner)\b",
        r"\b(took\s+too\s+many|overdosed\s+on|overdose\s+of)\s+([a-z\s]+)\b",
        r"\b(acute\s+poisoning|toxic\s+ingestion)\b",
    ],
    "severe_uncontrolled_bleeding": [
        r"\b(uncontrolled|spurting|gushing|severe|massive)\s+(?:arterial\s+)?(bleeding|blood\s+loss|hemorrhage)\b",
        r"\b(arterial\s+bleed|arterial\s+bleeding|arterial\s+hemorrhage)\b",
        r"\b(coughing\s+up|vomiting)\s+(large\s+amounts\s+of\s+blood|blood\s+clots)\b",
        r"\b(wound\s+won'?t\s+stop\s+bleeding)\b",
    ],
    "anaphylaxis": [
        r"\b(anaphylaxis|anaphylactic\s+shock)\b",
        r"\b(tongue\s+swelling|swollen\s+lips|throat\s+swelling)\s+(with|and)\s+(difficulty\s+breathing|hives|wheezing)\b",
    ],
    "loss_of_consciousness_seizure": [
        r"\b(unconscious|unresponsive|passed\s+out|fainted\s+and\s+not\s+waking\s+up)\b",
        r"\b(active\s+seizure|convulsing|grand\s+mal\s+seizure|continuous\s+seizure)\b",
    ],
    "self_harm_suicide": [
        r"\b(want\s+to\s+kill\s+myself|committing\s+suicide|end\s+my\s+life|suicidal\s+thoughts)\b",
        r"\b(slit\s+my\s+wrist|hanging\s+myself|took\s+all\s+my\s+pills\s+to\s+die)\b",
        r"\b(harm\s+myself|self\s+harm)\b",
    ],
}


# Deterministic Professional Referral Patterns
REFERRAL_PATTERNS = {
    "pediatric_infant_care": [
        r"\b(my\s+baby|my\s+infant|my\s+newborn|my\s+toddler|my\s+child|my\s+kid)\b",
        r"\b(\d+[\s-]*(month|week|day|year)[\s-]*old)\b",
        r"\b(pediatric|infant\s+dose|baby\s+fever|child\s+symptoms)\b",
    ],
    "prescription_medications": [
        r"\b(metformin|amlodipine|lisinopril|atorvastatin|levothyroxine|omeprazole)\b",
        r"\b(amoxicillin|azithromycin|ciprofloxacin|doxycycline|augmentin|antibiotic)\b",
        r"\b(warfarin|apixaban|clopidogrel|heparin|eliquis|blood\s+thinner)\b",
        r"\b(insulin|glipizide|empagliflozin|ozempic|wegovy|saxenda)\b",
        r"\b(prednisone|dexamethasone|methylprednisolone|steroid\s+dose)\b",
        r"\b(sertraline|fluoxetine|alprazolam|lorazepam|clonazepam|escitalopram)\b",
    ],
    "medication_dosing_and_changes": [
        r"\b(how\s+many\s+mg|what\s+dose|dosage\s+for|can\s+i\s+take\s+\d+\s*mg)\b",
        r"\b(double\s+my\s+dose|increase\s+my\s+dose|stop\s+taking|missed\s+a?\s*dose)\b",
        r"\b(how\s+often\s+to\s+take|take\s+on\s+empty\s+stomach|adjust\s+my\s+medication)\b",
    ],
    "drug_interactions": [
        r"\b(can\s+i\s+take\s+[\w\s]+\s+with\s+[\w\s]+|interaction\s+between)\b",
        r"\b(mix\s+[\w\s]+\s+and\s+[\w\s]+|safe\s+to\s+combine)\b",
        r"\b(drug\s+interaction|contraindicated\s+with)\b",
    ],
    "pregnancy_and_breastfeeding": [
        r"\b(pregnant|during\s+pregnancy|first\s+trimester|second\s+trimester|third\s+trimester)\b",
        r"\b(breastfeeding|nursing\s+mother|lactating|safe\s+while\s+nursing)\b",
        r"\b(pregnancy\s+complications|morning\s+sickness\s+medication|cramping\s+in\s+pregnancy)\b",
    ],
    "allergies_and_contraindications": [
        r"\b(allergic\s+to\s+[a-z]+|penicillin\s+allergy|sulfa\s+allergy)\b",
        r"\b(contraindicated|adverse\s+reaction\s+to|bad\s+reaction\s+to)\b",
    ],
    "individual_diagnosis_treatment": [
        r"\b(diagnose\s+me|do\s+i\s+have\s+cancer|is\s+my\s+tumor\s+malignant)\b",
        r"\b(how\s+long\s+do\s+i\s+have\s+to\s+live|tell\s+me\s+my\s+prognosis)\b",
        r"\b(prescribe\s+me|write\s+me\s+a\s+prescription)\b",
    ],
}


class DeterministicTriageEngine:
    """
    Evaluates clinical queries against compiled deterministic regular expressions.
    Guarantees that emergency and professional-referral routing occurs prior to any
    vector or model invocation.
    """

    def __init__(self, emergency_number: str = "112"):
        self.emergency_number = emergency_number
        self._compiled_emergency = {
            category: [re.compile(p, re.IGNORECASE) for p in patterns]
            for category, patterns in EMERGENCY_PATTERNS.items()
        }
        self._compiled_referral = {
            category: [re.compile(p, re.IGNORECASE) for p in patterns]
            for category, patterns in REFERRAL_PATTERNS.items()
        }

    def evaluate(self, query: str) -> TriageResult:
        """
        Evaluates a raw clinical query in strict priority order:
        1. Validate length/content
        2. Emergency Gate
        3. Professional Referral Gate
        4. Safe Cache Candidate Gate
        """
        if not query or not query.strip():
            return TriageResult(
                routing_decision="INVALID_REQUEST",
                cache_allowed=False,
                model_allowed=False,
                reason="Query string is empty or contains whitespace only.",
                matched_patterns=[],
                user_message="Please enter a valid clinical question.",
                referral_links=[]
            )

        cleaned_query = query.strip()
        if len(cleaned_query) < 5 or len(cleaned_query) > 1000:
            return TriageResult(
                routing_decision="INVALID_REQUEST",
                cache_allowed=False,
                model_allowed=False,
                reason=f"Query length ({len(cleaned_query)}) outside permissible range (5-1000 chars).",
                matched_patterns=[],
                user_message="Questions must be between 5 and 1000 characters.",
                referral_links=[]
            )

        # 1. EMERGENCY GATE (Highest Priority)
        for category, regex_list in self._compiled_emergency.items():
            for regex in regex_list:
                match = regex.search(cleaned_query)
                if match:
                    return TriageResult(
                        routing_decision="EMERGENCY",
                        cache_allowed=False,
                        model_allowed=False,
                        reason=f"Matched emergency category: {category}",
                        matched_patterns=[category, match.group(0)],
                        user_message=(
                            f"EMERGENCY ADVISORY: Potential critical condition detected. "
                            f"Dial {self.emergency_number} immediately."
                        ),
                        referral_links=VERIFIED_REFERRAL_RESOURCES
                    )

        # 2. PROFESSIONAL REFERRAL GATE
        matched_referral_categories = []
        matched_referral_snippets = []
        for category, regex_list in self._compiled_referral.items():
            for regex in regex_list:
                match = regex.search(cleaned_query)
                if match:
                    matched_referral_categories.append(category)
                    matched_referral_snippets.append(match.group(0))

        if matched_referral_categories:
            primary_reason = matched_referral_categories[0]
            return TriageResult(
                routing_decision="PROFESSIONAL_REFERRAL",
                cache_allowed=False,
                model_allowed=False,
                reason=f"Matched professional referral categories: {', '.join(set(matched_referral_categories))}",
                matched_patterns=matched_referral_snippets,
                user_message=(
                    "PROFESSIONAL CLINICAL REFERRAL: This query involves patient-specific dosing, "
                    "pediatric care, prescription medications, pregnancy, or individual diagnosis. "
                    "Automated cached answers are not permitted for high-risk clinical inquiries. "
                    "Please consult a licensed doctor, pharmacist, or official healthcare facility directly."
                ),
                referral_links=VERIFIED_REFERRAL_RESOURCES
            )

        # 3. ELIGIBLE FOR CACHE RETRIEVAL
        return TriageResult(
            routing_decision="SAFE_CACHE_CANDIDATE",
            cache_allowed=True,
            model_allowed=False,  # Model generation is only considered after cache miss evaluation
            reason="Query cleared deterministic emergency and professional-referral safety gates.",
            matched_patterns=[],
            user_message="",
            referral_links=[]
        )
