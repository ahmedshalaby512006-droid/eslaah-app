import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Wrench, LogOut, User as UserIcon, Globe } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

export const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { toggleLang, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          to={user ? (user.role === 'ADMIN' ? '/admin' : user.role === 'TECHNICIAN' || user.role === 'ENGINEER' ? '/technician' : '/customer') : "/"}
          className="flex items-center gap-2.5 group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/25 group-hover:scale-105 transition-transform">
            <Wrench className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-slate-900 leading-none">{t('appName')}</span>
            <span className="text-[10px] font-semibold text-amber-700 tracking-wider uppercase mt-0.5">Roadside Assistance</span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notification Bell Button */}
          <NotificationBell />

          {/* Language Switcher Button */}
          <button
            type="button"
            onClick={toggleLang}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-900 transition shadow-xs"
            title="Switch Language / تبديل اللغة"
          >
            <Globe className="h-3.5 w-3.5 text-amber-600" />
            <span>{t('switchLangText')}</span>
          </button>

          {isAuthenticated && user && (
            <>
              {['/profile', '/history'].includes(location.pathname) ? (
                <Link
                  to={user?.role === 'ADMIN' ? '/admin' : user?.role === 'TECHNICIAN' ? '/technician' : '/customer'}
                  className="text-xs sm:text-sm font-bold text-slate-700 hover:text-amber-600 px-2.5 py-1 transition"
                >
                  {t('back')}
                </Link>
              ) : (
                <>
                  {user?.role === 'ADMIN' && (
                    <Link to="/admin" className="text-xs sm:text-sm font-bold text-slate-700 hover:text-amber-600 px-2.5 py-1 transition">
                      {t('adminDashboard')}
                    </Link>
                  )}
                  {user?.role !== 'ADMIN' && (
                    <Link to="/history" className="text-xs sm:text-sm font-bold text-slate-700 hover:text-amber-600 px-2.5 py-1 transition">
                      {t('serviceHistory')}
                    </Link>
                  )}
                </>
              )}

              <div
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 sm:px-3 sm:py-1.5 cursor-pointer select-none hover:bg-amber-50/60 hover:border-amber-300 transition shadow-xs"
              >
                <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">{user?.fullName}</span>
                  {user?.phoneNumber && <span className="text-[11px] text-slate-400 font-mono">({user.phoneNumber})</span>}
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase border ${
                    user?.role === 'TECHNICIAN'
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : user?.role === 'ADMIN'
                      ? 'bg-red-50 text-red-800 border-red-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {user?.role === 'TECHNICIAN' ? t('technicianRole') : user?.role === 'CUSTOMER' ? t('customerRole') : user?.role}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 p-2 text-xs font-bold text-red-600 hover:bg-red-100 hover:border-red-300 sm:px-3 sm:py-1.5 transition"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{t('logout')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
