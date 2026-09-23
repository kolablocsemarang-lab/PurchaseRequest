import {
  collection,
  getDocs,
  setDoc,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { hashPassword } from './utils';
import {
  DepartmentMaster,
  DirectorMaster,
  CategoryMaster,
  UnitMaster,
  RecipientMaster,
  CompanySettings,
  UserAccount,
} from '../types';

export const INITIAL_COMPANY_SETTINGS: CompanySettings = {
  id: 'company',
  companyName: 'PT KOTA LAMA BERSAMA',
  address: 'Jalan Letjen Suprapto No. 44, Semarang, Jawa Tengah',
  phone: '(024) 355-8989',
  email: 'info@kotalamabersama.co.id',
  website: 'www.kotalamabersama.co.id',
  logoUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=200&h=200&q=80',
  documentFooter: 'PT KOTA LAMA BERSAMA • Dokumen ini sah dan diproses secara digital melalui KLB Request System',
  prNumberFormat: 'PR/KLB/{YYYY}/{MM}/{XXXX}',
  maxFailedLoginAttempts: 5,
  taxPercentageDefault: 11,
};

export const INITIAL_DEPARTMENTS: DepartmentMaster[] = [
  { id: 'dept-mkt', code: 'MKT', name: 'Marketing & Sales', isActive: true },
  { id: 'dept-ops', code: 'OPS', name: 'Operasional & Properti', isActive: true },
  { id: 'dept-fin', code: 'FIN', name: 'Finance & Accounting', isActive: true },
  { id: 'dept-it', code: 'IT', name: 'Information Technology', isActive: true },
  { id: 'dept-hr', code: 'HR', name: 'Human Resources & GA', isActive: true },
  { id: 'dept-maint', code: 'MNT', name: 'Maintenance & Facility', isActive: true },
  { id: 'dept-sec', code: 'SEC', name: 'Security & Safety', isActive: true },
];

export const INITIAL_DIRECTORS: DirectorMaster[] = [
  { id: 'dir-1', name: 'Ir. Rudianto Liem', title: 'Direktur Utama', department: 'Executive', isActive: true },
  { id: 'dir-2', name: 'Hendra Setiawan, SE', title: 'Direktur Keuangan & Operasional', department: 'Executive', isActive: true },
  { id: 'dir-3', name: 'Maya Santoso, M.B.A', title: 'Direktur Komersial & Pengembangan', department: 'Executive', isActive: true },
];

export const INITIAL_CATEGORIES: CategoryMaster[] = [
  { id: 'cat-1', name: 'Pengadaan Barang', code: 'PB', order: 1, isActive: true },
  { id: 'cat-2', name: 'Pengadaan Jasa / Vendor', code: 'PJ', order: 2, isActive: true },
  { id: 'cat-3', name: 'Operasional', code: 'OPS', order: 3, isActive: true },
  { id: 'cat-4', name: 'Maintenance & Repair', code: 'MNR', order: 4, isActive: true },
  { id: 'cat-5', name: 'Marketing & Promotion', code: 'MKT', order: 5, isActive: true },
  { id: 'cat-6', name: 'Event & Activity', code: 'EVT', order: 6, isActive: true },
  { id: 'cat-7', name: 'IT / Software / Subscription', code: 'IT', order: 7, isActive: true },
  { id: 'cat-8', name: 'Office Supplies', code: 'ATK', order: 8, isActive: true },
  { id: 'cat-9', name: 'Transportasi', code: 'TRP', order: 9, isActive: true },
  { id: 'cat-10', name: 'Travel / Business Trip', code: 'TRV', order: 10, isActive: true },
  { id: 'cat-11', name: 'Reimbursement', code: 'RMB', order: 11, isActive: true },
  { id: 'cat-12', name: 'Cash Advance', code: 'CAD', order: 12, isActive: true },
  { id: 'cat-13', name: 'Asset / CAPEX', code: 'CPX', order: 13, isActive: true },
  { id: 'cat-14', name: 'HR / Employee Expense', code: 'HRE', order: 14, isActive: true },
  { id: 'cat-15', name: 'Utilities / Rental', code: 'UTL', order: 15, isActive: true },
  { id: 'cat-16', name: 'Professional Fee', code: 'PRF', order: 16, isActive: true },
  { id: 'cat-17', name: 'Project Expense', code: 'PRJ', order: 17, isActive: true },
  { id: 'cat-18', name: 'Lain-lain', code: 'OTH', order: 18, isActive: true },
];

export const INITIAL_UNITS: UnitMaster[] = [
  { id: 'u-1', name: 'Pcs', isActive: true },
  { id: 'u-2', name: 'Unit', isActive: true },
  { id: 'u-3', name: 'Set', isActive: true },
  { id: 'u-4', name: 'Box', isActive: true },
  { id: 'u-5', name: 'Pack', isActive: true },
  { id: 'u-6', name: 'Rim', isActive: true },
  { id: 'u-7', name: 'Kg', isActive: true },
  { id: 'u-8', name: 'Gram', isActive: true },
  { id: 'u-9', name: 'Liter', isActive: true },
  { id: 'u-10', name: 'Meter', isActive: true },
  { id: 'u-11', name: 'Jam', isActive: true },
  { id: 'u-12', name: 'Hari', isActive: true },
  { id: 'u-13', name: 'Bulan', isActive: true },
  { id: 'u-14', name: 'Pax', isActive: true },
  { id: 'u-15', name: 'Lot', isActive: true },
  { id: 'u-16', name: 'Service', isActive: true },
];

export const INITIAL_RECIPIENTS: RecipientMaster[] = [
  {
    id: 'rec-1',
    name: 'CV Mitra Jaya Mandiri (Supplier ATK & Kertas)',
    bankName: 'BCA (Bank Central Asia)',
    bankAccountNumber: '0351239844',
    bankAccountHolder: 'CV Mitra Jaya Mandiri',
    phone: '081234567890',
    email: 'finance@mitrajaya.com',
    notes: 'Vendor ATK rutin kantor',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'rec-2',
    name: 'PT Media Promosi Kreatif',
    bankName: 'Bank Mandiri',
    bankAccountNumber: '1360009876543',
    bankAccountHolder: 'PT Media Promosi Kreatif',
    phone: '081398765432',
    email: 'billing@mediapromosi.co.id',
    notes: 'Agency advertising & billboard Kota Lama',
    isActive: true,
    createdAt: '2026-01-05T00:00:00Z',
  },
  {
    id: 'rec-3',
    name: 'Bengkel Teknik Prima (AC & Genset)',
    bankName: 'Bank BNI',
    bankAccountNumber: '0289123456',
    bankAccountHolder: 'Suryadi (Teknik Prima)',
    phone: '081566778899',
    email: 'teknikprima@gmail.com',
    notes: 'Vendor perawatan pendingin & MEP',
    isActive: true,
    createdAt: '2026-01-10T00:00:00Z',
  },
  {
    id: 'rec-4',
    name: 'Andi Kusuma (Kasbon / Petty Cash Marketing)',
    bankName: 'BCA (Bank Central Asia)',
    bankAccountNumber: '8030554129',
    bankAccountHolder: 'Andi Kusuma',
    phone: '081299887766',
    email: 'andi.marketing@kotalamabersama.co.id',
    notes: 'Internal Staff Marketing',
    isActive: true,
    createdAt: '2026-01-15T00:00:00Z',
  },
];

export const INITIAL_PRESET_USERS: UserAccount[] = [
  {
    id: 'usr-superadmin',
    username: 'superadmin',
    fullName: 'Bambang Soedirgo',
    email: 'superadmin@kotalamabersama.co.id',
    phone: '0811000001',
    jobTitle: 'Chief Executive & System Overseer',
    department: 'Executive Management',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    failedAttempts: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr-admin',
    username: 'admin',
    fullName: 'Dewi Sartika',
    email: 'admin@kotalamabersama.co.id',
    phone: '0811000002',
    jobTitle: 'Corporate General Administrator',
    department: 'Human Resources & GA',
    role: 'ADMIN',
    status: 'ACTIVE',
    failedAttempts: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr-andi',
    username: 'andi.marketing',
    fullName: 'Andi Kusuma, S.I.Kom',
    email: 'andi.marketing@kotalamabersama.co.id',
    phone: '081299887766',
    jobTitle: 'Senior Marketing Specialist',
    department: 'Marketing & Sales',
    role: 'REQUESTER',
    status: 'ACTIVE',
    failedAttempts: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr-checker',
    username: 'checker01',
    fullName: 'Budi Hartono, S.T.',
    email: 'checker01@kotalamabersama.co.id',
    phone: '0811000004',
    jobTitle: 'Department Head / Operational Verifier',
    department: 'Operasional & Properti',
    role: 'CHECKER',
    status: 'ACTIVE',
    failedAttempts: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr-approver',
    username: 'rudi.liem',
    fullName: 'Ir. Rudianto Liem',
    email: 'rudi.liem@kotalamabersama.co.id',
    phone: '0811000005',
    jobTitle: 'Direktur Utama',
    department: 'Executive',
    role: 'APPROVER',
    status: 'ACTIVE',
    failedAttempts: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr-finance',
    username: 'finance01',
    fullName: 'Siti Nurhaliza, S.Ak',
    email: 'finance01@kotalamabersama.co.id',
    phone: '0811000006',
    jobTitle: 'Finance & Treasury Officer',
    department: 'Finance & Accounting',
    role: 'FINANCE',
    status: 'ACTIVE',
    failedAttempts: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export async function seedInitialDatabaseIfEmpty() {
  try {
    const settingsSnap = await getDocs(collection(db, 'settings'));
    if (!settingsSnap.empty) {
      return; // already initialized
    }

    console.log('Seeding initial master data to Firestore...');
    const now = new Date().toISOString();
    const defaultPasswordHash = await hashPassword('password123');

    // 1. Company Settings
    await setDoc(doc(db, 'settings', 'company'), INITIAL_COMPANY_SETTINGS);

    // 2. Initial Users
    const users = INITIAL_PRESET_USERS.map((u) => ({
      ...u,
      passwordHash: defaultPasswordHash,
      createdAt: now,
    }));

    const batch = writeBatch(db);

    users.forEach((u) => {
      batch.set(doc(db, 'users', u.id), u);
    });

    INITIAL_DEPARTMENTS.forEach((d) => {
      batch.set(doc(db, 'departments', d.id), d);
    });

    INITIAL_DIRECTORS.forEach((d) => {
      batch.set(doc(db, 'directors', d.id), d);
    });

    INITIAL_CATEGORIES.forEach((c) => {
      batch.set(doc(db, 'categories', c.id), c);
    });

    INITIAL_UNITS.forEach((u) => {
      batch.set(doc(db, 'units', u.id), u);
    });

    INITIAL_RECIPIENTS.forEach((r) => {
      batch.set(doc(db, 'recipients', r.id), r);
    });

    await batch.commit();
    console.log('Seeding completed successfully!');
  } catch (err) {
    console.warn('Notice: Firestore remote seed deferred, using resilient local master data:', err);
  }
}
