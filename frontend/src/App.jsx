import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import HeroStats from './components/HeroStats';
import FeaturesSection from './components/FeaturesSection';
import NotificationCenterModal from './components/NotificationCenterModal';
import LeafletMap from './components/LeafletMap';
import IssuesList from './components/IssuesList';
import ReportIssueModal from './components/ReportIssueModal';
import TrackTimelineModal from './components/TrackTimelineModal';
import IssueDetails from './pages/IssueDetails';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import SuccessPage from './pages/SuccessPage';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOTP from './pages/VerifyOTP';
import ResetPassword from './pages/ResetPassword';
import { INITIAL_ISSUES, INITIAL_NOTIFICATIONS } from './utils/demoData';
import './App.css';

// Lazy-loaded heavy components (code splitting)
const AnalyticsView      = lazy(() => import('./components/AnalyticsView'));
const AIPriorityPanel    = lazy(() => import('./components/AIPriorityPanel'));
const AdminCenter        = lazy(() => import('./components/AdminCenter'));
const AdminDashboard     = lazy(() => import('./pages/AdminDashboard'));
const CitizenDashboard   = lazy(() => import('./pages/CitizenDashboard'));
const TrackComplaintPage = lazy(() => import('./pages/TrackComplaintPage'));
const MasterDataVault    = lazy(() => import('./pages/MasterDataVault'));

// Lightweight Suspense fallback
function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '0.75rem' }}>
      <div style={{ width: '2rem', height: '2rem', border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>Loading module…</span>
    </div>
  );
}

