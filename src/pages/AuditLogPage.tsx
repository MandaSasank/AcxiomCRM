import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { AuditLogDto } from '../types/crm.ts';
import {
  FileText,
  Search,
  Filter,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Eye,
  X,
  Lock,
} from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [resultFilter, setResultFilter] = useState('All');

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogDto | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('acxiom_token');
      const params = new URLSearchParams();
      if (userSearch) params.append('user', userSearch);
      if (actionFilter !== 'All') params.append('action', actionFilter);
      if (moduleFilter !== 'All') params.append('module', moduleFilter);
      if (resultFilter !== 'All') params.append('result', resultFilter);

      const res = await fetch(`/api/audit-logs?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [userSearch, actionFilter, moduleFilter, resultFilter, user?.roleName]);

  // Authorization check (Section 7.1: Admin Full, Manager limited/view, Sales Executive No)
  if (user?.roleName === 'SalesExecutive') {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">403 Forbidden - Access Restricted</h2>
        <p className="text-sm text-slate-600">
          The Security Audit Trail is protected and accessible only to administrators and compliance auditors. Sales Executives do not have permission to view system audit logs.
        </p>
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'Login':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Failed Login':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Logout':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Create':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Update':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Delete':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Role Change':
      case 'Security':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Security & Compliance Audit Trail
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable, append-oriented log recording user logins, failed authentications, privilege changes, and CRUD mutations.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Append-Only Protection Enforced
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by user name or ID..."
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="All">All Actions</option>
            <option value="Login">Login</option>
            <option value="Failed Login">Failed Login</option>
            <option value="Logout">Logout</option>
            <option value="Create">Create</option>
            <option value="Update">Update</option>
            <option value="Delete">Delete</option>
            <option value="Role Change">Role Change</option>
            <option value="Security">Security</option>
          </select>

          <select
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="All">All Modules</option>
            <option value="Auth">Auth</option>
            <option value="Customer">Customer</option>
            <option value="Lead">Lead</option>
            <option value="Opportunity">Opportunity</option>
            <option value="FollowUp">FollowUp</option>
            <option value="Activity">Activity</option>
            <option value="User">User</option>
          </select>

          <select
            value={resultFilter}
            onChange={e => setResultFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="All">All Results</option>
            <option value="Success">Success</option>
            <option value="Failure">Failure</option>
            <option value="Blocked">Blocked</option>
          </select>

          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            {logs.length} logged events
          </span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity / Module</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No audit records found matching filters.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.auditLogId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-mono whitespace-nowrap">
                      {new Date(log.createdDate).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {log.userName}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {log.entityName}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded font-semibold ${
                          log.result === 'Success'
                            ? 'bg-emerald-50 text-emerald-700'
                            : log.result === 'Blocked'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {log.result}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={log.details}>
                      {log.details || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="View payload payload details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AUDIT DETAILS INSPECTOR MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Audit Record Inspector</h2>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 block font-medium">Log ID</span>
                  <span className="font-mono text-slate-800">{selectedLog.auditLogId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Timestamp</span>
                  <span className="text-slate-800 font-semibold">{new Date(selectedLog.createdDate).toISOString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">User</span>
                  <span className="text-slate-800 font-semibold">{selectedLog.userName} ({selectedLog.userId})</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Action & Module</span>
                  <span className="text-slate-800 font-semibold">{selectedLog.action} on {selectedLog.entityName}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-1">Details Summary:</span>
                <p className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-800">
                  {selectedLog.details || 'No textual detail recorded.'}
                </p>
              </div>

              {selectedLog.oldValue && (
                <div>
                  <span className="text-slate-500 font-semibold block mb-1">Previous State (OldValue):</span>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg overflow-x-auto text-[11px] font-mono">
                    {typeof selectedLog.oldValue === 'string'
                      ? selectedLog.oldValue
                      : JSON.stringify(selectedLog.oldValue, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newValue && (
                <div>
                  <span className="text-slate-500 font-semibold block mb-1">Committed State (NewValue):</span>
                  <pre className="p-3 bg-slate-900 text-blue-300 rounded-lg overflow-x-auto text-[11px] font-mono">
                    {typeof selectedLog.newValue === 'string'
                      ? selectedLog.newValue
                      : JSON.stringify(selectedLog.newValue, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
