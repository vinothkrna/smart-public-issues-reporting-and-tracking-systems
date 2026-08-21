import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Users,
  FileText,
  Shield,
  Download,
  Search,
  Filter,
  RefreshCw,
  Server,
  Layers,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileCode,
  HardDrive,
  MessageSquare,
  Activity,
  UserCheck,
  Building2,
  ExternalLink,
  ChevronRight,
  Eye,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://127.0.0.1:5000';

export default function MasterDataVault({ issues = [] }) {
  const navigate = useNavigate();
  const { currentUser, isCitizen } = useAuth();

  // Defense-in-depth safety guard: Allow ONLY admins to data vault
  useEffect(() => {
    if (currentUser && isCitizen) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, isCitizen, navigate]);

  const [activeTab, setActiveTab] = useState('grievances'); // 'grievances' | 'users' | 'audits' | 'communications' | 'backups'
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [communications, setCommunications] = useState({ messages: [], updates: [] });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');

  // JSON Preview Modal
  const [previewData, setPreviewData] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchVaultData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, usersRes, auditsRes, commsRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/data-vault/summary`).catch(() => null),
        fetch(`${API_BASE}/api/admin/data-vault/users`).catch(() => null),
        fetch(`${API_BASE}/api/admin/data-vault/audit-logs?limit=100`).catch(() => null),
        fetch(`${API_BASE}/api/admin/data-vault/communications?limit=100`).catch(() => null)
      ]);

      if (sumRes && sumRes.ok) {
        const sumJson = await sumRes.json();
        setSummary(sumJson);
      }
      if (usersRes && usersRes.ok) {
        const usersJson = await usersRes.json();
        setUsersList(usersJson.users || []);
      }
      if (auditsRes && auditsRes.ok) {
        const auditsJson = await auditsRes.json();
        setAuditLogs(auditsJson.audit_logs || []);
      }
      if (commsRes && commsRes.ok) {
        const commsJson = await commsRes.json();
        setCommunications(commsJson);
      }
    } catch (err) {
      console.error('Failed to load data vault records', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVaultData();
  }, [fetchVaultData]);

  // Filtered Grievances
  const filteredGrievances = useMemo(() => {
    return issues.filter(i => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        (i.title || '').toLowerCase().includes(q) ||
        (i.location || '').toLowerCase().includes(q) ||
        (i.reporter_name || '').toLowerCase().includes(q) ||
        (i.reporter_email || '').toLowerCase().includes(q) ||
        String(i.issue_id) === q;

      const matchesCat = categoryFilter === 'All' || i.category === categoryFilter;
      const matchesStatus = statusFilter === 'All' || i.status === statusFilter;
      const matchesDept = deptFilter === 'All' || (i.department || i.assigned_department) === deptFilter;

      return matchesSearch && matchesCat && matchesStatus && matchesDept;
    });
  }, [issues, searchQuery, categoryFilter, statusFilter, deptFilter]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q);

      const matchesRole = roleFilter === 'All' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [usersList, searchQuery, roleFilter]);

  // Filtered Audit Logs
  const filteredAudits = useMemo(() => {
    return auditLogs.filter(a => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        (a.action || '').toLowerCase().includes(q) ||
        (a.user_name || '').toLowerCase().includes(q) ||
        (a.details || '').toLowerCase().includes(q) ||
        (a.ip_address || '').toLowerCase().includes(q);

      const matchesAction = actionFilter === 'All' || a.action === actionFilter;
      return matchesSearch && matchesAction;
    });
  }, [auditLogs, searchQuery, actionFilter]);

  const handleCopyJson = () => {
    if (previewData) {
      navigator.clipboard.writeText(JSON.stringify(previewData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch ((priority || '').toLowerCase()) {
      case 'urgent':
      case 'critical':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'high':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Resolved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'In Progress':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'Assigned':
      case 'Under Review':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* ── TOP HERO HEADER & DATA GATHERING ACTIONS ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Database className="w-80 h-80 text-white" />
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold mb-3">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              <span>Central Data Warehouse & Intelligence Vault</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white m-0">
              Master Information <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Gathering Hub</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed m-0">
              Centralized platform repository to store, gather, inspect, and export all citizen complaints, user registries, department dispatches, and system audit trails.
            </p>
          </div>

          {/* Quick Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={`${API_BASE}/api/admin/data-vault/export/all-json`}
              className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer text-decoration-none"
              download
            >
              <FileCode className="w-4 h-4" />
              <span>Export Full JSON</span>
            </a>

            <a
              href={`${API_BASE}/api/admin/export/csv`}
              className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 border border-white/20 transition-all cursor-pointer text-decoration-none"
              download
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Grievances CSV</span>
            </a>

            <a
              href={`${API_BASE}/api/admin/data-vault/export/users-csv`}
              className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 border border-white/20 transition-all cursor-pointer text-decoration-none"
              download
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Users CSV</span>
            </a>

            <button
              type="button"
              onClick={fetchVaultData}
              disabled={loading}
              className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer"
              title="Refresh Data Vault"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 5 TELEMETRY & STORAGE METRICS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Total Grievances */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm relative">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Grievances</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{summary?.counts?.issues ?? issues.length}</div>
          <div className="text-[11px] font-semibold text-indigo-600 mt-1">Master Records Stored</div>
        </div>

        {/* Metric 2: Registered Users */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm relative">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Directory Users</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{summary?.counts?.users ?? usersList.length}</div>
          <div className="text-[11px] font-semibold text-slate-500 mt-1">
            {summary?.counts?.citizens ?? 0} Citizens • {summary?.counts?.admins ?? 0} Staff
          </div>
        </div>

        {/* Metric 3: Audit Trails */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm relative">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Audit Trail Logs</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{summary?.counts?.audits ?? auditLogs.length}</div>
          <div className="text-[11px] font-semibold text-amber-600 mt-1">Security & Event Trail</div>
        </div>

        {/* Metric 4: Messages & Updates */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm relative">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Communications</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {(summary?.counts?.messages ?? 0) + (summary?.counts?.updates ?? 0)}
          </div>
          <div className="text-[11px] font-semibold text-emerald-600 mt-1">Chat & Field Updates</div>
        </div>

        {/* Metric 5: Database Engine */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm relative col-span-2 sm:col-span-1">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Database Vault</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 truncate">
            {summary?.database?.size_formatted || 'Active'}
          </div>
          <div className="text-[11px] font-semibold text-purple-600 mt-1 truncate">
            {summary?.database?.engine || 'SQLite 3 WAL'}
          </div>
        </div>
      </div>

      {/* ── TAB NAVIGATION BAR ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'grievances'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
          onClick={() => { setActiveTab('grievances'); setSearchQuery(''); }}
        >
          <Layers className="w-4 h-4" />
          <span>Grievances Archive ({issues.length})</span>
        </button>

        <button
          type="button"
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
          onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
        >
          <Users className="w-4 h-4" />
          <span>Users Directory ({usersList.length})</span>
        </button>

        <button
          type="button"
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'audits'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
          onClick={() => { setActiveTab('audits'); setSearchQuery(''); }}
        >
          <Shield className="w-4 h-4" />
          <span>Audit Trail Logs ({auditLogs.length})</span>
        </button>

        <button
          type="button"
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'communications'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
          onClick={() => { setActiveTab('communications'); setSearchQuery(''); }}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Communications</span>
        </button>

        <button
          type="button"
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'backups'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
          onClick={() => { setActiveTab('backups'); }}
        >
          <HardDrive className="w-4 h-4" />
          <span>Export & Backup Center</span>
        </button>
      </div>

      {/* ── TAB 1: MASTER GRIEVANCES ARCHIVE ── */}
      {activeTab === 'grievances' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by ID, title, ward, reporter email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Categories</option>
                <option value="Pothole">Potholes</option>
                <option value="Garbage Dump">Garbage Dumps</option>
                <option value="Water Leakage">Water Leakage</option>
                <option value="Streetlight Failure">Streetlight Failure</option>
                <option value="Drainage Blockage">Drainage Blockage</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Departments</option>
                <option value="Roads & Highways Department">Roads & Highways</option>
                <option value="Sanitation Department">Sanitation</option>
                <option value="Water Supply Department">Water Supply</option>
                <option value="Electricity Department">Electricity</option>
                <option value="Drainage & Sewer Department">Drainage & Sewer</option>
                <option value="Public Health Department">Public Health</option>
              </select>
            </div>
          </div>

          {/* Grievances Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="text-xs font-bold text-slate-700">
                Displaying <span className="text-indigo-600 font-extrabold">{filteredGrievances.length}</span> Grievance Records
              </div>
              <a
                href={`${API_BASE}/api/admin/export/csv`}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-decoration-none"
                download
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Filtered Set</span>
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Title & Details</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Reporter</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredGrievances.length > 0 ? (
                    filteredGrievances.map((item) => (
                      <tr key={item.issue_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                          #{item.issue_id}
                        </td>
                        <td className="py-3.5 px-4 max-w-[240px]">
                          <div className="font-bold text-slate-900 truncate">{item.title}</div>
                          <div className="text-[11px] text-slate-400 truncate">{item.location}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 truncate max-w-[150px]">
                          {item.department || item.assigned_department || 'Unassigned'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${getPriorityBadgeClass(item.priority)}`}>
                            {item.priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getStatusBadgeClass(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-semibold">{item.reporter_name || 'Citizen'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.reporter_email || '—'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewTitle(`Grievance #${item.issue_id} JSON Schema`);
                                setPreviewData(item);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600"
                              title="Inspect JSON Record"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/issue/${item.issue_id}`)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold"
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <div className="font-bold text-slate-700">No grievances match criteria</div>
                        <div className="text-xs text-slate-400 mt-0.5">Adjust your filters or submit a new grievance.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: CITIZEN & OFFICER DIRECTORY ── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-8 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search users by name, email, department, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Roles</option>
                <option value="citizen">Citizen Accounts</option>
                <option value="admin">Department Administrators</option>
                <option value="officer">Field Officers</option>
                <option value="superadmin">Super Administrators</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="text-xs font-bold text-slate-700">
                Displaying <span className="text-indigo-600 font-extrabold">{filteredUsers.length}</span> System Accounts
              </div>
              <a
                href={`${API_BASE}/api/admin/data-vault/export/users-csv`}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-decoration-none"
                download
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Directory CSV</span>
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Complaints</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white font-black text-xs flex items-center justify-center">
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{u.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">UID #{u.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">{u.email}</td>
                        <td className="py-3.5 px-4 text-slate-500">{u.phone || '—'}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            u.role === 'admin' ? 'bg-rose-100 text-rose-800' :
                            u.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                            'bg-indigo-100 text-indigo-800'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 truncate max-w-[150px]">
                          {u.department || 'General Public'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {u.issues_count ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {u.created_at ? u.created_at.split(' ')[0] : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewTitle(`User #${u.id} (${u.name}) Profile Schema`);
                              setPreviewData(u);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600"
                            title="Inspect User JSON"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <div className="font-bold text-slate-700">No users match criteria</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: SYSTEM AUDIT & SECURITY TRAIL ── */}
      {activeTab === 'audits' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-8 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search audit logs by action, user, IP, or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Actions</option>
                <option value="USER_LOGIN">USER_LOGIN</option>
                <option value="ISSUE_CREATED">ISSUE_CREATED</option>
                <option value="STATUS_CHANGE">STATUS_CHANGE</option>
                <option value="DISPATCH_SQUAD">DISPATCH_SQUAD</option>
                <option value="RESOLUTION_UPLOAD">RESOLUTION_UPLOAD</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="text-xs font-bold text-slate-700">
                Displaying <span className="text-indigo-600 font-extrabold">{filteredAudits.length}</span> System Event Logs
              </div>
              <a
                href={`${API_BASE}/api/admin/data-vault/export/audit-csv`}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-decoration-none"
                download
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Audit CSV</span>
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Log ID</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action Event</th>
                    <th className="py-3 px-4">Triggered By</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredAudits.length > 0 ? (
                    filteredAudits.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-400">#{a.id}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                          {a.created_at}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-mono font-bold text-[11px]">
                            {a.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {a.user_name || 'System Engine'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {a.entity_type ? `${a.entity_type} #${a.entity_id || ''}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                          {a.ip_address || '127.0.0.1'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                          {a.details || '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <div className="font-bold text-slate-700">No audit records logged yet</div>
                        <div className="text-xs text-slate-400 mt-0.5">Events automatically record during active platform usage.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: FIELD COMMUNICATIONS & UPDATES ── */}
      {activeTab === 'communications' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages Column */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 m-0">2-Way Grievance Dialogue Messages</h3>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {communications.messages?.length || 0} Threads
              </span>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {communications.messages && communications.messages.length > 0 ? (
                communications.messages.map((m, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-700">Complaint #{m.issue_id}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{m.created_at}</span>
                    </div>
                    <div className="text-xs text-slate-800">{m.message}</div>
                    <div className="text-[10px] text-slate-400">Sender: {m.sender_name || 'User'}</div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No 2-way dialogue messages recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Official Updates Column */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900 m-0">Official Squad Progress Dispatches</h3>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {communications.updates?.length || 0} Updates
              </span>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {communications.updates && communications.updates.length > 0 ? (
                communications.updates.map((u, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-700">Complaint #{u.issue_id}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{u.created_at}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900">{u.title}</div>
                    <div className="text-xs text-slate-600">{u.description}</div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No squad dispatch updates recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: EXPORT & BACKUP VAULT ── */}
      {activeTab === 'backups' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Full System Backup */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileCode className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 m-0">Complete Master JSON Backup</h3>
              <p className="text-xs text-slate-500 leading-relaxed m-0">
                Downloads full structured database snapshot including all users, grievances, audit logs, messages, and status histories.
              </p>
            </div>
            <a
              href={`${API_BASE}/api/admin/data-vault/export/all-json`}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 text-decoration-none"
              download
            >
              <Download className="w-4 h-4" />
              <span>Download Master JSON</span>
            </a>
          </div>

          {/* Card 2: Grievances Records CSV */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 m-0">Grievances Master CSV</h3>
              <p className="text-xs text-slate-500 leading-relaxed m-0">
                Exports spreadsheet compatible tabular data of all citizen grievances, priority scores, departmental dispatches, and SLA markers.
              </p>
            </div>
            <a
              href={`${API_BASE}/api/admin/export/csv`}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 text-decoration-none"
              download
            >
              <Download className="w-4 h-4" />
              <span>Download Grievances CSV</span>
            </a>
          </div>

          {/* Card 3: Directory & Users CSV */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 m-0">Citizen & Staff Directory CSV</h3>
              <p className="text-xs text-slate-500 leading-relaxed m-0">
                Exports complete municipal user directory, roles, verified email addresses, departments, and total complaints filed.
              </p>
            </div>
            <a
              href={`${API_BASE}/api/admin/data-vault/export/users-csv`}
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-cyan-600/20 text-decoration-none"
              download
            >
              <Download className="w-4 h-4" />
              <span>Download Directory CSV</span>
            </a>
          </div>
        </div>
      )}

      {/* ── JSON PREVIEW MODAL ── */}
      {previewData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 m-0">{previewTitle}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Layers className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewData(null)}
                  className="w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto font-mono text-xs text-slate-800 bg-slate-900 text-emerald-400 rounded-b-3xl">
              <pre className="m-0 whitespace-pre-wrap">{JSON.stringify(previewData, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
