export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'REQUESTER'
  | 'CHECKER'
  | 'APPROVER'
  | 'FINANCE';

export type UserStatus =
  | 'PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'LOCKED'
  | 'SUSPENDED'
  | 'INACTIVE';

export type ApprovalStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'WAITING_APPROVAL'
  | 'APPROVED'
  | 'REVISION_REQUIRED'
  | 'REJECTED'
  | 'CANCELED';

export type PaymentStatus =
  | 'UNPROCESSED'
  | 'WAITING_PAYMENT'
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_HOLD'
  | 'PAYMENT_FAILED'
  | 'TRANSFERRED'
  | 'COMPLETED';

export interface UserAccount {
  id: string; // firestore doc id or uid
  username: string; // e.g. andi.marketing, unique lowercase
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string; // Jabatan
  department: string;
  role: UserRole;
  status: UserStatus;
  passwordHash?: string; // SHA-256 for secure verification
  failedAttempts: number;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RequesterProfile {
  id: string;
  userId?: string;
  fullName: string;
  jobTitle: string;
  department: string;
  email: string;
  phone: string;
  defaultBank: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  createdAt: string;
}

export interface RecipientMaster {
  id: string;
  name: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  phone: string;
  email: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface DepartmentMaster {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface DirectorMaster {
  id: string;
  name: string;
  title: string; // e.g. Direktur Utama, Direktur Keuangan & Operasional
  department?: string;
  signatureUrl?: string;
  isActive: boolean;
}

export interface CategoryMaster {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  order: number;
}

export interface UnitMaster {
  id: string;
  name: string;
  isActive: boolean;
}

export interface RequestItem {
  id: string;
  itemNumber: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number; // Nominal satuan
  totalPrice: number; // quantity * unitPrice (validated server-side)
}

export interface RequestDocument {
  id: string; // PR doc id
  prNumber: string; // PR/KLB/YYYY/MM/XXXX
  sequenceNumber: number;
  year: number;
  month: number;
  requestDate: string; // YYYY-MM-DD
  subject: string; // Perihal
  category: string; // e.g. Pengadaan Barang
  department: string; // snapshot of department at request time
  directorId: string; // Target director
  directorName: string; // Snapshot
  directorTitle: string; // Snapshot
  
  // Requester snapshot
  requesterUserId: string;
  requesterName: string;
  requesterJobTitle: string;
  requesterDepartment: string;
  
  notes?: string;
  attachments?: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    uploadedAt: string;
  }[];

  // Request items
  items: RequestItem[];
  subtotal: number;
  taxAmount?: number;
  otherCost?: number;
  grandTotal: number;

  // Recipient / Payment Destination snapshot
  recipientName: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  recipientPhone?: string;
  recipientEmail?: string;

  // Workflow Status
  approvalStatus: ApprovalStatus;
  paymentStatus: PaymentStatus;

  // Approval step tracking
  checkedBy?: {
    userId: string;
    userName: string;
    jobTitle: string;
    actionAt: string;
    comment?: string;
  };
  approvedBy?: {
    userId: string;
    userName: string;
    jobTitle: string;
    actionAt: string;
    comment?: string;
  };
  revisionComment?: string;
  rejectionComment?: string;

  // Payment execution tracking
  paymentDetails?: {
    transferDate: string;
    transferAmount: number;
    sourceBank: string;
    referenceNumber: string;
    notes?: string;
    proofFileUrl?: string;
    proofFileName?: string;
    processedByUserId: string;
    processedByUserName: string;
    processedAt: string;
  };

  // Google Drive & PDF artifacts
  driveFileId?: string;
  driveFolderId?: string;
  driveUrl?: string;
  pdfGeneratedAt?: string;
  pdfVersion?: number;

  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  requestId?: string;
  prNumber?: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  comment?: string;
  ipAddress?: string;
}

export interface CompanySettings {
  id: string;
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logoUrl: string;
  documentFooter: string;
  prNumberFormat: string; // e.g. PR/KLB/{YYYY}/{MM}/{XXXX}
  maxFailedLoginAttempts: number;
  taxPercentageDefault: number;
}
