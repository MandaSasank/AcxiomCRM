import { Router, Response } from 'express';
import crypto from 'crypto';
import { dbManager, Lead, Customer, Opportunity } from '../db.ts';
import { AuditService } from '../services/auditService.ts';
import { ValidationService } from '../services/validationService.ts';
import { AuthenticatedRequest, requireAuth, isRecordAccessible } from '../middleware/authMiddleware.ts';

const router = Router();

// GET /api/leads
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { search, status, assignedTo, page = '1', limit = '50' } = req.query;

  let leads = db.leads;

  // Role Scope: SalesExecutive only sees assigned leads
  if (user.roleName === 'SalesExecutive') {
    leads = leads.filter(l => l.assignedTo === user.userId);
  } else if (assignedTo && typeof assignedTo === 'string') {
    leads = leads.filter(l => l.assignedTo === assignedTo);
  }

  if (status && typeof status === 'string' && status !== 'All') {
    leads = leads.filter(l => l.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    leads = leads.filter(
      l =>
        l.leadName.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        (l.companyName && l.companyName.toLowerCase().includes(q)) ||
        l.leadCode.toLowerCase().includes(q)
    );
  }

  leads = leads.map(l => {
    const assignee = db.users.find(u => u.userId === l.assignedTo);
    return {
      ...l,
      assignedToName: assignee ? assignee.name : l.assignedToName || 'Unassigned',
    };
  });

  const pageNum = parseInt(page as string, 10) || 1;
  const pageSize = parseInt(limit as string, 10) || 50;
  const total = leads.length;
  const paged = leads.slice((pageNum - 1) * pageSize, pageNum * pageSize);

  return res.status(200).json({
    success: true,
    total,
    page: pageNum,
    pageSize,
    data: paged,
  });
});

// GET /api/leads/:id
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { id } = req.params;

  const lead = db.leads.find(l => l.leadId === id);
  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found.' });
  }

  if (!isRecordAccessible(user, lead.assignedTo)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to view this lead.',
    });
  }

  const assignee = db.users.find(u => u.userId === lead.assignedTo);
  const relatedActivities = db.activities.filter(a => a.leadId === lead.leadId);
  const relatedFollowUps = db.followUps.filter(f => f.leadId === lead.leadId);

  return res.status(200).json({
    success: true,
    data: {
      ...lead,
      assignedToName: assignee ? assignee.name : lead.assignedToName,
      activities: relatedActivities,
      followUps: relatedFollowUps,
    },
  });
});

// POST /api/leads
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const body = req.body;

  const validation = ValidationService.validateLead(body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: validation.errors,
    });
  }

  const assignedToId = (user.roleName !== 'SalesExecutive' && body.assignedTo) ? body.assignedTo : user.userId;
  const assigneeUser = db.users.find(u => u.userId === assignedToId);

  const newCode = `LEAD-${String(db.leads.length + 201).padStart(5, '0')}`;
  const newLead: Lead = {
    leadId: 'lead-' + crypto.randomUUID().slice(0, 8),
    leadCode: newCode,
    leadName: body.leadName.trim(),
    email: body.email.trim().toLowerCase(),
    phone: body.phone.trim(),
    companyName: (body.companyName || '').trim(),
    source: body.source || 'Website',
    status: body.status || 'New',
    priority: body.priority || 'Medium',
    expectedValue: Number(body.expectedValue) || 0,
    createdDate: new Date().toISOString(),
    assignedTo: assignedToId,
    assignedToName: assigneeUser ? assigneeUser.name : user.name,
  };

  db.leads.unshift(newLead);
  dbManager.commit();

  AuditService.log({
    userId: user.userId,
    userName: user.name,
    action: 'Create',
    entityName: 'Lead',
    recordId: newLead.leadId,
    newValue: newLead,
    result: 'Success',
    details: `Lead created: ${newLead.leadName} (${newLead.leadCode}) with status ${newLead.status}`,
  });

  return res.status(201).json({
    success: true,
    message: 'Lead created successfully.',
    data: newLead,
  });
});

