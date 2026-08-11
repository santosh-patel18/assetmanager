/**
 * Centralized enums for AssetFlow.
 * Single source of truth — replace all string literals with these constants.
 */

// ─── Employee Roles ──────────────────────────────────────────────
export const EmployeeRole = {
  EMPLOYEE: 'employee',
  DEPARTMENT_HEAD: 'department_head',
  ASSET_MANAGER: 'asset_manager',
  ADMIN: 'admin',
} as const;
export type EmployeeRole = (typeof EmployeeRole)[keyof typeof EmployeeRole];

export const ELEVATED_ROLES: readonly EmployeeRole[] = [
  EmployeeRole.ADMIN,
  EmployeeRole.ASSET_MANAGER,
  EmployeeRole.DEPARTMENT_HEAD,
] as const;

// ─── Employee Status ─────────────────────────────────────────────
export const EmployeeStatus = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  PENDING: 'Pending',
} as const;
export type EmployeeStatus = (typeof EmployeeStatus)[keyof typeof EmployeeStatus];

// ─── Department Status ───────────────────────────────────────────
export const DepartmentStatus = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
} as const;
export type DepartmentStatus = (typeof DepartmentStatus)[keyof typeof DepartmentStatus];

// ─── Asset Status (Lifecycle) ────────────────────────────────────
export const AssetStatus = {
  AVAILABLE: 'Available',
  ALLOCATED: 'Allocated',
  RESERVED: 'Reserved',
  UNDER_MAINTENANCE: 'Under Maintenance',
  LOST: 'Lost',
  RETIRED: 'Retired',
  DISPOSED: 'Disposed',
} as const;
export type AssetStatus = (typeof AssetStatus)[keyof typeof AssetStatus];

/** Legal status transitions — key is "from", values are allowed "to" statuses */
export const ASSET_STATUS_TRANSITIONS: Record<AssetStatus, readonly AssetStatus[]> = {
  [AssetStatus.AVAILABLE]: [AssetStatus.ALLOCATED, AssetStatus.RESERVED, AssetStatus.UNDER_MAINTENANCE, AssetStatus.RETIRED, AssetStatus.DISPOSED],
  [AssetStatus.ALLOCATED]: [AssetStatus.AVAILABLE, AssetStatus.UNDER_MAINTENANCE, AssetStatus.LOST],
  [AssetStatus.RESERVED]: [AssetStatus.ALLOCATED, AssetStatus.AVAILABLE],
  [AssetStatus.UNDER_MAINTENANCE]: [AssetStatus.AVAILABLE, AssetStatus.RETIRED, AssetStatus.DISPOSED],
  [AssetStatus.LOST]: [AssetStatus.AVAILABLE, AssetStatus.DISPOSED],
  [AssetStatus.RETIRED]: [AssetStatus.DISPOSED, AssetStatus.AVAILABLE],
  [AssetStatus.DISPOSED]: [],
};

export function isValidAssetTransition(from: AssetStatus, to: AssetStatus): boolean {
  return ASSET_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Asset Condition ─────────────────────────────────────────────
export const AssetCondition = {
  NEW: 'New',
  GOOD: 'Good',
  FAIR: 'Fair',
  POOR: 'Poor',
  DAMAGED: 'Damaged',
} as const;
export type AssetCondition = (typeof AssetCondition)[keyof typeof AssetCondition];

// ─── Allocation Status ───────────────────────────────────────────
export const AllocationStatus = {
  ACTIVE: 'Active',
  RETURNED: 'Returned',
  TRANSFERRED: 'Transferred',
} as const;
export type AllocationStatus = (typeof AllocationStatus)[keyof typeof AllocationStatus];

// ─── Allocation Target Type ─────────────────────────────────────
export const AllocationTargetType = {
  EMPLOYEE: 'employee',
  DEPARTMENT: 'department',
} as const;
export type AllocationTargetType = (typeof AllocationTargetType)[keyof typeof AllocationTargetType];

// ─── Transfer Request Status ─────────────────────────────────────
export const TransferRequestStatus = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
} as const;
export type TransferRequestStatus = (typeof TransferRequestStatus)[keyof typeof TransferRequestStatus];

