import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wrench, LogOut, User as UserIcon } from 'lucide-react';


export const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = (): void => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <Wrench className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Eslaah</span>
        </Link>

        {isAuthenticated && user && (
          <div className="flex items-center gap-2 sm:gap-3">

        <div className="relative">
            {/* الزر / الشارة */}
            <div
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-2 sm:px-3 sm:py-1 cursor-pointer select-none"
            >
              <UserIcon className="h-4 w-4 text-blue-600 shrink-0" />
              
              {/* يظهر في الشاشات العادية ويختفي في الموبايل */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs font-medium text-slate-700">{user?.fullName}</span>
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                  {user?.role}
                </span>
              </div>
            </div>

            {/* القائمة المنسدلة لشاشات الموبايل فقط */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-3 shadow-lg z-50 sm:hidden">
                <p className="text-xs font-bold text-slate-800 break-words">{user?.fullName}</p>
                <div className="mt-2">
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                    {user?.role}
                  </span>
                </div>
              </div>
            )}
          </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 p-2 text-xs font-medium text-red-600 hover:bg-red-50 sm:px-3 sm:py-1.5"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};