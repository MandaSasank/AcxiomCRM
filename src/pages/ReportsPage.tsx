import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  BarChart3,
  Download,
  Filter,
  RefreshCw,
  TrendingUp,
  Users,
  UserPlus,
  Briefcase,
  Clock,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeReport, setActiveReport] = useState<
    'pipeline' | 'customers' | 'leads' | 'followups' | 'conversions' | 'user-activities'
  >('pipeline');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async (reportType: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('acxiom_token');
      const res = await fetch(`/api/reports/${reportType}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setReportData(json);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(activeReport);
  }, [activeReport, user?.roleName]);

  // CSV Export utility (Section 4.11)
  const exportToCSV = () => {
    if (!reportData) return;
    let rows: any[] = [];
    let filename = `AcxiomCRM_${activeReport}_report.csv`;

    if (activeReport === 'pipeline' && reportData.stageBreakdown) {
      rows = reportData.stageBreakdown.map((r: any) => ({
        Stage: r.stage,
        DealsCount: r.count,
        TotalAmount: r.totalAmount,
        WeightedAmount: r.weightedAmount,
      }));
    } else if (Array.isArray(reportData.data)) {
      rows = reportData.data;
    } else if (reportData.data && typeof reportData.data === 'object') {
      rows = [reportData.data];
    }

    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.join(','),
        ...rows.map(row =>
          headers
            .map(h => {
              const val = row[h];
              return typeof val === 'string' && val.includes(',')
                ? `"${val}"`
                : val ?? '';
            })
            .join(',')
        ),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportsList = [
    { id: 'pipeline', label: 'Pipeline Report', icon: TrendingUp },
    { id: 'customers', label: 'Customer Master', icon: Users },
    { id: 'leads', label: 'Lead & Sources', icon: UserPlus },
    { id: 'followups', label: 'Follow-Up Schedule', icon: Clock },
    { id: 'conversions', label: 'Win & Conversion Rates', icon: Briefcase },
    ...(user?.roleName !== 'SalesExecutive'
      ? [{ id: 'user-activities', label: 'User Activity Report', icon: ShieldCheck }]
      : []),
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            CRM Reports & Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Section 11 Reporting: Multi-dimensional analytics, conversion funnels, and CSV data export.
          </p>
        </div>

        <button
          onClick={exportToCSV}
          disabled={!reportData}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-xs transition-colors"
        >
          <Download className="w-4 h-4" />
          Export to CSV
        </button>
      </div>

      {/* Report Selection Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {reportsList.map(rep => {
          const Icon = rep.icon;
          const isActive = activeReport === rep.id;
          return (
            <button
              key={rep.id}
              onClick={() => setActiveReport(rep.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {rep.label}
            </button>
          );
        })}
      </div>

      {/* REPORT CONTENT VIEW */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          <span>Compiling report datasets...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. PIPELINE REPORT */}
          {activeReport === 'pipeline' && reportData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs uppercase font-bold text-slate-500">Open Pipeline</span>
                  <p className="text-2xl font-bold text-slate-900 mt-2">
                    ${(reportData.summary?.totalOpenAmount || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Active unclosed opportunities</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs uppercase font-bold text-slate-500">Weighted Pipeline</span>
                  <p className="text-2xl font-bold text-blue-700 mt-2">
                    ${Math.round(reportData.summary?.totalWeightedAmount || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Adjusted by closing probability</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs uppercase font-bold text-slate-500">Total Closed Won</span>
                  <p className="text-2xl font-bold text-emerald-600 mt-2">
                    ${(reportData.summary?.totalWonAmount || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Recognized bookings</p>
                </div>
              </div>

              {/* Stage-wise Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Stage-Wise Pipeline Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase font-semibold border-b">
                        <th className="py-2.5 px-3">Stage</th>
                        <th className="py-2.5 px-3">Opportunities</th>
                        <th className="py-2.5 px-3">Gross Pipeline</th>
                        <th className="py-2.5 px-3">Weighted Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.stageBreakdown?.map((st: any) => (
                        <tr key={st.stage} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{st.stage}</td>
                          <td className="py-2.5 px-3">{st.count}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            ${st.totalAmount.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-blue-700">
                            ${Math.round(st.weightedAmount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Owner-Wise Pipeline (Admin / Manager) */}
              {reportData.ownerBreakdown && reportData.ownerBreakdown.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Sales Representative Performance</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase font-semibold border-b">
                          <th className="py-2.5 px-3">Representative</th>
                          <th className="py-2.5 px-3">Deals Count</th>
                          <th className="py-2.5 px-3">Open Deals ($)</th>
                          <th className="py-2.5 px-3">Won Deals ($)</th>
                          <th className="py-2.5 px-3">Weighted ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.ownerBreakdown.map((ow: any) => (
                          <tr key={ow.userId} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{ow.userName}</td>
                            <td className="py-2.5 px-3">{ow.totalOpportunities}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              ${ow.openAmount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-emerald-600">
                              ${ow.wonAmount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-blue-700">
                              ${Math.round(ow.weightedAmount).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. CONVERSION RATES REPORT */}
          {activeReport === 'conversions' && reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <span className="text-xs uppercase font-bold text-slate-500">Lead Conversion Rate</span>
                  <p className="text-3xl font-extrabold text-blue-700 mt-2">
                    {reportData.data?.leadConversionRate}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {reportData.data?.convertedLeads} of {reportData.data?.totalLeads} leads converted
                  </p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <span className="text-xs uppercase font-bold text-slate-500">Opportunity Win Rate</span>
                  <p className="text-3xl font-extrabold text-emerald-600 mt-2">
                    {reportData.data?.winRate}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {reportData.data?.wonOpportunities} won deals
                  </p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <span className="text-xs uppercase font-bold text-slate-500">Lost Opportunities</span>
                  <p className="text-3xl font-extrabold text-rose-600 mt-2">
                    {reportData.data?.lostOpportunities}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Lost to competitors / budget</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <span className="text-xs uppercase font-bold text-slate-500">Total Pipeline Deals</span>
                  <p className="text-3xl font-extrabold text-slate-900 mt-2">
                    {reportData.data?.totalOpportunities}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Lifetime deals logged</p>
                </div>
              </div>
            </div>
          )}

          {/* 3. GENERIC TABLE REPORTS (CUSTOMERS, LEADS, FOLLOWUPS, USER ACTIVITIES) */}
          {['customers', 'leads', 'followups', 'user-activities'].includes(activeReport) && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase font-semibold border-b">
                      {reportData.data && reportData.data.length > 0 ? (
                        Object.keys(reportData.data[0]).map(col => (
                          <th key={col} className="py-2.5 px-3">
                            {col}
                          </th>
                        ))
                      ) : (
                        <th className="py-3 px-4">Records</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.data && reportData.data.length > 0 ? (
                      reportData.data.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          {Object.values(row).map((val: any, j: number) => (
                            <td key={j} className="py-2.5 px-3">
                              {typeof val === 'boolean'
                                ? val
                                  ? 'Yes'
                                  : 'No'
                                : val !== null && val !== undefined
                                ? String(val)
                                : '—'}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-6 text-center text-slate-400">No report rows found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
