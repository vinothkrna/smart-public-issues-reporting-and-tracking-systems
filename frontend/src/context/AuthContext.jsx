import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);
const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000';

async function safeAuthFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    let data;
    try {
      data = await res.json();
    } catch {
      data = { error: 'Invalid JSON response from server' };
    }
    return { res, data };
  } catch (err) {
    if (err.name === 'TypeError' && err.message?.includes('fetch')) {
      const netError = new Error('Cannot connect to CivicTrack server. Please make sure the backend server (app.py) is running.');
      netError.code = 'NETWORK_ERROR';
      throw netError;
    }
    throw err;
  }
}

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('civic_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('civic_token') || null;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync user and token state changes to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('civic_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('civic_user');
    }
  }, [currentUser]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('civic_token', token);
    } else {
      localStorage.removeItem('civic_token');
    }
  }, [token]);

  // Logout callback
  const logout = useCallback(() => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('civic_user');
    localStorage.removeItem('civic_token');
    localStorage.removeItem('remember_email');
    localStorage.removeItem('remember_role');
  }, []);

  // Periodic JWT expiration validation
  useEffect(() => {
    if (!token) return;

    const payload = parseJwt(token);
    if (!payload || !payload.exp) return;

    const isExpired = Date.now() >= payload.exp * 1000;
    if (isExpired) {
      logout();
      return;
    }

    const interval = setInterval(() => {
      if (Date.now() >= payload.exp * 1000) {
        logout();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [token, logout]);

  // Login: Citizen & Admin
  const login = async (email, password, department = '') => {
    setIsLoading(true);
    try {
      const body = { email: email.trim(), password };
      if (department) body.department = department.trim();

      const { res, data } = await safeAuthFetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const error = new Error(data.error || 'Sign in failed');
        error.code = data.code;
        error.data = data;
        throw error;
      }

      setCurrentUser(data.user);
      setToken(data.token);
      return data.user;
    } finally {
      setIsLoading(false);
    }
  };

  // Citizen & Department Admin Registration
  const register = async (name, email, phone, password, confirmPassword, role = 'citizen', department = '') => {
    setIsLoading(true);
    try {
      const { res, data } = await safeAuthFetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone ? phone.trim() : '',
          password,
          confirm_password: confirmPassword,
          role,
          department
        })
      });

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      return data;
    } finally {
      setIsLoading(false);
    }
  };

  // Verify Email OTP & Activate Account
  const verifyEmail = async (tokenVal, otp, emailVal = '') => {
    setIsLoading(true);
    try {
      const { res, data } = await safeAuthFetch(`${API_BASE}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenVal,
          otp: otp.trim(),
          email: emailVal ? emailVal.trim() : ''
        })
      });

      if (!res.ok) {
        throw new Error(data.error || 'Email verification failed');
      }

      if (data.token && data.user) {
        setCurrentUser(data.user);
        setToken(data.token);
      }

      return data;
    } finally {
      setIsLoading(false);
    }
  };

  // Resend Email Verification Code
  const resendVerification = async (emailVal, tokenVal = '') => {
    const { res, data } = await safeAuthFetch(`${API_BASE}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailVal ? emailVal.trim() : '',
        token: tokenVal
      })
    });

    if (!res.ok) {
      throw new Error(data.error || 'Failed to resend verification code');
    }
    return data;
  };

  // 3-Step Password Recovery
  const forgotPassword = async (emailVal) => {
    const { res, data } = await safeAuthFetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailVal.trim() })
    });
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send recovery OTP');
    }
    return data;
  };

  const verifyOTP = async (tokenVal, otpVal) => {
    const { res, data } = await safeAuthFetch(`${API_BASE}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenVal, otp: otpVal.trim() })
    });
    if (!res.ok) {
      throw new Error(data.error || 'OTP verification failed');
    }
    return data;
  };

  const resetPassword = async (tokenVal, newPassword) => {
    const { res, data } = await safeAuthFetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenVal, new_password: newPassword })
    });
    if (!res.ok) {
      throw new Error(data.error || 'Password reset failed');
    }
    return data;
  };

  // Auth helper properties
  const isCitizen = currentUser?.role === 'citizen';
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin' || currentUser?.role === 'officer';
  const isSuperAdmin = currentUser?.role === 'superadmin' || currentUser?.department === 'Super Admin' || currentUser?.department === 'Municipal Commissioner';
  const currentDepartment = currentUser?.department || null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        token,
        isLoading,
        isCitizen,
        isAdmin,
        isSuperAdmin,
        currentDepartment,
        login,
        register,
        verifyEmail,
        resendVerification,
        forgotPassword,
        verifyOTP,
        resetPassword,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
