import React, { useEffect, useState } from 'react';
import { X, Download, FileText, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

export interface SecurePdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Async resolver or direct URL for the PDF (fetched into a Blob so raw Supabase URLs/tokens are never exposed) */
  pdfUrl?: string | null;
  resolveUrl?: () => Promise<string | null>;
  teamName: string;
  submissionNumber: string | number;
  title?: string;
}

function sanitizeFilenamePart(value: string | number): string {
  return String(value || 'Unknown')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '_');
}

export const SecurePdfViewerModal: React.FC<SecurePdfViewerModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  resolveUrl,
  teamName,
  submissionNumber,
  title,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadFilename = `${sanitizeFilenamePart(teamName)}_${sanitizeFilenamePart(submissionNumber)}.pdf`;

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    let createdUrl: string | null = null;

    const loadPdfBlob = async () => {
      try {
        setLoading(true);
        setError(null);
        setBlobUrl(null);

        const targetUrl = resolveUrl ? await resolveUrl() : pdfUrl;
        if (!targetUrl) {
          throw new Error('Document link is unavailable.');
        }

        const response = await fetch(targetUrl);
        if (!response.ok) {
          throw new Error(`Failed to load document (HTTP ${response.status}).`);
        }

        const arrayBuffer = await response.arrayBuffer();
        if (!active) return;

        const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
        createdUrl = URL.createObjectURL(pdfBlob);
        setBlobUrl(createdUrl);
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Unable to load PDF preview securely.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPdfBlob();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, pdfUrl, resolveUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!blobUrl) return;
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = downloadFilename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A2540]/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title || downloadFilename}
    >
      <div className="surface-card rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden shadow-modal border border-[#D6E4EE]">
        {/* Header */}
        <div className="frosted-chrome px-5 py-3.5 border-b border-[#D6E4EE] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D63ED] flex items-center justify-center shrink-0">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#0A2540] truncate">
                {title || downloadFilename}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 text-[#15803D] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Secure In-App Viewer
                </span>
                <span>•</span>
                <span className="font-mono truncate">{downloadFilename}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!blobUrl || loading}
              className="h-9 px-3.5 rounded-lg bg-[#1D63ED] hover:bg-[#1752C9] disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close PDF viewer"
              className="w-9 h-9 rounded-lg border border-[#D6E4EE] bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 bg-slate-100/90 relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-600">
              <Loader2 className="w-8 h-8 animate-spin text-[#1D63ED]" />
              <p className="text-xs font-semibold">Loading document securely...</p>
            </div>
          )}

          {!loading && error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[#FFF1F2] border border-[#FECDD3] text-[#BE123C] flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#0A2540]">Could not render PDF</p>
              <p className="text-xs text-slate-500 max-w-md">{error}</p>
            </div>
          )}

          {!loading && !error && blobUrl && (
            <div className="w-full h-full flex flex-col">
              <div className="sm:hidden px-4 py-2 bg-[#EFF6FF] border-b border-[#BFDBFE] text-[11px] text-[#0A2540] flex items-center justify-between gap-2">
                <span>Mobile preview limited? Save locally as <strong>{downloadFilename}</strong></span>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="shrink-0 font-bold text-[#1D63ED] underline"
                >
                  Download
                </button>
              </div>
              <iframe
                src={`${blobUrl}#toolbar=1&navpanes=0`}
                title={downloadFilename}
                className="w-full flex-1 border-0 bg-white"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
