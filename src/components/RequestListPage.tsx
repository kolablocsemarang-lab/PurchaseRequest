import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { RequestDocument } from '../types';
import { formatRupiah, formatDateIndo } from '../lib/utils';
import { Search, Plus, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

interface RequestListPageProps {
  requests: RequestDocument[];
  title: string;
  defaultStatusFilter?: string;
  onSelectRequest: (req: RequestDocument) => void;
  onCreateNew?: () => void;
}

export const RequestListPage: React.FC<RequestListPageProps> = ({
  requests,
  title,
  defaultStatusFilter,
  onSelectRequest,
  onCreateNew,
}) => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(defaultStatusFilter || '');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (!currentUser) return null;

  // Filter requests
  const filtered = requests.filter((req) => {
    // Search by PR number, requester, subject
    const matchesSearch =
      req.prNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.subject.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = !departmentFilter || req.department === departmentFilter;
    const matchesCategory = !categoryFilter || req.category === categoryFilter;
    
    let matchesStatus = true;
    if (statusFilter) {
      matchesStatus =
        req.approvalStatus === statusFilter ||
        req.paymentStatus === statusFilter ||
        (statusFilter === 'WAITING_REVIEW' && (req.approvalStatus === 'SUBMITTED' || req.approvalStatus === 'UNDER_REVIEW')) ||
        (statusFilter === 'WAITING_APPROVAL' && (req.approvalStatus === 'VERIFIED' || req.approvalStatus === 'WAITING_APPROVAL')) ||
        (statusFilter === 'WAITING_PAYMENT' && req.approvalStatus === 'APPROVED' && req.paymentStatus !== 'TRANSFERRED') ||
        (statusFilter === 'COMPLETED' && req.paymentStatus === 'TRANSFERRED');
    }

    return matchesSearch && matchesDept && matchesCategory && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedRequests = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="text-[10px] text-[#A67C68] font-mono uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span className="text-[#E9C892] font-semibold">KOLA BLOC</span>
            <span>·</span>
            <span>PT KOTA LAMA BERSAMA</span>
          </div>
          <h1 className="text-xl font-bold text-[#F7E7DE] tracking-tight">{title}</h1>
          <p className="text-xs text-[#A67C68] mt-1 font-mono">
            Menampilkan <span className="text-[#E9C892] font-bold">{filtered.length}</span> rekaman permohonan pengajuan aktif
          </p>
        </div>

        {onCreateNew && (currentUser.role === 'REQUESTER' || currentUser.role === 'SUPER_ADMIN') && (
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D06224] hover:bg-[#B7521B] active:bg-[#AF431D] text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-[#D06224]/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Pengajuan Baru</span>
          </button>
        )}
      </div>

      {/* Contextual Queue Notice for Approval or Payment */}
      {title.includes('Persetujuan Direksi') && (
        <div className="p-3.5 rounded-xl bg-[#281107] border border-[#AF431D]/40 text-xs flex items-center justify-between font-mono">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#E9C892] animate-pulse" />
            <span className="text-[#F7E7DE] font-semibold">Antrean Persetujuan Direksi (Approver Queue):</span>
            <span className="text-[#A67C68]">Dokumen telah diverifikasi kelayakan anggarannya oleh Checker dan menunggu keputusan Direktur.</span>
          </div>
          <span className="text-[11px] text-[#E9C892] font-bold">{filtered.length} Menunggu</span>
        </div>
      )}

      {title.includes('Siap Bayar') && (
        <div className="p-3.5 rounded-xl bg-[#220D05] border border-[#D06224]/40 text-xs flex items-center justify-between font-mono">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#D06224] animate-pulse" />
            <span className="text-[#F7E7DE] font-semibold">Antrean Pembayaran Finance (Treasury Queue):</span>
            <span className="text-[#A67C68]">Dokumen telah disetujui Direksi dan siap diproses transfer bank atau pencairan kas operasional.</span>
          </div>
          <span className="text-[11px] text-[#D06224] font-bold">{filtered.length} Siap Bayar</span>
        </div>
      )}

      {title.includes('Pemeriksaan') && (
        <div className="p-3.5 rounded-xl bg-[#281107] border border-[#3E1E10] text-xs flex items-center justify-between font-mono">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#E9C892] animate-pulse" />
            <span className="text-[#F7E7DE] font-semibold">Antrean Verifikasi Checker (Review Queue):</span>
            <span className="text-[#A67C68]">Proposal pengadaan masuk dari unit kerja yang memerlukan evaluasi kelengkapan berkas dan kepatuhan SOP.</span>
          </div>
          <span className="text-[11px] text-[#E9C892] font-bold">{filtered.length} Menunggu Review</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#1D0C05] border border-[#3E1E10] p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs shadow-lg">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#8C604D] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari Nomor PR / Pemohon / Perihal..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-[#140803] border border-[#3E1E10] rounded-xl text-[#F7E7DE] placeholder-[#8C604D] text-xs focus:outline-none focus:border-[#D06224]"
          />
        </div>

        <div>
          <select
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 bg-[#140803] border border-[#3E1E10] rounded-xl text-[#D4BCB0] text-xs focus:outline-none focus:border-[#D06224] cursor-pointer"
          >
            <option value="">Semua Departemen</option>
            <option value="Marketing & Sales">Marketing & Sales</option>
            <option value="Operasional & Properti">Operasional & Properti</option>
            <option value="Finance & Accounting">Finance & Accounting</option>
            <option value="Information Technology">Information Technology</option>
            <option value="Human Resources & GA">Human Resources & GA</option>
          </select>
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 bg-[#140803] border border-[#3E1E10] rounded-xl text-[#D4BCB0] text-xs focus:outline-none focus:border-[#D06224] cursor-pointer"
          >
            <option value="">Semua Kategori</option>
            <option value="Pengadaan Barang">Pengadaan Barang</option>
            <option value="Pengadaan Jasa / Vendor">Pengadaan Jasa / Vendor</option>
            <option value="Operasional">Operasional</option>
            <option value="Maintenance & Repair">Maintenance & Repair</option>
            <option value="Marketing & Promotion">Marketing & Promotion</option>
            <option value="Office Supplies">Office Supplies</option>
            <option value="Reimbursement">Reimbursement</option>
            <option value="Cash Advance">Cash Advance</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 bg-[#140803] border border-[#3E1E10] rounded-xl text-[#D4BCB0] text-xs focus:outline-none focus:border-[#D06224] cursor-pointer font-mono"
          >
            <option value="">Semua Status Dokumen</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SUBMITTED">SUBMITTED (Diajukan)</option>
            <option value="VERIFIED">VERIFIED (Diverifikasi)</option>
            <option value="APPROVED">APPROVED (Disetujui Direksi)</option>
            <option value="REVISION_REQUIRED">REVISION REQUIRED (Revisi)</option>
            <option value="REJECTED">REJECTED (Ditolak)</option>
            <option value="TRANSFERRED">TRANSFERRED (Selesai Bayar)</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#1D0C05] border border-[#3E1E10] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#140803] text-[#A67C68] border-b border-[#32170B]">
              <tr>
                <th className="p-3.5 font-semibold font-mono">Nomor PR</th>
                <th className="p-3.5 font-semibold">Tanggal</th>
                <th className="p-3.5 font-semibold">Pengaju</th>
                <th className="p-3.5 font-semibold">Departemen</th>
                <th className="p-3.5 font-semibold">Perihal Pengadaan</th>
                <th className="p-3.5 font-semibold">Kategori</th>
                <th className="p-3.5 font-semibold text-right font-mono">Grand Total</th>
                <th className="p-3.5 font-semibold text-center">Approval</th>
                <th className="p-3.5 font-semibold text-center">Pembayaran</th>
                <th className="p-3.5 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D1409] text-[#D4BCB0]">
              {paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-[#8C604D]">
                    Tidak ditemukan data pengajuan yang memenuhi parameter filter.
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#281107] transition">
                    <td className="p-3.5 font-mono font-bold text-[#D06224] whitespace-nowrap">{req.prNumber}</td>
                    <td className="p-3.5 text-[#A67C68] font-mono text-[11px] whitespace-nowrap">{formatDateIndo(req.requestDate)}</td>
                    <td className="p-3.5 font-semibold text-[#F7E7DE] whitespace-nowrap">{req.requesterName}</td>
                    <td className="p-3.5 text-[#A67C68] whitespace-nowrap">{req.department}</td>
                    <td className="p-3.5 text-[#E0CCC2] max-w-[220px] truncate" title={req.subject}>
                      {req.subject}
                    </td>
                    <td className="p-3.5 text-[#A67C68] whitespace-nowrap">{req.category}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-[#E9C892] whitespace-nowrap tabular-nums">
                      {formatRupiah(req.grandTotal)}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
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
                    <td className="p-3.5 text-center whitespace-nowrap">
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
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <button
                        onClick={() => onSelectRequest(req)}
                        className="px-3 py-1 rounded-lg bg-[#140803] hover:bg-[#281107] text-[#E9C892] hover:text-white border border-[#3E1E10] text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 mx-auto"
                      >
                        <Eye className="w-3 h-3 text-[#A67C68]" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#32170B] bg-[#140803] flex items-center justify-between text-xs text-[#A67C68] font-mono">
            <div>
              Halaman <span className="text-[#F7E7DE] font-bold">{currentPage}</span> dari <span className="text-[#F7E7DE] font-bold">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-[#1D0C05] hover:bg-[#281107] border border-[#3E1E10] disabled:opacity-30 text-[#E9C892] cursor-pointer transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-[#1D0C05] hover:bg-[#281107] border border-[#3E1E10] disabled:opacity-30 text-[#E9C892] cursor-pointer transition"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


