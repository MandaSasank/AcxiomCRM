import { Router, Response } from 'express';
import crypto from 'crypto';
import { dbManager, Opportunity } from '../db.ts';
import { AuditService } from '../services/auditService.ts';
import { ValidationService } from '../services/validationService.ts';
import { AuthenticatedRequest, requireAuth, isRecordAccessible } from '../middleware/authMiddleware.ts';

const router = Router();

// GET /api/opportunities
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { search, stage, status, customerId, assignedTo, page = '1', limit = '50' } = req.query;

  let opportunities = db.opportunities;

  // Role Scope: SalesExecutive only gets assigned opportunities
  if (user.roleName === 'SalesExecutive') {
    opportunities = opportunities.filter(o => o.assignedTo === user.userId);
  } else if (assignedTo && typeof assignedTo === 'string') {
    opportunities = opportunities.filter(o => o.assignedTo === assignedTo);
  }

  if (customerId && typeof customerId === 'string') {
    opportunities = opportunities.filter(o => o.customerId === customerId);
  }

  if (stage && typeof stage === 'string' && stage !== 'All') {
    opportunities = opportunities.filter(o => o.stage === stage);
  }

  if (status && typeof status === 'string' && status !== 'All') {
    opportunities = opportunities.filter(o => o.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    opportunities = opportunities.filter(
      o =>
        o.opportunityName.toLowerCase().includes(q) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        o.stage.toLowerCase().includes(q)
    );
  }

  // Calculate weighted pipeline & attach names
  const enriched = opportunities.map(o => {
    const cust = db.customers.find(c => c.customerId === o.customerId);
    const assignee = db.users.find(u => u.userId === o.assignedTo);
    const weightedPipeline = (o.amount * o.probability) / 100;
    return {
      ...o,
      customerName: cust ? cust.customerName : o.customerName || 'Unknown',
      assignedToName: assignee ? assignee.name : o.assignedToName || 'Unassigned',
      weightedPipeline,
    };
  });

  const pageNum = parseInt(page as string, 10) || 1;
  const pageSize = parseInt(limit as string, 10) || 50;
  const total = enriched.length;
  const paged = enriched.slice((pageNum - 1) * pageSize, pageNum * pageSize);

  return res.status(200).json({
    success: true,
    total,
    page: pageNum,
    pageSize,
    data: paged,
  });
});

// GET /api/opportunities/:id
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { id } = req.params;

  const opportunity = db.opportunities.find(o => o.opportunityId === id);
  if (!opportunity) {
    return res.status(404).json({ success: false, message: 'Opportunity not found.' });
  }

  if (!isRecordAccessible(user, opportunity.assignedTo)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to view this opportunity.',
    });
  }

  const cust = db.customers.find(c => c.customerId === opportunity.customerId);
  const assignee = db.users.find(u => u.userId === opportunity.assignedTo);
  const relatedFollowUps = db.followUps.filter(f => f.opportunityId === opportunity.opportunityId);

  return res.status(200).json({
    success: true,
    data: {
      ...opportunity,
      customerName: cust ? cust.customerName : opportunity.customerName,
      assignedToName: assignee ? assignee.name : opportunity.assignedToName,
      weightedPipeline: (opportunity.amount * opportunity.probability) / 100,
      followUps: relatedFollowUps,
    },
  });
});

