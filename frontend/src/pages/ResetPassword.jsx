import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword } = useAuth();

  const stateData = location.state || {};
  const token = stateData.token;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify your confirmation password.');
      return;
    }
    if (!token) {
      setError('Session expired. Please restart the password reset process.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await resetPassword(token, newPassword);
      setSuccessMsg(res.message || 'Password reset successfully!');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err) {
      setError(err.message || 'Password reset failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md w-full p-8">
        <div className="mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Create New Password</h2>
          <p className="text-xs text-slate-500 mt-1">
            Step 3 of 3: Enter your new password to secure your account.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <div className="font-bold text-sm text-emerald-900">{successMsg}</div>
            <p className="text-emerald-700">Redirecting to login portal…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">New Password *</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none z-10" />
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="input-text w-full text-xs"
                  style={{ paddingLeft: '2.65rem' }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Confirm New Password *</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none z-10" />
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="input-text w-full text-xs"
                  style={{ paddingLeft: '2.65rem' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary-gradient w-full justify-center py-3 text-xs font-bold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span>Updating Password…</span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update Password & Login</span>
                </div>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
