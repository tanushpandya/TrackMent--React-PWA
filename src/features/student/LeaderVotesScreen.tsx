import React, { useEffect, useState, useCallback } from 'react';
import { Vote, CheckCircle, XCircle, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { ContributionService } from '../../services/contribution.service';
import { ContributionModel, ContributionVote } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { AppCard } from '../../components/common/AppCard';
import { StatusPill } from '../../components/common/StatusPill';
import { Modal } from '../../components/common/Modal';
import { MascotCompanionBanner } from '../../components/mascot/MascotCompanionBanner';

export const LeaderVotesScreen: React.FC = () => {
  const { user } = useAuth();
  const { team } = useTeam();
  const { showToast } = useToast();

  const [leadContributions, setLeadContributions] = useState<ContributionModel[]>([]);
  const [votes, setVotes] = useState<ContributionVote[]>([]);
  const [loading, setLoading] = useState(true);

  // Voting Modal state
  const [activeContrib, setActiveContrib] = useState<ContributionModel | null>(null);
  const [voteVerdict, setVoteVerdict] = useState<'CONFIRMED' | 'REJECTED'>('CONFIRMED');
  const [rejectionReason, setRejectionReason] = useState('');
  const [votingLoading, setVotingLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!team) return;
    try {
      setLoading(true);
      const allContribs = await ContributionService.fetchForTeam(team.id);
      // Filter contributions authored by the team lead
      const leaderContribs = allContribs.filter((c) => c.authorId === team.leaderId);
      setLeadContributions(leaderContribs);

      if (leaderContribs.length > 0) {
        const votesData = await ContributionService.fetchVotes(leaderContribs.map((c) => c.id));
        setVotes(votesData);
      }
    } catch (e) {
      console.error('Error loading leader votes data:', e);
    } finally {
      setLoading(false);
    }
  }, [team]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCastVote = async () => {
    if (!activeContrib) return;
    if (voteVerdict === 'REJECTED' && !rejectionReason.trim()) {
      showToast('A reason is required when rejecting a contribution deliverable.', 'error');
      return;
    }

    setVotingLoading(true);
    try {
      const newStatus = await ContributionService.castVote({
        contributionId: activeContrib.id,
        verdict: voteVerdict,
        reason: rejectionReason.trim() || undefined,
      });

      showToast(`Vote recorded! Deliverable status: ${newStatus}`, 'success');
      setActiveContrib(null);
      setRejectionReason('');
      loadData();
    } catch (e: any) {
      showToast(e?.message || 'Failed to record vote.', 'error');
    } finally {
      setVotingLoading(false);
    }
  };

  const isLeader = team && user && team.leaderId === user.id;

  return (
    <div style={{ animation: 'pageIn 0.35s ease both' }}>
      <PageHeader
        eyebrow="DEMOCRATIC REVIEW"
        title="Leader Votes"
        subtitle="Democratic peer verification of work submitted by the Team Lead. At least two members must vote to confirm."
      />

      <MascotCompanionBanner
        defaultMood="thinking"
        defaultMessage="Your voice helps shape the team's academic output."
        subtitle="Democratic governance ensures fairness and mutual accountability."
      />

      <AppCard title="Team Lead Contributions Awaiting Member Review">
        {loading ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: '#7992A1' }}>
            Loading deliverables...
          </div>
        ) : leadContributions.length === 0 ? (
          <div style={{ padding: '36px 0', textAlign: 'center', color: '#7992A1', fontSize: 13 }}>
            No contributions submitted by the Team Lead yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {leadContributions.map((c) => {
              const contribVotes = votes.filter((v) => v.contributionId === c.id);
              const confirms = contribVotes.filter((v) => v.verdict === 'CONFIRMED').length;
              const rejects = contribVotes.filter((v) => v.verdict === 'REJECTED').length;
              const myVote = user ? contribVotes.find((v) => v.voterId === user.id) : null;

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
                        <span className="badge badge-lead">TEAM LEAD WORK</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: '#7992A1', marginTop: 3 }}>
                        By {c.authorName || 'Team Lead'} · Submitted{' '}
                        {c.createdAt
                          ? new Date(c.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Recently'}
                      </div>
                    </div>
                    <StatusPill status={c.status} />
                  </div>

                  <p style={{ fontSize: 13, color: '#31566E', lineHeight: 1.5, margin: '10px 0' }}>
                    {c.description}
                  </p>

                  {/* Vote Tally */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: '#F4FAFC',
                      marginTop: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#328F81', fontWeight: 800 }}>
                        <ThumbsUp size={14} /> {confirms} Confirmed (Need 2)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#B34F5C', fontWeight: 800 }}>
                        <ThumbsDown size={14} /> {rejects} Rejected
                      </span>
                      {myVote && (
                        <span style={{ color: '#5E788C', fontWeight: 700 }}>
                          Your vote: <strong>{myVote.verdict}</strong>
                        </span>
                      )}
                    </div>

                    {!isLeader && c.status === 'PENDING' && (
                      <button
                        onClick={() => {
                          setActiveContrib(c);
                          setVoteVerdict('CONFIRMED');
                          setRejectionReason('');
                        }}
                        className="btn btn-primary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Vote size={14} /> {myVote ? 'Change Vote' : 'Cast Vote ↗'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AppCard>

      {/* Cast Vote Modal */}
      <Modal
        isOpen={Boolean(activeContrib)}
        onClose={() => setActiveContrib(null)}
        title="Cast Democratic Vote"
        subtitle={`Review and vote on "${activeContrib?.title || 'Deliverable'}"`}
      >
        <div style={{ marginBottom: 16 }}>
          <div className="form-label">Your Verdict</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => setVoteVerdict('CONFIRMED')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 12,
                border: voteVerdict === 'CONFIRMED' ? '2px solid #328F81' : '1px solid #D5E8EF',
                background: voteVerdict === 'CONFIRMED' ? '#E4F6F0' : '#FFFFFF',
                color: voteVerdict === 'CONFIRMED' ? '#328F81' : '#5E788C',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <ThumbsUp size={16} /> Confirm & Accept
            </button>
            <button
              type="button"
              onClick={() => setVoteVerdict('REJECTED')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 12,
                border: voteVerdict === 'REJECTED' ? '2px solid #B34F5C' : '1px solid #D5E8EF',
                background: voteVerdict === 'REJECTED' ? '#FBECEB' : '#FFFFFF',
                color: voteVerdict === 'REJECTED' ? '#B34F5C' : '#5E788C',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <ThumbsDown size={16} /> Reject with Reason
            </button>
          </div>
        </div>

        {voteVerdict === 'REJECTED' && (
          <div className="form-group">
            <label className="form-label" htmlFor="reject-reason">
              Rejection Reason (Required)
            </label>
            <textarea
              id="reject-reason"
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="form-textarea"
              placeholder="Explain clearly what changes or additions are required before acceptance..."
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button type="button" onClick={() => setActiveContrib(null)} className="btn">
            Cancel
          </button>
          <button
            type="button"
            disabled={votingLoading}
            onClick={handleCastVote}
            className="btn btn-primary"
          >
            {votingLoading ? 'Submitting...' : 'Submit Vote ↗'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
