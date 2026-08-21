import React, { useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Sparkles,
  LayoutDashboard,
  ShieldCheck,
  MapPin,
  Search,
  Bell,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  const user = location.state?.user || currentUser;
  const email = location.state?.email || user?.email || 'your registered email';

  useEffect(() => {
    // Launch celebratory confetti fireworks
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 }
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 }
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full p-8 text-center border border-slate-100 animate-fade-in">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black mx-auto mb-4 shadow-lg shadow-emerald-100">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black mb-2">
          <Sparkles className="w-3.5 h-3.5" /> ACCOUNT ACTIVATED & VERIFIED
        </div>

        <h2 className="text-2xl font-black text-slate-900 mb-2">
          Welcome to CivicTrack!
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
          Your citizen account for <strong>{email}</strong> has been successfully verified. You now have full access to report civic hazards, track resolutions, and engage with municipal officials.
        </p>

        {/* User Card */}
        {user && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left mb-6 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="font-bold text-slate-500">{user.role === 'admin' ? 'Officer Name:' : 'Citizen Name:'}</span>
              <span className="font-black text-slate-900">{user.name || 'User'}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="font-bold text-slate-500">Verified Email:</span>
              <span className="font-mono font-bold text-indigo-600">{user.email || email}</span>
            </div>
            {user.role === 'admin' && user.department && (
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="font-bold text-slate-500">Department:</span>
                <span className="font-bold text-cyan-700">{user.department}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-500">Account Status:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" /> {user.role === 'admin' ? 'ACTIVE DEPARTMENT ADMIN' : 'ACTIVE CITIZEN'}
              </span>
            </div>
          </div>
        )}

        {/* What's next grid */}
        <div className="grid grid-cols-3 gap-2 mb-6 text-left">
          <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
            <MapPin className="w-4 h-4 text-indigo-600 mb-1" />
            <div className="font-bold text-[11px] text-slate-800">{user?.role === 'admin' ? 'GIS Telemetry' : 'Pin Hazards'}</div>
            <div className="text-[10px] text-slate-500">{user?.role === 'admin' ? 'Live incident map' : 'Upload & AI detect'}</div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
            <Search className="w-4 h-4 text-indigo-600 mb-1" />
            <div className="font-bold text-[11px] text-slate-800">{user?.role === 'admin' ? 'Squad Dispatch' : 'Live Tracking'}</div>
            <div className="text-[10px] text-slate-500">{user?.role === 'admin' ? 'Assign & Resolve' : '5-stage milestone'}</div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
            <Bell className="w-4 h-4 text-indigo-600 mb-1" />
            <div className="font-bold text-[11px] text-slate-800">Instant Alerts</div>
            <div className="text-[10px] text-slate-500">{user?.role === 'admin' ? 'Critical incidents' : 'Live squad updates'}</div>
          </div>
        </div>

        {/* Navigation Action */}
        <div className="space-y-3">
          <button
            className="btn-primary-gradient w-full justify-center py-3.5 text-xs font-black shadow-xl cursor-pointer"
            onClick={() => navigate(user?.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true })}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{user?.role === 'admin' ? 'Go to Admin Command Center' : 'Go to Citizen Dashboard'}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <Link
            to="/login"
            className="inline-block text-xs font-bold text-slate-500 hover:text-indigo-600"
          >
            Sign In with Different Credentials &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
