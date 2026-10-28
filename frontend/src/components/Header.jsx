import React from 'react';
import { ShieldCheck, PhoneCall, Activity, Server, Zap } from 'lucide-react';

const VIEW_TITLES = {
  dashboard: {
    title: 'Clinical Safety Overview & Telemetry',
    subtitle: 'Real-time telemetry, routing outcome distributions, and empirical performance trends.',
  },
  query: {
    title: 'Interactive Clinical Query Console',
    subtitle: 'Safety-aware evaluation across emergency, referral, and two-stage cached knowledge.',
  },
  safety: {
    title: 'Deterministic Safety Monitor',
    subtitle: 'Pre-retrieval emergency rules, clinical contraindication gates, and SNS escalation.',
  },
  cache: {
    title: 'Two-Stage DynamoDB Cache Performance',
    subtitle: 'Centroid screening, GSI candidate retrieval, and cosine similarity distributions.',
  },
  logs: {
    title: 'Evaluation History & Audit Logs',
    subtitle: 'Cryptographic SHA-256 query digests, routing decisions, and zero-PHI verification.',
  },
  benchmark: {
    title: 'Adversarial Benchmark Analysis',
    subtitle: '32-case stress test metrics, cold-start latency distributions, and safety verification.',
  },
  architecture: {
    title: 'System Architecture & Security Invariants',
    subtitle: 'Serverless topology, DynamoDB table models, and cost containment guardrails.',
  },
  settings: {
    title: 'Console Settings & Parameters',
    subtitle: 'API Gateway endpoint routing, cosine threshold calibration, and region controls.',
  },
};

export default function Header({ activeView, setActiveView, connectionStatus, emergencyNumber = '112' }) {
  const current = VIEW_TITLES[activeView] || VIEW_TITLES.dashboard;

  return (
    <header className="dashboard-top-header">
      <div className="header-title-block">
        <h2>{current.title}</h2>
        <p>{current.subtitle}</p>
      </div>

      <div className="header-actions-block">
        {/* Emergency Hotline Action Pill */}
        <a
          href={`tel:${emergencyNumber}`}
          className="emergency-header-action"
          title="Indian National Emergency Services"
        >
          <PhoneCall size={14} />
          <span>EMERGENCY: {emergencyNumber}</span>
        </a>

        {/* Live Status Badge */}
        <div className={`connection-badge ${connectionStatus}`}>
          <span className="dot" />
          <span>{connectionStatus === 'online' ? 'ap-south-1 Live' : connectionStatus === 'checking' ? 'Connecting...' : 'Disconnected'}</span>
        </div>

        {/* Jump to Query Button */}
        {activeView !== 'query' && (
          <button
            type="button"
            className="action-eval-btn"
            onClick={() => setActiveView('query')}
          >
            <Zap size={14} />
            <span>Test Query</span>
          </button>
        )}
      </div>
    </header>
  );
}