// ─── Booking Status ──────────────────────────────────────────────
export const BookingStatus = {
  UPCOMING: 'Upcoming',
  ONGOING: 'Ongoing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

// ─── Maintenance Request Status ──────────────────────────────────
export const MaintenanceStatus = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  TECHNICIAN_ASSIGNED: 'Technician Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
} as const;
export type MaintenanceStatus = (typeof MaintenanceStatus)[keyof typeof MaintenanceStatus];

// ─── Maintenance Priority ────────────────────────────────────────
export const MaintenancePriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;
export type MaintenancePriority = (typeof MaintenancePriority)[keyof typeof MaintenancePriority];

// ─── Audit Cycle Status ─────────────────────────────────────────
export const AuditCycleStatus = {
  OPEN: 'Open',
  CLOSED: 'Closed',
} as const;
export type AuditCycleStatus = (typeof AuditCycleStatus)[keyof typeof AuditCycleStatus];

// ─── Audit Item Result ───────────────────────────────────────────
export const AuditItemResult = {
  VERIFIED: 'Verified',
  MISSING: 'Missing',
  DAMAGED: 'Damaged',
} as const;
export type AuditItemResult = (typeof AuditItemResult)[keyof typeof AuditItemResult];

// ─── Audit Item Resolution ───────────────────────────────────────
export const AuditItemResolution = {
  MARK_LOST: 'mark_lost',
  MARK_AVAILABLE: 'mark_available',
  NO_CHANGE: 'no_change',
} as const;
export type AuditItemResolution = (typeof AuditItemResolution)[keyof typeof AuditItemResolution];

// ─── Notification Types ──────────────────────────────────────────
export const NotificationType = {
  ASSET_ASSIGNED: 'asset_assigned',
  ASSET_RETURNED: 'asset_returned',
  MAINTENANCE_APPROVED: 'maintenance_approved',
  MAINTENANCE_REJECTED: 'maintenance_rejected',
  MAINTENANCE_RESOLVED: 'maintenance_resolved',
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_CANCELLED: 'booking_cancelled',
  BOOKING_REMINDER: 'booking_reminder',
  TRANSFER_REQUESTED: 'transfer_requested',
  TRANSFER_APPROVED: 'transfer_approved',
  TRANSFER_REJECTED: 'transfer_rejected',
  OVERDUE_RETURN: 'overdue_return',
  AUDIT_DISCREPANCY: 'audit_discrepancy',
  ROLE_CHANGED: 'role_changed',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

// ─── Activity Log Actions ────────────────────────────────────────
export const ActivityAction = {
  // Auth
  LOGIN: 'login',
  SIGNUP: 'signup',
  PASSWORD_CHANGED: 'password_changed',
  // Assets
  ASSET_CREATED: 'asset_created',
  ASSET_UPDATED: 'asset_updated',
  ASSET_STATUS_CHANGED: 'asset_status_changed',
  // Allocations
  ASSET_ALLOCATED: 'asset_allocated',
  ASSET_RETURNED: 'asset_returned',
  TRANSFER_REQUESTED: 'transfer_requested',
  TRANSFER_APPROVED: 'transfer_approved',
  TRANSFER_REJECTED: 'transfer_rejected',
  // Bookings
  BOOKING_CREATED: 'booking_created',
  BOOKING_CANCELLED: 'booking_cancelled',
  // Maintenance
  MAINTENANCE_REQUESTED: 'maintenance_requested',
  MAINTENANCE_APPROVED: 'maintenance_approved',
  MAINTENANCE_REJECTED: 'maintenance_rejected',
  MAINTENANCE_RESOLVED: 'maintenance_resolved',
  // Audit
  AUDIT_CYCLE_CREATED: 'audit_cycle_created',
  AUDIT_ITEM_MARKED: 'audit_item_marked',
  AUDIT_CYCLE_CLOSED: 'audit_cycle_closed',
  // Org
  DEPARTMENT_CREATED: 'department_created',
  DEPARTMENT_UPDATED: 'department_updated',
  CATEGORY_CREATED: 'category_created',
  ROLE_CHANGED: 'role_changed',
  EMPLOYEE_STATUS_CHANGED: 'employee_status_changed',
} as const;
export type ActivityAction = (typeof ActivityAction)[keyof typeof ActivityAction];

// ─── Category Status ─────────────────────────────────────────────
export const CategoryStatus = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
} as const;
export type CategoryStatus = (typeof CategoryStatus)[keyof typeof CategoryStatus];
