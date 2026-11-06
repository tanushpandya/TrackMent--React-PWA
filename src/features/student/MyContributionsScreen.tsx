import React, { useEffect, useState, useCallback } from 'react';
import { Sparkles, Plus, ExternalLink, Download, Trash2, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { ContributionService } from '../../services/contribution.service';
import { StorageService } from '../../services/storage.service';
import { ContributionModel, ContributionStatus } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { AppCard } from '../../components/common/AppCard';
import { StatusPill } from '../../components/common/StatusPill';
import { MascotCompanionBanner } from '../../components/mascot/MascotCompanionBanner';
import { SubmitContributionModal } from './SubmitContributionModal';

interface MyContributionsScreenProps {
  submissionsOnly?: boolean;
}

export const MyContributionsScreen: React.FC<MyContributionsScreenProps> = ({
  submissionsOnly = false,
}) => {
  const { user } = useAuth();
  const { team } = useTeam();
  const { showToast } = useToast();

  const [contributions, setContributions] = useState<ContributionModel[]>([]);
  const [filter, setFilter] = useState<'ALL' | ContributionStatus>('ALL');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadContributions = useCallback(async () => {
    if (!team) return;
    try {
      setLoading(true);
      const data = submissionsOnly
        ? await ContributionService.fetchPendingForTeam(team.id)
        : await ContributionService.fetchForTeam(team.id);
      setContributions(data);
    } catch (e) {
      console.error('Error loading contributions:', e);
    } finally {
      setLoading(false);
    }
  }, [team, submissionsOnly]);

  useEffect(() => {
    loadContributions();
  }, [loadContributions]);

  const handleDelete = async (id: number) => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete this pending contribution?')) return;

    try {
      await ContributionService.deleteContribution(id, user.id);
      showToast('Contribution deleted.', 'info');
      loadContributions();
    } catch (e: any) {
      showToast(e?.message || 'Could not delete contribution.', 'error');
    }
  };

  const handleDownloadFile = async (storagePath: string) => {
    try {
      showToast('Generating download link...', 'info');
      const url = await StorageService.getSignedUrl(storagePath);
      window.open(url, '_blank');
    } catch (e: any) {
      showToast(e?.message || 'Failed to download file.', 'error');
    }
  };

  const pendingCount = contributions.filter((c) => c.status === 'PENDING').length;
  const confirmedCount = contributions.filter((c) => c.status === 'CONFIRMED').length;
  const rejectedCount = contributions.filter((c) => c.status === 'REJECTED').length;

  const filtered = contributions.filter((c) => {
    if (filter === 'ALL') return true;
    return c.status === filter;
  });

  return (
    <div style={{ animation: 'pageIn 0.35s ease both' }}>
      <PageHeader
        eyebrow="YOUR PROJECT WORK"
        title={submissionsOnly ? 'Submissions Queue' : 'Contributions'}
        subtitle="Share your progress, upload verifiable evidence, and track reviews from teammates and mentors."
        actions={
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={16} /> Submit Contribution
          </button>
        }
      />

      <MascotCompanionBanner
        defaultMood="happy"
        defaultMessage="Every contribution moves your team forward."
        subtitle="Your friendly project companion is cheering you on."
      />

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <MetricCard label="TOTAL WORK" value={contributions.length} note="Across sprint" variant={1} />
        <MetricCard label="ACCEPTED" value={confirmedCount} note="Great progress!" variant={2} />
        <MetricCard label="IN REVIEW" value={pendingCount} note="Awaiting team review" variant={3} />
        <MetricCard label="NEEDS UPDATES" value={rejectedCount} note="Iterate and resubmit" variant={4} />
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['ALL', 'PENDING', 'CONFIRMED', 'REJECTED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              border: filter === tab ? '1px solid #0B4D88' : '1px solid #D5E8EF',
              background: filter === tab ? '#0B4D88' : '#FFFFFF',
              color: filter === tab ? '#FFFFFF' : '#5E788C',
              transition: 'all 0.15s ease',
            }}
          >
            {tab === 'ALL'
              ? `All (${contributions.length})`
              : tab === 'PENDING'
              ? `In Review (${pendingCount})`
              : tab === 'CONFIRMED'
              ? `Accepted (${confirmedCount})`
              : `Needs Updates (${rejectedCount})`}
          </button>
        ))}
      </div>

      {/* Contributions List */}
      <AppCard title="Deliverables & Evidence">
        {loading ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: '#7992A1' }}>
            Loading deliverables...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '36px 0', textAlign: 'center', color: '#7992A1' }}>
            No deliverables found for this filter.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map((c) => {
              const isOwn = user?.id === c.authorId;

              return (
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
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 850, color: '#102F48', margin: 0 }}>
                          {c.title}
                        </h3>
                        {isOwn && <span className="badge badge-lead">YOU</span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#7992A1', marginTop: 3 }}>
                        By {c.authorName || 'Teammate'} · Submitted{' '}
                        {c.createdAt
                          ? new Date(c.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Recently'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <StatusPill status={c.status} />
                      {isOwn && c.status === 'PENDING' && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          title="Delete pending contribution"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#B34F5C',
                            cursor: 'pointer',
                            padding: 4,
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <p
                    style={{
                      fontSize: 13,
                      color: '#31566E',
                      lineHeight: 1.5,
                      margin: '10px 0',
                    }}
                  >
                    {c.description}
                  </p>

                  {/* Links */}
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
                          onClick={() => handleDownloadFile(f.storagePath)}
                          className="btn btn-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: '#F4FAFC',
                          }}
                        >
                          <FileText size={14} color="#0B4D88" />
                          <span>{f.fileName}</span>
                          <Download size={13} color="#5E788C" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AppCard>

      <SubmitContributionModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSuccess={loadContributions}
      />
    </div>
  );
};
