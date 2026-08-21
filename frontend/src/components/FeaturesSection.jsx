import React, { useState } from 'react';
import {
  Brain,
  MapPin,
  Clock,
  Building2,
  Bell,
  BarChart3,
  Sparkles,
  ArrowRight,
  X,
  CheckCircle2,
  Shield,
  Activity,
  Layers,
  Zap
} from 'lucide-react';

const FEATURES_DATA = [
  {
    id: 'ai-classification',
    title: 'AI Issue Classification',
    icon: Brain,
    gradient: 'from-indigo-500 to-purple-600',
    tag: 'Multi-Modal Vision & NLP',
    summary: 'Autonomous classification of reported hazards using image edge analysis and semantic text processing.',
    detailedPoints: [
      'Multi-modal computer vision parses image texture, asphalt cracks, and luminosity in real time.',
      'NLP semantic engine extracts keywords to match 8 municipal operational departments.',
      'Generates instantaneous confidence ratings (up to 98%) with detected keyword tags.',
      'Auto-flags high hazard categories like live electrical wires and road collapses.'
    ]
  },
  {
    id: 'exact-location',
    title: 'Exact Location Pinning',
    icon: MapPin,
    gradient: 'from-rose-500 to-orange-500',
    tag: 'GPS & Reverse Geocoding',
    summary: 'Precision GPS geospatial coordinate capture with automated street, ward, and locality extraction.',
    detailedPoints: [
      'Interactive Leaflet & Google Maps pinpointing with draggable precision crosshairs.',
      'Automated reverse geocoding translates raw latitude/longitude into complete postal addresses.',
      'Ward and municipal zone detection for localized dispatching.',
      '150-meter proximity radius scanner to prevent duplicate citizen filings.'
    ]
  },
  {
    id: 'real-time-tracking',
    title: 'Real-Time Tracking',
    icon: Clock,
    gradient: 'from-amber-500 to-emerald-500',
    tag: '5-Stage Milestone SLA',
    summary: 'Transparent 5-stage progression timeline with live SLA countdown timers and field update feeds.',
    detailedPoints: [
      'Live milestone tracking: Submitted → Under Review → Assigned → In Progress → Resolved.',
      'Strict SLA countdown tracking with time-decay priority escalation for lagging complaints.',
      'Before & After resolution proof photos uploaded directly by municipal engineers.',
      'Citizen 5-star resolution feedback and satisfaction ratings.'
    ]
  },
  {
    id: 'department-routing',
    title: 'Department Routing',
    icon: Building2,
    gradient: 'from-blue-500 to-cyan-500',
    tag: '8 Municipal Cells',
    summary: 'Role-Based Access Control that dispatches grievances exclusively to certified departmental administrators.',
    detailedPoints: [
      'Dedicated dashboards for Roads, Sanitation, Water Supply, Electricity, Health, and Drainage.',
      'Departmental admins only access and triage complaints within their jurisdiction.',
      'Centralized escalation portal for Municipal Commissioner & Super Admin oversight.',
      'Dynamic re-routing capabilities when multi-department coordination is required.'
    ]
  },
  {
    id: 'admin-notifications',
    title: 'Admin Notifications',
    icon: Bell,
    gradient: 'from-purple-500 to-pink-500',
    tag: 'Instant Broadcast Engine',
    summary: 'Automated notification engine alerting field officers and citizens during every status transition.',
    detailedPoints: [
      'Real-time emergency broadcast for CRITICAL safety hazards to all municipal heads.',
      'Push alerts delivered to citizen devices when an officer replies or updates progress.',
      'Dedicated in-app Notification Center with unread counters and category filters.',
      'Full audit logging for all government actions and official bulletins.'
    ]
  },
  {
    id: 'gis-analytics',
    title: 'GIS Analytics',
    icon: BarChart3,
    gradient: 'from-emerald-500 to-teal-500',
    tag: 'Civic Spatial Intelligence',
    summary: 'Interactive geospatial heatmaps, ward breakdown telemetry, and predictive SLA performance metrics.',
    detailedPoints: [
      'Geospatial density heatmap highlighting recurring urban infrastructure bottlenecks.',
      'Department performance scorecards comparing resolution speed and SLA compliance.',
      'Interactive Chart.js visualizations covering category, status, and 6-month historical trends.',
      'One-click export of structured CSV complaint records for municipal governance audits.'
    ]
  }
];

export default function FeaturesSection({ onOpenReport, onExploreIssues }) {
  const [selectedFeature, setSelectedFeature] = useState(null);

  return (
    <div className="features-section-container max-w-[1200px] mx-auto space-y-8">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black">
          <Sparkles className="w-3.5 h-3.5" /> PLATFORM CAPABILITIES
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight m-0">
          Next-Generation Civic Governance Architecture
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto m-0">
          Harnessing artificial intelligence, geospatial GIS mapping, and automated departmental routing to streamline public issue redressal.
        </p>
      </div>

      {/* Feature Cards Grid (6 Cards, Equal Height, 24px Gap) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES_DATA.map((feat) => {
          const Icon = feat.icon;
          return (
            <div
              key={feat.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 p-6 flex flex-col justify-between transition-all group cursor-pointer"
              onClick={() => setSelectedFeature(feat)}
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feat.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {feat.tag}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors mb-2 m-0">
                  {feat.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed m-0">
                  {feat.summary}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
                <button
                  type="button"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                >
                  <span>Learn More</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-slate-400 font-semibold">CivicTrack Core</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Deep-Dive Modal */}
      {selectedFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative animate-scale-up space-y-4">
            <button
              type="button"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
              onClick={() => setSelectedFeature(null)}
              aria-label="Close feature details"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${selectedFeature.gradient} flex items-center justify-center text-white shadow-md`}>
                <selectedFeature.icon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{selectedFeature.tag}</span>
                <h3 className="text-lg font-black text-slate-900 m-0">{selectedFeature.title}</h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed m-0">
              {selectedFeature.summary}
            </p>

            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Enterprise Architecture Capabilities</div>
              {selectedFeature.detailedPoints.map((pt, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                className="btn-primary-gradient px-5 py-2.5 text-xs font-bold"
                onClick={() => setSelectedFeature(null)}
              >
                Close Explainer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
