import { describe, it, expect } from 'vitest';
import {
  AssetStatus,
  ASSET_STATUS_TRANSITIONS,
  isValidAssetTransition,
  EmployeeRole,
  ELEVATED_ROLES,
  EmployeeStatus,
  DepartmentStatus,
  AllocationStatus,
  AllocationTargetType,
  TransferRequestStatus,
  BookingStatus,
  MaintenanceStatus,
  MaintenancePriority,
  AuditCycleStatus,
  AuditItemResult,
  AuditItemResolution,
  NotificationType,
  ActivityAction,
  CategoryStatus,
  AssetCondition,
} from '@/lib/enums';

// ─── Asset Status Transitions ────────────────────────────────────

describe('ASSET_STATUS_TRANSITIONS', () => {
  it('should have an entry for every AssetStatus value', () => {
    const allStatuses = Object.values(AssetStatus);
    for (const status of allStatuses) {
      expect(ASSET_STATUS_TRANSITIONS).toHaveProperty(status);
    }
  });

  it('should only reference valid AssetStatus values in transition targets', () => {
    const allStatuses = new Set(Object.values(AssetStatus));
    for (const [from, targets] of Object.entries(ASSET_STATUS_TRANSITIONS)) {
      for (const to of targets) {
        expect(allStatuses.has(to)).toBe(true);
      }
      // Verify the key itself is a valid status
      expect(allStatuses.has(from as AssetStatus)).toBe(true);
    }
  });

  it('should make Disposed a terminal state (no transitions out)', () => {
    expect(ASSET_STATUS_TRANSITIONS[AssetStatus.DISPOSED]).toEqual([]);
  });

  it('should allow Available → Allocated', () => {
    expect(ASSET_STATUS_TRANSITIONS[AssetStatus.AVAILABLE]).toContain(AssetStatus.ALLOCATED);
  });

  it('should allow Allocated → Available (return)', () => {
    expect(ASSET_STATUS_TRANSITIONS[AssetStatus.ALLOCATED]).toContain(AssetStatus.AVAILABLE);
  });

  it('should allow Allocated → Under Maintenance', () => {
    expect(ASSET_STATUS_TRANSITIONS[AssetStatus.ALLOCATED]).toContain(AssetStatus.UNDER_MAINTENANCE);
  });

  it('should allow Under Maintenance → Available (resolved)', () => {
    expect(ASSET_STATUS_TRANSITIONS[AssetStatus.UNDER_MAINTENANCE]).toContain(AssetStatus.AVAILABLE);
  });

  it('should not allow Available → Lost directly', () => {
    expect(ASSET_STATUS_TRANSITIONS[AssetStatus.AVAILABLE]).not.toContain(AssetStatus.LOST);
  });
});

describe('isValidAssetTransition', () => {
  it('should return true for valid transitions', () => {
    expect(isValidAssetTransition(AssetStatus.AVAILABLE, AssetStatus.ALLOCATED)).toBe(true);
    expect(isValidAssetTransition(AssetStatus.ALLOCATED, AssetStatus.AVAILABLE)).toBe(true);
    expect(isValidAssetTransition(AssetStatus.LOST, AssetStatus.AVAILABLE)).toBe(true);
  });

  it('should return false for invalid transitions', () => {
    expect(isValidAssetTransition(AssetStatus.DISPOSED, AssetStatus.AVAILABLE)).toBe(false);
    expect(isValidAssetTransition(AssetStatus.AVAILABLE, AssetStatus.LOST)).toBe(false);
  });

  it('should return false for self-transitions', () => {
    expect(isValidAssetTransition(AssetStatus.AVAILABLE, AssetStatus.AVAILABLE)).toBe(false);
  });
});

// ─── Employee Roles ──────────────────────────────────────────────

