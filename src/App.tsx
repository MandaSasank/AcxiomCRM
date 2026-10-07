import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Footer } from './components/Footer.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { CustomersPage } from './pages/CustomersPage.tsx';
import { LeadsPage } from './pages/LeadsPage.tsx';
import { OpportunitiesPage } from './pages/OpportunitiesPage.tsx';
import { FollowUpsPage } from './pages/FollowUpsPage.tsx';
import { ActivitiesPage } from './pages/ActivitiesPage.tsx';
import { ReportsPage } from './pages/ReportsPage.tsx';
import { UsersPage } from './pages/UsersPage.tsx';
import { AuditLogPage } from './pages/AuditLogPage.tsx';
import { AcceptanceTestPage } from './pages/AcceptanceTestPage.tsx';

function MainLayout() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium">Initializing AcxiomCRM...</p>
        </div>
      </div>
    );
  }

  // Not authenticated: render Login / Register (Satisfies Acceptance Scenario 1)
  if (!user) {
    if (authView === 'register') {
      return <RegisterPage onSwitchToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onSwitchToRegister={() => setAuthView('register')} />;
  }

  // Render CRM Modules based on activeTab
  const renderActiveModule = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage setActiveTab={setActiveTab} />;
      case 'customers':
        return <CustomersPage />;
      case 'leads':
        return <LeadsPage />;
      case 'opportunities':
        return <OpportunitiesPage />;
      case 'followups':
        return <FollowUpsPage />;
      case 'activities':
        return <ActivitiesPage />;
      case 'reports':
        return <ReportsPage />;
      case 'users':
        return <UsersPage />;
      case 'audit-log':
        return <AuditLogPage />;
      case 'acceptance-tests':
        return <AcceptanceTestPage />;
      default:
        return <DashboardPage setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans antialiased">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          {renderActiveModule()}
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
