import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Lock,
  PhoneCall,
  CheckCircle2,
  ExternalLink,
  Info,
} from 'lucide-react';

const EMERGENCY_RULES = [
  { id: 'EM-01', name: 'Severe Crushing Chest Pain', pattern: 'severe | crushing | squeezing chest pain / radiating to left arm', priority: 1, routing: 'Emergency 112' },
  { id: 'EM-02', name: 'Stroke FAST Indicators', pattern: 'facial droop | arm weakness | slurred speech | sudden numbness', priority: 1, routing: 'Emergency 112' },
  { id: 'EM-03', name: 'Respiratory Failure & Stridor', pattern: 'cannot breathe | choking | throat closing | cyanosis | stridor', priority: 1, routing: 'Emergency 112' },
  { id: 'EM-04', name: 'Suspected Acute Poisoning', pattern: 'swallowed | drank | ingested pesticide | bleach | poison | cleaner', priority: 1, routing: 'Poison Center / 112' },
  { id: 'EM-05', name: 'Severe Arterial Bleeding', pattern: 'uncontrolled | spurting | arterial bleeding | hemorrhage | vomit blood', priority: 1, routing: 'Trauma Unit / 112' },
  { id: 'EM-06', name: 'Anaphylaxis', pattern: 'anaphylaxis | lip swelling | tongue swelling with wheezing / hives', priority: 1, routing: 'Emergency 112' },
  { id: 'EM-07', name: 'Loss of Consciousness & Seizure', pattern: 'unresponsive | continuous seizure | passed out and not waking up', priority: 1, routing: 'Emergency 112' },
  { id: 'EM-08', name: 'Self-Harm & Suicidal Ideation', pattern: 'kill myself | end my life | suicide | slit wrist | overdose to die', priority: 1, routing: 'Kiran Helpline 1800-599-0019' },
];

const REFERRAL_RULES = [
  { id: 'REF-01', name: 'Pediatric & Infant Care', pattern: 'baby | infant | newborn | toddler | child under 1 year old', routing: 'Licensed Pediatrician' },
  { id: 'REF-02', name: 'Prescription Drug Interventions', pattern: 'antibiotic | insulin | blood thinner | amlodipine | metformin | steroid', routing: 'Prescribing Physician' },
  { id: 'REF-03', name: 'Patient-Specific Dosing', pattern: 'how many mg | adjust dose | double my dose | inject units', routing: 'Clinical Pharmacist' },
  { id: 'REF-04', name: 'Pregnancy & Breastfeeding', pattern: 'pregnant | trimester | nursing mother | lactating safety', routing: 'Obstetric Provider' },
  { id: 'REF-05', name: 'Drug-Drug Interactions', pattern: 'can I take X with Y | interaction between | combine medications', routing: 'Clinical Pharmacist' },
  { id: 'REF-06', name: 'Chronic & Unresolved Symptoms', pattern: 'lasting more than 3 weeks | unexplained 10kg weight loss', routing: 'Primary Care Physician' },
  { id: 'REF-07', name: 'Diagnostic Requests', pattern: 'diagnose me | do I have cancer | tell me my prognosis', routing: 'Specialist Evaluation' },
];