// POST /api/opportunities
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const body = req.body;

  // Server-Side Business Validation
  const validation = ValidationService.validateOpportunity(body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: validation.errors,
    });
  }

  const targetCustomer = db.customers.find(c => c.customerId === body.customerId);
  if (!targetCustomer) {
    return res.status(400).json({
      success: false,
      message: 'Referenced Customer does not exist.',
      errors: { customerId: 'Invalid customer selected.' },
    });
  }

  const assignedToId = (user.roleName !== 'SalesExecutive' && body.assignedTo) ? body.assignedTo : user.userId;
  const assigneeUser = db.users.find(u => u.userId === assignedToId);

  const stage = body.stage || 'Qualification';
  let status: 'Open' | 'Won' | 'Lost' = 'Open';
  if (stage === 'Won') status = 'Won';
  else if (stage === 'Lost') status = 'Lost';

  const newOpportunity: Opportunity = {
    opportunityId: 'opp-' + crypto.randomUUID().slice(0, 8),
    opportunityName: body.opportunityName.trim(),
    customerId: body.customerId,
    customerName: targetCustomer.customerName,
    leadId: body.leadId || undefined,
    amount: Number(body.amount),
    stage,
    probability: Number(body.probability),
    expectedCloseDate: body.expectedCloseDate,
    status,
    createdDate: new Date().toISOString(),
    assignedTo: assignedToId,
    assignedToName: assigneeUser ? assigneeUser.name : user.name,
    notes: body.notes ? body.notes.trim() : '',
  };

  db.opportunities.unshift(newOpportunity);
  dbManager.commit();

  AuditService.log({
    userId: user.userId,
    userName: user.name,
    action: 'Create',
    entityName: 'Opportunity',
    recordId: newOpportunity.opportunityId,
    newValue: newOpportunity,
    result: 'Success',
    details: `Opportunity created: ${newOpportunity.opportunityName} with value $${newOpportunity.amount.toLocaleString()} and stage ${newOpportunity.stage}`,
  });

  return res.status(201).json({
    success: true,
    message: 'Opportunity created successfully.',
    data: newOpportunity,
  });
});

// PUT /api/opportunities/:id
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { id } = req.params;
  const body = req.body;

  const opportunity = db.opportunities.find(o => o.opportunityId === id);
  if (!opportunity) {
    return res.status(404).json({ success: false, message: 'Opportunity not found.' });
  }

  if (!isRecordAccessible(user, opportunity.assignedTo)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to modify this opportunity.',
    });
  }

  const isChangingToClosed = body.stage === 'Won' || body.stage === 'Lost';
  const validation = ValidationService.validateOpportunity(body, !isChangingToClosed);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: validation.errors,
    });
  }

  const oldSnapshot = { ...opportunity };

  opportunity.opportunityName = body.opportunityName.trim();
  if (body.customerId) {
    opportunity.customerId = body.customerId;
    const cust = db.customers.find(c => c.customerId === body.customerId);
    if (cust) opportunity.customerName = cust.customerName;
  }
  opportunity.amount = Number(body.amount);
  opportunity.stage = body.stage || opportunity.stage;
  opportunity.probability = Number(body.probability);
  opportunity.expectedCloseDate = body.expectedCloseDate;
  opportunity.notes = body.notes !== undefined ? body.notes : opportunity.notes;

  if (opportunity.stage === 'Won') {
    opportunity.status = 'Won';
    opportunity.probability = 100;
  } else if (opportunity.stage === 'Lost') {
    opportunity.status = 'Lost';
    opportunity.probability = 0;
  } else {
    opportunity.status = 'Open';
  }

  if ((user.roleName === 'Admin' || user.roleName === 'Manager') && body.assignedTo) {
    opportunity.assignedTo = body.assignedTo;
    const assigneeUser = db.users.find(u => u.userId === body.assignedTo);
    if (assigneeUser) opportunity.assignedToName = assigneeUser.name;
  }

  dbManager.commit();

  AuditService.log({
    userId: user.userId,
    userName: user.name,
    action: 'Update',
    entityName: 'Opportunity',
    recordId: opportunity.opportunityId,
    oldValue: oldSnapshot,
    newValue: opportunity,
    result: 'Success',
    details: `Opportunity updated: ${opportunity.opportunityName} (Stage: ${opportunity.stage}, Status: ${opportunity.status})`,
  });

  return res.status(200).json({
    success: true,
    message: 'Opportunity updated successfully.',
    data: opportunity,
  });
});

// DELETE /api/opportunities/:id
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { id } = req.params;

  const index = db.opportunities.findIndex(o => o.opportunityId === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Opportunity not found.' });
  }

  const opportunity = db.opportunities[index];
  if (!isRecordAccessible(user, opportunity.assignedTo)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to delete this opportunity.',
    });
  }

  const oldSnapshot = { ...opportunity };
  db.opportunities.splice(index, 1);
  dbManager.commit();

  AuditService.log({
    userId: user.userId,
    userName: user.name,
    action: 'Delete',
    entityName: 'Opportunity',
    recordId: id,
    oldValue: oldSnapshot,
    result: 'Success',
    details: `Opportunity deleted: ${opportunity.opportunityName}`,
  });

  return res.status(200).json({ success: true, message: 'Opportunity deleted successfully.' });
});

export default router;
