import React from 'react';
import {
  LayoutGrid,
  Search,
  Shield,
  Layers,
  FileText,
  BarChart3,
  GitFork,
  Settings,
} from 'lucide-react';
import SidebarGraphic from './SidebarGraphic';

export const PRIMARY_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'query', label: 'Clinical Query', icon: Search },
  { id: 'safety', label: 'Safety Gate', icon: Shield },
  { id: 'cache', label: 'Cache Telemetry', icon: Layers },
  { id: 'logs', label: 'System Logs', icon: FileText },
];

export const SECONDARY_NAV_ITEMS = [
  { id: 'benchmark', label: 'Benchmark', icon: BarChart3 },
  { id: 'architecture', label: 'Architecture', icon: GitFork },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const NAV_ITEMS = [...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS];

export default function Sidebar({ activeView, setActiveView, connectionStatus }) {
  return (
    <aside className="dashboard-sidebar" aria-label="Main Navigation">
      {/* Brand Identity matching reference screenshot */}
      <div className="sidebar-brand">
        <div className="brand-logo-mark" aria-hidden="true">
          <div className="glowing-logo-circle">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <defs>
                <linearGradient id="brandStarGrad" x1="0" y1="0" x2="28" y2="28">
                  <stop offset="0%" stopColor="#00f0ff" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <circle cx="14" cy="14" r="12" stroke="url(#brandStarGrad)" strokeWidth="1.5" strokeOpacity="0.4" />
              <path
                d="M 14 2 C 14 8, 20 14, 26 14 C 20 14, 14 20, 14 26 C 14 20, 8 14, 2 14 Z"
                fill="url(#brandStarGrad)"
              />
            </svg>
          </div>
        </div>
        <div className="brand-meta">
          <span className="brand-name">GENSYNC-MEDAI</span>
          <span className="brand-sub">CLINICAL INTELLIGENCE</span>
        </div>
      </div>

      {/* Primary Navigation matching exact screenshot view */}
      <nav className="sidebar-nav">
        {PRIMARY_NAV_ITEMS.map((item) => {
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
              {isActive && <span className="active-indicator-bar" />}
              <Icon size={18} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}

        {/* Secondary utilities rendered compactly to maintain test assertions */}
        <div className="sidebar-nav-secondary">
          {SECONDARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-link-btn secondary-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setActiveView(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && <span className="active-indicator-bar" />}
                <Icon size={16} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Sidebar Footer with Wave Graphic */}
      <div className="sidebar-footer">
        <SidebarGraphic />
      </div>
    </aside>
  );
}
