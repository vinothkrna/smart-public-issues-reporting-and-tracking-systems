import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Shield,
  MapPin,
  BarChart3,
  PlusCircle,
  Bell,
  User as UserIcon,
  LogOut,
  Clock,
  LayoutDashboard,
  Building2,
  Brain,
  Search,
  Users,
  Menu,
  X,
  ChevronDown,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({
  currentUser,
  onLogout,
  onOpenAuth,
  onOpenReport,
  onOpenNotifications,
  notifications = [],
  onMarkNotificationsRead
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isCitizen, isAdmin, isSuperAdmin, currentDepartment } = useAuth();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const currentPath = location.pathname;

  const handleNav = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
    setShowUserMenu(false);
  };

  return (
    <nav className="navbar-glass sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* ── Left Zone: Brand Logo ── */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none shrink-0"
          onClick={() => handleNav('/')}
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight leading-tight">
              Civic<span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">Track</span>
            </div>
            <div className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
              {isAdmin ? (currentDepartment || 'Municipal Admin') : 'Smart Civic Redressal'}
            </div>
          </div>
        </div>

        {/* ── Center Zone: Navigation Links ── */}
        <div className="hidden lg:flex items-center gap-1.5 justify-center flex-1">
          <button
            type="button"
            className={`nav-link-btn px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentPath === '/' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            onClick={() => handleNav('/')}
          >
            <MapPin className="w-4 h-4 text-indigo-600" />
            <span>Home & GIS Map</span>
          </button>

          <button
            type="button"
            className={`nav-link-btn px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentPath === '/track-complaint' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            onClick={() => handleNav('/track-complaint')}
          >
            <Search className="w-4 h-4 text-cyan-600" />
            <span>Track Complaint</span>
          </button>

          {currentUser && isCitizen && (
            <>
              <button
                type="button"
                className={`nav-link-btn px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  currentPath === '/dashboard' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                onClick={() => handleNav('/dashboard')}
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                className={`nav-link-btn px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  currentPath === '/my-complaints' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                onClick={() => handleNav('/my-complaints')}
              >
                <Clock className="w-4 h-4 text-amber-500" />
                <span>My Complaints</span>
              </button>
            </>
          )}

          {isAdmin && (
            <>
              <button
                type="button"
                className={`nav-link-btn px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  currentPath === '/admin/dashboard' || currentPath === '/admin' ? 'bg-rose-50 text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                onClick={() => handleNav('/admin/dashboard')}
              >
                <Building2 className="w-4 h-4 text-rose-600" />
                <span>Admin Command</span>
              </button>

              <button
                type="button"
                className={`nav-link-btn px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  currentPath.startsWith('/admin/data-vault') || currentPath.startsWith('/admin/data-center') ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                onClick={() => handleNav('/admin/data-vault')}
              >
                <Database className="w-4 h-4 text-indigo-600" />
                <span>Data Vault</span>
              </button>
            </>
          )}

          <button
            type="button"
            className={`nav-link-btn px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentPath === '/analytics' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            onClick={() => handleNav('/analytics')}
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Analytics</span>
          </button>

          <button
            type="button"
            className={`nav-link-btn px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentPath === '/ai-priority' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            onClick={() => handleNav('/ai-priority')}
          >
            <Brain className="w-4 h-4 text-indigo-600" />
            <span>AI Telemetry</span>
          </button>
        </div>

        {/* ── Right Zone: Actions (Notifications, Sign In / Profile, Report Issue) ── */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Notifications Icon Button */}
          <button
            type="button"
            className="w-10 h-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center relative text-slate-700 transition-colors shadow-sm cursor-pointer"
            onClick={onOpenNotifications}
            title="Notification Center & Live Bulletins"
            id="nav-notifications-btn"
          >
            <Bell className="w-4 h-4 text-indigo-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          {/* User Profile or Sign In */}
          {currentUser ? (
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-2 p-1.5 pr-3 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-slate-900 leading-none">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{currentUser.role}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
              </button>

              {showUserMenu && (
                <div className="dropdown-panel user-menu-panel animate-scale-up absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50">
                  <div className="p-3 border-b border-slate-100">
                    <div className="font-bold text-xs text-slate-900">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">{currentUser.email}</div>
                  </div>

                  <div className="py-1">
                    {isAdmin ? (
                      <>
                        <button
                          type="button"
                          className="menu-item w-full text-left p-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          onClick={() => handleNav('/admin/dashboard')}
                        >
                          <Building2 className="w-4 h-4 text-rose-500" />
                          <span>Command Center</span>
                        </button>

                        <button
                          type="button"
                          className="menu-item w-full text-left p-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          onClick={() => handleNav('/admin/data-vault')}
                        >
                          <Database className="w-4 h-4 text-indigo-600" />
                          <span>Master Data Vault</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="menu-item w-full text-left p-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          onClick={() => handleNav('/dashboard')}
                        >
                          <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                          <span>Citizen Dashboard</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      className="menu-item w-full text-left p-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      onClick={() => handleNav('/profile')}
                    >
                      <UserIcon className="w-4 h-4 text-slate-500" />
                      <span>Account Profile</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      className="menu-item w-full text-left p-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="btn-secondary-outline h-10 px-4 rounded-2xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50"
              onClick={onOpenAuth}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Primary Action Button: Report Issue (Shown for Citizens & Guests only) */}
          {!isAdmin && (
            <button
              type="button"
              className="btn-primary-gradient h-10 px-4 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 shrink-0"
              onClick={onOpenReport}
              id="nav-report-issue-btn"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Issue</span>
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="w-10 h-10 rounded-2xl border border-slate-200 bg-white lg:hidden flex items-center justify-center text-slate-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 p-4 space-y-2 animate-fade-in shadow-xl max-w-[1200px] mx-auto">
          <button
            type="button"
            className="w-full text-left p-2.5 rounded-xl font-bold text-xs text-slate-800 hover:bg-slate-50 flex items-center gap-2"
            onClick={() => handleNav('/')}
          >
            <MapPin className="w-4 h-4 text-indigo-600" /> Home & GIS Map
          </button>

          <button
            type="button"
            className="w-full text-left p-2.5 rounded-xl font-bold text-xs text-slate-800 hover:bg-slate-50 flex items-center gap-2"
            onClick={() => handleNav('/track-complaint')}
          >
            <Search className="w-4 h-4 text-cyan-600" /> Track Complaint
          </button>

          {currentUser && isCitizen && (
            <>
              <button
                type="button"
                className="w-full text-left p-2.5 rounded-xl font-bold text-xs text-slate-800 hover:bg-slate-50 flex items-center gap-2"
                onClick={() => handleNav('/dashboard')}
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-600" /> Citizen Dashboard
              </button>
              <button
                type="button"
                className="w-full text-left p-2.5 rounded-xl font-bold text-xs text-slate-800 hover:bg-slate-50 flex items-center gap-2"
                onClick={() => handleNav('/my-complaints')}
              >
                <Clock className="w-4 h-4 text-indigo-600" /> My Complaints
              </button>
            </>
          )}

          {isAdmin && (
            <>
              <button
                type="button"
                className="w-full text-left p-2.5 rounded-xl font-bold text-xs text-slate-800 hover:bg-slate-50 flex items-center gap-2"
                onClick={() => handleNav('/admin/dashboard')}
              >
                <Building2 className="w-4 h-4 text-rose-500" /> Admin Command Center
              </button>

              <button
                type="button"
                className="w-full text-left p-2.5 rounded-xl font-bold text-xs text-slate-800 hover:bg-slate-50 flex items-center gap-2"
                onClick={() => handleNav('/admin/data-vault')}
              >
                <Database className="w-4 h-4 text-indigo-600" /> Master Data Vault
              </button>
            </>
          )}

          <button
            type="button"
            className="w-full text-left p-2.5 rounded-xl font-bold text-xs text-slate-800 hover:bg-slate-50 flex items-center gap-2"
            onClick={() => handleNav('/analytics')}
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" /> City Analytics
          </button>

          <button
            type="button"
            className="w-full text-left p-2.5 rounded-xl font-bold text-xs text-slate-800 hover:bg-slate-50 flex items-center gap-2"
            onClick={() => handleNav('/ai-priority')}
          >
            <Brain className="w-4 h-4 text-indigo-600" /> AI Telemetry
          </button>
        </div>
      )}
    </nav>
  );
}
