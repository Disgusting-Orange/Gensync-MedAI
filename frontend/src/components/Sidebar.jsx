import React from 'react';
import {
  LayoutDashboard,
  MessageSquarePlus,
  ShieldAlert,
  Zap,
  FileText,
  BarChart3,
  Cpu,
  Settings,
  ShieldCheck,
  Radio,
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'query', label: 'Clinical Query', icon: MessageSquarePlus },
  { id: 'safety', label: 'Safety Monitor', icon: ShieldAlert },
  { id: 'cache', label: 'Cache Performance', icon: Zap },
  { id: 'logs', label: 'Evaluation & Logs', icon: FileText },
  { id: 'benchmark', label: 'Benchmark Results', icon: BarChart3 },
  { id: 'architecture', label: 'Architecture', icon: Cpu },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activeView, setActiveView, connectionStatus }) {
  return (
    <aside className="dashboard-sidebar" aria-label="Main Navigation">
      {/* Brand Identity */}
      <div className="sidebar-brand">
        <div className="brand-logo-hex" aria-hidden="true">
          <ShieldCheck className="brand-icon" size={20} />
        </div>
        <div className="brand-meta">
          <span className="brand-name">GENSYNC-MEDAI</span>
          <span className="brand-sub">Clinical Safety Console</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <div className="nav-group-label">OPERATIONS & TELEMETRY</div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-link-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveView(item.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={17} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
              {isActive && <span className="active-indicator" />}
            </button>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="sidebar-footer">
        <div className="backend-status-pill">
          <span className={`status-pulse ${connectionStatus}`} />
          <div className="status-text-block">
            <span className="status-label">AWS AP-SOUTH-1</span>
            <span className="status-state">
              {connectionStatus === 'online' && 'System Active'}
              {connectionStatus === 'checking' && 'Connecting...'}
              {connectionStatus === 'offline' && 'Offline / Error'}
            </span>
          </div>
          <Radio size={14} className="radio-icon" />
        </div>
        <div className="footer-disclaimer">
          Research Prototype · Not a Diagnostic Device
        </div>
      </div>
    </aside>
  );
}
