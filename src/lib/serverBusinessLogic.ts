import { db } from './firebase';
import {
  doc,
  getDoc,
  updateDoc,
  runTransaction,
  setDoc,
} from 'firebase/firestore';
import { RequestDocument, UserAccount, CompanySettings } from '../types';
import { calculateAndValidateTotals, logActivity } from './requestService';
import { canViewRequest } from './permissions';

export interface WorkflowActionResult {
  success: boolean;
  message?: string;
  updatedRequest?: RequestDocument;
}

/**
 * Server/Backend Business Logic Validator & Guard
 * Checks whether user account is ACTIVE. Suspended/Locked/Inactive users are rejected.
 */
export async function assertActiveUser(user: UserAccount): Promise<void> {
  if (!user || !user.id) {
    throw new Error('UNAUTHORIZED: Sesi otentikasi tidak valid.');
  }

  // Double check fresh status from database
  try {
    const userDoc = await getDoc(doc(db, 'users', user.id));
    if (userDoc.exists()) {
      const freshUser = userDoc.data() as UserAccount;
      if (freshUser.status !== 'ACTIVE') {
        throw new Error(`FORBIDDEN: Akun Anda sedang dalam status '${freshUser.status}'. Akses ditolak.`);
      }
    }
  } catch (err: any) {
    if (err.message?.includes('FORBIDDEN')) throw err;
    // If user document is preset/offline, check local object status
    if (user.status !== 'ACTIVE') {
      throw new Error(`FORBIDDEN: Akun Anda sedang dalam status '${user.status}'. Akses ditolak.`);
    }
  }
}

/**
 * Enforce Data Scope & IDOR protection:
 * Verify if the user is allowed to read this specific request document.
 */
export async function verifyRequestAccess(
  user: UserAccount,
  request: RequestDocument
): Promise<void> {
  await assertActiveUser(user);

  const allowed = canViewRequest(
    user.role,
    request.requesterUserId,
    user.id,
    user.department,
    request.department
  );

  if (!allowed) {
    await logActivity(user, 'PERCOBAAN AKSES DATA ILEGAL (IDOR DETECTED)', {
      requestId: request.id,
      prNumber: request.prNumber,
      comment: `Requester ID: ${request.requesterUserId}, User ID: ${user.id}`,
    });
    throw new Error('ACCESS_DENIED: Anda tidak memiliki wewenang untuk melihat atau memproses pengajuan ini.');
  }
}

/**
 * Backend Workflow Action: Checker Verification
 */
export async function executeVerifyAction(
  user: UserAccount,
  requestId: string,
  comment: string
): Promise<WorkflowActionResult> {
  await assertActiveUser(user);

  if (user.role !== 'CHECKER' && user.role !== 'SUPER_ADMIN') {
    throw new Error('AUTHORIZATION_ERROR: Hanya peran CHECKER atau SUPER_ADMIN yang berhak memverifikasi pengajuan.');
  }

  return await runTransaction(db, async (tx) => {
    const reqRef = doc(db, 'requests', requestId);
    const snap = await tx.get(reqRef);
    if (!snap.exists()) {
      throw new Error('Dokumen pengajuan tidak ditemukan.');
    }

    const data = snap.data() as RequestDocument;

    // State check
    if (data.approvalStatus !== 'SUBMITTED' && data.approvalStatus !== 'UNDER_REVIEW') {
      throw new Error(`STATE_ERROR: Pengajuan tidak dapat diverifikasi karena status saat ini: ${data.approvalStatus}`);
    }

    const now = new Date().toISOString();
    const updatePayload = {
      approvalStatus: 'VERIFIED' as const,
      checkedBy: {
        userId: user.id,
        userName: user.fullName,
        jobTitle: user.jobTitle,
        actionAt: now,
        comment: comment || 'Telah diverifikasi sesuai kelengkapan dokumen pengadaan.',
      },
      updatedAt: now,
    };

    tx.update(reqRef, updatePayload);

    return {
      success: true,
      message: 'Pengajuan berhasil diverifikasi.',
      updatedRequest: { ...data, ...updatePayload },
    };
  });
}

/**
 * Backend Workflow Action: Approver / Director Approval
 * CRITICAL RULE: Finance is explicitly BLOCKED from approving requests.
 */
