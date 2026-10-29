import React, { useState } from 'react';
import {
  Cpu,
  Server,
  Database,
  ShieldCheck,
  Lock,
  DollarSign,
  Radio,
  ArrowRight,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Activity,
  ChevronRight,
} from 'lucide-react';

const ARCH_NODES = [
  {
    id: 'ingress',
    step: 1,
    title: 'Client & API Gateway',
    service: 'Amazon API Gateway HTTP API (v2)',
    latency: '~15 ms',
    color: 'blue',
    desc: 'HTTPS POST /query ingress with automated CORS handling, correlation ID injection, and input bounds validation (max 500 chars).',
    specs: ['Protocol: HTTP API v2', 'Payload: Format 2.0', 'CORS: * Origin (Configured)', 'Auth: Anonymous Clinical Triage'],
  },
  {
    id: 'safety_gate',
    step: 2,
    title: 'Deterministic Safety Gate',
    service: 'Pre-Retrieval Circuit Breaker',
    latency: '0.06 ms',
    color: 'red',
    desc: 'Pure Python deterministic regex engine executing in RAM BEFORE any embedding generation or database access. Catches acute emergencies.',
    specs: ['8 Emergency Regex Rules', '7 Clinical Referral Rules', 'Zero Model Hallucination', 'Bypasses Vector Storage (0 ms)'],
  },
  {
    id: 'sns_alert',
    step: '2B',
    title: 'Asynchronous Escalation',
    service: 'Amazon Simple Notification Service (SNS)',
    latency: 'Non-blocking',
    color: 'amber',
    desc: 'Dispatches operational emergency triage alerts to on-duty clinicians. Fault-tolerant: failure never impedes user advice.',
    specs: ['Topic: ClinicalEmergencyTriage', 'Protocol: Email / SMS', 'Zero Raw PHI: SHA-256 Digest only', 'Non-blocking Execution'],
  },
  {
    id: 'embedder',
    step: 3,
    title: 'INT8 ONNX Embedder',
    service: 'AWS Lambda (Python 3.11 MicroVM)',
    latency: '~35 ms (warm)',
    color: 'purple',
    desc: 'Sentence transformer all-MiniLM-L6-v2 quantized to INT8 running natively on CPU inside 512 MB Lambda memory via onnxruntime layer.',
    specs: ['Dimensions: 384-d Unit Vector', 'Artifact Size: 22 MB ONNX', 'Layer: 38.5 MB Linux x86_64', 'CPU AVX-512 Quantization'],
  },
  {
    id: 'storage',
    step: 4,
    title: 'Two-Stage DynamoDB Retrieval',
    service: 'Amazon DynamoDB (On-Demand)',
    latency: '90.3 ms',
    color: 'cyan',
    desc: 'Stage 1 screens centroids table to find target cluster; Stage 2 queries candidate partition via cluster_id-index GSI.',
    specs: ['Stage 1: gensync_cluster_centroids', 'Stage 2: GSI cluster_id-index', 'Billing: PAY_PER_REQUEST', 'Idle Cost: $0.00 / month'],
  },
  {
    id: 'provenance',
    step: 5,
    title: 'Clinical Provenance & Audit',
    service: 'DynamoDB Triage Audit & Review Queue',
    latency: '< 1 ms',
    color: 'green',
    desc: 'Enforces cosine threshold >= 0.92 and human review metadata. Unreviewed queries safely refuse and route to offline clinician review queue.',
    specs: ['Threshold: Cosine >= 0.92', 'Audit Table: SHA-256 with TTL', 'Review Queue: gensync_slm_review_queue', 'Status: HUMAN_APPROVED only'],
  },
];

