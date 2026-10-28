import React, { useState } from 'react';
import { Settings, Server, Sliders, ShieldAlert, Database, RefreshCw } from 'lucide-react';

export default function SettingsView({
  apiEndpoint,
  setApiEndpoint,
  emergencyNumber,
  setEmergencyNumber,
  connectionStatus,
}) {
  const [customEndpoint, setCustomEndpoint] = useState(apiEndpoint);
  const [customEmergency, setCustomEmergency] = useState(emergencyNumber);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setApiEndpoint(customEndpoint);
    setEmergencyNumber(customEmergency);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    const defaultUrl = 'https://cd4xfmh22k.execute-api.ap-south-1.amazonaws.com/query';
    setCustomEndpoint(defaultUrl);
    setCustomEmergency('112');
    setApiEndpoint(defaultUrl);
    setEmergencyNumber('112');
  };

  return (
    <div className="settings-view">
      <div className="settings-card">
        <div className="card-header">
          <Settings size={20} className="icon cyan" />
          <div>
            <h3>Console & Endpoint Configuration</h3>
            <p>Customize the remote API Gateway and emergency dispatch settings</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="settings-form">
          <div className="form-group">
            <label htmlFor="api-endpoint-input">AWS API Gateway Endpoint (HTTPS)</label>
            <input
              id="api-endpoint-input"
              type="url"
              className="settings-input"
              value={customEndpoint}
              onChange={(e) => setCustomEndpoint(e.target.value)}
              required
            />
            <span className="input-help">
              Default live ingress: <code>https://cd4xfmh22k.execute-api.ap-south-1.amazonaws.com/query</code>
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="emergency-number-input">National Emergency Hotline Number</label>
            <input
              id="emergency-number-input"
              type="text"
              className="settings-input"
              value={customEmergency}
              onChange={(e) => setCustomEmergency(e.target.value)}
              required
            />
            <span className="input-help">
              Default national emergency service number for India: <code>112</code> (or 911 for US, 999 for UK).
            </span>
          </div>

          <div className="form-group">
            <label>Cosine Similarity Threshold (Read-Only Calibrated Value)</label>
            <input
              type="text"
              className="settings-input"
              value="0.92 (Strict Precision Mode)"
              disabled
            />
            <span className="input-help">
              Enforced server-side in Lambda: Cosine similarity must be $\ge 0.92$ to prevent clinical semantic drift.
            </span>
          </div>

          <div className="form-actions-row">
            <button type="submit" className="save-settings-btn">
              <span>Save Configuration</span>
            </button>
            <button type="button" className="reset-settings-btn" onClick={handleReset}>
              <RefreshCw size={13} />
              <span>Reset to Defaults</span>
            </button>
            {saved && <span className="save-indicator">✓ Settings updated</span>}
          </div>
        </form>
      </div>

      {/* Cloud Environment Details */}
      <div className="env-details-card">
        <h4>Deployed AWS Infrastructure (ap-south-1)</h4>
        <div className="env-grid">
          <div className="env-box">
            <span className="lbl">AWS ACCOUNT</span>
            <span className="val"><code>471597060887</code></span>
          </div>
          <div className="env-box">
            <span className="lbl">REGION</span>
            <span className="val"><code>ap-south-1 (Mumbai)</code></span>
          </div>
          <div className="env-box">
            <span className="lbl">TIER-1 LAMBDA</span>
            <span className="val"><code>gensync-tier1-handler</code></span>
          </div>
          <div className="env-box">
            <span className="lbl">DYNAMODB GSI CACHE</span>
            <span className="val"><code>gensync_semantic_query_cache</code></span>
          </div>
          <div className="env-box">
            <span className="lbl">CENTROIDS TABLE</span>
            <span className="val"><code>gensync_cluster_centroids</code></span>
          </div>
          <div className="env-box">
            <span className="lbl">SNS ESCALATION TOPIC</span>
            <span className="val"><code>ClinicalEmergencyTriage</code></span>
          </div>
          <div className="env-box">
            <span className="lbl">BUDGET SAFEGUARD</span>
            <span className="val green">Active ($0.01 limit alert)</span>
          </div>
          <div className="env-box">
            <span className="lbl">CURRENT SPEND</span>
            <span className="val green">$0.00 USD (Always Free)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