function MainAppContent() {
  const navigate = useNavigate();
  const { currentUser, logout, isCitizen, isAdmin } = useAuth();

  const [issues, setIssues] = useState(INITIAL_ISSUES);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [trackingIssueId, setTrackingIssueId] = useState(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000';

  const fetchLiveBackendData = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`${API_BASE}/api/issues?per_page=200`);
      if (res.ok) {
        const data = await res.json();
        const liveIssues = Array.isArray(data) ? data : (data.issues || []);
        setIssues(liveIssues);
      }
    } catch {
      if (!silent) console.log('Backend sync offline, waiting for server.');
    }

    try {
      const token = localStorage.getItem('civic_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const notifUrl = currentUser?.id 
        ? `${API_BASE}/api/notifications?user_id=${currentUser.id}` 
        : `${API_BASE}/api/notifications`;
      const notifRes = await fetch(notifUrl, { headers });
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData.notifications || []);
      }
    } catch {}
  }, [currentUser]);

  // Initial fetch and on user change
  useEffect(() => {
    fetchLiveBackendData();
  }, [fetchLiveBackendData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => fetchLiveBackendData(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchLiveBackendData]);

  const handleIssueCreated = (newIssue) => {
    setIssues(prev => [newIssue, ...prev]);
    setTimeout(() => fetchLiveBackendData(true), 1500);

    const newNotif = {
      notification_id: Date.now(),
      user_id: currentUser ? currentUser.id : 2,
      issue_id: newIssue.issue_id,
      message: `🎉 Complaint #${newIssue.issue_id} ('${newIssue.title}') was registered and routed to ${newIssue.department || 'Municipal Cell'}.`,
      type: 'status_update',
      is_read: false,
      created_at: new Date().toISOString(),
      time_ago: 'just now'
    };
    setNotifications(prev => [newNotif, ...prev]);

    navigate(`/issue/${newIssue.issue_id}`);
  };

  const handleUpdateIssue = (issueId, updates) => {
    setIssues(prev => prev.map(issue => {
      if (issue.issue_id === issueId) {
        const updated = { ...issue, ...updates };
        if (updates.status) {
          updated.timeline = [
            { stage: 'Submitted', label: 'Complaint Submitted', done: true, date: issue.created_at || '16 Aug 2026' },
            { stage: 'Under Review', label: 'AI & Admin Verification', done: ['Under Review', 'Assigned', 'In Progress', 'Resolved'].includes(updates.status), date: null },
            { stage: 'Assigned', label: `Assigned to ${updated.department || 'Department'}`, done: ['Assigned', 'In Progress', 'Resolved'].includes(updates.status), date: null },
            { stage: 'In Progress', label: 'Field Action in Progress', done: ['In Progress', 'Resolved'].includes(updates.status), date: null },
            { stage: 'Resolved', label: 'Issue Resolved & Closed', done: updates.status === 'Resolved', date: updates.resolved_at || null }
          ];
        }
        return updated;
      }
      return issue;
    }));

    const targetIssue = issues.find(i => i.issue_id === issueId);
    if (targetIssue) {
      const notifMsg = updates.status === 'Resolved'
        ? `✅ Issue #${issueId} ('${targetIssue.title}') has been marked as RESOLVED by ${updates.department || targetIssue.department}!`
        : `📋 Status for Issue #${issueId} updated to '${updates.status || 'Updated'}'.`;

      setNotifications(prev => [
        {
          notification_id: Date.now(),
          user_id: targetIssue.user_id,
          issue_id: issueId,
          message: notifMsg,
          type: 'status_update',
          is_read: false,
          created_at: new Date().toISOString(),
          time_ago: 'just now'
        },
        ...prev
      ]);
    }

    fetch(`${API_BASE}/api/issues/${issueId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    .then(() => fetchLiveBackendData(true))
    .catch(() => {});
  };

  const handleUpvote = async (issueId) => {
    setIssues(prev => prev.map(issue => {
      if (issue.issue_id === issueId) {
        const nextUpvotes = (issue.upvotes || 1) + 1;
        let nextPriority = issue.priority;
        if (nextUpvotes >= 5 && issue.priority === 'Low') nextPriority = 'Medium';
        if (nextUpvotes >= 10 && issue.priority !== 'Urgent') nextPriority = 'High';
        return { ...issue, upvotes: nextUpvotes, priority: nextPriority };
      }
      return issue;
    }));

    fetch(`${API_BASE}/api/issues/${issueId}/upvote`, { method: 'POST' }).catch(() => {});
  };

  const handleMarkNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    fetch(`${API_BASE}/api/notifications/read-all`, { method: 'POST' }).catch(() => {});
  };

  const totalCount = issues.length;
  const resolvedCount = issues.filter(i => i.status === 'Resolved').length;
  const pendingCount = issues.filter(i => i.status !== 'Resolved' && i.status !== 'Rejected').length;

  const selectedIssue = issues.find(i => i.issue_id === trackingIssueId);
  const myIssues = issues.filter(i => i.user_id === currentUser?.id || i.reporter_name === currentUser?.name);

  const filteredHomeIssues = issues.filter(i => {
    const matchesSearch = !searchQuery ||
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(i.issue_id) === searchQuery;
    const matchesCat = selectedCategory === 'All' || i.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="civic-app-root">
      <Navbar
        currentUser={currentUser}
        onLogout={logout}
        onOpenAuth={() => navigate('/login')}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        notifications={notifications}
        onMarkNotificationsRead={handleMarkNotificationsRead}
      />

      <main className="civic-main-content">
        <Routes>
          {/* Public Landing & Explore */}
          <Route path="/" element={
            <div className="space-y-16 lg:space-y-20 py-4">
              <HeroStats
                total={totalCount}
                resolved={resolvedCount}
                pending={pendingCount}
                departmentsCount={8}
                onOpenReport={() => setIsReportOpen(true)}
                onViewPublicIssues={() => {
                  const el = document.getElementById('public-issues-list');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
              />

              {/* Features Overview Grid (6 Cards + Explainer Modal) */}
              <FeaturesSection
                onOpenReport={() => setIsReportOpen(true)}
                onExploreIssues={() => {
                  const el = document.getElementById('public-issues-list');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              />

              {/* GIS Interactive Map Preview */}
              <div className="map-section-card">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Live City Grievance GIS Map</h3>
                    <p className="text-xs text-slate-500">Geospatial visualization of reported civic hazards across municipal wards. Click any marker to view details.</p>
                  </div>
                </div>
                <LeafletMap issues={issues} height="400px" />
              </div>

              {/* Public Issues Feed */}
              <div id="public-issues-list">
                <IssuesList issues={filteredHomeIssues} onUpvote={handleUpvote} />
              </div>
            </div>
          } />

          <Route path="/explore" element={<Navigate to="/" replace />} />

          {/* ── PUBLIC ISSUES REGISTRY ROUTE ── */}
          <Route path="/public-issues" element={
            <div className="max-w-[1200px] mx-auto py-6 space-y-6">
              <IssuesList
                issues={issues}
                onUpvote={handleUpvote}
                title="Public Civic Grievances Registry"
                subtitle="Browse, verify, and monitor reported municipal hazards in your ward"
              />
            </div>
          } />

          {/* ── TRACK COMPLAINT FULL PAGE ROUTE ── */}
          <Route path="/track-complaint" element={
            <Suspense fallback={<PageLoader />}>
              <TrackComplaintPage issues={issues} />
            </Suspense>
          } />

          {/* Complete Authentication Workflow Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<EmailVerificationPage />} />
          <Route path="/register-success" element={<SuccessPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* ── PUBLIC ANALYTICS ROUTE (no auth required) ── */}
          <Route path="/analytics" element={
            <Suspense fallback={<PageLoader />}>
              <AnalyticsView issues={issues} />
            </Suspense>
          } />

          {/* ── PUBLIC AI PRIORITY ROUTE (no auth required) ── */}
          <Route path="/ai-priority" element={
            <Suspense fallback={<PageLoader />}>
              <AIPriorityPanel issues={issues} />
            </Suspense>
          } />

          {/* ── REPORT ISSUE ROUTE ── */}
          <Route path="/report-issue" element={
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto space-y-4 my-8">
              <h3 className="text-xl font-black text-slate-900 m-0">Report a Public Grievance</h3>
              <p className="text-xs text-slate-500">Click below to open the AI-assisted complaint filing modal.</p>
              <button className="btn-primary-gradient mx-auto text-xs py-3 px-6 font-bold" onClick={() => setIsReportOpen(true)}>
                Open Report Issue Modal
              </button>
            </div>
          } />

          {/* Protected Citizen Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['citizen']}>
              <Suspense fallback={<PageLoader />}>
                <CitizenDashboard
                  issues={issues}
                  notifications={notifications}
                  onOpenReport={() => setIsReportOpen(true)}
                  onUpvote={handleUpvote}
                />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="/my-complaints" element={
            <ProtectedRoute allowedRoles={['citizen']}>
              <IssuesList
                issues={myIssues}
                onUpvote={handleUpvote}
                title={`My Registered Complaints (${myIssues.length})`}
                subtitle={`Track complaint lifecycle and dialogue for grievances filed by ${currentUser?.name || 'you'}`}
              />
            </ProtectedRoute>
          } />

          <Route path="/notifications" element={
            <ProtectedRoute allowedRoles={['citizen', 'admin']}>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 max-w-[1200px] mx-auto">
                <h3 className="font-extrabold text-base text-slate-900 m-0">In-App Notifications Stream</h3>
                <div className="space-y-3">
                  {notifications.map(notif => (
                    <div
                      key={notif.notification_id || notif.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-indigo-300 transition-all"
                      onClick={() => notif.issue_id && navigate(`/issue/${notif.issue_id}`)}
                    >
                      <div className="font-semibold text-xs text-slate-800">{notif.message}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{notif.time_ago || 'recently'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute allowedRoles={['citizen', 'admin']}>
              <div className="bg-white p-8 rounded-3xl border border-slate-200 max-w-lg mx-auto shadow-sm space-y-4 my-6">
                <h3 className="font-extrabold text-lg text-slate-900 m-0">User Account Profile</h3>
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between">
                    <span className="font-bold text-slate-500">Name:</span>
                    <span className="font-black text-slate-900">{currentUser?.name}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between">
                    <span className="font-bold text-slate-500">Email:</span>
                    <span className="font-mono text-indigo-600 font-bold">{currentUser?.email}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between">
                    <span className="font-bold text-slate-500">Phone:</span>
                    <span className="font-bold text-slate-800">{currentUser?.phone || 'Not provided'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between">
                    <span className="font-bold text-slate-500">Role:</span>
                    <span className="font-bold uppercase text-slate-900">{currentUser?.role}</span>
                  </div>
                  {currentUser?.department && (
                    <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex justify-between text-indigo-900">
                      <span className="font-bold">Department:</span>
                      <span className="font-bold">{currentUser?.department}</span>
                    </div>
                  )}
                </div>
              </div>
            </ProtectedRoute>
          } />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard issues={issues} onUpdateIssue={handleUpdateIssue} />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard issues={issues} onUpdateIssue={handleUpdateIssue} />
              </Suspense>
            </ProtectedRoute>
          } />

          {/* Dedicated Individual Department Admin Dashboards */}
          <Route path="/admin/roads" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard issues={issues} onUpdateIssue={handleUpdateIssue} departmentProp="Roads & Highways Department" />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="/admin/sanitation" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard issues={issues} onUpdateIssue={handleUpdateIssue} departmentProp="Sanitation Department" />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="/admin/water" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard issues={issues} onUpdateIssue={handleUpdateIssue} departmentProp="Water Supply Department" />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="/admin/electricity" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard issues={issues} onUpdateIssue={handleUpdateIssue} departmentProp="Electricity Department" />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="/admin/drainage" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard issues={issues} onUpdateIssue={handleUpdateIssue} departmentProp="Drainage & Sewer Department" />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="/admin/health" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard issues={issues} onUpdateIssue={handleUpdateIssue} departmentProp="Public Health Department" />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="/admin/commissioner" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard issues={issues} onUpdateIssue={handleUpdateIssue} departmentProp="Municipal Commissioner" />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="/admin/issues" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<PageLoader />}>
                <AdminCenter issues={issues} onUpdateIssue={handleUpdateIssue} />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<PageLoader />}>
                <AdminDashboard issues={issues} onUpdateIssue={handleUpdateIssue} />
              </Suspense>
            </ProtectedRoute>
          } />

          {/* Central Master Data Warehouse & Intelligence Vault */}
          <Route path="/admin/data-vault" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<PageLoader />}>
                <MasterDataVault issues={issues} />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="/admin/data-center" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<PageLoader />}>
                <MasterDataVault issues={issues} />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="/admin/records-hub" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<PageLoader />}>
                <MasterDataVault issues={issues} />
              </Suspense>
            </ProtectedRoute>
          } />

          {/* Public Grievance Details & 2-Way Chat Route */}
          <Route path="/issue/:issueId" element={
            <IssueDetails issues={issues} currentUser={currentUser} onUpdateIssue={handleUpdateIssue} onUpvote={handleUpvote} />
          } />

          {/* Fallback Catch-all Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* ── Global Interactive Modals ── */}
      <ReportIssueModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onIssueCreated={handleIssueCreated}
        currentUser={currentUser}
      />

      <TrackTimelineModal
        issue={selectedIssue}
        onClose={() => setTrackingIssueId(null)}
      />

      <NotificationCenterModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkNotificationsRead}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
