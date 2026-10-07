import crypto from 'crypto';
import { dbManager, AuditLog } from '../db.ts';

export class AuditService {
  public static log(entry: {
    userId: string;
    userName: string;
    action: 'Login' | 'Failed Login' | 'Logout' | 'Create' | 'Update' | 'Delete' | 'Role Change' | 'Security';
    entityName: string;
    recordId?: string;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    result: 'Success' | 'Failure' | 'Blocked';
    details?: string;
  }): AuditLog {
    const db = dbManager.getDb();
    const newLog: AuditLog = {
      auditLogId: 'aud-' + crypto.randomUUID().slice(0, 8),
      userId: entry.userId,
      userName: entry.userName,
      action: entry.action,
      entityName: entry.entityName,
      recordId: entry.recordId,
      oldValue: entry.oldValue ? (typeof entry.oldValue === 'string' ? entry.oldValue : JSON.stringify(entry.oldValue)) : undefined,
      newValue: entry.newValue ? (typeof entry.newValue === 'string' ? entry.newValue : JSON.stringify(entry.newValue)) : undefined,
      createdDate: new Date().toISOString(),
      ipAddress: entry.ipAddress || '127.0.0.1',
      result: entry.result,
      details: entry.details,
    };

    db.auditLogs.unshift(newLog);
    dbManager.commit();
    return newLog;
  }
}
