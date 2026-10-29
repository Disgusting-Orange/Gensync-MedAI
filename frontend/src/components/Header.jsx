import React from 'react';
import { ChevronDown, ShieldCheck, Activity } from 'lucide-react';

const VIEW_TITLES = {
  dashboard: 'Clinical Safety Overview & Telemetry',
  query: 'Interactive Clinical Query Console',
  safety: 'Deterministic Safety Monitor',
  cache: 'Two-Stage DynamoDB Cache Performance',
  logs: 'Evaluation History & Audit Logs',
  benchmark: 'Adversarial Benchmark Analysis',
  architecture: 'System Architecture & Security Invariants',
  settings: 'Console Settings & Parameters',
};

export default function Header({
  activeView,
  setActiveView,
  connectionStatus,
}) {
  const currentDateStr = 'Wed, 29 Oct 2026 IST';
  const currentTitle = VIEW_TITLES[activeView] || VIEW_TITLES.dashboard;

  return (
    <header className="dashboard-top-header" role="banner">
      {/* View Title */}
      <div className="header-title-block">
        <h1 className="header-active-view-title">{currentTitle}</h1>
      </div>

      {/* Center/Left Header Controls: Region & Backend Status */}
      <div className="header-left-group">
        {/* Region Pill Selector */}
        <div className="header-pill region-pill">
          <span className="status-dot green" />
          <span className="pill-text">AWS ap-south-1</span>
          <ChevronDown size={14} className="chevron-icon" />
        </div>

        {/* Backend Connectivity Status Pill */}
        <div className={`header-pill connection-pill ${connectionStatus}`}>
          <span
            className={`status-dot ${
              connectionStatus === 'online'
                ? 'green pulsing'
                : connectionStatus === 'checking'
                ? 'amber'
                : 'red'
            }`}
          />
          <span className="pill-text">
            {connectionStatus === 'online'
              ? 'Backend Live'
              : connectionStatus === 'checking'
              ? 'Connecting...'
              : 'Disconnected'}
          </span>
        </div>

        {/* Free Tier Compliance Badge */}
        <div className="header-pill free-tier-pill">
          <ShieldCheck size={13} className="text-emerald-400" />
          <span className="pill-text">Free Tier Invariant</span>
        </div>
      </div>

      {/* Right Header Controls: Timestamp & Researcher Avatar */}
      <div className="header-right-group">
        <span className="header-timestamp">{currentDateStr}</span>

        {/* Live Triage Status */}
        <div className="header-pill live-mode-pill">
          <Activity size={13} className="text-cyan-400" />
          <span className="pill-text">Zero-Vector-DB</span>
        </div>

        {/* Researcher User Profile Menu */}
        <div className="header-user-profile">
          <div className="user-avatar-circle" aria-hidden="true">
            <span>K</span>
          </div>
          <span className="user-role-label">Clinical Researcher</span>
          <ChevronDown size={14} className="chevron-icon" />
        </div>
      </div>
    </header>
  );
}
