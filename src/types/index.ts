// ─── Shared TypeScript interfaces for AssetFlow ─────────────────
// Aligned with Prisma schema field names (camelCase).

// ─── Core Models ────────────────────────────────────────────────

export interface Department {
  id: string;
  name: string;
  parentDepartmentId: string | null;
  headEmployeeId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  parent?: Department | null;
  headEmployee?: Employee | null;
  children?: Department[];
  _count?: { employees?: number; assets?: number };
}

export interface Location {
  id: string;
  name: string;
  code: string;
  type: string;
  parentId: string | null;
  address: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  parent?: Location | null;
  children?: Location[];
  _count?: { assets?: number };
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  departmentId: string | null;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  department?: Department | null;
}

export interface AssetCategory {
  id: string;
  name: string;
  fieldSchema: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { assets?: number };
}

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  categoryId: string;
  serialNumber: string | null;
  acquisitionDate: string | null;
  acquisitionCost: string | null;
  condition: string | null;
  location: string | null;
  departmentId: string | null;
  isBookable: boolean;
  status: string;
  attributes: Record<string, unknown>;
  photoUrl: string | null;
  documentUrls: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  category?: AssetCategory;
  department?: Department | null;
  locationRef?: Location | null;
  allocations?: Allocation[];
  maintenanceRequests?: MaintenanceRequest[];
  stateLog?: { id: string; fromStatus: string | null; toStatus: string; changedBy: string; changedAt: string; createdAt: string; changer?: Employee }[];
  bookings?: ResourceBooking[];
}

// ─── Allocation & Transfer ──────────────────────────────────────

export interface Allocation {
  id: string;
  assetId: string;
  targetType: string;
  targetId: string;
  allocatedBy: string;
  expectedReturnDate: string | null;
  returnedAt: string | null;
  conditionNotes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  asset?: Asset;
  allocator?: Employee;
  targetName?: string; // resolved name (employee or department)
}

export interface TransferRequest {
  id: string;
  allocationId: string;
  requestedBy: string;
  newTargetType: string;
  newTargetId: string;
  status: string;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  allocation?: Allocation;
  requester?: Employee;
  approver?: Employee | null;
}

// ─── Booking ────────────────────────────────────────────────────

export interface ResourceBooking {
  id: string;
  resourceId: string;
  bookedBy: string;
  departmentId: string | null;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  resource?: Asset;
  booker?: Employee;
  department?: Department | null;
}

// ─── Maintenance ────────────────────────────────────────────────

export interface MaintenanceRequest {
  id: string;
  assetId: string;
  raisedBy: string;
  issue: string;
  priority: string;
  photoUrl: string | null;
  status: string;
  approvedBy: string | null;
  technician: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  asset?: Asset;
  raiser?: Employee;
  approver?: Employee | null;
}

// ─── Audit ──────────────────────────────────────────────────────

export interface AuditCycleAuditor {
  auditCycleId: string;
  auditorId: string;
  auditor?: Employee;
}

export interface AuditItem {
  id: string;
  auditCycleId: string;
  assetId: string;
  result: string | null;
  resolution: string | null;
  markedBy: string | null;
  markedAt: string | null;
  asset?: Asset;
  marker?: Employee | null;
}

export interface AuditCycle {
  id: string;
  scopeDepartmentId: string | null;
  scopeLocation: string | null;
  startDate: string;
  endDate: string;
  status: string;
  createdBy: string;
  closedAt: string | null;
  scopeDepartment?: Department | null;
  creator?: Employee;
  auditors?: AuditCycleAuditor[];
  items?: AuditItem[];
  _count?: { items?: number };
}

// ─── Activity & Notifications ───────────────────────────────────

export interface ActivityLog {
  id: string;
  actorId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  requestId: string | null;
  createdAt: string;
  actor?: Employee;
}

export interface Notification {
  id: string;
  recipientId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// ─── Paginated Response ─────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}
