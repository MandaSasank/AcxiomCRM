import { Router, Response } from 'express';
import crypto from 'crypto';
import { dbManager, Activity } from '../db.ts';
import { AuditService } from '../services/auditService.ts';
import { AuthenticatedRequest, requireAuth, isRecordAccessible } from '../middleware/authMiddleware.ts';

const router = Router();

// GET /api/activities
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { type, status, customerId, leadId, assignedTo, page = '1', limit = '50' } = req.query;

  let activities = db.activities;

  if (user.roleName === 'SalesExecutive') {
    activities = activities.filter(a => a.assignedTo === user.userId);
  } else if (assignedTo && typeof assignedTo === 'string') {
    activities = activities.filter(a => a.assignedTo === assignedTo);
  }

  if (type && typeof type === 'string' && type !== 'All') {
    activities = activities.filter(a => a.activityType === type);
  }

  if (status && typeof status === 'string' && status !== 'All') {
    activities = activities.filter(a => a.status === status);
  }

  if (customerId && typeof customerId === 'string') {
    activities = activities.filter(a => a.customerId === customerId);
  }

  if (leadId && typeof leadId === 'string') {
    activities = activities.filter(a => a.leadId === leadId);
  }

  // Sort by activityDate desc
  activities.sort((a, b) => (a.activityDate < b.activityDate ? 1 : -1));

  const enriched = activities.map(a => {
    const cust = a.customerId ? db.customers.find(c => c.customerId === a.customerId) : null;
    const lead = a.leadId ? db.leads.find(l => l.leadId === a.leadId) : null;
    const assignee = db.users.find(u => u.userId === a.assignedTo);
    return {
      ...a,
      customerName: cust ? cust.customerName : a.customerName,
      leadName: lead ? lead.leadName : a.leadName,
      assignedToName: assignee ? assignee.name : a.assignedToName || 'Unassigned',
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

// POST /api/activities
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const body = req.body;

  if (!body.subject || !body.subject.trim()) {
    return res.status(400).json({ success: false, message: 'Activity subject is required.' });
  }

  const validTypes = ['Call', 'Meeting', 'Email', 'Task'];
  const type = validTypes.includes(body.activityType) ? body.activityType : 'Call';

  const cust = body.customerId ? db.customers.find(c => c.customerId === body.customerId) : null;
  const lead = body.leadId ? db.leads.find(l => l.leadId === body.leadId) : null;

  const assignedToId = (user.roleName !== 'SalesExecutive' && body.assignedTo) ? body.assignedTo : user.userId;
  const assigneeUser = db.users.find(u => u.userId === assignedToId);

  const newActivity: Activity = {
    activityId: 'act-' + crypto.randomUUID().slice(0, 8),
    activityType: type,
    subject: body.subject.trim(),
    description: (body.description || '').trim(),
    activityDate: body.activityDate || new Date().toISOString(),
    customerId: body.customerId || undefined,
    customerName: cust ? cust.customerName : undefined,
    leadId: body.leadId || undefined,
    leadName: lead ? lead.leadName : undefined,
    assignedTo: assignedToId,
    assignedToName: assigneeUser ? assigneeUser.name : user.name,
    status: body.status || 'Completed',
  };

  db.activities.unshift(newActivity);
  dbManager.commit();

  AuditService.log({
    userId: user.userId,
    userName: user.name,
    action: 'Create',
    entityName: 'Activity',
    recordId: newActivity.activityId,
    newValue: newActivity,
    result: 'Success',
    details: `Activity logged: ${newActivity.activityType} - "${newActivity.subject}"`,
  });

  return res.status(201).json({
    success: true,
    message: 'Activity logged successfully.',
    data: newActivity,
  });
});

// PUT /api/activities/:id
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { id } = req.params;
  const body = req.body;

  const activity = db.activities.find(a => a.activityId === id);
  if (!activity) {
    return res.status(404).json({ success: false, message: 'Activity not found.' });
  }

  if (!isRecordAccessible(user, activity.assignedTo)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to modify this activity.',
    });
  }

  if (body.subject) activity.subject = body.subject.trim();
  if (body.description !== undefined) activity.description = body.description.trim();
  if (body.activityDate) activity.activityDate = body.activityDate;
  if (body.activityType) activity.activityType = body.activityType;
  if (body.status) activity.status = body.status;

  dbManager.commit();

  return res.status(200).json({ success: true, data: activity });
});

// DELETE /api/activities/:id
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { id } = req.params;

  const index = db.activities.findIndex(a => a.activityId === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Activity not found.' });
  }

  const activity = db.activities[index];
  if (!isRecordAccessible(user, activity.assignedTo)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to delete this activity.',
    });
  }

  db.activities.splice(index, 1);
  dbManager.commit();

  return res.status(200).json({ success: true, message: 'Activity deleted successfully.' });
});

export default router;
