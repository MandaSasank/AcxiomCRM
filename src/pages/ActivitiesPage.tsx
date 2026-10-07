import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ActivityDto, CustomerDto, LeadDto } from '../types/crm.ts';
import {
  CheckSquare,
  Plus,
  Phone,
  Video,
  Mail,
  Calendar,
  Filter,
  CheckCircle,
  X,
  AlertCircle,
  Clock,
  Building,
} from 'lucide-react';

export const ActivitiesPage: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityDto[]>([]);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [leads, setLeads] = useState<LeadDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [showLogModal, setShowLogModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    activityType: 'Call',
    subject: '',
    description: '',
    activityDate: new Date().toISOString(),
    targetType: 'customer',
    targetId: '',
    status: 'Completed',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('acxiom_token');
      const params = new URLSearchParams();
      if (typeFilter !== 'All') params.append('type', typeFilter);
      if (statusFilter !== 'All') params.append('status', statusFilter);

      const res = await fetch(`/api/activities?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setActivities(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const token = localStorage.getItem('acxiom_token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [cRes, lRes] = await Promise.all([
        fetch('/api/customers', { headers }),
        fetch('/api/leads', { headers }),
      ]);
      if (cRes.ok) {
        const c = await cRes.json();
        setCustomers(c.data || []);
      }
      if (lRes.ok) {
        const l = await lRes.json();
        setLeads(l.data || []);
      }
    } catch (err) {
      console.error('Failed to load dropdown records:', err);
    }
  };

  useEffect(() => {
    fetchActivities();
    fetchDropdowns();
  }, [typeFilter, statusFilter, user?.roleName]);

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!formData.subject.trim()) {
      setFormErrors({ subject: 'Activity subject is required.' });
      return;
    }

    try {
      const token = localStorage.getItem('acxiom_token');
      const payload: any = {
        activityType: formData.activityType,
        subject: formData.subject,
        description: formData.description,
        activityDate: formData.activityDate,
        status: formData.status,
      };

      if (formData.targetType === 'customer') payload.customerId = formData.targetId;
      else if (formData.targetType === 'lead') payload.leadId = formData.targetId;

      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowLogModal(false);
        resetForm();
        setActionSuccess(`Activity logged: "${data.data.subject}".`);
        fetchActivities();
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        setServerError(data.message || 'Failed to log activity');
      }
    } catch (err: any) {
      setServerError(err.message || 'Network error');
    }
  };

  const resetForm = () => {
    setFormData({
      activityType: 'Call',
      subject: '',
      description: '',
      activityDate: new Date().toISOString(),
      targetType: 'customer',
      targetId: customers[0]?.customerId || '',
      status: 'Completed',
    });
    setFormErrors({});
    setServerError(null);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'Call':
        return <Phone className="w-4 h-4 text-blue-600" />;
      case 'Meeting':
        return <Video className="w-4 h-4 text-purple-600" />;
      case 'Email':
        return <Mail className="w-4 h-4 text-emerald-600" />;
      case 'Task':
        return <CheckSquare className="w-4 h-4 text-amber-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-blue-600" />
            Activity Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Log completed client interactions: Phone Calls, Executive Meetings, Email Exchanges, and Internal Tasks.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowLogModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Log Activity
        </button>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {['All', 'Call', 'Meeting', 'Email', 'Task'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                typeFilter === t
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t === 'All' ? 'All Types' : `${t}s`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="All">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Planned">Planned</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {activities.length} activities
          </span>
        </div>
      </div>

      {/* Activities Timeline / Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
            Loading activity log...
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            No activity records found matching filters.
          </div>
        ) : (
          activities.map(act => (
            <div
              key={act.activityId}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                  {getActivityIcon(act.activityType)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{act.subject}</span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {act.activityType}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">{act.description}</p>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                    <span>
                      Linked:{' '}
                      <strong className="text-slate-700">
                        {act.customerName || act.leadName || 'General Account'}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>Logged by {act.assignedToName}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                <div className="text-right text-xs">
                  <span className="text-slate-400 block font-medium">Activity Date</span>
                  <span className="text-slate-800 font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {new Date(act.activityDate).toLocaleDateString()}
                  </span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  {act.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* LOG ACTIVITY MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Log Customer Activity</h2>
                <p className="text-xs text-slate-500">Record notes from sales interaction.</p>
              </div>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogActivity} className="p-5 space-y-4">
              {serverError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Activity Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Call', 'Meeting', 'Email', 'Task'].map(t => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setFormData({ ...formData, activityType: t })}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                        formData.activityType === t
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject / Topic <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g. Discovery call on security architecture"
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden ${
                    formErrors.subject ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                  }`}
                />
                {formErrors.subject && <p className="text-xs text-rose-600 mt-1">{formErrors.subject}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Relates To</label>
                  <select
                    value={formData.targetType}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        targetType: e.target.value,
                        targetId:
                          e.target.value === 'customer'
                            ? customers[0]?.customerId || ''
                            : leads[0]?.leadId || '',
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                  >
                    <option value="customer">Customer</option>
                    <option value="lead">Lead</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Account</label>
                  <select
                    value={formData.targetId}
                    onChange={e => setFormData({ ...formData, targetId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                  >
                    {formData.targetType === 'customer'
                      ? customers.map(c => (
                          <option key={c.customerId} value={c.customerId}>
                            {c.customerName}
                          </option>
                        ))
                      : leads.map(l => (
                          <option key={l.leadId} value={l.leadId}>
                            {l.leadName}
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Record summary of conversation, agreed timeline, or blockers..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Save Activity Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
