import { Router, Response } from 'express';
import { dbManager } from '../db.ts';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.ts';

const router = Router();

// GET /api/reports/pipeline (Mandatory REST API endpoint per Section 10 & 17.14)
router.get('/pipeline', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;

  let opportunities = db.opportunities;
  if (user.roleName === 'SalesExecutive') {
    opportunities = opportunities.filter(o => o.assignedTo === user.userId);
  }

  // Stage-wise pipeline
  const stages = ['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'];
  const stageBreakdown = stages.map(stage => {
    const oppsInStage = opportunities.filter(o => o.stage === stage);
    const count = oppsInStage.length;
    const totalAmount = oppsInStage.reduce((sum, o) => sum + o.amount, 0);
    const weightedAmount = oppsInStage.reduce((sum, o) => sum + (o.amount * o.probability) / 100, 0);
    return {
      stage,
      count,
      totalAmount,
      weightedAmount,
    };
  });

  // Owner-wise pipeline
  const users = db.users.filter(u => u.roleName === 'SalesExecutive' || u.roleName === 'Manager');
  const ownerBreakdown = users.map(u => {
    const userOpps = opportunities.filter(o => o.assignedTo === u.userId);
    const openOpps = userOpps.filter(o => o.status === 'Open');
    const wonOpps = userOpps.filter(o => o.status === 'Won');
    return {
      userId: u.userId,
      userName: u.name,
      totalOpportunities: userOpps.length,
      openAmount: openOpps.reduce((sum, o) => sum + o.amount, 0),
      wonAmount: wonOpps.reduce((sum, o) => sum + o.amount, 0),
      weightedAmount: openOpps.reduce((sum, o) => sum + (o.amount * o.probability) / 100, 0),
    };
  });

  const totalOpenAmount = opportunities.filter(o => o.status === 'Open').reduce((sum, o) => sum + o.amount, 0);
  const totalWeightedAmount = opportunities.filter(o => o.status === 'Open').reduce((sum, o) => sum + (o.amount * o.probability) / 100, 0);
  const totalWonAmount = opportunities.filter(o => o.status === 'Won').reduce((sum, o) => sum + o.amount, 0);

  return res.status(200).json({
    success: true,
    userScope: user.roleName,
    summary: {
      totalOpenAmount,
      totalWeightedAmount,
      totalWonAmount,
      totalOpportunitiesCount: opportunities.length,
    },
    stageBreakdown,
    ownerBreakdown,
  });
});

// GET /api/reports/customers
router.get('/customers', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  let customers = db.customers;

  if (user.roleName === 'SalesExecutive') {
    customers = customers.filter(c => c.createdBy === user.userId);
  }

  const data = customers.map(c => {
    const owner = db.users.find(u => u.userId === c.createdBy);
    return {
      customerId: c.customerId,
      customerCode: c.customerCode,
      customerName: c.customerName,
      email: c.email,
      phone: c.phone,
      company: c.companyName,
      status: c.status,
      owner: owner ? owner.name : 'Unknown',
      createdDate: c.createdDate,
    };
  });

  return res.status(200).json({ success: true, count: data.length, data });
});

// GET /api/reports/leads
router.get('/leads', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  let leads = db.leads;

  if (user.roleName === 'SalesExecutive') {
    leads = leads.filter(l => l.assignedTo === user.userId);
  }

  const data = leads.map(l => {
    const owner = db.users.find(u => u.userId === l.assignedTo);
    return {
      leadId: l.leadId,
      leadCode: l.leadCode,
      leadName: l.leadName,
      email: l.email,
      company: l.companyName,
      source: l.source,
      status: l.status,
      expectedValue: l.expectedValue,
      owner: owner ? owner.name : 'Unassigned',
      isConverted: l.status === 'Converted',
      convertedCustomerId: l.convertedCustomerId || null,
      createdDate: l.createdDate,
    };
  });

  return res.status(200).json({ success: true, count: data.length, data });
});

// GET /api/reports/followups
router.get('/followups', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  let followUps = db.followUps;

  if (user.roleName === 'SalesExecutive') {
    followUps = followUps.filter(f => f.assignedTo === user.userId);
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const data = followUps.map(f => {
    const owner = db.users.find(u => u.userId === f.assignedTo);
    return {
      followUpId: f.followUpId,
      subject: f.subject,
      followUpDate: f.followUpDate,
      type: f.followUpType,
      status: f.status,
      owner: owner ? owner.name : 'Unassigned',
      isOverdue: f.status === 'Planned' && f.followUpDate < todayStr,
      remarks: f.remarks,
    };
  });

  return res.status(200).json({ success: true, count: data.length, data });
});

// GET /api/reports/conversions
router.get('/conversions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  let leads = db.leads;
  let opps = db.opportunities;

  if (user.roleName === 'SalesExecutive') {
    leads = leads.filter(l => l.assignedTo === user.userId);
    opps = opps.filter(o => o.assignedTo === user.userId);
  }

  const totalLeads = leads.length;
  const convertedLeads = leads.filter(l => l.status === 'Converted').length;
  const leadConversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0';

  const totalOpps = opps.length;
  const wonOpps = opps.filter(o => o.status === 'Won').length;
  const lostOpps = opps.filter(o => o.status === 'Lost').length;
  const winRate = totalOpps > 0 ? ((wonOpps / totalOpps) * 100).toFixed(1) : '0';

  return res.status(200).json({
    success: true,
    data: {
      totalLeads,
      convertedLeads,
      unconvertedLeads: totalLeads - convertedLeads,
      leadConversionRate: `${leadConversionRate}%`,
      totalOpportunities: totalOpps,
      wonOpportunities: wonOpps,
      lostOpportunities: lostOpps,
      winRate: `${winRate}%`,
    },
  });
});

// GET /api/reports/user-activities (Admin/Manager only)
router.get('/user-activities', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;

  if (user.roleName === 'SalesExecutive') {
    return res.status(403).json({ success: false, message: 'Forbidden. Sales Executives cannot access user activity reports.' });
  }

  const userStats = db.users.map(u => {
    const activityCount = db.activities.filter(a => a.assignedTo === u.userId).length;
    const followUpCount = db.followUps.filter(f => f.assignedTo === u.userId).length;
    const leadCount = db.leads.filter(l => l.assignedTo === u.userId).length;
    const oppCount = db.opportunities.filter(o => o.assignedTo === u.userId).length;
    const wonCount = db.opportunities.filter(o => o.assignedTo === u.userId && o.status === 'Won').length;

    return {
      userId: u.userId,
      userName: u.name,
      role: u.roleName,
      activitiesLogged: activityCount,
      followUpsScheduled: followUpCount,
      leadsAssigned: leadCount,
      opportunitiesOwned: oppCount,
      dealsWon: wonCount,
    };
  });

  return res.status(200).json({ success: true, data: userStats });
});

export default router;
