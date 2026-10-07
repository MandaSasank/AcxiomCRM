import { Request, Response, NextFunction } from 'express';
import { dbManager, User } from '../db.ts';

// In-memory active session token store
export const sessionStore = new Map<string, { userId: string; expiresAt: number }>();

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.acxiom_session) {
    token = req.cookies.acxiom_session;
  } else if (req.headers['x-session-token']) {
    token = req.headers['x-session-token'] as string;
  }

  // Also support direct X-User-Id header for easy integration testing & API verification
  const directUserId = req.headers['x-user-id'] as string;

  const db = dbManager.getDb();

  if (token && sessionStore.has(token)) {
    const session = sessionStore.get(token)!;
    if (Date.now() > session.expiresAt) {
      sessionStore.delete(token);
    } else {
      const user = db.users.find(u => u.userId === session.userId);
      if (user && user.isActive) {
        req.user = user;
      }
    }
  } else if (directUserId) {
    const user = db.users.find(u => u.userId === directUserId);
    if (user && user.isActive) {
      req.user = user;
    }
  }

  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Authentication token or valid session required.',
    });
  }
  next();
}

export function requireRole(...allowedRoles: Array<'Admin' | 'Manager' | 'SalesExecutive'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please login.',
      });
    }

    if (!allowedRoles.includes(req.user.roleName)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.roleName}' is not authorized for this resource. Required roles: ${allowedRoles.join(', ')}.`,
      });
    }

    next();
  };
}

export function isRecordAccessible(user: User, recordOwnerId?: string): boolean {
  if (user.roleName === 'Admin' || user.roleName === 'Manager') {
    return true;
  }
  // SalesExecutive only has access to own/assigned records
  return recordOwnerId === user.userId;
}
