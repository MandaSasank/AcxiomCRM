import { Router, Response } from 'express';
import crypto from 'crypto';
import { dbManager, FollowUp } from '../db.ts';
import { AuditService } from '../services/auditService.ts';
import { ValidationService } from '../services/validationService.ts';
import { AuthenticatedRequest, requireAuth, isRecordAccessible } from '../middleware/authMiddleware.ts';

const router = Router();

// GET /api/followups
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { status, type, filter, customerId, leadId, assignedTo, page = '1', limit = '50' } = req.query;

  let followUps = db.followUps;

  // Role scope
  if (user.roleName === 'SalesExecutive') {
    followUps = followUps.filter(f => f.assignedTo === user.userId);
  } else if (assignedTo && typeof assignedTo === 'string') {
    followUps = followUps.filter(f => f.assignedTo === assignedTo);
  }

  if (customerId && typeof customerId === 'string') {
    followUps = followUps.filter(f => f.customerId === customerId);
  }

  if (leadId && typeof leadId === 'string') {
    followUps = followUps.filter(f => f.leadId === leadId);
  }

  if (status && typeof status === 'string' && status !== 'All') {
    followUps = followUps.filter(f => f.status === status);
  }

  if (type && typeof type === 'string' && type !== 'All') {
    followUps = followUps.filter(f => f.followUpType === type);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Upcoming vs Overdue filters
  if (filter === 'upcoming') {
    followUps = followUps.filter(f => f.status === 'Planned' && f.followUpDate >= todayStr);
  } else if (filter === 'overdue') {
    followUps = followUps.filter(f => f.status === 'Planned' && f.followUpDate < todayStr);
  } else if (filter === 'today') {
    followUps = followUps.filter(f => f.followUpDate === todayStr);
  }

  // Sort by date ascending (soonest first)
  followUps.sort((a, b) => (a.followUpDate > b.followUpDate ? 1 : -1));

  // Enforce attached names
  const enriched = followUps.map(f => {
    const cust = f.customerId ? db.customers.find(c => c.customerId === f.customerId) : null;
    const lead = f.leadId ? db.leads.find(l => l.leadId === f.leadId) : null;
    const opp = f.opportunityId ? db.opportunities.find(o => o.opportunityId === f.opportunityId) : null;
    const assignee = db.users.find(u => u.userId === f.assignedTo);

    return {
      ...f,
      customerName: cust ? cust.customerName : f.customerName,
      leadName: lead ? lead.leadName : f.leadName,
      opportunityName: opp ? opp.opportunityName : f.opportunityName,
      assignedToName: assignee ? assignee.name : f.assignedToName || 'Unassigned',
      isOverdue: f.status === 'Planned' && f.followUpDate < todayStr,
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

// GET /api/followups/:id
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { id } = req.params;

  const followUp = db.followUps.find(f => f.followUpId === id);
  if (!followUp) {
    return res.status(404).json({ success: false, message: 'Follow-up not found.' });
  }

  if (!isRecordAccessible(user, followUp.assignedTo)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to view this follow-up.',
    });
  }

  return res.status(200).json({ success: true, data: followUp });
});

// POST /api/followups
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const body = req.body;

  // Server-Side Business Validation
  const validation = ValidationService.validateFollowUp(body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: validation.errors,
    });
  }

  const assignedToId = (user.roleName !== 'SalesExecutive' && body.assignedTo) ? body.assignedTo : user.userId;
  const assigneeUser = db.users.find(u => u.userId === assignedToId);

  const cust = body.customerId ? db.customers.find(c => c.customerId === body.customerId) : null;
  const lead = body.leadId ? db.leads.find(l => l.leadId === body.leadId) : null;
  const opp = body.opportunityId ? db.opportunities.find(o => o.opportunityId === body.opportunityId) : null;

  const newFollowUp: FollowUp = {
    followUpId: 'flw-' + crypto.randomUUID().slice(0, 8),
    customerId: body.customerId || undefined,
    customerName: cust ? cust.customerName : undefined,
    leadId: body.leadId || undefined,
    leadName: lead ? lead.leadName : undefined,
    opportunityId: body.opportunityId || undefined,
    opportunityName: opp ? opp.opportunityName : undefined,
    followUpDate: body.followUpDate,
    followUpType: body.followUpType || 'Call',
    subject: body.subject.trim(),
    remarks: (body.remarks || '').trim(),
    status: body.status || 'Planned',
    assignedTo: assignedToId,
    assignedToName: assigneeUser ? assigneeUser.name : user.name,
    notes: (body.notes || '').trim(),
  };

  db.followUps.unshift(newFollowUp);
  dbManager.commit();

  AuditService.log({
    userId: user.userId,
    userName: user.name,
    action: 'Create',
    entityName: 'FollowUp',
    recordId: newFollowUp.followUpId,
    newValue: newFollowUp,
    result: 'Success',
    details: `Follow-up scheduled: "${newFollowUp.subject}" for ${newFollowUp.followUpDate} (${newFollowUp.followUpType})`,
  });

  return res.status(201).json({
    success: true,
    message: 'Follow-up scheduled successfully.',
    data: newFollowUp,
  });
});

