import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { UserRole } from '../types/crm.ts';
import { 
  Building2, 
  User, 
  LogOut, 
  ShieldCheck, 
  Briefcase, 
  Users, 
  CheckCircle2, 
  ChevronDown
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingFollowUpsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ setActiveTab, pendingFollowUpsCount = 0 }) => {
  const { user, logout, switchDemoRole } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  if (!user) return null;

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'Admin':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          label: 'Admin (Full Access)',
        };
      case 'Manager':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
          label: 'Manager (Team Scope)',
        };
      case 'SalesExecutive':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Sales Executive (Assigned)',
        };
    }
  };

  const badge = getRoleBadge(user.roleName);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-hidden"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-700 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-800 transition-colors">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                  Acxiom<span className="text-blue-700">CRM</span>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    Enterprise
                  </span>
                </span>
                <p className="text-[11px] text-slate-600 font-medium hidden sm:block">Customer Relationship Management</p>
              </div>
            </button>
          </div>

          {/* Quick Demo Persona Switcher (CRITICAL for Assessment Evaluation) */}
          <div className="hidden md:flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <span className="text-xs font-semibold text-slate-700 px-2 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-700" />
              Switch Role:
            </span>
            <button
              onClick={() => switchDemoRole('Admin')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 ${
                user.roleName === 'Admin'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              Admin
            </button>
            <button
              onClick={() => switchDemoRole('Manager')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 ${
                user.roleName === 'Manager'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Briefcase className="w-3 h-3" />
              Manager
            </button>
            <button
              onClick={() => switchDemoRole('SalesExecutive')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-all flex items-center gap-1 ${
                user.roleName === 'SalesExecutive'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Sales Exec
            </button>
          </div>

          {/* Right Header Section: Active Role Badge, Notifications & Profile */}
          <div className="flex items-center gap-3">
            {/* Acceptance Test Runner Shortcut */}
            <button
              onClick={() => setActiveTab('acceptance-tests')}
              className="hidden lg:flex items-center gap-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-1.5 rounded-lg border border-amber-300 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Acceptance Tests (14 Scenarios)
            </button>

            {/* Current Role Badge */}
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.bg}`}>
              <span className={`w-2 h-2 rounded-full ${badge.dot}`}></span>
              <span>{badge.label}</span>
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center border border-blue-200">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-900 line-clamp-1">{user.name}</div>
                  <div className="text-[11px] text-slate-600">{user.email}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setShowUserMenu(false)}
                >
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-600 truncate">{user.email}</p>
                    <div className="mt-1.5">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Role Switcher */}
                  <div className="md:hidden px-3.5 py-2 border-b border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-600 mb-1">Switch Role:</p>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => { switchDemoRole('Admin'); setShowUserMenu(false); }}
                        className="text-left text-xs text-slate-700 hover:text-blue-700 py-1"
                      >
                        • Admin (Alexander Pierce)
                      </button>
                      <button
                        onClick={() => { switchDemoRole('Manager'); setShowUserMenu(false); }}
                        className="text-left text-xs text-slate-700 hover:text-blue-700 py-1"
                      >
                        • Manager (Victoria Vance)
                      </button>
                      <button
                        onClick={() => { switchDemoRole('SalesExecutive'); setShowUserMenu(false); }}
                        className="text-left text-xs text-slate-700 hover:text-blue-700 py-1"
                      >
                        • Sales Exec (David Miller)
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setActiveTab('acceptance-tests');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    Acceptance Criteria Runner
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
