import React, { useState } from 'react';
import { Upload, Plus, X, Link as LinkIcon, FileText } from 'lucide-react';
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addLink = () => {
    const clean = linkInput.trim();
    if (clean) {
      setLinks([...links, clean]);
      setLinkInput('');
    }
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      for (const f of selected) {
        const val = StorageService.validateFile(f);
        if (!val.isValid) {
          setErrorMsg(val.errorMessage || 'File exceeds 50MB limit.');
          return;
        }
      }
      setFiles((prev) => [...prev, ...selected]);
      setErrorMsg(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !team) return;
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Please enter both title and description.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Submit contribution row
      const contrib = await ContributionService.submit({
        teamId: team.id,
        authorId: user.id,
        title,
        description,
        links,
      });

      // 2. Upload any attached proof files
      for (const file of files) {
        await StorageService.uploadProof({
          teamId: team.id,
          contributionId: contrib.id,
          file,
        });
      }

      showToast('Contribution submitted for review! ✨', 'success');
      onSuccess();
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setLinks([]);
      setFiles([]);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit contribution.');
    } finally {
      setLoading(false);
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
            <span style={{ fontSize: 13, fontWeight: 750, color: '#102F48' }}>
              Click or drag files to upload proofs
            </span>
            <span style={{ fontSize: 11, color: '#7992A1', marginTop: 2 }}>
              Supports PDFs, Word docs, code archives, demo videos, and images
            </span>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
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
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={15} color="#0B4D88" /> {f.name} ({(f.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    style={{ background: 'none', border: 'none', color: '#B34F5C', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button type="button" onClick={onClose} className="btn">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Submitting...' : 'Submit for Review ↗'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
