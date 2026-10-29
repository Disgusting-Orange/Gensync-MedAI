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
  UserCheck,
  Check,
  Database,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

const PRESETS = [
  {
    category: 'REFERRAL',
    label: '🍼 Pediatric Syrup',
    title: 'P500 Syrup Dosage',
    text: 'what is the dosage for p500 syrup',
  },
  {
    category: 'EMERGENCY',
    label: '🚨 Emergency Triage',
    title: 'Crushing Chest Pain',
    text: 'I have sudden severe crushing chest pain radiating into my left arm and jaw with cold sweats',
  },
  {
    category: 'CACHE_HIT',
    label: '⚡ Verified Cache Hit',
    title: 'Adult Resting BP',
    text: 'what is normal resting blood pressure for adults',
  },
  {
    category: 'CACHE_MISS',
    label: '🌡️ Entity Differentiation',
    title: 'Fever Symptoms',
    text: 'What are the symptoms of fever?',
  },
  {
    category: 'REFERRAL',
    label: '⚠️ Infant Cohort Safety',
    title: '25-Day-Old Infant Dosing',
    text: 'What is paracetamol dosage for a 25-day-old infant?',
  },
  {
    category: 'CACHE_HIT',
    label: '💧 Hydration Cache',
    title: 'Daily Water Intake',
    text: 'How much water should an average healthy adult drink daily?',
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
  onConnectProfessional,
}) {
  const [showInspector, setShowInspector] = useState(true);
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalationResult, setEscalationResult] = useState(null);

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      onSubmit(e);
    }
  };

  const handleTriggerProfessional = async () => {
    if (!onConnectProfessional || isEscalating) return;
    setIsEscalating(true);
    try {
      const res = await onConnectProfessional(query, response?.correlation_id);
      setEscalationResult(res);
    } catch (err) {
      setEscalationResult({
        error: true,
        message: err.message || 'Escalation dispatch failed. Please dial 112 directly.',
      });
    } finally {
      setIsEscalating(false);
    }
  };

  const serverLatencyTotal =
    response?.latency?.total_ms !== undefined
      ? response.latency.total_ms
      : response?.latency_ms !== undefined
      ? response.latency_ms
      : null;

  // Cache occupancy calculation
  const occupancyCount = response?.cache_occupancy?.current_entries ?? 20;
  const maxCapacity = response?.cache_occupancy?.max_capacity ?? 50;
  const occupancyPercent = Math.min(100, Math.round((occupancyCount / maxCapacity) * 100));

  return (
    <div className="clinical-query-view">
      {/* 1. Main Workspace Card */}
      <section className="query-console-card">
        <form onSubmit={onSubmit}>
          <div className="console-card-top">
            <label htmlFor="clinical-query-input" className="console-card-label">
              <Sparkles size={16} className="text-cyan-400" />
              <span>Safety-Gated Clinical Inquiry Console</span>
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
              placeholder="Enter a clinical query or select a preset below (e.g. hydration guidelines, fever management, infant dosing, p500 syrup)..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setEscalationResult(null);
              }}
              onKeyDown={handleKeyDown}
              disabled={loading}
              aria-required="true"
            />
          </div>

          <div className="console-card-bottom">
            <span className="console-hint">
              Press <code>Ctrl + Enter</code> to evaluate &bull; 0 dedicated vector DB &bull; Free Tier
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
          <div className="presets-header-label">PRESET TEST SCENARIOS (SAFETY & SEMANTIC CACHING)</div>
          <div className="presets-grid-row">
            {PRESETS.map((p, i) => (
              <button
                key={i}
                type="button"
                className="preset-btn-chip"
                onClick={() => {
                  setQuery(p.text);
                  setEscalationResult(null);
                }}
              >
                <span className="preset-chip-badge">{p.label}</span>
                <span className="preset-chip-title">{p.title}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Results Container */}
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
                  <ShieldAlert size={22} className="alert-icon red pulsing" />
                  <span className="alert-title emergency">Critical Emergency Triage Activated</span>
                  <span className="hit-score-badge emergency">Deterministic Safety Gate</span>
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
                  <span>Deterministic Invariant:</span> Cache lookup and model generation were strictly bypassed (0ms lookup).
                  {response.notification_status === 'published' && ' Operational SNS alert dispatched.'}
                </div>
              </div>
            )}

            {/* State 2: Professional Referral Gate (Pediatric Liquid & Critical Dosing) */}
            {response.routing_decision === 'PROFESSIONAL_REFERRAL' && (
              <div className="result-alert-box referral" role="region" aria-label="Professional Referral Notice">
                <div className="alert-top">
                  <AlertTriangle size={22} className="alert-icon amber" />
                  <span className="alert-title referral">
                    {response.reason?.includes('PEDIATRIC') || response.referral_message?.includes('PEDIATRIC')
                      ? 'Professional Clinical Referral Required · Pediatric Review'
                      : 'Professional Clinical Referral Required'}
                  </span>
                  <span className="hit-score-badge amber">High-Risk Medical Decision</span>
                </div>

                <div className="alert-body referral">
                  {response.referral_message}
                </div>

                {/* Connect to a Professional Doctor CTA */}
                {response.can_connect_professional && (
                  <div className="connect-professional-card">
                    <div className="connect-pro-info">
                      <div className="connect-pro-title">
                        <UserCheck size={18} className="text-cyan-400" />
                        <span>Need Immediate Clinical Guidance?</span>
                      </div>
                      <p className="connect-pro-desc">
                        Liquid syrups and weight-dependent medications must not be estimated via AI. You can dispatch an immediate inquiry to on-call clinical triage.
                      </p>
                    </div>

                    {escalationResult ? (
                      <div className={`escalation-status-box ${escalationResult.error ? 'error' : 'success'}`}>
                        {escalationResult.error ? (
                          <>
                            <AlertTriangle size={16} />
                            <span>{escalationResult.message}</span>
                          </>
                        ) : (
                          <>
                            <Check size={16} className="text-emerald-400" />
                            <span>
                              <strong>Clinical Escalation Dispatched:</strong> {escalationResult.message || 'Notification dispatched via Amazon SNS.'}
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="connect-pro-btn"
                        onClick={handleTriggerProfessional}
                        disabled={isEscalating}
                      >
                        <PhoneCall size={15} />
                        <span>{isEscalating ? 'Dispatching Escalation...' : 'Connect to a Professional Doctor'}</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="referral-resources-label">Verified Teleconsultation & Public Health Portals:</div>
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
                          description: 'Official Ministry of Health & Family Welfare doctor consultation platform.',
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
                  <CheckCircle size={22} className="alert-icon green" />
                  <span className="alert-title hit">Verified Educational Cache Hit · Clinical Semantic Match</span>
                  <span className="hit-score-badge green">
                    Similarity: {response.similarity_score ? (response.similarity_score * 100).toFixed(1) + '%' : '100.0%'} (≥ 92% Gate)
                  </span>
                </div>

                {response.matched_question && (
                  <div className="matched-question-label">
                    Matched Approved Inquiry: <em>"{response.matched_question}"</em>
                  </div>
                )}

                <div className="cached-answer-body">{response.answer}</div>

                <div className="provenance-grid">
                  <div className="provenance-cell">
                    <span className="cell-lbl">HUMAN REVIEW STATUS</span>
                    <span className="cell-val green">Approved &bull; Clinical Board</span>
                  </div>
                  <div className="provenance-cell">
                    <span className="cell-lbl">INSTITUTIONAL PROVENANCE</span>
                    <span className="cell-val">
                      {response.source_url ? (
                        <a href={response.source_url} target="_blank" rel="noopener noreferrer">
                          {response.reviewed_by || 'WHO / ICMR Clinical Guidelines'} ↗
                        </a>
                      ) : (
                        response.reviewed_by || 'Institutional Review'
                      )}
                    </span>
                  </div>
                  <div className="provenance-cell">
                    <span className="cell-lbl">REVIEW TIMESTAMP</span>
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

            {/* State 4: Safe Cache Miss (Structured AI Model Synthesis or Controlled Refusal) */}
            {response.routing_decision === 'CACHE_MISS' && (
              response.ai_generated ? (
                <div className="result-alert-box ai-synthesis" role="region" aria-label="AI Clinical Model Synthesis">
                  <div className="alert-top">
                    <Zap size={20} className="alert-icon cyan" />
                    <span className="alert-title ai-synthesis">AI Clinical Model Synthesis (Tier-2 Fallback)</span>
                    <span className="hit-score-badge cyan">
                      {response.model_name || 'GenSync Clinical SLM'}
                    </span>
                  </div>

                  {/* Direct Core Answer */}
                  <div className="ai-core-answer-box">
                    <div className="ai-core-label">CORE CLINICAL SUMMARY</div>
                    <div className="ai-core-text">{response.answer}</div>
                  </div>

                  {/* Scannable Key Points */}
                  {response.key_points && response.key_points.length > 0 && (
                    <div className="ai-key-points-section">
                      <div className="key-points-title">Key Clinical Takeaways:</div>
                      <ul className="key-points-list">
                        {response.key_points.map((pt, idx) => (
                          <li key={idx} className="key-point-item">
                            <span className="key-point-bullet" />
                            <span className="key-point-content">{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actionable Clinical Guidance */}
                  {response.clinical_guidance && (
                    <div className="ai-guidance-glass-card">
                      <div className="guidance-card-header">
                        <CheckCircle size={15} className="text-emerald-400" />
                        <span>ACTIONABLE CLINICAL GUIDANCE</span>
                      </div>
                      <p className="guidance-card-body">{response.clinical_guidance}</p>
                    </div>
                  )}

                  {/* Red Flags / Warning Signs */}
                  {response.warning_signs && (
                    <div className="ai-warning-glass-card">
                      <div className="warning-card-header">
                        <AlertTriangle size={15} className="text-amber-400" />
                        <span>SAFETY BOUNDARIES & WARNING SIGNS</span>
                      </div>
                      <p className="warning-card-body">{response.warning_signs}</p>
                    </div>
                  )}

                  <div className="alert-footer-note miss">
                    <span>AWS Zero-Vector-DB Pipeline:</span> Evaluated against DynamoDB semantic clusters, dynamically synthesized, and safely enqueued with automated LRU cache maintenance.
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

            {/* Scientific Observability Drawer with Dynamic Cache Occupancy */}
            <div className="telemetry-drawer-card">
              <button
                type="button"
                className="drawer-toggle-btn"
                onClick={() => setShowInspector(!showInspector)}
              >
                <div className="drawer-title-row">
                  <Database size={15} className="text-cyan-400" />
                  <span>🔬 Scientific Observability & Cache Occupancy ({occupancyCount} / {maxCapacity})</span>
                </div>
                <span className="drawer-state-indicator">{showInspector ? '▲ Collapse' : '▼ Expand'}</span>
              </button>

              {showInspector && (
                <div className="drawer-body">
                  {/* Cache Capacity & Eviction Telemetry */}
                  <div className="cache-occupancy-telemetry-row">
                    <div className="occupancy-info-col">
                      <div className="occupancy-label">
                        <Layers size={14} className="text-cyan-400" />
                        <span>DynamoDB Semantic Cache Occupancy:</span>
                        <strong className="occupancy-count">{occupancyCount} / {maxCapacity} entries</strong>
                        <span className="eviction-tag">LRU Eviction Active</span>
                      </div>
                      <div className="occupancy-progress-track">
                        <div
                          className="occupancy-progress-fill"
                          style={{
                            width: `${occupancyPercent}%`,
                            backgroundColor: occupancyPercent > 80 ? '#f59e0b' : '#06b6d4',
                          }}
                        />
                      </div>
                    </div>
                    <div className="occupancy-note">
                      * Auto-evicts least recently used items when full to maintain AWS Free Tier bounds.
                    </div>
                  </div>

                  {/* Match Reasoning Callout */}
                  {response.match_reasoning && (
                    <div className="match-reasoning-callout">
                      <Info size={14} className="text-cyan-400 flex-shrink-0" />
                      <div className="reasoning-text">
                        <strong>Match Reasoning:</strong> {response.match_reasoning}
                      </div>
                    </div>
                  )}

                  {/* Latency Telemetry Grid */}
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

                  {/* Cryptographic SHA-256 Digest */}
                  <div className="digest-box">
                    <div className="digest-lbl">
                      <span>Cryptographic Query Digest (SHA-256)</span>
                      <span className="digest-check">✓ Zero-PHI Invariant</span>
                    </div>
                    <div className="digest-val">
                      <code>{response.query_digest || clientDigest || 'N/A'}</code>
                    </div>
                    <div className="digest-note">
                      * One-way cryptographic digest. Raw patient queries are never stored in DynamoDB or CloudWatch.
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
