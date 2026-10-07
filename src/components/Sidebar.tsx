import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  LayoutDashboard,
  Building,
  UserPlus,
  TrendingUp,
  CalendarCheck,
  CheckSquare,
  BarChart3,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  if (!user) return null;

  const isAdmin = user.roleName === 'Admin';
  const isManager = user.roleName === 'Manager';

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['Admin', 'Manager', 'SalesExecutive'],
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Building,
      roles: ['Admin', 'Manager', 'SalesExecutive'],
    },
    {
      id: 'leads',
      label: 'Leads',
      icon: UserPlus,
      roles: ['Admin', 'Manager', 'SalesExecutive'],
    },
    {
      id: 'opportunities',
      label: 'Opportunities',
      icon: TrendingUp,
      roles: ['Admin', 'Manager', 'SalesExecutive'],
    },
    {
      id: 'followups',
      label: 'Follow-Ups',
      icon: CalendarCheck,
      roles: ['Admin', 'Manager', 'SalesExecutive'],
    },
    {
      id: 'activities',
      label: 'Activities',
      icon: CheckSquare,
      roles: ['Admin', 'Manager', 'SalesExecutive'],
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      roles: ['Admin', 'Manager', 'SalesExecutive'],
    },
    {
      id: 'users',
      label: 'User & Role Mgmt',
      icon: Lock,
      roles: ['Admin'],
      badge: 'Admin',
    },
    {
      id: 'audit-log',
      label: 'Audit Trail',
      icon: FileText,
      roles: ['Admin', 'Manager'],
      badge: 'Protected',
    },
    {
      id: 'acceptance-tests',
      label: 'Acceptance Tests',
      icon: ShieldCheck,
      roles: ['Admin', 'Manager', 'SalesExecutive'],
      badge: '14 Tests',
    },
  ];

  const visibleItems = navItems.filter(item => item.roles.includes(user.roleName));

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800">
      {/* Scope banner */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
            Current Scope
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isAdmin
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : isManager
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {user.roleName}
          </span>
        </div>
        <p className="text-xs text-slate-300 mt-1 font-medium truncate">
          {isAdmin
            ? 'Full Organization Access'
            : isManager
            ? 'Team Pipeline & Reports'
            : 'Assigned Sales Records Only'}
        </p>
      </div>

      {/* Main navigation list */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300 px-3 pb-1">
          CRM Modules
        </div>
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-blue-700 text-blue-100'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30 text-xs text-slate-300 space-y-1">
        <div className="flex items-center gap-1.5 text-slate-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold">AcxiomCRM v2.4</span>
        </div>
        <p className="text-[11px] text-slate-400">Section 17.2 Compliant Architecture</p>
      </div>
    </aside>
  );
};
