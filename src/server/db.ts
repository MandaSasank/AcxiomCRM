import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  userId: string;
  name: string;
  email: string;
  passwordHash: string;
  roleId: string;
  roleName: 'Admin' | 'Manager' | 'SalesExecutive';
  isActive: boolean;
  failedLoginCount: number;
  lockoutEnd?: string | null;
  createdDate: string;
}

export interface Customer {
  customerId: string;
  customerCode: string;
  customerName: string;
  email: string;
  phone: string;
  companyName: string;
  address: string;
  city: string;
  state: string;
  status: 'Active' | 'Inactive';
  createdDate: string;
  createdBy: string; // User ID
  createdByName?: string;
  modifiedDate?: string;
}

export interface Lead {
  leadId: string;
  leadCode: string;
  leadName: string;
  email: string;
  phone: string;
  companyName: string;
  source: 'Website' | 'Referral' | 'Cold Call' | 'Social Media' | 'Partner' | 'Email Campaign';
  status: 'New' | 'Contacted' | 'Qualified' | 'Unqualified' | 'Converted' | 'Lost';
  priority: 'Low' | 'Medium' | 'High';
  expectedValue: number;
  createdDate: string;
  assignedTo: string; // User ID
  assignedToName?: string;
  convertedCustomerId?: string;
  convertedOpportunityId?: string;
}

export interface Opportunity {
  opportunityId: string;
  opportunityName: string;
  customerId: string;
  customerName?: string;
  leadId?: string;
  amount: number;
  stage: 'Qualification' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
  probability: number; // 0 to 100
  expectedCloseDate: string;
  status: 'Open' | 'Won' | 'Lost';
  createdDate: string;
  assignedTo: string; // User ID
  assignedToName?: string;
  notes?: string;
}

export interface FollowUp {
  followUpId: string;
  customerId?: string;
  customerName?: string;
  leadId?: string;
  leadName?: string;
  opportunityId?: string;
  opportunityName?: string;
  followUpDate: string;
  followUpType: 'Call' | 'Meeting' | 'Email' | 'Task';
  subject: string;
  remarks: string;
  status: 'Planned' | 'Completed' | 'Missed' | 'Cancelled';
  assignedTo: string; // User ID
  assignedToName?: string;
  notes?: string;
  completedDate?: string;
}

export interface Activity {
  activityId: string;
  activityType: 'Call' | 'Meeting' | 'Email' | 'Task';
  subject: string;
  description: string;
  activityDate: string;
  customerId?: string;
  customerName?: string;
  leadId?: string;
  leadName?: string;
  assignedTo: string; // User ID
  assignedToName?: string;
  status: 'Planned' | 'Completed' | 'Cancelled';
}

export interface AuditLog {
  auditLogId: string;
  userId: string;
  userName: string;
  action: 'Login' | 'Failed Login' | 'Logout' | 'Create' | 'Update' | 'Delete' | 'Role Change' | 'Security';
  entityName: string; // 'Auth', 'Customer', 'Lead', 'Opportunity', 'FollowUp', 'Activity', 'User'
  recordId?: string;
  oldValue?: string;
  newValue?: string;
  createdDate: string;
  ipAddress?: string;
  result: 'Success' | 'Failure' | 'Blocked';
  details?: string;
}

export interface CrmDatabase {
  users: User[];
  customers: Customer[];
  leads: Lead[];
  opportunities: Opportunity[];
  followUps: FollowUp[];
  activities: Activity[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'crm_data.json');

// PBKDF2 Password Hashing (ASP.NET Identity compatible standard)
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const testHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(testHash, 'hex'));
  } catch {
    return false;
  }
}