export default function ArchitectureView() {
  const [selectedNode, setSelectedNode] = useState(ARCH_NODES[0]);

  return (
    <div className="architecture-view-container">
      {/* 1. Header Hero Card */}
      <div className="arch-hero-card">
        <div className="arch-hero-content">
          <div className="arch-title-group">
            <div className="arch-icon-circle">
              <Cpu size={24} className="arch-primary-icon" />
            </div>
            <div>
              <h3>Serverless Cloud Architecture & Security Invariants</h3>
              <p>
                Tier-1 serverless clinical question answering stack deployed on AWS in region <code>ap-south-1</code> (Mumbai).
                Engineered strictly within AWS Always Free Tier limits ($0.00 actual spend).
              </p>
            </div>
          </div>
          <div className="arch-badges-row">
            <span className="arch-pill blue">
              <span className="dot" /> AWS ap-south-1
            </span>
            <span className="arch-pill green">
              <CheckCircle2 size={13} /> Zero Raw PHI
            </span>
            <span className="arch-pill purple">
              <Zap size={13} /> $0.00 Idle Cost
            </span>
          </div>
        </div>
      </div>

      {/* 2. Visual Interactive Request Pipeline Diagram */}
      <div className="arch-diagram-card">
        <div className="diagram-header">
          <div className="diagram-title-block">
            <Activity size={18} className="diagram-icon" />
            <h4>End-to-End Request Pipeline (Click any stage to inspect)</h4>
          </div>
          <span className="diagram-hint">Interactive Architecture Topology</span>
        </div>

        {/* Visual Pipeline Nodes Flow */}
        <div className="pipeline-flow-wrapper">
          <div className="pipeline-flow-track">
            {ARCH_NODES.map((node) => {
              const isSelected = selectedNode.id === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  className={`pipeline-node-card theme-${node.color} ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedNode(node)}
                >
                  <div className="node-top-bar">
                    <span className="node-step-tag">STAGE {node.step}</span>
                    <span className="node-latency-tag">{node.latency}</span>
                  </div>
                  <h5 className="node-title">{node.title}</h5>
                  <span className="node-service">{node.service}</span>
                  <div className="node-click-hint">
                    <span>Inspect</span>
                    <ChevronRight size={12} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stage Deep-Dive Inspector Panel */}
        <div className={`stage-inspector-panel theme-${selectedNode.color}`}>
          <div className="inspector-header">
            <div className="inspector-title-row">
              <span className="inspector-step-badge">STAGE {selectedNode.step} SPECIFICATION</span>
              <h5>{selectedNode.title} &bull; {selectedNode.service}</h5>
            </div>
            <span className="inspector-latency-pill">Latency: {selectedNode.latency}</span>
          </div>
          <p className="inspector-desc">{selectedNode.desc}</p>
          <div className="inspector-specs-grid">
            {selectedNode.specs.map((spec, i) => (
              <div key={i} className="spec-item">
                <CheckCircle2 size={14} className="spec-check-icon" />
                <span>{spec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Invariants & Security Guardrails Grid */}
      <div className="arch-invariants-grid">
        {/* Invariant 1 */}
        <div className="arch-invariant-card">
          <div className="inv-card-header">
            <div className="inv-icon-circle green">
              <Lock size={18} />
            </div>
            <div>
              <h5>Privacy Invariant (Zero Raw PHI)</h5>
              <span className="inv-rule-sub">Cryptographic SHA-256 Digest Isolation</span>
            </div>
          </div>
          <p className="inv-card-body">
            No patient inquiry text is ever persisted to DynamoDB audit tables, CloudWatch log streams, or SNS triage messages.
            Every inquiry is irreversibly hashed using standard SHA-256 (<code>query_sha256</code>) alongside request correlation IDs.
          </p>
        </div>

        {/* Invariant 2 */}
        <div className="arch-invariant-card">
          <div className="inv-card-header">
            <div className="inv-icon-circle red">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h5>Safety Precedence Invariant</h5>
              <span className="inv-rule-sub">Deterministic Rules Before Vector Retrieval</span>
            </div>
          </div>
          <p className="inv-card-body">
            Emergency and professional referral rules execute <strong>strictly before</strong> neural embedding generation or vector retrieval.
            No machine learning model is ever permitted to decide whether a clinical situation is life-threatening.
          </p>
        </div>

        {/* Invariant 3 */}
        <div className="arch-invariant-card">
          <div className="inv-card-header">
            <div className="inv-icon-circle cyan">
              <Database size={18} />
            </div>
            <div>
              <h5>Human Clinical Provenance</h5>
              <span className="inv-rule-sub">Zero-Hallucination Safe Refusal</span>
            </div>
          </div>
          <p className="inv-card-body">
            Only records with <code>review_status == 'HUMAN_APPROVED'</code> and verified medical citations (ADA, WHO, CDC, ICMR) are served.
            Inquiries scoring below cosine threshold 0.92 safely fail closed with clinical referral.
          </p>
        </div>

        {/* Invariant 4 */}
        <div className="arch-invariant-card">
          <div className="inv-card-header">
            <div className="inv-icon-circle purple">
              <DollarSign size={18} />
            </div>
            <div>
              <h5>Zero-Risk Financial Governance</h5>
              <span className="inv-rule-sub">$0.01 AWS Budget Alert Kill-Switch</span>
            </div>
          </div>
          <p className="inv-card-body">
            All AWS infrastructure operates on pure serverless pay-per-request pricing ($0.00 idle cost).
            Protected by an automated AWS Budget alarm triggering at $0.01 threshold with immediate email escalation.
          </p>
        </div>
      </div>
    </div>
  );
}