export async function executeApproveAction(
  user: UserAccount,
  requestId: string,
  comment: string
): Promise<WorkflowActionResult> {
  await assertActiveUser(user);

  // Security Check 8: Finance being able to approve requests
  if (user.role === 'FINANCE') {
    throw new Error('CRITICAL_SECURITY_VIOLATION: Bagian Finance DILARANG menyetujui pengajuan (Segregation of Duties). Hanya APPROVER / Direksi yang berhak.');
  }

  if (user.role !== 'APPROVER' && user.role !== 'SUPER_ADMIN') {
    throw new Error('AUTHORIZATION_ERROR: Anda tidak memiliki wewenang APPROVER untuk menyetujui dokumen ini.');
  }

  return await runTransaction(db, async (tx) => {
    const reqRef = doc(db, 'requests', requestId);
    const snap = await tx.get(reqRef);
    if (!snap.exists()) {
      throw new Error('Dokumen pengajuan tidak ditemukan.');
    }

    const data = snap.data() as RequestDocument;

    // Must be VERIFIED or WAITING_APPROVAL
    if (data.approvalStatus !== 'VERIFIED' && data.approvalStatus !== 'WAITING_APPROVAL' && data.approvalStatus !== 'SUBMITTED') {
      throw new Error(`STATE_ERROR: Pengajuan tidak dapat disetujui karena status saat ini: ${data.approvalStatus}`);
    }

    const now = new Date().toISOString();
    const updatePayload = {
      approvalStatus: 'APPROVED' as const,
      paymentStatus: 'WAITING_PAYMENT' as const,
      approvedBy: {
        userId: user.id,
        userName: user.fullName,
        jobTitle: user.jobTitle,
        actionAt: now,
        comment: comment || 'Disetujui untuk diproses ke Bagian Keuangan.',
      },
      updatedAt: now,
    };

    tx.update(reqRef, updatePayload);

    return {
      success: true,
      message: 'Pengajuan telah disetujui oleh Direksi.',
      updatedRequest: { ...data, ...updatePayload },
    };
  });
}

/**
 * Backend Workflow Action: Return for Revision or Reject
 */
export async function executeRevisionOrRejectAction(
  user: UserAccount,
  requestId: string,
  type: 'REVISION' | 'REJECT',
  comment: string
): Promise<WorkflowActionResult> {
  await assertActiveUser(user);

  if (!comment || !comment.trim()) {
    throw new Error('VALIDATION_ERROR: Alasan / komentar wajib dicantumkan.');
  }

  const allowedRoles = ['CHECKER', 'APPROVER', 'SUPER_ADMIN'];
  if (!allowedRoles.includes(user.role)) {
    throw new Error('AUTHORIZATION_ERROR: Anda tidak memiliki wewenang untuk menolak atau mengembalikan pengajuan ini.');
  }

  return await runTransaction(db, async (tx) => {
    const reqRef = doc(db, 'requests', requestId);
    const snap = await tx.get(reqRef);
    if (!snap.exists()) {
      throw new Error('Dokumen pengajuan tidak ditemukan.');
    }

    const data = snap.data() as RequestDocument;

    // Can only reject or return if not already transferred
    if (data.paymentStatus === 'TRANSFERRED') {
      throw new Error('BUSINESS_LOGIC_ERROR: Pengajuan yang telah ditransfer oleh Keuangan tidak dapat dikembalikan atau ditolak.');
    }

    const now = new Date().toISOString();
    const newStatus = type === 'REVISION' ? 'REVISION_REQUIRED' : 'REJECTED';
    const updatePayload: any = {
      approvalStatus: newStatus,
      updatedAt: now,
    };

    if (type === 'REVISION') {
      updatePayload.revisionComment = comment.trim();
    } else {
      updatePayload.rejectionComment = comment.trim();
    }

    tx.update(reqRef, updatePayload);

    return {
      success: true,
      message: type === 'REVISION' ? 'Pengajuan berhasil dikembalikan untuk revisi.' : 'Pengajuan telah ditolak.',
      updatedRequest: { ...data, ...updatePayload },
    };
  });
}

/**
 * Backend Workflow Action: Finance Payment Execution
 * CRITICAL RULE: Approver is BLOCKED from executing payment. Only FINANCE or SUPER_ADMIN.
 */
