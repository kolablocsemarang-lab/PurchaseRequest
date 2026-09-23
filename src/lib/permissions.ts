import { UserRole } from '../types';

export const PERMISSIONS = {
  // PR permissions
  PR_CREATE: 'pr.create',
  PR_VIEW_OWN: 'pr.view_own',
  PR_VIEW_DEPARTMENT: 'pr.view_department',
  PR_VIEW_ALL: 'pr.view_all',
  PR_EDIT_DRAFT: 'pr.edit_draft',
  PR_CANCEL: 'pr.cancel',

  // Approval permissions
  APPROVAL_REVIEW: 'approval.review',
  APPROVAL_VERIFY: 'approval.verify',
  APPROVAL_APPROVE: 'approval.approve',
  APPROVAL_REJECT: 'approval.reject',
  APPROVAL_RETURN: 'approval.return_revision',

  // Payment permissions
  PAYMENT_VIEW: 'payment.view',
  PAYMENT_PROCESS: 'payment.process',
  PAYMENT_MARK_TRANSFERRED: 'payment.mark_transferred',
  PAYMENT_UPLOAD_PROOF: 'payment.upload_proof',

  // User management
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_EDIT: 'user.edit',
  USER_ACTIVATE: 'user.activate',
  USER_SUSPEND: 'user.suspend',
  USER_RESET_PASSWORD: 'user.reset_password',

  // Category & Master data
  CATEGORY_VIEW: 'category.view',
  CATEGORY_CREATE: 'category.create',
  CATEGORY_EDIT: 'category.edit',
  CATEGORY_DEACTIVATE: 'category.deactivate',

  // Report & Export
  REPORT_VIEW: 'report.view',
  REPORT_EXPORT: 'report.export',

  // Settings & Audit
  SETTINGS_MANAGE: 'settings.manage',
  AUDIT_VIEW: 'audit.view',
} as const;

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<UserRole, PermissionCode[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  
  ADMIN: [
    PERMISSIONS.PR_VIEW_ALL,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.USER_ACTIVATE,
    PERMISSIONS.USER_SUSPEND,
    PERMISSIONS.USER_RESET_PASSWORD,
    PERMISSIONS.CATEGORY_VIEW,
    PERMISSIONS.CATEGORY_CREATE,
    PERMISSIONS.CATEGORY_EDIT,
    PERMISSIONS.CATEGORY_DEACTIVATE,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.AUDIT_VIEW,
  ],

  REQUESTER: [
    PERMISSIONS.PR_CREATE,
    PERMISSIONS.PR_VIEW_OWN,
    PERMISSIONS.PR_EDIT_DRAFT,
    PERMISSIONS.PR_CANCEL,
    PERMISSIONS.CATEGORY_VIEW,
  ],

  CHECKER: [
    PERMISSIONS.PR_VIEW_DEPARTMENT,
    PERMISSIONS.APPROVAL_REVIEW,
    PERMISSIONS.APPROVAL_VERIFY,
    PERMISSIONS.APPROVAL_REJECT,
    PERMISSIONS.APPROVAL_RETURN,
    PERMISSIONS.CATEGORY_VIEW,
  ],

  APPROVER: [
    PERMISSIONS.PR_VIEW_ALL,
    PERMISSIONS.APPROVAL_REVIEW,
    PERMISSIONS.APPROVAL_APPROVE,
    PERMISSIONS.APPROVAL_REJECT,
    PERMISSIONS.APPROVAL_RETURN,
    PERMISSIONS.CATEGORY_VIEW,
    PERMISSIONS.REPORT_VIEW,
  ],

  FINANCE: [
    PERMISSIONS.PR_VIEW_ALL,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.PAYMENT_PROCESS,
    PERMISSIONS.PAYMENT_MARK_TRANSFERRED,
    PERMISSIONS.PAYMENT_UPLOAD_PROOF,
    PERMISSIONS.CATEGORY_VIEW,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
  ],
};

export function hasPermission(role: UserRole, permission: PermissionCode): boolean {
  if (role === 'SUPER_ADMIN') return true;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canViewRequest(role: UserRole, requestRequesterId: string, currentUserId: string, userDepartment?: string, requestDepartment?: string): boolean {
  if (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'APPROVER' || role === 'FINANCE') {
    return true;
  }
  if (role === 'CHECKER') {
    // Checker can see requests in their department or all submitted requests needing check
    return true;
  }
  if (role === 'REQUESTER') {
    return requestRequesterId === currentUserId;
  }
  return false;
}
