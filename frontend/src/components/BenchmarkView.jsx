import React from 'react';
import { BarChart3, ShieldCheck, AlertCircle, Clock, Zap, CheckCircle2, TrendingUp } from 'lucide-react';
import benchmarkData from '../data/benchmark_results.json';

export default function BenchmarkView() {
  const b = benchmarkData;

  return (
    <div className="benchmark-view">
      {/* 1. Executive Summary Card */}
      <div className="benchmark-hero-card">
        <div className="hero-icon-wrap">
          <BarChart3 size={28} className="hero-icon cyan" />
        </div>
        <div className="hero-content">
          <h3>Adversarial Benchmark & Observability Verification</h3>
          <p>
            Rigorous 32-case stress test executed directly against the live AWS API Gateway in <code>ap-south-1</code>.
            Measures deterministic safety gate accuracy, false cache hit rates, cold start vs warm execution, and live DynamoDB latency.
          </p>
        </div>
        <div className="hero-badges">
          <span className="hero-pill green">Pass Rate: 96.9%</span>
          <span className="hero-pill red">0.0% False Hits</span>
        </div>
      </div>

      {/* 2. Top Metric Summary Cards */}
      <div className="benchmark-metrics-grid">
        <div className="bm-metric-card">
          <div className="bm-title">TOTAL TEST CASES</div>
          <div className="bm-value">{b.total_tests || 32}</div>
          <div className="bm-sub">5 Categorized Test Suites</div>
        </div>

        <div className="bm-metric-card">
          <div className="bm-title">OVERALL PASS RATE</div>
          <div className="bm-value cyan">{b.pass_rate_pct || 96.9}%</div>
          <div className="bm-sub">31 / 32 Validated Outcomes</div>
        </div>

        <div className="bm-metric-card">
          <div className="bm-title">CRITICAL SAFETY INVARIANT</div>
          <div className="bm-value green">0.0%</div>
          <div className="bm-sub">0 False Cache Hits (Target: 0)</div>
        </div>

        <div className="bm-metric-card">
          <div className="bm-title">TWO-STAGE DYNAMODB LOOKUP</div>
          <div className="bm-value purple">{b.latency_metrics_ms?.mean_cache_lookup_ms || 90.3} ms</div>
          <div className="bm-sub">Live Internal AWS Network</div>
        </div>
      </div>

      {/* 3. Category Breakdown Table */}
      <div className="benchmark-table-card">
        <h4>Category-Specific Benchmark Accuracy</h4>
        <div className="table-responsive">
          <table className="bm-category-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Scope & Objective</th>
                <th>Sample Count</th>
                <th>Target Route</th>
                <th>Observed Accuracy</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Critical Emergencies</strong></td>
                <td>Life-threatening conditions (chest pain, stroke, poisoning, anaphylaxis)</td>
                <td>8</td>
                <td><code>EMERGENCY</code></td>
                <td><strong className="text-green">100.0% (8/8)</strong></td>
                <td><span className="pill-pass">PASS</span></td>
              </tr>
              <tr>
                <td><strong>Professional Referrals</strong></td>
                <td>Pediatric dosing, pregnancy contraindications, chronic symptoms</td>
                <td>6</td>
                <td><code>PROFESSIONAL_REFERRAL</code></td>
                <td><strong className="text-green">100.0% (6/6)</strong></td>
                <td><span className="pill-pass">PASS</span></td>
              </tr>
              <tr>
                <td><strong>Approved Cache Hits</strong></td>
                <td>Verbatim & close paraphrases of 15 approved seed questions</td>
                <td>10</td>
                <td><code>SAFE_CACHE_CANDIDATE</code></td>
                <td><strong className="text-cyan">90.0% (9/10)</strong></td>
                <td><span className="pill-pass">PASS*</span></td>
              </tr>
              <tr>
                <td><strong>Adversarial Incompatibilities</strong></td>
                <td>Contradictory conditions (dialysis water intake, newborn fever)</td>
                <td>4</td>
                <td>Safe Miss / Referral</td>
                <td><strong className="text-green">100.0% (4/4)</strong></td>
                <td><span className="pill-pass">PASS</span></td>
              </tr>
              <tr>
                <td><strong>Controlled Cache Misses</strong></td>
                <td>Novel, rare, or unindexed clinical questions</td>
                <td>4</td>
                <td><code>CACHE_MISS</code></td>
                <td><strong className="text-green">100.0% (4/4)</strong></td>
                <td><span className="pill-pass">PASS</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Deep Dive Investigation Box on HIT-10 */}
      <div className="hit10-deepdive-card">
        <div className="deepdive-header">
          <AlertCircle size={20} className="icon amber" />
          <h5>Architectural Investigation: Test Case HIT-10 ("Insulin Sensitivity")</h5>
        </div>
        <div className="deepdive-body">
          <p>
            In the benchmark dataset, test <code>HIT-10</code> submitted: <em>"How does regular physical exercise benefit insulin sensitivity?"</em>
            The test author expected a cache hit against approved record <code>dia-002</code>.
            However, the live system routed this inquiry to <code>PROFESSIONAL_REFERRAL</code>.
          </p>
          <div className="callout-box">
            <strong>Why did this happen?</strong>
            <p>
              In <code>triage_rules.py</code>, the pattern <code>\b(insulin|...)\b</code> resides in <code>REFERRAL_PATTERNS["prescription_medications"]</code>.
              Because deterministic safety gates execute <strong>before</strong> embedding generation or vector lookup, the system detected the keyword <code>insulin</code> and conservatively refused to serve an automated cached answer, routing the user to a clinical consultation instead.
            </p>
          </div>
          <p className="conclusion">
            <strong>Scientific Takeaway:</strong> This is an intentional safety behavior prioritizing conservative patient safety over cache recall. The benchmark preserves this 31/32 score transparently.
          </p>
        </div>
      </div>

      {/* 5. Latency Distribution Breakdown */}
      <div className="latency-distribution-card">
        <h4>Latency Distribution & Cold-Start Analysis</h4>
        <div className="latency-grid">
          <div className="lat-box">
            <span className="lbl">CLIENT RTT (P50)</span>
            <span className="val">{b.latency_metrics_ms?.client_rtt_p50 || 718.6} ms</span>
            <span className="sub">Includes regional TLS edge routing</span>
          </div>
          <div className="lat-box">
            <span className="lbl">SERVER TOTAL (P50)</span>
            <span className="val">{b.latency_metrics_ms?.server_total_p50 || 211.4} ms</span>
            <span className="sub">Warm execution steady-state</span>
          </div>
          <div className="lat-box">
            <span className="lbl">INT8 ONNX EMBEDDING</span>
            <span className="val">{b.latency_metrics_ms?.mean_embedding_ms || 119.7} ms</span>
            <span className="sub">all-MiniLM-L6-v2 in Lambda memory</span>
          </div>
          <div className="lat-box">
            <span className="lbl">TWO-STAGE DYNAMODB</span>
            <span className="val">{b.latency_metrics_ms?.mean_cache_lookup_ms || 90.3} ms</span>
            <span className="sub">Centroids scan + GSI index query</span>
          </div>
        </div>
      </div>
    </div>
  );
}
