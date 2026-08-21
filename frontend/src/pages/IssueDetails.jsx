import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Building2,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ThumbsUp,
  MessageSquare,
  Send,
  Image as ImageIcon,
  Paperclip,
  X,
  ExternalLink,
  Brain,
  History,
  Megaphone,
  Check,
  Zap,
  Sparkles,
  User,
  ShieldAlert,
  Camera,
  Layers,
  HelpCircle,
  Home
} from 'lucide-react';
import LeafletMap from '../components/LeafletMap';
import { DEPARTMENTS, INITIAL_ISSUES } from '../utils/demoData';

const API_BASE = 'http://127.0.0.1:5000';

export default function IssueDetails({
  currentUser,
  onUpvote,
  onUpdateIssue
}) {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'chat' | 'updates' | 'history'

  // Chat message state
  const [chatMessage, setChatMessage] = useState('');
  const [chatImage, setChatImage] = useState(null);
  const [chatImagePreview, setChatImagePreview] = useState(null);
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const chatEndRef = useRef(null);

  // Admin Bulletin Update state
  const [bulletinText, setBulletinText] = useState('');
  const [isPostingBulletin, setIsPostingBulletin] = useState(false);

  // Admin Status Update State
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const timelineSectionRef = useRef(null);

  // Auto-switch to timeline or chat tab if hash is present
  useEffect(() => {
    if (location.hash === '#timeline' || location.hash === '#history') {
      setActiveTab('history');
      setTimeout(() => {
        timelineSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } else if (location.hash === '#chat') {
      setActiveTab('chat');
    } else if (location.hash === '#updates') {
      setActiveTab('updates');
    }
  }, [location.hash]);

  // Fetch full details dynamically by issueId
  useEffect(() => {
    if (!issueId) return;
    fetchIssueDetails();
  }, [issueId]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [issue?.messages, activeTab]);

  const fetchIssueDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/api/issues/${issueId}/details`);
      if (res.ok) {
        const data = await res.json();
        setIssue(data);
        setNewStatus(data.status);
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      console.log(`Using fallback client data for issue #${issueId}`);
      // Local fallback from INITIAL_ISSUES
      const found = INITIAL_ISSUES.find(i => i.issue_id === Number(issueId));
      if (found) {
        setIssue(found);
        setNewStatus(found.status);
      } else {
        setError(`Complaint #${issueId} was not found in the municipal records.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = (e) => {
    const file = e.target.files[0];
    if (file) {
      setChatImage(file);
      setChatImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setChatImage(null);
    if (chatImagePreview) {
      URL.revokeObjectURL(chatImagePreview);
      setChatImagePreview(null);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() && !chatImage) return;

    const senderType = currentUser?.role === 'admin' ? 'Admin' : 'User';
    const senderName = currentUser?.name || (senderType === 'Admin' ? 'Admin Official' : 'Citizen');

    const tempMsg = {
      message_id: Date.now(),
      issue_id: issue.issue_id,
      sender_type: senderType,
      sender_id: currentUser?.id || (senderType === 'Admin' ? 1 : issue.user_id),
      sender_name: senderName,
      sender_role: currentUser?.role || 'citizen',
      message: chatMessage.trim(),
      image_path: chatImagePreview,
      created_at: new Date().toISOString(),
      formatted_time: 'just now'
    };

    // Optimistic UI update
    setIssue(prev => ({
      ...prev,
      messages: [...(prev.messages || []), tempMsg]
    }));

    const textToSend = chatMessage;
    const imageToSend = chatImage;
    setChatMessage('');
    setChatImage(null);
    setChatImagePreview(null);

    try {
      setIsSendingMsg(true);
      const formData = new FormData();
      formData.append('message', textToSend);
      formData.append('sender_type', senderType);
      if (currentUser?.id) formData.append('sender_id', currentUser.id);
      if (imageToSend) formData.append('image', imageToSend);

      const res = await fetch(`${API_BASE}/api/issues/${issue.issue_id}/messages`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.chat_message) {
          setIssue(prev => ({
            ...prev,
            messages: prev.messages.map(m => m.message_id === tempMsg.message_id ? data.chat_message : m)
          }));
        }
      }
    } catch (err) {
      console.log('Message stored in local session.');
    } finally {
      setIsSendingMsg(false);
    }
  };

  const handlePostBulletin = async (e) => {
    e.preventDefault();
    if (!bulletinText.trim()) return;

    const tempBulletin = {
      update_id: Date.now(),
      issue_id: issue.issue_id,
      admin_id: currentUser?.id || 1,
      admin_name: currentUser?.name || 'City Admin Officer',
      admin_department: issue.department || 'Municipal Administration',
      message: bulletinText.trim(),
      created_at: new Date().toISOString(),
      formatted_date: 'just now'
    };

    setIssue(prev => ({
      ...prev,
      updates: [tempBulletin, ...(prev.updates || [])]
    }));

    const textToSend = bulletinText;
    setBulletinText('');

    try {
      setIsPostingBulletin(true);
      const res = await fetch(`${API_BASE}/api/issues/${issue.issue_id}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          admin_id: currentUser?.id || 1
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.update) {
          setIssue(prev => ({
            ...prev,
            updates: prev.updates.map(u => u.update_id === tempBulletin.update_id ? data.update : u)
          }));
        }
      }
    } catch (err) {
      console.log('Bulletin recorded in client session.');
    } finally {
      setIsPostingBulletin(false);
    }
  };

  const handleSaveStatusUpdate = async () => {
    if (!newStatus || newStatus === issue.status) return;

    setIsUpdatingStatus(true);
    const oldSt = issue.status;

    const newHistory = {
      history_id: Date.now(),
      issue_id: issue.issue_id,
      old_status: oldSt,
      new_status: newStatus,
      updated_by_name: currentUser?.name || 'Admin Official',
      updated_by_role: 'admin',
      notes: statusNotes || `Status updated from ${oldSt} to ${newStatus}`,
      updated_at: new Date().toISOString(),
      formatted_time: 'just now'
    };

    const updatedIssue = {
      ...issue,
      status: newStatus,
      status_history: [...(issue.status_history || []), newHistory],
      resolved_at: newStatus === 'Resolved' ? new Date().toISOString() : issue.resolved_at,
      resolution_notes: newStatus === 'Resolved' ? (statusNotes || issue.resolution_notes) : issue.resolution_notes
    };

    setIssue(updatedIssue);
    if (onUpdateIssue) {
      onUpdateIssue(issue.issue_id, {
        status: newStatus,
        notes: statusNotes,
        resolved_at: updatedIssue.resolved_at,
        resolution_notes: updatedIssue.resolution_notes
      });
    }

    try {
      await fetch(`${API_BASE}/api/issues/${issue.issue_id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          notes: statusNotes,
          user_id: currentUser?.id || 1,
          resolution_notes: statusNotes
        })
      });
    } catch (err) {
      console.log('Status change saved in local session.');
    } finally {
      setIsUpdatingStatus(false);
      setStatusNotes('');
    }
  };

  // Error State: Issue Not Found
  if (error) {
    return (
      <div className="empty-state-card" style={{ padding: '4rem 2rem', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-xl font-extrabold text-slate-900 mb-1">Complaint #{issueId} Not Found</h3>
        <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">{error}</p>
        <div className="flex gap-3 justify-center">
          <button className="btn-primary-gradient" onClick={() => navigate('/')}>
            <Home className="w-4 h-4" />
            <span>Return to City Map</span>
          </button>
          <button className="btn-secondary-flat" onClick={() => navigate('/my-complaints')}>
            <span>My Registered Complaints</span>
          </button>
        </div>
      </div>
    );
  }

  // Loading State
  if (loading || !issue) {
    return (
      <div className="details-loading-box">
        <div className="details-spinner" />
        <p className="text-slate-500 font-semibold mt-3">Loading complaint #{issueId} details & discussion thread...</p>
      </div>
    );
  }

  // 8-Stage Extended Visual Progress Tracker Stages
  const standardStages = [
    { key: 'Submitted', label: '1. Submitted', icon: '📝' },
    { key: 'AI Classified', label: '2. AI Classified', icon: '🤖' },
    { key: 'Assigned', label: '3. Dept Assigned', icon: '🏢' },
    { key: 'Under Review', label: '4. Under Review', icon: '🔍' },
    { key: 'Field Inspection', label: '5. Inspection', icon: '📋' },
    { key: 'In Progress', label: '6. Work In Progress', icon: '🛠️' },
    { key: 'Resolved', label: '7. Resolved', icon: '✅' },
    { key: 'Citizen Feedback', label: '8. Citizen Feedback', icon: '⭐' }
  ];

  const statusOrder = ['Submitted', 'AI Classified', 'Assigned', 'Under Review', 'Field Inspection', 'In Progress', 'Resolved', 'Citizen Feedback'];
  const currentStageIndex = issue.status === 'Resolved' && issue.feedback_rating ? 7 : issue.status === 'Resolved' ? 6 : statusOrder.indexOf(issue.status) >= 0 ? statusOrder.indexOf(issue.status) : 3;

  // SLA details
  const slaRemaining = issue.sla_remaining_hours;
  const isBreached = issue.is_sla_breached || (slaRemaining !== undefined && slaRemaining < 0);

  // Photos Gallery
  const galleryImages = [];
  if (issue.image_path) galleryImages.push({ url: issue.image_path.startsWith('http') ? issue.image_path : `${API_BASE}/${issue.image_path}`, label: 'Initial Grievance Photo', author: issue.reporter_name });
  if (issue.resolution_image) galleryImages.push({ url: issue.resolution_image.startsWith('http') ? issue.resolution_image : `${API_BASE}/${issue.resolution_image}`, label: 'Proof of Resolution', author: issue.assigned_to || 'Field Squad' });
  (issue.messages || []).forEach(m => {
    if (m.image_path) {
      galleryImages.push({
        url: m.image_path.startsWith('blob:') || m.image_path.startsWith('http') ? m.image_path : `${API_BASE}/${m.image_path}`,
        label: `Attached by ${m.sender_name}`,
        author: m.sender_name
      });
    }
  });

  return (
    <div className="issue-details-page">

      {/* ── Breadcrumb & Top Bar ── */}
      <div className="details-top-bar">
        <button className="btn-back-link" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Complaints</span>
        </button>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            className="btn-card-upvote"
            onClick={() => {
              if (onUpvote) onUpvote(issue.issue_id);
              setIssue(prev => ({ ...prev, upvotes: (prev.upvotes || 1) + 1 }));
            }}
          >
            <ThumbsUp className="w-4 h-4 text-primary" />
            <span>{issue.upvotes || 1} Upvotes</span>
          </button>

          <span className={`status-pill status-${issue.status.toLowerCase().replace(' ', '-')}`}>
            {issue.status}
          </span>
          <span className={`priority-pill priority-${(issue.priority || 'medium').toLowerCase()}`}>
            {issue.priority} Priority
          </span>
        </div>
      </div>

      {/* ── Main Hero Card ── */}
      <div className="details-hero-card">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="badge-complaint-id">COMPLAINT #{issue.issue_id}</span>
              <span className="badge-cat-sm">{issue.category}</span>
              {issue.ai_confidence && (
                <span className="badge-ai-pill">
                  <Sparkles className="w-3 h-3" /> AI Conf: {Math.round(issue.ai_confidence * 100)}%
                </span>
              )}
              {issue.ai_priority_score && (
                <span className="badge-score-pill">
                  ⚡ AI Score: {Math.round(issue.ai_priority_score)}/100
                </span>
              )}
            </div>
            <h1 className="details-title">{issue.title}</h1>
            <div className="details-meta-row">
              <span>👤 Reported by <strong>{issue.reporter_name || 'Citizen'}</strong></span>
              <span>•</span>
              <span>📅 {issue.created_at || 'Recently reported'}</span>
              <span>•</span>
              <span>🏢 Department: <strong>{issue.department || 'General Administration'}</strong></span>
            </div>
          </div>

          {/* SLA countdown badge */}
          {issue.status !== 'Resolved' && issue.status !== 'Rejected' && (
            <div className={`details-sla-box ${isBreached ? 'breached' : ''}`}>
              <div className="sla-box-icon">
                {isBreached ? <AlertTriangle className="w-5 h-5 text-rose-600" /> : <Clock className="w-5 h-5 text-amber-600" />}
              </div>
              <div>
                <div className="sla-box-title">
                  {isBreached ? 'SLA DEADLINE BREACHED' : 'TARGET RESOLUTION SLA'}
                </div>
                <div className="sla-box-val">
                  {isBreached ? 'Action Overdue' : `${issue.sla_hours || 48}h Target Window`}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 5-STAGE VISUAL PROGRESS TRACKER ── */}
        <div className="visual-tracker-container" ref={timelineSectionRef}>
          <div className="visual-tracker-track">
            {standardStages.map((stage, idx) => {
              const isDone = currentStageIndex >= idx;
              const isCurrent = currentStageIndex === idx;

              const timelineStage = (issue.timeline || []).find(t => t.stage === stage.key);
              const stageDate = timelineStage?.date;

              return (
                <div
                  key={stage.key}
                  className={`tracker-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
                >
                  <div className="step-circle">
                    {isDone ? (
                      isCurrent ? <span className="current-pulse-dot" /> : <Check className="w-4 h-4 text-white" />
                    ) : (
                      <span className="step-number">{idx + 1}</span>
                    )}
                  </div>
                  <div className="step-content">
                    <div className="step-label">{stage.label}</div>
                    <div className="step-date">{stageDate || (isDone ? 'Completed' : 'Pending')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="details-tabs-bar">
        <button
          className={`details-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Layers className="w-4 h-4" />
          <span>Overview & Location</span>
        </button>

        <button
          className={`details-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Citizen-Admin Chat</span>
          {(issue.messages || []).length > 0 && (
            <span className="tab-counter-badge">{(issue.messages || []).length}</span>
          )}
        </button>

        <button
          className={`details-tab-btn ${activeTab === 'updates' ? 'active' : ''}`}
          onClick={() => setActiveTab('updates')}
        >
          <Megaphone className="w-4 h-4" />
          <span>Official Bulletins</span>
          {(issue.updates || []).length > 0 && (
            <span className="tab-counter-badge">{(issue.updates || []).length}</span>
          )}
        </button>

        <button
          className={`details-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History className="w-4 h-4" />
          <span>Audit History</span>
        </button>
      </div>

      {/* ══════════ TAB 1: OVERVIEW & LOCATION ══════════ */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Details & Description */}
          <div className="lg:col-span-2 space-y-6">

            {/* Description Card */}
            <div className="details-card">
              <h3 className="card-section-title">
                <span>📝 Complaint Description</span>
              </h3>
              <p className="details-description-text">{issue.description}</p>

              {/* Resolution Notes if Resolved */}
              {issue.status === 'Resolved' && issue.resolution_notes && (
                <div className="resolution-success-box">
                  <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Official Resolution Summary</span>
                  </div>
                  <p className="text-xs text-emerald-700 leading-relaxed m-0">
                    {issue.resolution_notes}
                  </p>
                  {issue.resolved_at && (
                    <div className="text-[11px] text-emerald-600 font-semibold mt-2">
                      Resolved on: {issue.resolved_at}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Exact Location & Pinpoint GIS Map */}
            <div className="details-card">
              <div className="flex justify-between items-center mb-3">
                <h3 className="card-section-title">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>Exact GPS Geolocation</span>
                </h3>
                {issue.latitude && issue.longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${issue.latitude},${issue.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                  >
                    <span>Open in Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="address-banner mb-3">
                <div className="font-bold text-xs text-slate-800">
                  📍 {issue.address || issue.location}
                </div>
                {issue.latitude && issue.longitude && (
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Coordinates: {issue.latitude.toFixed(5)}° N, {issue.longitude.toFixed(5)}° E
                  </div>
                )}
              </div>

              {issue.latitude && issue.longitude ? (
                <div className="details-map-frame">
                  <LeafletMap
                    issues={[issue]}
                    initialCoords={[issue.latitude, issue.longitude]}
                    height="280px"
                  />
                </div>
              ) : (
                <div className="no-coords-box">No GPS coordinates recorded for this complaint.</div>
              )}
            </div>

            {/* Photos & Evidence Gallery */}
            <div className="details-card">
              <h3 className="card-section-title">
                <Camera className="w-4 h-4 text-indigo-600" />
                <span>Evidence & Resolution Photo Gallery</span>
              </h3>

              {galleryImages.length > 0 ? (
                <div className="gallery-grid">
                  {galleryImages.map((img, i) => (
                    <div key={i} className="gallery-item-card">
                      <img src={img.url} alt={img.label} className="gallery-image" />
                      <div className="gallery-caption">
                        <div className="font-bold text-xs text-slate-800">{img.label}</div>
                        <div className="text-[11px] text-slate-400">By {img.author}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-photos-box">
                  <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-semibold m-0">No photos uploaded yet for this issue.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Photos attached in the discussion thread will appear here.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Administrative Dispatch & Action Center */}
          <div className="space-y-6">

            {/* Department Assignment Box */}
            <div className="details-card">
              <h3 className="card-section-title">
                <Building2 className="w-4 h-4 text-primary" />
                <span>Municipal Department Dispatch</span>
              </h3>

              <div className="space-y-3 mt-3">
                <div className="dept-detail-item">
                  <span className="lbl">Responsible Department:</span>
                  <span className="val font-bold text-slate-800">{issue.department || 'General Administration'}</span>
                </div>
                <div className="dept-detail-item">
                  <span className="lbl">Assigned Field Squad:</span>
                  <span className="val text-indigo-600 font-semibold">{issue.assigned_to || 'Pending Squad Assignment'}</span>
                </div>
                <div className="dept-detail-item">
                  <span className="lbl">Complaint Category:</span>
                  <span className="val">{issue.category}</span>
                </div>
                <div className="dept-detail-item">
                  <span className="lbl">Priority Severity:</span>
                  <span className={`priority-pill priority-${(issue.priority || 'medium').toLowerCase()}`}>
                    {issue.priority}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Action Box (If user is Admin) */}
            {currentUser?.role === 'admin' && (
              <div className="details-card admin-action-card">
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge-admin-tag">ADMIN CONTROLS</span>
                  <span className="text-xs font-bold text-slate-700">Manage Lifecycle</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="form-label-bold">Update Complaint Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="input-select"
                    >
                      {['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label-bold">Status Remarks / Resolution Notes</label>
                    <textarea
                      rows="3"
                      placeholder="Enter official action taken, contractor dispatch notes, or resolution remarks..."
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      className="input-textarea"
                    />
                  </div>

                  <button
                    className="btn-primary-gradient w-full justify-center"
                    onClick={handleSaveStatusUpdate}
                    disabled={isUpdatingStatus || newStatus === issue.status}
                  >
                    {isUpdatingStatus ? 'Saving Status...' : 'Apply Status Change & Notify Citizen'}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Chat Teaser */}
            <div className="details-card bg-indigo-50 border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h4 className="font-bold text-xs text-slate-900 m-0">Direct Citizen-Admin Dialogue</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Have questions or need to share additional proof? Chat directly with the municipal response team.
              </p>
              <button
                className="btn-secondary-flat w-full font-bold text-xs justify-center flex items-center gap-1.5"
                onClick={() => setActiveTab('chat')}
              >
                <span>Open Conversation</span>
                <span className="badge-cat-sm bg-white">{(issue.messages || []).length}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ══════════ TAB 2: CITIZEN-ADMIN CHAT / TICKETING ══════════ */}
      {activeTab === 'chat' && (
        <div className="chat-interface-card">
          <div className="chat-header">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 m-0">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span>Complaint #{issue.issue_id} Discussion Thread</span>
              </h3>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Direct transparent communication between Citizen ({issue.reporter_name}) and Municipal Officials.
              </p>
            </div>
            <div className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              {(issue.messages || []).length} Messages
            </div>
          </div>

          {/* Messages Stream */}
          <div className="chat-messages-container">
            {(issue.messages || []).length > 0 ? (
              (issue.messages || []).map((msg, idx) => {
                const isAdmin = msg.sender_type === 'Admin' || msg.sender_role === 'admin';
                const isMe = currentUser && (msg.sender_id === currentUser.id || (msg.sender_type === 'Admin' && currentUser.role === 'admin'));

                return (
                  <div
                    key={msg.message_id || idx}
                    className={`chat-bubble-row ${isAdmin ? 'admin-sender' : 'citizen-sender'} ${isMe ? 'is-me' : ''}`}
                  >
                    <div className="chat-avatar">
                      {isAdmin ? '🏛️' : '👤'}
                    </div>

                    <div className="chat-bubble">
                      <div className="chat-bubble-meta">
                        <span className="chat-sender-name">
                          {msg.sender_name || (isAdmin ? 'Admin Official' : 'Citizen')}
                        </span>
                        <span className={`chat-role-tag ${isAdmin ? 'admin' : 'citizen'}`}>
                          {isAdmin ? 'MUNICIPAL OFFICER' : 'CITIZEN'}
                        </span>
                        <span className="chat-time">{msg.formatted_time || msg.created_at || 'just now'}</span>
                      </div>

                      <div className="chat-text">{msg.message}</div>

                      {msg.image_path && (
                        <div className="chat-image-attachment">
                          <img
                            src={msg.image_path.startsWith('blob:') || msg.image_path.startsWith('http') ? msg.image_path : `${API_BASE}/${msg.image_path}`}
                            alt="Chat attachment"
                            className="chat-attached-img"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-slate-400">
                <MessageSquare className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-xs text-slate-600 m-0">No messages in this discussion yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">Type below to post a question, update, or upload additional photos.</p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Image Preview */}
          {chatImagePreview && (
            <div className="chat-preview-box">
              <div className="relative inline-block">
                <img src={chatImagePreview} alt="Upload preview" className="w-20 h-20 object-cover rounded-lg border" />
                <button className="remove-preview-btn" onClick={handleRemoveImage}>
                  <X className="w-3 h-3" />
                </button>
              </div>
              <span className="text-xs text-slate-500">Image will be attached to your message</span>
            </div>
          )}

          {/* Message Input Box */}
          <form className="chat-composer-form" onSubmit={handleSendMessage}>
            <label className="btn-attach-image" title="Attach Photo / Image">
              <Paperclip className="w-4 h-4 text-slate-500" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImagePick}
                style={{ display: 'none' }}
              />
            </label>

            <input
              type="text"
              placeholder={currentUser?.role === 'admin' ? "Reply as Municipal Official..." : "Ask a follow-up question or share details..."}
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              className="chat-input"
            />

            <button
              type="submit"
              className="btn-chat-send"
              disabled={(!chatMessage.trim() && !chatImage) || isSendingMsg}
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* ══════════ TAB 3: OFFICIAL BULLETINS / UPDATES ══════════ */}
      {activeTab === 'updates' && (
        <div className="space-y-6">
          {/* Admin Composer for Official Broadcast */}
          {currentUser?.role === 'admin' && (
            <div className="details-card admin-bulletin-composer">
              <div className="flex items-center gap-2 mb-2">
                <Megaphone className="w-4 h-4 text-primary" />
                <h4 className="font-bold text-sm text-slate-900 m-0">Post Official Progress Bulletin</h4>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Broadcast public progress milestones (e.g. "Inspection completed", "Road resurfacing scheduled for 20 Aug"). This notifies the citizen directly.
              </p>

              <form onSubmit={handlePostBulletin}>
                <textarea
                  rows="3"
                  placeholder="e.g. Engineering squad deployed with excavator. Asphalt compaction in progress..."
                  value={bulletinText}
                  onChange={(e) => setBulletinText(e.target.value)}
                  className="input-textarea mb-3"
                  required
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="btn-primary-gradient font-bold text-xs"
                    disabled={!bulletinText.trim() || isPostingBulletin}
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>{isPostingBulletin ? 'Publishing...' : 'Broadcast Official Update'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Bulletins Feed */}
          <div className="details-card">
            <h3 className="card-section-title mb-4">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Official Municipal Bulletins & Field Dispatches</span>
            </h3>

            {(issue.updates || []).length > 0 ? (
              <div className="space-y-4">
                {(issue.updates || []).map((bulletin) => (
                  <div key={bulletin.update_id} className="bulletin-card">
                    <div className="bulletin-header">
                      <div className="flex items-center gap-2">
                        <span className="bulletin-icon-badge">🏛️</span>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{bulletin.admin_name || 'City Admin Officer'}</div>
                          <div className="text-[11px] text-slate-400">{bulletin.admin_department || 'Municipal Administration'}</div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 font-semibold">{bulletin.formatted_date || bulletin.created_at}</div>
                    </div>
                    <div className="bulletin-body">
                      {bulletin.message}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">
                <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-xs text-slate-600 m-0">No official bulletins published yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">Official updates posted by authorities will appear here in real-time.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ TAB 4: AUDIT HISTORY TIMELINE ══════════ */}
      {activeTab === 'history' && (
        <div className="details-card">
          <h3 className="card-section-title mb-2">
            <History className="w-4 h-4 text-indigo-600" />
            <span>Complete Complaint Lifecycle & Status Audit Trail</span>
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Immutable log of every status transition, automated AI triage, and administrative update recorded in the system.
          </p>

          <div className="audit-timeline-track">
            {(issue.status_history || []).length > 0 ? (
              (issue.status_history || []).map((entry, idx) => (
                <div key={entry.history_id || idx} className="audit-item">
                  <div className="audit-bullet" />
                  <div className="audit-content">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <div className="flex items-center gap-2">
                        {entry.old_status && (
                          <span className="text-xs text-slate-400 line-through">{entry.old_status}</span>
                        )}
                        {entry.old_status && <span className="text-xs text-slate-400">→</span>}
                        <span className={`status-pill status-${entry.new_status.toLowerCase().replace(' ', '-')}`}>
                          {entry.new_status}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-semibold">
                        {entry.formatted_time || entry.updated_at}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 font-medium">
                      {entry.notes || 'Status updated by authority.'}
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1">
                      Action logged by: <strong>{entry.updated_by_name || 'System'}</strong> ({entry.updated_by_role || 'admin'})
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-3">
                <div className="audit-item">
                  <div className="audit-bullet" />
                  <div className="audit-content">
                    <div className="font-bold text-xs text-slate-800">Complaint Submitted</div>
                    <div className="text-xs text-slate-500">{issue.created_at || 'Recently logged'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
