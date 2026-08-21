import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Mail,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export default function EmailVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail, resendVerification } = useAuth();

  const stateData = location.state || {};
  const [email, setEmail] = useState(stateData.email || '');
  const [token, setToken] = useState(stateData.token || '');
  const [otp, setOtp] = useState(stateData.demo_otp || '');
  const [error, setError] = useState(null);
  const [resendStatus, setResendStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(45);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const data = await verifyEmail(token, otp.trim(), email);
      // Navigate to Step 3: Registration Success Celebration Page
      navigate('/register-success', {
        state: {
          user: data.user,
          email: email
        },
        replace: true
      });
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    try {
      const res = await resendVerification(email, token);
      if (res.token) setToken(res.token);
      if (res.demo_otp) setOtp(res.demo_otp);
      setResendStatus('New 6-digit verification code has been sent!');
      setResendCountdown(60);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md w-full p-8 border border-slate-100">
        <div className="mb-6">
          <Link to="/register" className="text-xs font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1 mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Registration
          </Link>

          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 text-[11px] font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> STEP 2: EMAIL VERIFICATION
          </div>
          <h2 className="text-2xl font-black text-slate-900">Verify Your Email</h2>
          <p className="text-xs text-slate-500 mt-1">
            We have sent a 6-digit verification code to <strong>{email || 'your registered email'}</strong>. Enter the code below to activate your account.
          </p>

          {stateData.demo_otp && (
            <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-800 flex items-center gap-2 font-mono">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Demo OTP Code: <strong>{stateData.demo_otp}</strong></span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2" role="alert">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resendStatus && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{resendStatus}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">6-Digit Verification Code *</label>
            <input
              type="text"
              maxLength="6"
              placeholder="e.g. 849201"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
              className="input-text w-full text-center tracking-[0.5em] text-xl font-mono font-black py-3 border-2 focus:border-indigo-600 rounded-2xl"
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn-primary-gradient w-full justify-center py-3 text-xs font-bold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="login-spinner" style={{ width: 14, height: 14 }} />
                <span>Activating Account…</span>
              </span>
            ) : (
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Verify & Activate Account</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Didn't receive the code?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCountdown > 0}
            className={`font-bold flex items-center gap-1 ${
              resendCountdown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-indigo-600 hover:underline cursor-pointer'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Code'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
