import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { OpportunityDto, CustomerDto } from '../types/crm.ts';
import {
  TrendingUp,
  Plus,
  Search,
  Filter,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle,
  X,
  Edit2,
  Trash2,
  LayoutGrid,
  List,
  Building,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const OpportunitiesPage: React.FC = () => {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<OpportunityDto[]>([]);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<OpportunityDto | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    opportunityName: '',
    customerId: '',
    amount: '',
    stage: 'Qualification',
    probability: '50',
    expectedCloseDate: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('acxiom_token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (stageFilter !== 'All') params.append('stage', stageFilter);

      const res = await fetch(`/api/opportunities?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setOpportunities(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomersList = async () => {
    try {
      const token = localStorage.getItem('acxiom_token');
      const res = await fetch('/api/customers', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setCustomers(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load customers dropdown:', err);
    }
  };

  useEffect(() => {
    fetchOpportunities();
    fetchCustomersList();
  }, [searchTerm, stageFilter, user?.roleName]);

  // Client-Side Business Validation (Section 5.3 & 17.7)
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.opportunityName.trim()) {
      errors.opportunityName = 'Opportunity Name is required.';
    }

    if (!formData.customerId) {
      errors.customerId = 'Associated Customer is required.';
    }

    const amt = Number(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      errors.amount = 'Opportunity Amount must be greater than 0.';
    }

    const prob = Number(formData.probability);
    if (isNaN(prob) || prob < 0 || prob > 100) {
      errors.probability = 'Probability must be between 0 and 100.';
    }

    if (!formData.expectedCloseDate) {
      errors.expectedCloseDate = 'Expected Close Date is required.';
    } else {
      const closeDate = new Date(formData.expectedCloseDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const closeDateOnly = new Date(closeDate.getFullYear(), closeDate.getMonth(), closeDate.getDate());

      // Only enforce future date if opportunity is active (not Won/Lost)
      if (formData.stage !== 'Won' && formData.stage !== 'Lost' && closeDateOnly < today) {
        errors.expectedCloseDate = 'Expected Close Date cannot be in the past.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('acxiom_token');
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowCreateModal(false);
        resetForm();
        setActionSuccess(`Opportunity "${data.data.opportunityName}" created successfully.`);
        fetchOpportunities();
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        if (data.errors) setFormErrors(data.errors);
        setServerError(data.message || 'Failed to create opportunity');
      }
    } catch (err: any) {
      setServerError(err.message || 'Network error');
    }
  };

  const handleUpdateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpp) return;
    setServerError(null);

    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('acxiom_token');
      const res = await fetch(`/api/opportunities/${selectedOpp.opportunityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowEditModal(false);
        resetForm();
        setActionSuccess(`Opportunity "${data.data.opportunityName}" updated.`);
        fetchOpportunities();
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        if (data.errors) setFormErrors(data.errors);
        setServerError(data.message || 'Failed to update opportunity');
      }
    } catch (err: any) {
      setServerError(err.message || 'Network error');
    }
  };

  const updateStageQuickly = async (opp: OpportunityDto, newStage: string) => {
    try {
      const token = localStorage.getItem('acxiom_token');
      const res = await fetch(`/api/opportunities/${opp.opportunityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...opp,
          stage: newStage,
          probability: newStage === 'Won' ? 100 : newStage === 'Lost' ? 0 : opp.probability,
        }),
      });

      if (res.ok) {
        fetchOpportunities();
        setActionSuccess(`Stage updated to ${newStage}.`);
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Failed to change stage:', err);
    }
  };

  const handleDeleteOpportunity = async () => {
    if (!selectedOpp) return;
    try {
      const token = localStorage.getItem('acxiom_token');
      const res = await fetch(`/api/opportunities/${selectedOpp.opportunityId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        setShowDeleteModal(false);
        setActionSuccess(`Opportunity deleted.`);
        fetchOpportunities();
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        const data = await res.json();
        setServerError(data.message || 'Delete failed.');
      }
    } catch (err: any) {
      setServerError(err.message || 'Network error');
    }
  };

  const openEdit = (opp: OpportunityDto) => {
    setSelectedOpp(opp);
    setFormData({
      opportunityName: opp.opportunityName,
      customerId: opp.customerId,
      amount: String(opp.amount),
      stage: opp.stage,
      probability: String(opp.probability),
      expectedCloseDate: opp.expectedCloseDate,
      notes: opp.notes || '',
    });
    setFormErrors({});
    setServerError(null);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      opportunityName: '',
      customerId: customers.length > 0 ? customers[0].customerId : '',
      amount: '',
      stage: 'Qualification',
      probability: '50',
      expectedCloseDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      notes: '',
    });
    setFormErrors({});
    setServerError(null);
  };

  const STAGES = ['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Opportunity Management & Pipeline
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track deal stages, deal probabilities, expected closing dates, and weighted pipeline values.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                viewMode === 'kanban' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              <List className="w-4 h-4" />
              Table
            </button>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Opportunity
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search deal name, customer, stage..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="All">All Stages</option>
            {STAGES.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            {opportunities.length} Opportunities
          </span>
        </div>
      </div>

      {/* KANBAN PIPELINE VIEW */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const stageOpps = opportunities.filter(o => o.stage === stage);
            const totalStageVal = stageOpps.reduce((sum, o) => sum + o.amount, 0);

            return (
              <div
                key={stage}
                className="bg-slate-50/70 rounded-xl border border-slate-200 flex flex-col min-w-[220px]"
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-slate-200 bg-white rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-slate-700">{stage}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                      {stageOpps.length}
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 font-bold mt-1">
                    ${totalStageVal.toLocaleString()}
                  </p>
                </div>

                {/* Column Cards */}
                <div className="p-2 space-y-2.5 flex-1 min-h-[300px]">
                  {stageOpps.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400">
                      No deals
                    </div>
                  ) : (
                    stageOpps.map(opp => {
                      const weighted = (opp.amount * opp.probability) / 100;
                      return (
                        <div
                          key={opp.opportunityId}
                          className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs hover:shadow-sm hover:border-blue-300 transition-all space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-semibold text-slate-900 line-clamp-1">
                              {opp.opportunityName}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => openEdit(opp)}
                                className="text-slate-400 hover:text-amber-600 p-0.5"
                                title="Edit"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedOpp(opp);
                                  setShowDeleteModal(true);
                                }}
                                className="text-slate-400 hover:text-rose-600 p-0.5"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{opp.customerName}</span>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                            <span className="font-bold text-slate-900 text-sm">
                              ${opp.amount.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-bold">
                              {opp.probability}% (${Math.round(weighted).toLocaleString()})
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {opp.expectedCloseDate}
                            </span>
                            <span className="truncate max-w-[80px]">{opp.assignedToName}</span>
                          </div>

                          {/* Quick Stage Progression */}
                          <div className="pt-1.5 flex items-center justify-end gap-1">
                            {stage !== 'Won' && (
                              <button
                                onClick={() => updateStageQuickly(opp, 'Won')}
                                className="px-1.5 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded font-semibold flex items-center gap-0.5"
                                title="Mark Closed Won"
                              >
                                <CheckCircle2 className="w-2.5 h-2.5" /> Won
                              </button>
                            )}
                            {stage !== 'Lost' && (
                              <button
                                onClick={() => updateStageQuickly(opp, 'Lost')}
                                className="px-1.5 py-0.5 text-[10px] bg-rose-50 text-rose-700 hover:bg-rose-100 rounded font-semibold flex items-center gap-0.5"
                                title="Mark Closed Lost"
                              >
                                <XCircle className="w-2.5 h-2.5" /> Lost
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Opportunity</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Deal Amount</th>
                  <th className="py-3 px-4">Probability</th>
                  <th className="py-3 px-4">Weighted Pipeline</th>
                  <th className="py-3 px-4">Close Date</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {opportunities.map(opp => (
                  <tr key={opp.opportunityId} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {opp.opportunityName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{opp.customerName}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {opp.stage}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      ${opp.amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{opp.probability}%</td>
                    <td className="py-3.5 px-4 text-emerald-700 font-semibold">
                      ${Math.round((opp.amount * opp.probability) / 100).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">{opp.expectedCloseDate}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">{opp.assignedToName}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(opp)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOpp(opp);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE OPPORTUNITY MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Create New Opportunity</h2>
                <p className="text-xs text-slate-500">Record deal pipeline parameters with business validation.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOpportunity} className="p-5 space-y-4">
              {serverError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              {/* Deal Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Opportunity Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.opportunityName}
                  onChange={e => setFormData({ ...formData, opportunityName: e.target.value })}
                  placeholder="e.g. Acme Enterprise ERP License"
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden ${
                    formErrors.opportunityName ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                  }`}
                />
                {formErrors.opportunityName && (
                  <p className="text-xs text-rose-600 mt-1">{formErrors.opportunityName}</p>
                )}
              </div>

              {/* Associated Customer */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Associated Customer <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.customerId}
                  onChange={e => setFormData({ ...formData, customerId: e.target.value })}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden bg-white ${
                    formErrors.customerId ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                  }`}
                >
                  <option value="">Select a customer...</option>
                  {customers.map(c => (
                    <option key={c.customerId} value={c.customerId}>
                      {c.customerName} ({c.customerCode})
                    </option>
                  ))}
                </select>
                {formErrors.customerId && (
                  <p className="text-xs text-rose-600 mt-1">{formErrors.customerId}</p>
                )}
              </div>

              {/* Amount & Probability (CRITICAL Section 5.3 & 5.4 validation) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount ($) <span className="text-rose-500">* (Must be &gt; 0)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="50000"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden ${
                      formErrors.amount ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                    }`}
                  />
                  {formErrors.amount && <p className="text-xs text-rose-600 mt-1">{formErrors.amount}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Probability (%) <span className="text-rose-500">* (0 - 100)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={e => setFormData({ ...formData, probability: e.target.value })}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden ${
                      formErrors.probability ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                    }`}
                  />
                  {formErrors.probability && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.probability}</p>
                  )}
                </div>
              </div>

              {/* Stage & Close Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pipeline Stage</label>
                  <select
                    value={formData.stage}
                    onChange={e => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                  >
                    {STAGES.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expected Close Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.expectedCloseDate}
                    onChange={e => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden ${
                      formErrors.expectedCloseDate ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                    }`}
                  />
                  {formErrors.expectedCloseDate && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.expectedCloseDate}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes & Scope</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Key deal drivers, decision criteria, next steps..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Create Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT OPPORTUNITY MODAL */}
      {showEditModal && selectedOpp && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit Opportunity</h2>
                <p className="text-xs text-slate-500">Update amount, probability, close date, or stage.</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateOpportunity} className="p-5 space-y-4">
              {serverError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {serverError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opportunity Title</label>
                <input
                  type="text"
                  value={formData.opportunityName}
                  onChange={e => setFormData({ ...formData, opportunityName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount ($) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden ${
                      formErrors.amount ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                    }`}
                  />
                  {formErrors.amount && <p className="text-xs text-rose-600 mt-1">{formErrors.amount}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Probability (%) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={e => setFormData({ ...formData, probability: e.target.value })}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden ${
                      formErrors.probability ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                    }`}
                  />
                  {formErrors.probability && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.probability}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stage</label>
                  <select
                    value={formData.stage}
                    onChange={e => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                  >
                    {STAGES.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Close Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.expectedCloseDate}
                    onChange={e => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden ${
                      formErrors.expectedCloseDate ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                    }`}
                  />
                  {formErrors.expectedCloseDate && (
                    <p className="text-xs text-rose-600 mt-1">{formErrors.expectedCloseDate}</p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Save Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {showDeleteModal && selectedOpp && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Delete Opportunity</h2>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <strong className="text-slate-900">{selectedOpp.opportunityName}</strong>?
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOpportunity}
                className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg"
              >
                Delete Opportunity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
