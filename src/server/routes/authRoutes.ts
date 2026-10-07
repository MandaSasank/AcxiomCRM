import { Router, Response } from 'express';
import crypto from 'crypto';
import { dbManager, hashPassword, verifyPassword, User } from '../db.ts';
import { AuditService } from '../services/auditService.ts';
import { ValidationService } from '../services/validationService.ts';
import { AuthenticatedRequest, sessionStore, requireAuth, requireRole } from '../middleware/authMiddleware.ts';

const router = Router();

// Strips sensitive data like passwordHash
export function toUserDto(user: User) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// POST /api/auth/login
router.post('/login', (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.',
    });
  }

  const db = dbManager.getDb();
  const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

  if (!user) {
    AuditService.log({
      userId: 'anonymous',
      userName: email,
      action: 'Failed Login',
      entityName: 'Auth',
      ipAddress,
      result: 'Failure',
      details: `Failed login attempt for non-existent user: ${email}`,
    });
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  // Check Account Lockout
  if (user.lockoutEnd) {
    const lockTime = new Date(user.lockoutEnd).getTime();
    if (lockTime > Date.now()) {
      const minutesRemaining = Math.ceil((lockTime - Date.now()) / 60000);
      AuditService.log({
        userId: user.userId,
        userName: user.name,
        action: 'Failed Login',
        entityName: 'Auth',
        recordId: user.userId,
        ipAddress,
        result: 'Blocked',
        details: `Login blocked. Account locked out until ${user.lockoutEnd}`,
      });
      return res.status(403).json({
        success: false,
        message: `Account is temporarily locked due to repeated failed login attempts. Try again in ${minutesRemaining} minute(s) or contact an administrator.`,
      });
    } else {
      // Lockout expired, reset
      user.lockoutEnd = null;
      user.failedLoginCount = 0;
    }
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Account has been deactivated. Please contact an administrator.',
    });
  }

  const isPasswordValid = verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    user.failedLoginCount = (user.failedLoginCount || 0) + 1;
    let lockoutNotice = '';

    if (user.failedLoginCount >= 5) {
      // Lock for 15 minutes
      const lockUntil = new Date(Date.now() + 15 * 60000).toISOString();
      user.lockoutEnd = lockUntil;
      lockoutNotice = ' Too many failed attempts. Account has been locked for 15 minutes.';

      AuditService.log({
        userId: user.userId,
        userName: user.name,
        action: 'Security',
        entityName: 'Auth',
        recordId: user.userId,
        ipAddress,
        result: 'Failure',
        details: `Account locked after ${user.failedLoginCount} failed login attempts until ${lockUntil}`,
      });
    } else {
      AuditService.log({
        userId: user.userId,
        userName: user.name,
        action: 'Failed Login',
        entityName: 'Auth',
        recordId: user.userId,
        ipAddress,
        result: 'Failure',
        details: `Failed password verification (attempt ${user.failedLoginCount}/5)`,
      });
    }

    dbManager.commit();

    return res.status(401).json({
      success: false,
      message: `Invalid email or password.${lockoutNotice}`,
      failedAttempts: user.failedLoginCount,
    });
  }

  // Login Successful - reset failed attempts
  user.failedLoginCount = 0;
  user.lockoutEnd = null;
  dbManager.commit();

  const token = 'tok_' + crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  sessionStore.set(token, { userId: user.userId, expiresAt });

  res.cookie('acxiom_session', token, {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  });

  AuditService.log({
    userId: user.userId,
    userName: user.name,
    action: 'Login',
    entityName: 'Auth',
    recordId: user.userId,
    ipAddress,
    result: 'Success',
    details: `User ${user.name} (${user.roleName}) logged in successfully.`,
  });

  return res.status(200).json({
    success: true,
    token,
    user: toUserDto(user),
  });
});

// POST /api/auth/register
router.post('/register', (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password, roleName } = req.body;
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Name is required.' });
  }

  if (!email || !ValidationService.isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }

  const passValidation = ValidationService.validatePassword(password);
  if (!passValidation.isValid) {
    return res.status(400).json({ success: false, message: passValidation.message });
  }

  const db = dbManager.getDb();
  const existing = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    return res.status(409).json({ success: false, message: 'A user with this email address already exists.' });
  }

  // Default to SalesExecutive unless an authenticated Admin creates the user
  const effectiveRole: 'Admin' | 'Manager' | 'SalesExecutive' =
    req.user?.roleName === 'Admin' && ['Admin', 'Manager', 'SalesExecutive'].includes(roleName)
      ? roleName
      : 'SalesExecutive';

  const newUser: User = {
    userId: 'usr-' + crypto.randomUUID().slice(0, 8),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    roleId: `role-${effectiveRole.toLowerCase()}`,
    roleName: effectiveRole,
    isActive: true,
    failedLoginCount: 0,
    lockoutEnd: null,
    createdDate: new Date().toISOString(),
  };

  db.users.push(newUser);
  dbManager.commit();

  AuditService.log({
    userId: req.user ? req.user.userId : newUser.userId,
    userName: req.user ? req.user.name : newUser.name,
    action: 'Create',
    entityName: 'User',
    recordId: newUser.userId,
    ipAddress,
    result: 'Success',
    details: `User account created: ${newUser.name} with role ${newUser.roleName}`,
  });

  return res.status(201).json({
    success: true,
    message: 'User registered successfully.',
    user: toUserDto(newUser),
  });
});

