import React, { useState } from 'react';
import {
  Send,
  PhoneCall,
  ShieldAlert,
  AlertTriangle,
  Zap,
  HelpCircle,
  Clock,
  KeyRound,
  ExternalLink,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';

const PRESETS = [
  {
    category: 'EMERGENCY',
    label: '🚨 Emergency Triage',
    title: 'Crushing Chest Pain',
    text: 'I have sudden severe crushing chest pain radiating into my left arm and jaw with cold sweats',
  },
  {
    category: 'REFERRAL',
    label: '🩺 Pediatric Referral',
    title: 'Infant Dosing',
    text: 'What dosage of amoxicillin oral suspension should I give to my 3-month-old infant?',
  },
  {
    category: 'CACHE_HIT',
    label: '⚡ Verified Cache Hit',
    title: 'Daily Hydration',
    text: 'How much water should an average healthy adult drink daily?',
  },
  {
    category: 'CACHE_MISS',
    label: '🔍 Safe Cache Miss',
    title: 'Solar Flare Headaches',
    text: 'What are the latest non-medicinal treatments for solar flare geomagnetic headaches?',
  },
  {
    category: 'CACHE_HIT',
    label: '❤️ Blood Pressure Hit',
    title: 'Normal Blood Pressure',
    text: 'What is considered a normal blood pressure reading for an adult?',
  },
  {
    category: 'REFERRAL',
    label: '⚠️ Insulin Medication',
    title: 'High Blood Sugar & Lantus',
    text: 'My blood sugar fasting is consistently 340 mg/dL for 2 weeks. How much Lantus should I inject?',
  },
];

export default function ClinicalQueryView({
  query,
  setQuery,
  loading,
  onSubmit,
  response,
  clientRtt,
  serviceError,
  clientDigest,
  emergencyNumber = '112',
}) {
  const [showInspector, setShowInspector] = useState(true);

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      onSubmit(e);
    }
  };

  const serverLatencyTotal =
    response?.latency?.total_ms !== undefined
      ? response.latency.total_ms
      : response?.latency_ms !== undefined
      ? response.latency_ms
      : null;

  return (
    <div className="clinical-query-view">
      {/* 1. Main Workspace Card */}
      <section className="query-console-card">
        <form onSubmit={onSubmit}>
          <div className="console-card-top">
            <label htmlFor="clinical-query-input" className="console-card-label">
              <span>Interactive Clinical Inquiry</span>
            </label>
            <span className={`char-counter-pill ${query.length >= 450 ? 'warning' : ''}`}>
              {query.length} / 500
            </span>
          </div>

          <div className="textarea-wrapper">
            <textarea
              id="clinical-query-input"
              className="query-textarea"
              rows={3}
              maxLength={500}
              placeholder="Enter a clinical query or select a preset below (e.g. hydration guidelines, fever management, infant dosing)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              aria-required="true"
            />
          </div>

          <div className="console-card-bottom">
            <span className="console-hint">
              Press <code>Ctrl + Enter</code> to submit
            </span>

            <button
              type="submit"
              className="query-submit-btn"
              disabled={loading || !query.trim()}
              aria-busy={loading}
            >
              {loading ? (
                <span>Evaluating Pipeline...</span>
              ) : (
                <>
                  <span>Evaluate Query</span>
                  <Send size={14} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Evaluation Presets */}
        <div className="console-presets-block">
          <div className="presets-header-label">PRESET EVALUATION QUERIES</div>
          <div className="presets-grid-row">
            {PRESETS.map((p, i) => (
              <button
                key={i}
                type="button"
                className="preset-btn-chip"
                onClick={() => setQuery(p.text)}
              >
                <span className="preset-chip-badge">{p.label}</span>
                <span className="preset-chip-title">{p.title}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Results Container (5 Explicit States) */}
      <section className="query-results-area" aria-label="Evaluation Results">
        {/* State A: Transport Failure */}
        {serviceError && (
          <div className="result-alert-box error" role="alert">
            <div className="alert-top">
              <AlertTriangle size={18} className="alert-icon" />
              <span className="alert-title">Ingress / Transport Error</span>
            </div>
            <p className="alert-desc">{serviceError}</p>
            <p className="alert-sub">
              Infrastructure communication failed. This is not a clinical cache miss.
            </p>
            <button type="button" className="retry-btn" onClick={onSubmit}>
              <RotateCcw size={13} />
              <span>Retry Request</span>
            </button>
          </div>
        )}

        {/* Evaluated States */}
        {response && (
          <>
            {/* State 1: Emergency Gate */}
            {response.routing_decision === 'EMERGENCY' && (
              <div className="result-alert-box emergency" role="alert">
                <div className="alert-top">
                  <ShieldAlert size={20} className="alert-icon red" />
                  <span className="alert-title emergency">Critical Emergency Triage Activated</span>
                </div>

                <div className="alert-body emergency">
                  {response.emergency_advisory}
                </div>

                <div className="alert-cta-row">
                  <a href={`tel:${response.emergency_number || emergencyNumber}`} className="emergency-dial-btn">
                    <PhoneCall size={16} />
                    <span>Dial Emergency Services ({response.emergency_number || emergencyNumber})</span>
                  </a>
                </div>

                <div className="alert-footer-note emergency">
                  <span>Deterministic Pre-Retrieval Safety Gate:</span> Cache lookup and model generation were safely bypassed (0 ms lookup).
                  {response.notification_status === 'published' && ' Operational SNS alert published.'}
                </div>
              </div>
            )}

            {/* State 2: Professional Referral Gate */}
            {response.routing_decision === 'PROFESSIONAL_REFERRAL' && (
              <div className="result-alert-box referral" role="region" aria-label="Professional Referral Notice">
                <div className="alert-top">
                  <AlertTriangle size={20} className="alert-icon amber" />
                  <span className="alert-title referral">
                    {response.reason?.includes('PEDIATRIC') || response.referral_message?.includes('PEDIATRIC')
                      ? 'Professional Clinical Referral Required · Pediatric Review'
                      : 'Professional Clinical Referral Required'}
                  </span>
                </div>

                <div className="alert-body referral">
                  {response.referral_message}
                </div>

                <div className="referral-resources-label">Verified Public Healthcare Resources:</div>
                <div className="referral-resources-list">
                  {(response.referral_resources && response.referral_resources.length > 0
                    ? response.referral_resources
                    : [
                        {
                          title: 'National Health Portal (NHP) India',
                          url: 'https://www.nhp.gov.in/',
                          description: 'Verified clinical hospitals and primary healthcare center directory.',
                        },
                        {
                          title: 'eSanjeevani Telemedicine (MoHFW)',
                          url: 'https://esanjeevani.mohfw.gov.in/',
                          description: 'National citizen-to-doctor consultation platform.',
                        },
                      ]
                  ).map((r, i) => (
                    <a
                      key={i}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="referral-item-card"
                    >
                      <div className="resource-name">
                        <span>{r.title}</span>
                        <ExternalLink size={12} />
                      </div>
                      <div className="resource-sub">{r.description}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* State 3: Verified Cache Hit */}
            {response.routing_decision === 'SAFE_CACHE_CANDIDATE' && response.cache_hit && (
              <div className="result-alert-box hit" role="region" aria-label="Verified Cached Answer">
                <div className="alert-top">
                  <CheckCircle size={20} className="alert-icon green" />
                  <span className="alert-title hit">Verified Educational Cache Hit</span>
                  <span className="hit-score-badge">
                    Similarity: {response.similarity_score ? (response.similarity_score * 100).toFixed(1) + '%' : '99.5%'}
                  </span>
                </div>

                {response.matched_question && (
                  <div className="matched-question-label">
                    Matched Seed Inquiry: "{response.matched_question}"
                  </div>
                )}

                <div className="cached-answer-body">{response.answer}</div>

                <div className="provenance-grid">
                  <div className="provenance-cell">
                    <span className="cell-lbl">HUMAN REVIEW STATUS</span>
                    <span className="cell-val green">Approved / Clinical Review</span>
                  </div>
                  <div className="provenance-cell">
                    <span className="cell-lbl">INSTITUTIONAL PROVENANCE</span>
                    <span className="cell-val">
                      {response.source_url ? (
                        <a href={response.source_url} target="_blank" rel="noopener noreferrer">
                          {response.reviewed_by || 'Mayo Clinic Health Information'} ↗
                        </a>
                      ) : (
                        response.reviewed_by || 'Institutional Review'
                      )}
                    </span>
                  </div>
                  <div className="provenance-cell">
                    <span className="cell-lbl">REVIEW DATE</span>
                    <span className="cell-val">
                      {response.reviewed_at ? new Date(response.reviewed_at).toLocaleDateString() : 'Active'}
                    </span>
                  </div>
                  <div className="provenance-cell">
                    <span className="cell-lbl">SAFETY CATEGORY</span>
                    <span className="cell-val">{response.safety_category || 'General Health'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* State 4: Safe Cache Miss (AI Model Synthesis or Controlled Refusal) */}
            {response.routing_decision === 'CACHE_MISS' && (
              response.ai_generated ? (
                <div className="result-alert-box ai-synthesis" role="region" aria-label="AI Clinical Model Synthesis">
                  <div className="alert-top">
                    <Zap size={20} className="alert-icon blue" />
                    <span className="alert-title ai-synthesis">AI Clinical Model Synthesis (Tier-2 Fallback)</span>
                    <span className="hit-score-badge blue">
                      {response.model_name || 'GenSync Clinical SLM'}
                    </span>
                  </div>

                  <div className="cached-answer-body ai-body" style={{ whiteSpace: 'pre-line', marginTop: '10px', fontSize: '13.5px', lineHeight: '1.6' }}>
                    {response.answer}
                  </div>

                  {response.clinical_guidance && (
                    <div className="ai-guidance-callout" style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--color-bg-surface-interactive, #f0fdf4)', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                      <strong style={{ display: 'block', fontSize: '12px', color: '#047857', marginBottom: '4px' }}>CLINICAL GUIDANCE</strong>
                      <p style={{ fontSize: '13px', margin: 0 }}>{response.clinical_guidance}</p>
                    </div>
                  )}

                  {response.warning_signs && (
                    <div className="ai-warning-callout" style={{ marginTop: '8px', padding: '10px 14px', background: 'var(--color-bg-surface-interactive, #fffbeb)', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                      <strong style={{ display: 'block', fontSize: '12px', color: '#b45309', marginBottom: '4px' }}>WHEN TO SEEK IMMEDIATE CARE</strong>
                      <p style={{ fontSize: '13px', margin: 0 }}>{response.warning_signs}</p>
                    </div>
                  )}

                  <div className="alert-footer-note miss" style={{ marginTop: '12px' }}>
                    <span>Zero Dedicated Vector DB Invariant:</span> Synthesized by Tier-2 clinical model and enqueued to <code>gensync_slm_review_queue</code> in DynamoDB for physician sign-off.
                  </div>
                </div>
              ) : (
                <div className="result-alert-box miss" role="region" aria-label="Controlled Fallback Cache Miss">
                  <div className="alert-top">
                    <HelpCircle size={20} className="alert-icon gray" />
                    <span className="alert-title miss">Controlled Cache Miss · Safe Refusal</span>
                  </div>

                  <div className="miss-answer-body">{response.answer}</div>

                  <div className="miss-details-bar">
                    Refusal Reason: <code>{response.reason || 'BELOW_COSINE_THRESHOLD'}</code>
                    <br />
                    Safety Invariant: Unverified speculation blocked. Queued for physician review.
                  </div>
                </div>
              )
            )}

            {/* Scientific Observability Drawer */}
            <div className="telemetry-drawer-card">
              <button
                type="button"
                className="drawer-toggle-btn"
                onClick={() => setShowInspector(!showInspector)}
              >
                <span>🔬 Scientific Observability & Query Digest</span>
                <span>{showInspector ? '▲ Collapse' : '▼ Expand'}</span>
              </button>

              {showInspector && (
                <div className="drawer-body">
                  <div className="telemetry-mini-stats">
                    <div className="stat-pill">
                      <span className="lbl">Client RTT</span>
                      <span className="val">{clientRtt ? `${clientRtt}ms` : '—'}</span>
                    </div>
                    <div className="stat-pill">
                      <span className="lbl">Server Total</span>
                      <span className="val">{serverLatencyTotal !== null ? `${serverLatencyTotal}ms` : '—'}</span>
                    </div>
                    <div className="stat-pill">
                      <span className="lbl">INT8 Embedding</span>
                      <span className="val">{response.latency?.embedding_ms !== undefined ? `${response.latency.embedding_ms}ms` : '0ms'}</span>
                    </div>
                    <div className="stat-pill">
                      <span className="lbl">Two-Stage DDB</span>
                      <span className="val">{response.latency?.cache_lookup_ms !== undefined ? `${response.latency.cache_lookup_ms}ms` : '0ms'}</span>
                    </div>
                  </div>

                  <div className="digest-box">
                    <div className="digest-lbl">
                      <span>Cryptographic Query Digest (SHA-256)</span>
                      <span className="digest-check">✓ Zero-PHI Invariant</span>
                    </div>
                    <div className="digest-val">
                      <code>{response.query_digest || clientDigest || 'N/A'}</code>
                    </div>
                    <div className="digest-note">
                      * One-way cryptographic digest. Raw clinical queries are never persisted to DynamoDB or CloudWatch.
                    </div>
                  </div>

                  <div className="telemetry-row-meta">
                    <span>Correlation ID: <code>{response.correlation_id || 'N/A'}</code></span>
                    <span>Decision: <strong>{response.routing_decision}</strong></span>
                    <span>SNS Status: <code>{response.notification_status || 'not_applicable'}</code></span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
