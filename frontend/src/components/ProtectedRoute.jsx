import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = currentUser.role || 'citizen';
    const isAdminUser = ['admin', 'superadmin', 'officer'].includes(userRole);
    const isCitizenUser = userRole === 'citizen';

    const isAllowed = allowedRoles.some(role => {
      if (role === 'admin') return isAdminUser;
      if (role === 'citizen') return isCitizenUser;
      return userRole === role;
    });

    if (!isAllowed) {
      // Strict role redirection: Admins go to /admin/dashboard, Citizens go to /dashboard
      if (isAdminUser) {
        return <Navigate to="/admin/dashboard" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
