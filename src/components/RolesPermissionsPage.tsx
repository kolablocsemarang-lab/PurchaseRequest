import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { UserRole } from '../types';
import { ROLE_PERMISSIONS, PERMISSIONS, PermissionCode } from '../lib/permissions';
import { ShieldCheck, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export const RolesPermissionsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('REQUESTER');

  if (!currentUser) return null;

  const rolesList: UserRole[] = [
    'REQUESTER',
    'CHECKER',
    'APPROVER',
    'FINANCE',
    'ADMIN',
    'SUPER_ADMIN',
  ];

  const roleDescriptions: Record<UserRole, string> = {
    REQUESTER: 'Membuat draf pengajuan, melampirkan berkas, mengirimkan pengajuan, dan memantau status miliknya sendiri.',
    CHECKER: 'Memeriksa kelengkapan proposal pengadaan tingkat departemen, meminta revisi, menolak, atau memverifikasi ke Direksi.',
    APPROVER: 'Direksi dengan hak otorisasi menyetujui (approve), menolak, atau mengembalikan pengajuan belanja modal/operasional.',
    FINANCE: 'Bagian Keuangan yang memproses pencairan kas/transfer bank, menahan (hold), dan mengunggah bukti transfer.',
    ADMIN: 'Administrator korporat pengelola master data departemen, kategori, direksi, dan manajemen akun staf.',
    SUPER_ADMIN: 'Pemilik sistem dengan hak akses tak terbatas ke seluruh data, konfigurasi peran, dan audit trail.',
  };

  const allPermissionList = Object.entries(PERMISSIONS);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 font-sans">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[#F7E7DE] tracking-tight flex items-center gap-2">
            <span>Matriks Hak Akses & Peran (RBAC)</span>
          </h1>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#281107] text-[#E9C892] font-mono border border-[#4A2413]">
            GOVERNANCE
          </span>
        </div>
        <p className="text-xs text-[#A67C68] mt-1 font-mono">
          Otorisasi granular tingkat izin untuk kepatuhan tata kelola internal · Kola Bloc · PT Kota Lama Bersama
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Role List Selector */}
        <div className="bg-[#180B05] border border-[#3E1E10] rounded-2xl p-4 space-y-2 shadow-xl">
          <span className="text-[11px] font-mono text-[#A67C68] uppercase tracking-wider block mb-2 px-2">
            Peran Pengguna
          </span>
          {rolesList.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={`w-full text-left p-3 rounded-xl transition text-xs font-medium cursor-pointer ${
                selectedRole === r
                  ? 'bg-[#D06224] text-white font-bold shadow-lg shadow-[#D06224]/20'
                  : 'bg-[#140803] hover:bg-[#281107] text-[#D4BCB0] border border-[#3E1E10]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono">{r}</span>
                <span className="text-[10px] opacity-80 font-mono">
                  {r === 'SUPER_ADMIN' ? 'Full Access' : `${ROLE_PERMISSIONS[r].length} hak`}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Detailed Permissions for Selected Role */}
        <div className="md:col-span-2 bg-[#180B05] border border-[#3E1E10] rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="border-b border-[#32170B] pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#F7E7DE] tracking-tight">
                Hak Akses: <span className="text-[#D06224] font-mono">{selectedRole}</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#281107] text-[#E9C892] border border-[#4A2413]">
                ACTIVE RBAC
              </span>
            </div>
            <p className="text-xs text-[#A67C68] mt-1.5 leading-relaxed font-mono text-[11px]">
              {roleDescriptions[selectedRole]}
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-[#E9C892] uppercase tracking-wider font-mono block">
              Daftar Izin & Otorisasi
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {allPermissionList.map(([key, code]) => {
                const isGranted =
                  selectedRole === 'SUPER_ADMIN' ||
                  ROLE_PERMISSIONS[selectedRole].includes(code as PermissionCode);

                return (
                  <div
                    key={key}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      isGranted
                        ? 'bg-[#2A3111]/30 border-[#8B8635]/50 text-[#E9C892]'
                        : 'bg-[#140803] border-[#32170B] text-[#8C604D] opacity-60'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-mono text-[11px] font-bold">{code}</div>
                      <div className="text-[10px] text-[#A67C68] font-mono truncate">{key}</div>
                    </div>
                    {isGranted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#A5A041] shrink-0" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-[#6D4233] shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
