import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Search,
  Check,
  X,
  MapPin,
  Table2,
  Brain,
  Zap,
  Filter,
  BarChart3,
  Layers,
  Lock,
  Unlock,
  Sparkles,
  Droplets,
  Trash2,
  Construction,
  Waves,
  HeartPulse,
  ShieldCheck,
  Send,
  MessageSquare,
  ChevronRight,
  Download,
  Flame,
  ArrowUpRight,
  UserCheck,
  RefreshCw,
  Eye
} from 'lucide-react';
import AnalyticsView from '../components/AnalyticsView';
import AIPriorityPanel from '../components/AIPriorityPanel';
import LeafletMap from '../components/LeafletMap';
import { DEPARTMENTS } from '../utils/demoData';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000';

// Department-specific configurations, squads, and operational tools
export const DEPARTMENT_CONFIGS = {
  'Roads & Highways Department': {
    title: 'Roads & Highways Infrastructure Command',
    code: 'PWD-ROADS',
    icon: Construction,
    color: 'amber',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    themeGradient: 'from-amber-950 via-slate-900 to-amber-950',
    accentColor: '#f59e0b',
    targetIssues: ['Potholes', 'Road Cracks', 'Broken Sidewalks', 'Traffic Dividers', 'Manhole Gaps'],
    squads: [
      'Rapid Asphalt Patching Squad #1',
      'Heavy Roller & Paver Crew Alpha',
      'Ward 12 Road Surface Emergency Team',
      'Footpath & Kerb Maintenance Squad',
      'Highways Night Repair Squad'
    ],
    slaTarget: '24 - 48 Hours'
  },
  'Sanitation Department': {
    title: 'Sanitation & Solid Waste Management Hub',
    code: 'SAN-CLEAN',
    icon: Trash2,
    color: 'emerald',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    themeGradient: 'from-emerald-950 via-slate-900 to-emerald-950',
    accentColor: '#10b981',
    targetIssues: ['Garbage Dumps', 'Overflowing Bins', 'Dead Animals', 'Plastic Waste', 'Street Litter'],
    squads: [
      'Heavy Compactor Truck Alpha (Ward 1-5)',
      'Green City Bio-Waste Rapid Clean Squad',
      'Market & Commercial Waste Squad #3',
      'Debris & Hazardous Litter Removal Crew',
      'Recycling & Waste Segregation Team'
    ],
    slaTarget: '12 - 24 Hours'
  },
  'Water Supply Department': {
    title: 'Water Supply & Pipeline Management Portal',
    code: 'WATER-SUPPLY',
    icon: Droplets,
    color: 'cyan',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    themeGradient: 'from-cyan-950 via-slate-900 to-cyan-950',
    accentColor: '#06b6d4',
    targetIssues: ['Pipe Bursts', 'Low Pressure', 'Water Contamination', 'Main Line Leakage', 'Valve Rupture'],
    squads: [
      'Emergency High-Pressure Pipeline Welders',
      'Underground Valve Replacement Crew',
      'Emergency Water Tanker Quick Dispatch Unit',
      'Water Quality & Chlorination Inspection Squad',
      'Pumping Station Emergency Response Team'
    ],
    slaTarget: '8 - 24 Hours'
  },
  'Drainage & Sewer Department': {
    title: 'Drainage & Underground Sewer Command',
    code: 'DRAIN-SEWER',
    icon: Waves,
    color: 'indigo',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    themeGradient: 'from-indigo-950 via-slate-900 to-indigo-950',
    accentColor: '#6366f1',
    targetIssues: ['Open Manholes', 'Sewage Overflow', 'Clogged Storm Drains', 'Monsoon Waterlogging', 'Sump Backflow'],
    squads: [
      'Jetting & High-Power Suction Machine Unit #4',
      'Desilting & Stormwater Channel Clearance Crew',
      'Open Manhole Heavy Concrete Cover Squad',
      'Emergency Monsoon De-watering Pump Squad',
      'Subsurface Sewer Inspection & Robotic Unit'
    ],
    slaTarget: '6 - 18 Hours'
  },
  'Electricity Department': {
    title: 'Electricity & Streetlighting Command Grid',
    code: 'ELEC-POWER',
    icon: Zap,
    color: 'yellow',
    badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    themeGradient: 'from-yellow-950 via-slate-900 to-yellow-950',
    accentColor: '#eab308',
    targetIssues: ['Fallen Power Lines', 'Streetlight Blackouts', 'Transformer Sparks', 'Open Electric Junction Boxes', 'High Voltage Hazards'],
    squads: [
      'High Voltage Live-Wire Emergency Unit',
      'Hydraulic Bucket Van Streetlight Squad',
      'Substation & Transformer Repair Crew',
      'Cable Fault Locator & Underground Repair Team',
      'Public Park & Highway Lighting Maintenance Squad'
    ],
    slaTarget: '4 - 12 Hours'
  },
  'Public Health Department': {
    title: 'Public Health & Vector Control Cell',
    code: 'HEALTH-CELL',
    icon: HeartPulse,
    color: 'rose',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    themeGradient: 'from-rose-950 via-slate-900 to-rose-950',
    accentColor: '#f43f5e',
    targetIssues: ['Mosquito Breeding Sites', 'Food Safety Hazards', 'Stagnant Chemical Water', 'Epidemic Alert Zones', 'Hospital Waste Disposal'],
    squads: [
      'Vector Control & Larvicide Spray Squad Alpha',
      'Ultra-Low-Volume Fogging & Fumigation Unit',
      'Public Sanitary & Health Inspector Squad',
      'Hazardous Bio-Chemical Neutralization Crew',
      'Waterborne Disease Rapid Assessment Unit'
    ],
    slaTarget: '12 - 24 Hours'
  },
  'Municipal Commissioner': {
    title: 'Municipal Commissioner Executive Command',
    code: 'CITY-OVERLORD',
    icon: ShieldCheck,
    color: 'purple',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    themeGradient: 'from-slate-900 via-indigo-950 to-slate-900',
    accentColor: '#8b5cf6',
    targetIssues: ['All Citywide Public Grievances', 'Cross-Departmental Hazards', 'Emergency Red Alerts', 'Inter-Agency Coordination'],
    squads: [
      'Commissioner Quick Reaction Task Force',
      'Inter-Agency Joint Emergency Task Force',
      'Chief Vigilance & Quality Control Team',
      'Mayor Rapid Citizen Redressal Squad'
    ],
    slaTarget: 'Citywide SLA Oversight'
  }
};

