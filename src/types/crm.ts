export type UserRole = 'Admin' | 'Manager' | 'SalesExecutive';

export interface UserDto {
  userId: string;
  name: string;
  email: string;
  roleId: string;
  roleName: UserRole;
  isActive: boolean;
  failedLoginCount: number;
  lockoutEnd?: string | null;
  createdDate: string;
}

export interface CustomerDto {
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
  createdBy: string;
  createdByName?: string;
  modifiedDate?: string;
  opportunities?: OpportunityDto[];
  followUps?: FollowUpDto[];
  activities?: ActivityDto[];
}

export interface LeadDto {
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
  assignedTo: string;
  assignedToName?: string;
  convertedCustomerId?: string;
  convertedOpportunityId?: string;
  activities?: ActivityDto[];
  followUps?: FollowUpDto[];
}

export interface OpportunityDto {
  opportunityId: string;
  opportunityName: string;
  customerId: string;
  customerName?: string;
  leadId?: string;
  amount: number;
  stage: 'Qualification' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
  probability: number;
  expectedCloseDate: string;
  status: 'Open' | 'Won' | 'Lost';
  createdDate: string;
  assignedTo: string;
  assignedToName?: string;
  notes?: string;
  weightedPipeline?: number;
  followUps?: FollowUpDto[];
}

export interface FollowUpDto {
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
  assignedTo: string;
  assignedToName?: string;
  notes?: string;
  completedDate?: string;
  isOverdue?: boolean;
}

export interface ActivityDto {
  activityId: string;
  activityType: 'Call' | 'Meeting' | 'Email' | 'Task';
  subject: string;
  description: string;
  activityDate: string;
  customerId?: string;
  customerName?: string;
  leadId?: string;
  leadName?: string;
  assignedTo: string;
  assignedToName?: string;
  status: 'Planned' | 'Completed' | 'Cancelled';
}

export interface AuditLogDto {
  auditLogId: string;
  userId: string;
  userName: string;
  action: 'Login' | 'Failed Login' | 'Logout' | 'Create' | 'Update' | 'Delete' | 'Role Change' | 'Security';
  entityName: string;
  recordId?: string;
  oldValue?: string;
  newValue?: string;
  createdDate: string;
  ipAddress?: string;
  result: 'Success' | 'Failure' | 'Blocked';
  details?: string;
}

export interface DashboardData {
  userScope: UserRole;
  dateRange: string;
  kpis: {
    totalCustomers: number;
    totalLeads: number;
    openLeads: number;
    totalOpportunities: number;
    openOpportunities: number;
    wonOpportunities: number;
    lostOpportunities: number;
    totalPipelineValue: number;
    weightedPipelineValue: number;
    pendingFollowUps: number;
    overdueFollowUpsCount: number;
  };
  charts: {
    leadStatus: {
      labels: string[];
      data: number[];
    };
    pipelineStage: {
      labels: string[];
      amounts: number[];
      counts: number[];
    };
    monthlySales: {
      labels: string[];
      won: number[];
      pipeline: number[];
    };
  };
  upcomingFollowUps: FollowUpDto[];
  recentActivities: ActivityDto[];
  adminStats?: {
    totalUsers: number;
    activeUsers: number;
    lockedUsers: number;
    auditLogCount: number;
  };
}
