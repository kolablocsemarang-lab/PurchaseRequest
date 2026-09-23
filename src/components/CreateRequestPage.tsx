import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import {
  DepartmentMaster,
  DirectorMaster,
  CategoryMaster,
  UnitMaster,
  RecipientMaster,
  CompanySettings,
} from '../types';
import { generateNextPrNumber, calculateAndValidateTotals } from '../lib/requestService';
import { executeCreateRequest } from '../lib/serverBusinessLogic';
import { formatRupiah } from '../lib/utils';
import {
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Send,
  AlertCircle,
  FileUp,
  Check,
  Upload,
  Paperclip,
  Eye,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { processUploadedFile, formatFileSize, downloadOrOpenFile } from '../lib/fileUploadHelper';
import { FilePreviewModal } from './FilePreviewModal';

interface CreateRequestModalProps {
  departments: DepartmentMaster[];
  directors: DirectorMaster[];
  categories: CategoryMaster[];
  units: UnitMaster[];
  recipients: RecipientMaster[];
  companySettings: CompanySettings;
  onBack: () => void;
  onSuccess: (newRequestId: string) => void;
}

interface DraftItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  customUnit?: string;
}

export const CreateRequestPage: React.FC<CreateRequestModalProps> = ({
  departments,
  directors,
  categories,
  units,
  recipients,
  companySettings,
  onBack,
  onSuccess,
}) => {
  const { currentUser } = useAuth();

  // Basic info fields
  const [prNumber, setPrNumber] = useState('Memuat nomor...');
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || 'Pengadaan Barang');
  const [department, setDepartment] = useState(currentUser?.department || departments[0]?.name || 'Marketing & Sales');
  const [selectedDirectorId, setSelectedDirectorId] = useState(directors[0]?.id || '');
  const [notes, setNotes] = useState('');

  // Items table
  const [items, setItems] = useState<DraftItem[]>([
    {
      id: '1',
      description: 'Printer Office Laser Multifungsi',
      quantity: 2,
      unit: 'Unit',
      unitPrice: 5000000,
    },
  ]);

  // Tax and extra cost
  const [taxPercentage, setTaxPercentage] = useState<number>(0);
  const [otherCost, setOtherCost] = useState<number>(0);

  // Recipient selection
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(recipients[0]?.id || '');
  const [customRecipient, setCustomRecipient] = useState({
    name: '',
    bankName: 'BCA (Bank Central Asia)',
    bankAccountNumber: '',
    bankAccountHolder: '',
    phone: '',
  });
  const [isCustomRecipient, setIsCustomRecipient] = useState(false);

  // Attachments simulation
  const [attachments, setAttachments] = useState<
    Array<{ id: string; fileName: string; fileUrl: string; fileType: string; fileSize: number; uploadedAt: string }>
  >([
    {
      id: 'att-1',
      fileName: 'Penawaran_Harga_Vendor_Sept2026.pdf',
      fileUrl: '#',
      fileType: 'application/pdf',
      fileSize: 1048576,
      uploadedAt: new Date().toISOString(),
    },
  ]);
  const [uploadFileName, setUploadFileName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Pre-fetch PR numbering preview
  useEffect(() => {
    let active = true;
    generateNextPrNumber(requestDate).then((res) => {
      if (active) {
        setPrNumber(res.prNumber);
      }
    }).catch(() => {
      if (active) {
        setPrNumber(`PR/KLB/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/PREVIEW`);
      }
    });
    return () => {
      active = false;
    };
  }, [requestDate]);

  // Calculate live totals using validated server logic
  const calculated = calculateAndValidateTotals(
    items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unit: i.unit === 'LAINNYA' ? (i.customUnit || 'Item') : i.unit,
      unitPrice: i.unitPrice,
    })),
    taxPercentage,
    otherCost
  );

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        description: '',
        quantity: 1,
        unit: 'Unit',
        unitPrice: 0,
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof DraftItem, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleAddAttachment = () => {
    const trimmed = uploadFileName.trim();
    if (!trimmed) return;

    // Security Check 15: Unsafe file upload access - validate extension & prevent malicious executables
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.xls', '.docx', '.doc'];
    const lower = trimmed.toLowerCase();
    const hasValidExtension = allowedExtensions.some((ext) => lower.endsWith(ext));

    if (!hasValidExtension) {
      setErrorMsg('Format file tidak diizinkan. Hanya file dokumen (.pdf, .xlsx, .docx) atau gambar (.jpg, .png) yang diperbolehkan.');
      return;
    }

    // Sanitize file name to prevent path traversal or special chars
    const sanitizedFileName = trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');

    setAttachments((prev) => [
      ...prev,
      {
        id: `att-${Date.now()}`,
        fileName: sanitizedFileName,
        fileUrl: '#',
        fileType: lower.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
        fileSize: 524288,
        uploadedAt: new Date().toISOString(),
      },
    ]);
    setUploadFileName('');
    setErrorMsg('');
  };

  const handleSave = async (submitStatus: 'DRAFT' | 'SUBMITTED') => {
    if (!currentUser) return;
    setErrorMsg('');

    // Validations
    if (!subject.trim()) {
      setErrorMsg('Perihal Pengajuan wajib diisi.');
      return;
    }

    if (items.some((i) => !i.description.trim() || i.quantity <= 0 || i.unitPrice <= 0)) {
      setErrorMsg('Semua baris item harus memiliki keterangan, quantity > 0, dan nominal > 0.');
      return;
    }

    // Recipient selection
    let recipientName = '';
    let bankName = '';
    let bankAccountNumber = '';
    let bankAccountHolder = '';
    let recipientPhone = '';

    if (isCustomRecipient) {
      if (!customRecipient.name || !customRecipient.bankAccountNumber || !customRecipient.bankAccountHolder) {
        setErrorMsg('Data Penerima Baru tidak lengkap (Nama, Rekening, dan Pemilik Rekening wajib diisi).');
        return;
      }
      recipientName = customRecipient.name;
      bankName = customRecipient.bankName;
      bankAccountNumber = customRecipient.bankAccountNumber;
      bankAccountHolder = customRecipient.bankAccountHolder;
      recipientPhone = customRecipient.phone;
    } else {
      const rec = recipients.find((r) => r.id === selectedRecipientId);
      if (!rec) {
        setErrorMsg('Silakan pilih salah satu penerima / rekening pembayaran.');
        return;
      }
      recipientName = rec.name;
      bankName = rec.bankName;
      bankAccountNumber = rec.bankAccountNumber;
      bankAccountHolder = rec.bankAccountHolder;
      recipientPhone = rec.phone;
    }

    const director = directors.find((d) => d.id === selectedDirectorId) || directors[0];

    setIsSubmitting(true);

    try {
      const directorData = {
        id: director?.id || 'dir-1',
        name: director?.name || 'Ir. Rudianto Liem',
        title: director?.title || 'Direktur Utama',
      };

      const result = await executeCreateRequest(currentUser, {
        requestDate,
        subject: subject.trim(),
        category,
        department,
        director: directorData,
        notes: notes.trim(),
        items: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unit: i.unit === 'LAINNYA' ? (i.customUnit || 'Item') : i.unit,
          unitPrice: i.unitPrice,
        })),
        taxPercentage,
        otherCost,
        recipientName,
        bankName,
        bankAccountNumber,
        bankAccountHolder,
        recipientPhone,
        attachments,
        submitStatus,
      });

      onSuccess(result.requestId);
    } catch (err: any) {
      console.error('Error creating request:', err);
      setErrorMsg('Gagal menyimpan pengajuan ke database: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-[#A67C68] hover:text-[#F7E7DE] transition cursor-pointer mb-2 font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Daftar</span>
          </button>
          <div className="text-[10px] text-[#A67C68] font-mono uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span className="text-[#E9C892] font-semibold">KOLA BLOC</span>
            <span>·</span>
            <span>PT Kota Lama Bersama</span>
          </div>
          <h1 className="text-xl font-bold text-[#F7E7DE] tracking-tight">Buat Pengajuan Baru</h1>
          <p className="text-xs text-[#A67C68] mt-0.5 font-mono">
            Purchase & Payment Request (PR) · Sistem Pengadaan Terintegrasi
          </p>
        </div>

        <div className="bg-[#1D0C05] px-4 py-2 rounded-xl border border-[#3E1E10] flex items-center gap-3 shadow-lg">
          <span className="text-[11px] text-[#A67C68] font-mono">Estimasi No. PR:</span>
          <span className="font-mono text-xs font-bold text-[#D06224]">{prNumber}</span>
        </div>
      </div>

      {/* Error notification */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#3A1009] border border-[#8B3518] text-[#F9A89B] text-xs flex items-center gap-3 font-mono">
          <AlertCircle className="w-4 h-4 text-[#E06450] shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form Box */}
      <div className="bg-[#1D0C05] border border-[#3E1E10] rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-[#32170B] bg-[#140803]">
          <h2 className="text-xs font-bold text-[#F7E7DE] uppercase tracking-wider font-mono">
            Formulir Surat Pengadaan & Pembayaran
          </h2>
          <p className="text-[11px] text-[#A67C68] mt-0.5">
            Lengkapi detail permohonan pengadaan barang atau jasa sesuai kebijakan pengadaan Kola Bloc.
          </p>
        </div>

        <div className="p-6 space-y-7">
          {/* Section 1: Informasi Pengajuan */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#E9C892] uppercase tracking-wider font-mono">
              1. Informasi Pengajuan & Departemen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#D4BCB0] mb-1.5 font-mono">
                  Tanggal Pengajuan <span className="text-[#E06450]">*</span>
                </label>
                <input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#140803] border border-[#3E1E10] rounded-xl text-xs text-[#F7E7DE] focus:outline-none focus:border-[#D06224] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D4BCB0] mb-1.5 font-mono">
                  Departemen <span className="text-[#E06450]">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-[#140803] border border-[#3E1E10] rounded-xl text-xs text-[#F7E7DE] focus:outline-none focus:border-[#D06224] cursor-pointer"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D4BCB0] mb-1.5 font-mono">
                  Kategori Pengajuan <span className="text-[#E06450]">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#140803] border border-[#3E1E10] rounded-xl text-xs text-[#F7E7DE] focus:outline-none focus:border-[#D06224] cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#D4BCB0] mb-1.5 font-mono">
                  Perihal / Judul Pengadaan <span className="text-[#E06450]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pengadaan 2 Unit Printer Laser Multifungsi & Toner Operasional"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-[#140803] border border-[#3E1E10] rounded-xl text-xs text-[#F7E7DE] placeholder-[#8C604D] focus:outline-none focus:border-[#D06224]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#D4BCB0] mb-1.5 font-mono">
                  Ditujukan Kepada (Direksi Penyetuju) <span className="text-[#E06450]">*</span>
                </label>
                <select
                  value={selectedDirectorId}
                  onChange={(e) => setSelectedDirectorId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#140803] border border-[#3E1E10] rounded-xl text-xs text-[#F7E7DE] focus:outline-none focus:border-[#D06224] cursor-pointer"
                >
                  {directors.map((dir) => (
                    <option key={dir.id} value={dir.id}>
                      {dir.name} — {dir.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#D4BCB0] mb-1.5 font-mono">
                Catatan / Justifikasi Kebutuhan
              </label>
              <textarea
                rows={2}
                placeholder="Tuliskan justifikasi urgensi atau rincian tambahan untuk pemeriksa dan direksi..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-[#140803] border border-[#3E1E10] rounded-xl text-xs text-[#F7E7DE] placeholder-[#8C604D] focus:outline-none focus:border-[#D06224]"
              />
            </div>
          </div>

          {/* Section 2: Request Item Table */}
          <div className="pt-6 border-t border-[#32170B] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#E9C892] uppercase tracking-wider font-mono">
                2. Rincian Barang & Jasa
              </h3>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#281107] hover:bg-[#38180A] text-[#E9C892] border border-[#4A2413] text-xs font-semibold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris Item</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-[#3E1E10] rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#140803] text-[#A67C68] border-b border-[#32170B] font-mono">
                  <tr>
                    <th className="p-3 w-10 text-center">No</th>
                    <th className="p-3">Deskripsi Barang / Jasa</th>
                    <th className="p-3 w-24 text-center">Qty</th>
                    <th className="p-3 w-32">Satuan</th>
                    <th className="p-3 w-40 text-right">Harga Satuan (Rp)</th>
                    <th className="p-3 w-40 text-right">Jumlah (Rp)</th>
                    <th className="p-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D1409] text-[#D4BCB0]">
                  {items.map((item, index) => {
                    const rowTotal = item.quantity * item.unitPrice;
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/20">
                        <td className="p-3 text-center text-[#8C604D] font-mono">{index + 1}</td>
                        <td className="p-3">
                          <input
                            type="text"
                            placeholder="Deskripsi barang / spesifikasi..."
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-[#140803] border border-[#3E1E10] rounded-lg text-xs text-[#F7E7DE] focus:outline-none focus:border-[#D06224]"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                            className="w-full px-2 py-1.5 bg-[#140803] border border-[#3E1E10] rounded-lg text-xs text-center text-[#F7E7DE] focus:outline-none focus:border-[#D06224] font-mono tabular-nums"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={item.unit}
                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                            className="w-full px-2 py-1.5 bg-[#140803] border border-[#3E1E10] rounded-lg text-xs text-[#F7E7DE] focus:outline-none focus:border-[#D06224] cursor-pointer font-mono"
                          >
                            {units.map((u) => (
                              <option key={u.id} value={u.name}>
                                {u.name}
                              </option>
                            ))}
                            <option value="LAINNYA">Lainnya...</option>
                          </select>
                          {item.unit === 'LAINNYA' && (
                            <input
                              type="text"
                              placeholder="Ketik satuan..."
                              value={item.customUnit || ''}
                              onChange={(e) => updateItem(index, 'customUnit', e.target.value)}
                              className="mt-1 w-full px-2 py-1 bg-[#140803] border border-[#3E1E10] rounded-lg text-xs text-[#F7E7DE]"
                            />
                          )}
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-[#140803] border border-[#3E1E10] rounded-lg text-xs text-right text-[#F7E7DE] focus:outline-none focus:border-[#D06224] font-mono tabular-nums"
                          />
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-[#E9C892] tabular-nums">
                          {formatRupiah(rowTotal)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            disabled={items.length <= 1}
                            onClick={() => removeItemRow(index)}
                            className="text-[#8C604D] hover:text-[#E06450] disabled:opacity-20 transition cursor-pointer p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Calculations and Breakdown */}
            <div className="mt-4 flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <label className="block text-[11px] text-[#A67C68] mb-1">PPN (%) (Opsional):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxPercentage}
                    onChange={(e) => setTaxPercentage(Number(e.target.value))}
                    className="w-20 px-2 py-1 bg-[#140803] border border-[#3E1E10] rounded-lg text-center text-[#F7E7DE]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#A67C68] mb-1">Biaya Lain (Rp):</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={otherCost}
                    onChange={(e) => setOtherCost(Number(e.target.value))}
                    className="w-32 px-2 py-1 bg-[#140803] border border-[#3E1E10] rounded-lg text-right text-[#F7E7DE] font-mono tabular-nums"
                  />
                </div>
              </div>

              {/* Total display summary */}
              <div className="w-full md:w-80 bg-[#140803] p-4 rounded-xl border border-[#3E1E10] space-y-2 text-xs shadow-inner">
                <div className="flex justify-between text-[#A67C68]">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-[#F7E7DE] font-mono tabular-nums">{formatRupiah(calculated.subtotal)}</span>
                </div>
                {calculated.taxAmount > 0 && (
                  <div className="flex justify-between text-[#A67C68]">
                    <span>PPN ({taxPercentage}%):</span>
                    <span className="font-semibold text-[#F7E7DE] font-mono tabular-nums">{formatRupiah(calculated.taxAmount)}</span>
                  </div>
                )}
                {calculated.otherCost > 0 && (
                  <div className="flex justify-between text-[#A67C68]">
                    <span>Biaya Tambahan:</span>
                    <span className="font-semibold text-[#F7E7DE] font-mono tabular-nums">{formatRupiah(calculated.otherCost)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#32170B] flex justify-between items-center">
                  <span className="text-xs font-bold text-[#E9C892] uppercase tracking-wider font-mono">Grand Total:</span>
                  <span className="text-base font-bold text-[#E9C892] font-mono tabular-nums">{formatRupiah(calculated.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Payment Destination */}
          <div className="pt-6 border-t border-[#32170B] space-y-4">
            <h3 className="text-xs font-bold text-[#E9C892] uppercase tracking-wider font-mono">
              3. Rekening Tujuan Pembayaran (Vendor / Penerima)
            </h3>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs text-[#D4BCB0] cursor-pointer">
                <input
                  type="radio"
                  name="recChoice"
                  checked={!isCustomRecipient}
                  onChange={() => setIsCustomRecipient(false)}
                  className="accent-[#D06224]"
                />
                <span>Pilih Rekening Terdaftar (Master Data)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-[#D4BCB0] cursor-pointer">
                <input
                  type="radio"
                  name="recChoice"
                  checked={isCustomRecipient}
                  onChange={() => setIsCustomRecipient(true)}
                  className="accent-[#D06224]"
                />
                <span>+ Input Rekening Baru</span>
              </label>
            </div>

            {!isCustomRecipient ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#140803] p-4 rounded-xl border border-[#3E1E10]">
                <div>
                  <label className="block text-xs font-medium text-[#A67C68] mb-1.5 font-mono">Penerima Master</label>
                  <select
                    value={selectedRecipientId}
                    onChange={(e) => setSelectedRecipientId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1D0C05] border border-[#3E1E10] rounded-xl text-xs text-[#F7E7DE] focus:outline-none focus:border-[#D06224] cursor-pointer"
                  >
                    {recipients.map((rec) => (
                      <option key={rec.id} value={rec.id}>
                        {rec.name} ({rec.bankName})
                      </option>
                    ))}
                  </select>
                </div>
                {(() => {
                  const rec = recipients.find((r) => r.id === selectedRecipientId) || recipients[0];
                  return rec ? (
                    <div className="text-xs text-[#A67C68] space-y-1 font-mono">
                      <div><strong className="text-[#D4BCB0]">Bank:</strong> {rec.bankName}</div>
                      <div><strong className="text-[#D4BCB0]">No. Rekening:</strong> <span className="text-[#E9C892]">{rec.bankAccountNumber}</span></div>
                      <div><strong className="text-[#D4BCB0]">Atas Nama:</strong> {rec.bankAccountHolder}</div>
                    </div>
                  ) : null;
                })()}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#140803] p-4 rounded-xl border border-[#3E1E10]">
                <div>
                  <label className="block text-xs font-medium text-[#A67C68] mb-1 font-mono">Nama Penerima / Vendor</label>
                  <input
                    type="text"
                    placeholder="misal: PT Mitra Perkasa Mandiri"
                    value={customRecipient.name}
                    onChange={(e) => setCustomRecipient({ ...customRecipient, name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#1D0C05] border border-[#3E1E10] rounded-lg text-xs text-[#F7E7DE]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A67C68] mb-1 font-mono">Nama Bank</label>
                  <input
                    type="text"
                    placeholder="misal: BCA, Bank Mandiri, BNI"
                    value={customRecipient.bankName}
                    onChange={(e) => setCustomRecipient({ ...customRecipient, bankName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#1D0C05] border border-[#3E1E10] rounded-lg text-xs text-[#F7E7DE]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A67C68] mb-1 font-mono">Nomor Rekening</label>
                  <input
                    type="text"
                    placeholder="misal: 0351239844"
                    value={customRecipient.bankAccountNumber}
                    onChange={(e) => setCustomRecipient({ ...customRecipient, bankAccountNumber: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#1D0C05] border border-[#3E1E10] rounded-lg text-xs text-[#F7E7DE] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A67C68] mb-1 font-mono">Atas Nama Rekening</label>
                  <input
                    type="text"
                    placeholder="Nama pemilik rekening sesuai buku tabungan"
                    value={customRecipient.bankAccountHolder}
                    onChange={(e) => setCustomRecipient({ ...customRecipient, bankAccountHolder: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#1D0C05] border border-[#3E1E10] rounded-lg text-xs text-[#F7E7DE]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Attachments */}
          <div className="pt-6 border-t border-[#32170B] space-y-3">
            <h3 className="text-xs font-bold text-[#E9C892] uppercase tracking-wider font-mono">
              4. Lampiran Dokumen Pendukung (Quotation / Invoice)
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nama file lampiran (contoh: Penawaran_Vendor_Sept2026.pdf)"
                value={uploadFileName}
                onChange={(e) => setUploadFileName(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#140803] border border-[#3E1E10] rounded-xl text-xs text-[#F7E7DE] placeholder-[#8C604D]"
              />
              <button
                type="button"
                onClick={handleAddAttachment}
                className="px-4 py-2 bg-[#281107] hover:bg-[#38180A] text-[#E9C892] border border-[#4A2413] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow-md"
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Tambah Lampiran</span>
              </button>
            </div>

            <div className="space-y-2">
              {attachments.map((att) => (
                <div key={att.id} className="flex items-center justify-between p-2.5 bg-[#140803] border border-[#3E1E10] rounded-xl text-xs text-[#D4BCB0] font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B8635]" />
                    <span className="font-medium text-[#F7E7DE]">{att.fileName}</span>
                    <span className="text-[#8C604D]">(1 MB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachments(attachments.filter((a) => a.id !== att.id))}
                    className="text-[#8C604D] hover:text-[#E06450] cursor-pointer text-[11px]"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-[#32170B] bg-[#140803] flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[#3E1E10] hover:bg-[#281107] text-[#A67C68] hover:text-[#F7E7DE] text-xs font-semibold transition cursor-pointer"
          >
            Batal
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave('DRAFT')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#281107] hover:bg-[#38180A] border border-[#4A2413] text-[#E9C892] text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Draft</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave('SUBMITTED')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#D06224] hover:bg-[#B7521B] active:bg-[#AF431D] text-white text-xs font-bold shadow-lg shadow-[#D06224]/20 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Pengajuan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