// PUT /api/leads/:id
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { id } = req.params;
  const body = req.body;

  const lead = db.leads.find(l => l.leadId === id);
  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found.' });
  }

  if (!isRecordAccessible(user, lead.assignedTo)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to modify this lead.',
    });
  }

  const validation = ValidationService.validateLead(body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: validation.errors,
    });
  }

  const oldSnapshot = { ...lead };

  lead.leadName = body.leadName.trim();
  lead.email = body.email.trim().toLowerCase();
  lead.phone = body.phone.trim();
  lead.companyName = (body.companyName || '').trim();
  lead.source = body.source || lead.source;
  lead.status = body.status || lead.status;
  lead.priority = body.priority || lead.priority;
  lead.expectedValue = Number(body.expectedValue) || 0;

  if ((user.roleName === 'Admin' || user.roleName === 'Manager') && body.assignedTo) {
    lead.assignedTo = body.assignedTo;
    const assigneeUser = db.users.find(u => u.userId === body.assignedTo);
    if (assigneeUser) lead.assignedToName = assigneeUser.name;
  }

  dbManager.commit();

  AuditService.log({
    userId: user.userId,
    userName: user.name,
    action: 'Update',
    entityName: 'Lead',
    recordId: lead.leadId,
    oldValue: oldSnapshot,
    newValue: lead,
    result: 'Success',
    details: `Lead updated: ${lead.leadName}`,
  });

  return res.status(200).json({
    success: true,
    message: 'Lead updated successfully.',
    data: lead,
  });
});

// DELETE /api/leads/:id
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { id } = req.params;

  const index = db.leads.findIndex(l => l.leadId === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Lead not found.' });
  }

  const lead = db.leads[index];
  if (!isRecordAccessible(user, lead.assignedTo)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to delete this lead.',
    });
  }

  const oldSnapshot = { ...lead };
  db.leads.splice(index, 1);
  dbManager.commit();

  AuditService.log({
    userId: user.userId,
    userName: user.name,
    action: 'Delete',
    entityName: 'Lead',
    recordId: id,
    oldValue: oldSnapshot,
    result: 'Success',
    details: `Lead deleted: ${lead.leadName}`,
  });

  return res.status(200).json({ success: true, message: 'Lead deleted successfully.' });
});

// POST /api/leads/:id/convert (Workflow: Lead-to-Customer & Opportunity Conversion)
router.post('/:id/convert', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { id } = req.params;
  const { opportunityName, amount, closeDate, stage = 'Proposal' } = req.body;

  const lead = db.leads.find(l => l.leadId === id);
  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found.' });
  }

  if (!isRecordAccessible(user, lead.assignedTo)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to convert this lead.',
    });
  }

  // 1. Create or Find Customer
  let customer = db.customers.find(
    c => c.email.toLowerCase() === lead.email.toLowerCase() || (lead.phone && c.phone === lead.phone)
  );

  if (!customer) {
    const newCustCode = `CUST-${String(db.customers.length + 101).padStart(5, '0')}`;
    customer = {
      customerId: 'cust-' + crypto.randomUUID().slice(0, 8),
      customerCode: newCustCode,
      customerName: lead.companyName || lead.leadName,
      email: lead.email,
      phone: lead.phone,
      companyName: lead.companyName || lead.leadName,
      address: '',
      city: '',
      state: '',
      status: 'Active',
      createdDate: new Date().toISOString(),
      createdBy: lead.assignedTo,
      createdByName: lead.assignedToName || user.name,
      modifiedDate: new Date().toISOString(),
    };
    db.customers.unshift(customer);
  }

  // 2. Optionally create Opportunity
  let newOpp: Opportunity | undefined;
  if (opportunityName && amount) {
    const oppVal = Number(amount);
    if (oppVal <= 0) {
      return res.status(400).json({ success: false, message: 'Opportunity Amount must be greater than 0.' });
    }

    const defaultCloseDate = closeDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    newOpp = {
      opportunityId: 'opp-' + crypto.randomUUID().slice(0, 8),
      opportunityName: opportunityName.trim(),
      customerId: customer.customerId,
      customerName: customer.customerName,
      leadId: lead.leadId,
      amount: oppVal,
      stage: stage || 'Proposal',
      probability: 60,
      expectedCloseDate: defaultCloseDate,
      status: 'Open',
      createdDate: new Date().toISOString(),
      assignedTo: lead.assignedTo,
      assignedToName: lead.assignedToName || user.name,
      notes: `Converted from lead ${lead.leadName} (${lead.leadCode})`,
    };
    db.opportunities.unshift(newOpp);
  }

  // 3. Update Lead Status to Converted
  lead.status = 'Converted';
  lead.convertedCustomerId = customer.customerId;
  if (newOpp) lead.convertedOpportunityId = newOpp.opportunityId;

  dbManager.commit();

  // 4. Record Conversion in Audit Log
  AuditService.log({
    userId: user.userId,
    userName: user.name,
    action: 'Update',
    entityName: 'Lead',
    recordId: lead.leadId,
    newValue: { status: 'Converted', customerId: customer.customerId, opportunityId: newOpp?.opportunityId },
    result: 'Success',
    details: `Lead ${lead.leadName} successfully converted to Customer '${customer.customerName}'${newOpp ? ` and Opportunity '${newOpp.opportunityName}'` : ''}`,
  });

  return res.status(200).json({
    success: true,
    message: 'Lead converted successfully!',
    customer,
    opportunity: newOpp,
  });
});

export default router;
