import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Search,
  Sparkles,
  SlidersHorizontal,
  Building2,
  PlusCircle,
  Eye,
  Activity
} from 'lucide-react';

function SmartCityHeroIllustration() {
  return (
    <svg viewBox="0 0 460 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(99,102,241,0.2)" />
          <stop offset="100%" stopColor="rgba(14,165,233,0.05)" />
        </linearGradient>
        <linearGradient id="bldgG1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(99,102,241,0.4)" />
          <stop offset="100%" stopColor="rgba(99,102,241,0.1)" />
        </linearGradient>
        <linearGradient id="bldgG2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(14,165,233,0.4)" />
          <stop offset="100%" stopColor="rgba(14,165,233,0.1)" />
        </linearGradient>
      </defs>

      <rect width="460" height="180" rx="16" fill="url(#heroGrad)" />

      {/* City Skyline Silhouette */}
      <g opacity="0.85">
        <rect x="30" y="55" width="45" height="110" rx="3" fill="url(#bldgG1)" stroke="rgba(99,102,241,0.3)" />
        <rect x="38" y="65" width="10" height="8" rx="1" fill="rgba(255,255,255,0.4)" />
        <rect x="55" y="65" width="10" height="8" rx="1" fill="rgba(255,255,255,0.4)" />
        <rect x="38" y="85" width="10" height="8" rx="1" fill="rgba(240,180,41,0.6)" />
        <rect x="55" y="85" width="10" height="8" rx="1" fill="rgba(255,255,255,0.4)" />
        <rect x="38" y="105" width="10" height="8" rx="1" fill="rgba(255,255,255,0.4)" />
        <rect x="55" y="105" width="10" height="8" rx="1" fill="rgba(14,165,233,0.6)" />

        <rect x="85" y="35" width="55" height="130" rx="3" fill="url(#bldgG2)" stroke="rgba(14,165,233,0.4)" />
        <rect x="93" y="45" width="12" height="10" rx="1" fill="rgba(255,255,255,0.5)" />
        <rect x="115" y="45" width="12" height="10" rx="1" fill="rgba(255,255,255,0.5)" />
        <rect x="93" y="65" width="12" height="10" rx="1" fill="rgba(14,165,233,0.7)" />
        <rect x="115" y="65" width="12" height="10" rx="1" fill="rgba(255,255,255,0.5)" />
        <rect x="93" y="85" width="12" height="10" rx="1" fill="rgba(255,255,255,0.5)" />
        <rect x="115" y="85" width="12" height="10" rx="1" fill="rgba(99,102,241,0.7)" />

        <rect x="150" y="70" width="40" height="95" rx="3" fill="url(#bldgG1)" stroke="rgba(99,102,241,0.3)" />
        <rect x="200" y="45" width="60" height="120" rx="3" fill="url(#bldgG2)" stroke="rgba(14,165,233,0.4)" />
        <line x1="230" y1="45" x2="230" y2="25" stroke="rgba(14,165,233,0.6)" strokeWidth="2" />
        <circle cx="230" cy="23" r="3.5" fill="rgba(0,212,170,0.9)" />

        <rect x="270" y="85" width="45" height="80" rx="3" fill="url(#bldgG1)" stroke="rgba(99,102,241,0.3)" />
        <rect x="325" y="55" width="50" height="110" rx="3" fill="url(#bldgG2)" stroke="rgba(14,165,233,0.4)" />
        <rect x="385" y="75" width="50" height="90" rx="3" fill="url(#bldgG1)" stroke="rgba(99,102,241,0.3)" />
      </g>

      {/* GIS Connectivity Links */}
      <path d="M45 55 Q110 20 230 25 T350 55" fill="none" stroke="rgba(99,102,241,0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
      <circle cx="45" cy="55" r="4" fill="#6366f1" />
      <circle cx="110" cy="35" r="4" fill="#0ea5e9" />
      <circle cx="230" cy="25" r="5" fill="#10b981" />
      <circle cx="350" cy="55" r="4" fill="#f59e0b" />

      {/* GPS Geo Pins */}
      <g transform="translate(110, 135)">
        <circle cx="0" cy="0" r="10" fill="rgba(239,68,68,0.2)" />
        <circle cx="0" cy="0" r="4" fill="#ef4444" />
      </g>
      <g transform="translate(230, 130)">
        <circle cx="0" cy="0" r="10" fill="rgba(16,185,129,0.2)" />
        <circle cx="0" cy="0" r="4" fill="#10b981" />
      </g>
      <g transform="translate(350, 135)">
        <circle cx="0" cy="0" r="10" fill="rgba(245,158,11,0.2)" />
        <circle cx="0" cy="0" r="4" fill="#f59e0b" />
      </g>
    </svg>
  );
}

// Animated Counter Hook
function useAnimatedCount(targetValue, duration = 800) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(targetValue, 10) || 0;
    if (start === end) {
      setCount(end);
      return;
    }

    const stepTime = Math.abs(Math.floor(duration / (end || 1)));
    const timer = setInterval(() => {
      start += Math.ceil((end - start) / 6);
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 40);

    return () => clearInterval(timer);
  }, [targetValue, duration]);

  return count;
}

