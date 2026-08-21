import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  Edit3,
  Layers,
  Search,
  Check,
  X,
  Map,
  Table2,
  Brain,
  Zap
} from 'lucide-react';

// Local AI priority score calculator (mirrors backend formula)
function localAIPriorityScore(issue) {
  const BASE  = { Urgent: 85, High: 65, Medium: 40, Low: 15 };
  const SLA_H = { Urgent: 24, High: 48, Medium: 72, Low: 168 };
  const HIGH_KW = ['emergency','danger','dangerous','accident','hospital','school',
    'child','live wire','spark','electric shock','open manhole','deep crater',
    'burst','collapsed','hazardous','urgent','severe'];
  const text = `${issue.title||''} ${issue.description||''}`.toLowerCase();
  const base  = BASE[issue.priority] || 40;
  const upvoteBonus = Math.min(10, Math.log(Math.max(1, issue.upvotes || 1)) * 3);
  const sla   = SLA_H[issue.priority] || 72;
  const ageH  = issue.age_hours || 0;
  const timeBonus   = Math.min(10, (ageH / Math.max(1, sla)) * 10);
  const confAdj     = (issue.ai_confidence >= 0.85) ? 5 : (issue.ai_confidence < 0.75 ? -5 : 0);
  const dupBonus    = issue.is_duplicate_of ? 5 : 0;
  let hazardBonus = 0;
  HIGH_KW.forEach(kw => { if (text.includes(kw)) hazardBonus = Math.min(10, hazardBonus + 2); });
  return Math.min(100, Math.max(0, base + upvoteBonus + timeBonus + confAdj + dupBonus + hazardBonus));
}

function AIScoreCell({ issue }) {
  const score    = issue.ai_priority_score != null
    ? Math.round(issue.ai_priority_score)
    : Math.round(localAIPriorityScore(issue));
  const sla      = { Urgent: 24, High: 48, Medium: 72, Low: 168 }[issue.priority] || 72;
  const slaPct   = issue.age_hours != null
    ? Math.min(100, (issue.age_hours / sla) * 100)
    : 0;
  const isEscalating = slaPct >= 75 && !['Resolved','Rejected'].includes(issue.status);

  const fillColor = score >= 76 ? 'linear-gradient(90deg,#ef4444,#991b1b)'
    : score >= 51 ? '#f97316'
    : score >= 26 ? '#f59e0b'
    : '#94a3b8';

  return (
    <td className="admin-ai-score-cell">
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontWeight: 800, fontSize: '0.82rem', color: score >= 76 ? '#b91c1c' : score >= 51 ? '#c2410c' : '#64748b' }}>
          {score}
        </span>
        <div className="table-ai-score-bar">
          <div
            className="table-ai-score-fill"
            style={{ width: `${score}%`, background: fillColor }}
          />
        </div>
      </div>
      {isEscalating && (
        <div className="escalation-badge">⚡ ESCALATING</div>
      )}
    </td>
  );
}
import { DEPARTMENTS } from '../utils/demoData';
import GoogleMapPicker from './GoogleMapPicker';

