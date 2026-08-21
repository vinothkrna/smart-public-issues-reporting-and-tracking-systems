import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield, Mail, Lock, LogIn, AlertCircle, UserCheck, Building2,
  Eye, EyeOff, ChevronDown, Sun, Moon, Sparkles, MapPin, BarChart3,
  Bell, Cpu, FileText, Search, Zap, Droplets, Trash2, Waves,
  HeartPulse, Landmark, ShieldCheck, Construction, ArrowRight
} from 'lucide-react';
import './LoginPage.css';

/* ── Department Data ─────────────────────────────────────────────────── */
const DEPARTMENTS = [
  {
    id: 'roads_highways',
    name: 'Roads & Highways Department',
    icon: Construction,
    description: 'Manage road maintenance, potholes, and transportation infrastructure complaints.',
    color: '#e67e22'
  },
  {
    id: 'sanitation',
    name: 'Sanitation Department',
    icon: Trash2,
    description: 'Oversee waste collection, garbage disposal, and public cleanliness operations.',
    color: '#27ae60'
  },
  {
    id: 'water_supply',
    name: 'Water Supply Department',
    icon: Droplets,
    description: 'Handle water distribution, pipeline maintenance, and supply quality issues.',
    color: '#3498db'
  },
  {
    id: 'drainage_sewer',
    name: 'Drainage & Sewer Department',
    icon: Waves,
    description: 'Manage stormwater drains, sewer lines, and flood prevention infrastructure.',
    color: '#8e44ad'
  },
  {
    id: 'electricity',
    name: 'Electricity Department',
    icon: Zap,
    description: 'Address streetlight failures, power outages, and electrical hazard complaints.',
    color: '#f39c12'
  },
  {
    id: 'public_health',
    name: 'Public Health Department',
    icon: HeartPulse,
    description: 'Monitor public health hazards, mosquito breeding, and sanitation-related health risks.',
    color: '#e74c3c'
  },
  {
    id: 'municipal_commissioner',
    name: 'Municipal Commissioner',
    icon: Landmark,
    description: 'Central monitoring and oversight of all municipal departments and escalated complaints.',
    color: '#2c3e50'
  },
  {
    id: 'super_admin',
    name: 'Super Admin',
    icon: ShieldCheck,
    description: 'Full system administration with access to all departments, users, and platform settings.',
    color: '#1a1a2e'
  },
];