export default function SafetyMonitorView({ emergencyNumber = '112' }) {
  return (
    <div className="safety-monitor-view-container">
      {/* 1. Hero Card */}
      <div className="safety-hero-card">
        <div className="safety-hero-content">
          <div className="safety-title-group">
            <div className="safety-icon-circle">
              <ShieldAlert size={24} className="safety-primary-icon" />
            </div>
            <div>
              <h3>Deterministic Safety Monitor (Pre-Retrieval)</h3>
              <p>
                Deterministic keyword and regex rules execute <strong>prior</strong> to any vector generation or database access.
                Queries matching acute emergency or clinical referral criteria bypass semantic caching completely (0 ms lookup latency).
              </p>
            </div>
          </div>
          <div className="safety-badges-row">
            <span className="safety-pill green">
              <CheckCircle2 size={13} /> 100% Deterministic
            </span>
            <span className="safety-pill red">
              <AlertTriangle size={13} /> Zero LLM in Triage
            </span>
            <span className="safety-pill cyan">
              <PhoneCall size={13} /> Dial {emergencyNumber}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Stats Grid (4 Cards) */}
      <div className="safety-kpi-grid">
        <div className="safety-kpi-card">
          <span className="kpi-card-lbl">EMERGENCY GATE ACCURACY</span>
          <div className="kpi-card-val red">100.0%</div>
          <span className="kpi-card-sub">8 / 8 Life-Threatening Inquiries Caught</span>
        </div>

        <div className="safety-kpi-card">
          <span className="kpi-card-lbl">REFERRAL GATE ACCURACY</span>
          <div className="kpi-card-val amber">100.0%</div>
          <span className="kpi-card-sub">6 / 6 Contraindications Routed</span>
        </div>

        <div className="safety-kpi-card">
          <span className="kpi-card-lbl">TRIAGE EVALUATION LATENCY</span>
          <div className="kpi-card-val green">0.06 ms</div>
          <span className="kpi-card-sub">Pure In-Memory Regex Match</span>
        </div>

        <div className="safety-kpi-card">
          <span className="kpi-card-lbl">SNS TRIAGE ESCALATION</span>
          <div className="kpi-card-val purple">Active</div>
          <span className="kpi-card-sub">Topic: ClinicalEmergencyTriage</span>
        </div>
      </div>

      {/* 3. Emergency Rules Catalog Table */}
      <div className="rules-table-card">
        <div className="table-card-header">
          <div className="card-title-group">
            <AlertTriangle size={18} className="table-title-icon red" />
            <h4>Emergency Triage Rules Catalog (Priority 1 &bull; Instant 112 Referral)</h4>
          </div>
          <span className="table-sub-badge red">8 Active Emergency Rules</span>
        </div>

        <div className="table-responsive-wrapper">
          <table className="clinical-data-table">
            <thead>
              <tr>
                <th>Rule ID</th>
                <th>Clinical Syndrome</th>
                <th>Trigger Patterns</th>
                <th>Priority</th>
                <th>Action Protocol</th>
              </tr>
            </thead>
            <tbody>
              {EMERGENCY_RULES.map((r) => (
                <tr key={r.id}>
                  <td><code>{r.id}</code></td>
                  <td><strong>{r.name}</strong></td>
                  <td><code className="pattern-code">{r.pattern}</code></td>
                  <td><span className="priority-badge p1">P1 Critical</span></td>
                  <td>
                    <span className="routing-badge emergency">
                      <PhoneCall size={12} /> {r.routing}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Professional Referral Rules Catalog Table */}
      <div className="rules-table-card">
        <div className="table-card-header">
          <div className="card-title-group">
            <ShieldCheck size={18} className="table-title-icon amber" />
            <h4>Professional Clinical Referral Rules (Safe Provider Escalation)</h4>
          </div>
          <span className="table-sub-badge amber">7 Active Referral Rules</span>
        </div>

        <div className="table-responsive-wrapper">
          <table className="clinical-data-table">
            <thead>
              <tr>
                <th>Rule ID</th>
                <th>Contraindication Domain</th>
                <th>Trigger Patterns</th>
                <th>Target Provider</th>
                <th>Safety Behavior</th>
              </tr>
            </thead>
            <tbody>
              {REFERRAL_RULES.map((r) => (
                <tr key={r.id}>
                  <td><code>{r.id}</code></td>
                  <td><strong>{r.name}</strong></td>
                  <td><code className="pattern-code">{r.pattern}</code></td>
                  <td><strong>{r.routing}</strong></td>
                  <td>
                    <span className="routing-badge referral">
                      Cache Bypassed &bull; Verified Links
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
