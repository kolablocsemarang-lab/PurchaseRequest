import React from 'react';
import { useAuth } from '../lib/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Plus,
  FileCheck2,
  CheckSquare,
  CreditCard,
  FileCheck,
  Ban,
  BarChart3,
  Users,
  Building,
  Tag,
  Scale,
  ShieldCheck,
  History,
  Settings,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { CompanySettings } from '../types';
import { KolaBlocLogo, KolaBlocSymbol } from './KolaBlocLogo';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  companySettings: CompanySettings;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, companySettings }) => {
  const { currentUser, logout, switchUserQuickDemo } = useAuth();
  if (!currentUser) return null;

  const role = currentUser.role;

  // Role permissions checks for nav items
  const canCreatePR = role === 'SUPER_ADMIN' || role === 'REQUESTER';
  const isChecker = role === 'SUPER_ADMIN' || role === 'CHECKER';
  const isApprover = role === 'SUPER_ADMIN' || role === 'APPROVER';
  const isFinance = role === 'SUPER_ADMIN' || role === 'FINANCE';
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isSuperAdmin = role === 'SUPER_ADMIN';

  const NavItem = ({ id, label, icon: Icon, badge }: { id: string; label: string; icon: any; badge?: string }) => {
    const isActive = currentTab === id;
    return (
      <button
        onClick={() => onTabChange(id)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
          isActive
            ? 'bg-[#D06224] text-white font-semibold shadow-md shadow-[#D06224]/25'
            : 'text-[#D4BCB0] hover:text-[#FFFFFF] hover:bg-[#281107]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#A67C68]'}`} />
          <span className="truncate">{label}</span>
        </div>
        {badge && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
              isActive ? 'bg-[#9C3A0A] text-white' : 'bg-[#281107] text-[#E9C892] border border-[#3E1E10]'
            }`}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-64 bg-[#180B05] border-r border-[#32170B] flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto select-none">
      {/* Kola Bloc Brand Header */}
      <div className="p-4 border-b border-[#32170B] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#281107] border border-[#AF431D]/40 flex items-center justify-center text-[#D06224] shrink-0 shadow-md">
          <KolaBlocSymbol size={22} fill="#D06224" />
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center">
            <KolaBlocLogo color="sunset" size={16} />
          </div>
          <div className="text-[10px] text-[#A67C68] truncate flex items-center gap-1.5 font-mono mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8B8635] shrink-0" />
            <span className="truncate">PT Kota Lama Bersama</span>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="p-3 space-y-4 flex-1">
        {/* Utama */}
        <div className="space-y-0.5">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#8C604D] font-mono">
            Utama
          </div>
          <NavItem id="dashboard" label="Dashboard Ringkasan" icon={LayoutDashboard} />
        </div>

        {/* Pengajuan Menu */}
        <div className="space-y-0.5">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#8C604D] font-mono">
            Pengajuan (PR)
          </div>
          {canCreatePR && (
            <button
              onClick={() => onTabChange('create-request')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-[#D06224]/15 hover:bg-[#D06224]/25 border border-[#D06224]/40 text-[#E9C892] hover:text-white mb-1.5 cursor-pointer transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-[#D06224]" />
              <span>+ Buat Pengajuan Baru</span>
            </button>
          )}
          <NavItem id="requests-all" label="Semua Pengajuan" icon={FileText} />
          {role === 'REQUESTER' && (
            <NavItem id="requests-my" label="Pengajuan Saya" icon={FileText} />
          )}
          {isChecker && (
            <NavItem id="requests-review" label="Pemeriksaan (Review)" icon={FileCheck2} />
          )}
          {isApprover && (
            <NavItem id="requests-approval" label="Persetujuan Direksi" icon={CheckSquare} />
          )}
          {isFinance && (
            <NavItem id="requests-payment" label="Antrean Pembayaran" icon={CreditCard} />
          )}
          <NavItem id="requests-completed" label="Selesai & Transfer" icon={FileCheck} />
          <NavItem id="requests-canceled" label="Ditolak / Revisi" icon={Ban} />
        </div>

        {/* Laporan */}
        {(isAdmin || isApprover || isFinance) && (
          <div className="space-y-0.5">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#8C604D] font-mono">
              Analitik & Laporan
            </div>
            <NavItem id="reports" label="Laporan & Ekspor CSV" icon={BarChart3} />
          </div>
        )}

        {/* Master Data */}
        {isAdmin && (
          <div className="space-y-0.5">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#8C604D] font-mono">
              Data Master
            </div>
            <NavItem id="master-recipients" label="Penerima & Rekening" icon={CreditCard} />
            <NavItem id="master-categories" label="Kategori Pengajuan" icon={Tag} />
            <NavItem id="master-departments" label="Daftar Departemen" icon={Building} />
            <NavItem id="master-directors" label="Direksi Penyetuju" icon={UserCheck} />
            <NavItem id="master-units" label="Satuan Standar (Unit)" icon={Scale} />
          </div>
        )}

        {/* Administrasi */}
        {isAdmin && (
          <div className="space-y-0.5">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#8C604D] font-mono">
              Administrasi & Keamanan
            </div>
            <NavItem id="admin-users" label="Manajemen Pengguna" icon={Users} />
            {isSuperAdmin && (
              <NavItem id="admin-roles" label="Matriks Role & Otorisasi" icon={ShieldCheck} />
            )}
            <NavItem id="admin-audit" label="Log Audit & Jejak Sistem" icon={History} />
          </div>
        )}

        {/* Settings */}
        {isAdmin && (
          <div className="space-y-0.5">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#8C604D] font-mono">
              Konfigurasi
            </div>
            <NavItem id="settings-company" label="Profil & Format PR" icon={Settings} />
          </div>
        )}
      </div>

      {/* User Status Card & Switcher */}
      <div className="p-3 border-t border-[#32170B] bg-[#120602]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-[#281107] border border-[#AF431D]/40 flex items-center justify-center text-xs font-semibold text-[#E9C892] shrink-0 font-mono">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-[#F7E7DE] truncate">
                {currentUser.fullName}
              </div>
              <div className="text-[10px] text-[#A67C68] truncate font-mono">
                {currentUser.role} · {currentUser.department}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Keluar (Logout)"
            className="p-1.5 text-[#A67C68] hover:text-[#E06450] hover:bg-[#281107] rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Persona quick switcher */}
        <div className="pt-2 border-t border-[#2A1207]">
          <label className="block text-[10px] text-[#8C604D] mb-1 font-mono">Uji Coba Persona:</label>
          <select
            value={currentUser.username}
            onChange={(e) => switchUserQuickDemo(e.target.value)}
            className="w-full text-[11px] bg-[#1A0A04] border border-[#3E1E10] text-[#E9C892] rounded-lg px-2 py-1 focus:outline-none focus:border-[#D06224] cursor-pointer font-mono"
          >
            <option value="superadmin">Bambang · SUPER ADMIN</option>
            <option value="admin">Dewi · ADMIN</option>
            <option value="andi.marketing">Andi · REQUESTER</option>
            <option value="checker01">Budi · CHECKER</option>
            <option value="rudi.liem">Ir. Rudi · APPROVER</option>
            <option value="finance01">Siti · FINANCE</option>
          </select>
        </div>
      </div>
    </aside>
  );
};

