import React from 'react';
import { X, Download, FileText, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { formatFileSize, downloadOrOpenFile } from '../lib/fileUploadHelper';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    fileName: string;
    fileUrl: string;
    fileType?: string;
    fileSize?: number;
  } | null;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ isOpen, onClose, file }) => {
  if (!isOpen || !file) return null;

  const isImage = file.fileType?.startsWith('image/') || 
    /\.(jpg|jpeg|png|gif|webp)$/i.test(file.fileName);

  const isPdf = file.fileType === 'application/pdf' || 
    file.fileName.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#1D0C05] border border-[#3E1E10] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#32170B] bg-[#140803]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#281107] border border-[#4A2413] flex items-center justify-center text-[#E9C892] shrink-0">
              {isImage ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-[#F7E7DE] truncate font-mono">{file.fileName}</h3>
              <p className="text-[11px] text-[#A67C68] font-mono">
                {file.fileSize ? formatFileSize(file.fileSize) : 'Ukuran tidak diketahui'} · {file.fileType || 'Dokumen'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadOrOpenFile(file.fileUrl, file.fileName)}
              className="px-3 py-1.5 bg-[#D06224] hover:bg-[#B7521B] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Unduh file ke perangkat"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Unduh File</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#A67C68] hover:text-[#F7E7DE] hover:bg-[#281107] rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#0D0401]">
          {isImage ? (
            <div className="max-w-full max-h-[70vh] flex items-center justify-center">
              <img
                src={file.fileUrl}
                alt={file.fileName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg border border-[#3E1E10] shadow-lg"
              />
            </div>
          ) : isPdf && file.fileUrl.startsWith('data:application/pdf') ? (
            <iframe
              src={file.fileUrl}
              title={file.fileName}
              className="w-full h-[65vh] rounded-lg border border-[#3E1E10]"
            />
          ) : (
            <div className="text-center p-8 space-y-4 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-[#281107] border border-[#4A2413] flex items-center justify-center text-[#E9C892] mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#F7E7DE]">{file.fileName}</h4>
                <p className="text-xs text-[#A67C68] mt-1">
                  File ini siap diunduh dan dibuka dengan aplikasi pembaca dokumen di perangkat Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadOrOpenFile(file.fileUrl, file.fileName)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D06224] hover:bg-[#B7521B] text-white rounded-xl text-xs font-bold transition shadow-lg shadow-[#D06224]/20 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh & Buka Dokumen</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
