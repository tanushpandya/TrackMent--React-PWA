import React, { useState } from 'react';
import { Upload, Plus, X, Link as LinkIcon, FileText, CheckCircle2, AlertTriangle, Loader2, FileCheck } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { ContributionService } from '../../services/contribution.service';
import { StorageService } from '../../services/storage.service';

interface SubmitContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SubmitContributionModal: React.FC<SubmitContributionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { team } = useTeam();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addLink = () => {
    const clean = linkInput.trim();
    if (!clean) return;
    try {
      const parsed = new URL(clean);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setErrorMsg('Only valid http:// or https:// links are permitted.');
        return;
      }
      if (links.length >= 10) {
        setErrorMsg('Maximum 10 external links allowed per deliverable.');
        return;
      }
      setLinks([...links, clean]);
      setLinkInput('');
      setErrorMsg(null);
    } catch {
      setErrorMsg('Please enter a valid URL (e.g. https://github.com/...).');
    }
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      const validFiles: File[] = [];

      for (const f of selected) {
        const val = StorageService.validateFile(f);
        if (!val.isValid) {
          setErrorMsg(val.errorMessage || 'Invalid file format or size.');
          return;
        }
        // Avoid adding duplicate files
        if (!files.some((existing) => existing.name === f.name && existing.size === f.size)) {
          validFiles.push(f);
        }
      }

      setFiles((prev) => [...prev, ...validFiles]);
      setErrorMsg(null);
      // Reset input value so same file can be re-selected if removed
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !team) return;
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Please enter both deliverable title and description.');
      return;
    }

    setLoading(true);
    setUploadProgress(10);
    setErrorMsg(null);

    // If user typed a link into the input box but forgot to click "+ Add", include it
    let finalLinks = [...links];
    const pendingLink = linkInput.trim();
    if (pendingLink) {
      try {
        const parsed = new URL(pendingLink);
        if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && !finalLinks.includes(pendingLink)) {
          finalLinks.push(pendingLink);
        }
      } catch (_) {}
    }

    let createdContribId: number | null = null;
    const uploadedPaths: string[] = [];

    try {
      // 1. Submit contribution row in Supabase
      const contrib = await ContributionService.submit({
        teamId: team.id,
        authorId: user.id,
        title: title.trim(),
        description: description.trim(),
        links: finalLinks,
      });
      createdContribId = contrib.id;
      setUploadProgress(30);

      // 2. Upload any attached proof files with progress feedback
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadedFile = await StorageService.uploadProof({
          teamId: team.id,
          contributionId: contrib.id,
          file,
        });
        uploadedPaths.push(uploadedFile.storagePath);
        const currentProgress = 30 + Math.round(((i + 1) / files.length) * 65);
        setUploadProgress(currentProgress);
      }

      setUploadProgress(100);
      showToast('Deliverable submitted for review.', 'success');
      onSuccess();
      onClose();

      // Reset form on success
      setTitle('');
      setDescription('');
      setLinks([]);
      setLinkInput('');
      setFiles([]);
    } catch (err: any) {
      console.error('[SubmitContribution] Upload failed, executing atomic rollback:', err);

      // ATOMIC ROLLBACK: Purge orphaned storage files & delete the contribution row
      if (uploadedPaths.length > 0) {
        await StorageService.removeProofs(uploadedPaths).catch(() => {});
      }
      if (createdContribId) {
        await ContributionService.deleteContribution(createdContribId, user.id).catch(() => {});
      }

      setErrorMsg(
        err?.message || 'File upload failed. Submission was rolled back to prevent incomplete records.'
      );
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Work & Deliverables"
      subtitle="Share your milestone progress with verifiable proofs for peer and mentor evaluation."
      maxWidth={580}
    >
      {errorMsg && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            background: '#FBECEB',
            color: '#B34F5C',
            fontSize: 12.5,
            fontWeight: 650,
            marginBottom: 16,
          }}
        >
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="contrib-title">
            Deliverable Title
          </label>
          <input
            id="contrib-title"
            type="text"
            required
            maxLength={150}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-input"
            placeholder="e.g. Completed User Interviews & Synthesis Document"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="contrib-desc">
            Summary & Impact Description
          </label>
          <textarea
            id="contrib-desc"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-textarea"
            placeholder="Describe what you built, tested, or researched, including key outcomes..."
          />
        </div>

        {/* Project Links */}
        <div className="form-group">
          <label className="form-label">External Proof Links (GitHub, Figma, Docs)</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="url"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="https://github.com/..."
              className="form-input"
            />
            <button type="button" onClick={addLink} className="btn btn-sm">
              <Plus size={14} /> Add
            </button>
          </div>
          {links.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {links.map((link, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: '#E5F3FA',
                    fontSize: 12,
                    color: '#0B4D88',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <LinkIcon size={13} /> {link}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLink(idx)}
                    style={{ background: 'none', border: 'none', color: '#0B4D88', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* File Attachments */}
        <div className="form-group">
          <label className="form-label">Proof Artifacts & Attachments (Max 50MB each)</label>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '18px',
              border: '2px dashed #B7D5E2',
              borderRadius: 14,
              background: '#F4FAFC',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            <Upload size={24} color="#0B4D88" style={{ marginBottom: 6 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#102F48' }}>
              Click or drag files to upload proofs
            </span>
            <span style={{ fontSize: 11, color: '#7992A1', marginTop: 2 }}>
              Supports PDFs, Word docs (.doc, .docx), slides (.ppt, .pptx), media (.mp4, .mov, .mkv), and images (.png, .jpg)
            </span>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.mkv,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={loading}
            />
          </label>

          {files.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {files.map((f, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: '#FFFFFF',
                    border: '1px solid #D5E8EF',
                    fontSize: 12,
                    boxShadow: '0 2px 5px rgba(12, 64, 101, 0.04)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <FileCheck size={16} color="#0B4D88" />
                    <span style={{ fontWeight: 650, color: '#102F48' }}>{f.name}</span>
                    <span style={{ fontSize: 11, color: '#5E788C' }}>({StorageService.formatBytes(f.size)})</span>
                  </span>
                  {!loading && (
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      title="Remove file"
                      style={{ background: 'none', border: 'none', color: '#B34F5C', cursor: 'pointer', padding: 2 }}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload Progress Bar */}
        {loading && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#0B4D88', marginBottom: 4 }}>
              <span>Uploading deliverables & evidence...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div style={{ width: '100%', height: 6, borderRadius: 99, background: '#D5E8EF', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #0B4D88, #22B6C5)',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button type="button" onClick={onClose} disabled={loading} className="btn">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {loading ? (
              <>
                <Loader2 size={15} className="spin" /> Submitting...
              </>
            ) : (
              'Submit for Review ↗'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
