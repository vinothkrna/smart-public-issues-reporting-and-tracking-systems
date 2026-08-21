import React from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  MapPin,
  Building,
  User,
  Sparkles,
  ThumbsUp,
  Camera,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  ExternalLink,
  Navigation
} from 'lucide-react';
import GoogleMapPicker from './GoogleMapPicker';

export default function TrackTimelineModal({ issue, isOpen, onClose, onUpvote, onOpenFullDetails }) {
  if (!isOpen || !issue) return null;

  const hasLocation = Boolean(issue.latitude && issue.longitude);

  const timelineSteps = issue.timeline || [
    { stage: 'Submitted',    label: 'Complaint Submitted',                     done: true,  date: issue.created_at || 'Registered' },
    { stage: 'Under Review', label: 'AI & Municipal Verification',             done: ['Under Review', 'Assigned', 'In Progress', 'Resolved'].includes(issue.status), date: null },
    { stage: 'Assigned',     label: `Assigned to ${issue.department || 'Department'}`, done: ['Assigned', 'In Progress', 'Resolved'].includes(issue.status), date: null },
    { stage: 'In Progress',  label: 'Field Work in Progress',                  done: ['In Progress', 'Resolved'].includes(issue.status), date: null },
    { stage: 'Resolved',     label: 'Issue Resolved & Closed',                done: issue.status === 'Resolved', date: issue.resolved_at || null }
  ];

  return (
    <div className="modal-backdrop-blur">
      <div className="modal-card track-modal">

        {/* ── Header ── */}
        <div className="modal-header-row border-b pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`status-pill status-${issue.status.toLowerCase().replace(' ', '-')}`}>
                {issue.status}
              </span>
              <span className={`priority-pill priority-${(issue.priority || 'Medium').toLowerCase()}`}>
                {issue.priority} Priority
              </span>
              <span className="text-xs font-bold text-slate-400">#{issue.issue_id}</span>
            </div>
            <h3 className="modal-title text-xl font-extrabold text-slate-900">{issue.title}</h3>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span><MapPin className="w-3.5 h-3.5 inline text-rose-500 mr-1" />{issue.location}</span>
              <span><Calendar className="w-3.5 h-3.5 inline text-slate-400 mr-1" />{issue.created_at}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="btn-upvote-chip" onClick={() => onUpvote(issue.issue_id)}>
              <ThumbsUp className="w-4 h-4 text-primary" />
              <span>Upvote ({issue.upvotes || 1})</span>
            </button>
            <button className="close-btn" onClick={onClose}><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* ── Modal Body ── */}
        <div className="track-modal-body">
          <div className="modal-grid-2">

            {/* Left: Lifecycle Timeline */}
            <div className="timeline-left-col">
              <h4 className="section-subtitle">
                <ShieldCheck className="w-4 h-4 text-indigo-600 inline mr-1.5" />
                Resolution Lifecycle Timeline
              </h4>

              <div className="timeline-vertical-track">
                {timelineSteps.map((step, idx) => (
                  <div key={idx} className={`timeline-vertical-item ${step.done ? 'done' : 'pending'}`}>
                    <div className="timeline-bullet">
                      {step.done
                        ? <CheckCircle2 className="w-4 h-4 text-white" />
                        : <span className="bullet-dot" />}
                    </div>
                    <div className="timeline-content">
                      <div className="font-bold text-sm text-slate-800">{step.label}</div>
                      <div className="text-xs text-slate-400">
                        {step.date ? step.date : (step.done ? 'Stage Completed' : 'Pending Step')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Department & Officer Details */}
              <div className="dept-info-card mt-6">
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="text-slate-500">Concerned Department:</span>
                  <span className="badge-dept">{issue.department || 'Roads & PWD'}</span>
                </div>
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="text-slate-500">Assigned Officer:</span>
                  <span className="font-bold text-slate-700">{issue.assigned_to || 'Field Response Squad'}</span>
                </div>
                {issue.ai_confidence && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">AI Confidence:</span>
                    <span className="font-bold text-emerald-600">{Math.round(issue.ai_confidence * 100)}% Verified</span>
                  </div>
                )}
              </div>

              {/* ── Pinned Location Map ── */}
              {hasLocation ? (
                <div className="track-location-map-wrap mt-5">
                  <h4 className="section-subtitle mb-2">
                    <Navigation className="w-4 h-4 text-rose-500 inline mr-1.5" />
                    Pinned Issue Location
                  </h4>
                  <GoogleMapPicker
                    mode="tracking"
                    issue={issue}
                    height="200px"
                  />
                  {/* Coordinate + address display */}
                  <div className="track-coords-row">
                    <div className="track-coord-chip">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Latitude</span>
                      <span className="text-xs font-mono font-bold text-slate-700">
                        {issue.latitude.toFixed(6)}°N
                      </span>
                    </div>
                    <div className="track-coord-chip">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Longitude</span>
                      <span className="text-xs font-mono font-bold text-slate-700">
                        {issue.longitude.toFixed(6)}°E
                      </span>
                    </div>
                    <a
                      href={`https://maps.google.com/?q=${issue.latitude},${issue.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="track-open-maps-btn"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in Google Maps
                    </a>
                  </div>
                  {issue.address && (
                    <p className="text-xs text-slate-500 mt-1 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 leading-relaxed">
                      📍 {issue.address}
                    </p>
                  )}
                </div>
              ) : (
                <div className="track-no-location-box mt-5">
                  <MapPin className="w-5 h-5 text-slate-300" />
                  <span className="text-xs text-slate-400">No GPS coordinates recorded for this complaint.</span>
                </div>
              )}
            </div>

            {/* Right: Photos & Resolution Notes */}
            <div className="evidence-right-col">
              <h4 className="section-subtitle">
                <Camera className="w-4 h-4 text-indigo-600 inline mr-1.5" />
                Photographic Proof & Remarks
              </h4>

              <div className="photos-comparison-grid mb-4">
                <div className="photo-box">
                  <div className="photo-label">Initial Citizen Report</div>
                  <div className="photo-container">
                    {issue.image_path ? (
                      <img src={`http://127.0.0.1:5000/static/${issue.image_path}`} alt="Initial proof" />
                    ) : (
                      <div className="placeholder-photo">
                        <Camera className="w-6 h-6 text-slate-300 mb-1" />
                        <span>Evidence image recorded</span>
                      </div>
                    )}
                  </div>
                </div>

                {issue.resolution_image && (
                  <div className="photo-box success-border">
                    <div className="photo-label success">Resolution Proof</div>
                    <div className="photo-container">
                      <img src={`http://127.0.0.1:5000/static/${issue.resolution_image}`} alt="Resolution proof" />
                    </div>
                  </div>
                )}
              </div>

              <div className="description-box mb-3">
                <label className="text-xs font-bold text-slate-700 block mb-1">Citizen Description:</label>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {issue.description}
                </p>
              </div>

              {issue.resolution_notes && (
                <div className="resolution-notes-box">
                  <label className="text-xs font-bold text-emerald-700 block mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                    Official Resolution Remarks:
                  </label>
                  <p className="text-xs text-emerald-900 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                    {issue.resolution_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="modal-footer-row border-t pt-4 mt-4 flex justify-between items-center">
          <span className="text-xs text-slate-400">
            Reporter: <strong>{issue.reporter_name || 'Citizen'}</strong>
          </span>
          <div className="flex gap-2">
            <button className="btn-secondary-flat" onClick={onClose}>Close</button>
            {onOpenFullDetails && (
              <button
                className="btn-primary-gradient"
                onClick={() => {
                  onClose();
                  onOpenFullDetails(issue.issue_id);
                }}
              >
                <span>Full Details & Chat &rarr;</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
