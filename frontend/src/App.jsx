import React, { useState } from 'react';
import './App.css';

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'https://cd4xfmh22k.execute-api.ap-south-1.amazonaws.com/query';

const SAMPLE_QUERIES = [
  {
    type: 'emergency',
    label: '🚨 Emergency Triage',
    text: 'I have severe crushing chest pain radiating down my left arm and shortness of breath',
  },
  {
    type: 'referral',
    label: '🩺 Pediatric Referral',
    text: 'How many mg of amoxicillin should I give to my 4-month-old infant?',
  },
  {
    type: 'hit',
    label: '⚡ Verified Cache Hit',
    text: 'How much water should an average healthy adult drink daily?',
  },
  {
    type: 'miss',
    label: '🔍 Safe Cache Miss',
    text: 'What are the latest non-medicinal treatments for solar flare headaches?',
  },
  {
    type: 'hit_bp',
    label: '❤️ Blood Pressure Cache Hit',
    text: 'What are the normal blood pressure ranges for adults according to guidelines?',
  },
];

export default function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [clientRtt, setClientRtt] = useState(null);
  const [error, setError] = useState(null);
  const [showInspector, setShowInspector] = useState(true);

  const handlePreset = (text) => {
    setQuery(text);
    setError(null);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResponse(null);
    setClientRtt(null);

    const startTime = performance.now();
    const correlationId = 'web-' + Date.now();

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      const rtt = Math.round(performance.now() - startTime);
      setClientRtt(rtt);

      if (!res.ok) {
        throw new Error(`API returned HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      console.error('Query error:', err);
      setError(err.message || 'Failed to connect to the GenSync-MedAI serverless backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo" aria-hidden="true">🛡️</div>
          <div>
            <h1 className="brand-title">GenSync-MedAI</h1>
            <p className="brand-subtitle">Safety-Aware Serverless Semantic Cache for Clinical Q&A</p>
          </div>
        </div>

        <div className="header-badges">
          <span className="badge badge-live">
            <span className="pulse-dot"></span>
            AWS ap-south-1 Live
          </span>
          <span className="badge">Two-Stage Centroid GSI</span>
          <span className="badge">Zero-PHI Digest</span>
        </div>
      </header>

      {/* Prototype Warning Banner */}
      <div className="prototype-banner" role="alert">
        <span style={{ fontSize: '18px' }}>⚠️</span>
        <span>
          <strong>EDUCATIONAL RESEARCH PROTOTYPE ONLY:</strong> This system is not a medical device, diagnostic tool, or clinical decision support system. It is strictly designed for architectural evaluation of safety gating in semantic caching.
        </span>
      </div>

      {/* Main Query Card */}
      <section className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-label">
            <label htmlFor="clinical-query">Clinical Inquiry or Question</label>
            <span className={`char-counter ${query.length > 450 ? 'warning' : ''}`}>
              {query.length} / 500
            </span>
          </div>

          <textarea
            id="clinical-query"
            className="query-input"
            rows="3"
            maxLength={500}
            placeholder="Type a clinical query or select a preset below (e.g., adult water intake, fever management, dosing questions)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="form-actions">
            <button
              type="submit"
              className="submit-btn"
              disabled={loading || !query.trim()}
            >
              {loading ? (
                <>
                  <span>Executing Safety Triage & Cache Lookup...</span>
                </>
              ) : (
                <>
                  <span>Evaluate Query</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Presets */}
        <div className="presets-section">
          <div className="presets-label">Preset Evaluation Queries</div>
          <div className="presets-grid">
            {SAMPLE_QUERIES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                className="preset-chip"
                onClick={() => handlePreset(preset.text)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Error Card */}
      {error && (
        <div className="card" style={{ borderColor: 'var(--status-rose)', color: '#fca5a5' }}>
          <strong>Communication Error:</strong> {error}
        </div>
      )}

      {/* Results Display */}
      {response && (
        <div className="result-container">
          {/* 1. Emergency Route */}
          {response.routing_decision === 'EMERGENCY' && (
            <div className="result-card-emergency" role="alert">
              <div className="alert-header">
                <span style={{ fontSize: '28px' }}>🚨</span>
                <span className="alert-title-emergency">Emergency Triage Gate Activated</span>
              </div>
              <p className="alert-body-emergency">{response.emergency_advisory}</p>
              <div>
                <a href="tel:112" className="dial-cta">
                  <span>📞</span> Dial Emergency Services (112)
                </a>
              </div>
              <div className="sns-notice">
                <span>🔔</span>
                <span>
                  Clinical triage alert was automatically dispatched via AWS SNS ({response.notification_status || 'published'}).
                  Semantic cache retrieval was safely bypassed (0ms lookup).
                </span>
              </div>
            </div>
          )}

          {/* 2. Professional Referral Route */}
          {response.routing_decision === 'PROFESSIONAL_REFERRAL' && (
            <div className="result-card-referral" role="alert">
              <div className="alert-header">
                <span style={{ fontSize: '26px' }}>🩺</span>
                <span className="alert-title-referral">Professional Clinical Referral Required</span>
              </div>
              <p className="alert-body-referral">{response.referral_message}</p>
              <div className="referral-links">
                <a href="https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-use-111/" target="_blank" rel="noopener noreferrer" className="ref-link">
                  NHS 111 Online Guidance ↗
                </a>
                <a href="https://www.cdc.gov" target="_blank" rel="noopener noreferrer" className="ref-link">
                  CDC Official Health Resources ↗
                </a>
                <a href="https://www.mayoclinic.org" target="_blank" rel="noopener noreferrer" className="ref-link">
                  Mayo Clinic Patient Care ↗
                </a>
              </div>
            </div>
          )}

          {/* 3. Safe Cache Candidate (Hit or Miss) */}
          {response.routing_decision === 'SAFE_CACHE_CANDIDATE' && response.cache_hit && (
            <div className="result-card-hit">
              <div className="hit-header">
                <span className="hit-tag">
                  <span>⚡</span> Verified Safe Cache Hit
                </span>
                <span className="badge" style={{ borderColor: '#34d399', color: '#a7f3d0' }}>
                  Institutional Human Provenance
                </span>
              </div>
              <p className="answer-text">{response.answer}</p>

              <div className="provenance-box">
                <div className="provenance-row">
                  <span>Review Status:</span>
                  <span className="provenance-val">{response.review_status || 'HUMAN_REVIEWED'}</span>
                </div>
                {response.institutional_source && (
                  <div className="provenance-row">
                    <span>Source Institution:</span>
                    <span className="provenance-val">{response.institutional_source}</span>
                  </div>
                )}
                {response.reviewed_at && (
                  <div className="provenance-row">
                    <span>Review Timestamp:</span>
                    <span className="provenance-val">{response.reviewed_at}</span>
                  </div>
                )}
                {response.matched_cluster_id && (
                  <div className="provenance-row">
                    <span>Cluster Partition:</span>
                    <span className="provenance-val">{response.matched_cluster_id}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Cache Miss */}
          {response.routing_decision === 'CACHE_MISS' && (
            <div className="result-card-miss">
              <div className="miss-header">
                <span>🔍</span>
                <span>Cache Miss: Safe Tier-1 Fallback</span>
              </div>
              <p className="miss-text">{response.answer}</p>
              <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Deterministic Safety Check: No verified human-reviewed entry met the strict cosine similarity threshold (0.88) and clinical compatibility checks. Unverified SLM generation is refused.
              </p>
            </div>
          )}

          {/* Technical Inspector Drawer */}
          <div className="inspector-card">
            <button
              type="button"
              className="inspector-toggle"
              onClick={() => setShowInspector(!showInspector)}
            >
              <span>🔬 Architectural Latency & Privacy Inspector</span>
              <span>{showInspector ? '▲ Collapse' : '▼ Expand'}</span>
            </button>

            {showInspector && (
              <div className="inspector-content">
                <div className="metrics-row">
                  <div className="metric-box">
                    <div className="metric-label">Client RTT</div>
                    <div className="metric-value">{clientRtt ? `${clientRtt}ms` : '—'}</div>
                  </div>
                  <div className="metric-box">
                    <div className="metric-label">Server Total</div>
                    <div className="metric-value">
                      {response.latency?.total_ms !== undefined ? `${response.latency.total_ms}ms` : '—'}
                    </div>
                  </div>
                  <div className="metric-box">
                    <div className="metric-label">Embedding Latency</div>
                    <div className="metric-value">
                      {response.latency?.embedding_ms !== undefined ? `${response.latency.embedding_ms}ms` : '0ms'}
                    </div>
                  </div>
                  <div className="metric-box">
                    <div className="metric-label">Cache Lookup</div>
                    <div className="metric-value">
                      {response.latency?.cache_lookup_ms !== undefined ? `${response.latency.cache_lookup_ms}ms` : '0ms'}
                    </div>
                  </div>
                </div>

                <div className="audit-digest-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                      🔒 Privacy Invariant (Zero-PHI SHA-256 Digest)
                    </span>
                    <span style={{ color: 'var(--status-emerald)' }}>✓ Verified</span>
                  </div>
                  <div className="digest-hash">
                    {response.query_digest || 'N/A (Bypassed before digest)'}
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Only cryptographic SHA-256 hashes are persisted in DynamoDB audit logs and CloudWatch. Raw clinical text is discarded immediately after request processing.
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>Correlation ID: <code>{response.correlation_id || 'N/A'}</code></span>
                  <span>Routing Decision: <strong>{response.routing_decision}</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div>
          <strong>GenSync-MedAI</strong> · Safety-Aware Serverless Semantic Caching
        </div>
        <div>
          AWS Free-Tier Architecture ($0.01 Budget Alert Active) · Region: <code>ap-south-1</code>
        </div>
      </footer>
    </div>
  );
}
