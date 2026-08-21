import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  LineElement,
  PointElement,
  Filler
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  Layers,
  Building2,
  Brain,
  ShieldCheck,
  Download,
  Filter,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Zap,
  RefreshCw,
  FileText,
  Printer,
  Award,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Search
} from 'lucide-react';
import LeafletMap from './LeafletMap';
import { useAnalyticsSummary, useDataSync } from '../hooks/useDataSync';

// Register ChartJS plugins
ChartJS.register(
  ArcElement,
  ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  LineElement,
  PointElement,
  Filler
);

const API_BASE = 'http://127.0.0.1:5000';

// SLA Benchmark by priority (hours)
const SLA_BENCHMARKS = {
  Urgent: 24,
  High: 48,
  Medium: 72,
  Low: 168
};

// Colors mapping
const CATEGORY_COLORS = {
  'Pothole': '#ef4444',             // Red
  'Garbage Dump': '#f59e0b',        // Amber
  'Water Leakage': '#0ea5e9',       // Cyan
  'Streetlight Failure': '#8b5cf6', // Violet
  'Drainage Blockage': '#10b981',   // Emerald
  'Other': '#64748b'
};

// ── Skeleton Loader Card ─────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-pulse">
      <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
      <div className="h-8 w-16 bg-slate-200 rounded mb-2" />
      <div className="h-2 w-32 bg-slate-100 rounded" />
    </div>
  );
}

