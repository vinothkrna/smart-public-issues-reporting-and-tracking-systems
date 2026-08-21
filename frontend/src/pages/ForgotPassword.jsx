import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, KeyRound, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await forgotPassword(email.trim());
      // Navigate to Step 2: Verify OTP
      navigate('/verify-otp', {
        state: {
          email: email.trim(),
          token: res.token,
          demo_otp: res.demo_otp
        }
      });
    } catch (err) {
      setError(err.message || 'No account found with this email address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md w-full p-8">
        <div className="mb-6">
          <Link to="/login" className="text-xs font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1 mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>

          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Reset Your Password</h2>
          <p className="text-xs text-slate-500 mt-1">
            Step 1 of 3: Enter your registered account email. We will send a 6-digit OTP code.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Registered Email Address *</label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none z-10" />
              <input
                type="email"
                placeholder="e.g. vinoth@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              <span>Sending OTP Code…</span>
            ) : (
              <div className="flex items-center gap-1.5">
                <span>Send Verification OTP</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
