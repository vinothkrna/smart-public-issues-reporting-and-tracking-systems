import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ThumbsUp, 
  MapPin, 
  Clock, 
  Building2, 
  ArrowRight, 
  Filter, 
  SlidersHorizontal, 
  Sparkles, 
  Inbox, 
  MessageSquare,
  Search,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function IssuesList({ 
  issues = [], 
  onSelectIssue, 
  onUpvote,
  title = "Public Issues Directory",
  subtitle = "Monitor municipal complaints across city wards"
}) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [localSearch, setLocalSearch] = useState('');

  const statuses = ['All', 'Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved'];
  const categories = ['All', 'Pothole', 'Garbage Dump', 'Water Leakage', 'Streetlight Failure', 'Drainage Blockage'];

  const filtered = issues.filter(issue => {
    const matchesSearch = !localSearch || 
      issue.title.toLowerCase().includes(localSearch.toLowerCase()) ||
      issue.location.toLowerCase().includes(localSearch.toLowerCase()) ||
      String(issue.issue_id) === localSearch;
    const matchesStatus = statusFilter === 'All' || issue.status === statusFilter;
    const matchesCat = categoryFilter === 'All' || issue.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCat;
  });

  const handleCardClick = (issueId) => {
    if (onSelectIssue) onSelectIssue(issueId);
    navigate(`/issue/${issueId}`);
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
    <div className="issues-list-wrapper max-w-[1200px] mx-auto space-y-6">
      {/* Section Header & Subtitle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight m-0">{title}</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 m-0">{subtitle}</p>
        </div>

        <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200 shrink-0">
          Showing <span className="text-indigo-600 font-extrabold">{filtered.length}</span> of {issues.length} Complaints
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Search keyword, ID, or location..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-11 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none transition-all shadow-inner"
            />
          </div>

          <div className="sm:col-span-3">
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-11 px-3 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:border-indigo-600 focus:outline-none transition-all"
            >
              {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-11 px-3 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:border-indigo-600 focus:outline-none transition-all"
            >
              {statuses.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Issues Cards Grid (12-Column, Equal Height) */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(issue => (
            <div 
              key={issue.issue_id} 
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all p-5 flex flex-col justify-between cursor-pointer group"
              onClick={() => handleCardClick(issue.issue_id)}
            >
              <div className="space-y-3">
                {/* Header: Badges & ID */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusBadgeClass(issue.status)}`}>
                      {issue.status}
                    </span>
                    <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      #{issue.issue_id}
                    </span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityBadgeClass(issue.priority)}`}>
                    {issue.priority || 'Medium'}
                  </span>
                </div>

                {/* Category & Messages Count */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    {issue.category}
                  </span>
                  {(issue.messages || []).length > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                      <MessageSquare className="w-3 h-3 text-indigo-600" />
                      {(issue.messages || []).length}
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 m-0">
                    {issue.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed m-0">
                    {issue.description}
                  </p>
                </div>

                {/* Location & Metadata Box */}
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100 text-xs">
                  <div className="text-slate-600 flex items-center gap-1.5 truncate font-medium">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">{issue.location}</span>
                  </div>
                  <div className="text-slate-400 flex items-center justify-between text-[11px]">
                    <span className="truncate font-semibold text-slate-500">🏢 {issue.department || 'Unassigned'}</span>
                    <span className="shrink-0">{issue.created_at ? issue.created_at.split(' ')[0] : 'Today'}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Action Buttons (Single Row, Equal Height) */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                <button 
                  type="button"
                  className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                  onClick={() => onUpvote(issue.issue_id)}
                  title="Upvote this complaint"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{issue.upvotes || 1}</span>
                </button>

                <button 
                  type="button"
                  className="h-10 flex-1 rounded-xl btn-primary-gradient text-xs font-bold justify-center shadow-none hover:shadow-md transition-all flex items-center gap-1.5"
                  onClick={() => handleCardClick(issue.issue_id)}
                >
                  <span>Details & Timeline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2 max-w-md mx-auto shadow-sm">
          <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="text-base font-bold text-slate-800 m-0">No complaints found</h4>
          <p className="text-xs text-slate-400 m-0">Try adjusting your filters or search keywords.</p>
        </div>
      )}
    </div>
  );
}