// Initial seed data
function getInitialSeedData(): CrmDatabase {
  const adminPass = hashPassword('Admin@1234');
  const managerPass = hashPassword('Manager@1234');
  const salesPass1 = hashPassword('Sales@1234');
  const salesPass2 = hashPassword('Sales@1234');

  const users: User[] = [
    {
      userId: 'usr-admin-01',
      name: 'Alexander Pierce (Admin)',
      email: 'admin@acxiomcrm.com',
      passwordHash: adminPass,
      roleId: 'role-admin',
      roleName: 'Admin',
      isActive: true,
      failedLoginCount: 0,
      lockoutEnd: null,
      createdDate: new Date(Date.now() - 90 * 86400000).toISOString(),
    },
    {
      userId: 'usr-mgr-01',
      name: 'Victoria Vance (Sales Manager)',
      email: 'manager@acxiomcrm.com',
      passwordHash: managerPass,
      roleId: 'role-manager',
      roleName: 'Manager',
      isActive: true,
      failedLoginCount: 0,
      lockoutEnd: null,
      createdDate: new Date(Date.now() - 80 * 86400000).toISOString(),
    },
    {
      userId: 'usr-sales-01',
      name: 'David Miller (Sales Executive)',
      email: 'sales@acxiomcrm.com',
      passwordHash: salesPass1,
      roleId: 'role-sales',
      roleName: 'SalesExecutive',
      isActive: true,
      failedLoginCount: 0,
      lockoutEnd: null,
      createdDate: new Date(Date.now() - 70 * 86400000).toISOString(),
    },
    {
      userId: 'usr-sales-02',
      name: 'Rachel Green (Sales Executive)',
      email: 'rachel@acxiomcrm.com',
      passwordHash: salesPass2,
      roleId: 'role-sales',
      roleName: 'SalesExecutive',
      isActive: true,
      failedLoginCount: 0,
      lockoutEnd: null,
      createdDate: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
  ];

  const customers: Customer[] = [
    {
      customerId: 'cust-101',
      customerCode: 'CUST-00101',
      customerName: 'Acme Global Corp',
      email: 'contact@acmeglobal.com',
      phone: '9876543210',
      companyName: 'Acme Global Corporation',
      address: '100 Industrial Parkway, Suite 400',
      city: 'Chicago',
      state: 'IL',
      status: 'Active',
      createdDate: new Date(Date.now() - 40 * 86400000).toISOString(),
      createdBy: 'usr-sales-01',
      createdByName: 'David Miller (Sales Executive)',
      modifiedDate: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
      customerId: 'cust-102',
      customerCode: 'CUST-00102',
      customerName: 'NexGen Technologies',
      email: 'procurement@nexgentech.io',
      phone: '9845123456',
      companyName: 'NexGen Technologies Inc',
      address: '450 Silicon Boulevard',
      city: 'Austin',
      state: 'TX',
      status: 'Active',
      createdDate: new Date(Date.now() - 35 * 86400000).toISOString(),
      createdBy: 'usr-sales-01',
      createdByName: 'David Miller (Sales Executive)',
      modifiedDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      customerId: 'cust-103',
      customerCode: 'CUST-00103',
      customerName: 'Apex Health Systems',
      email: 'accounts@apexhealth.org',
      phone: '9812345678',
      companyName: 'Apex Health Systems Ltd',
      address: '782 Medical Center Way',
      city: 'Boston',
      state: 'MA',
      status: 'Active',
      createdDate: new Date(Date.now() - 25 * 86400000).toISOString(),
      createdBy: 'usr-sales-02',
      createdByName: 'Rachel Green (Sales Executive)',
      modifiedDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      customerId: 'cust-104',
      customerCode: 'CUST-00104',
      customerName: 'Summit Logistics',
      email: 'dispatch@summitlogistics.net',
      phone: '9823456789',
      companyName: 'Summit Freight & Logistics',
      address: '920 Harbor Road',
      city: 'Seattle',
      state: 'WA',
      status: 'Inactive',
      createdDate: new Date(Date.now() - 50 * 86400000).toISOString(),
      createdBy: 'usr-sales-02',
      createdByName: 'Rachel Green (Sales Executive)',
      modifiedDate: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
  ];

  const leads: Lead[] = [
    {
      leadId: 'lead-201',
      leadCode: 'LEAD-00201',
      leadName: 'Johnathan Hayes',
      email: 'jhayes@vanguardcloud.com',
      phone: '9834567890',
      companyName: 'Vanguard Cloud Solutions',
      source: 'Website',
      status: 'Qualified',
      priority: 'High',
      expectedValue: 45000,
      createdDate: new Date(Date.now() - 12 * 86400000).toISOString(),
      assignedTo: 'usr-sales-01',
      assignedToName: 'David Miller (Sales Executive)',
    },
    {
      leadId: 'lead-202',
      leadCode: 'LEAD-00202',
      leadName: 'Elena Rostova',
      email: 'elena@orionfintech.com',
      phone: '9845678901',
      companyName: 'Orion FinTech Partners',
      source: 'Referral',
      status: 'Contacted',
      priority: 'Medium',
      expectedValue: 32000,
      createdDate: new Date(Date.now() - 8 * 86400000).toISOString(),
      assignedTo: 'usr-sales-01',
      assignedToName: 'David Miller (Sales Executive)',
    },
    {
      leadId: 'lead-203',
      leadCode: 'LEAD-00203',
      leadName: 'Marcus Sterling',
      email: 'marcus@sterlingretail.com',
      phone: '9856789012',
      companyName: 'Sterling Retail Chain',
      source: 'Partner',
      status: 'New',
      priority: 'High',
      expectedValue: 60000,
      createdDate: new Date(Date.now() - 3 * 86400000).toISOString(),
      assignedTo: 'usr-sales-02',
      assignedToName: 'Rachel Green (Sales Executive)',
    },
    {
      leadId: 'lead-204',
      leadCode: 'LEAD-00204',
      leadName: 'Claire Bennet',
      email: 'cbennet@biovision.com',
      phone: '9867890123',
      companyName: 'BioVision Labs',
      source: 'Email Campaign',
      status: 'Converted',
      priority: 'High',
      expectedValue: 85000,
      createdDate: new Date(Date.now() - 20 * 86400000).toISOString(),
      assignedTo: 'usr-sales-01',
      assignedToName: 'David Miller (Sales Executive)',
      convertedCustomerId: 'cust-102',
      convertedOpportunityId: 'opp-302',
    },
  ];

  const nowPlusDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

  const opportunities: Opportunity[] = [
    {
      opportunityId: 'opp-301',
      opportunityName: 'Acme ERP Enterprise Migration',
      customerId: 'cust-101',
      customerName: 'Acme Global Corp',
      amount: 75000,
      stage: 'Proposal',
      probability: 60,
      expectedCloseDate: nowPlusDays(30),
      status: 'Open',
      createdDate: new Date(Date.now() - 20 * 86400000).toISOString(),
      assignedTo: 'usr-sales-01',
      assignedToName: 'David Miller (Sales Executive)',
      notes: 'Customer looking for 200 seat license migration by next quarter.',
    },
    {
      opportunityId: 'opp-302',
      opportunityName: 'NexGen Cloud Integration Suite',
      customerId: 'cust-102',
      customerName: 'NexGen Technologies',
      leadId: 'lead-204',
      amount: 85000,
      stage: 'Negotiation',
      probability: 80,
      expectedCloseDate: nowPlusDays(14),
      status: 'Open',
      createdDate: new Date(Date.now() - 15 * 86400000).toISOString(),
      assignedTo: 'usr-sales-01',
      assignedToName: 'David Miller (Sales Executive)',
      notes: 'Contract under final legal review.',
    },
    {
      opportunityId: 'opp-303',
      opportunityName: 'Apex Healthcare Telehealth Module',
      customerId: 'cust-103',
      customerName: 'Apex Health Systems',
      amount: 120000,
      stage: 'Won',
      probability: 100,
      expectedCloseDate: nowPlusDays(5),
      status: 'Won',
      createdDate: new Date(Date.now() - 30 * 86400000).toISOString(),
      assignedTo: 'usr-sales-02',
      assignedToName: 'Rachel Green (Sales Executive)',
      notes: 'Deal closed with 3-year support SLA.',
    },
    {
      opportunityId: 'opp-304',
      opportunityName: 'Summit Fleet Tracking Platform',
      customerId: 'cust-104',
      customerName: 'Summit Logistics',
      amount: 40000,
      stage: 'Lost',
      probability: 0,
      expectedCloseDate: nowPlusDays(1),
      status: 'Lost',
      createdDate: new Date(Date.now() - 40 * 86400000).toISOString(),
      assignedTo: 'usr-sales-02',
      assignedToName: 'Rachel Green (Sales Executive)',
      notes: 'Lost to competitor offering hardware bundling.',
    },
  ];

  const followUps: FollowUp[] = [
    {
      followUpId: 'flw-401',
      customerId: 'cust-101',
      customerName: 'Acme Global Corp',
      opportunityId: 'opp-301',
      opportunityName: 'Acme ERP Enterprise Migration',
      followUpDate: nowPlusDays(3),
      followUpType: 'Call',
      subject: 'Review pricing tiers with Acme procurement director',
      remarks: 'Need to clarify tier 2 discounts before formal quote submission.',
      status: 'Planned',
      assignedTo: 'usr-sales-01',
      assignedToName: 'David Miller (Sales Executive)',
      notes: 'Zoom meeting link sent.',
    },
    {
      followUpId: 'flw-402',
      customerId: 'cust-102',
      customerName: 'NexGen Technologies',
      opportunityId: 'opp-302',
      opportunityName: 'NexGen Cloud Integration Suite',
      followUpDate: nowPlusDays(5),
      followUpType: 'Meeting',
      subject: 'Technical architecture sign-off',
      remarks: 'Meet with CTO to confirm data security certifications.',
      status: 'Planned',
      assignedTo: 'usr-sales-01',
      assignedToName: 'David Miller (Sales Executive)',
      notes: 'In-person meeting at Austin office.',
    },
    {
      followUpId: 'flw-403',
      leadId: 'lead-203',
      leadName: 'Marcus Sterling',
      followUpDate: nowPlusDays(2),
      followUpType: 'Email',
      subject: 'Send product comparison deck',
      remarks: 'Send customized PDF detailing AcxiomCRM retail features.',
      status: 'Planned',
      assignedTo: 'usr-sales-02',
      assignedToName: 'Rachel Green (Sales Executive)',
      notes: 'Sent draft deck.',
    },
    {
      followUpId: 'flw-404',
      customerId: 'cust-103',
      customerName: 'Apex Health Systems',
      opportunityId: 'opp-303',
      opportunityName: 'Apex Healthcare Telehealth Module',
      followUpDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      followUpType: 'Call',
      subject: 'Post-sale onboarding kickoff call',
      remarks: 'Introduced implementation manager to client lead.',
      status: 'Completed',
      assignedTo: 'usr-sales-02',
      assignedToName: 'Rachel Green (Sales Executive)',
      completedDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ];

  const activities: Activity[] = [
    {
      activityId: 'act-501',
      activityType: 'Call',
      subject: 'Discovery call with IT Director',
      description: 'Discussed migration timeline and legacy database constraints.',
      activityDate: new Date(Date.now() - 5 * 86400000).toISOString(),
      customerId: 'cust-101',
      customerName: 'Acme Global Corp',
      assignedTo: 'usr-sales-01',
      assignedToName: 'David Miller (Sales Executive)',
      status: 'Completed',
    },
    {
      activityId: 'act-502',
      activityType: 'Meeting',
      subject: 'Live Demo for executive leadership',
      description: 'Demonstrated CRM pipelines, audit logs, and lead routing.',
      activityDate: new Date(Date.now() - 3 * 86400000).toISOString(),
      customerId: 'cust-102',
      customerName: 'NexGen Technologies',
      assignedTo: 'usr-sales-01',
      assignedToName: 'David Miller (Sales Executive)',
      status: 'Completed',
    },
    {
      activityId: 'act-503',
      activityType: 'Email',
      subject: 'Introductory email to new inbound lead',
      description: 'Shared overview whitepaper and scheduled discovery call.',
      activityDate: new Date(Date.now() - 1 * 86400000).toISOString(),
      leadId: 'lead-201',
      leadName: 'Johnathan Hayes',
      assignedTo: 'usr-sales-01',
      assignedToName: 'David Miller (Sales Executive)',
      status: 'Completed',
    },
    {
      activityId: 'act-504',
      activityType: 'Task',
      subject: 'Prepare custom contract addendum',
      description: 'Draft HIPAA compliance appendix for legal department.',
      activityDate: nowPlusDays(4),
      customerId: 'cust-103',
      customerName: 'Apex Health Systems',
      assignedTo: 'usr-sales-02',
      assignedToName: 'Rachel Green (Sales Executive)',
      status: 'Planned',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      auditLogId: 'aud-001',
      userId: 'usr-admin-01',
      userName: 'Alexander Pierce (Admin)',
      action: 'Login',
      entityName: 'Auth',
      recordId: 'usr-admin-01',
      createdDate: new Date(Date.now() - 24 * 3600000).toISOString(),
      ipAddress: '127.0.0.1',
      result: 'Success',
      details: 'Admin user logged in successfully with password policy verification.',
    },
    {
      auditLogId: 'aud-002',
      userId: 'usr-sales-01',
      userName: 'David Miller (Sales Executive)',
      action: 'Create',
      entityName: 'Customer',
      recordId: 'cust-101',
      createdDate: new Date(Date.now() - 40 * 86400000).toISOString(),
      ipAddress: '192.168.1.45',
      result: 'Success',
      newValue: JSON.stringify({ code: 'CUST-00101', name: 'Acme Global Corp' }),
      details: 'Customer created with uniqueness checks passed.',
    },
    {
      auditLogId: 'aud-003',
      userId: 'usr-sales-01',
      userName: 'David Miller (Sales Executive)',
      action: 'Create',
      entityName: 'Opportunity',
      recordId: 'opp-301',
      createdDate: new Date(Date.now() - 20 * 86400000).toISOString(),
      ipAddress: '192.168.1.45',
      result: 'Success',
      newValue: JSON.stringify({ name: 'Acme ERP Enterprise Migration', amount: 75000, stage: 'Proposal' }),
      details: 'Opportunity created with amount > 0 and future close date validated.',
    },
  ];

  return { users, customers, leads, opportunities, followUps, activities, auditLogs };
}

// In-Memory & File persistence storage
class DatabaseManager {
  private data: CrmDatabase;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): CrmDatabase {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Could not read existing database file, initializing seed data:', err);
    }
    const seed = getInitialSeedData();
    this.saveData(seed);
    return seed;
  }

  private saveData(data: CrmDatabase) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  public getDb(): CrmDatabase {
    return this.data;
  }

  public commit() {
    this.saveData(this.data);
  }

  public resetToSeed(): CrmDatabase {
    this.data = getInitialSeedData();
    this.saveData(this.data);
    return this.data;
  }
}

export const dbManager = new DatabaseManager();
export const db = dbManager.getDb();