/* ── Smart City SVG Illustration ─────────────────────────────────────── */
function SmartCityIllustration() {
  return (
    <svg viewBox="0 0 420 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Sky gradient */}
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,212,170,0.08)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        <linearGradient id="roadGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.03)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
        </linearGradient>
      </defs>
      <rect width="420" height="220" fill="url(#skyGrad)" rx="16" />

      {/* Ground / Road */}
      <rect x="0" y="170" width="420" height="50" fill="url(#roadGrad)" rx="0" />
      <line x1="20" y1="190" x2="400" y2="190" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="12 8" />

      {/* Buildings */}
      <g className="building">
        <rect x="30" y="80" width="40" height="90" rx="4" fill="rgba(14,165,233,0.15)" stroke="rgba(14,165,233,0.3)" strokeWidth="1" />
        <rect x="36" y="90" width="10" height="8" rx="1" fill="rgba(14,165,233,0.3)" />
        <rect x="52" y="90" width="10" height="8" rx="1" fill="rgba(14,165,233,0.3)" />
        <rect x="36" y="106" width="10" height="8" rx="1" fill="rgba(0,212,170,0.4)" />
        <rect x="52" y="106" width="10" height="8" rx="1" fill="rgba(14,165,233,0.3)" />
        <rect x="36" y="122" width="10" height="8" rx="1" fill="rgba(14,165,233,0.3)" />
        <rect x="52" y="122" width="10" height="8" rx="1" fill="rgba(0,212,170,0.4)" />
        <rect x="36" y="138" width="10" height="8" rx="1" fill="rgba(14,165,233,0.25)" />
        <rect x="52" y="138" width="10" height="8" rx="1" fill="rgba(14,165,233,0.25)" />
      </g>

      <g className="building">
        <rect x="85" y="50" width="50" height="120" rx="4" fill="rgba(0,212,170,0.12)" stroke="rgba(0,212,170,0.25)" strokeWidth="1" />
        <rect x="92" y="60" width="12" height="10" rx="1" fill="rgba(0,212,170,0.3)" />
        <rect x="112" y="60" width="12" height="10" rx="1" fill="rgba(0,212,170,0.3)" />
        <rect x="92" y="80" width="12" height="10" rx="1" fill="rgba(14,165,233,0.35)" />
        <rect x="112" y="80" width="12" height="10" rx="1" fill="rgba(0,212,170,0.3)" />
        <rect x="92" y="100" width="12" height="10" rx="1" fill="rgba(0,212,170,0.3)" />
        <rect x="112" y="100" width="12" height="10" rx="1" fill="rgba(14,165,233,0.35)" />
        <rect x="92" y="120" width="12" height="10" rx="1" fill="rgba(0,212,170,0.25)" />
        <rect x="112" y="120" width="12" height="10" rx="1" fill="rgba(0,212,170,0.25)" />
        <rect x="92" y="140" width="12" height="10" rx="1" fill="rgba(0,212,170,0.2)" />
        <rect x="112" y="140" width="12" height="10" rx="1" fill="rgba(0,212,170,0.2)" />
      </g>

      <g className="building">
        <rect x="150" y="100" width="35" height="70" rx="4" fill="rgba(240,180,41,0.1)" stroke="rgba(240,180,41,0.25)" strokeWidth="1" />
        <rect x="156" y="110" width="8" height="7" rx="1" fill="rgba(240,180,41,0.3)" />
        <rect x="170" y="110" width="8" height="7" rx="1" fill="rgba(240,180,41,0.3)" />
        <rect x="156" y="125" width="8" height="7" rx="1" fill="rgba(240,180,41,0.25)" />
        <rect x="170" y="125" width="8" height="7" rx="1" fill="rgba(240,180,41,0.25)" />
        <rect x="156" y="140" width="8" height="7" rx="1" fill="rgba(240,180,41,0.2)" />
        <rect x="170" y="140" width="8" height="7" rx="1" fill="rgba(240,180,41,0.2)" />
      </g>

      <g className="building">
        <rect x="200" y="65" width="55" height="105" rx="4" fill="rgba(14,165,233,0.12)" stroke="rgba(14,165,233,0.25)" strokeWidth="1" />
        <rect x="208" y="75" width="14" height="10" rx="1" fill="rgba(14,165,233,0.3)" />
        <rect x="230" y="75" width="14" height="10" rx="1" fill="rgba(0,212,170,0.35)" />
        <rect x="208" y="95" width="14" height="10" rx="1" fill="rgba(0,212,170,0.3)" />
        <rect x="230" y="95" width="14" height="10" rx="1" fill="rgba(14,165,233,0.3)" />
        <rect x="208" y="115" width="14" height="10" rx="1" fill="rgba(14,165,233,0.25)" />
        <rect x="230" y="115" width="14" height="10" rx="1" fill="rgba(0,212,170,0.3)" />
        <rect x="208" y="135" width="14" height="10" rx="1" fill="rgba(14,165,233,0.2)" />
        <rect x="230" y="135" width="14" height="10" rx="1" fill="rgba(14,165,233,0.2)" />
        {/* Antenna */}
        <line x1="227" y1="65" x2="227" y2="45" stroke="rgba(0,212,170,0.4)" strokeWidth="1.5" />
        <circle cx="227" cy="42" r="3" fill="rgba(0,212,170,0.6)" className="node" />
      </g>

      <g className="building">
        <rect x="270" y="110" width="42" height="60" rx="4" fill="rgba(0,212,170,0.1)" stroke="rgba(0,212,170,0.2)" strokeWidth="1" />
        <rect x="278" y="120" width="10" height="8" rx="1" fill="rgba(0,212,170,0.3)" />
        <rect x="294" y="120" width="10" height="8" rx="1" fill="rgba(0,212,170,0.3)" />
        <rect x="278" y="135" width="10" height="8" rx="1" fill="rgba(0,212,170,0.25)" />
        <rect x="294" y="135" width="10" height="8" rx="1" fill="rgba(0,212,170,0.25)" />
        <rect x="278" y="150" width="10" height="8" rx="1" fill="rgba(0,212,170,0.2)" />
        <rect x="294" y="150" width="10" height="8" rx="1" fill="rgba(0,212,170,0.2)" />
      </g>

      <g className="building">
        <rect x="330" y="85" width="45" height="85" rx="4" fill="rgba(14,165,233,0.1)" stroke="rgba(14,165,233,0.2)" strokeWidth="1" />
        <rect x="338" y="95" width="11" height="9" rx="1" fill="rgba(14,165,233,0.3)" />
        <rect x="356" y="95" width="11" height="9" rx="1" fill="rgba(14,165,233,0.3)" />
        <rect x="338" y="112" width="11" height="9" rx="1" fill="rgba(0,212,170,0.3)" />
        <rect x="356" y="112" width="11" height="9" rx="1" fill="rgba(14,165,233,0.25)" />
        <rect x="338" y="129" width="11" height="9" rx="1" fill="rgba(14,165,233,0.2)" />
        <rect x="356" y="129" width="11" height="9" rx="1" fill="rgba(0,212,170,0.25)" />
        <rect x="338" y="146" width="11" height="9" rx="1" fill="rgba(14,165,233,0.15)" />
        <rect x="356" y="146" width="11" height="9" rx="1" fill="rgba(14,165,233,0.15)" />
      </g>

      {/* Data connection lines */}
      <line x1="50" y1="78" x2="110" y2="48" className="data-line" stroke="rgba(0,212,170,0.2)" strokeWidth="1" />
      <line x1="135" y1="50" x2="200" y2="63" className="data-line" stroke="rgba(14,165,233,0.2)" strokeWidth="1" />
      <line x1="255" y1="65" x2="330" y2="83" className="data-line" stroke="rgba(0,212,170,0.15)" strokeWidth="1" />
      <line x1="185" y1="100" x2="270" y2="108" className="data-line" stroke="rgba(14,165,233,0.15)" strokeWidth="1" />

      {/* Network nodes */}
      <circle cx="50" cy="78" r="3" fill="rgba(0,212,170,0.7)" className="node" />
      <circle cx="135" cy="50" r="3" fill="rgba(14,165,233,0.7)" className="node" />
      <circle cx="290" cy="108" r="3" fill="rgba(0,212,170,0.6)" className="node" />
      <circle cx="352" cy="83" r="3" fill="rgba(14,165,233,0.6)" className="node" />

      {/* GIS map pin markers */}
      <g transform="translate(80, 155)">
        <circle cx="0" cy="0" r="6" fill="rgba(239,68,68,0.3)" className="node" />
        <circle cx="0" cy="0" r="2.5" fill="rgba(239,68,68,0.8)" />
      </g>
      <g transform="translate(230, 165)">
        <circle cx="0" cy="0" r="6" fill="rgba(0,212,170,0.3)" className="node" />
        <circle cx="0" cy="0" r="2.5" fill="rgba(0,212,170,0.8)" />
      </g>
      <g transform="translate(350, 160)">
        <circle cx="0" cy="0" r="6" fill="rgba(240,180,41,0.3)" className="node" />
        <circle cx="0" cy="0" r="2.5" fill="rgba(240,180,41,0.8)" />
      </g>

      {/* WiFi signals */}
      <g transform="translate(167, 92)" opacity="0.3">
        <path d="M-6 0 Q0 -8 6 0" fill="none" stroke="rgba(0,212,170,0.5)" strokeWidth="1" />
        <path d="M-10 3 Q0 -12 10 3" fill="none" stroke="rgba(0,212,170,0.35)" strokeWidth="1" />
      </g>
    </svg>
  );
}