export async function executePaymentTransfer(
  user: UserAccount,
  requestId: string,
  paymentDetails: {
    transferDate: string;
    sourceBank: string;
    referenceNumber: string;
    notes?: string;
    proofFileName?: string;
    proofFileUrl?: string;
  }
): Promise<WorkflowActionResult> {
  await assertActiveUser(user);

  // Security Check 9: Approver being able to mark payments as transferred
  if (user.role === 'APPROVER') {
    throw new Error('CRITICAL_SECURITY_VIOLATION: Approver / Direksi DILARANG memproses atau menandai pembayaran telah ditransfer. Tugas ini khusus untuk staf FINANCE (Segregation of Duties).');
  }

  if (user.role !== 'FINANCE' && user.role !== 'SUPER_ADMIN') {
    throw new Error('AUTHORIZATION_ERROR: Hanya bagian FINANCE atau SUPER_ADMIN yang berhak mengeksekusi transfer perbankan.');
  }

  if (!paymentDetails.referenceNumber?.trim()) {
    throw new Error('VALIDATION_ERROR: Nomor referensi transfer bank wajib diisi sebagai bukti audit perbankan.');
  }

  return await runTransaction(db, async (tx) => {
    const reqRef = doc(db, 'requests', requestId);
    const snap = await tx.get(reqRef);
    if (!snap.exists()) {
      throw new Error('Dokumen pengajuan tidak ditemukan.');
    }

    const data = snap.data() as RequestDocument;

    // Must be APPROVED before payment can be executed
    if (data.approvalStatus !== 'APPROVED') {
      throw new Error('SECURITY_ERROR: Pengajuan BELUM DISETUJUI oleh Direksi. Pembayaran tidak dapat diproses.');
    }

    if (data.paymentStatus === 'TRANSFERRED') {
      throw new Error('IDEMPOTENCY_ERROR: Pengajuan ini sudah selesai dibayarkan sebelumnya.');
    }

    const now = new Date().toISOString();
    const updatePayload = {
      paymentStatus: 'TRANSFERRED' as const,
      paymentDetails: {
        transferDate: paymentDetails.transferDate || now.split('T')[0],
        transferAmount: data.grandTotal, // Tamper-proof: use immutable server grandTotal
        sourceBank: paymentDetails.sourceBank || 'BCA Giro Operasional',
        referenceNumber: paymentDetails.referenceNumber.trim(),
        notes: paymentDetails.notes || '',
        proofFileName: paymentDetails.proofFileName || 'Bukti_Transfer.pdf',
        proofFileUrl: paymentDetails.proofFileUrl || '',
        processedByUserId: user.id,
        processedByUserName: user.fullName,
        processedAt: now,
      },
      updatedAt: now,
    };

    tx.update(reqRef, updatePayload);

    return {
      success: true,
      message: 'Realisasi transfer berhasil dicatat.',
      updatedRequest: { ...data, ...updatePayload },
    };
  });
}

/**
 * Backend Protection for Editing Requests:
 * Security Check 7: Users editing approved requests.
 */
export async function assertCanEditRequest(
  user: UserAccount,
  request: RequestDocument
): Promise<void> {
  await assertActiveUser(user);

  if (request.approvalStatus === 'APPROVED') {
    throw new Error('TAMPER_PROTECTION: Pengajuan telah DISETUJUI oleh Direksi dan terkunci secara permanen. Tidak dapat diubah.');
  }

  if (request.paymentStatus === 'TRANSFERRED') {
    throw new Error('TAMPER_PROTECTION: Pengajuan telah dibayarkan (TRANSFERRED). Dokumen telah terkunci secara legal.');
  }

  if (user.role === 'REQUESTER' && request.requesterUserId !== user.id) {
    throw new Error('ACCESS_DENIED: Anda hanya dapat mengubah pengajuan milik Anda sendiri.');
  }
}

/**
 * Backend Creation Action with Server-side Math, Role & Race-Condition-Free Atomic PR Generation
 * Security Check 6: Users manipulating totals from the browser.
 * Security Check 10: Disabled/Suspended users accessing protected APIs.
 * Security Check 13 & 14: Duplicate PR document numbers and race conditions during document numbering.
 */
