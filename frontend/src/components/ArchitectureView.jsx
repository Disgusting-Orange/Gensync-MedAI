import React from 'react';
import { Cpu, Server, Database, ShieldCheck, Lock, DollarSign, Cloud, Radio } from 'lucide-react';

export default function ArchitectureView() {
  return (
    <div className="architecture-view">
      {/* 1. Header Banner */}
      <div className="arch-hero-card">
        <div className="hero-icon-wrap">
          <Cpu size={28} className="hero-icon cyan" />
        </div>
        <div className="hero-content">
          <h3>Serverless Cloud Architecture & Security Invariants</h3>
          <p>
            Tier-1 serverless clinical question answering stack deployed on AWS in region <code>ap-south-1</code> (Mumbai).
            Engineered strictly within AWS Always Free Tier limits with active cost kill-switches.
          </p>
        </div>
        <div className="hero-badges">
          <span className="hero-pill cyan">AWS ap-south-1</span>
          <span className="hero-pill green">Zero Raw PHI</span>
        </div>
      </div>

      {/* 2. Interactive Architecture Flow Diagram */}
      <div className="arch-flow-card">
        <h4>End-to-End Request Pipeline</h4>
        <div className="flow-steps-grid">
          <div className="flow-box">
            <div className="box-num">1</div>
            <h6>Ingress Gateway</h6>
            <p>Amazon API Gateway HTTP API with CORS (<code>POST /query</code>). Validates payload and extracts correlation ID.</p>
          </div>

          <div className="flow-arrow">→</div>

          <div className="flow-box">
            <div className="box-num">2</div>
            <h6>Safety Gate (Pre-Retrieval)</h6>
            <p>Deterministic regex engine evaluates 8 emergency & 7 referral patterns. If matched, triggers SNS alert & bypasses cache.</p>
          </div>

          <div className="flow-arrow">→</div>

          <div className="flow-box">
            <div className="box-num">3</div>
            <h6>INT8 ONNX Embedder</h6>
            <p>Generates 384-dimensional unit vector in Lambda using quantized <code>all-MiniLM-L6-v2</code> (no PyTorch, under 25MB).</p>
          </div>

          <div className="flow-arrow">→</div>

          <div className="flow-box">
            <div className="box-num">4</div>
            <h6>Two-Stage DynamoDB</h6>
            <p>Stage 1 screens centroids table; Stage 2 queries candidate partition via GSI <code>cluster_id-index</code>.</p>
          </div>

          <div className="flow-arrow">→</div>

          <div className="flow-box">
            <div className="box-num">5</div>
            <h6>Clinical Gate & Audit</h6>
            <p>Cosine similarity ($\ge 0.92$) & negation checks. Persists SHA-256 query digest to audit log.</p>
          </div>
        </div>
      </div>

      {/* 3. Invariants & Guardrails Grid */}
      <div className="invariants-grid">
        <div className="invariant-card">
          <div className="inv-header">
            <Lock size={18} className="inv-icon green" />
            <h5>Privacy Invariant (Zero Raw PHI)</h5>
          </div>
          <p>
            No patient inquiry text is ever stored in DynamoDB tables, CloudWatch log streams, or SNS triage messages.
            Every inquiry is irreversibly hashed using SHA-256 (<code>query_sha256</code>) prior to persisting audit records.
          </p>
        </div>

        <div className="invariant-card">
          <div className="inv-header">
            <ShieldCheck size={18} className="inv-icon red" />
            <h5>Safety Precedence Invariant</h5>
          </div>
          <p>
            Emergency and referral rules execute <strong>before</strong> embedding generation or vector lookup.
            No language model is ever permitted to decide whether a clinical query is life-threatening.
          </p>
        </div>

        <div className="invariant-card">
          <div className="inv-header">
            <Database size={18} className="inv-icon cyan" />
            <h5>Human Provenance Hierarchy</h5>
          </div>
          <p>
            Only entries with <code>review_status == 'approved'</code> and verified institutional citations (Mayo Clinic, CDC, WHO) are served.
            Unverified SLM synthesis is disabled to prevent clinical hallucinations.
          </p>
        </div>

        <div className="invariant-card">
          <div className="inv-header">
            <DollarSign size={18} className="inv-icon amber" />
            <h5>Cost Containment & Kill-Switch</h5>
          </div>
          <p>
            Protected by an active AWS Budget alert ($0.01 threshold).
            Emergency traffic halt commands and automated teardown scripts (<code>destroy.ps1</code> / <code>destroy.sh</code>) purge all provisioned cloud resources cleanly.
          </p>
        </div>
      </div>
    </div>
  );
}
