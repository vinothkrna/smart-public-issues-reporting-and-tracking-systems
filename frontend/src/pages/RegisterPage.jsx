import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  User,
  Mail,
  Phone,
  Lock,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  ArrowRight,
  Building2,
  BadgeCheck,
  ChevronDown
} from 'lucide-react';

const DEPARTMENTS = [
  'Roads & Highways Department',
  'Sanitation Department',
  'Water Supply Department',
  'Drainage & Sewer Department',
  'Electricity Department',
  'Public Health Department',
  'Municipal Commissioner'
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();

  const [role, setRole] = useState(searchParams.get('role') === 'admin' ? 'admin' : 'citizen');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [employeeId, setEmployeeId] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'admin' || roleParam === 'citizen') {
      setRole(roleParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid official/personal email address.');
      return;
    }
    if (phone && !/^\+?[0-9\s-]{7,15}$/.test(phone.trim())) {
      setError('Please enter a valid phone number.');
      return;
    }
    if (role === 'admin' && !department) {
      setError('Please select your municipal department.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your confirmation password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await register(
        name.trim(),
        email.trim(),
        phone.trim(),
        password,
        confirmPassword,
        role,
        role === 'admin' ? department : ''
      );

      // Navigate to Step 2: Email Verification Page
      navigate('/verify-email', {
        state: {
          email: email.trim(),
          token: res.token,
          demo_otp: res.demo_otp,
          name: name.trim(),
          role: role,
          department: role === 'admin' ? department : ''
        }
      });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try a different email address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-xl w-full p-8 border border-slate-100">
        <div className="text-center mb-6">
          <div className={`w-12 h-12 rounded-2xl ${role === 'admin' ? 'bg-cyan-600' : 'bg-indigo-600'} flex items-center justify-center text-white font-black mx-auto mb-3 shadow-lg transition-colors`}>
            {role === 'admin' ? <Building2 className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            {role === 'admin' ? 'MUNICIPAL OFFICER ONBOARDING PORTAL' : 'CITIZEN REGISTRATION PORTAL'}
          </div>

          <h2 className="text-2xl font-black text-slate-900">
            {role === 'admin' ? 'Register Department Admin Account' : 'Create Citizen Account'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {role === 'admin'
              ? 'Onboard as a municipal administrator to triage grievances, dispatch squads, and track resolutions.'
              : 'Join the smart civic governance network to report public issues, track municipal actions, and receive real-time updates.'}
          </p>

          {/* Role Selection Pill Tabs */}
          <div className="flex items-center justify-center gap-2 mt-4 p-1 bg-slate-100 rounded-2xl max-w-xs mx-auto">
            <button
              type="button"
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                role === 'citizen'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              onClick={() => { setRole('citizen'); setError(null); }}
            >
              <User className="w-3.5 h-3.5" />
              <span>Citizen</span>
            </button>

            <button
              type="button"
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                role === 'admin'
                  ? 'bg-white text-cyan-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              onClick={() => { setRole('admin'); setError(null); }}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Admin / Officer</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2" role="alert">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Department Selection & Officer Badge ID for Admin */}
          {role === 'admin' && (
            <div className="p-4 bg-cyan-50/70 border border-cyan-100 rounded-2xl space-y-3 animate-in fade-in duration-200">
              <div>
                <label className="text-xs font-bold text-cyan-900 block mb-1">
                  Assigned Municipal Department *
                </label>
                <div className="relative">
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="input-select w-full text-xs font-bold text-slate-800"
                    required
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-cyan-900 block mb-1">
                  Official Officer / Staff Badge ID (Optional)
                </label>
                <div className="relative flex items-center">
                  <BadgeCheck className="w-4 h-4 text-cyan-600 absolute left-3.5 pointer-events-none z-10" />
                  <input
                    type="text"
                    placeholder="e.g. ROADS-OFFICER-01 or EMP-8492"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="input-text w-full text-xs"
                    style={{ paddingLeft: '2.65rem' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              {role === 'admin' ? 'Officer Full Name *' : 'Full Name *'}
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none z-10" />
              <input
                type="text"
                placeholder={role === 'admin' ? 'e.g. Officer Vinoth Krishna' : 'e.g. Vinoth Krishna'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input-text w-full text-xs"
                style={{ paddingLeft: '2.65rem' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {role === 'admin' ? 'Official Government Email *' : 'Email Address *'}
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none z-10" />
                <input
                  type="email"
                  placeholder={role === 'admin' ? 'officer.name@smartcity.gov' : 'name@example.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-text w-full text-xs"
                  style={{ paddingLeft: '2.65rem' }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Official Mobile / Contact</label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none z-10" />
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-text w-full text-xs"
                  style={{ paddingLeft: '2.65rem' }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Password *</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none z-10" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-text w-full text-xs"
                  style={{ paddingLeft: '2.65rem', paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer z-10"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Confirm Password *</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none z-10" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="input-text w-full text-xs"
                  style={{ paddingLeft: '2.65rem', paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer z-10"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary-gradient w-full justify-center py-3 text-xs font-bold mt-2 cursor-pointer"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="login-spinner" style={{ width: 14, height: 14 }} />
                <span>Creating {role === 'admin' ? 'Admin' : 'Citizen'} Account…</span>
              </span>
            ) : (
              <div className="flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" />
                <span>Continue to Email Verification</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 m-0">
            Already registered?{' '}
            <Link to={role === 'admin' ? '/login?role=admin' : '/login'} className="font-bold text-indigo-600 hover:underline">
              Sign In to {role === 'admin' ? 'Department Portal' : 'Citizen Portal'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
