import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Bell,
  User,
  Brain,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Layers,
  Inbox,
  Search
} from 'lucide-react';
import LeafletMap from '../components/LeafletMap';

export default function CitizenDashboard({
  issues = [],
  notifications = [],
  onOpenReport,
  onUpvote
}) {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();

  // Defense-in-depth safety guard: Allow ONLY citizen to citizen dashboard
  useEffect(() => {
    if (currentUser && isAdmin) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [currentUser, isAdmin, navigate]);

  // Citizen's issues
  const myIssues = issues.filter(i => 
    (currentUser?.id && i.user_id === currentUser.id) || 
    (currentUser?.name && i.reporter_name === currentUser.name) ||
    (currentUser?.email && i.reporter_email === currentUser.email)
  );
  const totalMyCount = myIssues.length;
  const activeCount = myIssues.filter(i => !['Resolved', 'Rejected'].includes(i.status)).length;
  const resolvedCount = myIssues.filter(i => i.status === 'Resolved').length;
  const pendingCount = myIssues.filter(i => i.status === 'Submitted' || i.status === 'Under Review').length;

  return (
    <div className="citizen-dashboard-container max-w-[1200px] mx-auto space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-cyan-300 text-xs font-bold border border-white/10">
              <Sparkles className="w-3.5 h-3.5" /> CITIZEN PORTAL
            </span>
            <span className="text-xs text-indigo-200">Welcome, {currentUser?.name || 'Citizen'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white m-0">Citizen Grievance Redressal Dashboard</h1>
          <p className="text-xs sm:text-sm text-indigo-200 m-0">
            Track your registered complaints, monitor resolution timelines, and chat directly with municipal response teams.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary-gradient h-12 px-6 rounded-2xl text-xs font-bold shrink-0 shadow-lg shadow-indigo-950/40"
          onClick={onOpenReport}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report New Public Issue</span>
        </button>
      </div>

      {/* Overview Cards (4 Cards, Equal Height, 24px Gap) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Filed</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalMyCount}</div>
            <div className="text-[11px] text-slate-400 font-semibold mt-1">Filed by your account</div>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Active Action</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600">{activeCount}</div>
            <div className="text-[11px] text-amber-600 font-semibold mt-1">Field squad assigned</div>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Resolved</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">{resolvedCount}</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1">Successfully closed</div>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Under Triage</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{pendingCount}</div>
            <div className="text-[11px] text-slate-400 font-semibold mt-1">Pending verification</div>
          </div>
        </div>
      </div>

      {/* Main Grid: My Complaints (8 Cols) & Activity Feed (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 8 Cols: My Complaints List & GIS Map */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 m-0">My Registered Grievances ({myIssues.length})</h3>
                <p className="text-xs text-slate-500 m-0">Click any complaint to open full timeline and 2-way admin chat.</p>
              </div>

              <button
                type="button"
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => navigate('/my-complaints')}
              >
                View All &rarr;
              </button>
            </div>

            {myIssues.length > 0 ? (
              <div className="space-y-3">
                {myIssues.slice(0, 5).map(issue => (
                  <div
                    key={issue.issue_id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-300 transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                    onClick={() => navigate(`/issue/${issue.issue_id}`)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          issue.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                        }`}>
                          {issue.status}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-400">#{issue.issue_id}</span>
                        <span className="text-[11px] font-bold text-slate-500">{issue.category}</span>
                      </div>

                      <div className="font-bold text-xs sm:text-sm text-slate-900">{issue.title}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <span>{issue.location}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        className="btn-primary-gradient px-3 py-1.5 text-xs font-bold rounded-xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/issue/${issue.issue_id}#chat`);
                        }}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center space-y-2">
                <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="font-bold text-xs text-slate-700">You have not registered any complaints yet</div>
                <button
                  type="button"
                  className="btn-primary-gradient text-xs py-2 px-4 font-bold"
                  onClick={onOpenReport}
                >
                  File First Grievance
                </button>
              </div>
            )}
          </div>

          {/* Citizen Map View */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-extrabold text-base text-slate-900 m-0">My Complaint Locations & Ward Telemetry</h3>
            <LeafletMap issues={myIssues.length > 0 ? myIssues : issues} height="280px" />
          </div>
        </div>

        {/* Right 4 Cols: Quick Actions & Notifications Feed */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider m-0">Quick Actions</h3>

            <button
              type="button"
              className="btn-primary-gradient w-full h-11 justify-center text-xs font-bold rounded-xl"
              onClick={onOpenReport}
            >
              <PlusCircle className="w-4 h-4" />
              <span>File New Grievance</span>
            </button>

            <button
              type="button"
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              onClick={() => navigate('/track-complaint')}
            >
              <Search className="w-4 h-4 text-cyan-600" />
              <span>Track Complaint Progress</span>
            </button>

            <button
              type="button"
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              onClick={() => navigate('/my-complaints')}
            >
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>My Complaints Feed</span>
            </button>
          </div>

          {/* Live Notification Stream */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5 m-0">
                <Bell className="w-4 h-4 text-indigo-600" />
                <span>Recent Updates</span>
              </h3>
            </div>

            {notifications.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {notifications.slice(0, 5).map(n => (
                  <div
                    key={n.notification_id || n.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 text-xs cursor-pointer transition-all space-y-1"
                    onClick={() => n.issue_id && navigate(`/issue/${n.issue_id}`)}
                  >
                    <div className="font-semibold text-slate-800 leading-snug">{n.message}</div>
                    <div className="text-[10px] text-slate-400">{n.time_ago || 'recently'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                No new notifications
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
