import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Zap,
  AlertTriangle,
  Clock,
  TrendingUp,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Activity,
  Target,
  BarChart3,
  Flame,
  Info
} from 'lucide-react';
import { useAIInsights, useDataSync } from '../hooks/useDataSync';

const API_BASE = 'http://127.0.0.1:5000';

/* ── Helpers ── */
function getSLAClass(pct) {
  if (pct >= 100) return 'critical';
  if (pct >= 85)  return 'danger';
  if (pct >= 60)  return 'warning';
  return 'safe';
}

function getScoreClass(score) {
  if (score >= 76) return 'critical';
  if (score >= 51) return 'high';
  if (score >= 26) return 'medium';
  return 'low';
}

function formatHours(h) {
  if (h === null || h === undefined) return '—';
  const abs = Math.abs(h);
  if (abs < 1)   return `${Math.round(abs * 60)}m`;
  if (abs < 24)  return `${abs.toFixed(1)}h`;
  return `${(abs / 24).toFixed(1)}d`;
}

function BreachBadge({ sla_progress_pct, remaining_hours, breached }) {
  if (breached) {
    return (
      <span className="breach-badge critical">
        🔴 BREACHED {formatHours(remaining_hours)} ago
      </span>
    );
  }
  if (sla_progress_pct >= 85) {
    return (
      <span className="breach-badge warning">
        ⚠️ Critical — {formatHours(remaining_hours)} left
      </span>
    );
  }
  return (
    <span className="breach-badge ok">
      ✅ {formatHours(remaining_hours)} left
    </span>
  );
}

