import React, { useState } from 'react';
import {
  Settings,
  Server,
  Sliders,
  ShieldAlert,
  Database,
  RefreshCw,
  CheckCircle2,
  PhoneCall,
  Save,
  RotateCcw,
} from 'lucide-react';

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
    <div className="settings-view-container">
      {/* 1. Header Hero Card */}
      <div className="settings-hero-card">
        <div className="settings-hero-content">
          <div className="card-title-group">
            <div className="settings-icon-circle">
              <Settings size={24} className="settings-primary-icon" />
            </div>
            <div>
              <h3>Console Settings &amp; Telemetry Switchboard</h3>
              <p>Configure API Gateway routing endpoints, emergency dispatch numbers, and view cloud environment metrics.</p>
            </div>
          </div>
          <div className="settings-badges-row">
            <span className="set-pill green">
              <CheckCircle2 size={13} /> {connectionStatus === 'online' ? 'ap-south-1 Connected' : 'Checking...'}
            </span>
            <span className="set-pill blue">
              <Server size={13} /> AWS Account 471597060887
            </span>
          </div>
        </div>
      </div>

      {/* 2. Settings Form Card */}
      <div className="settings-form-card">
        <div className="form-card-header">
          <Sliders size={18} className="sliders-icon" />
          <h4>Endpoint &amp; Dispatch Parameters</h4>
        </div>

        <form onSubmit={handleSave} className="settings-form-block">
          <div className="form-group">
            <label htmlFor="api-endpoint-input">AWS API Gateway Endpoint (HTTPS POST)</label>
            <input
              id="api-endpoint-input"
              type="url"
              className="settings-text-input"
              value={customEndpoint}
              onChange={(e) => setCustomEndpoint(e.target.value)}
              required
            />
            <span className="form-helper-text">
              Direct connection to <code>cd4xfmh22k.execute-api.ap-south-1.amazonaws.com</code>.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="emergency-number-input">National Emergency Hotline Number</label>
            <input
              id="emergency-number-input"
              type="text"
              className="settings-text-input"
              value={customEmergency}
              onChange={(e) => setCustomEmergency(e.target.value)}
              required
            />
            <span className="form-helper-text">
              Standard Indian emergency services dispatcher: <code>112</code> (ERSS).
            </span>
          </div>

          <div className="form-actions-row">
            <button type="submit" className="save-settings-btn">
              <Save size={15} /> Save Changes
            </button>
            <button type="button" className="reset-settings-btn" onClick={handleReset}>
              <RotateCcw size={15} /> Reset to Defaults
            </button>
            {saved && (
              <span className="save-success-tag">
                <CheckCircle2 size={14} /> Settings Saved Successfully!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* 3. AWS Cloud Telemetry Card */}
      <div className="cloud-telemetry-card">
        <div className="telemetry-card-header">
          <Server size={18} className="server-icon" />
          <h4>Target Cloud Infrastructure Summary</h4>
        </div>

        <div className="telemetry-specs-grid">
          <div className="telemetry-spec-box">
            <span className="spec-lbl">Target AWS Region</span>
            <strong className="spec-val">ap-south-1 (Mumbai)</strong>
          </div>
          <div className="telemetry-spec-box">
            <span className="spec-lbl">API Gateway Protocol</span>
            <strong className="spec-val">HTTP API v2 ($default)</strong>
          </div>
          <div className="telemetry-spec-box">
            <span className="spec-lbl">Lambda Runtime</span>
            <strong className="spec-val">Python 3.11 (512 MB)</strong>
          </div>
          <div className="telemetry-spec-box">
            <span className="spec-lbl">Storage Engine</span>
            <strong className="spec-val">DynamoDB (PAY_PER_REQUEST)</strong>
          </div>
          <div className="telemetry-spec-box">
            <span className="spec-lbl">Emergency Topic</span>
            <strong className="spec-val">ClinicalEmergencyTriage</strong>
          </div>
          <div className="telemetry-spec-box">
            <span className="spec-lbl">Monthly Budget Ceiling</span>
            <strong className="spec-val">$0.01 Alert Threshold</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
