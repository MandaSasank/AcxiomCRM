import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { FollowUpDto, CustomerDto, LeadDto, OpportunityDto } from '../types/crm.ts';
import {
  CalendarCheck,
  Plus,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  X,
  Edit2,
  Trash2,
  AlertCircle,
  RefreshCw,
  Phone,
  Video,
  Mail,
  CheckSquare,
} from 'lucide-react';

export const FollowUpsPage: React.FC = () => {
  const { user } = useAuth();
  const [followUps, setFollowUps] = useState<FollowUpDto[]>([]);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [leads, setLeads] = useState<LeadDto[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityDto[]>([]);

  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'upcoming' | 'overdue' | 'today' | 'completed'>('all');
  const [typeFilter, setTypeFilter] = useState('All');

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpDto | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    subject: '',
    followUpDate: new Date().toISOString().split('T')[0],
    followUpType: 'Call',
    targetType: 'customer', // 'customer' | 'lead' | 'opportunity'
    targetId: '',
    remarks: '',
    notes: '',
  });

  const [rescheduleDate, setRescheduleDate] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('acxiom_token');
      const params = new URLSearchParams();
      if (filterType !== 'all' && filterType !== 'completed') {
        params.append('filter', filterType);
      } else if (filterType === 'completed') {
        params.append('status', 'Completed');
      }
      if (typeFilter !== 'All') {
        params.append('type', typeFilter);
      }

      const res = await fetch(`/api/followups?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setFollowUps(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedEntities = async () => {
    try {
      const token = localStorage.getItem('acxiom_token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [cRes, lRes, oRes] = await Promise.all([
        fetch('/api/customers', { headers }),
        fetch('/api/leads', { headers }),
        fetch('/api/opportunities', { headers }),
      ]);

      if (cRes.ok) {
        const cData = await cRes.json();
        setCustomers(cData.data || []);
      }
      if (lRes.ok) {
        const lData = await lRes.json();
        setLeads(lData.data || []);
      }
      if (oRes.ok) {
        const oData = await oRes.json();
        setOpportunities(oData.data || []);
      }
    } catch (err) {
      console.error('Failed to load related CRM entities:', err);
    }
  };

  useEffect(() => {
    fetchFollowUps();
    fetchRelatedEntities();
  }, [filterType, typeFilter, user?.roleName]);

  // Validation (Section 5.3 & 5.4: Follow-up date cannot be earlier than today)
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.subject.trim()) {
      errors.subject = 'Subject is required.';
    }

    if (!formData.followUpDate) {
      errors.followUpDate = 'Follow-up date is required.';
    } else {
      const selectedDate = new Date(formData.followUpDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());

      if (selDateOnly < today) {
        errors.followUpDate = 'Follow-up date cannot be earlier than today.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('acxiom_token');
      const payload: any = {
        subject: formData.subject,
        followUpDate: formData.followUpDate,
        followUpType: formData.followUpType,
        remarks: formData.remarks,
        notes: formData.notes,
        status: 'Planned',
      };

      if (formData.targetType === 'customer') payload.customerId = formData.targetId;
      else if (formData.targetType === 'lead') payload.leadId = formData.targetId;
      else if (formData.targetType === 'opportunity') payload.opportunityId = formData.targetId;

      const res = await fetch('/api/followups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowScheduleModal(false);
        resetForm();
        setActionSuccess(`Follow-up "${data.data.subject}" scheduled.`);
        fetchFollowUps();
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        if (data.errors) setFormErrors(data.errors);
        setServerError(data.message || 'Failed to schedule follow-up');
      }
    } catch (err: any) {
      setServerError(err.message || 'Network error');
    }
  };

  const markComplete = async (flw: FollowUpDto) => {
    try {
      const token = localStorage.getItem('acxiom_token');
      const res = await fetch(`/api/followups/${flw.followUpId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'Completed' }),
      });

      if (res.ok) {
        setActionSuccess(`Follow-up marked as Completed.`);
        fetchFollowUps();
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Failed to mark complete:', err);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUp) return;
    setServerError(null);

    const todayStr = new Date().toISOString().split('T')[0];
    if (rescheduleDate < todayStr) {
      setServerError('Follow-up date cannot be earlier than today.');
      return;
    }

    try {
      const token = localStorage.getItem('acxiom_token');
      const res = await fetch(`/api/followups/${selectedFollowUp.followUpId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          followUpDate: rescheduleDate,
          status: 'Planned',
        }),
      });

      if (res.ok) {
        setShowRescheduleModal(false);
        setActionSuccess(`Follow-up rescheduled to ${rescheduleDate}.`);
        fetchFollowUps();
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        const data = await res.json();
        setServerError(data.message || 'Reschedule failed');
      }
    } catch (err: any) {
      setServerError(err.message || 'Network error');
    }
  };

  const resetForm = () => {
    setFormData({
      subject: '',
      followUpDate: new Date().toISOString().split('T')[0],
      followUpType: 'Call',
      targetType: 'customer',
      targetId: customers.length > 0 ? customers[0].customerId : '',
      remarks: '',
      notes: '',
    });
    setFormErrors({});
    setServerError(null);
  };

  const getTypeIcon = (type: string) => {
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
            <CalendarCheck className="w-6 h-6 text-blue-600" />
            Follow-Up Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Schedule sales reminders, track upcoming meetings/calls, and prevent deal slippage with overdue alerts.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowScheduleModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Schedule Follow-Up
        </button>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter Tabs & Type Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Activities' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'today', label: 'Due Today' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'completed', label: 'Completed' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterType === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-hidden"
          >
            <option value="All">All Types</option>
            <option value="Call">Calls</option>
            <option value="Meeting">Meetings</option>
            <option value="Email">Emails</option>
            <option value="Task">Tasks</option>
          </select>
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {followUps.length} follow-ups
          </span>
        </div>
      </div>

      {/* Follow-Ups List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
            Loading follow-up schedule...
          </div>
        ) : followUps.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            No follow-up activities found in this view.
          </div>
        ) : (
          followUps.map(flw => {
            const isOverdue = flw.isOverdue;
            return (
              <div
                key={flw.followUpId}
                className={`bg-white p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isOverdue
                    ? 'border-amber-300 bg-amber-50/20 shadow-xs'
                    : flw.status === 'Completed'
                    ? 'border-slate-200 opacity-75'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                    {getTypeIcon(flw.followUpType)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{flw.subject}</span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {flw.followUpType}
                      </span>
                      {isOverdue && (
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Overdue
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600">
                      Target:{' '}
                      <strong className="text-slate-800">
                        {flw.customerName || flw.leadName || flw.opportunityName || 'General Account'}
                      </strong>{' '}
                      • Assigned: {flw.assignedToName}
                    </p>

                    {flw.remarks && (
                      <p className="text-xs text-slate-500 italic">"{flw.remarks}"</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  <div className="text-right text-xs">
                    <span className="text-slate-400 block font-medium">Due Date</span>
                    <span
                      className={`font-semibold flex items-center gap-1 ${
                        isOverdue ? 'text-rose-600' : 'text-slate-800'
                      }`}
                    >
                      <Calendar className="w-3 h-3" />
                      {flw.followUpDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {flw.status === 'Planned' && (
                      <>
                        <button
                          onClick={() => markComplete(flw)}
                          className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Done
                        </button>
                        <button
                          onClick={() => {
                            setSelectedFollowUp(flw);
                            setRescheduleDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
                            setShowRescheduleModal(true);
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                        >
                          Reschedule
                        </button>
                      </>
                    )}
                    {flw.status === 'Completed' && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SCHEDULE FOLLOW-UP MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Schedule Follow-Up</h2>
                <p className="text-xs text-slate-500">Plan next client contact touchpoint.</p>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleFollowUp} className="p-5 space-y-4">
              {serverError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject / Objective <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g. Discuss Q4 software migration quote"
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden ${
                    formErrors.subject ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                  }`}
                />
                {formErrors.subject && <p className="text-xs text-rose-600 mt-1">{formErrors.subject}</p>}
              </div>

              {/* Target Entity Link */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Related Entity</label>
                  <select
                    value={formData.targetType}
                    onChange={e => {
                      const t = e.target.value;
                      setFormData({
                        ...formData,
                        targetType: t,
                        targetId:
                          t === 'customer'
                            ? customers[0]?.customerId || ''
                            : t === 'lead'
                            ? leads[0]?.leadId || ''
                            : opportunities[0]?.opportunityId || '',
                      });
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                  >
                    <option value="customer">Customer</option>
                    <option value="lead">Lead</option>
                    <option value="opportunity">Opportunity</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Record</label>
                  <select
                    value={formData.targetId}
                    onChange={e => setFormData({ ...formData, targetId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                  >
                    {formData.targetType === 'customer' &&
                      customers.map(c => (
                        <option key={c.customerId} value={c.customerId}>
                          {c.customerName}
                        </option>
                      ))}
                    {formData.targetType === 'lead' &&
                      leads.map(l => (
                        <option key={l.leadId} value={l.leadId}>
                          {l.leadName} ({l.leadCode})
                        </option>
                      ))}
                    {formData.targetType === 'opportunity' &&
                      opportunities.map(o => (
                        <option key={o.opportunityId} value={o.opportunityId}>
                          {o.opportunityName}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Follow-Up Date & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Follow-Up Date <span className="text-rose-500">* (Cannot be in past)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.followUpDate}
                    onChange={e => setFormData({ ...formData, followUpDate: e.target.value })}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden ${
                      formErrors.followUpDate ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                    }`}
                  />
                  {formErrors.followUpDate && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.followUpDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Activity Type</label>
                  <select
                    value={formData.followUpType}
                    onChange={e => setFormData({ ...formData, followUpType: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                  >
                    <option value="Call">Call</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Email">Email</option>
                    <option value="Task">Task</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Agenda</label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Outline key questions or discussion points..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Schedule Follow-Up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {showRescheduleModal && selectedFollowUp && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Reschedule Follow-Up</h2>
            <p className="text-xs text-slate-500">
              Select new date for: <strong className="text-slate-800">{selectedFollowUp.subject}</strong>
            </p>

            {serverError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {serverError}
              </div>
            )}

            <form onSubmit={handleReschedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
