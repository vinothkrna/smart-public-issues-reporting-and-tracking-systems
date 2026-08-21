import React, { useState } from 'react';
import { X, ShieldCheck, User, Mail, Lock, Phone, Sparkles, ArrowRight } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  if (!isOpen) return null;

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('citizen');

  const fillDemo = (demoEmail, demoPass, demoRole, demoName) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setName(demoName);
    setRole(demoRole);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Please fill email and password');
      return;
    }

    const userData = {
      id: role === 'admin' ? 1 : 2,
      name: name || (email.includes('admin') ? 'City Admin Officer' : 'Vinoth Krishna'),
      email: email.toLowerCase(),
      phone: phone || '+91 9876543210',
      role: email.toLowerCase().includes('admin') ? 'admin' : role
    };

    onLoginSuccess(userData);
    onClose();
  };

  return (
    <div className="modal-backdrop-blur">
      <div className="modal-card auth-modal max-w-[420px]">
        {/* Header */}
        <div className="modal-header-row border-b pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="brand-icon small">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <h3 className="modal-title text-lg font-bold">
              {isRegister ? 'Citizen Registration' : 'Account Sign In'}
            </h3>
          </div>
          <button className="close-btn" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        {/* 1-Click Fast Demo Buttons */}
        <div className="demo-credentials-box mb-4">
          <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>1-Click Quick Demo Login:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button 
              type="button" 
              className="btn-demo-quick citizen"
              onClick={() => fillDemo('vinoth@gmail.com', '123456', 'citizen', 'Vinoth Krishna')}
            >
              <div className="font-bold text-xs">👤 Citizen</div>
              <div className="text-[10px] text-slate-500">Vinoth Krishna</div>
            </button>
            <button 
              type="button" 
              className="btn-demo-quick admin"
              onClick={() => fillDemo('admin@smartcity.gov', 'admin123', 'admin', 'City Admin')}
            >
              <div className="font-bold text-xs text-rose-600">🛡️ Admin</div>
              <div className="text-[10px] text-slate-500">City Officer</div>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <div>
              <label className="form-label-bold">Full Name *</label>
              <div className="input-icon-wrapper">
                <User className="w-4 h-4 input-icon" />
                <input 
                  type="text" 
                  placeholder="e.g. Vinoth Krishna" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required={isRegister}
                  className="input-text with-icon"
                />
              </div>
            </div>
          )}

          <div>
            <label className="form-label-bold">Email Address *</label>
            <div className="input-icon-wrapper">
              <Mail className="w-4 h-4 input-icon" />
              <input 
                type="email" 
                placeholder="name@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required
                className="input-text with-icon"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="form-label-bold">Mobile Phone</label>
              <div className="input-icon-wrapper">
                <Phone className="w-4 h-4 input-icon" />
                <input 
                  type="tel" 
                  placeholder="+91 9876543210" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  className="input-text with-icon"
                />
              </div>
            </div>
          )}

          <div>
            <label className="form-label-bold">Password *</label>
            <div className="input-icon-wrapper">
              <Lock className="w-4 h-4 input-icon" />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required
                className="input-text with-icon"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary-gradient w-full py-2.5 mt-2">
            <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="text-center pt-2">
            <button 
              type="button" 
              className="text-xs text-primary font-semibold hover:underline"
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up Free"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
