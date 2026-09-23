import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { ActivityLog } from '../types';
import { formatDateTimeIndo } from '../lib/utils';
import { History, Search, Shield, Filter } from 'lucide-react';

interface AuditLogPageProps {
  logs: ActivityLog[];
}

export const AuditLogPage: React.FC<AuditLogPageProps> = ({ logs }) => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  if (!currentUser) return null;

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.userName && log.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.action && log.action.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.prNumber && log.prNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.comment && log.comment.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = !roleFilter || log.userRole === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#F7E7DE] tracking-tight flex items-center gap-2">
              <span>Audit Trail & Log Aktivitas Sistem</span>
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#281107] text-[#E9C892] font-mono border border-[#4A2413]">
              IMMUTABLE
            </span>
          </div>
          <p className="text-xs text-[#A67C68] mt-1 font-mono">
            Catatan kekal (immutable ledger) seluruh riwayat pembuatan, persetujuan, dan pencairan · Kola Bloc · PT Kota Lama Bersama
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-[#180B05] border border-[#3E1E10] p-3 rounded-xl flex flex-col sm:flex-row gap-3 text-xs shadow-md">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[#8C604D] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama pengguna, nomor PR, tindakan, atau keterangan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] placeholder-[#8C604D] focus:outline-none focus:border-[#D06224] font-mono text-xs"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] focus:outline-none focus:border-[#D06224] cursor-pointer font-mono text-xs"
          >
            <option value="">Semua Peran (Role)</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="ADMIN">ADMIN</option>
            <option value="REQUESTER">REQUESTER</option>
            <option value="CHECKER">CHECKER</option>
            <option value="APPROVER">APPROVER</option>
            <option value="FINANCE">FINANCE</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#180B05] border border-[#3E1E10] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#140803] text-[#A67C68] border-b border-[#32170B] font-mono">
              <tr>
                <th className="p-3.5">Waktu Transaksi</th>
                <th className="p-3.5">Pegawai / User</th>
                <th className="p-3.5 text-center">Peran</th>
                <th className="p-3.5">No. PR Terkait</th>
                <th className="p-3.5">Tindakan</th>
                <th className="p-3.5">Catatan / Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D1409] text-[#D4BCB0]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#8C604D] font-mono">
                    Belum ada riwayat aktivitas yang tercatat.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#281107] transition">
                    <td className="p-3.5 text-[#8C604D] whitespace-nowrap font-mono text-[11px] tabular-nums">
                      {formatDateTimeIndo(log.timestamp)}
                    </td>
                    <td className="p-3.5 font-semibold text-[#F7E7DE] whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#281107] text-[#E9C892] border border-[#4A2413]">
                        {log.userRole}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[#D06224] font-bold whitespace-nowrap">
                      {log.prNumber || '-'}
                    </td>
                    <td className="p-3.5 font-medium text-[#F7E7DE]">
                      {log.action}
                    </td>
                    <td className="p-3.5 text-[#A67C68] max-w-[320px] truncate font-mono text-[11px]">
                      {log.comment || (log.newValue ? `Nilai Baru: ${log.newValue}` : '-')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
