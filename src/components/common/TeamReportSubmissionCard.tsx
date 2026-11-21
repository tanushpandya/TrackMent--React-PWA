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
import { AppCard } from './AppCard';

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
      setErrorMsg('Only PDF documents are accepted for institutional project reports.');
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
      setErrorMsg('Please enter a descriptive note (e.g. Final Phase 3 Report or Appendix).');
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
      setErrorMsg(err.message || 'Failed to upload report. Please check network and retry.');
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
    if (!window.confirm(`Are you sure you want to permanently delete "${report.fileName}"?`)) {
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
      <div
        style={{
          flex: 1,
          borderRadius: 14,
          border: '1px solid #D5E8EF',
          background: '#FFFFFF',
          padding: 16,
          boxShadow: '0 2px 8px rgba(12, 64, 101, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          {/* Header Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: isMandatory ? '#FFF4D8' : '#E5F3FA',
                  color: isMandatory ? '#A67827' : '#0B4D88',
                  border: isMandatory ? '1px solid rgba(166, 120, 39, 0.3)' : '1px solid rgba(11, 77, 136, 0.2)',
                  textTransform: 'uppercase',
                }}
              >
                {badgeText}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#102F48' }}>{title}</span>
            </div>

            {report ? (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#328F81',
                  background: '#E4F6F0',
                  padding: '2px 8px',
                  borderRadius: 99,
                }}
              >
                <CheckCircle2 size={12} /> Submitted
              </span>
            ) : (
              <span style={{ fontSize: 11, color: '#7992A1', fontWeight: 600 }}>Not submitted</span>
            )}
          </div>

          {report ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: 12,
                  borderRadius: 10,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    background: '#FBECEB',
                    color: '#B34F5C',
                    flexShrink: 0,
                  }}
                >
                  <FileText size={20} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: '#102F48',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={report.fileName}
                  >
                    {report.fileName}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7992A1', marginTop: 2 }}>
                    <span>{formatFileSize(report.fileSizeBytes)}</span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Clock size={11} />
                      {new Date(report.uploadedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {report.description && (
                    <div
                      style={{
                        fontSize: 12,
                        color: '#31566E',
                        marginTop: 6,
                        padding: '6px 8px',
                        borderRadius: 6,
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        fontStyle: 'italic',
                      }}
                    >
                      "{report.description}"
                    </div>
                  )}
                  {report.uploadedBy && (
                    <div style={{ fontSize: 10.5, color: '#7992A1', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <User size={10} />
                      <span>Uploaded by: {report.uploadedBy}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => handleViewReport(report)}
                  disabled={isSlotBusy}
                  className="btn btn-sm btn-primary"
                  style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
                >
                  {viewingSlot === slot ? (
                    <RefreshCw size={13} className="spin" />
                  ) : (
                    <ExternalLink size={13} />
                  )}
                  <span>View PDF</span>
                </button>

                {isLeader && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenModal(slot, title, report)}
                      disabled={isSlotBusy}
                      className="btn btn-sm"
                      style={{ padding: '8px 12px', fontSize: 12 }}
                      title="Replace report"
                    >
                      <RefreshCw size={13} />
                      <span>Replace</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteReport(report)}
                      disabled={isSlotBusy}
                      className="btn btn-sm btn-danger"
                      style={{ padding: '8px 10px', fontSize: 12 }}
                      title="Delete report"
                    >
                      {deletingSlot === slot ? (
                        <RefreshCw size={13} className="spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '24px 16px',
                borderRadius: 12,
                border: '1px dashed #D5E8EF',
                background: '#F8FAFC',
                minHeight: 140,
              }}
            >
              <UploadCloud size={32} color="#7992A1" style={{ marginBottom: 6 }} />
              <p style={{ fontSize: 12, color: '#5E788C', margin: '0 0 10px 0' }}>
                {isLeader
                  ? `Upload ${isMandatory ? 'required' : 'optional'} institutional report (PDF, max 10MB)`
                  : 'Pending submission by Team Lead'}
              </p>
              {isLeader && (
                <button
                  type="button"
                  onClick={() => handleOpenModal(slot, title)}
                  className="btn btn-sm btn-primary"
                  style={{ padding: '7px 16px' }}
                >
                  <UploadCloud size={14} />
                  <span>Upload PDF</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <AppCard
      title="Institutional Team Project Reports"
      subtitle="Official institutional project reports for faculty evaluation and RVCE archiving."
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: 14,
        }}
      >
        {renderSlotCard('primary', 'Primary Project Report', 'Slot 1 • Core', true, primaryReport)}
        {renderSlotCard('supplementary', 'Supplementary Material', 'Slot 2 • Appendix', false, supplementaryReport)}
      </div>

      {/* Upload / Replace Modal */}
      {activeModalSlot && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(16, 47, 72, 0.65)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 500,
              borderRadius: 18,
              background: '#FFFFFF',
              boxShadow: '0 24px 60px rgba(10, 48, 77, 0.35)',
              padding: 24,
              border: '1px solid rgba(255, 255, 255, 0.8)',
            }}
          >
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isUploading}
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                background: 'transparent',
                border: 'none',
                color: '#7992A1',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: '#E5F3FA',
                  color: '#0B4D88',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <UploadCloud size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 900, color: '#102F48', margin: 0 }}>
                  {activeModalSlot.existing ? 'Replace Report' : 'Upload Team Report'}
                </h4>
                <p style={{ fontSize: 12, color: '#5E788C', margin: '2px 0 0 0' }}>
                  {activeModalSlot.title} • PDF format only (max 10 MB)
                </p>
              </div>
            </div>

            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: '#FBECEB',
                  border: '1px solid rgba(179, 79, 92, 0.3)',
                  color: '#B34F5C',
                  fontSize: 12.5,
                  fontWeight: 600,
                  marginBottom: 14,
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#102F48', display: 'block', marginBottom: 4 }}>
                  Select PDF Document *
                </label>
                <div
                  style={{
                    position: 'relative',
                    border: '2px dashed #D5E8EF',
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                    }}
                  />
                  <FileText size={28} color="#0B4D88" style={{ margin: '0 auto 6px' }} />
                  {selectedFile ? (
                    <div style={{ fontSize: 12.5 }}>
                      <span style={{ fontWeight: 700, color: '#102F48' }}>{selectedFile.name}</span>
                      <span style={{ color: '#5E788C', marginLeft: 6 }}>({formatFileSize(selectedFile.size)})</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#5E788C' }}>
                      <span style={{ fontWeight: 700, color: '#0B4D88' }}>Click to choose PDF</span> or drag & drop file
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#102F48', display: 'block', marginBottom: 4 }}>
                  Descriptive Note / Version Tag *
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isUploading}
                  placeholder="e.g. Phase 3 Experiential Learning Report with architecture blueprints"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #D5E8EF',
                    background: '#FFFFFF',
                    fontSize: 13,
                    color: '#102F48',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isUploading}
                  className="btn btn-sm"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="btn btn-sm btn-primary"
                  style={{ padding: '8px 20px' }}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw size={13} className="spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={14} />
                      <span>Submit Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppCard>
  );
};
