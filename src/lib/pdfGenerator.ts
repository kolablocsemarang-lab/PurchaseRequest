import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RequestDocument, CompanySettings } from '../types';
import { formatRupiah, formatDateIndo } from './utils';

export function generateRequestPDF(
  request: RequestDocument,
  companySettings: CompanySettings,
  maskBank = false
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;

  // Header / Letterhead
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(208, 98, 36); // Kola Bloc Chile Rojo #D06224
  doc.text('KOLA BLOC', margin, 23);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(34, 13, 5); // Deep Espresso
  doc.text(companySettings.companyName || 'PT KOTA LAMA BERSAMA', margin, 29);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(115, 74, 56); // Warm muted
  doc.text(companySettings.address || 'Kawasan Kota Lama, Semarang, Jawa Tengah', margin, 34);
  doc.text(`Telp: ${companySettings.phone || '(024) 8600-xxxx'} | Email: ${companySettings.email || 'finance@kolabloc.com'}`, margin, 38);

  // Line separator in Kola Bloc Chile Rojo
  doc.setDrawColor(208, 98, 36);
  doc.setLineWidth(1);
  doc.line(margin, 42, pageWidth - margin, 42);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(34, 13, 5); // Espresso
  doc.text('SURAT PENGAJUAN (PURCHASE & PAYMENT REQUEST)', margin, 50);

  // Metadata Grid
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(140, 96, 77);

  const metaStartY = 57;
  const leftColX = margin;
  const leftValX = margin + 32;
  const rightColX = margin + 90;
  const rightValX = margin + 120;

  // Left column
  doc.text('Nomor PR', leftColX, metaStartY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(208, 98, 36);
  doc.text(`: ${request.prNumber}`, leftValX, metaStartY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Tanggal', leftColX, metaStartY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${formatDateIndo(request.requestDate)}`, leftValX, metaStartY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Departemen', leftColX, metaStartY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${request.department}`, leftValX, metaStartY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Kategori', leftColX, metaStartY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${request.category}`, leftValX, metaStartY + 18);

  // Right column
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Perihal', rightColX, metaStartY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${request.subject}`, rightValX, metaStartY, { maxWidth: 60 });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Status Approval', rightColX, metaStartY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52); // green-800
  doc.text(`: ${request.approvalStatus}`, rightValX, metaStartY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Status Bayar', rightColX, metaStartY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138); // blue-800
  doc.text(`: ${request.paymentStatus}`, rightValX, metaStartY + 18);

  // Kepada Yth. section
  const addressY = metaStartY + 26;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Kepada Yth.', margin, addressY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(request.directorName || 'Direktur Utama', margin, addressY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${request.directorTitle || 'Direksi'} - di Tempat`, margin, addressY + 9);

  // Opening text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(
    'Dengan hormat,\nDalam rangka menunjang kebutuhan operasional PT Kota Lama Bersama, bersama ini kami mengajukan kebutuhan sebagai berikut:',
    margin,
    addressY + 16
  );

  // Table items
  const tableData = request.items.map((item, idx) => [
    (idx + 1).toString(),
    item.description,
    item.quantity.toLocaleString('id-ID'),
    item.unit,
    formatRupiah(item.unitPrice),
    formatRupiah(item.totalPrice),
  ]);

  const startTableY = addressY + 26;

  autoTable(doc, {
    startY: startTableY,
    head: [['No', 'Keterangan Barang / Jasa', 'Qty', 'Unit', 'Nominal (Rp)', 'Jumlah (Rp)']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [208, 98, 36], // Kola Bloc Chile Rojo
      textColor: 255,
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 32, halign: 'right' },
      5: { cellWidth: 35, halign: 'right' },
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
    },
    margin: { left: margin, right: margin },
  });

  // Calculate totals box position
  const finalY = (doc as any).lastAutoTable.finalY + 4;

  // Subtotal & Grand Total breakdown
  const totalsXLabel = pageWidth - margin - 75;
  const totalsXVal = pageWidth - margin;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', totalsXLabel, finalY + 4);
  doc.text(formatRupiah(request.subtotal), totalsXVal, finalY + 4, { align: 'right' });

  if (request.taxAmount && request.taxAmount > 0) {
    doc.text('PPN / Pajak:', totalsXLabel, finalY + 9);
    doc.text(formatRupiah(request.taxAmount), totalsXVal, finalY + 9, { align: 'right' });
  }

  if (request.otherCost && request.otherCost > 0) {
    doc.text('Biaya Lain-lain:', totalsXLabel, finalY + 14);
    doc.text(formatRupiah(request.otherCost), totalsXVal, finalY + 14, { align: 'right' });
  }

  const grandTotalY = finalY + (request.taxAmount ? 14 : 9) + (request.otherCost ? 5 : 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('GRAND TOTAL:', totalsXLabel, grandTotalY);
  doc.setTextColor(22, 101, 52); // dark green
  doc.text(formatRupiah(request.grandTotal), totalsXVal, grandTotalY, { align: 'right' });

  // Payment destination box
  const bankBoxY = grandTotalY + 8;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, bankBoxY, pageWidth - margin * 2, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('INFORMASI REKENING PEMBAYARAN / TRANSFER:', margin + 4, bankBoxY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const displayAcc = maskBank && request.bankAccountNumber
    ? `•••• •••• ${request.bankAccountNumber.slice(-4)}`
    : (request.bankAccountNumber || '-');

  doc.text(`Nama Penerima : ${request.recipientName || '-'}`, margin + 4, bankBoxY + 11);
  doc.text(`Bank Tujuan     : ${request.bankName || '-'}`, margin + 4, bankBoxY + 16);
  doc.text(`No. Rekening    : ${displayAcc}`, margin + 90, bankBoxY + 11);
  doc.text(`Atas Nama       : ${request.bankAccountHolder || '-'}`, margin + 90, bankBoxY + 16);

  // Signatures Area
  const signY = bankBoxY + 28;
  const colWidth = (pageWidth - margin * 2) / 3;

  // Sign 1: Diajukan Oleh
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DIAJUKAN OLEH,', margin + colWidth * 0.5, signY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(request.requesterDepartment, margin + colWidth * 0.5, signY + 4, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(request.requesterName, margin + colWidth * 0.5, signY + 24, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(request.requesterJobTitle, margin + colWidth * 0.5, signY + 28, { align: 'center' });

  // Sign 2: Diperiksa Oleh
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DIPERIKSA OLEH,', margin + colWidth * 1.5, signY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Department Head / Checker', margin + colWidth * 1.5, signY + 4, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(request.checkedBy?.userName || '(..................................)', margin + colWidth * 1.5, signY + 24, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(request.checkedBy?.jobTitle || 'Checker Verifier', margin + colWidth * 1.5, signY + 28, { align: 'center' });

  // Sign 3: Disetujui Oleh
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DISETUJUI OLEH,', margin + colWidth * 2.5, signY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Direksi / Management', margin + colWidth * 2.5, signY + 4, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(request.approvedBy?.userName || request.directorName || '(..................................)', margin + colWidth * 2.5, signY + 24, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(request.approvedBy?.jobTitle || request.directorTitle || 'Direktur Utama', margin + colWidth * 2.5, signY + 28, { align: 'center' });

  // Document Footer
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(companySettings.documentFooter, margin, pageHeight - 10);
  doc.text(
    `Doc ID: ${request.id} | Dibuat: ${formatDateIndo(request.createdAt)} | Halaman 1 dari 1`,
    pageWidth - margin,
    pageHeight - 10,
    { align: 'right' }
  );

  return doc;
}
