"""
Unit Tests for Deterministic Clinical Triage Engine
Phase 1 Verification
"""

import pytest
from src.tier1.triage_rules import DeterministicTriageEngine, TriageResult


@pytest.fixture
def engine():
    return DeterministicTriageEngine(emergency_number="112")


# 1. EMERGENCY TEST SUITE
class TestEmergencyGate:
    @pytest.mark.parametrize("query,expected_category", [
        ("I have severe crushing chest pain radiating to my left arm", "severe_chest_pain"),
        ("My dad has sudden facial drooping and slurred speech", "stroke_indicators"),
        ("I cannot breathe and my throat feels like it is closing", "severe_breathing_difficulty"),
        ("Child swallowed bleach from under the sink", "suspected_overdose_poisoning"),
        ("Patient has spurting arterial bleeding from leg wound", "severe_uncontrolled_bleeding"),
        ("Experiencing anaphylaxis with swollen lips and wheezing", "anaphylaxis"),
        ("Person passed out and is having active continuous seizure", "loss_of_consciousness_seizure"),
        ("I want to kill myself and end my life tonight", "self_harm_suicide"),
    ])
    def test_emergency_indicators(self, engine, query, expected_category):
        result: TriageResult = engine.evaluate(query)
        assert result.routing_decision == "EMERGENCY"
        assert result.cache_allowed is False
        assert result.model_allowed is False
        assert "EMERGENCY ADVISORY" in result.user_message
        assert "112" in result.user_message
        assert len(result.referral_links) > 0


# 2. PROFESSIONAL REFERRAL TEST SUITE
class TestProfessionalReferralGate:
    @pytest.mark.parametrize("query,category_tag", [
        ("My 6-month-old baby has a slight cough, what should I give him?", "pediatric"),
        ("Can I take metformin 500mg together with my amlodipine?", "prescription_interaction"),
        ("How many mg of amoxicillin should I take for tooth infection?", "prescription_dosing"),
        ("Can I double my dose of blood thinner if I forgot yesterday?", "dose_adjustment"),
        ("Is it safe to take ibuprofen during first trimester of pregnancy?", "pregnancy"),
        ("I am a breastfeeding mother, can I take this medication?", "breastfeeding"),
        ("I am allergic to penicillin, what alternative can I take?", "allergies"),
        ("Please diagnose me, do I have lung cancer?", "individual_diagnosis"),
    ])
    def test_referral_indicators(self, engine, query, category_tag):
        result: TriageResult = engine.evaluate(query)
        assert result.routing_decision == "PROFESSIONAL_REFERRAL"
        assert result.cache_allowed is False
        assert result.model_allowed is False
        assert "PROFESSIONAL CLINICAL REFERRAL" in result.user_message
        assert len(result.referral_links) > 0


# 3. PRIORITY INVARIANT TEST (Emergency MUST override Referral)
class TestEmergencyPrecedence:
    def test_emergency_overrides_medication_mention(self, engine):
        # Mention of a medication alongside severe chest pain
        query = "I took my amlodipine but now have severe crushing chest pain and shortness of breath"
        result: TriageResult = engine.evaluate(query)
        assert result.routing_decision == "EMERGENCY"
        assert result.cache_allowed is False

    def test_emergency_overrides_pediatric_mention(self, engine):
        # Baby with respiratory emergency
        query = "My 1-year-old child cannot breathe and is choking turning blue"
        result: TriageResult = engine.evaluate(query)
        assert result.routing_decision == "EMERGENCY"
        assert result.cache_allowed is False


# 4. SAFE CANDIDATE TEST SUITE
class TestSafeCandidatePassThrough:
    @pytest.mark.parametrize("query", [
        "How much water should a healthy adult drink each day?",
        "What are common symptoms of mild dehydration in adults?",
        "What is considered a normal resting blood pressure reading?",
        "What lifestyle habits help maintain healthy blood pressure?",
        "What oral body temperature is clinically considered a fever?",
        "What is the difference between a tension headache and a migraine?",
        "What dietary habits support healthy blood sugar balance?",
    ])
    def test_safe_general_queries_pass(self, engine, query):
        result: TriageResult = engine.evaluate(query)
        assert result.routing_decision == "SAFE_CACHE_CANDIDATE"
        assert result.cache_allowed is True
        assert result.model_allowed is False


# 5. INPUT VALIDATION TEST SUITE
class TestInputValidation:
    def test_empty_query(self, engine):
        result = engine.evaluate("")
        assert result.routing_decision == "INVALID_REQUEST"
        assert result.cache_allowed is False

    def test_whitespace_only(self, engine):
        result = engine.evaluate("    ")
        assert result.routing_decision == "INVALID_REQUEST"

    def test_too_short(self, engine):
        result = engine.evaluate("hi")
        assert result.routing_decision == "INVALID_REQUEST"

    def test_too_long(self, engine):
        long_query = "What is health? " * 100
        result = engine.evaluate(long_query)
        assert result.routing_decision == "INVALID_REQUEST"