export async function executeCreateRequest(
  user: UserAccount,
  payload: {
    requestDate: string;
    subject: string;
    category: string;
    department: string;
    director: { id: string; name: string; title: string };
    notes: string;
    items: Array<{ description: string; quantity: number; unit: string; unitPrice: number }>;
    taxPercentage: number;
    otherCost: number;
    recipientName: string;
    bankName: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
    recipientPhone?: string;
    attachments: any[];
    submitStatus: 'DRAFT' | 'SUBMITTED';
  }
): Promise<{ success: boolean; requestId: string; prNumber: string }> {
  // 1. Enforce active user status
  await assertActiveUser(user);

  // 2. Validate input fields
  if (!payload.subject || !payload.subject.trim()) {
    throw new Error('VALIDATION_ERROR: Perihal Pengajuan wajib diisi.');
  }

  if (!payload.items || payload.items.length === 0) {
    throw new Error('VALIDATION_ERROR: Minimal harus ada 1 item pengadaan.');
  }

  for (const item of payload.items) {
    if (!item.description || !item.description.trim()) {
      throw new Error('VALIDATION_ERROR: Keterangan barang/jasa tidak boleh kosong.');
    }
    if (Number(item.quantity) <= 0 || Number(item.unitPrice) <= 0) {
      throw new Error('VALIDATION_ERROR: Kuantitas dan harga satuan harus bernilai lebih dari 0.');
    }
  }

  if (!payload.bankAccountNumber || !payload.bankAccountNumber.trim()) {
    throw new Error('VALIDATION_ERROR: Nomor rekening tujuan pembayaran wajib diisi.');
  }

  // 3. Deterministically recompute totals on the server
  const validated = calculateAndValidateTotals(
    payload.items,
    payload.taxPercentage,
    payload.otherCost
  );

  // 4. Atomically obtain sequence number and write new document inside transaction to avoid race condition
  const targetDate = payload.requestDate ? new Date(payload.requestDate) : new Date();
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const monthStr = month.toString().padStart(2, '0');
  const counterId = `counter_${year}_${monthStr}`;
  const counterRef = doc(db, 'counters', counterId);

  const now = new Date().toISOString();

  const result = await runTransaction(db, async (tx) => {
    const counterDoc = await tx.get(counterRef);
    let nextSequence = 1;
    if (!counterDoc.exists()) {
      tx.set(counterRef, { currentSequence: 1, year, month, updatedAt: now });
      nextSequence = 1;
    } else {
      const current = counterDoc.data().currentSequence || 0;
      nextSequence = current + 1;
      tx.update(counterRef, { currentSequence: nextSequence, updatedAt: now });
    }

    const seqPadded = nextSequence.toString().padStart(4, '0');
    const prNumber = `PR/KLB/${year}/${monthStr}/${seqPadded}`;
    const newId = `pr-${year}-${monthStr}-${seqPadded}`;
    const reqRef = doc(db, 'requests', newId);

    // Ensure idempotency: ID cannot already exist
    const checkExists = await tx.get(reqRef);
    if (checkExists.exists()) {
      throw new Error(`DUPLICATE_ERROR: Nomor dokumen ${prNumber} sudah terdaftar dalam sistem.`);
    }

    const newDocData: RequestDocument = {
      id: newId,
      prNumber,
      sequenceNumber: nextSequence,
      year,
      month,
      requestDate: payload.requestDate,
      subject: payload.subject.trim(),
      category: payload.category,
      department: payload.department || user.department,
      directorId: payload.director.id,
      directorName: payload.director.name,
      directorTitle: payload.director.title,
      requesterUserId: user.id,
      requesterName: user.fullName,
      requesterJobTitle: user.jobTitle,
      requesterDepartment: user.department,
      notes: payload.notes.trim(),
      attachments: payload.attachments || [],
      items: validated.items,
      subtotal: validated.subtotal,
      taxAmount: validated.taxAmount,
      otherCost: validated.otherCost,
      grandTotal: validated.grandTotal,
      recipientName: payload.recipientName.trim(),
      bankName: payload.bankName.trim(),
      bankAccountNumber: payload.bankAccountNumber.trim(),
      bankAccountHolder: payload.bankAccountHolder.trim(),
      recipientPhone: payload.recipientPhone?.trim() || '',
      approvalStatus: payload.submitStatus,
      paymentStatus: 'UNPROCESSED',
      createdAt: now,
      updatedAt: now,
    };

    tx.set(reqRef, newDocData);

    return {
      requestId: newId,
      prNumber,
      grandTotal: validated.grandTotal,
    };
  });

  // 5. Create immutable audit log
  await logActivity(
    user,
    payload.submitStatus === 'SUBMITTED' ? 'Membuat dan Mengajukan PR baru' : 'Menyimpan Draft PR baru',
    {
      requestId: result.requestId,
      prNumber: result.prNumber,
      newValue: payload.submitStatus,
      comment: `Total nilai pengajuan: Rp ${result.grandTotal.toLocaleString('id-ID')}`,
    }
  );

  return {
    success: true,
    requestId: result.requestId,
    prNumber: result.prNumber,
  };
}

