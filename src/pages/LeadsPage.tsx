import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { LeadDto } from '../types/crm.ts';
import {
  UserPlus,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  ArrowRight,
  TrendingUp,
  Mail,
  Phone,
  Building,
  UserCheck,
} from 'lucide-react';

export const LeadsPage: React.FC = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<LeadDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedLead, setSelectedLead] = useState<LeadDto | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    leadName: '',
    email: '',
    phone: '',
    companyName: '',
    source: 'Website',
    status: 'New',
    priority: 'Medium',
    expectedValue: '0',
    assignedTo: '',
  });

  // Convert Form State (Lead-to-Customer / Opportunity Workflow)
  const [convertData, setConvertData] = useState({
    opportunityName: '',
    amount: '',
    closeDate: '',
    stage: 'Proposal',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('acxiom_token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'All') params.append('status', statusFilter);

      const res = await fetch(`/api/leads?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setLeads(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [searchTerm, statusFilter, user?.roleName]);

  const validateLeadForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.leadName.trim()) {
      errors.leadName = 'Lead Name is required.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Enter a valid email address.';
      }
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required.';
    } else {
      const cleanPhone = formData.phone.replace(/[\s\-\(\)\+]/g, '');
      if (!/^\d{10,15}$/.test(cleanPhone)) {
        errors.phone = 'Enter a valid phone number (min 10 digits).';
      }
    }

    const val = Number(formData.expectedValue);
    if (isNaN(val) || val < 0) {
      errors.expectedValue = 'Expected value must be a non-negative number.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateLeadForm()) return;

    try {
      const token = localStorage.getItem('acxiom_token');
      const res = await fetch('/api/leads', {
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
        setActionSuccess(`Lead "${data.data.leadName}" (${data.data.leadCode}) created successfully.`);
        fetchLeads();
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        if (data.errors) setFormErrors(data.errors);
        setServerError(data.message || 'Failed to create lead');
      }
    } catch (err: any) {
      setServerError(err.message || 'Network error occurred');
    }
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setServerError(null);

    if (!validateLeadForm()) return;

    try {
      const token = localStorage.getItem('acxiom_token');
      const res = await fetch(`/api/leads/${selectedLead.leadId}`, {
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
        setActionSuccess(`Lead "${data.data.leadName}" updated successfully.`);
        fetchLeads();
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        if (data.errors) setFormErrors(data.errors);
        setServerError(data.message || 'Failed to update lead');
      }
    } catch (err: any) {
      setServerError(err.message || 'Network error');
    }
  };

  // Convert Lead Workflow (Section 8 & 17.2)
  const handleConvertLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setServerError(null);

    try {
      const token = localStorage.getItem('acxiom_token');
      const res = await fetch(`/api/leads/${selectedLead.leadId}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(convertData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowConvertModal(false);
        setActionSuccess(`Lead "${selectedLead.leadName}" successfully converted into Customer and Opportunity!`);
        fetchLeads();
        setTimeout(() => setActionSuccess(null), 5000);
      } else {
        setServerError(data.message || 'Lead conversion failed');
      }
    } catch (err: any) {
      setServerError(err.message || 'Network error during conversion');
    }
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) return;
    try {
      const token = localStorage.getItem('acxiom_token');
      const res = await fetch(`/api/leads/${selectedLead.leadId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        setShowDeleteModal(false);
        setActionSuccess(`Lead "${selectedLead.leadName}" deleted.`);
        fetchLeads();
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        const data = await res.json();
        setServerError(data.message || 'Failed to delete lead');
      }
    } catch (err: any) {
      setServerError(err.message || 'Network error');
    }
  };

  const openConvert = (lead: LeadDto) => {
    setSelectedLead(lead);
    setConvertData({
      opportunityName: `${lead.companyName || lead.leadName} Expansion`,
      amount: String(lead.expectedValue || 25000),
      closeDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      stage: 'Proposal',
    });
    setServerError(null);
    setShowConvertModal(true);
  };

  const openEdit = (lead: LeadDto) => {
    setSelectedLead(lead);
    setFormData({
      leadName: lead.leadName,
      email: lead.email,
      phone: lead.phone,
      companyName: lead.companyName || '',
      source: lead.source,
      status: lead.status,
      priority: lead.priority,
      expectedValue: String(lead.expectedValue),
      assignedTo: lead.assignedTo,
    });
    setFormErrors({});
    setServerError(null);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      leadName: '',
      email: '',
      phone: '',
      companyName: '',
      source: 'Website',
      status: 'New',
      priority: 'Medium',
      expectedValue: '0',
      assignedTo: '',
    });
    setFormErrors({});
    setServerError(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Contacted':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Qualified':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Converted':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Lost':
      case 'Unqualified':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-blue-600" />
            Lead Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Capture prospective buyers, qualify pipeline leads, assign representatives, and convert to accounts.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Capture Lead
        </button>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Lead Name, Company, Status..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="All">All Statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Converted">Converted</option>
            <option value="Lost">Lost</option>
            <option value="Unqualified">Unqualified</option>
          </select>
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            Showing {leads.length} leads
          </span>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Lead Name</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Est. Value</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading prospective leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No leads found matching criteria.
                  </td>
                </tr>
              ) : (
                leads.map(lead => (
                  <tr key={lead.leadId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-blue-700">
                      {lead.leadCode}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block">{lead.leadName}</span>
                      <span className="text-xs text-slate-500">{lead.email}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {lead.companyName || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {lead.source}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      ${Number(lead.expectedValue).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {lead.assignedToName || 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadge(
                          lead.status
                        )}`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {lead.status !== 'Converted' && (
                          <button
                            onClick={() => openConvert(lead)}
                            className="px-2 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md transition-colors flex items-center gap-1"
                            title="Convert Lead to Customer & Opportunity"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Convert
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(lead)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                          title="Edit Lead"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE LEAD MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Capture New Lead</h2>
                <p className="text-xs text-slate-500">Record prospect information and preliminary deal size.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-5 space-y-4">
              {serverError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lead / Contact Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.leadName}
                  onChange={e => setFormData({ ...formData, leadName: e.target.value })}
                  placeholder="e.g. Johnathan Vance"
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden ${
                    formErrors.leadName ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                  }`}
                />
                {formErrors.leadName && <p className="text-xs text-rose-600 mt-1">{formErrors.leadName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g. Sterling Logistics Inc"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="prospect@company.com"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden ${
                      formErrors.email ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                    }`}
                  />
                  {formErrors.email && <p className="text-xs text-rose-600 mt-1">{formErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="10-digit number"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-hidden ${
                      formErrors.phone ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                    }`}
                  />
                  {formErrors.phone && <p className="text-xs text-rose-600 mt-1">{formErrors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Source</label>
                  <select
                    value={formData.source}
                    onChange={e => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                  >
                    <option value="Website">Website</option>
                    <option value="Referral">Referral</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Partner">Partner</option>
                    <option value="Email Campaign">Email Campaign</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Unqualified">Unqualified</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Est. Value ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.expectedValue}
                    onChange={e => setFormData({ ...formData, expectedValue: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden"
                  />
                </div>
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
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAD-TO-CUSTOMER CONVERSION MODAL (Section 8 Workflow) */}
      {showConvertModal && selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Convert Lead to Customer & Opportunity
                </h2>
                <p className="text-xs text-slate-500">
                  Qualify lead <strong className="text-slate-700">{selectedLead.leadName}</strong> into an active account.
                </p>
              </div>
            </div>

            {serverError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {serverError}
              </div>
            )}

            <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-xs text-blue-900 space-y-1">
              <p className="font-semibold">Conversion Workflow Automation:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-blue-800">
                <li>A master Customer account will be registered.</li>
                <li>An active Sales Opportunity will be attached to the pipeline.</li>
                <li>Lead status will be marked as "Converted" and logged in the Audit Trail.</li>
              </ul>
            </div>

            <form onSubmit={handleConvertLead} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sales Opportunity Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={convertData.opportunityName}
                  onChange={e => setConvertData({ ...convertData, opportunityName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deal Amount ($) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={convertData.amount}
                    onChange={e => setConvertData({ ...convertData, amount: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expected Close Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={convertData.closeDate}
                    onChange={e => setConvertData({ ...convertData, closeDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  Execute Conversion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT LEAD MODAL */}
      {showEditModal && selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit Lead: {selectedLead.leadCode}</h2>
                <p className="text-xs text-slate-500">Update status, contact details, or assignment.</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateLead} className="p-5 space-y-4">
              {serverError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {serverError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Name</label>
                <input
                  type="text"
                  value={formData.leadName}
                  onChange={e => setFormData({ ...formData, leadName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Unqualified">Unqualified</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Est. Value ($)</label>
                  <input
                    type="number"
                    value={formData.expectedValue}
                    onChange={e => setFormData({ ...formData, expectedValue: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden"
                  />
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
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {showDeleteModal && selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Delete Lead Record</h2>
            <p className="text-sm text-slate-600">
              Are you sure you want to remove lead{' '}
              <strong className="text-slate-900">{selectedLead.leadName}</strong> ({selectedLead.leadCode})?
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLead}
                className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg"
              >
                Delete Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
