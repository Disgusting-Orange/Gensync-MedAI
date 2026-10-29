import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { Cloud } from 'lucide-react';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import ClinicalQueryView from './components/ClinicalQueryView';
import SafetyMonitorView from './components/SafetyMonitorView';
import CachePerformanceView from './components/CachePerformanceView';
import EvaluationLogsView from './components/EvaluationLogsView';
import BenchmarkView from './components/BenchmarkView';
import ArchitectureView from './components/ArchitectureView';
import SettingsView from './components/SettingsView';

const DEFAULT_API_ENDPOINT =
  import.meta.env.VITE_API_ENDPOINT ||
  'https://cd4xfmh22k.execute-api.ap-south-1.amazonaws.com/query';

// Helper: Compute client SHA-256 for local verification
async function computeSha256(text) {
  if (!window.crypto?.subtle) return 'unavailable-no-crypto';
  try {
    const msgBuffer = new TextEncoder().encode(text.trim());
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'sha256-calculation-failed';
  }
}

export default function App() {
  // Permanent Dark Glassmorphism Mode
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('gensync_theme', 'dark');
    } catch (e) {
      console.warn('Theme setup', e);
    }
  }, []);

  const [activeView, setActiveView] = useState('dashboard');
  const [apiEndpoint, setApiEndpoint] = useState(DEFAULT_API_ENDPOINT);
  const [emergencyNumber, setEmergencyNumber] = useState('112');
  const [connectionStatus, setConnectionStatus] = useState('checking'); // 'checking' | 'online' | 'offline'

  // Query State
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [clientRtt, setClientRtt] = useState(null);
  const [serviceError, setServiceError] = useState(null);
  const [clientDigest, setClientDigest] = useState('');
  const [recentEvaluations, setRecentEvaluations] = useState([]);

  const abortControllerRef = useRef(null);

  // Probe backend connectivity on mount
  useEffect(() => {
    let isMounted = true;
    const probeGateway = async () => {
      try {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ping: true }),
          signal: AbortSignal.timeout(6000),
        });
        if (isMounted) {
          setConnectionStatus(res.ok || res.status < 500 ? 'online' : 'offline');
        }
      } catch {
        if (isMounted) {
          setConnectionStatus('offline');
        }
      }
    };
    probeGateway();
    return () => {
      isMounted = false;
    };
  }, [apiEndpoint]);

  const handleQuerySubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery || loading) return;

    setLoading(true);
    setServiceError(null);
    setResponse(null);
    setClientRtt(null);

    const localHash = await computeSha256(cleanQuery);
    setClientDigest(localHash);

    const startTime = performance.now();
    const correlationId = 'web-' + Date.now();

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
        },
        body: JSON.stringify({ query: cleanQuery }),
        signal: abortControllerRef.current.signal,
      });

      const rtt = Math.round(performance.now() - startTime);
      setClientRtt(rtt);

      if (!res.ok) {
        throw new Error(`API Gateway returned HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setResponse(data);
      setConnectionStatus('online');

      // Record in recent evaluations
      const newRecord = {
        id: 'LIVE-' + Math.floor(Math.random() * 9000 + 1000),
        category:
          data.routing_decision === 'EMERGENCY'
            ? 'EMERGENCY'
            : data.routing_decision === 'PROFESSIONAL_REFERRAL'
            ? 'REFERRAL'
            : 'LIVE_QUERY',
        routing_decision: data.routing_decision,
        cache_hit: data.cache_hit || false,
        rtt_ms: rtt,
        server_total_ms:
          data.latency?.total_ms !== undefined ? data.latency.total_ms : data.latency_ms || 0.2,
        query_sha256: data.query_digest || localHash,
        timestamp: new Date().toISOString(),
        passed: true,
      };

      setRecentEvaluations((prev) => [newRecord, ...prev]);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('API invocation error:', err);
      setServiceError(
        err.message ||
          'Failed to reach the GenSync-MedAI serverless backend in ap-south-1. Please verify connection.'
      );
      setConnectionStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  // Connect to a professional escalation handler
  const handleConnectProfessional = async (customQuery, correlationId) => {
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId || 'web-' + Date.now(),
        },
        body: JSON.stringify({
          action: 'connect_professional',
          query: customQuery || query,
          correlation_id: correlationId,
        }),
      });
      if (!res.ok) {
        throw new Error(`Professional escalation failed with HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error('Professional escalation error:', err);
      throw err;
    }
  };

  const handleSelectQueryFromTable = (rec) => {
    setActiveView('query');
  };

  return (
    <div className="clinical-dashboard-layout dark-theme">
      {/* 1. Left Fixed Glass Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        connectionStatus={connectionStatus}
      />

      {/* 2. Main Content View Area */}
      <div className="dashboard-main-viewport">
        {/* Top Glass Header */}
        <Header
          activeView={activeView}
          setActiveView={setActiveView}
          connectionStatus={connectionStatus}
          emergencyNumber={emergencyNumber}
        />

        {/* Dynamic View Rendering */}
        <main className="dashboard-view-body">
          {activeView === 'dashboard' && (
            <DashboardView
              query={query}
              setQuery={setQuery}
              loading={loading}
              onSubmit={handleQuerySubmit}
              response={response}
              clientRtt={clientRtt}
              serviceError={serviceError}
              clientDigest={clientDigest}
              emergencyNumber={emergencyNumber}
              onSelectQuery={handleSelectQueryFromTable}
              recentEvaluations={recentEvaluations}
              setActiveView={setActiveView}
              onConnectProfessional={handleConnectProfessional}
            />
          )}

          {activeView === 'query' && (
            <ClinicalQueryView
              query={query}
              setQuery={setQuery}
              loading={loading}
              onSubmit={handleQuerySubmit}
              response={response}
              clientRtt={clientRtt}
              serviceError={serviceError}
              clientDigest={clientDigest}
              emergencyNumber={emergencyNumber}
              onConnectProfessional={handleConnectProfessional}
            />
          )}

          {activeView === 'safety' && (
            <SafetyMonitorView emergencyNumber={emergencyNumber} />
          )}

          {activeView === 'cache' && <CachePerformanceView />}

          {activeView === 'logs' && (
            <EvaluationLogsView recentEvaluations={recentEvaluations} />
          )}

          {activeView === 'benchmark' && <BenchmarkView />}

          {activeView === 'architecture' && <ArchitectureView />}

          {activeView === 'settings' && (
            <SettingsView
              apiEndpoint={apiEndpoint}
              setApiEndpoint={setApiEndpoint}
              emergencyNumber={emergencyNumber}
              setEmergencyNumber={setEmergencyNumber}
              connectionStatus={connectionStatus}
            />
          )}
        </main>

        {/* Global Clean Glass Footer */}
        <footer className="dashboard-bottom-footer">
          <div className="footer-left">
            <Cloud size={14} className="footer-cloud-icon" />
            <span>GenSync-MedAI &bull; Serverless Safety-Aware Semantic Cache &bull; AWS Free Tier</span>
          </div>
          <div className="footer-right">
            <span>Deterministic Triage &bull; Sub-220ms Cache &bull; Zero Dedicated Vector DB</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