/* ── Main Component ──────────────────────────────────────────────────── */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Form state
  const [role, setRole] = useState('citizen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('login_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false;
  });

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('login_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Clear errors on role change
  useEffect(() => {
    setError(null);
  }, [role]);

  const [roleMismatchData, setRoleMismatchData] = useState(null);
  const [pendingVerifData, setPendingVerifData] = useState(null);

  const selectedDept = DEPARTMENTS.find(d => d.name === department);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }
    if (role === 'admin' && !department) {
      setError('Please select your municipal department before signing in as Administrator.');
      return;
    }

    setError(null);
    setPendingVerifData(null);
    setRoleMismatchData(null);
    setIsSubmitting(true);

    try {
      const user = await login(
        email.trim(),
        password,
        role === 'admin' ? department : '',
        role
      );

      const isAdminUser = ['admin', 'superadmin', 'officer'].includes(user.role);
      const from = location.state?.from?.pathname;

      if (isAdminUser) {
        // Only allow redirection to admin routes
        if (from && from.startsWith('/admin')) {
          navigate(from, { replace: true });
        } else {
          navigate('/admin/dashboard', { replace: true });
        }
      } else {
        // Citizen user - ONLY allow citizen dashboard or citizen routes
        if (from && !from.startsWith('/admin') && from !== '/admin/dashboard') {
          navigate(from, { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (err) {
      if (err.code === 'PENDING_VERIFICATION' || err.data?.code === 'PENDING_VERIFICATION') {
        setPendingVerifData(err.data);
      }
      if (err.code === 'ROLE_MISMATCH_ADMIN' || err.data?.code === 'ROLE_MISMATCH_ADMIN') {
        setRoleMismatchData({ target_tab: 'admin', message: err.message });
      } else if (err.code === 'ROLE_MISMATCH_CITIZEN' || err.data?.code === 'ROLE_MISMATCH_CITIZEN') {
        setRoleMismatchData({ target_tab: 'citizen', message: err.message });
      }
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoUser = (demoType) => {
    setPendingVerifData(null);
    setError(null);

    if (demoType === 'super_admin') {
      setRole('admin');
      setDepartment('Super Admin');
      setEmail('admin@smartcity.gov');
      setPassword('admin123');
    } else if (demoType === 'roads') {
      setRole('admin');
      setDepartment('Roads & Highways Department');
      setEmail('roads.admin@smartcity.gov');
      setPassword('admin123');
    } else if (demoType === 'sanitation') {
      setRole('admin');
      setDepartment('Sanitation Department');
      setEmail('sanitation.admin@smartcity.gov');
      setPassword('admin123');
    } else if (demoType === 'water') {
      setRole('admin');
      setDepartment('Water Supply Department');
      setEmail('water.admin@smartcity.gov');
      setPassword('admin123');
    } else {
      setRole('citizen');
      setDepartment('');
      setEmail('vinoth@gmail.com');
      setPassword('123456');
    }
  };

  const citizenFeatures = [
    { icon: FileText, label: 'Report Issues' },
    { icon: Search, label: 'Track Complaints' },
    { icon: Bell, label: 'Notifications' },
    { icon: Cpu, label: 'AI Insights' },
  ];

  const adminFeatures = [
    { icon: Building2, label: 'Dept. Complaints' },
    { icon: Bell, label: 'Real-Time Alerts' },
    { icon: Cpu, label: 'AI Priority' },
    { icon: BarChart3, label: 'Analytics' },
  ];

  const currentFeatures = role === 'admin' ? adminFeatures : citizenFeatures;

  return (
    <div className="login-page">
      {/* ── Left Panel: Branding & Illustration ── */}
      <div className="login-left-panel">
        <div className="login-grid-overlay" />

        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-icon">
            <Shield />
          </div>
          <div className="login-brand-text">
            <div className="login-brand-name">
              Civic<span>Track</span>
            </div>
            <div className="login-brand-badge">
              <Sparkles style={{ width: 10, height: 10 }} />
              AI-Powered Governance
            </div>
          </div>
        </div>

        {/* Hero */}
        <h1 className="login-hero-title">
          Smart Public Issue<br />
          Reporting & Tracking
        </h1>
        <p className="login-hero-subtitle">
          Empowering citizens to report, track, and resolve public issues
          through AI-powered governance and real-time GIS monitoring.
        </p>

        {/* Smart City Illustration */}
        <div className="login-illustration">
          <SmartCityIllustration />
        </div>

        {/* Feature Highlights */}
        <div className="login-features">
          {currentFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <div key={feat.label} className="login-feature-item">
                <div className="login-feature-icon">
                  <Icon />
                </div>
                <div className="login-feature-text">
                  <strong>{feat.label}</strong>
                  <span>{role === 'admin' ? 'Admin Access' : 'Citizen Access'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right Panel: Login Form ── */}
      <div className="login-right-panel">
        {/* Theme Toggle */}
        <button
          className="login-theme-toggle"
          onClick={() => setDarkMode(!darkMode)}
          aria-label="Toggle dark mode"
          type="button"
        >
          {darkMode ? <Sun style={{ width: 18, height: 18 }} /> : <Moon style={{ width: 18, height: 18 }} />}
        </button>

        <div className="login-form-wrapper">
          {/* Role Toggle */}
          <div className="login-role-toggle">
            <button
              type="button"
              className={`login-role-btn ${role === 'citizen' ? 'active' : ''}`}
              onClick={() => setRole('citizen')}
              aria-pressed={role === 'citizen'}
            >
              <UserCheck /> Citizen Login
            </button>
            <button
              type="button"
              className={`login-role-btn ${role === 'admin' ? 'active' : ''}`}
              onClick={() => setRole('admin')}
              aria-pressed={role === 'admin'}
            >
              <Building2 /> Admin Login
            </button>
          </div>

          {/* Form Header */}
          <div className="login-form-header">
            <h2 className="login-form-title">
              {role === 'admin' ? 'Department Admin Sign In' : 'Welcome Back, Citizen'}
            </h2>
            <p className="login-form-desc">
              {role === 'admin'
                ? 'Authenticate with your official department credentials to access the admin dashboard.'
                : 'Sign in to report issues, track complaints, and receive real-time updates on your community.'
              }
            </p>
          </div>

          {/* Citizen Welcome Banner */}
          {role === 'citizen' && (
            <div className="login-citizen-welcome">
              <h4>Quick Access Features</h4>
              <p>Report issues faster and track complaints easily with your citizen portal.</p>
              <div className="login-citizen-features">
                <span className="login-citizen-feature-tag"><MapPin /> Report Issues</span>
                <span className="login-citizen-feature-tag"><Search /> Track Status</span>
                <span className="login-citizen-feature-tag"><Bell /> Get Alerts</span>
                <span className="login-citizen-feature-tag"><Cpu /> AI Insights</span>
              </div>
            </div>
          )}

          {/* Department Info Card (Admin) */}
          {role === 'admin' && selectedDept && (
            <div className="login-dept-info" key={selectedDept.id}>
              <div className="login-dept-icon" style={{ background: selectedDept.color }}>
                <selectedDept.icon />
              </div>
              <div className="login-dept-details">
                <h4>{selectedDept.name}</h4>
                <p>{selectedDept.description}</p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="login-alert error" role="alert">
              <AlertCircle />
              <div style={{ flex: 1 }}>
                <span className="font-semibold">{error}</span>
                {roleMismatchData && (
                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn-primary-gradient text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold cursor-pointer"
                      onClick={() => {
                        const target = roleMismatchData.target_tab || (role === 'admin' ? 'citizen' : 'admin');
                        setRole(target);
                        setError(null);
                        setRoleMismatchData(null);
                      }}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>
                        Switch to {roleMismatchData.target_tab === 'admin' ? 'Admin Login' : 'Citizen Login'} &rarr;
                      </span>
                    </button>
                  </div>
                )}
                {pendingVerifData && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="btn-primary-gradient text-xs py-1.5 px-3"
                      onClick={() => navigate('/verify-email', {
                        state: {
                          email: pendingVerifData.email || email,
                          token: pendingVerifData.token,
                          demo_otp: pendingVerifData.demo_otp
                        }
                      })}
                    >
                      Verify Email with OTP &rarr;
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Department Dropdown (Admin only) */}
            {role === 'admin' && (
              <div className="login-form-group">
                <label htmlFor="login-department">Department *</label>
                <div className="login-input-wrapper">
                  <select
                    id="login-department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required
                    aria-label="Select department"
                  >
                    <option value="">Select your department</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                  <Building2 className="login-input-icon" />
                  <ChevronDown className="login-select-arrow" />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="login-form-group">
              <label htmlFor="login-email">
                {role === 'admin' ? 'Official Email *' : 'Email Address *'}
              </label>
              <div className="login-input-wrapper">
                <input
                  id="login-email"
                  type="email"
                  placeholder={role === 'admin' ? 'e.g. roads.admin@smartcity.gov' : 'e.g. vinoth@gmail.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  aria-label="Email address"
                />
                <Mail className="login-input-icon" />
              </div>
            </div>

            {/* Password */}
            <div className="login-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label htmlFor="login-password" style={{ margin: 0 }}>Password *</label>
                <Link to="/forgot-password" className="login-forgot-link">
                  Forgot Password?
                </Link>
              </div>
              <div className="login-input-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  aria-label="Password"
                />
                <Lock className="login-input-icon" />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="login-options-row">
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me on this browser</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="login-submit-btn"
              disabled={isSubmitting}
              aria-label="Sign in"
            >
              {isSubmitting ? (
                <>
                  <div className="login-spinner" />
                  <span>Signing In…</span>
                </>
              ) : (
                <>
                  <LogIn />
                  <span>Secure Sign In</span>
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="login-divider">
            <div className="login-divider-line" />
            <span className="login-divider-text">Quick Demo Accounts</span>
            <div className="login-divider-line" />
          </div>

          {/* Demo Accounts */}
          <div className="login-demo-section">
            <div className="login-demo-grid">
              <button
                type="button"
                className="login-demo-btn"
                onClick={() => fillDemoUser('citizen')}
              >
                <div className="login-demo-btn-label citizen">
                  <UserCheck /> Citizen User
                </div>
                <div className="login-demo-btn-email">vinoth@gmail.com</div>
              </button>
              <button
                type="button"
                className="login-demo-btn"
                onClick={() => fillDemoUser('super_admin')}
              >
                <div className="login-demo-btn-label admin">
                  <ShieldCheck /> Super Admin
                </div>
                <div className="login-demo-btn-email">admin@smartcity.gov</div>
              </button>
              <button
                type="button"
                className="login-demo-btn"
                onClick={() => fillDemoUser('roads')}
              >
                <div className="login-demo-btn-label admin" style={{ color: '#e67e22' }}>
                  <Construction /> Roads Admin
                </div>
                <div className="login-demo-btn-email">roads.admin@smartcity.gov</div>
              </button>
              <button
                type="button"
                className="login-demo-btn"
                onClick={() => fillDemoUser('sanitation')}
              >
                <div className="login-demo-btn-label admin" style={{ color: '#27ae60' }}>
                  <Trash2 /> Sanitation Admin
                </div>
                <div className="login-demo-btn-email">sanitation.admin@smartcity.gov</div>
              </button>
            </div>
          </div>

          {/* Register CTA */}
          <div className="login-register-cta">
            {role === 'admin' ? (
              <p>
                New officer or department staff?{' '}
                <Link to="/register?role=admin" className="font-bold text-cyan-400 hover:underline">
                  Register Admin Account &rarr;
                </Link>
              </p>
            ) : (
              <p>
                New user? Create a citizen account.{' '}
                <Link to="/register?role=citizen" className="font-bold text-cyan-400 hover:underline">
                  Register Now &rarr;
                </Link>
              </p>
            )}
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-center gap-2">
              {role === 'admin' ? (
                <span>Need a citizen account? <Link to="/register?role=citizen" className="text-slate-300 hover:text-white underline">Register as Citizen</Link></span>
              ) : (
                <span>Municipal officer? <Link to="/register?role=admin" className="text-slate-300 hover:text-white underline">Register as Department Admin</Link></span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="login-loading-overlay" aria-live="polite">
          <div className="login-loading-spinner" />
          <div className="login-loading-text">
            Authenticating with {role === 'admin' ? 'department portal' : 'citizen portal'}…
          </div>
        </div>
      )}
    </div>
  );
}
