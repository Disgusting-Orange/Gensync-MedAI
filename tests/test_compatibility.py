"""
Unit Tests for Deterministic Clinical Compatibility Gate
Phase 1 Verification
"""

import pytest
from src.tier1.clinical_gate import ClinicalCompatibilityGate, CompatibilityResult


@pytest.fixture
def gate():
    return ClinicalCompatibilityGate(strict_numeric_match=True)


class TestClinicalCompatibilityGate:
    # 1. POLARITY & NEGATION TESTS
    def test_polarity_mismatch_with_vs_without(self, gate):
        query = "Can an adult have a headache without fever?"
        cache = "Can an adult have a headache with fever?"
        result = gate.verify_compatibility(query, cache)
        assert result.is_compatible is False
        assert result.rejection_reason == "POLARITY_MISMATCH"

    def test_polarity_match_both_affirmative(self, gate):
        query = "What lifestyle changes lower blood pressure?"
        cache = "What lifestyle habits help maintain healthy blood pressure levels?"
        result = gate.verify_compatibility(query, cache)
        assert result.is_compatible is True
        assert result.rejection_reason is None

    # 2. NUMERIC & DOSAGE VALUE TESTS
    def test_numeric_mismatch_temperature(self, gate):
        query = "Is an oral temperature of 104F considered dangerous in adults?"
        cache = "What body temperature is clinically defined as a fever in adults? (100.4F)"
        result = gate.verify_compatibility(query, cache)
        assert result.is_compatible is False
        assert result.rejection_reason == "NUMERIC_VALUE_MISMATCH"

    def test_numeric_mismatch_dosage_values(self, gate):
        query = "What are the benefits of 50mg zinc daily?"
        cache = "What are the benefits of 5mg zinc daily?"
        result = gate.verify_compatibility(query, cache)
        assert result.is_compatible is False
        assert result.rejection_reason == "NUMERIC_VALUE_MISMATCH"

    def test_numeric_match_identical_values(self, gate):
        query = "Is 120/80 mmhg normal blood pressure?"
        cache = "What is considered a normal resting blood pressure reading? (< 120/80 mmhg)"
        result = gate.verify_compatibility(query, cache)
        assert result.is_compatible is True

    # 3. DEMOGRAPHIC COHORT TESTS
    def test_demographic_mismatch_elderly_vs_youth(self, gate):
        query = "What are hydration guidelines for elderly seniors?"
        cache = "How much water should a healthy youth drink daily?"
        result = gate.verify_compatibility(query, cache)
        assert result.is_compatible is False
        assert result.rejection_reason == "DEMOGRAPHIC_MISMATCH"

    def test_demographic_match_neutral(self, gate):
        query = "How much water should an adult drink daily?"
        cache = "How much water should an average healthy adult drink daily?"
        result = gate.verify_compatibility(query, cache)
        assert result.is_compatible is True

    # 4. SEVERITY & TEMPORAL TESTS
    def test_severity_mismatch_acute_vs_chronic(self, gate):
        query = "How to treat sudden acute severe headache?"
        cache = "How to manage chronic persistent tension headaches?"
        result = gate.verify_compatibility(query, cache)
        # Should detect acute vs chronic conflict or mild vs severe
        assert result.is_compatible is False
        assert result.rejection_reason in ("TEMPORAL_SEVERITY_MISMATCH", "SEVERITY_GRADIENT_MISMATCH")

    def test_severity_mismatch_mild_vs_severe(self, gate):
        query = "What causes severe intense headache discomfort?"
        cache = "What comfort steps help ease a mild headache?"
        result = gate.verify_compatibility(query, cache)
        assert result.is_compatible is False
        assert result.rejection_reason == "SEVERITY_GRADIENT_MISMATCH"