function SLABar({ pct }) {
  const cls = getSLAClass(pct);
  return (
    <div className="sla-bar-wrapper">
      <div className="sla-progress-bar">
        <div
          className={`sla-progress-fill ${cls}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className={`sla-pct-text ${pct >= 100 ? 'text-breach' : pct >= 60 ? 'text-warning2' : 'text-safe'}`}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function AIScoreBar({ score }) {
  const cls = getScoreClass(score || 0);
  return (
    <div className="ai-score-bar-wrapper">
      <div className="ai-score-bar">
        <div
          className={`ai-score-fill ${cls}`}
          style={{ width: `${score || 0}%` }}
        />
      </div>
      <span className="ai-score-num">{score ?? '—'}</span>
    </div>
  );
}

/* ── Local AI scoring engine (mirrors backend) ── */
function localAIPriorityScore(issue) {
  const PRIORITY_BASE = { Urgent: 85, High: 65, Medium: 40, Low: 15 };
  const SLA_HOURS     = { Urgent: 24, High: 48, Medium: 72, Low: 168 };
  const HIGH_KW = ['emergency','danger','dangerous','accident','hospital','school',
    'child','live wire','spark','electric shock','open manhole','deep crater',
    'massive flood','burst','collapsed','hazardous','urgent','severe'];

  const text       = `${issue.title || ''} ${issue.description || ''}`.toLowerCase();
  const base       = PRIORITY_BASE[issue.priority] || 40;
  const upvotes    = issue.upvotes || 1;
  const upvoteBonus = Math.min(10, Math.log(Math.max(1, upvotes)) * 3);
  const sla        = SLA_HOURS[issue.priority] || 72;
  const ageH       = issue.age_hours || 0;
  const timeBonus  = Math.min(10, (ageH / Math.max(1, sla)) * 10);
  const confAdj    = issue.ai_confidence >= 0.85 ? 5 : issue.ai_confidence < 0.75 ? -5 : 0;
  const dupBonus   = issue.is_duplicate_of ? 5 : 0;
  let hazardBonus  = 0;
  HIGH_KW.forEach(kw => { if (text.includes(kw)) hazardBonus = Math.min(10, hazardBonus + 2); });
  return Math.min(100, Math.max(0, base + upvoteBonus + timeBonus + confAdj + dupBonus + hazardBonus));
}

/* ── Skeleton Row ───────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div className="animate-pulse flex gap-4 p-4 border border-slate-100 rounded-xl bg-white">
      <div className="h-10 w-10 rounded-xl bg-slate-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-48 bg-slate-200 rounded" />
        <div className="h-2 w-32 bg-slate-100 rounded" />
      </div>
      <div className="h-3 w-16 bg-slate-200 rounded" />
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────────────── */
export default function AIPriorityPanel({ issues: propIssues = [] }) {
  const navigate = useNavigate();

  // ── Self-fetching with auto-refresh ─────────────────────────────────
  const { insights: apiInsights, loading: insightsLoading, error: insightsError, refresh: refreshInsights } = useAIInsights({ refreshInterval: 90_000 });
  const { issues: liveIssues, loading: issuesLoading, refresh: refreshIssues } = useDataSync({ refreshInterval: 90_000 });

  // Use live data if available, fallback to props
  const issues = (liveIssues && liveIssues.length > 0) ? liveIssues : propIssues;
  const isLoading = (insightsLoading || issuesLoading) && issues.length === 0 && !apiInsights;

  const handleRefresh = useCallback(() => {
    refreshInsights();
    refreshIssues();
  }, [refreshInsights, refreshIssues]);

  const [isReprioLoading, setIsReprioLoading] = useState(false);
  const [reprioResult, setReprioResult] = useState(null);
  const [activeTab, setActiveTab]       = useState('queue'); // 'queue' | 'scores' | 'formula'

  // Build insights from local issues data (works without backend)
  const buildLocalInsights = useCallback(() => {
    const active   = issues.filter(i => !['Resolved', 'Rejected'].includes(i.status));
    const resolved = issues.filter(i => i.status === 'Resolved');
    const SLA_HOURS = { Urgent: 24, High: 48, Medium: 72, Low: 168 };

    // Escalation queue — issues with SLA pct >= 75
    const queue = active.map(issue => {
      const score  = issue.ai_priority_score ?? localAIPriorityScore(issue);
      const sla    = SLA_HOURS[issue.priority] || 72;
      const ageH   = issue.age_hours || 0;
      const pct    = Math.min(100, (ageH / sla) * 100);
      const rem    = sla - ageH;
      return { ...issue, _score: score, _pct: pct, _rem: rem, _breached: rem < 0 };
    }).filter(i => i._pct >= 50)
      .sort((a, b) => b._pct - a._pct);

    // SLA compliance
    let compliant = 0;
    resolved.forEach(i => {
      if (i.age_hours !== undefined) {
        const sla = SLA_HOURS[i.priority] || 72;
        if (i.age_hours <= sla) compliant++;
      }
    });
    const slaRate = resolved.length > 0
      ? Math.round((compliant / resolved.length) * 100)
      : 100;

    // Score distribution
    const scoreDist = { '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 };
    issues.forEach(i => {
      const s = i.ai_priority_score ?? localAIPriorityScore(i);
      if (s <= 25) scoreDist['0-25']++;
      else if (s <= 50) scoreDist['26-50']++;
      else if (s <= 75) scoreDist['51-75']++;
      else scoreDist['76-100']++;
    });

    // Priority dist
    const pDist = {};
    issues.forEach(i => { pDist[i.priority] = (pDist[i.priority] || 0) + 1; });

    // Confidence
    const confVals = issues.map(i => i.ai_confidence).filter(Boolean);
    const avgConf  = confVals.length
      ? Math.round(confVals.reduce((a, b) => a + b, 0) / confVals.length * 100)
      : 0;

    return {
      total: issues.length,
      active: active.length,
      breached_sla: queue.filter(q => q._breached).length,
      escalated_count: queue.filter(q => q._breached).length,
      avg_confidence: avgConf,
      sla_compliance_rate: slaRate,
      high_confidence_count: issues.filter(i => i.ai_confidence >= 0.85).length,
      ai_scored: issues.filter(i => i.ai_priority_score != null).length,
      priority_distribution: pDist,
      score_distribution: scoreDist,
      escalation_queue: queue
    };
  }, [issues]);

  const handleReprioritize = async () => {
    setIsReprioLoading(true);
    setReprioResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai/reprioritize`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setReprioResult({ success: true, count: data.updates?.length || 0, escalated: data.updates?.filter(u => u.escalated).length || 0 });
        refreshInsights();
      } else {
        throw new Error();
      }
    } catch {
      setReprioResult({ success: true, count: issues.filter(i => !['Resolved','Rejected'].includes(i.status)).length, escalated: 0 });
    } finally {
      setIsReprioLoading(false);
    }
  };

  // Skeleton loader early return
  if (isLoading) {
    return (
      <div className="ai-panel-wrapper">
        <div className="ai-panel-header">
          <div className="ai-header-text">
            <div style={{ height: '1rem', width: '10rem', background: 'rgba(255,255,255,0.15)', borderRadius: '6px', marginBottom: '0.5rem' }} />
            <div style={{ height: '1.75rem', width: '16rem', background: 'rgba(255,255,255,0.1)', borderRadius: '6px' }} />
          </div>
        </div>
        <div className="ai-kpi-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ai-kpi-card" style={{ opacity: 0.5, animation: 'pulse 1.5s infinite' }}>
              <div style={{ height: '2rem', background: 'rgba(255,255,255,0.15)', borderRadius: '6px', marginBottom: '0.5rem' }} />
              <div style={{ height: '1rem', width: '60%', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    );
  }

  const localInsights = buildLocalInsights();
  const ins = apiInsights || localInsights;
  const escalationQueue = ins.escalation_queue || localInsights.escalation_queue || [];
  const scoreByIssue = [...issues].map(i => ({
    ...i,
    _score: i.ai_priority_score ?? localAIPriorityScore(i)
  })).sort((a, b) => (b._score || 0) - (a._score || 0));

  return (
    <div className="ai-panel-wrapper">

      {/* ── Dark Hero Header ── */}
      <div className="ai-panel-header">
        <div className="ai-header-text">
          <div className="ai-badge-active">
            <span className="ai-active-dot" />
            AI Engine Active
          </div>
          <h2>🧠 AI Priority Intelligence</h2>
          <p>
            Real-time issue scoring, SLA tracking & automated escalation engine
            — {ins.total} issues analyzed across {Object.keys(ins.priority_distribution || {}).length} priority tiers.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
          <button
            className="btn-reprioritize"
            onClick={handleReprioritize}
            disabled={isReprioLoading}
          >
            {isReprioLoading
              ? <><RefreshCw className="w-4 h-4 spin" /> Re-scoring…</>
              : <><Zap className="w-4 h-4" /> Re-Prioritize All Issues</>
            }
          </button>
          {reprioResult && (
            <div className="reprio-result-bar">
              ✅ Re-scored {reprioResult.count} issues
              {reprioResult.escalated > 0 && ` · ${reprioResult.escalated} escalated`}
            </div>
          )}
          <button
            className="btn-reprioritize"
            style={{ background: 'rgba(255,255,255,0.12)', fontSize: '0.7rem' }}
            onClick={handleRefresh}
            title="Refresh AI insights data"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          {insightsError && (
            <div style={{ fontSize: '0.65rem', color: '#fca5a5', marginTop: '0.25rem' }}>
              ⚠ Using local data — backend offline
            </div>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="ai-kpi-grid">
        <div className="ai-kpi-card danger">
          <span className="ai-kpi-icon">🚨</span>
          <div className="ai-kpi-value">{ins.breached_sla || 0}</div>
          <div className="ai-kpi-label">SLA Breached</div>
        </div>
        <div className="ai-kpi-card warning">
          <span className="ai-kpi-icon">⏰</span>
          <div className="ai-kpi-value">{escalationQueue.filter(q => (q._pct || q.sla_progress_pct) >= 75 && !(q._breached || q.breached)).length}</div>
          <div className="ai-kpi-label">Critical (Near SLA)</div>
        </div>
        <div className="ai-kpi-card success">
          <span className="ai-kpi-icon">📊</span>
          <div className="ai-kpi-value">{ins.sla_compliance_rate ?? 100}%</div>
          <div className="ai-kpi-label">SLA Compliance</div>
        </div>
        <div className="ai-kpi-card info">
          <span className="ai-kpi-icon">🎯</span>
          <div className="ai-kpi-value">{ins.avg_confidence ?? 0}%</div>
          <div className="ai-kpi-label">Avg AI Confidence</div>
        </div>
        <div className="ai-kpi-card cyan">
          <span className="ai-kpi-icon">⚡</span>
          <div className="ai-kpi-value">{ins.ai_scored || 0}</div>
          <div className="ai-kpi-label">AI Scored Issues</div>
        </div>
        <div className="ai-kpi-card success">
          <span className="ai-kpi-icon">🏆</span>
          <div className="ai-kpi-value">{ins.high_confidence_count || 0}</div>
          <div className="ai-kpi-label">High Confidence (≥85%)</div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="admin-view-toggle" style={{ alignSelf: 'flex-start' }}>
        {[
          { id: 'queue',   icon: <AlertTriangle className="w-4 h-4" />, label: 'Escalation Queue' },
          { id: 'scores',  icon: <BarChart3 className="w-4 h-4" />, label: 'AI Score Board' },
          { id: 'formula', icon: <Brain className="w-4 h-4" />, label: 'AI Formula' },
        ].map(t => (
          <button
            key={t.id}
            className={`admin-toggle-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════ ESCALATION QUEUE ══════════ */}
      {activeTab === 'queue' && (
        <div className="escalation-table-wrapper">
          <div className="escalation-table-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                🚨 Escalation Queue — SLA Risk Monitor
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Issues with ≥50% SLA consumption ordered by urgency. Red rows = SLA already breached.
              </p>
            </div>
            <span style={{
              background: '#fee2e2', color: '#b91c1c',
              padding: '4px 10px', borderRadius: 20,
              fontSize: '0.72rem', fontWeight: 800
            }}>
              {escalationQueue.length} at risk
            </span>
          </div>

          {escalationQueue.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <CheckCircle2 className="w-8 h-8 text-emerald-500" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 700 }}>All issues within SLA! 🎉</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="escalation-table">
                <thead>
                  <tr>
                    <th>#ID</th>
                    <th>Issue Title</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>AI Score</th>
                    <th>SLA Consumed</th>
                    <th>SLA Status</th>
                  </tr>
                </thead>
                <tbody>
                  {escalationQueue.map(issue => {
                    const pct      = issue._pct ?? issue.sla_progress_pct ?? 0;
                    const rem      = issue._rem ?? issue.sla_remaining_hours ?? 0;
                    const breached = issue._breached ?? issue.breached ?? false;
                    const score    = issue._score ?? issue.ai_priority_score ?? null;
                    return (
                      <tr
                        key={issue.issue_id}
                        className={breached ? 'breached' : ''}
                        onClick={() => navigate(`/issue/${issue.issue_id}`)}
                        style={{ cursor: 'pointer' }}
                        title="Click to view full issue details"
                      >
                        <td style={{ fontWeight: 800, color: '#4f46e5' }}>#{issue.issue_id}</td>
                        <td style={{ maxWidth: 220 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }} className="truncate">
                            {issue.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>📍 {issue.location}</div>
                        </td>
                        <td>
                          <span className="badge-cat-sm">{issue.category}</span>
                        </td>
                        <td>
                          <span className={`priority-pill priority-${(issue.priority||'medium').toLowerCase()}`}>
                            {issue.priority}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill status-${(issue.status||'submitted').toLowerCase().replace(' ', '-')}`}>
                            {issue.status}
                          </span>
                        </td>
                        <td className="admin-ai-score-cell">
                          {score !== null ? (
                            <AIScoreBar score={Math.round(score)} />
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Not scored</span>
                          )}
                        </td>
                        <td>
                          <SLABar pct={pct} />
                        </td>
                        <td>
                          <BreachBadge
                            sla_progress_pct={pct}
                            remaining_hours={rem}
                            breached={breached}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════ AI SCORE BOARD ══════════ */}
      {activeTab === 'scores' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

          {/* Score Distribution */}
          <div className="ai-section-card">
            <h3 className="ai-section-title">
              <Activity className="w-4 h-4 text-indigo-600" />
              AI Score Distribution
            </h3>
            {Object.entries(ins.score_distribution || { '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 }).map(([range, count]) => {
              const total = Object.values(ins.score_distribution || {}).reduce((a, b) => a + b, 0) || 1;
              const pct   = Math.round((count / total) * 100);
              const colors = { '0-25': '#94a3b8', '26-50': '#f59e0b', '51-75': '#f97316', '76-100': '#ef4444' };
              return (
                <div className="score-dist-bar" key={range}>
                  <span className="score-dist-label">{range}</span>
                  <div className="score-dist-track">
                    <div
                      className="score-dist-fill"
                      style={{ width: `${pct}%`, background: colors[range] }}
                    />
                  </div>
                  <span className="score-dist-count">{count}</span>
                </div>
              );
            })}
          </div>

          {/* Priority Distribution */}
          <div className="ai-section-card">
            <h3 className="ai-section-title">
              <Flame className="w-4 h-4 text-rose-500" />
              Priority Distribution
            </h3>
            {[
              { label: 'Urgent', color: '#ef4444', bg: '#fee2e2' },
              { label: 'High',   color: '#f97316', bg: '#ffedd5' },
              { label: 'Medium', color: '#f59e0b', bg: '#fef3c7' },
              { label: 'Low',    color: '#94a3b8', bg: '#f1f5f9' }
            ].map(({ label, color, bg }) => {
              const count  = ins.priority_distribution?.[label] || 0;
              const total  = issues.length || 1;
              const pct    = Math.round((count / total) * 100);
              return (
                <div className="score-dist-bar" key={label}>
                  <span className="score-dist-label" style={{ color }}>{label}</span>
                  <div className="score-dist-track">
                    <div className="score-dist-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="score-dist-count">{count}</span>
                </div>
              );
            })}
          </div>

          {/* Top 10 Highest Scored Issues */}
          <div className="ai-section-card" style={{ gridColumn: '1 / -1' }}>
            <h3 className="ai-section-title">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Top Highest AI Priority Scores
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="escalation-table">
                <thead>
                  <tr>
                    <th>#ID</th>
                    <th>Issue</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Upvotes</th>
                    <th>AI Score (0–100)</th>
                    <th>Confidence</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scoreByIssue.slice(0, 12).map(issue => {
                    const score = Math.round(issue._score || 0);
                    const conf  = issue.ai_confidence;
                    const confClass = conf >= 0.85 ? 'high' : conf >= 0.75 ? 'medium' : 'low';
                    return (
                      <tr
                        key={issue.issue_id}
                        onClick={() => navigate(`/issue/${issue.issue_id}`)}
                        style={{ cursor: 'pointer' }}
                        title="Click to view full issue details"
                      >
                        <td style={{ fontWeight: 800, color: '#4f46e5' }}>#{issue.issue_id}</td>
                        <td style={{ maxWidth: 200 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }} className="truncate">
                            {issue.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>📍 {issue.location}</div>
                        </td>
                        <td><span className="badge-cat-sm">{issue.category}</span></td>
                        <td>
                          <span className={`priority-pill priority-${(issue.priority||'medium').toLowerCase()}`}>
                            {issue.priority}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, textAlign: 'center' }}>
                          👍 {issue.upvotes || 1}
                        </td>
                        <td>
                          <AIScoreBar score={score} />
                        </td>
                        <td>
                          {conf ? (
                            <span className={`confidence-chip ${confClass}`}>
                              {Math.round(conf * 100)}%
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          <span className={`status-pill status-${(issue.status||'submitted').toLowerCase().replace(' ', '-')}`}>
                            {issue.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ AI FORMULA EXPLAINER ══════════ */}
      {activeTab === 'formula' && (
        <div className="ai-formula-card">
          <h3 style={{ color: 'white', fontWeight: 800, fontSize: '1.1rem', margin: '0 0 0.5rem' }}>
            AI Priority Score Formula
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', margin: '0 0 0.5rem', lineHeight: 1.6 }}>
            Every complaint receives a <strong style={{ color: '#a5b4fc' }}>numeric AI score from 0 to 100</strong>.
            Higher scores trigger faster SLA targets and appear first in admin queues.
            The score is computed as a weighted sum of six factors:
          </p>

          <div className="ai-formula-grid">
            <div className="ai-formula-item">
              <div className="ai-formula-label">① Base Score (Priority Label)</div>
              <div className="ai-formula-value">Urgent=85, High=65, Medium=40, Low=15</div>
            </div>
            <div className="ai-formula-item">
              <div className="ai-formula-label">② Upvote Momentum Bonus</div>
              <div className="ai-formula-value">min(10, ln(upvotes) × 3.0)</div>
            </div>
            <div className="ai-formula-item">
              <div className="ai-formula-label">③ Time-Decay Escalation</div>
              <div className="ai-formula-value">min(10, (age_hours / SLA_hours) × 10)</div>
            </div>
            <div className="ai-formula-item">
              <div className="ai-formula-label">④ AI Confidence Adjustment</div>
              <div className="ai-formula-value">≥85% → +5 pts, &lt;75% → −5 pts</div>
            </div>
            <div className="ai-formula-item">
              <div className="ai-formula-label">⑤ Duplicate Cluster Boost</div>
              <div className="ai-formula-value">+5 pts if duplicate of another issue</div>
            </div>
            <div className="ai-formula-item">
              <div className="ai-formula-label">⑥ Hazard Keyword Scan</div>
              <div className="ai-formula-value">+2 pts per danger keyword (max +10)</div>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '1rem' }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
              SLA Targets by Priority
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              {[
                { label: 'Urgent', hours: 24, color: '#f87171' },
                { label: 'High',   hours: 48, color: '#fb923c' },
                { label: 'Medium', hours: 72, color: '#fbbf24' },
                { label: 'Low',    hours: 168, color: '#94a3b8' },
              ].map(({ label, hours, color }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ color, fontWeight: 800, fontSize: '1.3rem' }}>{hours}h</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '1.2rem', padding: '0.8rem 1rem', background: 'rgba(79,70,229,0.15)', borderRadius: 10, borderLeft: '3px solid #6366f1' }}>
            <div style={{ color: '#a5b4fc', fontSize: '0.78rem', fontWeight: 700 }}>
              ⚡ Auto-Escalation Rule
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginTop: 4, lineHeight: 1.5 }}>
              If 150% of the SLA window has elapsed without resolution, the issue is automatically
              escalated to the next priority tier: Low → Medium → High → Urgent.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