// PUT /api/followups/:id
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { id } = req.params;
  const body = req.body;

  const followUp = db.followUps.find(f => f.followUpId === id);
  if (!followUp) {
    return res.status(404).json({ success: false, message: 'Follow-up not found.' });
  }

  if (!isRecordAccessible(user, followUp.assignedTo)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to modify this follow-up.',
    });
  }

  // If rescheduling to a new planned date, check date validity
  if (body.followUpDate && body.followUpDate !== followUp.followUpDate && body.status === 'Planned') {
    const todayStr = new Date().toISOString().split('T')[0];
    if (body.followUpDate < todayStr) {
      return res.status(400).json({
        success: false,
        message: 'Follow-up date cannot be earlier than today.',
        errors: { followUpDate: 'Follow-up date cannot be earlier than today.' },
      });
    }
  }

  const oldSnapshot = { ...followUp };

  if (body.subject) followUp.subject = body.subject.trim();
  if (body.followUpDate) followUp.followUpDate = body.followUpDate;
  if (body.followUpType) followUp.followUpType = body.followUpType;
  if (body.remarks !== undefined) followUp.remarks = body.remarks.trim();
  if (body.notes !== undefined) followUp.notes = body.notes.trim();

  // Status transition tracking (Planned -> Completed / Missed / Cancelled)
  if (body.status && ['Planned', 'Completed', 'Missed', 'Cancelled'].includes(body.status)) {
    followUp.status = body.status;
    if (body.status === 'Completed' && !followUp.completedDate) {
      followUp.completedDate = new Date().toISOString();
    }
  }

  if ((user.roleName === 'Admin' || user.roleName === 'Manager') && body.assignedTo) {
    followUp.assignedTo = body.assignedTo;
    const assigneeUser = db.users.find(u => u.userId === body.assignedTo);
    if (assigneeUser) followUp.assignedToName = assigneeUser.name;
  }

  dbManager.commit();

  // Record completion / rescheduling activity in audit history
  const isRescheduled = oldSnapshot.followUpDate !== followUp.followUpDate;
  const isCompleted = oldSnapshot.status !== 'Completed' && followUp.status === 'Completed';

  AuditService.log({
    userId: user.userId,
    userName: user.name,
    action: 'Update',
    entityName: 'FollowUp',
    recordId: followUp.followUpId,
    oldValue: oldSnapshot,
    newValue: followUp,
    result: 'Success',
    details: isCompleted
      ? `Follow-up completed: "${followUp.subject}"`
      : isRescheduled
      ? `Follow-up rescheduled from ${oldSnapshot.followUpDate} to ${followUp.followUpDate}`
      : `Follow-up updated: "${followUp.subject}" (Status: ${followUp.status})`,
  });

  return res.status(200).json({
    success: true,
    message: 'Follow-up updated successfully.',
    data: followUp,
  });
});

// DELETE /api/followups/:id
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { id } = req.params;

  const index = db.followUps.findIndex(f => f.followUpId === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Follow-up not found.' });
  }

  const followUp = db.followUps[index];
  if (!isRecordAccessible(user, followUp.assignedTo)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to delete this follow-up.',
    });
  }

  const oldSnapshot = { ...followUp };
  db.followUps.splice(index, 1);
  dbManager.commit();

  AuditService.log({
    userId: user.userId,
    userName: user.name,
    action: 'Delete',
    entityName: 'FollowUp',
    recordId: id,
    oldValue: oldSnapshot,
    result: 'Success',
    details: `Follow-up deleted: ${followUp.subject}`,
  });

  return res.status(200).json({ success: true, message: 'Follow-up deleted successfully.' });
});

export default router;
