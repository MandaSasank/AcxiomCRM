import { Router, Response } from 'express';
import { dbManager } from '../db.ts';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/authMiddleware.ts';

const router = Router();

// GET /api/audit-logs (Admin & Manager only; SalesExecutive forbidden)
router.get('/', requireAuth, requireRole('Admin', 'Manager'), (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const { user, action, module, result, startDate, endDate, page = '1', limit = '50' } = req.query;

  let logs = db.auditLogs;

  if (user && typeof user === 'string') {
    const q = user.toLowerCase();
    logs = logs.filter(l => l.userName.toLowerCase().includes(q) || l.userId.toLowerCase().includes(q));
  }

  if (action && typeof action === 'string' && action !== 'All') {
    logs = logs.filter(l => l.action === action);
  }

  if (module && typeof module === 'string' && module !== 'All') {
    logs = logs.filter(l => l.entityName === module);
  }

  if (result && typeof result === 'string' && result !== 'All') {
    logs = logs.filter(l => l.result === result);
  }

  if (startDate && typeof startDate === 'string') {
    const start = new Date(startDate).getTime();
    logs = logs.filter(l => new Date(l.createdDate).getTime() >= start);
  }

  if (endDate && typeof endDate === 'string') {
    const end = new Date(endDate).getTime() + 86400000;
    logs = logs.filter(l => new Date(l.createdDate).getTime() <= end);
  }

  const pageNum = parseInt(page as string, 10) || 1;
  const pageSize = parseInt(limit as string, 10) || 50;
  const total = logs.length;
  const paged = logs.slice((pageNum - 1) * pageSize, pageNum * pageSize);

  return res.status(200).json({
    success: true,
    total,
    page: pageNum,
    pageSize,
    data: paged,
  });
});

export default router;