export default function AdminCenter({
  issues = [],
  onUpdateIssue,
  onSelectIssue
}) {
  const navigate = useNavigate();
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('All');
  const [deptFilter, setDeptFilter]       = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Map vs Table toggle
  const [viewMode, setViewMode]           = useState('table'); // 'table' | 'map'
  const [mapStatusFilter, setMapStatusFilter] = useState('All');

  // Modal states
  const [assigningIssue, setAssigningIssue]   = useState(null);
  const [resolvingIssue, setResolvingIssue]   = useState(null);
  const [selectedDept, setSelectedDept]       = useState('Roads & PWD');
  const [assignedOfficer, setAssignedOfficer] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const total       = issues.length;
  const urgentCount = issues.filter(i => i.priority === 'Urgent' && i.status !== 'Resolved').length;
  const pending     = issues.filter(i => ['Submitted', 'Under Review'].includes(i.status)).length;
  const inProgress  = issues.filter(i => i.status === 'In Progress').length;
  const resolved    = issues.filter(i => i.status === 'Resolved').length;
  const pinnedCount = issues.filter(i => i.latitude && i.longitude).length;

  // Issues passing table filters
  const filtered = issues.filter(issue => {
    const matchesSearch = !search ||
      issue.title.toLowerCase().includes(search.toLowerCase()) ||
      issue.location.toLowerCase().includes(search.toLowerCase()) ||
      String(issue.issue_id) === search;
    const matchesStatus   = statusFilter   === 'All' || issue.status   === statusFilter;
    const matchesDept     = deptFilter     === 'All' || issue.department === deptFilter;
    const matchesPriority = priorityFilter === 'All' || issue.priority  === priorityFilter;
    return matchesSearch && matchesStatus && matchesDept && matchesPriority;
  });

  const handleSaveAssign = () => {
    if (!assigningIssue) return;
    onUpdateIssue(assigningIssue.issue_id, {
      department:  selectedDept,
      assigned_to: assignedOfficer || 'Field Squad Assigned',
      status:      'Assigned'
    });
    setAssigningIssue(null);
    setAssignedOfficer('');
  };

  const handleSaveResolve = () => {
    if (!resolvingIssue) return;
    onUpdateIssue(resolvingIssue.issue_id, {
      status:           'Resolved',
      resolution_notes: resolutionNotes || 'Repairs verified and completed by municipal field squad.',
      resolved_at:      new Date().toISOString()
    });
    setResolvingIssue(null);
    setResolutionNotes('');
  };

  const exportCSV = () => {
    const headers = ['ID', 'Title', 'Category', 'Status', 'Priority', 'Department', 'Officer', 'Location', 'Latitude', 'Longitude', 'Reporter'];
    const rows = filtered.map(i => [
      i.issue_id,
      `"${i.title.replace(/"/g, '""')}"`,
      i.category,
      i.status,
      i.priority,
      `"${i.department || 'Unassigned'}"`,
      `"${i.assigned_to || 'None'}"`,
      `"${i.location.replace(/"/g, '""')}"`,
      i.latitude  || '',
      i.longitude || '',
      `"${i.reporter_name || 'Citizen'}"`
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `city_grievances_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="admin-center-wrapper">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-admin-tag">ADMINISTRATIVE COMMAND</span>
            <span className="text-xs text-slate-500">Municipal Grievance Dispatch</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">City Complaints Management Hub</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="admin-view-toggle">
            <button
              className={`admin-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <Table2 className="w-4 h-4" />
              <span>Table</span>
            </button>
            <button
              className={`admin-toggle-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
              title="City Map View"
            >
              <Map className="w-4 h-4" />
              <span>City Map</span>
            </button>
          </div>

          <button className="btn-export-csv" onClick={exportCSV}>
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="admin-stat-card">
          <div className="stat-num">{total}</div>
          <div className="stat-lbl">Total Logged</div>
        </div>
        <div className="admin-stat-card urgent">
          <div className="stat-num text-rose-600">{urgentCount}</div>
          <div className="stat-lbl text-rose-600">Urgent Alerts</div>
        </div>
        <div className="admin-stat-card warning">
          <div className="stat-num text-amber-600">{pending}</div>
          <div className="stat-lbl">Unassigned</div>
        </div>
        <div className="admin-stat-card info">
          <div className="stat-num text-cyan-600">{inProgress}</div>
          <div className="stat-lbl">In Progress</div>
        </div>
        <div className="admin-stat-card success">
          <div className="stat-num text-emerald-600">{resolved}</div>
          <div className="stat-lbl">Resolved</div>
        </div>
        <div className="admin-stat-card" style={{ borderColor: '#4f46e5' }}>
          <div className="stat-num text-indigo-600">{pinnedCount}</div>
          <div className="stat-lbl text-indigo-500">GPS Pinned</div>
        </div>
      </div>

      {/* ══════════ MAP VIEW ══════════ */}
      {viewMode === 'map' && (
        <div className="admin-map-container">
          <div className="admin-map-header">
            <div>
              <h3 className="font-bold text-slate-900 text-base">📍 Live City Grievance Map</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {pinnedCount} complaints with GPS coordinates •
                Click any marker to view details
              </p>
            </div>
            <div className="text-xs text-slate-400 flex gap-4 flex-wrap">
              {[
                { label: 'Pothole',             color: '#ef4444' },
                { label: 'Garbage',             color: '#f59e0b' },
                { label: 'Water',               color: '#0ea5e9' },
                { label: 'Streetlight',         color: '#8b5cf6' },
                { label: 'Drainage',            color: '#10b981' },
              ].map(({ label, color }) => (
                <span key={label} style={{ color, fontWeight: 700 }}>● {label}</span>
              ))}
            </div>
          </div>

          <GoogleMapPicker
            mode="display"
            issues={issues}
            onSelectIssue={onSelectIssue}
            filterStatus={mapStatusFilter}
            height="520px"
          />
        </div>
      )}

      {/* ══════════ TABLE VIEW ══════════ */}
      {viewMode === 'table' && (
        <>
          {/* Filters Toolbar */}
          <div className="filter-card mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Search by ID, title, locality..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-text"
              />

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-select">
                <option value="All">All Statuses</option>
                {['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="input-select">
                <option value="All">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="input-select">
                <option value="All">All Priorities</option>
                {['Urgent', 'High', 'Medium', 'Low'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Management Table */}
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Complaint Details</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>AI Score</th>
                  <th>Department & Officer</th>
                  <th>Status</th>
                  <th>📍</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(issue => (
                  <tr key={issue.issue_id} className={issue.priority === 'Urgent' && issue.status !== 'Resolved' ? 'urgent-row' : ''}>
                    <td className="font-bold text-slate-800">#{issue.issue_id}</td>
                    <td className="max-w-[260px]">
                      <div className="font-bold text-slate-900 text-sm truncate">{issue.title}</div>
                      <div className="text-xs text-slate-500 truncate">📍 {issue.location}</div>
                      <div className="text-[11px] text-slate-400">By: {issue.reporter_name || 'Citizen'}</div>
                    </td>
                    <td>
                      <span className="badge-cat-sm">{issue.category}</span>
                    </td>
                    <td>
                      <span className={`priority-pill priority-${(issue.priority || 'medium').toLowerCase()}`}>
                        {issue.priority}
                      </span>
                    </td>
                    <AIScoreCell issue={issue} />
                    <td>
                       <div className="font-semibold text-xs text-slate-800">{issue.department || 'Unassigned'}</div>
                       <div className="text-[11px] text-slate-500">{issue.assigned_to || 'None'}</div>
                    </td>
                    <td>
                      <span className={`status-pill status-${issue.status.toLowerCase().replace(' ', '-')}`}>
                        {issue.status}
                      </span>
                    </td>
                    <td>
                      {issue.latitude
                        ? <span title={`${issue.latitude?.toFixed(4)}, ${issue.longitude?.toFixed(4)}`}
                                className="text-indigo-500 text-sm cursor-pointer"
                                onClick={() => {
                                  setViewMode('map');
                                  setMapStatusFilter('All');
                                }}
                            >📍</span>
                        : <span className="text-slate-300 text-sm">—</span>}
                    </td>
                    <td className="text-right">
                      <div className="flex gap-1.5 justify-end">
                        <button
                          className="btn-table-action"
                          onClick={() => {
                            setAssigningIssue(issue);
                            setSelectedDept(issue.department || 'Roads & PWD');
                            setAssignedOfficer(issue.assigned_to || '');
                          }}
                          title="Assign Department"
                        >
                          Assign
                        </button>

                        {issue.status !== 'Resolved' && (
                          <button
                            className="btn-table-action resolve"
                            onClick={() => {
                              setResolvingIssue(issue);
                              setResolutionNotes(issue.resolution_notes || '');
                            }}
                            title="Mark Resolved"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          className="btn-table-action secondary"
                          onClick={() => {
                            if (onSelectIssue) onSelectIssue(issue.issue_id);
                            navigate(`/issue/${issue.issue_id}`);
                          }}
                          title="Open Complete Complaint Details & Citizen Chat"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span>Details</span>
                          {(issue.messages || []).length > 0 && (
                            <span style={{ background: '#4f46e5', color: 'white', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '10px' }}>
                              {(issue.messages || []).length}
                            </span>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-sm">
                No complaints match the current filters.
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Assign Modal ── */}
      {assigningIssue && (
        <div className="modal-backdrop-blur">
          <div className="modal-card max-w-[480px]">
            <div className="modal-header-row border-b pb-3 mb-3">
              <h3 className="modal-title text-base font-bold">
                Assign Department — Issue #{assigningIssue.issue_id}
              </h3>
              <button className="close-btn" onClick={() => setAssigningIssue(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="modal-body space-y-3">
              <div>
                <label className="form-label-bold">Target Municipal Department</label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="input-select w-full"
                >
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label-bold">Assigned Field Officer / Squad</label>
                <input
                  type="text"
                  placeholder="e.g. Officer R. Murugan (Ward 12)"
                  value={assignedOfficer}
                  onChange={(e) => setAssignedOfficer(e.target.value)}
                  className="input-text w-full"
                />
              </div>
            </div>
            <div className="modal-footer-row border-t pt-3 mt-4">
              <button className="btn-secondary-flat" onClick={() => setAssigningIssue(null)}>Cancel</button>
              <button className="btn-primary-gradient" onClick={handleSaveAssign}>Save & Dispatch</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resolve Modal ── */}
      {resolvingIssue && (
        <div className="modal-backdrop-blur">
          <div className="modal-card max-w-[480px]">
            <div className="modal-header-row border-b pb-3 mb-3">
              <h3 className="modal-title text-base font-bold text-emerald-700">
                Mark Resolved — Issue #{resolvingIssue.issue_id}
              </h3>
              <button className="close-btn" onClick={() => setResolvingIssue(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="modal-body space-y-3">
              <div>
                <label className="form-label-bold">Official Resolution Remarks *</label>
                <textarea
                  rows="3"
                  placeholder="Detail the repair / clean-up actions taken by the field team..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="input-textarea w-full"
                  required
                />
              </div>
            </div>
            <div className="modal-footer-row border-t pt-3 mt-4">
              <button className="btn-secondary-flat" onClick={() => setResolvingIssue(null)}>Cancel</button>
              <button
                className="btn-primary-gradient"
                style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}
                onClick={handleSaveResolve}
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
