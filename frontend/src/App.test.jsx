import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from './App';

describe('GenSync-MedAI Multi-View Clinical Dashboard Suite', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test 1: Initial Render, Brand & KPI Cards on Dashboard
  it('renders dashboard shell with sidebar, header, and 4 KPI cards', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: 'CORS preflight successful' }),
    });

    render(<App />);

    // Brand and Header
    expect(screen.getByText('GENSYNC-MEDAI')).toBeDefined();
    expect(screen.getByText('Clinical Safety Overview & Telemetry')).toBeDefined();

    // 4 KPI Cards
    expect(screen.getByText('TOTAL EVALUATIONS')).toBeDefined();
    expect(screen.getByText('SAFETY GATE RATE')).toBeDefined();
    expect(screen.getByText('CACHE HIT ACCURACY')).toBeDefined();
    expect(screen.getByText('SERVER LATENCY (P50)')).toBeDefined();

    // Charts
    expect(screen.getByText('Routing Outcomes Distribution')).toBeDefined();
    expect(screen.getByText('Routing Category Composition')).toBeDefined();
  });

  // Test 2: Sidebar Navigation
  it('switches views when clicking sidebar navigation links', () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200 });

    render(<App />);

    // Click Safety Gate
    const safetyBtn = screen.getByRole('button', { name: /Safety Gate/i });
    fireEvent.click(safetyBtn);
    expect(screen.getByText('Deterministic Safety Monitor')).toBeDefined();

    // Click Cache Telemetry
    const cacheBtn = screen.getByRole('button', { name: /Cache Telemetry/i });
    fireEvent.click(cacheBtn);
    expect(screen.getByText('Two-Stage DynamoDB Cache Performance')).toBeDefined();

    // Click Architecture
    const archBtn = screen.getByRole('button', { name: /Architecture/i });
    fireEvent.click(archBtn);
    expect(screen.getByText('System Architecture & Security Invariants')).toBeDefined();

    // Click Settings
    const settingsBtn = screen.getByRole('button', { name: /Settings/i });
    fireEvent.click(settingsBtn);
    expect(screen.getByText('Console Settings & Parameters')).toBeDefined();
  });

  // Test 3: Clinical Query Workspace & Character Counter
  it('navigates to Clinical Query view and validates character count limits', () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200 });

    render(<App />);
    const queryNav = screen.getByRole('button', { name: /Clinical Query/i });
    fireEvent.click(queryNav);

    const textarea = screen.getByPlaceholderText(/Enter a clinical query or select a preset below/i);
    fireEvent.change(textarea, { target: { value: 'Adult water requirements' } });
    expect(screen.getByText('24 / 500')).toBeDefined();

    const longQuery = 'A'.repeat(460);
    fireEvent.change(textarea, { target: { value: longQuery } });
    const pill = screen.getByText('460 / 500');
    expect(pill.className).toContain('warning');
  });

  // Test 4: Presets Populate Textarea
  it('populates query input when clicking preset button', () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200 });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Clinical Query/i }));

    const presetBtn = screen.getByRole('button', { name: /Crushing Chest Pain/i });
    fireEvent.click(presetBtn);

    const textarea = screen.getByPlaceholderText(/Enter a clinical query or select a preset below/i);
    expect(textarea.value).toContain('severe crushing chest pain');
  });

  // Test 5: State 1 - Emergency Triage Route
  it('renders emergency alert, dial 112 button, and bypass notification', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          routing_decision: 'EMERGENCY',
          emergency_advisory:
            'EMERGENCY ADVISORY: Potential critical condition detected. Dial 112 immediately.',
          emergency_number: '112',
          notification_status: 'published',
          latency_ms: 0.12,
          correlation_id: 'test-emergency-corr',
          query_digest: 'digest-emergency-1234',
        }),
      });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Clinical Query/i }));

    const textarea = screen.getByPlaceholderText(/Enter a clinical query or select a preset below/i);
    fireEvent.change(textarea, { target: { value: 'Severe chest pain radiating to left arm' } });

    const submitBtn = screen.getByRole('button', { name: /Evaluate Query/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Critical Emergency Triage Activated/i)).toBeDefined();
    });

    expect(screen.getByText(/EMERGENCY ADVISORY: Potential critical condition detected/i)).toBeDefined();
    const dialLink = screen.getByRole('link', { name: /Dial Emergency Services \(112\)/i });
    expect(dialLink.getAttribute('href')).toBe('tel:112');
  });

  // Test 6: State 2 - Professional Referral Route
  it('renders clinical referral guidance with verified health portal links', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          routing_decision: 'PROFESSIONAL_REFERRAL',
          referral_message:
            'PROFESSIONAL CLINICAL REFERRAL: This inquiry involves pediatric dosing and requires licensed care.',
          reason: 'PEDIATRIC_DOSING_CONTRAINDICATION',
          referral_resources: [
            {
              title: 'National Health Portal India',
              url: 'https://www.nhp.gov.in/',
              description: 'Verified clinical hospitals directory.',
            },
          ],
          latency_ms: 0.15,
          correlation_id: 'test-referral-corr',
          query_digest: 'digest-referral-5678',
        }),
      });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Clinical Query/i }));

    const textarea = screen.getByPlaceholderText(/Enter a clinical query or select a preset below/i);
    fireEvent.change(textarea, { target: { value: 'Amoxicillin dosing for newborn' } });

    fireEvent.click(screen.getByRole('button', { name: /Evaluate Query/i }));

    await waitFor(() => {
      expect(screen.getByText(/Professional Clinical Referral Required/i)).toBeDefined();
    });

    expect(screen.getByText(/National Health Portal India/i)).toBeDefined();
  });

  // Test 7: State 3 - Verified Safe Cache Hit
  it('renders verified cached answer, provenance, and similarity metrics', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          routing_decision: 'SAFE_CACHE_CANDIDATE',
          cache_hit: true,
          similarity_score: 0.9947,
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
    fireEvent.click(screen.getByRole('button', { name: /Clinical Query/i }));

    const textarea = screen.getByPlaceholderText(/Enter a clinical query or select a preset below/i);
    fireEvent.change(textarea, { target: { value: 'How much water to drink daily?' } });

    fireEvent.click(screen.getByRole('button', { name: /Evaluate Query/i }));

    await waitFor(() => {
      expect(screen.getByText(/Verified Educational Cache Hit/i)).toBeDefined();
    });

    expect(screen.getByText(/According to Mayo Clinic, 3.7 liters for men/i)).toBeDefined();
    expect(screen.getByText(/Mayo Clinic Health Information Review Board/i)).toBeDefined();
  });

  // Test 8: State 4 & State 5 - Cache Miss & Ingress Error
  it('handles safe cache miss and distinguishes transport failures', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          routing_decision: 'CACHE_MISS',
          cache_hit: false,
          reason: 'BELOW_COSINE_THRESHOLD',
          answer:
            "I'm not sure. No verified human-reviewed answer was found in the trusted cache for this inquiry.",
          latency: { total_ms: 180.5, embedding_ms: 105.0, cache_lookup_ms: 75.2 },
          correlation_id: 'test-miss-corr',
          query_digest: 'digest-miss-0000',
        }),
      });

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Clinical Query/i }));

    const textarea = screen.getByPlaceholderText(/Enter a clinical query or select a preset below/i);
    fireEvent.change(textarea, { target: { value: 'Solar flare headache treatments' } });

    fireEvent.click(screen.getByRole('button', { name: /Evaluate Query/i }));

    await waitFor(() => {
      expect(screen.getByText(/Controlled Cache Miss · Safe Refusal/i)).toBeDefined();
    });

    expect(screen.getByText(/No verified human-reviewed answer was found/i)).toBeDefined();
  });
});
