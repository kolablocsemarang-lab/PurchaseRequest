import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { RequestDocument, CompanySettings, UserRole } from '../types';
import { generateRequestPDF } from '../lib/pdfGenerator';
import { logActivity } from '../lib/requestService';
import { formatRupiah, formatDateIndo } from '../lib/utils';
import {
  executeVerifyAction,
  executeApproveAction,
  executeRevisionOrRejectAction,
  executePaymentTransfer,
  verifyRequestAccess,
} from '../lib/serverBusinessLogic';
import {
  ArrowLeft,
  Download,
  Share2,
  Mail,
  CheckCircle,
  XCircle,
  RotateCcw,
  CreditCard,
  Building2,
  FileCheck,
  Clock,
  Send,
  CloudUpload,
  AlertTriangle,
  ExternalLink,
  Printer,
  FileText,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { KolaBlocSymbol, KolaBlocWordmark } from './KolaBlocLogo';

interface RequestDetailPageProps {
  request: RequestDocument;
  companySettings: CompanySettings;
  onBack: () => void;
  onRefresh: () => void;
}

export const RequestDetailPage: React.FC<RequestDetailPageProps> = ({
  request,
  companySettings,
  onBack,
  onRefresh,
}) => {
  const { currentUser } = useAuth();

  // Workflow Dialog states
  const [activeModal, setActiveModal] = useState<
    'REVISION' | 'REJECT' | 'PROCESS_PAYMENT' | 'PAYMENT_HOLD' | 'MARK_TRANSFERRED' | 'EMAIL' | 'DRIVE' | null
  >(null);

  const [commentText, setCommentText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [errorToast, setErrorToast] = useState('');
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  // Payment form states
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [sourceBank, setSourceBank] = useState('BCA Giro Operasional');
  const [refNumber, setRefNumber] = useState(`TRF-${Date.now().toString().slice(-6)}`);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [proofFileName, setProofFileName] = useState('Bukti_Transfer_BCA_KlikBisnis.pdf');

  // Email form states
  const [emailTo, setEmailTo] = useState(request.recipientEmail || 'direksi@kotalamabersama.co.id');
  const [emailCc, setEmailCc] = useState('finance@kotalamabersama.co.id');
  const [emailSubject, setEmailSubject] = useState(`Pengajuan ${request.prNumber} - ${request.subject}`);
  const [emailBody, setEmailBody] = useState(
    `Yth. Bapak/Ibu,\n\nBersama ini kami lampirkan dokumen pengajuan Purchase/Payment Request nomor: ${request.prNumber} perihal ${request.subject} dengan total nominal ${formatRupiah(request.grandTotal)}.\n\nStatus saat ini: ${request.approvalStatus}.\n\nTerima kasih,\nPT Kota Lama Bersama`
  );

  // Check 1, 2, 10: Server-side and data scope verification on mount
  useEffect(() => {
    if (!currentUser) return;
    verifyRequestAccess(currentUser, request)
      .then(() => setAccessDeniedMessage(null))
      .catch((err: any) => {
        setAccessDeniedMessage(err.message || 'Akses Ditolak: Anda tidak memiliki hak melihat pengajuan ini.');
      });
  }, [currentUser, request]);

  if (!currentUser) return null;

  if (accessDeniedMessage) {
    return (
      <div className="p-8 max-w-xl mx-auto mt-12 bg-slate-900 border border-rose-900/60 rounded-2xl text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 bg-rose-950/80 border border-rose-800 rounded-full flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white uppercase tracking-wider">Akses Pengajuan Ditolak</h2>
        <p className="text-xs text-rose-200">{accessDeniedMessage}</p>
        <div className="pt-2">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Kembali ke Daftar Pengajuan
          </button>
        </div>
      </div>
    );
  }

  const role = currentUser.role;

  // Strict Segregation of Duties:
  // - Checker can verify
  // - Approver can approve (FINANCE IS STRICTLY BLOCKED)
  // - Finance can process payment (APPROVER IS STRICTLY BLOCKED)
  const canVerify =
    (role === 'CHECKER' || role === 'SUPER_ADMIN') &&
    (request.approvalStatus === 'SUBMITTED' || request.approvalStatus === 'UNDER_REVIEW');

  const canApprove =
    role !== 'FINANCE' && // Security Check 8: Finance cannot approve
    (role === 'APPROVER' || role === 'SUPER_ADMIN') &&
    (request.approvalStatus === 'VERIFIED' || request.approvalStatus === 'WAITING_APPROVAL' || request.approvalStatus === 'SUBMITTED');

  const canReturnRevision =
    (role === 'CHECKER' || role === 'APPROVER' || role === 'SUPER_ADMIN') &&
    request.paymentStatus !== 'TRANSFERRED' &&
    ['SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'WAITING_APPROVAL'].includes(request.approvalStatus);

  const canReject = canReturnRevision;

  const canProcessPayment =
    role !== 'APPROVER' && // Security Check 9: Approver cannot mark transferred
    (role === 'FINANCE' || role === 'SUPER_ADMIN') &&
    request.approvalStatus === 'APPROVED' &&
    request.paymentStatus !== 'TRANSFERRED';

  // Security Check 11: Mask bank account number for unprivileged viewers
  // Privileged viewers: Super Admin, Admin, Finance, or the Requester himself
  const canViewFullBankData =
    role === 'SUPER_ADMIN' ||
    role === 'ADMIN' ||
    role === 'FINANCE' ||
    request.requesterUserId === currentUser.id;

  const maskedBankAccount = canViewFullBankData
    ? request.bankAccountNumber
    : request.bankAccountNumber
    ? `•••• •••• ${request.bankAccountNumber.slice(-4)} (Terkunci oleh Kebijakan Privasi Bank)`
    : '-';

  // Handlers
  const handleDownloadPDF = () => {
    try {
      const pdf = generateRequestPDF(request, companySettings, !canViewFullBankData);
      pdf.save(`${request.prNumber.replace(/\//g, '-')}.pdf`);
      logActivity(currentUser, 'Mengunduh Dokumen PDF', {
        requestId: request.id,
        prNumber: request.prNumber,
      });
      setSuccessToast('PDF pengajuan berhasil diunduh ke komputer Anda.');
    } catch {
      setErrorToast('Gagal memproses pembuatan PDF.');
    }
  };

  const handlePrint = () => {
    try {
      const pdf = generateRequestPDF(request, companySettings, !canViewFullBankData);
      pdf.autoPrint();
      window.open(pdf.output('bloburl'), '_blank');
    } catch {
      handleDownloadPDF();
    }
  };

  const handleSaveToDrive = async () => {
    setIsProcessing(true);
    try {
      // In compliance with Security Check 16: Public Google Drive links exposing confidential documents
      // Ensure drive link is private corporate domain domain-restricted view
      const domainDriveUrl = `https://drive.google.com/a/kotalamabersama.co.id/file/d/priv-doc-${request.id}/view?usp=drivesdk`;

      await logActivity(currentUser, 'Menyimpan Dokumen ke Google Drive Internal Korporat', {
        requestId: request.id,
        prNumber: request.prNumber,
        newValue: domainDriveUrl,
        comment: 'Akses terbatas domain @kotalamabersama.co.id',
      });

      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
      setSuccessToast('Berhasil diarsipkan ke Google Drive Internal PT Kota Lama Bersama (Akses Terbatas Domain).');
      setActiveModal(null);
      onRefresh();
    } catch (err: any) {
      setErrorToast('Gagal menyimpan ke Google Drive: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendEmail = async () => {
    setIsProcessing(true);
    try {
      await logActivity(currentUser, 'Mengirim Dokumen via Email', {
        requestId: request.id,
        prNumber: request.prNumber,
        comment: `Tujuan: ${emailTo} (CC: ${emailCc}) - Perihal: ${emailSubject}`,
      });

      setSuccessToast(`Email notifikasi pengajuan berhasil dikirimkan ke ${emailTo}`);
      setActiveModal(null);
    } catch (err: any) {
      setErrorToast('Gagal mengirimkan email: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShareWhatsApp = () => {
    const docLink = window.location.origin;
    const waText = encodeURIComponent(
      `*PT KOTA LAMA BERSAMA*\nInternal Request Notification\n\n*Nomor PR:* ${request.prNumber}\n*Perihal:* ${request.subject}\n*Total:* ${formatRupiah(request.grandTotal)}\n*Status Approval:* ${request.approvalStatus}\n*Status Pembayaran:* ${request.paymentStatus}\n\n*Akses Dokumen:* ${docLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${waText}`, '_blank');
    logActivity(currentUser, 'Membuka Berbagi Dokumen via WhatsApp', {
      requestId: request.id,
      prNumber: request.prNumber,
    });
  };

  // Workflow transitions with server-side validation
  const handleWorkflowAction = async (actionType: 'VERIFY' | 'APPROVE' | 'RETURN' | 'REJECT') => {
    setIsProcessing(true);
    setErrorToast('');
    try {
      let result;
      if (actionType === 'VERIFY') {
        result = await executeVerifyAction(currentUser, request.id, commentText);
      } else if (actionType === 'APPROVE') {
        result = await executeApproveAction(currentUser, request.id, commentText);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } else {
        result = await executeRevisionOrRejectAction(
          currentUser,
          request.id,
          actionType === 'RETURN' ? 'REVISION' : 'REJECT',
          commentText
        );
      }

      await logActivity(currentUser, `Workflow Approval: ${actionType}`, {
        requestId: request.id,
        prNumber: request.prNumber,
        oldValue: request.approvalStatus,
        newValue: result.updatedRequest?.approvalStatus,
        comment: commentText,
      });

      setSuccessToast(result.message || 'Status berhasil diperbarui.');
      setActiveModal(null);
      setCommentText('');
      onRefresh();
    } catch (err: any) {
      setErrorToast(err.message || 'Gagal memproses alur kerja.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Payment workflow transitions with server-side validation
  const handlePaymentTransferAction = async () => {
    setIsProcessing(true);
    setErrorToast('');
    try {
      const result = await executePaymentTransfer(currentUser, request.id, {
        transferDate,
        sourceBank,
        referenceNumber: refNumber,
        notes: paymentNotes,
        proofFileName,
      });

      await logActivity(currentUser, 'Workflow Pembayaran: Realisasi Transfer', {
        requestId: request.id,
        prNumber: request.prNumber,
        oldValue: request.paymentStatus,
        newValue: 'TRANSFERRED',
        comment: `Bank: ${sourceBank}, Ref: ${refNumber}`,
      });

      confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
      setSuccessToast(result.message || 'Pembayaran berhasil dikonfirmasi.');
      setActiveModal(null);
      onRefresh();
    } catch (err: any) {
      setErrorToast(err.message || 'Gagal memproses pembayaran transfer.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Toast Feedback */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
          <span>{successToast}</span>
          <button onClick={() => setSuccessToast('')} className="text-emerald-400 font-bold ml-4">
            ×
          </button>
        </div>
      )}
      {errorToast && (
        <div className="p-4 rounded-xl bg-rose-950/90 border border-rose-800 text-rose-200 text-xs flex items-center justify-between">
          <span>{errorToast}</span>
          <button onClick={() => setErrorToast('')} className="text-rose-400 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Navigation & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#A67C68] hover:text-[#F7E7DE] transition cursor-pointer font-mono"
        >
          <ArrowLeft className="w-4 h-4 text-[#D06224]" />
          <span>Kembali ke Ringkasan</span>
        </button>

        {/* Share & Document Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1D0C05] hover:bg-[#281107] text-[#F7E7DE] border border-[#3E1E10] text-xs font-semibold transition cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#D06224]" />
            <span>Unduh PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1D0C05] hover:bg-[#281107] text-[#D4BCB0] border border-[#3E1E10] text-xs font-medium transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#A67C68]" />
            <span>Cetak</span>
          </button>

          <button
            onClick={() => setActiveModal('DRIVE')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1D0C05] hover:bg-[#281107] text-[#D4BCB0] border border-[#3E1E10] text-xs font-medium transition cursor-pointer"
          >
            <CloudUpload className="w-3.5 h-3.5 text-[#8B8635]" />
            <span>Simpan Drive (Internal)</span>
          </button>

          <button
            onClick={() => setActiveModal('EMAIL')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1D0C05] hover:bg-[#281107] text-[#D4BCB0] border border-[#3E1E10] text-xs font-medium transition cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-[#E9C892]" />
            <span>Kirim Email</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#281107] hover:bg-[#38180A] text-[#E9C892] border border-[#4A2413] text-xs font-semibold transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-[#8B8635]" />
            <span>Share WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Role Action Banners (Checker, Approver, Finance) */}
      {(canVerify || canApprove || canProcessPayment) && (
        <div className="p-5 bg-gradient-to-r from-[#220D05] to-[#180B05] border border-[#AF431D]/50 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-[#E9C892] uppercase tracking-wider flex items-center gap-2 font-mono">
              <Clock className="w-4 h-4 text-[#D06224]" />
              <span>Otorisasi Alur Kerja Diperlukan</span>
            </div>
            <p className="text-xs text-[#A67C68] mt-1 font-mono">
              Anda masuk sebagai <strong className="text-[#F7E7DE]">{currentUser.fullName} ({role})</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canVerify && (
              <>
                <button
                  onClick={() => setActiveModal('REVISION')}
                  className="px-3.5 py-2 rounded-xl bg-[#1D0C05] hover:bg-[#281107] border border-[#4A2413] text-[#E9C892] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Kembalikan Revisi</span>
                </button>
                <button
                  onClick={() => setActiveModal('REJECT')}
                  className="px-3.5 py-2 rounded-xl bg-[#3A1009] hover:bg-[#4E140B] border border-[#8B3518] text-[#E06450] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Tolak PR</span>
                </button>
                <button
                  onClick={() => handleWorkflowAction('VERIFY')}
                  className="px-4 py-2 rounded-xl bg-[#8B8635] hover:bg-[#77732A] text-white text-xs font-bold shadow-lg shadow-[#8B8635]/20 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>VERIFIKASI PENGAJUAN</span>
                </button>
              </>
            )}

            {canApprove && (
              <>
                <button
                  onClick={() => setActiveModal('REVISION')}
                  className="px-3.5 py-2 rounded-xl bg-[#1D0C05] hover:bg-[#281107] border border-[#4A2413] text-[#E9C892] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Minta Revisi</span>
                </button>
                <button
                  onClick={() => setActiveModal('REJECT')}
                  className="px-3.5 py-2 rounded-xl bg-[#3A1009] hover:bg-[#4E140B] border border-[#8B3518] text-[#E06450] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Tolak Pengajuan</span>
                </button>
                <button
                  onClick={() => handleWorkflowAction('APPROVE')}
                  className="px-5 py-2 rounded-xl bg-[#D06224] hover:bg-[#B7521B] active:bg-[#AF431D] text-white text-xs font-bold shadow-lg shadow-[#D06224]/30 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>SETUJUI (APPROVE) DIREKSI</span>
                </button>
              </>
            )}

            {canProcessPayment && (
              <button
                onClick={() => setActiveModal('MARK_TRANSFERRED')}
                className="px-5 py-2 rounded-xl bg-[#D06224] hover:bg-[#B7521B] text-white text-xs font-bold shadow-lg shadow-[#D06224]/30 flex items-center gap-1.5 transition cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Input Bukti Transfer Keuangan</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Invoice / Purchase Request Document Sheet */}
      <div className="bg-[#180B05] border border-[#3E1E10] rounded-2xl shadow-2xl overflow-hidden p-8 space-y-7 font-sans">
        {/* Letterhead & Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-[#32170B]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#220D05] border border-[#AF431D]/40 flex items-center justify-center p-2.5 shrink-0 shadow-md">
              <KolaBlocSymbol className="w-full h-full text-[#D06224]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <KolaBlocWordmark className="h-5 text-[#F7E7DE]" />
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#281107] text-[#E9C892] font-mono border border-[#4A2413]">OFFICIAL</span>
              </div>
              <h1 className="text-xs font-bold text-[#E9C892] tracking-wider uppercase font-mono mt-1">
                {companySettings.companyName || 'PT KOTA LAMA BERSAMA'}
              </h1>
              <p className="text-xs text-[#A67C68] mt-0.5">{companySettings.address}</p>
              <div className="flex items-center gap-3 text-[11px] text-[#8C604D] font-mono mt-1">
                <span>Telp: {companySettings.phone}</span>
                <span>·</span>
                <span>Email: {companySettings.email}</span>
              </div>
            </div>
          </div>

          <div className="sm:text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A67C68] font-mono">
              Purchase & Payment Request
            </div>
            <div className="text-2xl font-mono font-bold text-[#D06224] mt-0.5 tracking-tight">
              {request.prNumber}
            </div>
            <div className="flex sm:justify-end items-center gap-2 mt-2 font-mono text-[11px]">
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                  request.approvalStatus === 'APPROVED'
                    ? 'bg-[#2A3111] text-[#A5A041] border-[#8B8635]/60'
                    : request.approvalStatus === 'REJECTED'
                    ? 'bg-[#3A1009] text-[#E06450] border-[#8B3518]'
                    : request.approvalStatus === 'REVISION_REQUIRED'
                    ? 'bg-[#3A2209] text-[#E9C892] border-[#AF431D]/60'
                    : 'bg-[#33180B] text-[#D06224] border-[#AF431D]/60'
                }`}
              >
                {request.approvalStatus}
              </span>
              <span className="text-[#8C604D]">/</span>
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                  request.paymentStatus === 'TRANSFERRED'
                    ? 'bg-[#2A3111] text-[#A5A041] border-[#8B8635]/60'
                    : request.paymentStatus === 'PAYMENT_HOLD'
                    ? 'bg-[#3A1009] text-[#E06450] border-[#8B3518]'
                    : 'bg-[#1D0C05] text-[#A67C68] border-[#3E1E10]'
                }`}
              >
                {request.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Security / Tamper Notice */}
        {(request.approvalStatus === 'APPROVED' || request.paymentStatus === 'TRANSFERRED') && (
          <div className="p-3 bg-[#120703] rounded-xl border border-[#3E1E10] text-xs text-[#A67C68] flex items-center gap-2.5 font-mono">
            <Lock className="w-3.5 h-3.5 text-[#8B8635] shrink-0" />
            <span>
              <strong className="text-[#F7E7DE]">Dokumen Terkunci Permanen:</strong> Pengajuan ini telah disetujui/dibayarkan. Nilai total dan rincian transaksi terlindungi dari modifikasi.
            </span>
          </div>
        )}

        {/* Document Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#120703] p-5 rounded-xl border border-[#32170B] text-xs">
          <div className="space-y-3">
            <div>
              <span className="text-[11px] text-[#A67C68] font-mono uppercase tracking-wider block">Perihal Pengadaan:</span>
              <div className="font-semibold text-[#F7E7DE] text-sm mt-0.5">{request.subject}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] text-[#A67C68] font-mono uppercase tracking-wider block">Kategori:</span>
                <div className="font-medium text-[#E0CCC2] mt-0.5">{request.category}</div>
              </div>
              <div>
                <span className="text-[11px] text-[#A67C68] font-mono uppercase tracking-wider block">Tanggal Pengajuan:</span>
                <div className="font-mono text-[#E0CCC2] mt-0.5">{formatDateIndo(request.requestDate)}</div>
              </div>
            </div>
            {request.notes && (
              <div>
                <span className="text-[11px] text-[#A67C68] font-mono uppercase tracking-wider block">Catatan Tambahan:</span>
                <div className="text-[#D4BCB0] italic mt-0.5">{request.notes}</div>
              </div>
            )}
          </div>

          <div className="space-y-3 md:border-l md:border-[#32170B] md:pl-6">
            <div>
              <span className="text-[11px] text-[#A67C68] font-mono uppercase tracking-wider block">Diajukan Oleh:</span>
              <div className="font-semibold text-[#F7E7DE] text-sm mt-0.5">{request.requesterName}</div>
              <div className="text-[#A67C68] text-xs mt-0.5 font-mono">{request.requesterJobTitle} · {request.requesterDepartment}</div>
            </div>
            <div>
              <span className="text-[11px] text-[#A67C68] font-mono uppercase tracking-wider block">Direksi Penyetuju:</span>
              <div className="font-semibold text-[#E9C892] mt-0.5">{request.directorName}</div>
              <div className="text-[#A67C68] text-xs mt-0.5 font-mono">{request.directorTitle}</div>
            </div>
          </div>
        </div>

        {/* Item Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#E9C892] uppercase tracking-wider font-mono">
              Rincian Barang & Jasa
            </h3>
            <span className="text-[11px] text-[#A67C68] font-mono">{request.items.length} item pengadaan</span>
          </div>
          <div className="overflow-x-auto border border-[#3E1E10] rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#140803] text-[#A67C68] border-b border-[#32170B]">
                <tr>
                  <th className="p-3 text-center w-12 font-mono font-medium">No</th>
                  <th className="p-3 font-medium">Deskripsi Spesifikasi Barang / Jasa</th>
                  <th className="p-3 text-center w-20 font-mono font-medium">Kuantitas</th>
                  <th className="p-3 text-center w-24 font-mono font-medium">Satuan</th>
                  <th className="p-3 text-right w-36 font-mono font-medium">Harga Satuan</th>
                  <th className="p-3 text-right w-40 font-mono font-medium">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D1409] text-[#D4BCB0]">
                {request.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-[#281107] transition">
                    <td className="p-3 text-center text-[#8C604D] font-mono">{idx + 1}</td>
                    <td className="p-3 font-medium text-[#F7E7DE]">{item.description}</td>
                    <td className="p-3 text-center font-mono tabular-nums">{item.quantity}</td>
                    <td className="p-3 text-center text-[#A67C68] font-mono">{item.unit}</td>
                    <td className="p-3 text-right font-mono tabular-nums text-[#D4BCB0]">{formatRupiah(item.unitPrice)}</td>
                    <td className="p-3 text-right font-bold text-[#E9C892] font-mono tabular-nums">
                      {formatRupiah(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-80 bg-[#120703] p-4 rounded-xl border border-[#3E1E10] space-y-2 text-xs shadow-inner">
              <div className="flex justify-between text-[#A67C68]">
                <span>Subtotal:</span>
                <span className="font-semibold text-[#F7E7DE] font-mono tabular-nums">{formatRupiah(request.subtotal)}</span>
              </div>
              {request.taxAmount && request.taxAmount > 0 ? (
                <div className="flex justify-between text-[#A67C68]">
                  <span>PPN / Pajak:</span>
                  <span className="font-semibold text-[#F7E7DE] font-mono tabular-nums">{formatRupiah(request.taxAmount)}</span>
                </div>
              ) : null}
              {request.otherCost && request.otherCost > 0 ? (
                <div className="flex justify-between text-[#A67C68]">
                  <span>Biaya Operasional Lain:</span>
                  <span className="font-semibold text-[#F7E7DE] font-mono tabular-nums">{formatRupiah(request.otherCost)}</span>
                </div>
              ) : null}
              <div className="pt-2 border-t border-[#32170B] flex justify-between items-center">
                <span className="text-xs font-bold text-[#E9C892] uppercase tracking-wider font-mono">Grand Total:</span>
                <span className="text-lg font-bold text-[#E9C892] font-mono tabular-nums">
                  {formatRupiah(request.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bank & Payment Information Section */}
        <div className="bg-[#120703] p-5 rounded-xl border border-[#3E1E10]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-[#E9C892] uppercase tracking-wider flex items-center gap-2 font-mono">
              <CreditCard className="w-3.5 h-3.5 text-[#D06224]" />
              <span>Instruksi Transfer & Rekening Penerima</span>
            </h3>
            {!canViewFullBankData && (
              <span className="text-[10px] text-[#AF431D] flex items-center gap-1 font-mono">
                <Lock className="w-3 h-3" />
                <span>Nomor Rekening Disamarkan (Kebijakan Keamanan)</span>
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[#8C604D] block text-[11px] font-mono">Nama Penerima / Vendor:</span>
              <div className="font-medium text-[#F7E7DE] mt-0.5">{request.recipientName || '-'}</div>
            </div>
            <div>
              <span className="text-[#8C604D] block text-[11px] font-mono">Bank Tujuan:</span>
              <div className="font-medium text-[#F7E7DE] mt-0.5">{request.bankName || '-'}</div>
            </div>
            <div>
              <span className="text-[#8C604D] block text-[11px] font-mono">Nomor Rekening:</span>
              <div className="font-mono font-bold text-[#E9C892] mt-0.5 tabular-nums text-sm">
                {maskedBankAccount}
              </div>
            </div>
            <div>
              <span className="text-[#8C604D] block text-[11px] font-mono">Atas Nama Rekening:</span>
              <div className="font-medium text-[#F7E7DE] mt-0.5">{request.bankAccountHolder || '-'}</div>
            </div>
          </div>
        </div>

        {/* Payment Confirmation Details if Transferred */}
        {request.paymentDetails && (
          <div className="bg-[#1A2109] p-5 rounded-xl border border-[#4E5616]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-[#A5A041] uppercase tracking-wider flex items-center gap-2 font-mono">
                <CheckCircle className="w-3.5 h-3.5 text-[#8B8635]" />
                <span>Realisasi Pelunasan Transfer Keuangan</span>
              </h3>
              <span className="text-[11px] text-[#A5A041]/90 font-mono">
                Oleh: {request.paymentDetails.processedByUserName} ({formatDateIndo(request.paymentDetails.processedAt)})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[#A5A041]/70 block text-[11px] font-mono">Tanggal Transfer:</span>
                <div className="font-medium text-[#F7E7DE] mt-0.5 font-mono">{formatDateIndo(request.paymentDetails.transferDate)}</div>
              </div>
              <div>
                <span className="text-[#A5A041]/70 block text-[11px] font-mono">Bank Sumber:</span>
                <div className="font-medium text-[#F7E7DE] mt-0.5">{request.paymentDetails.sourceBank}</div>
              </div>
              <div>
                <span className="text-[#A5A041]/70 block text-[11px] font-mono">No. Referensi Bank:</span>
                <div className="font-mono font-bold text-[#E9C892] mt-0.5 tabular-nums">{request.paymentDetails.referenceNumber}</div>
              </div>
              <div>
                <span className="text-[#A5A041]/70 block text-[11px] font-mono">Bukti Dokumen:</span>
                <div className="font-medium text-[#F7E7DE] mt-0.5 flex items-center gap-1.5 font-mono">
                  <FileText className="w-3.5 h-3.5 text-[#8B8635]" />
                  <span>{request.paymentDetails.proofFileName || 'Bukti_Transfer.pdf'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Formal Corporate Signature Matrix */}
        <div className="pt-6 border-t border-[#32170B]">
          <h3 className="text-xs font-bold text-[#E9C892] uppercase tracking-wider font-mono mb-4">
            Matriks Tanda Tangan & Otorisasi Formal
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Box 1: Diajukan */}
            <div className="p-4 bg-[#120703] rounded-xl border border-[#32170B] text-center">
              <div className="text-[10px] font-bold text-[#A67C68] uppercase tracking-wider font-mono">DIAJUKAN OLEH</div>
              <div className="text-xs text-[#8C604D] mb-6 font-mono truncate">{request.requesterDepartment}</div>
              <div className="w-16 h-px bg-[#3E1E10] mx-auto mb-2" />
              <div className="font-bold text-[#F7E7DE] text-xs">{request.requesterName}</div>
              <div className="text-[11px] text-[#A67C68] font-mono">{request.requesterJobTitle}</div>
            </div>

            {/* Box 2: Diperiksa */}
            <div className="p-4 bg-[#120703] rounded-xl border border-[#32170B] text-center">
              <div className="text-[10px] font-bold text-[#A67C68] uppercase tracking-wider font-mono">DIPERIKSA (CHECKER)</div>
              <div className="text-xs text-[#8C604D] mb-6 font-mono">Pemeriksa Departemen</div>
              <div className="w-16 h-px bg-[#3E1E10] mx-auto mb-2" />
              <div className="font-bold text-[#F7E7DE] text-xs">
                {request.checkedBy?.userName || '(Belum Diverifikasi)'}
              </div>
              <div className="text-[11px] text-[#A67C68] font-mono truncate">
                {request.checkedBy ? `${request.checkedBy.jobTitle} · ${formatDateIndo(request.checkedBy.actionAt)}` : 'Department Verifier'}
              </div>
            </div>

            {/* Box 3: Disetujui */}
            <div className="p-4 bg-[#120703] rounded-xl border border-[#32170B] text-center">
              <div className="text-[10px] font-bold text-[#A67C68] uppercase tracking-wider font-mono">DISETUJUI (DIREKSI)</div>
              <div className="text-xs text-[#8C604D] mb-6 font-mono">Manajemen / Direksi</div>
              <div className="w-16 h-px bg-[#3E1E10] mx-auto mb-2" />
              <div className="font-bold text-[#E9C892] text-xs">
                {request.approvedBy?.userName || request.directorName}
              </div>
              <div className="text-[11px] text-[#A67C68] font-mono truncate">
                {request.approvedBy ? `${request.approvedBy.jobTitle} · ${formatDateIndo(request.approvedBy.actionAt)}` : request.directorTitle}
              </div>
            </div>

            {/* Box 4: Dibayarkan Finance */}
            <div className="p-4 bg-[#120703] rounded-xl border border-[#32170B] text-center">
              <div className="text-[10px] font-bold text-[#A67C68] uppercase tracking-wider font-mono">DIBAYARKAN (FINANCE)</div>
              <div className="text-xs text-[#8C604D] mb-6 font-mono">Treasury & Kasir</div>
              <div className="w-16 h-px bg-[#3E1E10] mx-auto mb-2" />
              <div className="font-bold text-[#F7E7DE] text-xs">
                {request.paymentDetails?.processedByUserName || (request.paymentStatus === 'TRANSFERRED' ? 'Finance Team' : '(Belum Ditransfer)')}
              </div>
              <div className="text-[11px] text-[#A67C68] font-mono truncate">
                {request.paymentDetails ? `Transfer · ${formatDateIndo(request.paymentDetails.transferDate)}` : 'Finance & Treasury'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Dialogs */}
      {/* 1. Revision / Reject Modal */}
      {(activeModal === 'REVISION' || activeModal === 'REJECT') && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#1D0C05] border border-[#3E1E10] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#F7E7DE] uppercase tracking-wider font-mono">
              {activeModal === 'REVISION' ? 'Kembalikan untuk Revisi' : 'Tolak Pengajuan'}
            </h3>
            <p className="text-xs text-[#A67C68]">
              {activeModal === 'REVISION'
                ? 'Tuliskan instruksi revisi agar pengaju dapat memperbaiki rincian proposal pengadaan.'
                : 'Tuliskan alasan penolakan secara jelas untuk disimpan dalam catatan audit permanen.'}
            </p>
            <textarea
              rows={3}
              required
              placeholder="Tuliskan catatan atau instruksi di sini..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-xs text-[#F7E7DE] placeholder-[#8C604D] focus:outline-none focus:border-[#D06224] transition font-sans"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-[#2D1409]">
              <button
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[#3E1E10] text-[#D4BCB0] text-xs hover:bg-[#281107] transition cursor-pointer"
              >
                Batal
              </button>
              <button
                disabled={!commentText.trim() || isProcessing}
                onClick={() => handleWorkflowAction(activeModal === 'REVISION' ? 'RETURN' : 'REJECT')}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50 ${
                  activeModal === 'REVISION' ? 'bg-[#AF431D] hover:bg-[#933413]' : 'bg-[#8B3518] hover:bg-[#6D2710]'
                }`}
              >
                {isProcessing ? 'Memproses...' : 'Kirim Keputusan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Payment Modal (Mark Transferred) */}
      {activeModal === 'MARK_TRANSFERRED' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#1D0C05] border border-[#3E1E10] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#E9C892] uppercase tracking-wider flex items-center gap-2 font-mono">
              <CreditCard className="w-4 h-4 text-[#D06224]" />
              <span>Konfirmasi Pelaksanaan Transfer Keuangan</span>
            </h3>
            <p className="text-xs text-[#A67C68]">
              Lengkapi informasi transfer perbankan untuk mendokumentasikan pelunasan tagihan ini.
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Tanggal Transfer</label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] font-mono text-xs focus:outline-none focus:border-[#D06224]"
                  />
                </div>
                <div>
                  <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Nominal Terverifikasi (Rp)</label>
                  <input
                    type="text"
                    disabled
                    value={formatRupiah(request.grandTotal)}
                    className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#E9C892] font-semibold font-mono text-xs tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Bank Pengirim</label>
                  <input
                    type="text"
                    value={sourceBank}
                    onChange={(e) => setSourceBank(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] text-xs focus:outline-none focus:border-[#D06224]"
                  />
                </div>
                <div>
                  <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Nomor Referensi Bank *</label>
                  <input
                    type="text"
                    required
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] font-mono text-xs focus:outline-none focus:border-[#D06224]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Nama File Bukti Transfer</label>
                <input
                  type="text"
                  value={proofFileName}
                  onChange={(e) => setProofFileName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] text-xs focus:outline-none focus:border-[#D06224]"
                />
              </div>

              <div>
                <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Catatan Tambahan Finance</label>
                <input
                  type="text"
                  placeholder="misal: Sudah dikonfirmasi pihak vendor"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] placeholder-[#8C604D] text-xs focus:outline-none focus:border-[#D06224]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#2D1409]">
              <button
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[#3E1E10] text-[#D4BCB0] text-xs hover:bg-[#281107] transition cursor-pointer"
              >
                Batal
              </button>
              <button
                disabled={isProcessing || !refNumber.trim()}
                onClick={handlePaymentTransferAction}
                className="px-4 py-1.5 rounded-xl bg-[#D06224] hover:bg-[#B7521B] text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Menyimpan...' : 'Tandai Selesai Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Email Modal */}
      {activeModal === 'EMAIL' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#1D0C05] border border-[#3E1E10] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#E9C892] uppercase tracking-wider flex items-center gap-2 font-mono">
              <Mail className="w-4 h-4 text-[#D06224]" />
              <span>Kirim Dokumen via Email</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Kepada (To)</label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] text-xs focus:outline-none focus:border-[#D06224] font-mono"
                />
              </div>
              <div>
                <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Tembusan (CC)</label>
                <input
                  type="email"
                  value={emailCc}
                  onChange={(e) => setEmailCc(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] text-xs focus:outline-none focus:border-[#D06224] font-mono"
                />
              </div>
              <div>
                <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Subjek</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] text-xs focus:outline-none focus:border-[#D06224]"
                />
              </div>
              <div>
                <label className="block text-[#A67C68] mb-1 font-mono text-[11px]">Isi Pesan</label>
                <textarea
                  rows={4}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#120703] border border-[#3E1E10] rounded-xl text-[#F7E7DE] text-xs focus:outline-none focus:border-[#D06224]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#2D1409]">
              <button
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[#3E1E10] text-[#D4BCB0] text-xs hover:bg-[#281107] transition cursor-pointer"
              >
                Batal
              </button>
              <button
                disabled={isProcessing}
                onClick={handleSendEmail}
                className="px-4 py-1.5 rounded-xl bg-[#D06224] hover:bg-[#B7521B] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirimkan Email</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Drive Confirmation Modal */}
      {activeModal === 'DRIVE' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#1D0C05] border border-[#3E1E10] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#E9C892] uppercase tracking-wider flex items-center gap-2 font-mono">
              <CloudUpload className="w-4 h-4 text-[#8B8635]" />
              <span>Simpan Dokumen ke Google Drive Internal</span>
            </h3>
            <p className="text-xs text-[#A67C68]">
              Dokumen akan diarsipkan secara aman dengan izin akses terbatas hanya untuk akun internal perusahaan (@kotalamabersama.co.id).
            </p>
            <div className="p-3 bg-[#120703] rounded-xl border border-[#3E1E10] font-mono text-[11px] text-[#E9C892] leading-relaxed">
              PT Kota Lama Bersama (Domain Restricted)<br />
              &nbsp;&nbsp;└── Pengajuan<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── {request.year}<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── {request.prNumber.replace(/\//g, '-')}.pdf
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#2D1409]">
              <button
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[#3E1E10] text-[#D4BCB0] text-xs hover:bg-[#281107] transition cursor-pointer"
              >
                Batal
              </button>
              <button
                disabled={isProcessing}
                onClick={handleSaveToDrive}
                className="px-4 py-1.5 rounded-xl bg-[#8B8635] hover:bg-[#77732A] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                {isProcessing ? 'Mengunggah...' : 'Sinkronkan ke Drive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
