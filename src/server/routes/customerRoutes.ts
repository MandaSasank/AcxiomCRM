import { Router, Response } from 'express';
import crypto from 'crypto';
import { dbManager, Customer } from '../db.ts';
import { AuditService } from '../services/auditService.ts';
import { ValidationService } from '../services/validationService.ts';
import { AuthenticatedRequest, requireAuth, isRecordAccessible } from '../middleware/authMiddleware.ts';

const router = Router();

// GET /api/customers
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { search, status, ownerId, page = '1', limit = '50' } = req.query;

  let customers = db.customers;

  // Role Scope: SalesExecutive only gets assigned/created customers
  if (user.roleName === 'SalesExecutive') {
    customers = customers.filter(c => c.createdBy === user.userId);
  } else if (ownerId && typeof ownerId === 'string') {
    customers = customers.filter(c => c.createdBy === ownerId);
  }

  // Filter by status
  if (status && typeof status === 'string' && status !== 'All') {
    customers = customers.filter(c => c.status === status);
  }

  // Search by Name, Email, Phone, Company
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    customers = customers.filter(
      c =>
        c.customerName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        c.customerCode.toLowerCase().includes(q)
    );
  }

  // Attach creator user name if missing
  customers = customers.map(c => {
    const creator = db.users.find(u => u.userId === c.createdBy);
    return {
      ...c,
      createdByName: creator ? creator.name : c.createdByName || 'Unknown',
    };
  });

  const pageNum = parseInt(page as string, 10) || 1;
  const pageSize = parseInt(limit as string, 10) || 50;
  const total = customers.length;
  const paged = customers.slice((pageNum - 1) * pageSize, pageNum * pageSize);

  return res.status(200).json({
    success: true,
    total,
    page: pageNum,
    pageSize,
    data: paged,
  });
});

// GET /api/customers/:id
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { id } = req.params;

  const customer = db.customers.find(c => c.customerId === id);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found.' });
  }

  // Role authorization scope check
  if (!isRecordAccessible(user, customer.createdBy)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to view this customer record.',
    });
  }

  const creator = db.users.find(u => u.userId === customer.createdBy);
  const relatedOpportunities = db.opportunities.filter(o => o.customerId === customer.customerId);
  const relatedFollowUps = db.followUps.filter(f => f.customerId === customer.customerId);
  const relatedActivities = db.activities.filter(a => a.customerId === customer.customerId);

  return res.status(200).json({
    success: true,
    data: {
      ...customer,
      createdByName: creator ? creator.name : customer.createdByName,
      opportunities: relatedOpportunities,
      followUps: relatedFollowUps,
      activities: relatedActivities,
    },
  });
});

// POST /api/customers
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const body = req.body;

  // Server-Side Validation
  const validation = ValidationService.validateCustomer(body, db.customers);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: validation.errors,
    });
  }

  const newCode = `CUST-${String(db.customers.length + 101).padStart(5, '0')}`;
  const newCustomer: Customer = {
    customerId: 'cust-' + crypto.randomUUID().slice(0, 8),
    customerCode: newCode,
    customerName: body.customerName.trim(),
    email: body.email.trim().toLowerCase(),
    phone: body.phone.trim(),
    companyName: (body.companyName || '').trim(),
    address: (body.address || '').trim(),
    city: (body.city || '').trim(),
    state: (body.state || '').trim(),
    status: body.status === 'Inactive' ? 'Inactive' : 'Active',
    createdDate: new Date().toISOString(),
    createdBy: user.roleName === 'Admin' && body.assignedTo ? body.assignedTo : user.userId,
    createdByName: user.name,
    modifiedDate: new Date().toISOString(),
  };

  db.customers.unshift(newCustomer);
  dbManager.commit();

  AuditService.log({
    userId: user.userId,
    userName: user.name,
    action: 'Create',
    entityName: 'Customer',
    recordId: newCustomer.customerId,
    newValue: newCustomer,
    result: 'Success',
    details: `Customer created: ${newCustomer.customerName} (${newCustomer.customerCode})`,
  });

  return res.status(201).json({
    success: true,
    message: 'Customer created successfully.',
    data: newCustomer,
  });
});

// PUT /api/customers/:id
router.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { id } = req.params;
  const body = req.body;

  const customer = db.customers.find(c => c.customerId === id);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found.' });
  }

  if (!isRecordAccessible(user, customer.createdBy)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to modify this customer.',
    });
  }

  // Server-Side Validation
  const validation = ValidationService.validateCustomer(body, db.customers, customer.customerId);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: validation.errors,
    });
  }

  const oldSnapshot = { ...customer };

  customer.customerName = body.customerName.trim();
  customer.email = body.email.trim().toLowerCase();
  customer.phone = body.phone.trim();
  customer.companyName = (body.companyName || '').trim();
  customer.address = (body.address || '').trim();
  customer.city = (body.city || '').trim();
  customer.state = (body.state || '').trim();
  customer.status = body.status === 'Inactive' ? 'Inactive' : 'Active';
  if (user.roleName === 'Admin' && body.assignedTo) {
    customer.createdBy = body.assignedTo;
  }
  customer.modifiedDate = new Date().toISOString();

  dbManager.commit();

  AuditService.log({
    userId: user.userId,
    userName: user.name,
    action: 'Update',
    entityName: 'Customer',
    recordId: customer.customerId,
    oldValue: oldSnapshot,
    newValue: customer,
    result: 'Success',
    details: `Customer updated: ${customer.customerName}`,
  });

  return res.status(200).json({
    success: true,
    message: 'Customer updated successfully.',
    data: customer,
  });
});

// DELETE /api/customers/:id
router.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  const user = req.user!;
  const { id } = req.params;

  const index = db.customers.findIndex(c => c.customerId === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Customer not found.' });
  }

  const customer = db.customers[index];
  if (!isRecordAccessible(user, customer.createdBy)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have permission to delete this customer.',
    });
  }

  // Deactivate or remove
  const oldSnapshot = { ...customer };
  db.customers.splice(index, 1);
  dbManager.commit();

  AuditService.log({
    userId: user.userId,
    userName: user.name,
    action: 'Delete',
    entityName: 'Customer',
    recordId: id,
    oldValue: oldSnapshot,
    result: 'Success',
    details: `Customer deleted/deactivated: ${customer.customerName}`,
  });

  return res.status(200).json({
    success: true,
    message: 'Customer deleted successfully.',
  });
});

export default router;
