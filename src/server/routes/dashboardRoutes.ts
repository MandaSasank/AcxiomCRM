import { Router, Response } from 'express';
import { dbManager } from '../db.ts';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware.ts';

const router = Router();

// GET /api/dashboard
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { dateRange, startDate, endDate } = req.query;

  // Filter records by role
  let customers = db.customers;
  let leads = db.leads;
  let opportunities = db.opportunities;
  let followUps = db.followUps;
  let activities = db.activities;

  if (user.roleName === 'SalesExecutive') {
    customers = customers.filter(c => c.createdBy === user.userId);
    leads = leads.filter(l => l.assignedTo === user.userId);
    opportunities = opportunities.filter(o => o.assignedTo === user.userId);
    followUps = followUps.filter(f => f.assignedTo === user.userId);
    activities = activities.filter(a => a.assignedTo === user.userId);
  }

  // Date filtering logic
  const now = new Date();
  let filterStart: Date | null = null;
  let filterEnd: Date | null = null;

  if (dateRange === 'Today') {
    filterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    filterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (dateRange === 'This Week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    filterStart = new Date(now.setDate(diff));
    filterStart.setHours(0, 0, 0, 0);
    filterEnd = new Date(filterStart);
    filterEnd.setDate(filterStart.getDate() + 6);
    filterEnd.setHours(23, 59, 59, 999);
  } else if (dateRange === 'This Month') {
    filterStart = new Date(now.getFullYear(), now.getMonth(), 1);
    filterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (dateRange === 'Custom' && startDate && endDate) {
    filterStart = new Date(startDate as string);
    filterEnd = new Date(endDate as string);
    filterEnd.setHours(23, 59, 59, 999);
  }

  const applyDateFilter = (items: Array<any>, dateField: string) => {
    if (!filterStart || !filterEnd) return items;
    return items.filter(item => {
      const d = new Date(item[dateField]);
      return d >= filterStart! && d <= filterEnd!;
    });
  };

  const filteredOpportunities = applyDateFilter(opportunities, 'createdDate');
  const filteredLeads = applyDateFilter(leads, 'createdDate');
  const filteredCustomers = applyDateFilter(customers, 'createdDate');

  // KPI Calculations (Section 17.11)
  const totalCustomers = (filterStart ? filteredCustomers : customers).length;
  const totalLeads = (filterStart ? filteredLeads : leads).length;
  const openLeads = (filterStart ? filteredLeads : leads).filter(
    l => l.status === 'New' || l.status === 'Contacted' || l.status === 'Qualified'
  ).length;

  const totalOpportunities = (filterStart ? filteredOpportunities : opportunities).length;
  const openOpportunities = (filterStart ? filteredOpportunities : opportunities).filter(o => o.status === 'Open').length;
  const wonOpportunities = (filterStart ? filteredOpportunities : opportunities).filter(o => o.status === 'Won').length;
  const lostOpportunities = (filterStart ? filteredOpportunities : opportunities).filter(o => o.status === 'Lost').length;

  const openOppList = (filterStart ? filteredOpportunities : opportunities).filter(o => o.status === 'Open');
  const totalPipelineValue = openOppList.reduce((sum, o) => sum + (o.amount || 0), 0);
  const weightedPipelineValue = openOppList.reduce((sum, o) => sum + ((o.amount || 0) * (o.probability || 0)) / 100, 0);

  // Chart Data 1: Lead Status Chart (New, Contacted, Qualified, Lost, Converted)
  const leadStatuses = ['New', 'Contacted', 'Qualified', 'Lost', 'Converted'];
  const leadStatusCounts = leadStatuses.map(st => leads.filter(l => l.status === st).length);

  // Chart Data 2: Opportunity Pipeline Stage Chart (Qualification, Proposal, Negotiation, Won, Lost)
  const stages = ['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'];
  const stageAmounts = stages.map(st =>
    opportunities.filter(o => o.stage === st).reduce((sum, o) => sum + o.amount, 0)
  );
  const stageCounts = stages.map(st => opportunities.filter(o => o.stage === st).length);

  // Chart Data 3: Monthly Sales (Past 6 months outcome totals)
  const monthlyLabels: string[] = [];
  const monthlyWonTotals: number[] = [];
  const monthlyPipelineTotals: number[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const mName = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    monthlyLabels.push(`${mName} ${year}`);

    const mMonth = d.getMonth();
    const mYear = d.getFullYear();

    const mWon = opportunities
      .filter(o => {
        const od = new Date(o.createdDate);
        return od.getMonth() === mMonth && od.getFullYear() === mYear && o.status === 'Won';
      })
      .reduce((sum, o) => sum + o.amount, 0);

    const mTotal = opportunities
      .filter(o => {
        const od = new Date(o.createdDate);
        return od.getMonth() === mMonth && od.getFullYear() === mYear;
      })
      .reduce((sum, o) => sum + o.amount, 0);

    monthlyWonTotals.push(mWon);
    monthlyPipelineTotals.push(mTotal);
  }

  // Upcoming follow-ups
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingFollowUps = followUps
    .filter(f => f.status === 'Planned' && f.followUpDate >= todayStr)
    .sort((a, b) => (a.followUpDate > b.followUpDate ? 1 : -1))
    .slice(0, 5);

  // Overdue follow-ups
  const overdueFollowUps = followUps
    .filter(f => f.status === 'Planned' && f.followUpDate < todayStr);

  // Recent Activities
  const recentActivities = [...activities]
    .sort((a, b) => (a.activityDate < b.activityDate ? 1 : -1))
    .slice(0, 6);

  // System Stats for Admin
  const adminStats =
    user.roleName === 'Admin'
      ? {
          totalUsers: db.users.length,
          activeUsers: db.users.filter(u => u.isActive).length,
          lockedUsers: db.users.filter(u => u.lockoutEnd !== null).length,
          auditLogCount: db.auditLogs.length,
        }
      : undefined;

  return res.status(200).json({
    success: true,
    userScope: user.roleName,
    dateRange: dateRange || 'All Time',
    kpis: {
      totalCustomers,
      totalLeads,
      openLeads,
      totalOpportunities,
      openOpportunities,
      wonOpportunities,
      lostOpportunities,
      totalPipelineValue,
      weightedPipelineValue,
      pendingFollowUps: followUps.filter(f => f.status === 'Planned').length,
      overdueFollowUpsCount: overdueFollowUps.length,
    },
    charts: {
      leadStatus: {
        labels: leadStatuses,
        data: leadStatusCounts,
      },
      pipelineStage: {
        labels: stages,
        amounts: stageAmounts,
        counts: stageCounts,
      },
      monthlySales: {
        labels: monthlyLabels,
        won: monthlyWonTotals,
        pipeline: monthlyPipelineTotals,
      },
    },
    upcomingFollowUps,
    recentActivities,
    adminStats,
  });
});

export default router;
