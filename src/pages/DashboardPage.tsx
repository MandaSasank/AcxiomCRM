import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { DashboardData } from '../types/crm.ts';
import {
  Users,
  UserPlus,
  Briefcase,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
);

interface DashboardPageProps {
  setActiveTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ setActiveTab }) => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dateFilter, setDateFilter] = useState<string>('All Time');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('acxiom_token');
      const res = await fetch(`/api/dashboard?dateRange=${encodeURIComponent(dateFilter)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [dateFilter, user?.roleName]);

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading AcxiomCRM Analytics...</span>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalCustomers: 0,
    totalLeads: 0,
    openLeads: 0,
    totalOpportunities: 0,
    openOpportunities: 0,
    wonOpportunities: 0,
    lostOpportunities: 0,
    totalPipelineValue: 0,
    weightedPipelineValue: 0,
    pendingFollowUps: 0,
    overdueFollowUpsCount: 0,
  };

  // Chart 1: Lead Status Doughnut
  const leadChartData = {
    labels: data?.charts.leadStatus.labels || ['New', 'Contacted', 'Qualified', 'Lost', 'Converted'],
    datasets: [
      {
        data: data?.charts.leadStatus.data || [0, 0, 0, 0, 0],
        backgroundColor: [
          '#3b82f6', // blue
          '#6366f1', // indigo
          '#eab308', // amber
          '#ef4444', // red
          '#10b981', // emerald
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  // Chart 2: Opportunity Pipeline Stage Bar Chart
  const pipelineChartData = {
    labels: data?.charts.pipelineStage.labels || ['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'],
    datasets: [
      {
        label: 'Pipeline Value ($)',
        data: data?.charts.pipelineStage.amounts || [0, 0, 0, 0, 0],
        backgroundColor: '#2563eb',
        borderRadius: 6,
      },
    ],
  };

  // Chart 3: Monthly Sales Performance
  const monthlySalesData = {
    labels: data?.charts.monthlySales.labels || [],
    datasets: [
      {
        label: 'Closed Won ($)',
        data: data?.charts.monthlySales.won || [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Pipeline Created ($)',
        data: data?.charts.monthlySales.pipeline || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Scope Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h1>
            <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
              Live KPIs
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Logged in as <strong className="text-slate-800">{user?.name}</strong> • Role:{' '}
            <strong className="text-blue-700">{user?.roleName}</strong> (
            {user?.roleName === 'Admin'
              ? 'Displaying all organizational records'
              : user?.roleName === 'Manager'
              ? 'Displaying full team sales pipeline'
              : 'Displaying assigned sales opportunities & leads'}
            )
          </p>
        </div>

        {/* Date Filter Bar (Section 4.3 & 17.11) */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <Calendar className="w-4 h-4 text-slate-500 ml-2" />
          {['All Time', 'Today', 'This Week', 'This Month'].map(df => (
            <button
              key={df}
              onClick={() => setDateFilter(df)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                dateFilter === df
                  ? 'bg-white text-blue-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {df}
            </button>
          ))}
          <button
            onClick={fetchDashboard}
            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-md transition-colors"
            title="Refresh KPIs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mandatory KPI Cards Grid (Section 17.11) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Customers */}
        <div
          onClick={() => setActiveTab('customers')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Total Customers</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{kpis.totalCustomers}</span>
            <span className="text-xs text-blue-600 font-medium flex items-center gap-0.5">
              View directory <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Active customer accounts in scope</p>
        </div>

        {/* Card 2: Total Leads & Open Leads */}
        <div
          onClick={() => setActiveTab('leads')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Total Leads</span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{kpis.totalLeads}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
              {kpis.openLeads} Open
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {kpis.totalLeads - kpis.openLeads} Converted or closed
          </p>
        </div>

        {/* Card 3: Opportunities Breakdown (Total, Open, Won, Lost) */}
        <div
          onClick={() => setActiveTab('opportunities')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Opportunities</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{kpis.totalOpportunities}</span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                {kpis.wonOpportunities} Won
              </span>
              <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                {kpis.lostOpportunities} Lost
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{kpis.openOpportunities} active deals in progress</p>
        </div>

        {/* Card 4: Total Pipeline Value & Weighted */}
        <div
          onClick={() => setActiveTab('opportunities')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Total Pipeline Value</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              ${kpis.totalPipelineValue.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            Weighted: ${Math.round(kpis.weightedPipelineValue).toLocaleString()} (prob. adjusted)
          </p>
        </div>
      </div>

      {/* Overdue Alert banner if any */}
      {kpis.overdueFollowUpsCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between text-amber-900">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                Attention: You have {kpis.overdueFollowUpsCount} overdue follow-up activit
                {kpis.overdueFollowUpsCount > 1 ? 'ies' : 'y'}.
              </p>
              <p className="text-xs text-amber-700">Prompt follow-ups improve sales conversion velocity.</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('followups')}
            className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Review Follow-Ups
          </button>
        </div>
      )}

      {/* Dashboard Charts Section (Section 17.12 - Chart.js) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Lead Status Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Lead Status Distribution</h2>
              <p className="text-xs text-slate-500">New, Contacted, Qualified, Lost, Converted</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              Chart.js
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[240px] max-h-[280px]">
            <Doughnut
              data={leadChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 11 } },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Chart 2: Opportunity Pipeline Stage Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pipeline Stages ($)</h2>
              <p className="text-xs text-slate-500">Qualification, Proposal, Negotiation, Won, Lost</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              Chart.js
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[240px] max-h-[280px]">
            <Bar
              data={pipelineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: val => `$${Number(val).toLocaleString()}`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Chart 3: Monthly Sales / Outcome Totals */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Monthly Sales Velocity</h2>
              <p className="text-xs text-slate-500">Closed deals vs pipeline created</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              Chart.js
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[240px] max-h-[280px]">
            <Line
              data={monthlySalesData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 11 } },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: val => `$${Number(val).toLocaleString()}`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Two-Column Activities and Upcoming Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Follow-Ups */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Upcoming Follow-Ups</h2>
            </div>
            <button
              onClick={() => setActiveTab('followups')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              View all ({kpis.pendingFollowUps})
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {data?.upcomingFollowUps && data.upcomingFollowUps.length > 0 ? (
              data.upcomingFollowUps.map(flw => (
                <div
                  key={flw.followUpId}
                  className="p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {flw.followUpType}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 line-clamp-1">{flw.subject}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Target: {flw.customerName || flw.leadName || 'General Contact'} • Due: {flw.followUpDate}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('followups')}
                    className="text-xs text-blue-600 font-medium hover:underline shrink-0 ml-3"
                  >
                    Action
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No upcoming follow-ups scheduled.</p>
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Sales Activities</h2>
            </div>
            <button
              onClick={() => setActiveTab('activities')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              View all
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {data?.recentActivities && data.recentActivities.length > 0 ? (
              data.recentActivities.map(act => (
                <div
                  key={act.activityId}
                  className="p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {act.activityType}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 line-clamp-1">{act.subject}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Logged by {act.assignedToName} • {new Date(act.activityDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    {act.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No recent activities logged.</p>
            )}
          </div>
        </div>
      </div>

      {/* Admin Security & System Statistics (Section 4.3 & 17.11) */}
      {data?.adminStats && (
        <div className="bg-slate-900 text-white p-5 rounded-xl shadow-md border border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">System Security & Identity Health</h2>
            </div>
            <button
              onClick={() => setActiveTab('audit-log')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
            >
              Inspect Audit Log ({data.adminStats.auditLogCount} Events)
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-[11px] text-slate-400">Total Users</p>
              <p className="text-xl font-bold text-white">{data.adminStats.totalUsers}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Active Accounts</p>
              <p className="text-xl font-bold text-emerald-400">{data.adminStats.activeUsers}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Locked Accounts</p>
              <p className="text-xl font-bold text-rose-400">{data.adminStats.lockedUsers}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Audit Trail Records</p>
              <p className="text-xl font-bold text-blue-400">{data.adminStats.auditLogCount}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
