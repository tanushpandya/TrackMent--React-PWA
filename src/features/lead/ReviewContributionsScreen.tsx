import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, FileText, ExternalLink, Download, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { ContributionService } from '../../services/contribution.service';
import { StorageService } from '../../services/storage.service';
import { ContributionModel } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { AppCard } from '../../components/common/AppCard';
import { StatusPill } from '../../components/common/StatusPill';
import { Modal } from '../../components/common/Modal';

export const ReviewContributionsScreen: React.FC = () => {
  const { user } = useAuth();
  const { team } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [pendingList, setPendingList] = useState<ContributionModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Modal state
  const [selectedContrib, setSelectedContrib] = useState<ContributionModel | null>(null);
  const [verdict, setVerdict] = useState<'CONFIRMED' | 'REJECTED'>('CONFIRMED');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPending = useCallback(async () => {
    if (!team) return;
    try {
      setLoading(true);
      const data = await ContributionService.fetchPendingForTeam(team.id);
      // Lead can review other members' contributions (own contributions are democratically voted)
      setPendingList(data.filter((c) => c.authorId !== user?.id));
    } catch (e) {
      console.error('Error loading pending review contributions:', e);
    } finally {
      setLoading(false);
    }
  }, [team, user]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContrib || !user) return;
    if (verdict === 'REJECTED' && !reason.trim()) {
      showToast('Please provide a constructive reason when requesting updates.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await ContributionService.submitReview({
        contributionId: selectedContrib.id,
        reviewerId: user.id,
        verdict,
        rejectionReason: reason.trim() || undefined,
      });

      showToast(
        verdict === 'CONFIRMED'
          ? 'Deliverable accepted and verified! 🎉'
          : 'Update request submitted to teammate.',
        'success'
      );
      setSelectedContrib(null);
      setReason('');
      loadPending();
    } catch (err: any) {
      showToast(err?.message || 'Failed to submit review.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadProof = async (path: string) => {
    try {
      showToast('Generating secure download URL...', 'info');
      const url = await StorageService.getSignedUrl(path);
      window.open(url, '_blank');
    } catch (err: any) {
      showToast(err?.message || 'Could not download file', 'error');
    }
  };

  return (
    <div style={{ animation: 'pageIn 0.35s ease both' }}>
      <PageHeader
        eyebrow="PEER QUALITY ASSURANCE"
        title="Review Contributions"
        subtitle="Examine submitted proof artifacts, verify code and documentation, and recognize peer contributions."
        actions={
          <button onClick={() => navigate(-1)} className="btn btn-sm">
            <ArrowLeft size={14} /> Back
          </button>
        }
      />

      <AppCard title={`Awaiting Your Review (${pendingList.length})`}>
        {loading ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: '#7992A1' }}>
            Loading deliverables...
          </div>
        ) : pendingList.length === 0 ? (
          <div style={{ padding: '36px 0', textAlign: 'center', color: '#7992A1', fontSize: 13.5 }}>
            No pending submissions waiting for review! All peer work is up to date. ✨
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pendingList.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: '18px 20px',
                  borderRadius: 14,
                  border: '1px solid #D5E8EF',
                  background: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(12, 64, 101, 0.05)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 850, color: '#102F48', margin: 0 }}>
                      {c.title}
                    </h3>
                    <div style={{ fontSize: 12, color: '#7992A1', marginTop: 3 }}>
                      Submitted by <strong>{c.authorName || 'Teammate'}</strong> ·{' '}
                      {c.createdAt
                        ? new Date(c.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Recently'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedContrib(c);
                      setVerdict('CONFIRMED');
                      setReason('');
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    Open Review ↗
                  </button>
                </div>

                <p style={{ fontSize: 13, color: '#31566E', lineHeight: 1.5, margin: '10px 0' }}>
                  {c.description}
                </p>

                {/* External Links */}
                {c.links && c.links.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {c.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '4px 10px',
                          borderRadius: 8,
                          background: '#E5F3FA',
                          color: '#0B4D88',
                          fontSize: 11.5,
                          fontWeight: 750,
                          textDecoration: 'none',
                        }}
                      >
                        <ExternalLink size={12} /> {link}
                      </a>
                    ))}
                  </div>
                )}

                {/* Attached Files */}
                {c.files && c.files.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {c.files.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => handleDownloadProof(f.storagePath)}
                        className="btn btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F4FAFC' }}
                      >
                        <FileText size={14} color="#0B4D88" />
                        <span>{f.fileName}</span>
                        <Download size={13} color="#5E788C" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </AppCard>

      {/* Review Modal */}
      <Modal
        isOpen={Boolean(selectedContrib)}
        onClose={() => setSelectedContrib(null)}
        title="Review Deliverable"
        subtitle={`Reviewing "${selectedContrib?.title || 'Work'}" by ${selectedContrib?.authorName || 'Teammate'}`}
        maxWidth={560}
      >
        <form onSubmit={handleReviewSubmit}>
          <div className="form-group">
            <label className="form-label">Review Verdict</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setVerdict('CONFIRMED')}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 12,
                  border: verdict === 'CONFIRMED' ? '2px solid #328F81' : '1px solid #D5E8EF',
                  background: verdict === 'CONFIRMED' ? '#E4F6F0' : '#FFFFFF',
                  color: verdict === 'CONFIRMED' ? '#328F81' : '#5E788C',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <CheckCircle size={16} /> Accept & Verify
              </button>
              <button
                type="button"
                onClick={() => setVerdict('REJECTED')}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 12,
                  border: verdict === 'REJECTED' ? '2px solid #B34F5C' : '1px solid #D5E8EF',
                  background: verdict === 'REJECTED' ? '#FBECEB' : '#FFFFFF',
                  color: verdict === 'REJECTED' ? '#B34F5C' : '#5E788C',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <XCircle size={16} /> Request Updates
              </button>
            </div>
          </div>

          {verdict === 'REJECTED' && (
            <div className="form-group">
              <label className="form-label" htmlFor="feedback-reason">
                Feedback & Required Updates (Required)
              </label>
              <textarea
                id="feedback-reason"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="form-textarea"
                placeholder="Give constructive guidance on what needs to be added, fixed, or tested before acceptance..."
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
            <button type="button" onClick={() => setSelectedContrib(null)} className="btn">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Submitting...' : 'Submit Review ↗'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
