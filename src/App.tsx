import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { RequestListPage } from './components/RequestListPage';
import { CreateRequestPage } from './components/CreateRequestPage';
import { RequestDetailPage } from './components/RequestDetailPage';
import { UserManagementPage } from './components/UserManagementPage';
import { MasterDataPage } from './components/MasterDataPage';
import { AuditLogPage } from './components/AuditLogPage';
import { ReportPage } from './components/ReportPage';
import { SettingsPage } from './components/SettingsPage';
import { RolesPermissionsPage } from './components/RolesPermissionsPage';
import {
  RequestDocument,
  DepartmentMaster,
  DirectorMaster,
  CategoryMaster,
  UnitMaster,
  RecipientMaster,
  CompanySettings,
  UserAccount,
  ActivityLog,
} from './types';
import {
  INITIAL_COMPANY_SETTINGS,
  INITIAL_DEPARTMENTS,
  INITIAL_DIRECTORS,
  INITIAL_CATEGORIES,
  INITIAL_UNITS,
  INITIAL_RECIPIENTS,
} from './lib/seed';
import { db } from './lib/firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';

function MainApp() {
  const { currentUser, isLoading } = useAuth();

  // Navigation State
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedRequest, setSelectedRequest] = useState<RequestDocument | null>(null);

  // Data Collections
  const [companySettings, setCompanySettings] = useState<CompanySettings>(INITIAL_COMPANY_SETTINGS);
  const [requests, setRequests] = useState<RequestDocument[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [departments, setDepartments] = useState<DepartmentMaster[]>(INITIAL_DEPARTMENTS);
  const [directors, setDirectors] = useState<DirectorMaster[]>(INITIAL_DIRECTORS);
  const [categories, setCategories] = useState<CategoryMaster[]>(INITIAL_CATEGORIES);
  const [units, setUnits] = useState<UnitMaster[]>(INITIAL_UNITS);
  const [recipients, setRecipients] = useState<RecipientMaster[]>(INITIAL_RECIPIENTS);
  const [auditLogs, setAuditLogs] = useState<ActivityLog[]>([]);

  // Load all data
  const fetchData = async () => {
    try {
      // Company Settings
      const setSnap = await getDoc(doc(db, 'settings', 'company'));
      if (setSnap.exists()) {
        setCompanySettings(setSnap.data() as CompanySettings);
      }

      // Departments
      const deptSnap = await getDocs(collection(db, 'departments'));
      if (!deptSnap.empty) {
        setDepartments(deptSnap.docs.map((d) => d.data() as DepartmentMaster));
      }

      // Directors
      const dirSnap = await getDocs(collection(db, 'directors'));
      if (!dirSnap.empty) {
        setDirectors(dirSnap.docs.map((d) => d.data() as DirectorMaster));
      }

      // Categories
      const catSnap = await getDocs(collection(db, 'categories'));
      if (!catSnap.empty) {
        setCategories(catSnap.docs.map((d) => d.data() as CategoryMaster));
      }

      // Units
      const unitSnap = await getDocs(collection(db, 'units'));
      if (!unitSnap.empty) {
        setUnits(unitSnap.docs.map((d) => d.data() as UnitMaster));
      }

      // Recipients
      const recSnap = await getDocs(collection(db, 'recipients'));
      if (!recSnap.empty) {
        setRecipients(recSnap.docs.map((d) => d.data() as RecipientMaster));
      }

      // Users
      const userSnap = await getDocs(collection(db, 'users'));
      if (!userSnap.empty) {
        setUsers(userSnap.docs.map((d) => d.data() as UserAccount));
      }
    } catch (e) {
      console.error('Error fetching auxiliary data:', e);
    }
  };

  // Real-time listener for requests and audit logs
  useEffect(() => {
    if (!currentUser) return;

    fetchData();

    // Requests listener
    const unsubRequests = onSnapshot(
      collection(db, 'requests'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as RequestDocument);
        // Sort descending by created date
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRequests(list);

        // Keep selected request synchronized
        if (selectedRequest) {
          const fresh = list.find((r) => r.id === selectedRequest.id);
          if (fresh) setSelectedRequest(fresh);
        }
      },
      (err) => console.error('Requests listener error:', err)
    );

    // Audit logs listener
    const unsubLogs = onSnapshot(
      collection(db, 'activityLogs'),
      (snap) => {
        const logs = snap.docs.map((d) => d.data() as ActivityLog);
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAuditLogs(logs);
      },
      (err) => console.error('Logs listener error:', err)
    );

    return () => {
      unsubRequests();
      unsubLogs();
    };
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#140803] flex items-center justify-center text-[#F7E7DE] text-xs font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#220D05] border border-[#AF431D]/50 flex items-center justify-center text-[#D06224] shadow-2xl">
            <svg viewBox="0 0 100 95" className="w-7 h-7" fill="none">
              <path
                d="M 12 90 L 12 42 C 12 18.8 30.8 0 54 0 C 77.2 0 96 18.8 96 42 L 96 90 L 69 90 L 69 54 C 69 45.7 62.3 39 54 39 C 45.7 39 39 45.7 39 54 L 39 90 Z"
                fill="#D06224"
              />
            </svg>
          </div>
          <div className="w-6 h-6 border-2 border-[#D06224] border-t-transparent rounded-full animate-spin" />
          <div className="text-center space-y-0.5">
            <div className="text-xs font-bold tracking-widest text-[#E9C892]">KOLA BLOC</div>
            <div className="text-[10px] text-[#A67C68]">MEMUAT SISTEM KORPORAT PT KOTA LAMA BERSAMA...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  // Filter requests according to role and data scope:
  // REQUESTER: can view only own requests (strictly scoped)
  // CHECKER / APPROVER / FINANCE / ADMIN / SUPER_ADMIN: view allowed scoped records
  const scopedRequests = requests.filter((r) => {
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN') return true;
    if (currentUser.role === 'APPROVER' || currentUser.role === 'FINANCE') return true;
    if (currentUser.role === 'CHECKER') {
      // Checker can view all requests submitted for review or department matches
      return true;
    }
    if (currentUser.role === 'REQUESTER') {
      return r.requesterUserId === currentUser.id;
    }
    return false;
  });

  return (
    <div className="min-h-screen bg-[#140803] text-[#F7E7DE] flex font-sans antialiased">
      {/* Sidebar navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setSelectedRequest(null);
          setCurrentTab(tab);
        }}
        companySettings={companySettings}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen overflow-y-auto bg-[#140803]">
        {selectedRequest ? (
          <RequestDetailPage
            request={selectedRequest}
            companySettings={companySettings}
            onBack={() => setSelectedRequest(null)}
            onRefresh={fetchData}
          />
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <Dashboard
                requests={scopedRequests}
                onNavigate={(tab) => {
                  setSelectedRequest(null);
                  setCurrentTab(tab);
                }}
                onSelectRequest={(req) => setSelectedRequest(req)}
              />
            )}

            {currentTab === 'create-request' && (
              <CreateRequestPage
                departments={departments}
                directors={directors}
                categories={categories}
                units={units}
                recipients={recipients}
                companySettings={companySettings}
                onBack={() => setCurrentTab('dashboard')}
                onSuccess={(newId) => {
                  setCurrentTab('requests-all');
                }}
              />
            )}

            {currentTab === 'requests-all' && (
              <RequestListPage
                requests={scopedRequests}
                title="Semua Pengajuan (Purchase / Payment Request)"
                onSelectRequest={(req) => setSelectedRequest(req)}
                onCreateNew={() => setCurrentTab('create-request')}
              />
            )}

            {currentTab === 'requests-my' && (
              <RequestListPage
                requests={scopedRequests.filter((r) => r.requesterUserId === currentUser.id)}
                title="Pengajuan Saya Sendiri"
                onSelectRequest={(req) => setSelectedRequest(req)}
                onCreateNew={() => setCurrentTab('create-request')}
              />
            )}

            {currentTab === 'requests-review' && (
              <RequestListPage
                requests={scopedRequests.filter(
                  (r) => r.approvalStatus === 'SUBMITTED' || r.approvalStatus === 'UNDER_REVIEW'
                )}
                title="Pengajuan Menunggu Pemeriksaan (Checker)"
                onSelectRequest={(req) => setSelectedRequest(req)}
              />
            )}

            {currentTab === 'requests-approval' && (
              <RequestListPage
                requests={scopedRequests.filter(
                  (r) => r.approvalStatus === 'VERIFIED' || r.approvalStatus === 'WAITING_APPROVAL'
                )}
                title="Pengajuan Menunggu Persetujuan Direksi (Approver)"
                onSelectRequest={(req) => setSelectedRequest(req)}
              />
            )}

            {currentTab === 'requests-payment' && (
              <RequestListPage
                requests={scopedRequests.filter(
                  (r) => r.approvalStatus === 'APPROVED' && r.paymentStatus !== 'TRANSFERRED'
                )}
                title="Pengajuan Siap Bayar (Finance & Treasury)"
                onSelectRequest={(req) => setSelectedRequest(req)}
              />
            )}

            {currentTab === 'requests-completed' && (
              <RequestListPage
                requests={scopedRequests.filter((r) => r.paymentStatus === 'TRANSFERRED')}
                title="Pengajuan Selesai & Telah Ditransfer"
                onSelectRequest={(req) => setSelectedRequest(req)}
              />
            )}

            {currentTab === 'requests-canceled' && (
              <RequestListPage
                requests={scopedRequests.filter(
                  (r) => r.approvalStatus === 'REJECTED' || r.approvalStatus === 'CANCELED'
                )}
                title="Pengajuan Ditolak / Dibatalkan"
                onSelectRequest={(req) => setSelectedRequest(req)}
              />
            )}

            {currentTab === 'reports' && <ReportPage requests={scopedRequests} />}

            {currentTab === 'master-recipients' && (
              <MasterDataPage
                type="recipients"
                recipients={recipients}
                categories={categories}
                departments={departments}
                directors={directors}
                units={units}
                onRefresh={fetchData}
              />
            )}

            {currentTab === 'master-categories' && (
              <MasterDataPage
                type="categories"
                recipients={recipients}
                categories={categories}
                departments={departments}
                directors={directors}
                units={units}
                onRefresh={fetchData}
              />
            )}

            {currentTab === 'master-departments' && (
              <MasterDataPage
                type="departments"
                recipients={recipients}
                categories={categories}
                departments={departments}
                directors={directors}
                units={units}
                onRefresh={fetchData}
              />
            )}

            {currentTab === 'master-directors' && (
              <MasterDataPage
                type="directors"
                recipients={recipients}
                categories={categories}
                departments={departments}
                directors={directors}
                units={units}
                onRefresh={fetchData}
              />
            )}

            {currentTab === 'master-units' && (
              <MasterDataPage
                type="units"
                recipients={recipients}
                categories={categories}
                departments={departments}
                directors={directors}
                units={units}
                onRefresh={fetchData}
              />
            )}

            {currentTab === 'admin-users' && (
              currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN' ? (
                <UserManagementPage users={users} onRefresh={fetchData} />
              ) : (
                <div className="p-8 text-center text-xs text-rose-400">Akses Ditolak: Anda tidak memiliki wewenang untuk melihat manajemen pengguna.</div>
              )
            )}

            {currentTab === 'admin-roles' && <RolesPermissionsPage />}

            {currentTab === 'admin-audit' && (
              currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN' ? (
                <AuditLogPage logs={auditLogs} />
              ) : (
                <div className="p-8 text-center text-xs text-rose-400">Akses Ditolak: Log aktivitas audit hanya dapat diakses oleh Super Admin dan Admin.</div>
              )
            )}

            {currentTab === 'settings-company' && (
              currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN' ? (
                <SettingsPage companySettings={companySettings} onRefresh={fetchData} />
              ) : (
                <div className="p-8 text-center text-xs text-rose-400">Akses Ditolak: Anda tidak memiliki wewenang mengubah pengaturan perusahaan.</div>
              )
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