// POST /api/auth/logout
router.post('/logout', (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.cookies?.acxiom_session;

  if (token && sessionStore.has(token)) {
    sessionStore.delete(token);
  }

  res.clearCookie('acxiom_session');

  if (req.user) {
    AuditService.log({
      userId: req.user.userId,
      userName: req.user.name,
      action: 'Logout',
      entityName: 'Auth',
      recordId: req.user.userId,
      result: 'Success',
      details: `User ${req.user.name} logged out.`,
    });
  }

  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
  return res.status(200).json({
    success: true,
    user: toUserDto(req.user),
  });
});

// GET /api/auth/users (Admin or Manager team view)
router.get('/users', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = dbManager.getDb();
  // Safe user DTO list
  const users = db.users.map(toUserDto);
  return res.status(200).json({ success: true, data: users });
});

// PUT /api/auth/users/:id (Admin only)
router.put('/users/:id', requireAuth, requireRole('Admin'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, roleName, isActive } = req.body;
  const db = dbManager.getDb();
  const targetUser = db.users.find(u => u.userId === id);

  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const oldSnapshot = { ...toUserDto(targetUser) };

  if (name && typeof name === 'string') targetUser.name = name.trim();
  if (roleName && ['Admin', 'Manager', 'SalesExecutive'].includes(roleName)) {
    if (targetUser.roleName !== roleName) {
      AuditService.log({
        userId: req.user!.userId,
        userName: req.user!.name,
        action: 'Role Change',
        entityName: 'User',
        recordId: targetUser.userId,
        oldValue: { role: targetUser.roleName },
        newValue: { role: roleName },
        result: 'Success',
        details: `User role changed from ${targetUser.roleName} to ${roleName}`,
      });
    }
    targetUser.roleName = roleName;
    targetUser.roleId = `role-${roleName.toLowerCase()}`;
  }
  if (typeof isActive === 'boolean') {
    targetUser.isActive = isActive;
  }

  dbManager.commit();

  AuditService.log({
    userId: req.user!.userId,
    userName: req.user!.name,
    action: 'Update',
    entityName: 'User',
    recordId: targetUser.userId,
    oldValue: oldSnapshot,
    newValue: toUserDto(targetUser),
    result: 'Success',
    details: `User details updated for ${targetUser.name}`,
  });

  return res.status(200).json({ success: true, data: toUserDto(targetUser) });
});

// POST /api/auth/users/:id/unlock (Admin only)
router.post('/users/:id/unlock', requireAuth, requireRole('Admin'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = dbManager.getDb();
  const targetUser = db.users.find(u => u.userId === id);

  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  targetUser.failedLoginCount = 0;
  targetUser.lockoutEnd = null;
  dbManager.commit();

  AuditService.log({
    userId: req.user!.userId,
    userName: req.user!.name,
    action: 'Security',
    entityName: 'User',
    recordId: targetUser.userId,
    result: 'Success',
    details: `Account unlocked for user ${targetUser.name}`,
  });

  return res.status(200).json({ success: true, message: 'Account successfully unlocked.' });
});

// POST /api/auth/users/:id/reset-password (Admin only)
router.post('/users/:id/reset-password', requireAuth, requireRole('Admin'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  const passValidation = ValidationService.validatePassword(newPassword);
  if (!passValidation.isValid) {
    return res.status(400).json({ success: false, message: passValidation.message });
  }

  const db = dbManager.getDb();
  const targetUser = db.users.find(u => u.userId === id);

  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  targetUser.passwordHash = hashPassword(newPassword);
  targetUser.failedLoginCount = 0;
  targetUser.lockoutEnd = null;
  dbManager.commit();

  AuditService.log({
    userId: req.user!.userId,
    userName: req.user!.name,
    action: 'Security',
    entityName: 'User',
    recordId: targetUser.userId,
    result: 'Success',
    details: `Password reset by administrator for user ${targetUser.name}`,
  });

  return res.status(200).json({ success: true, message: 'Password reset successfully.' });
});

export default router;