export default function AdminDashboard({
  issues = [],
  onUpdateIssue,
  departmentProp
}) {
  const navigate = useNavigate();
  const { currentUser, isCitizen } = useAuth();

  // Defense-in-depth safety guard: Allow ONLY admins to admin dashboard
  useEffect(() => {
    if (currentUser && isCitizen) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, isCitizen, navigate]);

  // Active Department Selection (defaults to departmentProp or user's assigned department or Water Supply / All)
  const defaultDept = departmentProp || currentUser?.department || 'Water Supply Department';
  const [selectedDeptView, setSelectedDeptView] = useState(defaultDept);

  // Tabs state: 'complaints' | 'map' | 'analytics' | 'ai' | 'users'
  const [activeAdminTab, setActiveAdminTab] = useState('complaints');

  // Grievance search & filters
  const [complaintSearch, setComplaintSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Modals state for rapid resolution
  const [assigningIssue, setAssigningIssue] = useState(null);
  const [resolvingIssue, setResolvingIssue] = useState(null);
  const [targetDept, setTargetDept] = useState(selectedDeptView);
  const [assignedSquad, setAssignedSquad] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Users management state
  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [userStatusFilter, setUserStatusFilter] = useState('All');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    if (departmentProp) {
      setSelectedDeptView(departmentProp);
    } else if (currentUser?.department && currentUser.department !== 'Super Admin') {
      setSelectedDeptView(currentUser.department);
    }
  }, [departmentProp, currentUser]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`);
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      } else {
        throw new Error('API failed');
      }
    } catch {
      setUsersList([
        { id: 1, name: 'City Admin Officer', email: 'admin@smartcity.gov', phone: '+91 9876543210', role: 'admin', department: 'Municipal Commissioner', status: 'active', created_at: '2026-08-01 10:00:00' },
        { id: 24, name: 'Kanmani Raja V', email: 'kanmani.govt@gmail.com', phone: '+91 9876839823', role: 'admin', department: 'Water Supply Department', status: 'active', created_at: '2026-08-18 11:30:00' },
        { id: 7, name: 'Roads & Highways Officer', email: 'roads.admin@smartcity.gov', phone: '+91 9876543215', role: 'admin', department: 'Roads & Highways Department', status: 'active', created_at: '2026-08-15 08:30:00' },
        { id: 8, name: 'Sanitation Officer', email: 'sanitation.admin@smartcity.gov', phone: '+91 9876543216', role: 'admin', department: 'Sanitation Department', status: 'active', created_at: '2026-08-15 08:45:00' },
        { id: 2, name: 'Vinoth Krishna', email: 'vinoth@gmail.com', phone: '+91 9876543211', role: 'citizen', status: 'active', created_at: '2026-08-10 14:30:00' },
        { id: 3, name: 'Rajesh Kumar', email: 'rajesh@gmail.com', phone: '+91 9876543212', role: 'citizen', status: 'active', created_at: '2026-08-12 09:15:00' }
      ]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/toggle-status`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setUsersList(prev => prev.map(u => u.id === userId ? data.user : u));
      } else {
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status: u.status === 'active' ? 'blocked' : 'active' } : u));
      }
    } catch {
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status: u.status === 'active' ? 'blocked' : 'active' } : u));
    }
  };

  // Get active config
  const currentDeptConfig = DEPARTMENT_CONFIGS[selectedDeptView] || DEPARTMENT_CONFIGS['Municipal Commissioner'];
  const DeptIcon = currentDeptConfig.icon || Building2;

  // Filter issues belonging to current department
  const isSuperAdminView = selectedDeptView === 'Municipal Commissioner' || selectedDeptView === 'All Departments' || selectedDeptView === 'Super Admin';
  
  const deptIssues = isSuperAdminView
    ? issues
    : issues.filter(i => {
        const d = (i.department || i.assigned_department || '').toLowerCase();
        const searchKeyword = selectedDeptView.toLowerCase().split(' ')[0]; // e.g. 'water', 'roads', 'sanitation'
        return d.includes(searchKeyword) || d.includes(selectedDeptView.toLowerCase());
      });

  // Department KPI stats
  const totalDeptCount = deptIssues.length;
  const urgentDeptCount = deptIssues.filter(i => (i.priority === 'Urgent' || i.priority_level === 'CRITICAL') && i.status !== 'Resolved').length;
  const inProgressDeptCount = deptIssues.filter(i => i.status === 'In Progress' || i.status === 'Assigned').length;
  const underReviewDeptCount = deptIssues.filter(i => ['Submitted', 'Under Review'].includes(i.status)).length;
  const resolvedDeptCount = deptIssues.filter(i => i.status === 'Resolved').length;
  const resolutionRate = totalDeptCount > 0 ? Math.round((resolvedDeptCount / totalDeptCount) * 100) : 100;
  const criticalIncidents = deptIssues.filter(i => (i.priority_level === 'CRITICAL' || i.priority === 'Urgent') && i.status !== 'Resolved');

  // Filtered grievances table data
  const filteredDeptIssues = deptIssues.filter(issue => {
    const q = complaintSearch.toLowerCase().trim();
    const matchesSearch = !q ||
      String(issue.issue_id) === q ||
      (issue.title || '').toLowerCase().includes(q) ||
      (issue.location || '').toLowerCase().includes(q) ||
      (issue.reporter_name || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'All' || issue.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || issue.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Action handlers
  const handleAdvanceStatus = (issue) => {
    const statusFlow = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved'];
    const currentIdx = statusFlow.indexOf(issue.status);
    if (currentIdx >= 0 && currentIdx < statusFlow.length - 1) {
      const nextStatus = statusFlow[currentIdx + 1];
      if (nextStatus === 'Resolved') {
        setResolvingIssue(issue);
        setResolutionNotes(`Issue successfully rectified and field tested by ${selectedDeptView} squad.`);
      } else {
        onUpdateIssue(issue.issue_id, {
          status: nextStatus,
          department: issue.department || selectedDeptView,
          assigned_to: issue.assigned_to || currentDeptConfig.squads[0]
        });
      }
    }
  };

  const handleOpenAssignModal = (issue) => {
    setAssigningIssue(issue);
    setTargetDept(issue.department || selectedDeptView);
    setAssignedSquad(issue.assigned_to || currentDeptConfig.squads[0]);
  };

  const handleSaveAssign = () => {
    if (!assigningIssue) return;
    setIsUpdating(true);
    onUpdateIssue(assigningIssue.issue_id, {
      department: targetDept,
      assigned_to: assignedSquad,
      status: 'Assigned'
    });
    setTimeout(() => {
      setIsUpdating(false);
      setAssigningIssue(null);
    }, 400);
  };

  const handleConfirmResolve = (e) => {
    e.preventDefault();
    if (!resolvingIssue) return;
    setIsUpdating(true);
    onUpdateIssue(resolvingIssue.issue_id, {
      status: 'Resolved',
      resolution_notes: resolutionNotes || `Resolved by ${selectedDeptView}`
    });
    setTimeout(() => {
      setIsUpdating(false);
      setResolvingIssue(null);
      setResolutionNotes('');
    }, 400);
  };

  const exportDepartmentCSV = () => {
    const headers = ['ID', 'Title', 'Category', 'Status', 'Priority', 'Department', 'Assigned Squad', 'Location', 'Latitude', 'Longitude', 'Reporter', 'Created At'];
    const rows = filteredDeptIssues.map(i => [
      i.issue_id,
      `"${(i.title || '').replace(/"/g, '""')}"`,
      `"${(i.category || 'General').replace(/"/g, '""')}"`,
      `"${i.status || 'Submitted'}"`,
      `"${i.priority || 'Medium'}"`,
      `"${(i.department || selectedDeptView).replace(/"/g, '""')}"`,
      `"${(i.assigned_to || 'Unassigned').replace(/"/g, '""')}"`,
      `"${(i.location || '').replace(/"/g, '""')}"`,
      i.latitude || '',
      i.longitude || '',
      `"${(i.reporter_name || 'Citizen').replace(/"/g, '""')}"`,
      `"${i.created_at || new Date().toISOString()}"`
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `${selectedDeptView.toLowerCase().replace(/ /g, '_')}_grievances_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleExportCSV = exportDepartmentCSV;

  const departmentList = [
    { key: 'Roads & Highways Department', label: 'Roads & Highways', icon: Construction, code: 'PWD-ROADS', path: '/admin/roads', color: '#f59e0b' },
    { key: 'Sanitation Department', label: 'Sanitation & Waste', icon: Trash2, code: 'SAN-CLEAN', path: '/admin/sanitation', color: '#10b981' },
    { key: 'Water Supply Department', label: 'Water Supply', icon: Droplets, code: 'WATER-SUPPLY', path: '/admin/water', color: '#06b6d4' },
    { key: 'Electricity Department', label: 'Electricity Grid', icon: Zap, code: 'ELEC-POWER', path: '/admin/electricity', color: '#eab308' },
    { key: 'Drainage & Sewer Department', label: 'Drainage & Sewer', icon: Waves, code: 'DRAIN-SEWER', path: '/admin/drainage', color: '#6366f1' },
    { key: 'Public Health Department', label: 'Public Health', icon: HeartPulse, code: 'HEALTH-CELL', path: '/admin/health', color: '#f43f5e' },
    { key: 'Municipal Commissioner', label: 'Commissioner Master', icon: ShieldCheck, code: 'CITY-OVERLORD', path: '/admin/commissioner', color: '#8b5cf6' }
  ];

  return (
    <div className="admin-dashboard-container max-w-[1280px] mx-auto space-y-6 animate-fade-in pb-12">
      {/* ══════════════════════════════════════════════════════════════
          0. DEDICATED DEPARTMENT PORTALS SWITCHER RIBBON
      ══════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2 pr-1 flex items-center gap-1.5 shrink-0">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Portals:</span>
          </div>

          {departmentList.map(dept => {
            const isCurrent = selectedDeptView === dept.key;
            const DeptBtnIcon = dept.icon;
            const count = dept.key === 'Municipal Commissioner'
              ? issues.filter(i => i.status !== 'Resolved').length
              : issues.filter(i => (i.department || i.assigned_department || '').toLowerCase().includes(dept.key.toLowerCase().split(' ')[0]) && i.status !== 'Resolved').length;

            return (
              <button
                key={dept.key}
                type="button"
                onClick={() => {
                  setSelectedDeptView(dept.key);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <DeptBtnIcon className="w-3.5 h-3.5" style={{ color: isCurrent ? '#a5b4fc' : dept.color }} />
                <span>{dept.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  isCurrent ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          1. DEPARTMENT HERO COMMAND HEADER & SELECTOR
      ══════════════════════════════════════════════════════════════ */}
      <div className={`bg-gradient-to-br ${currentDeptConfig.themeGradient} p-6 sm:p-8 rounded-3xl text-white shadow-2xl border border-white/10 relative overflow-hidden`}>
        {/* Ambient background glow */}
        <div
          className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: currentDeptConfig.accentColor }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black border ${currentDeptConfig.badgeClass}`}>
                <DeptIcon className="w-4 h-4" />
                <span>{currentDeptConfig.code}</span>
              </span>
              <span className="text-xs text-slate-300 font-mono bg-white/10 px-3 py-1 rounded-full border border-white/10">
                OFFICER: {currentUser?.name || 'Department Administrator'} {currentUser?.department ? `• ${currentUser.department}` : ''}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white m-0 tracking-tight">
              {currentDeptConfig.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed m-0">
              Direct telemetry triage, field squad dispatch, automated SLA enforcement, and 2-way citizen communication for municipal grievances.
            </p>
          </div>

          {/* Department Switcher Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto bg-black/30 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="text-xs font-bold text-slate-300 whitespace-nowrap flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span>Department View:</span>
            </div>
            <select
              value={selectedDeptView}
              onChange={(e) => setSelectedDeptView(e.target.value)}
              className="bg-slate-900/90 text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/20 focus:outline-none focus:border-indigo-400 cursor-pointer"
            >
              <option value="Municipal Commissioner">🏛️ All Departments (Commissioner Oversight)</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 🚨 REAL-TIME CRITICAL INCIDENT ALERT BANNER */}
      {criticalIncidents.length > 0 && (
        <div className="bg-rose-600 text-white p-4 sm:p-5 rounded-2xl shadow-xl border border-rose-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0 font-bold text-xl">
              🚨
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base text-white">
                {selectedDeptView} — {criticalIncidents.length} CRITICAL HAZARD{criticalIncidents.length > 1 ? 'S' : ''} DETECTED
              </div>
              <div className="text-xs text-rose-100">
                High-risk public incidents require emergency squad dispatch within {currentDeptConfig.slaTarget}.
              </div>
            </div>
          </div>

          <button
            type="button"
            className="px-5 py-2.5 bg-white text-rose-700 font-black text-xs rounded-xl hover:bg-rose-50 transition-colors shadow-md shrink-0 flex items-center gap-1.5 cursor-pointer"
            onClick={() => navigate(`/issue/${criticalIncidents[0].issue_id}`)}
          >
            <span>Dispatch Issue #{criticalIncidents[0].issue_id}</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          2. DEPARTMENT OPERATIONAL KPI CARDS (5 EQUAL-HEIGHT CARDS)
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Total Dept Logged */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dept Volume</span>
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalDeptCount}</div>
            <div className="text-[11px] text-slate-400 font-semibold mt-1">Total Logged</div>
          </div>
        </div>

        {/* Critical & Urgent */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Urgent Alerts</span>
            <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600">{urgentDeptCount}</div>
            <div className="text-[11px] text-rose-500 font-semibold mt-1">Under SLA Clock</div>
          </div>
        </div>

        {/* In Progress / Squad Dispatched */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-cyan-600 uppercase tracking-wider">Field Action</span>
            <div className="w-9 h-9 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-600">{inProgressDeptCount}</div>
            <div className="text-[11px] text-cyan-600 font-semibold mt-1">Squads Deployed</div>
          </div>
        </div>

        {/* Under Review */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Under Review</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600">{underReviewDeptCount}</div>
            <div className="text-[11px] text-amber-600 font-semibold mt-1">Awaiting Triage</div>
          </div>
        </div>

        {/* Successfully Resolved */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Resolved</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">{resolvedDeptCount}</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">{resolutionRate}% Resolution Rate</div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          3. NAVIGATION TABS BAR
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
          <button
            type="button"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeAdminTab === 'complaints' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveAdminTab('complaints')}
          >
            <Table2 className="w-4 h-4 text-indigo-500" />
            <span>Department Grievance Triage ({filteredDeptIssues.length})</span>
          </button>

          <button
            type="button"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeAdminTab === 'map' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveAdminTab('map')}
          >
            <MapPin className="w-4 h-4 text-rose-500" />
            <span>Live Department GIS Map</span>
          </button>

          <button
            type="button"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeAdminTab === 'ai' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveAdminTab('ai')}
          >
            <Brain className="w-4 h-4 text-purple-500" />
            <span>AI Predictive Telemetry</span>
          </button>

          <button
            type="button"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeAdminTab === 'analytics' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveAdminTab('analytics')}
          >
            <BarChart3 className="w-4 h-4 text-cyan-500" />
            <span>SLA Performance Metrics</span>
          </button>

          <button
            type="button"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeAdminTab === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveAdminTab('users')}
          >
            <Users className="w-4 h-4 text-slate-600" />
            <span>Citizen Directory</span>
          </button>
        </div>

        {/* CSV Export Button */}
        <button
          type="button"
          className="btn-secondary-outline text-xs px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm hover:bg-slate-50 cursor-pointer"
          onClick={exportDepartmentCSV}
        >
          <Download className="w-4 h-4 text-indigo-600" />
          <span>Export Department CSV</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: DEPARTMENT COMPLAINTS REGISTRY & ACTION CENTER
      ══════════════════════════════════════════════════════════════ */}
      {activeAdminTab === 'complaints' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by ID, title, ward, citizen..."
                  value={complaintSearch}
                  onChange={(e) => setComplaintSearch(e.target.value)}
                  className="input-text w-full text-xs"
                  style={{ paddingLeft: '2.65rem' }}
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-select text-xs font-semibold"
              >
                <option value="All">All Resolution Stages</option>
                <option value="Submitted">Submitted (New)</option>
                <option value="Under Review">Under Review</option>
                <option value="Assigned">Assigned to Squad</option>
                <option value="In Progress">In Progress (Field Action)</option>
                <option value="Resolved">Resolved & Closed</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="input-select text-xs font-semibold"
              >
                <option value="All">All Priority Levels</option>
                <option value="Urgent">Urgent / Critical</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Complaints Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                    <th className="py-4 px-4 font-bold">ID</th>
                    <th className="py-4 px-4 font-bold">Complaint Title & Location</th>
                    <th className="py-4 px-4 font-bold">Priority</th>
                    <th className="py-4 px-4 font-bold">Assigned Squad / Officer</th>
                    <th className="py-4 px-4 font-bold">Status</th>
                    <th className="py-4 px-4 font-bold">Date</th>
                    <th className="py-4 px-4 font-bold text-right">Rapid Department Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeptIssues.map(issue => {
                    const isUrgent = issue.priority === 'Urgent' || issue.priority_level === 'CRITICAL';
                    return (
                      <tr
                        key={issue.issue_id}
                        className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${
                          isUrgent && issue.status !== 'Resolved' ? 'bg-rose-50/40' : ''
                        }`}
                      >
                        {/* ID */}
                        <td className="py-4 px-4 font-mono font-black text-indigo-600">
                          #{issue.issue_id}
                        </td>

                        {/* Title & Location */}
                        <td className="py-4 px-4 max-w-[280px]">
                          <div className="font-extrabold text-slate-900 truncate">{issue.title}</div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            📍 {issue.location || 'City Ward Area'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            By {issue.reporter_name || 'Citizen'}
                          </div>
                        </td>

                        {/* Priority */}
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isUrgent ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : issue.priority === 'High' ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {issue.priority || 'Medium'}
                          </span>
                        </td>

                        {/* Assigned Squad */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-800 text-xs">
                            {issue.assigned_to || 'Unassigned Squad'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {issue.department || selectedDeptView}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                            issue.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : issue.status === 'In Progress' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            : issue.status === 'Assigned' ? 'bg-cyan-100 text-cyan-700 border border-cyan-200'
                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            {issue.status}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-4 px-4 text-slate-500 font-medium whitespace-nowrap">
                          {issue.created_at || 'Recently'}
                        </td>

                        {/* Rapid Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Advance Status Button */}
                            {issue.status !== 'Resolved' && (
                              <button
                                type="button"
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                onClick={() => handleAdvanceStatus(issue)}
                                title="Advance to next resolution milestone"
                              >
                                <span>Advance</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Assign Squad Modal Trigger */}
                            <button
                              type="button"
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer"
                              onClick={() => handleOpenAssignModal(issue)}
                              title="Assign Department Field Squad"
                            >
                              Squad
                            </button>

                            {/* Resolve Modal Trigger */}
                            {issue.status !== 'Resolved' && (
                              <button
                                type="button"
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-all cursor-pointer"
                                onClick={() => handleOpenResolveModal(issue)}
                                title="Mark Resolved with official remarks"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Full Details & Chat */}
                            <button
                              type="button"
                              className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              onClick={() => navigate(`/issue/${issue.issue_id}`)}
                              title="Open 2-Way Official Dialogue"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredDeptIssues.length === 0 && (
                <div className="py-16 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-800 m-0">No Grievances Found</h4>
                  <p className="text-xs text-slate-400">All public issues for {selectedDeptView} are currently cleared or match none of the active filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: LIVE GIS DEPARTMENT HAZARD MAP
      ══════════════════════════════════════════════════════════════ */}
      {activeAdminTab === 'map' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 m-0">
                Live {selectedDeptView} Geospatial Hazard Map
              </h3>
              <p className="text-xs text-slate-500 m-0">
                Interactive GPS mapping of all citizen-reported hazards across municipal wards.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              📍 {deptIssues.filter(i => i.latitude && i.longitude).length} Mapped Incidents
            </span>
          </div>

          <LeafletMap issues={deptIssues} height="560px" />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: AI PREDICTIVE TELEMETRY & ESCALATIONS
      ══════════════════════════════════════════════════════════════ */}
      {activeAdminTab === 'ai' && (
        <AIPriorityPanel issues={deptIssues} />
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 4: DEPARTMENT PERFORMANCE ANALYTICS
      ══════════════════════════════════════════════════════════════ */}
      {activeAdminTab === 'analytics' && (
        <AnalyticsView issues={deptIssues} />
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 5: CITIZEN DIRECTORY & ACCESS MANAGEMENT
      ══════════════════════════════════════════════════════════════ */}
      {activeAdminTab === 'users' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 m-0">Registered Citizens & Officers Directory ({usersList.length})</h3>
              <p className="text-xs text-slate-500 m-0">Manage registered citizen access, view verification statuses, and toggle account states.</p>
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="h-10 px-3 text-xs rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none flex-1 sm:w-60"
              />

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="h-10 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
              >
                <option value="All">All Roles</option>
                <option value="citizen">Citizens Only</option>
                <option value="admin">Administrators Only</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="h-10 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
              >
                <option value="All">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="blocked">Blocked Only</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                  <th className="py-3.5 px-4 font-bold">User ID</th>
                  <th className="py-3.5 px-4 font-bold">Full Name & Email</th>
                  <th className="py-3.5 px-4 font-bold">Phone</th>
                  <th className="py-3.5 px-4 font-bold">Role & Dept</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold">Registered At</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList
                  .filter(u => {
                    const q = userSearch.toLowerCase();
                    const matchesQ = !q || (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
                    const matchesR = userRoleFilter === 'All' || u.role === userRoleFilter;
                    const matchesS = userStatusFilter === 'All' || u.status === userStatusFilter;
                    return matchesQ && matchesR && matchesS;
                  })
                  .map(user => (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">#{user.id}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{user.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{user.phone || 'N/A'}</td>
                      <td className="py-3.5 px-4">
                        {user.role === 'admin' ? (
                          <div>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                              ADMIN
                            </span>
                            {user.department && (
                              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">{user.department}</div>
                            )}
                          </div>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            CITIZEN
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${user.status === 'blocked' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {user.status || 'active'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-semibold">{user.created_at || 'Recently'}</td>
                      <td className="py-3.5 px-4 text-right">
                        {user.role !== 'admin' && (
                          <button
                            type="button"
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ml-auto cursor-pointer ${
                              user.status === 'blocked'
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-rose-600 text-white hover:bg-rose-700'
                            }`}
                            onClick={() => handleToggleUserStatus(user.id)}
                          >
                            {user.status === 'blocked' ? (
                              <><Unlock className="w-3.5 h-3.5" /> Unblock</>
                            ) : (
                              <><Lock className="w-3.5 h-3.5" /> Block</>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: ASSIGN DEPARTMENT & FIELD SQUAD
      ══════════════════════════════════════════════════════════════ */}
      {assigningIssue && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">OFFICIAL SQUAD DISPATCH</span>
                <h3 className="text-base font-black text-slate-900 m-0">Assign Squad — Issue #{assigningIssue.issue_id}</h3>
              </div>
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
                onClick={() => setAssigningIssue(null)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
              <div className="font-extrabold text-slate-900">{assigningIssue.title}</div>
              <div className="text-slate-500 mt-0.5">📍 {assigningIssue.location}</div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Municipal Department</label>
                <select
                  value={targetDept}
                  onChange={(e) => {
                    setTargetDept(e.target.value);
                    const cfg = DEPARTMENT_CONFIGS[e.target.value];
                    if (cfg && cfg.squads.length > 0) {
                      setAssignedSquad(cfg.squads[0]);
                    }
                  }}
                  className="input-select w-full text-xs font-bold"
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Department Field Squad / Officer</label>
                <select
                  value={assignedSquad}
                  onChange={(e) => setAssignedSquad(e.target.value)}
                  className="input-select w-full text-xs font-bold"
                >
                  {(DEPARTMENT_CONFIGS[targetDept]?.squads || currentDeptConfig.squads).map(sq => (
                    <option key={sq} value={sq}>{sq}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                className="btn-secondary-flat text-xs px-4 py-2.5 rounded-xl font-bold cursor-pointer"
                onClick={() => setAssigningIssue(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary-gradient text-xs px-6 py-2.5 rounded-xl font-bold cursor-pointer"
                onClick={handleSaveAssign}
                disabled={isUpdating}
              >
                {isUpdating ? 'Dispatching…' : 'Confirm Squad Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: RESOLVE GRIEVANCE WITH PROOF & REMARKS
      ══════════════════════════════════════════════════════════════ */}
      {resolvingIssue && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">OFFICIAL CLOSURE CERTIFICATE</span>
                <h3 className="text-base font-black text-slate-900 m-0">Mark Resolved — Issue #{resolvingIssue.issue_id}</h3>
              </div>
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
                onClick={() => setResolvingIssue(null)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-xs">
              <div className="font-extrabold text-emerald-900">{resolvingIssue.title}</div>
              <div className="text-emerald-700 mt-0.5">📍 {resolvingIssue.location}</div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Official Resolution Remarks & Repair Summary *</label>
              <textarea
                rows="3"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Detail repair actions, replacement parts, before/after inspection notes..."
                className="input-textarea w-full text-xs font-medium"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                className="btn-secondary-flat text-xs px-4 py-2.5 rounded-xl font-bold cursor-pointer"
                onClick={() => setResolvingIssue(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                onClick={handleSaveResolve}
                disabled={isUpdating}
              >
                {isUpdating ? 'Closing Issue…' : 'Confirm Resolution & Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
