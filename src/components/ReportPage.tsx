import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { RequestDocument } from '../types';
import { formatRupiah, formatDateIndo } from '../lib/utils';
import { BarChart3, Download, FileSpreadsheet, Calendar, Filter } from 'lucide-react';

interface ReportPageProps {
  requests: RequestDocument[];
}

export const ReportPage: React.FC<ReportPageProps> = ({ requests }) => {
  const { currentUser } = useAuth();
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');

  if (!currentUser) return null;

  const filtered = requests.filter((r) => {
    const matchesDept = !departmentFilter || r.department === departmentFilter;
    const matchesCat = !categoryFilter || r.category === categoryFilter;
    const matchesDate =
      (!startDate || r.requestDate >= startDate) && (!endDate || r.requestDate <= endDate);
    return matchesDept && matchesCat && matchesDate;
  });

  // Calculate statistics
  const totalCount = filtered.length;
  const totalNominal = filtered.reduce((acc, r) => acc + (r.grandTotal || 0), 0);
  const approvedCount = filtered.filter((r) => r.approvalStatus === 'APPROVED').length;
  const transferredCount = filtered.filter((r) => r.paymentStatus === 'TRANSFERRED').length;
  const transferredNominal = filtered
    .filter((r) => r.paymentStatus === 'TRANSFERRED')
    .reduce((acc, r) => acc + (r.grandTotal || 0), 0);
  const rejectedCount = filtered.filter((r) => r.approvalStatus === 'REJECTED').length;

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Nomor PR',
      'Tanggal',
      'Pengaju',
      'Departemen',
      'Kategori',
      'Perihal',
      'Penerima',
      'Bank Tujuan',
      'Nomor Rekening',
      'Total (IDR)',
      'Status Approval',
      'Status Pembayaran',
    ];

    // Security Check 11: Bank account data being exposed to unauthorized users
    const canViewBankNumbers =
      currentUser.role === 'SUPER_ADMIN' ||
      currentUser.role === 'ADMIN' ||
      currentUser.role === 'FINANCE';

    const rows = filtered.map((r) => {
      let bankAcc = r.bankAccountNumber || '';
      if (bankAcc && !canViewBankNumbers && r.requesterUserId !== currentUser.id) {
        bankAcc = `****${bankAcc.slice(-4)}`;
      }
      return [
        `"${r.prNumber}"`,
        `"${r.requestDate}"`,
        `"${r.requesterName}"`,
        `"${r.department}"`,
        `"${r.category}"`,
        `"${r.subject.replace(/"/g, '""')}"`,
        `"${r.recipientName || ''}"`,
        `"${r.bankName || ''}"`,
        `"${bankAcc}"`,
        r.grandTotal,
        `"${r.approvalStatus}"`,
        `"${r.paymentStatus}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Pengajuan_PT_Kota_Lama_Bersama_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#F7E7DE] tracking-tight flex items-center gap-2">
              <span>Rekapitulasi & Laporan Keuangan</span>
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#281107] text-[#E9C892] font-mono border border-[#4A2413]">
              AUDIT
            </span>
          </div>
          <p className="text-xs text-[#A67C68] mt-1 font-mono">
            Analisis Pengadaan, Approval Rate, dan Realisasi Transfer · Kola Bloc · PT Kota Lama Bersama
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D06224] hover:bg-[#B7521B] active:bg-[#AF431D] text-white text-xs font-bold shadow-lg shadow-[#D06224]/20 transition cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Ekspor CSV / Excel</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#180B05] border border-[#3E1E10] p-4 rounded-xl shadow-lg">
          <span className="text-[11px] font-mono text-[#A67C68] uppercase tracking-wider">Total Pengajuan</span>
          <div className="text-2xl font-bold text-[#F7E7DE] mt-1 font-mono tabular-nums">{totalCount} PR</div>
          <div className="text-xs text-[#D06224] mt-1 font-mono font-medium tabular-nums">{formatRupiah(totalNominal)}</div>
        </div>

        <div className="bg-[#180B05] border border-[#3E1E10] p-4 rounded-xl shadow-lg">
          <span className="text-[11px] font-mono text-[#A67C68] uppercase tracking-wider">Disetujui (Approved)</span>
          <div className="text-2xl font-bold text-[#A5A041] mt-1 font-mono tabular-nums">{approvedCount} PR</div>
          <div className="text-xs text-[#A67C68] mt-1 font-mono">
            Tingkat Persetujuan: {totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0}%
          </div>
        </div>

        <div className="bg-[#180B05] border border-[#3E1E10] p-4 rounded-xl shadow-lg">
          <span className="text-[11px] font-mono text-[#A67C68] uppercase tracking-wider">Realisasi Transfer</span>
          <div className="text-2xl font-bold text-[#A5A041] mt-1 font-mono tabular-nums">{transferredCount} PR</div>
          <div className="text-xs text-[#E9C892] mt-1 font-mono font-medium tabular-nums">{formatRupiah(transferredNominal)}</div>
        </div>

        <div className="bg-[#180B05] border border-[#3E1E10] p-4 rounded-xl shadow-lg">
          <span className="text-[11px] font-mono text-[#A67C68] uppercase tracking-wider">Ditolak / Dibatalkan</span>
          <div className="text-2xl font-bold text-[#E06450] mt-1 font-mono tabular-nums">{rejectedCount} PR</div>
          <div className="text-xs text-[#8C604D] mt-1 font-mono">Ditolak dalam evaluasi</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#180B05] border border-[#3E1E10] p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs shadow-md">
        <div>
          <label className="block text-[11px] font-mono text-[#A67C68] mb-1">Tanggal Mulai</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] font-mono text-xs focus:outline-none focus:border-[#D06224]"
          />
        </div>
        <div>
          <label className="block text-[11px] font-mono text-[#A67C68] mb-1">Tanggal Akhir</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] font-mono text-xs focus:outline-none focus:border-[#D06224]"
          />
        </div>
        <div>
          <label className="block text-[11px] font-mono text-[#A67C68] mb-1">Departemen</label>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] text-xs focus:outline-none focus:border-[#D06224] cursor-pointer"
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
          <label className="block text-[11px] font-mono text-[#A67C68] mb-1">Kategori Pengajuan</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] text-xs focus:outline-none focus:border-[#D06224] cursor-pointer"
          >
            <option value="">Semua Kategori</option>
            <option value="Pengadaan Barang">Pengadaan Barang</option>
            <option value="Pengadaan Jasa / Vendor">Pengadaan Jasa / Vendor</option>
            <option value="Operasional">Operasional</option>
            <option value="Maintenance & Repair">Maintenance & Repair</option>
          </select>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-[#180B05] border border-[#3E1E10] rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-[#32170B] bg-[#140803] flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#E9C892] uppercase tracking-wider font-mono">
            Rincian Hasil Rekap ({filtered.length} Dokumen)
          </h3>
          <span className="text-[11px] text-[#A67C68] font-mono">Data Terenkripsi & Diaudit</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#140803] text-[#A67C68] border-b border-[#32170B] font-mono">
              <tr>
                <th className="p-3.5">Nomor PR</th>
                <th className="p-3.5">Tanggal</th>
                <th className="p-3.5">Pengaju</th>
                <th className="p-3.5">Departemen</th>
                <th className="p-3.5">Perihal</th>
                <th className="p-3.5 text-right">Nilai Total (Rp)</th>
                <th className="p-3.5 text-center">Status Approval</th>
                <th className="p-3.5 text-center">Status Bayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D1409] text-[#D4BCB0]">
              {filtered.map((req) => (
                <tr key={req.id} className="hover:bg-[#281107] transition">
                  <td className="p-3.5 font-mono text-[#D06224] font-bold">{req.prNumber}</td>
                  <td className="p-3.5 text-[#8C604D] font-mono text-[11px] whitespace-nowrap">{formatDateIndo(req.requestDate)}</td>
                  <td className="p-3.5 font-semibold text-[#F7E7DE]">{req.requesterName}</td>
                  <td className="p-3.5 text-[#A67C68] font-mono">{req.department}</td>
                  <td className="p-3.5 text-[#D4BCB0] max-w-xs truncate">{req.subject}</td>
                  <td className="p-3.5 text-right font-mono font-bold text-[#E9C892] whitespace-nowrap tabular-nums">
                    {formatRupiah(req.grandTotal)}
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        req.approvalStatus === 'APPROVED'
                          ? 'bg-[#2A3111] text-[#A5A041] border-[#8B8635]/60'
                          : req.approvalStatus === 'REJECTED'
                          ? 'bg-[#3A1009] text-[#E06450] border-[#8B3518]'
                          : req.approvalStatus === 'REVISION_REQUIRED'
                          ? 'bg-[#3A2209] text-[#E9C892] border-[#AF431D]/60'
                          : 'bg-[#281107] text-[#D06224] border-[#AF431D]/40'
                      }`}
                    >
                      {req.approvalStatus}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        req.paymentStatus === 'TRANSFERRED'
                          ? 'bg-[#2A3111] text-[#A5A041] border-[#8B8635]/60'
                          : req.paymentStatus === 'PAYMENT_HOLD'
                          ? 'bg-[#3A1009] text-[#E06450] border-[#8B3518]'
                          : 'bg-[#1D0C05] text-[#8C604D] border-[#3E1E10]'
                      }`}
                    >
                      {req.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