export default function AnalyticsView({ issues: propIssues = [] }) {
  const navigate = useNavigate();

  // ── Self-Fetching: Pull live issues and analytics summary ──────────────────
  const { issues: liveIssues, loading: issuesLoading, error: issuesError, refresh: refreshIssues, lastUpdated } = useDataSync({ refreshInterval: 60_000 });
  const { summary, loading: summaryLoading, error: summaryError, refresh: refreshSummary } = useAnalyticsSummary({ refreshInterval: 60_000 });

  // Use live data if available, fallback to prop
  const issues = (liveIssues && liveIssues.length > 0) ? liveIssues : propIssues;
  const isLoading = (issuesLoading || summaryLoading) && issues.length === 0;
  const hasError  = issuesError && propIssues.length === 0;

  const handleRefresh = useCallback(() => {
    refreshIssues();
    refreshSummary();
  }, [refreshIssues, refreshSummary]);

  // ── Smart Filters State ──
  const [dateRange, setDateRange]           = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter]     = useState('All');
  const [deptFilter, setDeptFilter]         = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [areaSearch, setAreaSearch]         = useState('');
  const [trendResolution, setTrendResolution] = useState('monthly');

  // ── Filtered Issues Computation ──
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      // Date filter
      if (dateRange !== 'all') {
        const issueDate = new Date(issue.created_at || Date.now());
        const now = new Date();
        if (dateRange === 'today') {
          const isToday = issueDate.toDateString() === now.toDateString();
          if (!isToday) return false;
        } else if (dateRange === '7days') {
          const diffDays = (now - issueDate) / (1000 * 60 * 60 * 24);
          if (diffDays > 7) return false;
        } else if (dateRange === 'month') {
          const diffDays = (now - issueDate) / (1000 * 60 * 60 * 24);
          if (diffDays > 30) return false;
        } else if (dateRange === '90days') {
          const diffDays = (now - issueDate) / (1000 * 60 * 60 * 24);
          if (diffDays > 90) return false;
        }
      }

      // Category filter
      if (categoryFilter !== 'All' && issue.category !== categoryFilter) return false;
      // Status filter
      if (statusFilter !== 'All' && issue.status !== statusFilter) return false;
      // Department filter
      if (deptFilter !== 'All' && (issue.department || 'Unassigned') !== deptFilter) return false;
      // Priority filter
      if (priorityFilter !== 'All' && issue.priority !== priorityFilter) return false;
      // Area/Ward search
      if (areaSearch) {
        const query = areaSearch.toLowerCase();
        const loc = (issue.location || '').toLowerCase();
        const addr = (issue.address || '').toLowerCase();
        const title = (issue.title || '').toLowerCase();
        if (!loc.includes(query) && !addr.includes(query) && !title.includes(query)) return false;
      }

      return true;
    });
  }, [issues, dateRange, categoryFilter, statusFilter, deptFilter, priorityFilter, areaSearch]);

  // ── 1. Overview KPI Calculations ──
  const kpis = useMemo(() => {
    const total = filteredIssues.length;
    const resolved = filteredIssues.filter(i => i.status === 'Resolved').length;
    const active = filteredIssues.filter(i => !['Resolved', 'Rejected'].includes(i.status)).length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;

    // High & Urgent priority
    const highPriority = filteredIssues.filter(i => i.priority === 'High' || i.priority === 'Urgent').length;

    // Today & Month complaints
    const now = new Date();
    const todayCount = filteredIssues.filter(i => {
      if (!i.created_at) return false;
      return new Date(i.created_at).toDateString() === now.toDateString();
    }).length;

    const monthCount = filteredIssues.filter(i => {
      if (!i.created_at) return true;
      const d = new Date(i.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    // Average Resolution Time (hours)
    let totalResHours = 0;
    let resCount = 0;
    filteredIssues.forEach(i => {
      if (i.status === 'Resolved') {
        const age = i.age_hours || 0;
        totalResHours += age;
        resCount++;
      }
    });
    const avgResTime = resCount > 0 ? (totalResHours / resCount).toFixed(1) : '0';

    return {
      total,
      active,
      resolved,
      resolutionRate,
      avgResTime,
      highPriority,
      todayCount,
      monthCount
    };
  }, [filteredIssues]);

  // ── 2. Citizen Insights Calculation ──
  const citizenInsights = useMemo(() => {
    if (filteredIssues.length === 0) {
      return {
        topCategory: 'None',
        topCategoryPct: 0,
        fastestDept: 'None',
        fastestDeptTime: '-',
        slowestDept: 'None',
        slowestDeptTime: '-',
        topWard: 'None',
        topWardCount: 0,
        efficiencyScore: 100,
        monthlyImprovement: '0%'
      };
    }

    // Category frequency
    const catMap = {};
    filteredIssues.forEach(i => {
      catMap[i.category] = (catMap[i.category] || 0) + 1;
    });
    let topCat = 'None', topCatCount = 0;
    Object.entries(catMap).forEach(([cat, count]) => {
      if (count > topCatCount) {
        topCatCount = count;
        topCat = cat;
      }
    });
    const topCategoryPct = filteredIssues.length > 0 ? Math.round((topCatCount / filteredIssues.length) * 100) : 0;

    // Department Resolution Speed
    const deptTimes = {};
    filteredIssues.forEach(i => {
      const dept = i.department || 'General Administration';
      if (!deptTimes[dept]) deptTimes[dept] = { totalHours: 0, count: 0, resolved: 0, total: 0 };
      deptTimes[dept].total++;
      if (i.status === 'Resolved') {
        deptTimes[dept].resolved++;
        deptTimes[dept].totalHours += (i.age_hours || 0);
        deptTimes[dept].count++;
      }
    });

    let fastestDept = 'None', minAvg = 999999;
    let slowestDept = 'None', maxAvg = 0;

    Object.entries(deptTimes).forEach(([dept, stats]) => {
      if (stats.count > 0) {
        const avg = stats.totalHours / stats.count;
        if (avg < minAvg) { minAvg = avg; fastestDept = dept; }
        if (avg > maxAvg) { maxAvg = avg; slowestDept = dept; }
      }
    });

    // Top Ward / Area
    const wardMap = {};
    filteredIssues.forEach(i => {
      const ward = (i.location || i.area || 'City Area').split(',')[0].trim();
      wardMap[ward] = (wardMap[ward] || 0) + 1;
    });
    let topWard = 'None', maxWardCount = 0;
    Object.entries(wardMap).forEach(([w, c]) => {
      if (c > maxWardCount) { maxWardCount = c; topWard = w; }
    });

    // Efficiency Score (0-100)
    const slaCompliantCount = filteredIssues.filter(i => !i.is_sla_breached).length;
    const efficiencyScore = Math.min(100, Math.round(
      (kpis.resolutionRate * 0.5) + ((slaCompliantCount / Math.max(1, filteredIssues.length)) * 50)
    ));

    return {
      topCategory: topCat,
      topCategoryPct,
      fastestDept: minAvg < 999999 ? fastestDept.split('&')[0].trim() : 'None',
      fastestDeptTime: minAvg < 999999 ? `${minAvg.toFixed(1)}h` : '-',
      slowestDept: maxAvg > 0 ? slowestDept.split('&')[0].trim() : 'None',
      slowestDeptTime: maxAvg > 0 ? `${maxAvg.toFixed(1)}h` : '-',
      topWard,
      topWardCount: maxWardCount,
      efficiencyScore,
      monthlyImprovement: kpis.resolved > 0 ? `${Math.round((kpis.resolved / Math.max(1, kpis.total)) * 100)}%` : '0%'
    };
  }, [filteredIssues, kpis]);

  // ── 3. Chart Data Preparation ──
  const categoriesList = ['Pothole', 'Garbage Dump', 'Water Leakage', 'Streetlight Failure', 'Drainage Blockage', 'Public Health Hazard'];
  const catCounts = categoriesList.map(cat => filteredIssues.filter(i => i.category === cat).length);

  const categoryChartData = {
    labels: categoriesList,
    datasets: [{
      label: 'Complaints',
      data: catCounts,
      backgroundColor: ['#ef4444', '#f59e0b', '#0ea5e9', '#8b5cf6', '#10b981', '#ec4899'],
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  };

  // Pipeline Funnel counts
  const pipelineStages = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved'];
  const pipelineCounts = pipelineStages.map(s => filteredIssues.filter(i => i.status === s).length);

  // Department Performance Table Data
  const deptPerformanceData = useMemo(() => {
    const depts = [
      'Roads & Highways Department',
      'Sanitation Department',
      'Water Supply Department',
      'Electricity Department',
      'Drainage & Sewer Department',
      'Public Health Department'
    ];
    return depts.map(dept => {
      const deptIssues = filteredIssues.filter(i => (i.department || i.assigned_department || '') === dept);
      const total = deptIssues.length;
      const resolved = deptIssues.filter(i => i.status === 'Resolved').length;
      const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
      
      let sumH = 0, countH = 0;
      deptIssues.forEach(i => {
        if (i.status === 'Resolved') {
          sumH += (i.age_hours || 0);
          countH++;
        }
      });
      const avgHours = countH > 0 ? (sumH / countH).toFixed(1) : '-';
      const statusBadge = total === 0 ? 'No Complaints' : rate >= 80 ? 'High Efficiency' : rate >= 50 ? 'On Track' : 'Needs Attention';

      return {
        dept,
        total,
        resolved,
        rate,
        avgHours,
        statusBadge
      };
    });
  }, [filteredIssues]);

  // Department Bar Chart Data
  const deptChartData = {
    labels: deptPerformanceData.map(d => d.dept.replace(' Department', '').split('&')[0].trim()),
    datasets: [
      {
        label: 'Total Assigned',
        data: deptPerformanceData.map(d => d.total),
        backgroundColor: '#818cf8',
        borderRadius: 6
      },
      {
        label: 'Resolved',
        data: deptPerformanceData.map(d => d.resolved),
        backgroundColor: '#10b981',
        borderRadius: 6
      }
    ]
  };

  // Priority Distribution Chart
  const priorityList = ['Low', 'Medium', 'High', 'Urgent'];
  const priorityCounts = priorityList.map(p => filteredIssues.filter(i => i.priority === p).length);

  const priorityChartData = {
    labels: priorityList,
    datasets: [{
      data: priorityCounts,
      backgroundColor: ['#64748b', '#3b82f6', '#f59e0b', '#ef4444'],
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  };

  // Trend Line Chart Data — use backend monthly_trends when available, else real zeros
  const backendMonthly = summary?.monthly_trends || [];
  const trendLabels = backendMonthly.length > 0
    ? backendMonthly.map(m => m.month)
    : trendResolution === 'daily'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : trendResolution === 'weekly'
    ? ['Week 1', 'Week 2', 'Week 3', 'Week 4']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  const trendReported = backendMonthly.length > 0
    ? backendMonthly.map(m => m.total)
    : trendLabels.map(() => 0);

  const trendResolved = backendMonthly.length > 0
    ? backendMonthly.map(m => m.resolved)
    : trendLabels.map(() => 0);

  const trendChartData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Reported Complaints',
        data: trendReported,
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Resolved Complaints',
        data: trendResolved,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  // ── Export Handlers ──
  const handleExportCSV = () => {
    const headers = ['Issue ID', 'Title', 'Category', 'Status', 'Priority', 'Department', 'Location', 'Upvotes', 'Created At'];
    const rows = filteredIssues.map(i => [
      i.issue_id,
      `"${(i.title || '').replace(/"/g, '""')}"`,
      i.category,
      i.status,
      i.priority,
      `"${i.department || 'Unassigned'}"`,
      `"${(i.location || '').replace(/"/g, '""')}"`,
      i.upvotes || 1,
      i.created_at || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `city_analytics_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const activeFilterCount = (dateRange !== 'all' ? 1 : 0) +
    (categoryFilter !== 'All' ? 1 : 0) +
    (statusFilter !== 'All' ? 1 : 0) +
    (deptFilter !== 'All' ? 1 : 0) +
    (priorityFilter !== 'All' ? 1 : 0) +
    (areaSearch ? 1 : 0);

  const resetFilters = () => {
    setDateRange('all');
    setCategoryFilter('All');
    setStatusFilter('All');
    setDeptFilter('All');
    setPriorityFilter('All');
    setAreaSearch('');
  };

  // ── Early returns for loading / error states ────────────────────────────
  if (isLoading) {
    return (
      <div className="city-analytics-root space-y-8">
        <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200">
          <div>
            <div className="h-3 w-32 bg-slate-200 rounded animate-pulse mb-2" />
            <div className="h-7 w-64 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="h-8 w-28 bg-slate-100 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 animate-pulse">
              <div className="h-4 w-36 bg-slate-200 rounded mb-4" />
              <div className="h-48 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 bg-white rounded-2xl border border-rose-200 p-10 space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-3xl">📡</div>
        <h2 className="text-lg font-extrabold text-slate-800">Analytics Unavailable</h2>
        <p className="text-sm text-slate-500 text-center max-w-sm">
          Could not connect to the Flask backend at <code className="bg-slate-100 px-1 rounded">localhost:5000</code>. Make sure the server is running.
        </p>
        <p className="text-xs text-rose-500">{issuesError}</p>
        <button
          onClick={handleRefresh}
          className="btn-primary-gradient text-xs flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="city-analytics-root space-y-8">

      {/* ── Header & Action Toolbar ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-cat-sm bg-indigo-50 text-indigo-700 font-bold flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" /> SMART CITY GOVERNANCE
            </span>
            <span className="text-xs font-semibold text-slate-400">Live Telemetry & AI Analytics</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 m-0">City Grievance & Resolution Analytics</h1>
          <p className="text-xs text-slate-500 mt-1 m-0">
            Actionable insights, department response speed, resolution pipeline funnel, and predictive AI telemetry.
          </p>
        </div>

        {/* Export Buttons + Refresh */}
        <div className="flex items-center gap-3 flex-wrap">
          {lastUpdated && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}

          <button
            className="btn-secondary-flat font-bold text-xs flex items-center gap-1.5"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
            <span>Refresh Data</span>
          </button>

          <button className="btn-secondary-flat font-bold text-xs flex items-center gap-1.5" onClick={handleExportCSV}>
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button className="btn-secondary-flat font-bold text-xs flex items-center gap-1.5" onClick={handlePrintPDF}>
            <Printer className="w-4 h-4 text-indigo-600" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* ── SMART DYNAMIC FILTERS BAR ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm text-slate-900 m-0">Smart Dynamic Filters</h3>
            {activeFilterCount > 0 && (
              <span className="badge-cat-sm bg-indigo-600 text-white font-extrabold">
                {activeFilterCount} Active
              </span>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Date Range */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Date Window</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input-select text-xs w-full"
            >
              <option value="all">All Time</option>
              <option value="today">Today Only</option>
              <option value="7days">Last 7 Days</option>
              <option value="month">This Month (30 Days)</option>
              <option value="90days">Last 90 Days</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-select text-xs w-full"
            >
              <option value="All">All Categories</option>
              {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-select text-xs w-full"
            >
              <option value="All">All Statuses</option>
              {pipelineStages.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Department</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="input-select text-xs w-full"
            >
              <option value="All">All Departments</option>
              <option value="Roads & PWD">Roads & PWD</option>
              <option value="Sanitation & Waste">Sanitation & Waste</option>
              <option value="Water Works & Sewerage">Water Works</option>
              <option value="Electrical & Energy">Electrical & Energy</option>
              <option value="Storm Drain Management">Storm Drains</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input-select text-xs w-full"
            >
              <option value="All">All Priorities</option>
              {priorityList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Ward Search */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase mb-1 block">Ward / Area Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Ward 4, Market..."
                value={areaSearch}
                onChange={(e) => setAreaSearch(e.target.value)}
                className="input-text text-xs w-full pr-7"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 8 OVERVIEW KPI SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Complaints */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-extrabold text-slate-500 uppercase">Total Complaints</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-primary">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mb-1">{kpis.total}</div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
            <span>{kpis.total > 0 ? `${kpis.total} Total Complaints` : 'No complaints recorded'}</span>
          </div>
        </div>

        {/* KPI 2: Active Complaints */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-extrabold text-slate-500 uppercase">Active / Pending</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mb-1">{kpis.active}</div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
            <span>{kpis.active > 0 ? `${kpis.active} in squad queue` : 'Queue is clear'}</span>
          </div>
        </div>

        {/* KPI 3: Resolved Complaints */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-extrabold text-slate-500 uppercase">Resolved</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mb-1">{kpis.resolved}</div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
            <span>{kpis.total > 0 ? `${kpis.resolutionRate}% of total complaints` : '0% resolved'}</span>
          </div>
        </div>

        {/* KPI 4: Resolution Rate (%) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-extrabold text-slate-500 uppercase">Resolution Efficiency</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600 mb-1">{kpis.total > 0 ? `${kpis.resolutionRate}%` : '100%'}</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${kpis.total > 0 ? kpis.resolutionRate : 100}%` }} />
          </div>
        </div>

        {/* KPI 5: Avg Resolution Time */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-extrabold text-slate-500 uppercase">Avg Response Time</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mb-1">{kpis.resolved > 0 ? `${kpis.avgResTime} hrs` : '0 hrs'}</div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
            <span>{kpis.resolved > 0 ? `${kpis.avgResTime}h avg resolution` : 'Standard SLA Active'}</span>
          </div>
        </div>

        {/* KPI 6: Urgent & High Priority */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-extrabold text-slate-500 uppercase">Critical / High Priority</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 mb-1">{kpis.highPriority}</div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600">
            <span>{kpis.highPriority > 0 ? 'Fast-tracked under SLA' : 'No critical issues'}</span>
          </div>
        </div>

        {/* KPI 7: This Month Complaints */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-extrabold text-slate-500 uppercase">This Month</span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mb-1">{kpis.monthCount}</div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
            <span>{kpis.monthCount > 0 ? `${kpis.monthCount} logged this month` : '0 logged this month'}</span>
          </div>
        </div>

        {/* KPI 8: Today's Complaints */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-extrabold text-slate-500 uppercase">Today's Volume</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mb-1">{kpis.todayCount}</div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
            <span>{kpis.todayCount > 0 ? `${kpis.todayCount} reported today` : '0 reported today'}</span>
          </div>
        </div>
      </div>

      {/* ── CITIZEN ACTIONABLE INSIGHTS CARDS SECTION ── */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-base text-white m-0">Citizen Actionable Insights Summary</h3>
          </div>
          <span className="text-xs font-bold text-indigo-200 bg-white/10 px-3 py-1 rounded-full border border-white/10">
            Live City Metrics
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Insight 1: Top Category */}
          <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="text-[11px] text-indigo-200 font-bold uppercase mb-1">Most Reported Category</div>
            <div className="font-extrabold text-sm text-white truncate">{citizenInsights.topCategory}</div>
            <div className="text-xs text-amber-300 font-semibold mt-1">{citizenInsights.topCategoryPct}% of total volume</div>
          </div>

          {/* Insight 2: Fastest Dept */}
          <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="text-[11px] text-indigo-200 font-bold uppercase mb-1">⚡ Fastest Department</div>
            <div className="font-extrabold text-sm text-emerald-400 truncate">{citizenInsights.fastestDept}</div>
            <div className="text-xs text-emerald-300 font-semibold mt-1">Avg {citizenInsights.fastestDeptTime} resolution</div>
          </div>

          {/* Insight 3: Focus Dept */}
          <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="text-[11px] text-indigo-200 font-bold uppercase mb-1">⏳ Needs Focus</div>
            <div className="font-extrabold text-sm text-rose-300 truncate">{citizenInsights.slowestDept}</div>
            <div className="text-xs text-rose-200 font-semibold mt-1">Avg {citizenInsights.slowestDeptTime} backlog</div>
          </div>

          {/* Insight 4: Top Ward */}
          <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="text-[11px] text-indigo-200 font-bold uppercase mb-1">📍 Grievance Hotspot</div>
            <div className="font-extrabold text-sm text-white truncate">{citizenInsights.topWard}</div>
            <div className="text-xs text-indigo-200 font-semibold mt-1">{citizenInsights.topWardCount} reports logged</div>
          </div>

          {/* Insight 5: Rating Score */}
          <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="text-[11px] text-indigo-200 font-bold uppercase mb-1">City Score</div>
            <div className="font-extrabold text-sm text-cyan-300">{citizenInsights.efficiencyScore} / 100</div>
            <div className="text-xs text-cyan-200 font-semibold mt-1">SLA Compliance Index</div>
          </div>

          {/* Insight 6: Improvement */}
          <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="text-[11px] text-indigo-200 font-bold uppercase mb-1">Resolution Rate</div>
            <div className="font-extrabold text-sm text-emerald-400">{citizenInsights.monthlyImprovement}</div>
            <div className="text-xs text-emerald-300 font-semibold mt-1">Overall resolution</div>
          </div>
        </div>
      </div>

      {/* ── AI PREDICTIVE ANALYTICS SECTION ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-5 h-5 text-indigo-600" />
          <h3 className="font-extrabold text-base text-slate-900 m-0">AI Predictive Analytics & Forecast Telemetry</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
            <div className="flex items-center gap-2 font-bold text-xs text-indigo-900 mb-1">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Predictive Trend Forecast</span>
            </div>
            <p className="text-xs text-indigo-800 leading-relaxed m-0">
              {filteredIssues.length > 0
                ? `Predictive NLP model monitoring trends across ${categoriesList.length} civic grievance categories.`
                : 'Predictive NLP forecasting models standing by. Trend telemetry activates upon complaint logging.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-900 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Cluster Risk Detection</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed m-0">
              {filteredIssues.length > 0
                ? `Continuous 150m geospatial clustering algorithm scanning active grievances for repeat locations.`
                : '150-meter geospatial radius clustering active. No duplicate clusters currently detected.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-100">
            <div className="flex items-center gap-2 font-bold text-xs text-cyan-900 mb-1">
              <RefreshCw className="w-4 h-4 text-cyan-600" />
              <span>Recurring Issue Pattern</span>
            </div>
            <p className="text-xs text-cyan-800 leading-relaxed m-0">
              {filteredIssues.length > 0
                ? `Pattern recognition engine cross-referencing category timelines across all wards.`
                : 'Pattern recognition engine online. Infrastructure recurrence analysis running in real-time.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
            <div className="flex items-center gap-2 font-bold text-xs text-emerald-900 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>AI Resource Recommendation</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed m-0">
              {filteredIssues.length > 0
                ? `Dynamic squad dispatch recommendation active across ${deptPerformanceData.length} municipal departments.`
                : 'Dynamic squad routing engine active across all 6 municipal engineering departments.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── CHARTS ROW 1: TIMELINE TREND & CATEGORY BREAKDOWN ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Timeline Line Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 m-0">Grievance Submission vs Resolution Trends</h3>
              <p className="text-xs text-slate-500 m-0">Comparing reported civic complaints against squad resolution throughput.</p>
            </div>

            {/* Resolution Selector */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold">
              {['daily', 'weekly', 'monthly'].map(res => (
                <button
                  key={res}
                  onClick={() => setTrendResolution(res)}
                  className={`px-3 py-1 rounded-lg capitalize transition-all ${trendResolution === res ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: '280px' }}>
            <Line
              data={trendChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } }
              }}
            />
          </div>
        </div>

        {/* Category Doughnut Chart (1 Col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-900 mb-1">Category-Wise Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Proportion of civic issues filed across key domains.</p>

          <div style={{ height: '240px' }}>
            <Doughnut
              data={categoryChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
              }}
            />
          </div>
        </div>
      </div>

      {/* ── RESOLUTION PIPELINE PROGRESS FUNNEL ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-extrabold text-base text-slate-900 mb-1">5-Stage Resolution Pipeline Funnel</h3>
        <p className="text-xs text-slate-500 mb-6">Visual tracking of complaint progression through official municipal lifecycle stages.</p>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {pipelineStages.map((stage, idx) => {
            const count = pipelineCounts[idx];
            const pct = kpis.total > 0 ? Math.round((count / kpis.total) * 100) : 0;
            const isResolved = stage === 'Resolved';

            return (
              <div key={stage} className={`p-4 rounded-xl border ${isResolved ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'} relative`}>
                <div className="text-[11px] font-bold text-slate-400 uppercase mb-1">Stage {idx + 1}</div>
                <div className="font-extrabold text-sm text-slate-900 mb-2">{stage}</div>
                <div className="text-2xl font-black text-indigo-600 mb-1">{count}</div>
                <div className="text-xs font-semibold text-slate-500 mb-2">{pct}% of total</div>

                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${isResolved ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── GIS GEOGRAPHIC ANALYTICS SECTION ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 m-0">GIS Spatial Hazard Map & Location Analytics</h3>
            <p className="text-xs text-slate-500 m-0">Interactive geospatial mapping of all reported grievances in the city.</p>
          </div>

          <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            📍 Showing {filteredIssues.filter(i => i.latitude && i.longitude).length} mapped coordinates
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-slate-200">
          <LeafletMap
            issues={filteredIssues}
            height="380px"
          />
        </div>
      </div>

      {/* ── CHARTS ROW 2: DEPARTMENT PERFORMANCE & PRIORITY DISTRIBUTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Department Performance Bar Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-900 mb-1">Department Assigned vs Resolved Workload</h3>
          <p className="text-xs text-slate-500 mb-4">Comparing municipal squad workload against completed resolutions.</p>

          <div style={{ height: '260px' }}>
            <Bar
              data={deptChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } }
              }}
            />
          </div>
        </div>

        {/* Priority Distribution Chart (1 Col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-extrabold text-sm text-slate-900 mb-1">Priority Severity Breakdown</h3>
          <p className="text-xs text-slate-500 mb-4">Distribution across Low, Medium, High, and Urgent SLA levels.</p>

          <div style={{ height: '240px' }}>
            <Doughnut
              data={priorityChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
              }}
            />
          </div>
        </div>
      </div>

      {/* ── DEPARTMENT PERFORMANCE DASHBOARD TABLE ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <h3 className="font-extrabold text-base text-slate-900 m-0">Department Performance Scorecard</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                <th className="py-3 px-3">Municipal Department</th>
                <th className="py-3 px-3 text-center">Assigned Issues</th>
                <th className="py-3 px-3 text-center">Resolved</th>
                <th className="py-3 px-3 text-center">Resolution Rate</th>
                <th className="py-3 px-3 text-center">Avg Response Time</th>
                <th className="py-3 px-3 text-right">Performance Status</th>
              </tr>
            </thead>
            <tbody>
              {deptPerformanceData.map(row => (
                <tr key={row.dept} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    <span>{row.dept}</span>
                  </td>
                  <td className="py-3.5 px-3 text-center font-bold text-slate-800">{row.total}</td>
                  <td className="py-3.5 px-3 text-center font-bold text-emerald-600">{row.resolved}</td>
                  <td className="py-3.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-extrabold text-slate-800">{row.rate}%</span>
                      <div className="w-16 bg-slate-200 rounded-full h-1.5">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${row.rate}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center font-bold text-indigo-600">{row.avgHours} hours</td>
                  <td className="py-3.5 px-3 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                      row.statusBadge === 'High Efficiency'
                        ? 'bg-emerald-100 text-emerald-700'
                        : row.statusBadge === 'On Track'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {row.statusBadge}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RECENT CIVIC ACTIVITY FEED ── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-base text-slate-900 m-0">Recent Civic Activity & Resolution Stream</h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">Live Activity Feed</span>
        </div>

        <div className="space-y-3">
          {filteredIssues.slice(0, 5).map(issue => (
            <div
              key={issue.issue_id}
              className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:border-slate-300 transition-all cursor-pointer"
              onClick={() => navigate(`/issue/${issue.issue_id}`)}
            >
              <div className="flex items-center gap-3">
                <span className={`status-pill status-${issue.status.toLowerCase().replace(' ', '-')}`}>
                  {issue.status}
                </span>
                <div>
                  <div className="font-bold text-xs text-slate-900 hover:text-indigo-600 transition-colors">
                    #{issue.issue_id}: {issue.title}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    📍 {issue.location} • Department: <strong>{issue.department || 'General Administration'}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400 font-semibold">{issue.created_at || 'Recently updated'}</span>
                <button className="text-xs font-bold text-primary hover:underline">
                  View Details &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
