import React, { useState } from 'react';
import {
  FileText,
  UploadCloud,
  ExternalLink,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  X,
  FileCheck,
} from 'lucide-react';
import { TeamModel, TeamReportModel } from '../../types';
import { TeamService } from '../../services/team.service';
import { MAX_REPORT_FILE_SIZE_BYTES } from '../../services/supabase';

interface Props {
  team: TeamModel;
  isLeader?: boolean;
  onUpdated?: () => void;
}

export const TeamReportSubmissionCard: React.FC<Props> = ({
  team,
  isLeader = false,
  onUpdated,
}) => {
  const [activeModalSlot, setActiveModalSlot] = useState<{
    slot: 'primary' | 'supplementary';
    title: string;
    existing?: TeamReportModel;
  } | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewingSlot, setViewingSlot] = useState<string | null>(null);
  const [deletingSlot, setDeletingSlot] = useState<string | null>(null);

  const reports = team.reports || [];
  const primaryReport = reports.find((r) => r.slot === 'primary');
  const supplementaryReport = reports.find((r) => r.slot === 'supplementary');

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 KB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1.0) return `${mb.toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  const handleOpenModal = (slot: 'primary' | 'supplementary', title: string, existing?: TeamReportModel) => {
    setSelectedFile(null);
    setDescription(existing?.description || '');
    setErrorMsg(null);
    setActiveModalSlot({ slot, title, existing });
  };

  const handleCloseModal = () => {
    if (isUploading) return;
    setActiveModalSlot(null);
    setSelectedFile(null);
    setDescription('');
    setErrorMsg(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Only PDF documents are accepted for project reports.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_REPORT_FILE_SIZE_BYTES) {
      setErrorMsg('File exceeds institutional maximum limit of 10 MB.');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalSlot) return;
    if (!selectedFile) {
      setErrorMsg('Please select a PDF file to upload.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please enter a descriptive note (e.g., Phase 3 Final Report or Appendix).');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      await TeamService.uploadTeamReport({
        teamId: team.id,
        slot: activeModalSlot.slot,
        file: selectedFile,
        description: description.trim(),
      });
      handleCloseModal();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload report. Please verify connection and retry.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewReport = async (report: TeamReportModel) => {
    setViewingSlot(report.slot);
    try {
      const url = await TeamService.getReportSignedUrl(report.storagePath);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      alert(err.message || 'Failed to generate secure viewing link.');
    } finally {
      setViewingSlot(null);
    }
  };

  const handleDeleteReport = async (report: TeamReportModel) => {
    if (!window.confirm(`Are you sure you want to delete "${report.fileName}"? This cannot be undone.`)) {
      return;
    }

    setDeletingSlot(report.slot);
    try {
      await TeamService.deleteTeamReport(team.id, report.slot);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to delete report.');
    } finally {
      setDeletingSlot(null);
    }
  };

  const renderSlotCard = (
    slot: 'primary' | 'supplementary',
    title: string,
    badgeText: string,
    isMandatory: boolean,
    report?: TeamReportModel
  ) => {
    const isSlotBusy = viewingSlot === slot || deletingSlot === slot;

    return (
      <div className="flex-1 rounded-xl border border-white/10 bg-slate-800/50 p-4 transition-all duration-200 hover:border-white/20">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isMandatory
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}
            >
              {badgeText}
            </span>
            <span className="text-xs text-slate-400 font-medium">{title}</span>
          </div>
          {report ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" /> Submitted
            </span>
          ) : (
            <span className="text-[11px] text-slate-500 font-medium">Not submitted</span>
          )}
        </div>

        {report ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-slate-900/60 p-3 rounded-lg border border-white/5">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate" title={report.fileName}>
                  {report.fileName}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                  <span>{formatFileSize(report.fileSizeBytes)}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {new Date(report.uploadedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {report.description && (
                  <p className="text-xs text-slate-300 mt-2 bg-slate-800/40 p-2 rounded border border-white/5 italic">
                    "{report.description}"
                  </p>
                )}
                {report.uploadedBy && (
                  <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    <User className="w-2.5 h-2.5" />
                    By: {report.uploadedBy}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleViewReport(report)}
                disabled={isSlotBusy}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition"
              >
                {viewingSlot === slot ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5" />
                )}
                View PDF
              </button>

              {isLeader && (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenModal(slot, title, report)}
                    disabled={isSlotBusy}
                    className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-xs font-medium transition"
                    title="Replace with updated version"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteReport(report)}
                    disabled={isSlotBusy}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition"
                    title="Delete report"
                  >
                    {deletingSlot === slot ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-900/40 rounded-lg border border-dashed border-white/10 min-h-[140px]">
            <UploadCloud className="w-8 h-8 text-slate-500 mb-2" />
            <p className="text-xs text-slate-400 mb-3">
              {isLeader
                ? `Upload ${isMandatory ? 'required' : 'optional'} institutional report (PDF, max 10MB)`
                : `Awaiting submission by team lead`}
            </p>
            {isLeader && (
              <button
                type="button"
                onClick={() => handleOpenModal(slot, title)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload PDF
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Team Project Reports
              <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-white/5">
                RVCE Deliverable
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Institutional project documentation for faculty mentor evaluation & final archiving
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderSlotCard('primary', 'Primary Project Report', 'Slot 1 • Core', true, primaryReport)}
        {renderSlotCard('supplementary', 'Supplementary Material', 'Slot 2 • Appendix', false, supplementaryReport)}
      </div>

      {/* Upload / Replace Modal */}
      {activeModalSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isUploading}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  {activeModalSlot.existing ? 'Replace Report' : 'Upload Team Report'}
                </h4>
                <p className="text-xs text-slate-400">
                  {activeModalSlot.title} • PDF format only (max 10 MB)
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select PDF Document *
                </label>
                <div className="relative border-2 border-dashed border-white/10 hover:border-emerald-500/50 rounded-xl p-4 text-center bg-slate-800/40 transition">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center">
                    <FileText className="w-8 h-8 text-emerald-400 mb-1" />
                    {selectedFile ? (
                      <div className="text-xs">
                        <span className="font-semibold text-white">{selectedFile.name}</span>
                        <span className="text-slate-400 ml-2">({formatFileSize(selectedFile.size)})</span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400">
                        <span className="font-semibold text-emerald-400">Click to browse</span> or drag and drop PDF file
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Descriptive Note / Version Tag *
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isUploading}
                  placeholder="e.g., Final Phase 3 Experiential Learning Report with appendices"
                  className="w-full rounded-xl border border-white/10 bg-slate-800/80 p-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-white shadow-lg shadow-emerald-600/30 transition"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