export default function HeroStats({
  total = 0,
  resolved = 0,
  pending = 0,
  departmentsCount = 8,
  onOpenReport,
  onViewPublicIssues,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory
}) {
  const navigate = useNavigate();
  const animatedTotal = useAnimatedCount(total);
  const animatedResolved = useAnimatedCount(resolved);
  const animatedPending = useAnimatedCount(pending);
  const animatedDepts = useAnimatedCount(departmentsCount);

  const categories = [
    { id: 'All', label: 'All Issues', icon: '🌐' },
    { id: 'Pothole', label: 'Potholes & Roads', icon: '🚧', color: '#ef4444' },
    { id: 'Garbage Dump', label: 'Garbage & Waste', icon: '🗑️', color: '#f59e0b' },
    { id: 'Water Leakage', label: 'Water Leakage', icon: '💧', color: '#0ea5e9' },
    { id: 'Streetlight Failure', label: 'Streetlights', icon: '💡', color: '#8b5cf6' },
    { id: 'Drainage Blockage', label: 'Drainage & Sewers', icon: '🌊', color: '#10b981' }
  ];

  return (
    <div className="hero-stats-wrapper max-w-[1200px] mx-auto space-y-10">
      {/* ── SaaS-Style Centered Hero Section ── */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-12 lg:p-14 rounded-3xl text-white shadow-2xl border border-indigo-900/40 relative overflow-hidden text-center">
        {/* Ambient Glows */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-[700px] mx-auto space-y-6">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-cyan-300 text-xs font-bold border border-white/10 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>AI-Powered Civic Governance Platform</span>
          </div>

          {/* Heading: Center aligned, max-w 700px, font weight 700, line-height 1.15, zero text overlap */}
          <h1
            className="font-bold text-white tracking-tight m-0"
            style={{
              fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
              lineHeight: 1.15,
              maxWidth: '700px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}
          >
            Report Public Issues.<br />
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Track Progress.
            </span><br />
            Improve Your City.
          </h1>

          {/* Subtitle: Center aligned, max-w 700px */}
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-[650px] mx-auto m-0">
            AI-powered civic governance platform enabling citizens and government departments to collaborate efficiently.
          </p>

          {/* 3 Primary Action Buttons: Equal Height (48px), Border Radius, Equal Padding, 16px Gap, Center Aligned */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              type="button"
              className="btn-primary-gradient h-12 px-6 rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-indigo-600/40 hover:scale-105 transition-transform flex items-center justify-center gap-2 w-full sm:w-auto"
              style={{ minHeight: '48px' }}
              onClick={onOpenReport}
              id="hero-report-btn"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Report Issue</span>
            </button>

            <button
              type="button"
              className="h-12 px-6 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-black border border-white/20 backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
              style={{ minHeight: '48px' }}
              onClick={() => navigate('/track-complaint')}
              id="hero-track-btn"
            >
              <Search className="w-4 h-4 text-cyan-300 shrink-0" />
              <span>Track Complaint</span>
            </button>

            <button
              type="button"
              className="h-12 px-6 rounded-2xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 text-xs sm:text-sm font-bold border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
              style={{ minHeight: '48px' }}
              onClick={onViewPublicIssues}
              id="hero-view-issues-btn"
            >
              <Eye className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>View Public Issues</span>
            </button>
          </div>

          {/* Live Municipal Status Badge (Positioned below CTA buttons with proper spacing) */}
          <div className="pt-3 flex items-center justify-center gap-2 text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-950/70 border border-slate-800/80 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-200">Live Municipal GIS Telemetry</span>
              <span className="text-slate-500">•</span>
              <span className="text-cyan-400 font-mono font-bold">8 Departments Active</span>
            </span>
          </div>
        </div>

        {/* Compact GIS Telemetry Preview Graphic */}
        <div className="max-w-[900px] mx-auto mt-8 rounded-2xl overflow-hidden border border-white/10 bg-slate-950/40 p-4 shadow-xl">
          <div className="h-36 sm:h-44 w-full flex items-center justify-center">
            <SmartCityHeroIllustration />
          </div>
        </div>
      </div>

      {/* ── KPI Animated Statistics Grid (4 Key Counters, 24px Gap) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shrink-0">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{animatedTotal}</div>
            <div className="text-xs font-bold text-slate-500">Total Complaints</div>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">{animatedResolved}</div>
            <div className="text-xs font-bold text-emerald-700">Resolved Complaints</div>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600">{animatedPending}</div>
            <div className="text-xs font-bold text-amber-700">Active Complaints</div>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-black shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-600">{animatedDepts}</div>
            <div className="text-xs font-bold text-cyan-700">Departments Involved</div>
          </div>
        </div>
      </div>

      {/* ── Search & Category Filter Bar ── */}
      <div className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4" id="public-issues-search">
        <div className="search-report-bar">
          <div className="search-input-group">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Complaint ID, ward locality, or hazard keyword (e.g. pothole, Gandhi Nagar, #1)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>
          <button className="btn-hero-action" onClick={onOpenReport}>
            📸 Report Issue
          </button>
        </div>

        {/* Category Pills */}
        <div className="category-chips">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
