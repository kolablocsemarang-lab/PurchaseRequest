import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import { RequestDocument, RequestItem, ActivityLog, UserAccount, CompanySettings } from '../types';

export async function getCompanySettings(): Promise<CompanySettings> {
  const snap = await getDoc(doc(db, 'settings', 'company'));
  if (snap.exists()) {
    return snap.data() as CompanySettings;
  }
  return {
    id: 'default',
    companyName: 'PT KOTA LAMA BERSAMA',
    address: 'Jalan Letjen Suprapto No. 44, Semarang, Jawa Tengah',
    phone: '(024) 355-8989',
    email: 'info@kotalamabersama.co.id',
    logoUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=200&h=200&q=80',
    documentFooter: 'PT KOTA LAMA BERSAMA • Dokumen ini sah dan diproses secara digital melalui KLB Request System',
    prNumberFormat: 'PR/KLB/{YYYY}/{MM}/{XXXX}',
    maxFailedLoginAttempts: 5,
    taxPercentageDefault: 11,
  };
}

/**
 * Atomic counter for PR numbering to prevent duplicates across concurrent users.
 * Format: PR/KLB/YYYY/MM/XXXX
 */
export async function generateNextPrNumber(dateStr?: string): Promise<{ prNumber: string; sequenceNumber: number; year: number; month: number }> {
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const monthStr = month.toString().padStart(2, '0');
  const counterId = `counter_${year}_${monthStr}`;
  const counterRef = doc(db, 'counters', counterId);

  let nextSequence = 1;

  await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    if (!counterDoc.exists()) {
      transaction.set(counterRef, { currentSequence: 1, year, month });
      nextSequence = 1;
    } else {
      const current = counterDoc.data().currentSequence || 0;
      nextSequence = current + 1;
      transaction.update(counterRef, { currentSequence: nextSequence });
    }
  });

  const seqPadded = nextSequence.toString().padStart(4, '0');
  const prNumber = `PR/KLB/${year}/${monthStr}/${seqPadded}`;

  return { prNumber, sequenceNumber: nextSequence, year, month };
}

/**
 * Server/Backend validation of item math: Quantity * UnitPrice
 */
export function calculateAndValidateTotals(
  items: Array<{ description: string; quantity: number; unit: string; unitPrice: number }>,
  taxPercentage = 0,
  otherCost = 0
) {
  let subtotal = 0;
  const validatedItems: RequestItem[] = items.map((item, index) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const price = Math.max(0, Number(item.unitPrice) || 0);
    const total = qty * price;
    subtotal += total;
    return {
      id: `item-${index + 1}-${Date.now()}`,
      itemNumber: index + 1,
      description: item.description.trim(),
      quantity: qty,
      unit: item.unit.trim() || 'Unit',
      unitPrice: price,
      totalPrice: total,
    };
  });

  const taxAmount = (subtotal * (Math.max(0, taxPercentage) || 0)) / 100;
  const grandTotal = subtotal + taxAmount + (Math.max(0, otherCost) || 0);

  return {
    items: validatedItems,
    subtotal,
    taxAmount,
    otherCost,
    grandTotal,
  };
}

/**
 * Immutable Activity Log Logger
 */
export async function logActivity(
  user: UserAccount,
  action: string,
  options?: {
    requestId?: string;
    prNumber?: string;
    oldValue?: string;
    newValue?: string;
    comment?: string;
  }
) {
  try {
    const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const logData: ActivityLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action,
      requestId: options?.requestId,
      prNumber: options?.prNumber,
      oldValue: options?.oldValue,
      newValue: options?.newValue,
      comment: options?.comment,
    };
    await setDoc(doc(db, 'activityLogs', logId), logData);
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
}
