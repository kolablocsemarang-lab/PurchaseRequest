import React from 'react';
import { useAuth } from '../lib/AuthContext';
import { RequestDocument } from '../types';
import { formatRupiah, formatDateIndo } from '../lib/utils';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Plus,
  ArrowUpRight,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { KolaBlocArchPattern } from './KolaBlocLogo';

interface DashboardProps {
  requests: RequestDocument[];
  onNavigate: (tab: string, filter?: string) => void;
  onSelectRequest: (req: RequestDocument) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ requests, onNavigate, onSelectRequest }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const role = currentUser.role;

  // Filter scoped data
  const myRequests = requests.filter((r) => r.requesterUserId === currentUser.id);
  const pendingReview = requests.filter((r) => r.approvalStatus === 'SUBMITTED' || r.approvalStatus === 'UNDER_REVIEW');
  const pendingApproval = requests.filter((r) => r.approvalStatus === 'VERIFIED' || r.approvalStatus === 'WAITING_APPROVAL');
  const readyForPayment = requests.filter((r) => r.approvalStatus === 'APPROVED' && (r.paymentStatus === 'WAITING_PAYMENT' || r.paymentStatus === 'PAYMENT_PROCESSING' || r.paymentStatus === 'UNPROCESSED'));
  const transferred = requests.filter((r) => r.paymentStatus === 'TRANSFERRED' || r.paymentStatus === 'COMPLETED');

  // Total nominal transferred
  const totalTransferredAmount = transferred.reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);
  const totalPendingPaymentAmount = readyForPayment.reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Executive Header Banner */}
      <div className="bg-[#1D0C05] border border-[#3E1E10] p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-48 opacity-15 pointer-events-none">
          <KolaBlocArchPattern strokeColor="#E9C892" opacity={0.3} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-[10px] text-[#A67C68] font-mono mb-1.5 uppercase tracking-wider">
            <span className="text-[#E9C892] font-semibold">KOLA BLOC</span>
            <span>·</span>
            <span>PT Kota Lama Bersama</span>
            <span>/</span>
            <span>Dashboard Eksekutif</span>
          </div>
          <h1 className="text-xl font-bold text-[#F7E7DE] tracking-tight">
            Selamat datang, {currentUser.fullName}
          </h1>
          <p className="text-xs text-[#A67C68] mt-1 font-mono">
            {currentUser.jobTitle} · Departemen: {currentUser.department} · Peran: <span className="text-[#E9C892] font-bold">{currentUser.role}</span>
          </p>
        </div>

        {(role === 'REQUESTER' || role === 'SUPER_ADMIN') && (
          <button
            onClick={() => onNavigate('create-request')}
            className="relative z-10 self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D06224] hover:bg-[#B7521B] active:bg-[#AF431D] text-white font-bold text-xs transition cursor-pointer shadow-lg shadow-[#D06224]/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Pengajuan Baru</span>
          </button>
        )}
      </div>

      {/* Role-Specific Metric Cards */}
      {role === 'REQUESTER' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#1D0C05] border border-[#3E1E10] p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-[#A67C68] font-medium">
              <span>Pengajuan Saya</span>
              <FileText className="w-4 h-4 text-[#8C604D]" />
            </div>
            <div className="text-2xl font-bold text-[#F7E7DE] mt-3 font-mono tabular-nums">
              {myRequests.length}
            </div>
            <div className="text-[11px] text-[#8C604D] mt-1 font-mono">Total dokumen diajukan</div>
          </div>

          <div className="bg-[#1D0C05] border border-[#3E1E10] p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-[#A67C68] font-medium">
              <span>Menunggu Review</span>
              <Clock className="w-4 h-4 text-[#D06224]" />
            </div>
            <div className="text-2xl font-bold text-[#D06224] mt-3 font-mono tabular-nums">
              {myRequests.filter((r) => r.approvalStatus === 'SUBMITTED' || r.approvalStatus === 'UNDER_REVIEW').length}
            </div>
            <div className="text-[11px] text-[#8C604D] mt-1 font-mono">Sedang diperiksa Checker</div>
          </div>

          <div className="bg-[#1D0C05] border border-[#3E1E10] p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-[#A67C68] font-medium">
              <span>Menunggu Otorisasi</span>
              <UserCheck className="w-4 h-4 text-[#E9C892]" />
            </div>
            <div className="text-2xl font-bold text-[#E9C892] mt-3 font-mono tabular-nums">
              {myRequests.filter((r) => r.approvalStatus === 'VERIFIED' || r.approvalStatus === 'WAITING_APPROVAL').length}
            </div>
            <div className="text-[11px] text-[#8C604D] mt-1 font-mono">Di meja Direksi</div>
          </div>

          <div className="bg-[#1D0C05] border border-[#3E1E10] p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-[#A67C68] font-medium">
              <span>Disetujui / Selesai</span>
              <CheckCircle2 className="w-4 h-4 text-[#8B8635]" />
            </div>
            <div className="text-2xl font-bold text-[#A5A041] mt-3 font-mono tabular-nums">
              {myRequests.filter((r) => r.approvalStatus === 'APPROVED').length}
            </div>
            <div className="text-[11px] text-[#8C604D] mt-1 font-mono">Siap bayar / telah ditransfer</div>
          </div>
        </div>
      )}

      {role === 'CHECKER' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#1D0C05] border border-[#3E1E10] p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-[#A67C68] font-medium">
              <span>Menunggu Pemeriksaan</span>
              <Clock className="w-4 h-4 text-[#D06224]" />
            </div>
            <div className="text-2xl font-bold text-[#D06224] mt-3 font-mono tabular-nums">
              {pendingReview.length}
            </div>
            <div className="text-[11px] text-[#8C604D] mt-1 font-mono">Perlu diverifikasi departemen</div>
          </div>

          <div className="bg-[#1D0C05] border border-[#3E1E10] p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-[#A67C68] font-medium">
              <span>Perlu Revisi Pengaju</span>
              <AlertCircle className="w-4 h-4 text-[#E06450]" />
            </div>
            <div className="text-2xl font-bold text-[#E06450] mt-3 font-mono tabular-nums">
              {requests.filter((r) => r.approvalStatus === 'REVISION_REQUIRED').length}
            </div>
            <div className="text-[11px] text-[#8C604D] mt-1 font-mono">Dikembalikan ke pembuat PR</div>
          </div>

          <div className="bg-[#1D0C05] border border-[#3E1E10] p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-[#A67C68] font-medium">
              <span>Telah Terverifikasi</span>
              <CheckCircle2 className="w-4 h-4 text-[#8B8635]" />
            </div>
            <div className="text-2xl font-bold text-[#A5A041] mt-3 font-mono tabular-nums">
              {requests.filter((r) => r.approvalStatus === 'VERIFIED' || r.approvalStatus === 'APPROVED').length}
            </div>
            <div className="text-[11px] text-[#8C604D] mt-1 font-mono">Diteruskan ke meja Direksi</div>
          </div>
        </div>
      )}

      {role === 'APPROVER' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#1D0C05] border border-[#3E1E10] p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-[#A67C68] font-medium">
              <span>Menunggu Persetujuan Direksi</span>
              <UserCheck className="w-4 h-4 text-[#D06224]" />
            </div>
            <div className="text-2xl font-bold text-[#D06224] mt-3 font-mono tabular-nums">
              {pendingApproval.length}
            </div>
            <div className="text-[11px] text-[#8C604D] mt-1 font-mono">Memerlukan otorisasi formal Anda</div>
          </div>

          <div className="bg-[#1D0C05] border border-[#3E1E10] p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-[#A67C68] font-medium">
              <span>Telah Disetujui</span>
              <CheckCircle2 className="w-4 h-4 text-[#8B8635]" />
            </div>
            <div className="text-2xl font-bold text-[#A5A041] mt-3 font-mono tabular-nums">
              {requests.filter((r) => r.approvalStatus === 'APPROVED').length}
            </div>
            <div className="text-[11px] text-[#8C604D] mt-1 font-mono">Diteruskan ke Finance untuk transfer</div>
          </div>

          <div className="bg-[#1D0C05] border border-[#3E1E10] p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-[#A67C68] font-medium">
              <span>Ditolak / Dikembalikan</span>
              <AlertCircle className="w-4 h-4 text-[#E06450]" />
            </div>
            <div className="text-2xl font-bold text-[#E06450] mt-3 font-mono tabular-nums">
              {requests.filter((r) => r.approvalStatus === 'REJECTED' || r.approvalStatus === 'REVISION_REQUIRED').length}
            </div>
            <div className="text-[11px] text-[#8C604D] mt-1 font-mono">Perlu perbaikan proposal</div>
          </div>
        </div>
      )}

      {role === 'FINANCE' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#1D0C05] border border-[#3E1E10] p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-[#A67C68] font-medium">
              <span>Menunggu Pembayaran</span>
              <CreditCard className="w-4 h-4 text-[#D06224]" />
            </div>
            <div className="text-2xl font-bold text-[#D06224] mt-3 font-mono tabular-nums">
              {readyForPayment.length}
            </div>
            <div className="text-[11px] text-[#E9C892] mt-1 font-mono tabular-nums">{formatRupiah(totalPendingPaymentAmount)}</div>
          </div>

          <div className="bg-[#1D0C05] border border-[#3E1E10] p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-[#A67C68] font-medium">
              <span>Sedang Diproses</span>
              <Clock className="w-4 h-4 text-[#E9C892]" />
            </div>
            <div className="text-2xl font-bold text-[#E9C892] mt-3 font-mono tabular-nums">
              {requests.filter((r) => r.paymentStatus === 'PAYMENT_PROCESSING').length}
            </div>
            <div className="text-[11px] text-[#8C604D] mt-1 font-mono">Antrean kliring / BI-FAST</div>
          </div>

          <div className="bg-[#1D0C05] border border-[#3E1E10] p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-[#A67C68] font-medium">
              <span>Pembayaran Ditahan (Hold)</span>
              <AlertCircle className="w-4 h-4 text-[#E06450]" />
            </div>
            <div className="text-2xl font-bold text-[#E06450] mt-3 font-mono tabular-nums">
              {requests.filter((r) => r.paymentStatus === 'PAYMENT_HOLD').length}
            </div>
            <div className="text-[11px] text-[#8C604D] mt-1 font-mono">Perlu konfirmasi vendor/rekening</div>
          </div>

          <div className="bg-[#1D0C05] border border-[#3E1E10] p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-[#A67C68] font-medium">
              <span>Realisasi Transfer</span>
              <CheckCircle2 className="w-4 h-4 text-[#8B8635]" />
            </div>
            <div className="text-2xl font-bold text-[#A5A041] mt-3 font-mono tabular-nums">
              {transferred.length}
            </div>
            <div className="text-[11px] text-[#A5A041] mt-1 font-mono tabular-nums">{formatRupiah(totalTransferredAmount)}</div>
          </div>
        </div>
      )}

      {(role === 'ADMIN' || role === 'SUPER_ADMIN') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#1D0C05] border border-[#3E1E10] p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-[#A67C68] font-medium">
              <span>Total Seluruh PR</span>
              <FileText className="w-4 h-4 text-[#8C604D]" />
            </div>
            <div className="text-2xl font-bold text-[#F7E7DE] mt-3 font-mono tabular-nums">
              {requests.length}
            </div>
            <div className="text-[11px] text-[#8C604D] mt-1 font-mono">Dokumen terdaftar di sistem</div>
          </div>

          <div className="bg-[#1D0C05] border border-[#3E1E10] p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-[#A67C68] font-medium">
              <span>Dalam Alur Persetujuan</span>
              <Clock className="w-4 h-4 text-[#D06224]" />
            </div>
            <div className="text-2xl font-bold text-[#D06224] mt-3 font-mono tabular-nums">
              {pendingReview.length + pendingApproval.length}
            </div>
            <div className="text-[11px] text-[#8C604D] mt-1 font-mono">Review & Persetujuan Direksi</div>
          </div>

          <div className="bg-[#1D0C05] border border-[#3E1E10] p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-[#A67C68] font-medium">
              <span>Antrean Pembayaran</span>
              <CreditCard className="w-4 h-4 text-[#E9C892]" />
            </div>
            <div className="text-2xl font-bold text-[#E9C892] mt-3 font-mono tabular-nums">
              {readyForPayment.length}
            </div>
            <div className="text-[11px] text-[#E9C892] mt-1 font-mono tabular-nums">{formatRupiah(totalPendingPaymentAmount)}</div>
          </div>

          <div className="bg-[#1D0C05] border border-[#3E1E10] p-5 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-[#A67C68] font-medium">
              <span>Total Realisasi Bayar</span>
              <TrendingUp className="w-4 h-4 text-[#8B8635]" />
            </div>
            <div className="text-2xl font-bold text-[#A5A041] mt-3 font-mono tabular-nums">
              {transferred.length} PR
            </div>
            <div className="text-[11px] text-[#A5A041] mt-1 font-mono tabular-nums">{formatRupiah(totalTransferredAmount)}</div>
          </div>
        </div>
      )}

      {/* Recent Requests Table Section */}
      <div className="bg-[#1D0C05] border border-[#3E1E10] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-[#32170B] flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-[#F7E7DE] uppercase tracking-wider font-mono">
              Pengajuan Terkini
            </h3>
            <p className="text-[11px] text-[#A67C68] mt-0.5">Daftar transaksi pengadaan dan pembayaran terbaru</p>
          </div>
          <button
            onClick={() => onNavigate('requests-all')}
            className="text-xs text-[#E9C892] hover:text-white font-semibold flex items-center gap-1 cursor-pointer transition"
          >
            <span>Buka Semua</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#140803] text-[#A67C68] border-b border-[#32170B]">
              <tr>
                <th className="p-3.5 font-semibold font-mono">Nomor PR</th>
                <th className="p-3.5 font-semibold">Tanggal</th>
                <th className="p-3.5 font-semibold">Pengaju</th>
                <th className="p-3.5 font-semibold">Departemen</th>
                <th className="p-3.5 font-semibold">Perihal Pengadaan</th>
                <th className="p-3.5 font-semibold text-right font-mono">Grand Total</th>
                <th className="p-3.5 font-semibold text-center">Status Approval</th>
                <th className="p-3.5 font-semibold text-center">Status Pembayaran</th>
                <th className="p-3.5 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D1409] text-[#D4BCB0]">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-[#8C604D]">
                    Belum ada rekaman data pengajuan dalam sistem.
                  </td>
                </tr>
              ) : (
                requests.slice(0, 7).map((req) => (
                  <tr key={req.id} className="hover:bg-[#281107] transition">
                    <td className="p-3.5 font-mono font-bold text-[#D06224]">{req.prNumber}</td>
                    <td className="p-3.5 text-[#A67C68] font-mono text-[11px]">{formatDateIndo(req.requestDate)}</td>
                    <td className="p-3.5 font-semibold text-[#F7E7DE]">{req.requesterName}</td>
                    <td className="p-3.5 text-[#A67C68]">{req.department}</td>
                    <td className="p-3.5 text-[#E0CCC2] max-w-[220px] truncate">{req.subject}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-[#E9C892] tabular-nums">
                      {formatRupiah(req.grandTotal)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-mono font-semibold rounded ${
                        req.approvalStatus === 'APPROVED'
                          ? 'bg-[#2A3111] text-[#A5A041] border border-[#8B8635]/60'
                          : req.approvalStatus === 'REJECTED'
                          ? 'bg-[#3A1009] text-[#E06450] border border-[#8B3518]'
                          : req.approvalStatus === 'REVISION_REQUIRED'
                          ? 'bg-[#3A2209] text-[#E9C892] border border-[#AF431D]/60'
                          : req.approvalStatus === 'DRAFT'
                          ? 'bg-[#220F07] text-[#A67C68] border border-[#3E1E10]'
                          : 'bg-[#33180B] text-[#D06224] border border-[#AF431D]/60'
                      }`}>
                        {req.approvalStatus}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-mono font-semibold rounded ${
                        req.paymentStatus === 'TRANSFERRED'
                          ? 'bg-[#2A3111] text-[#A5A041] border border-[#8B8635]/60'
                          : req.paymentStatus === 'PAYMENT_HOLD'
                          ? 'bg-[#3A1009] text-[#E06450] border border-[#8B3518]'
                          : req.paymentStatus === 'PAYMENT_PROCESSING'
                          ? 'bg-[#33180B] text-[#D06224] border border-[#AF431D]/60'
                          : 'bg-[#220F07] text-[#A67C68] border border-[#3E1E10]'
                      }`}>
                        {req.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => onSelectRequest(req)}
                        className="px-3 py-1 rounded-lg bg-[#140803] hover:bg-[#281107] text-[#E9C892] hover:text-white border border-[#3E1E10] text-[11px] font-semibold transition cursor-pointer"
                      >
                        Detail
                      </button>
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


