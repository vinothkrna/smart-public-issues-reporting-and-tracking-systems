import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Building2,
  Clock,
  ShieldCheck,
  X,
  Filter,
  CheckCheck,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function NotificationCenterModal({
  isOpen,
  onClose,
  notifications = [],
  onMarkAllRead
}) {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread' | 'critical'

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'unread') return !n.is_read;
    if (activeFilter === 'critical') {
      return n.type === 'critical_alert' || (n.message && n.message.includes('CRITICAL'));
    }
    return true;
  });

  const getNotifIcon = (type, message = '') => {
    if (type === 'critical_alert' || message.includes('CRITICAL')) {
      return <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">🚨</div>;
    }
    if (type === 'admin_reply' || type === 'citizen_reply') {
      return <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><MessageSquare className="w-4 h-4" /></div>;
    }
    if (type === 'resolution' || message.includes('RESOLVED')) {
      return <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-4 h-4" /></div>;
    }
    if (type === 'admin_alert' || type === 'assignment') {
      return <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Building2 className="w-4 h-4" /></div>;
    }
    return <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center"><Clock className="w-4 h-4" /></div>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 m-0">Notification Center</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 m-0">Live status broadcasts and municipal updates</p>
            </div>
          </div>

          <button
            className="text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center"
            onClick={onClose}
            aria-label="Close notifications"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills & Actions Bar */}
        <div className="p-3 border-b border-slate-100 bg-white flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                activeFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setActiveFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                activeFilter === 'unread' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setActiveFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
            <button
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                activeFilter === 'critical' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
              onClick={() => setActiveFilter('critical')}
            >
              🚨 Critical
            </button>
          </div>

          {unreadCount > 0 && onMarkAllRead && (
            <button
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0"
              onClick={onMarkAllRead}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Notification Stream List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notif) => (
              <div
                key={notif.notification_id || notif.id}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  notif.is_read
                    ? 'bg-slate-50/70 border-slate-100 hover:border-slate-300'
                    : 'bg-indigo-50/40 border-indigo-200 hover:border-indigo-400 shadow-sm'
                }`}
                onClick={() => {
                  onClose();
                  if (notif.issue_id) {
                    navigate(`/issue/${notif.issue_id}`);
                  }
                }}
              >
                {getNotifIcon(notif.type, notif.message)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {notif.type?.replace('_', ' ') || 'CIVIC UPDATE'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {notif.time_ago || 'just now'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-900 m-0 leading-snug">
                    {notif.message}
                  </p>

                  {notif.issue_id && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline">
                      <span>Open Complaint #{notif.issue_id}</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {!notif.is_read && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Bell className="w-10 h-10 mx-auto text-slate-200 mb-2" />
              <div className="font-bold text-xs text-slate-600">No notifications found</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {activeFilter === 'unread' ? 'You are all caught up!' : 'New grievance updates will appear here.'}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
          <span className="text-[11px] text-slate-400">
            Real-time notifications powered by CivicTrack Push Telemetry
          </span>
        </div>
      </div>
    </div>
  );
}
