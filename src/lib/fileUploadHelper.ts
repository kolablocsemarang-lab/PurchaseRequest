/**
 * File upload, image compression, and data URL helper for Purchase Request attachments & payment proofs.
 * Ensures attachments safely fit within Firestore document limits while preserving high document clarity.
 */

export const MAX_ATTACHMENT_SIZE_BYTES = 650 * 1024; // 650 KB

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Resizes and compresses image files using HTML5 Canvas to keep document size < 200KB
 */
export async function compressImageToDataUrl(
  file: File,
  maxDimension = 1400,
  quality = 0.82
): Promise<{ dataUrl: string; size: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak valid atau korup.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas rendering konteks tidak tersedia.'));
        }

        // Fill white background for potential transparent PNGs converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        // Estimate byte size from base64 string
        const size = Math.round((dataUrl.length * 3) / 4);
        resolve({ dataUrl, size });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Reads any allowed file (PDF, Word, Excel, or Image) into a base64 Data URL.
 * Automatically optimizes images and validates document size limits.
 */
export async function processUploadedFile(
  file: File
): Promise<{ fileName: string; fileUrl: string; fileType: string; fileSize: number }> {
  const isImage = file.type.startsWith('image/');
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

  if (isImage) {
    // Automatically compress images
    const compressed = await compressImageToDataUrl(file);
    return {
      fileName: sanitizedName,
      fileUrl: compressed.dataUrl,
      fileType: 'image/jpeg',
      fileSize: compressed.size,
    };
  }

  // Non-image files (PDF, XLSX, DOCX)
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error(
      `File "${file.name}" (${formatFileSize(file.size)}) melebihi batas maksimal ${formatFileSize(
        MAX_ATTACHMENT_SIZE_BYTES
      )}. Silakan perkecil atau kompres file PDF/dokumen sebelum diunggah.`
    );
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Gagal membaca file ${file.name}`));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  return {
    fileName: sanitizedName,
    fileUrl: dataUrl,
    fileType: file.type || 'application/octet-stream',
    fileSize: file.size,
  };
}

/**
 * Helper to download or open a stored file
 */
export function downloadOrOpenFile(fileUrl: string, fileName: string) {
  if (!fileUrl || fileUrl === '#') {
    alert('File tidak tersedia atau belum diunggah secara fisik.');
    return;
  }

  try {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'Dokumen_Lampiran';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    // Fallback: try opening in window
    const newWindow = window.open();
    if (newWindow) {
      newWindow.location.href = fileUrl;
    }
  }
}
