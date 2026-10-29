import React from 'react';
import { ChevronDown, Sun, Moon } from 'lucide-react';

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
  theme = 'light',
  onToggleTheme,
}) {
  const currentDateStr = 'Wed, 29 Oct 2026 01:24 IST';
  const currentTitle = VIEW_TITLES[activeView] || VIEW_TITLES.dashboard;

  return (
    <header className="dashboard-top-header" role="banner">
      {/* View Title */}
      <h1 className="header-active-view-title">{currentTitle}</h1>

      {/* Left Header Controls: Region & Backend Status */}
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
              ? 'Backend Connected'
              : connectionStatus === 'checking'
              ? 'Connecting...'
              : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Right Header Controls: Timestamp, Theme Toggle, Researcher Avatar */}
      <div className="header-right-group">
        <span className="header-timestamp">{currentDateStr}</span>

        {/* Theme Toggle Button (Light / Dark Mode) */}
        <button
          type="button"
          className="header-icon-btn theme-toggle-btn"
          title={theme === 'dark' ? 'Switch to Light Clinical Theme' : 'Switch to Dark Obsidian Theme'}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <Sun size={17} className="theme-icon sun" /> : <Moon size={17} className="theme-icon moon" />}
        </button>

        {/* Researcher User Profile Menu */}
        <div className="header-user-profile">
          <div className="user-avatar-circle" aria-hidden="true">
            <span>K</span>
          </div>
          <span className="user-role-label">Researcher</span>
          <ChevronDown size={14} className="chevron-icon" />
        </div>
      </div>
    </header>
  );
}