describe('EmployeeRole', () => {
  it('should have all four roles', () => {
    expect(EmployeeRole.EMPLOYEE).toBe('employee');
    expect(EmployeeRole.DEPARTMENT_HEAD).toBe('department_head');
    expect(EmployeeRole.ASSET_MANAGER).toBe('asset_manager');
    expect(EmployeeRole.ADMIN).toBe('admin');
  });

  it('should define elevated roles (all except employee)', () => {
    expect(ELEVATED_ROLES).toContain(EmployeeRole.ADMIN);
    expect(ELEVATED_ROLES).toContain(EmployeeRole.ASSET_MANAGER);
    expect(ELEVATED_ROLES).toContain(EmployeeRole.DEPARTMENT_HEAD);
    expect(ELEVATED_ROLES).not.toContain(EmployeeRole.EMPLOYEE);
  });
});

// ─── Enum Completeness ───────────────────────────────────────────

describe('Enum completeness', () => {
  it('EmployeeStatus should have Active, Inactive, Pending', () => {
    expect(Object.values(EmployeeStatus)).toEqual(expect.arrayContaining(['Active', 'Inactive', 'Pending']));
  });

  it('DepartmentStatus should have Active, Inactive', () => {
    expect(Object.values(DepartmentStatus)).toEqual(expect.arrayContaining(['Active', 'Inactive']));
  });

  it('AllocationStatus should have Active, Returned, Transferred', () => {
    expect(Object.values(AllocationStatus)).toHaveLength(3);
  });

  it('AllocationTargetType should have employee, department', () => {
    expect(AllocationTargetType.EMPLOYEE).toBe('employee');
    expect(AllocationTargetType.DEPARTMENT).toBe('department');
  });

  it('TransferRequestStatus should have Requested, Approved, Rejected', () => {
    expect(Object.values(TransferRequestStatus)).toHaveLength(3);
  });

  it('BookingStatus should have 4 statuses', () => {
    expect(Object.values(BookingStatus)).toEqual(
      expect.arrayContaining(['Upcoming', 'Ongoing', 'Completed', 'Cancelled'])
    );
  });

  it('MaintenanceStatus should have the full workflow', () => {
    const statuses = Object.values(MaintenanceStatus);
    expect(statuses).toContain('Pending');
    expect(statuses).toContain('Approved');
    expect(statuses).toContain('Rejected');
    expect(statuses).toContain('In Progress');
    expect(statuses).toContain('Resolved');
    expect(statuses).toHaveLength(6); // includes Technician Assigned
  });

  it('MaintenancePriority should have low, medium, high', () => {
    expect(Object.values(MaintenancePriority)).toEqual(expect.arrayContaining(['low', 'medium', 'high']));
  });

  it('AuditCycleStatus should have Open, Closed', () => {
    expect(Object.values(AuditCycleStatus)).toEqual(expect.arrayContaining(['Open', 'Closed']));
  });

  it('AuditItemResult should have Verified, Missing, Damaged', () => {
    expect(Object.values(AuditItemResult)).toHaveLength(3);
  });

  it('AuditItemResolution should have mark_lost, mark_available, no_change', () => {
    expect(Object.values(AuditItemResolution)).toHaveLength(3);
  });

  it('CategoryStatus should have Active, Inactive', () => {
    expect(Object.values(CategoryStatus)).toEqual(expect.arrayContaining(['Active', 'Inactive']));
  });

  it('AssetCondition should have all 5 levels', () => {
    expect(Object.values(AssetCondition)).toHaveLength(5);
  });

  it('NotificationType should have all notification types', () => {
    const types = Object.values(NotificationType);
    expect(types.length).toBeGreaterThanOrEqual(13);
    expect(types).toContain('asset_assigned');
    expect(types).toContain('booking_confirmed');
    expect(types).toContain('overdue_return');
  });

  it('ActivityAction should have all action types', () => {
    const actions = Object.values(ActivityAction);
    expect(actions.length).toBeGreaterThanOrEqual(20);
    expect(actions).toContain('login');
    expect(actions).toContain('asset_created');
    expect(actions).toContain('role_changed');
  });
});
