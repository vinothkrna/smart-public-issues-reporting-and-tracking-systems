import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, ShieldCheck, ArrowRight, AlertCircle, ArrowLeft, Sparkles } from 'lucide-react';

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOTP } = useAuth();

  const stateData = location.state || {};
  const [otp, setOtp] = useState(stateData.demo_otp || '');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = stateData.token;
  const email = stateData.email || 'your registered email';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit OTP code sent to your email.');
      return;
    }
    if (!token) {
      setError('Session expired. Please restart the password reset process.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await verifyOTP(token, otp.trim());
      navigate('/reset-password', {
        state: {
          token,
          email
        }
      });
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md w-full p-8">
        <div className="mb-6">
          <Link to="/forgot-password" className="text-xs font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1 mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Email
          </Link>

          <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-black mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Verify OTP Code</h2>
          <p className="text-xs text-slate-500 mt-1">
            Step 2 of 3: Enter the 6-digit verification code sent to <strong>{email}</strong>.
          </p>

          {stateData.demo_otp && (
            <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-800 flex items-center gap-1.5 font-mono">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Dev Demo OTP Code: <strong>{stateData.demo_otp}</strong></span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">6-Digit Verification OTP *</label>
            <input
              type="text"
              maxLength="6"
              placeholder="e.g. 849201"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
              className="input-text w-full text-center tracking-[0.5em] text-lg font-mono font-bold py-2.5"
            />
          </div>

          <button
            type="submit"
            className="btn-primary-gradient w-full justify-center py-3 text-xs font-bold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span>Verifying Code…</span>
            ) : (
              <div className="flex items-center gap-1.5">
                <span>Verify OTP & Continue</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
