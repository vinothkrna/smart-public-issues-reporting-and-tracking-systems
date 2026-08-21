import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Building2,
  Calendar,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  ChevronRight,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  Inbox,
  User,
  Phone,
  Mail,
  Camera,
  Check,
  AlertCircle
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:5000';

const TIMELINE_STAGES = [
  { key: 'Submitted', label: 'Submitted', description: 'Complaint lodged by citizen & logged into registry' },
  { key: 'AI Classified', label: 'AI Classified', description: 'Multi-modal vision & NLP category & priority assigned' },
  { key: 'Assigned', label: 'Assigned', description: 'Dispatched to responsible municipal department squad' },
  { key: 'Under Review', label: 'Under Review', description: 'Site verification & engineer assessment in progress' },
  { key: 'In Progress', label: 'In Progress', description: 'Field squad on-site executing repair & maintenance' },
  { key: 'Resolved', label: 'Resolved', description: 'Work completed, proof verified & citizen feedback active' }
];

export default function TrackComplaintPage({ issues = [] }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('id'); // 'id' | 'email' | 'phone'
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Check query params or navigation state on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const idParam = params.get('id');
    const queryParam = params.get('q');

    if (idParam) {
      setSearchQuery(idParam);
      setSearchType('id');
      performSearch(idParam, 'id');
    } else if (queryParam) {
      setSearchQuery(queryParam);
      performSearch(queryParam, 'id');
    } else if (location.state?.complaintId) {
      const cid = String(location.state.complaintId);
      setSearchQuery(cid);
      performSearch(cid, 'id');
    } else if (issues.length > 0) {
      // Default to first active or recent issue for immediate demo visualization
      setSelectedComplaint(issues[0]);
    }
  }, [location.search, location.state, issues]);

  const performSearch = async (queryVal, typeVal = searchType) => {
    const q = (queryVal || searchQuery).trim();
    if (!q) return;

    setIsSearching(true);
    setHasSearched(true);
    setFetchError(null);

    try {
      // 1. Try local list first
      let matched = [];
      const cleanQ = q.toLowerCase();

      if (typeVal === 'id') {
        const numId = parseInt(q.replace(/\D/g, ''), 10);
        matched = issues.filter(i => i.issue_id === numId || String(i.issue_id) === q || i.title.toLowerCase().includes(cleanQ));
      } else if (typeVal === 'email') {
        matched = issues.filter(i => (i.reporter_email || '').toLowerCase().includes(cleanQ) || (i.reporter_name || '').toLowerCase().includes(cleanQ));
      } else if (typeVal === 'phone') {
        const cleanPhone = q.replace(/\D/g, '');
        matched = issues.filter(i => (i.reporter_phone || '').replace(/\D/g, '').includes(cleanPhone));
      }

      // 2. Fetch live from backend API if not found or to get freshest status
      if (typeVal === 'id') {
        const numId = parseInt(q.replace(/\D/g, ''), 10);
        if (numId) {
          try {
            const res = await fetch(`${API_BASE}/api/issues/${numId}`);
            if (res.ok) {
              const data = await res.json();
              if (data && data.issue_id) {
                matched = [data, ...matched.filter(m => m.issue_id !== data.issue_id)];
              }
            }
          } catch {
            // fallback to local matches
          }
        }
      }

      setSearchResults(matched);
      if (matched.length > 0) {
        setSelectedComplaint(matched[0]);
      } else {
        setSelectedComplaint(null);
      }
    } catch (err) {
      setFetchError('Unable to connect to grievance server. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch(searchQuery, searchType);
  };

  const calculateProgress = (status) => {
    switch (status) {
      case 'Submitted': return 16;
      case 'AI Classified': return 33;
      case 'Assigned': return 50;
      case 'Under Review': return 66;
      case 'In Progress': return 83;
      case 'Resolved': return 100;
      default: return 20;
    }
  };

  const isStageActiveOrDone = (stageKey, currentStatus) => {
    const order = ['Submitted', 'AI Classified', 'Assigned', 'Under Review', 'In Progress', 'Resolved'];
    const currentIndex = order.indexOf(currentStatus);
    const stageIndex = order.indexOf(stageKey);
    return {
      isDone: currentIndex >= stageIndex,
      isCurrent: currentIndex === stageIndex
    };
  };

  const getPriorityBadgeColor = (priority) => {
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

  const getStatusBadgeColor = (status) => {
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
    <div className="track-complaint-container max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
      {/* ── Section Header ── */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black">
          <Sparkles className="w-3.5 h-3.5" /> LIVE GRIEVANCE TELEMETRY
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight m-0">
          Track Complaint Progress
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          Monitor your reported civic issue in real time across all 6 resolution milestones, squad assignments, and official municipal updates.
        </p>
      </div>

      {/* ── Search & Filter Box ── */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xl max-w-3xl mx-auto space-y-4">
        {/* Search Mode Tabs */}
        <div className="flex items-center justify-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit mx-auto text-xs font-bold">
          <button
            type="button"
            className={`px-4 py-1.5 rounded-xl transition-all ${
              searchType === 'id' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setSearchType('id')}
          >
            Complaint ID
          </button>
          <button
            type="button"
            className={`px-4 py-1.5 rounded-xl transition-all ${
              searchType === 'email' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setSearchType('email')}
          >
            Registered Email
          </button>
          <button
            type="button"
            className={`px-4 py-1.5 rounded-xl transition-all ${
              searchType === 'phone' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setSearchType('phone')}
          >
            Mobile Number
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              className="input-text w-full pl-11 pr-4 py-3 text-xs sm:text-sm font-medium rounded-2xl border-slate-200 focus:border-indigo-600 shadow-inner"
              placeholder={
                searchType === 'id'
                  ? 'Enter Complaint ID (e.g. #1, 2, 42)...'
                  : searchType === 'email'
                  ? 'Enter registered email (e.g. vinoth@gmail.com)...'
                  : 'Enter mobile number (e.g. +91 9876543210)...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn-primary-gradient px-8 py-3 rounded-2xl text-xs sm:text-sm font-black justify-center shadow-lg shadow-indigo-600/30"
            disabled={isSearching}
          >
            {isSearching ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Searching…</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                <span>Track Status</span>
              </span>
            )}
          </button>
        </form>

        {/* Quick Search Suggestions */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-1">
          <span className="font-bold text-slate-400">Quick Demo Records:</span>
          <button
            type="button"
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 font-mono font-bold transition-colors"
            onClick={() => { setSearchType('id'); setSearchQuery('1'); performSearch('1', 'id'); }}
          >
            #1 Pothole
          </button>
          <button
            type="button"
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 font-mono font-bold transition-colors"
            onClick={() => { setSearchType('id'); setSearchQuery('2'); performSearch('2', 'id'); }}
          >
            #2 Garbage Dump
          </button>
          <button
            type="button"
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 font-mono font-bold transition-colors"
            onClick={() => { setSearchType('id'); setSearchQuery('3'); performSearch('3', 'id'); }}
          >
            #3 Water Pipeline
          </button>
          <button
            type="button"
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 font-mono font-bold transition-colors"
            onClick={() => { setSearchType('email'); setSearchQuery('vinoth@gmail.com'); performSearch('vinoth@gmail.com', 'email'); }}
          >
            vinoth@gmail.com
          </button>
        </div>
      </div>

      {/* ── Search Error State ── */}
      {fetchError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 max-w-3xl mx-auto flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* ── Multiple Search Results Selector (if searched by email/phone) ── */}
      {searchResults.length > 1 && (
        <div className="max-w-4xl mx-auto space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase">
            Found {searchResults.length} Complaints for your query:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {searchResults.map(res => (
              <div
                key={res.issue_id}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedComplaint?.issue_id === res.issue_id
                    ? 'bg-indigo-50/70 border-indigo-500 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setSelectedComplaint(res)}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono font-black text-indigo-600">#{res.issue_id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeColor(res.status)}`}>
                    {res.status}
                  </span>
                </div>
                <div className="font-bold text-xs text-slate-900 truncate">{res.title}</div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">{res.department}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Tracking Details View ── */}
      {selectedComplaint ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-5xl mx-auto">
          {/* Left 8 Cols: Complaint Milestone Timeline & Resolution Progress */}
          <div className="lg:col-span-8 space-y-6">
            {/* Header Card */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-mono font-black text-sm shadow-inner">
                    #{selectedComplaint.issue_id}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {selectedComplaint.category || 'CIVIC GRIEVANCE'}
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 m-0">
                      {selectedComplaint.title}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-black border ${getPriorityBadgeColor(selectedComplaint.priority)}`}>
                    {selectedComplaint.priority || 'Medium'} Priority
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-black border ${getStatusBadgeColor(selectedComplaint.status)}`}>
                    {selectedComplaint.status}
                  </span>
                </div>
              </div>

              {/* Resolution Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-600">Resolution Progress</span>
                  <span className="text-indigo-600 font-mono">{calculateProgress(selectedComplaint.status)}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${calculateProgress(selectedComplaint.status)}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed m-0">
                {selectedComplaint.description}
              </p>
            </div>

            {/* 6-Stage Timeline Component */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 m-0 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Complaint Lifecycle Timeline</span>
                </h3>
                <span className="text-xs text-slate-400 font-medium">6 Real-Time Milestones</span>
              </div>

              <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {TIMELINE_STAGES.map((stage, idx) => {
                  const { isDone, isCurrent } = isStageActiveOrDone(stage.key, selectedComplaint.status);

                  return (
                    <div key={stage.key} className="relative flex items-start gap-4">
                      {/* Step Indicator Dot */}
                      <div
                        className={`absolute -left-6 sm:-left-8 w-6 sm:w-8 h-6 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isDone
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                            : isCurrent
                            ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>

                      <div className={`p-4 rounded-2xl border flex-1 transition-all ${
                        isCurrent
                          ? 'bg-indigo-50/50 border-indigo-200 shadow-sm'
                          : isDone
                          ? 'bg-slate-50/60 border-slate-100'
                          : 'bg-white border-slate-100 opacity-60'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 m-0">
                            {stage.label}
                          </h4>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                              Current Phase
                            </span>
                          )}
                          {isDone && !isCurrent && (
                            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 m-0">
                          {stage.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Uploaded Evidence & Before/After Proof */}
            {selectedComplaint.image_path && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-black text-sm text-slate-900 m-0 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>Photographic Evidence</span>
                </h3>
                <div className="rounded-2xl overflow-hidden border border-slate-100 max-h-72 bg-slate-950 flex items-center justify-center">
                  <img
                    src={selectedComplaint.image_path.startsWith('http') ? selectedComplaint.image_path : `${API_BASE}${selectedComplaint.image_path}`}
                    alt="Evidence"
                    className="max-h-72 object-contain"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right 4 Cols: Department Info Card, Location, & 2-Way Actions */}
          <div className="lg:col-span-4 space-y-6">
            {/* Department Card */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Assigned Authority</div>
                  <div className="font-extrabold text-xs sm:text-sm text-slate-900">
                    {selectedComplaint.department || 'Roads & Highways Department'}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700">Assigned Squad / Officer:</span>
                    <div className="text-slate-900 font-semibold">{selectedComplaint.assigned_to || selectedComplaint.assigned_admin || 'Rapid Response Squad'}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700">Date Reported:</span>
                    <div className="text-slate-900 font-semibold">{selectedComplaint.created_at || 'Recently filed'}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700">Exact Location:</span>
                    <div className="text-slate-900 font-semibold">{selectedComplaint.location || selectedComplaint.address || 'Ward 12, Smart City'}</div>
                  </div>
                </div>
              </div>

              {/* Open Full Discussion Link */}
              <button
                type="button"
                className="btn-primary-gradient w-full justify-center py-2.5 text-xs font-bold"
                onClick={() => navigate(`/issue/${selectedComplaint.issue_id}`)}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open 2-Way Official Chat</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>

            {/* AI Diagnostics Summary */}
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 p-5 sm:p-6 rounded-3xl text-white shadow-xl border border-indigo-900/40 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h4 className="font-black text-xs uppercase tracking-wider text-cyan-300 m-0">AI Diagnostics</h4>
              </div>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between border-b border-white/10 pb-1.5">
                  <span>AI Confidence:</span>
                  <span className="font-mono font-bold text-emerald-400">{Math.round((selectedComplaint.ai_confidence || 0.92) * 100)}%</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-1.5">
                  <span>Priority Rating:</span>
                  <span className="font-bold text-amber-300">{selectedComplaint.ai_priority_score || '82.5'}/100</span>
                </div>
                <div className="flex justify-between">
                  <span>Target SLA:</span>
                  <span className="font-bold text-white">24 - 48 Hours</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : hasSearched ? (
        /* ── No Complaint Found State ── */
        <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm max-w-xl mx-auto text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center font-black mx-auto shadow-inner">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-900 m-0">No Complaint Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No complaint record matched "<strong>{searchQuery}</strong>". Please verify your Complaint ID, email address, or mobile number.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              className="btn-primary-gradient text-xs py-2.5 px-5 font-bold"
              onClick={() => { setSearchQuery(''); setHasSearched(false); }}
            >
              Clear & Try Again
            </button>
            <Link
              to="/"
              className="btn-secondary-outline text-xs py-2.5 px-5 font-bold"
            >
              Back to Home
            </Link>
          </div>
        </div>
      ) : (
        /* ── Initial Empty State ── */
        <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm max-w-xl mx-auto text-center space-y-3">
          <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 m-0">Enter a Complaint ID or Contact Info</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Search above using your unique Complaint ID or registered email to view live municipal progress.
          </p>
        </div>
      )}
    </div>
  );
}
