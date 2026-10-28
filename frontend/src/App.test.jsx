import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from './App';

describe('GenSync-MedAI Frontend Clinical Console Suite', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test 1: Initial Render & Brand Identity
  it('renders clinical console header, input workspace, and benchmark metrics', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: 'CORS preflight successful' }),
    });

    render(<App />);

    expect(screen.getByText('GENSYNC-MEDAI')).toBeDefined();
    expect(
      screen.getByText(/Safety-Aware Semantic Caching for Clinical Q&A/i)
    ).toBeDefined();
    expect(screen.getByLabelText(/Clinical Query Console/i)).toBeDefined();
    expect(screen.getByText(/Empirical Benchmark Summary/i)).toBeDefined();
    expect(screen.getByText('96.9%')).toBeDefined();
  });

  // Test 2: Character Counter Validation
  it('updates character count and warns when approaching safety ceiling', () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200 });

    render(<App />);
    const textarea = screen.getByLabelText(/Clinical Query Console/i);

    fireEvent.change(textarea, { target: { value: 'Test query' } });
    expect(screen.getByText('10 / 500 characters')).toBeDefined();

    const longQuery = 'A'.repeat(460);
    fireEvent.change(textarea, { target: { value: longQuery } });
    const counter = screen.getByText('460 / 500 characters');
    expect(counter.className).toContain('threshold-warning');
  });

  // Test 3: Preset Selector Populates Query Input
  it('populates clinical query textarea when clicking an evaluation preset', () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200 });

    render(<App />);
    const chestPainPreset = screen.getAllByText(/Crushing Chest Pain/i)[0];
    fireEvent.click(chestPainPreset);

    const textarea = screen.getByLabelText(/Clinical Query Console/i);
    expect(textarea.value).toContain('severe crushing chest pain');
  });

  // Test 4: State 1 - Emergency Triage Gate Response
  it('renders high-contrast emergency advisory, dial 112 CTA, and bypass notice', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, status: 200 }) // initial options
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          routing_decision: 'EMERGENCY',
          emergency_advisory:
            'EMERGENCY ADVISORY: Potential critical condition detected. Dial 112 immediately.',
          emergency_number: '112',
          cache_allowed: false,
          model_allowed: false,
          notification_status: 'published',
          latency_ms: 0.12,
          correlation_id: 'test-emergency-corr',
          query_digest: 'digest-emergency-1234',
        }),
      });

    render(<App />);
    const textarea = screen.getByLabelText(/Clinical Query Console/i);
    fireEvent.change(textarea, { target: { value: 'Severe chest pain radiating to arm' } });

    const submitBtn = screen.getByRole('button', { name: /Evaluate Query/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Critical Emergency Triage Activated/i)
      ).toBeDefined();
    });

    expect(
      screen.getByText(/EMERGENCY ADVISORY: Potential critical condition detected/i)
    ).toBeDefined();

    const dialLink = screen.getByRole('link', {
      name: /Dial Emergency Services \(112\)/i,
    });
    expect(dialLink.getAttribute('href')).toBe('tel:112');
    expect(screen.getByText(/safely bypassed \(0 ms vector lookup\)/i)).toBeDefined();
  });

  // Test 5: State 2 - Professional Referral Gate Response
  it('renders clinical referral guidance with verified health portal links', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          routing_decision: 'PROFESSIONAL_REFERRAL',
          referral_message:
            'PROFESSIONAL CLINICAL REFERRAL: This inquiry involves prescription pediatric dosing.',
          reason: 'PEDIATRIC_DOSING_CONTRAINDICATION',
          cache_allowed: false,
          model_allowed: false,
          referral_resources: [
            {
              title: 'National Health Portal India',
              url: 'https://www.nhp.gov.in/',
              description: 'Official verified provider directory.',
            },
          ],
          latency_ms: 0.15,
          correlation_id: 'test-referral-corr',
          query_digest: 'digest-referral-5678',
        }),
      });

    render(<App />);
    const textarea = screen.getByLabelText(/Clinical Query Console/i);
    fireEvent.change(textarea, { target: { value: 'Amoxicillin dosing for infant' } });

    const submitBtn = screen.getByRole('button', { name: /Evaluate Query/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Professional Clinical Referral Required/i)
      ).toBeDefined();
    });

    expect(
      screen.getByText(/This inquiry involves prescription pediatric dosing/i)
    ).toBeDefined();
    expect(screen.getByText(/National Health Portal India/i)).toBeDefined();
  });

  // Test 6: State 3 - Verified Cache Hit Response
  it('renders verified answer, institutional provenance, review date, and similarity metrics', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          routing_decision: 'SAFE_CACHE_CANDIDATE',
          cache_hit: true,
          similarity_score: 0.9947,
          threshold_used: 0.92,
          matched_question: 'How much water should an average healthy adult drink daily?',
          answer: 'According to Mayo Clinic, 3.7 liters for men and 2.7 liters for women.',
          source_url: 'https://www.mayoclinic.org/water',
          reviewed_by: 'Mayo Clinic Health Information Review Board',
          reviewed_at: '2026-09-15T10:00:00Z',
          safety_category: 'GENERAL_WELLNESS',
          latency: {
            total_ms: 213.0,
            embedding_ms: 112.0,
            cache_lookup_ms: 100.8,
          },
          correlation_id: 'test-hit-corr',
          query_digest: 'digest-hit-9999',
        }),
      });

    render(<App />);
    const textarea = screen.getByLabelText(/Clinical Query Console/i);
    fireEvent.change(textarea, { target: { value: 'How much water to drink daily?' } });

    const submitBtn = screen.getByRole('button', { name: /Evaluate Query/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Verified Educational Cache Hit/i)).toBeDefined();
    });

    expect(
      screen.getByText(/According to Mayo Clinic, 3.7 liters for men/i)
    ).toBeDefined();
    expect(
      screen.getByText(/Mayo Clinic Health Information Review Board/i)
    ).toBeDefined();
    expect(screen.getByText(/Similarity: 99.5%/i)).toBeDefined();
  });

  // Test 7: State 4 - Safe Cache Miss Response
  it('renders safe refusal fallback without inventing medical hallucinations', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          routing_decision: 'CACHE_MISS',
          cache_hit: false,
          reason: 'BELOW_COSINE_THRESHOLD',
          similarity_score: 0.62,
          threshold_used: 0.92,
          answer:
            "I'm not sure. No verified human-reviewed answer was found in the trusted cache for this inquiry. Please consult a qualified clinician.",
          unverified_slm_enabled: false,
          latency: {
            total_ms: 180.5,
            embedding_ms: 105.0,
            cache_lookup_ms: 75.2,
          },
          correlation_id: 'test-miss-corr',
          query_digest: 'digest-miss-0000',
        }),
      });

    render(<App />);
    const textarea = screen.getByLabelText(/Clinical Query Console/i);
    fireEvent.change(textarea, { target: { value: 'Solar flare headache treatments' } });

    const submitBtn = screen.getByRole('button', { name: /Evaluate Query/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Controlled Cache Miss · Safe Fallback/i)
      ).toBeDefined();
    });

    expect(
      screen.getByText(/No verified human-reviewed answer was found in the trusted cache/i)
    ).toBeDefined();
    expect(
      screen.getByText(/BELOW_COSINE_THRESHOLD/i)
    ).toBeDefined();
  });

  // Test 8: State 5 - Transport / Ingress Error
  it('distinguishes network/API transport failure from a clinical cache miss and provides Retry', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockRejectedValueOnce(new Error('Network connection timed out'));

    render(<App />);
    const textarea = screen.getByLabelText(/Clinical Query Console/i);
    fireEvent.change(textarea, { target: { value: 'Any query' } });

    const submitBtn = screen.getByRole('button', { name: /Evaluate Query/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Ingress \/ Transport Failure/i)).toBeDefined();
    });

    expect(
      screen.getByText(/Network connection timed out/i)
    ).toBeDefined();
    expect(
      screen.getByText(/This is an infrastructure communication failure, not a clinical cache miss/i)
    ).toBeDefined();
    expect(screen.getByRole('button', { name: /Retry Query Evaluation/i })).toBeDefined();
  });
});
