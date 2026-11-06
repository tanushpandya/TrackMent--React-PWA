import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  CheckCircle2,
  XCircle,
  Crown,
  Users,
  Loader2,
  RefreshCw,
  Inbox,
  AlertCircle,
  Building,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { TeamService } from '../../services/team.service';
import { TeamInvitationModel, LeadTransferRequestModel } from '../../types';
import { AppCard } from '../../components/common/AppCard';
import { Modal } from '../../components/common/Modal';
import { MascotCompanionBanner } from '../../components/mascot/MascotCompanionBanner';

export const TeamInvitationsModal: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { refreshTeam } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [invitations, setInvitations] = useState<TeamInvitationModel[]>([]);
  const [transfers, setTransfers] = useState<LeadTransferRequestModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Transfer accept confirmation modal
  const [acceptingTransfer, setAcceptingTransfer] = useState<LeadTransferRequestModel | null>(null);
  const [isActing, setIsActing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [invList, transList] = await Promise.all([
        TeamService.fetchStudentInvitations(user.id),
        TeamService.fetchIncomingLeadTransfers(user.id),
      ]);
      setInvitations(invList.filter((i) => i.status === 'PENDING'));
      setTransfers(transList.filter((t) => t.status === 'PENDING'));
    } catch (e) {
      console.error('Error loading notifications:', e);
      showToast('Could not load notifications', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRespondInvitation = async (invitationId: number, accept: boolean, teamName: string) => {
    setIsActing(true);
    try {
      await TeamService.respondToInvitation(invitationId, accept);
      showToast(accept ? `Joined ${teamName}!` : 'Invitation declined.', accept ? 'success' : 'info');
      await refreshProfile();
      await refreshTeam();
      if (accept) {
        navigate('/student/dashboard');
      } else {
        await loadData();
      }
    } catch (e: any) {
      showToast(e?.message || 'Could not process invitation response.', 'error');
    } finally {
      setIsActing(false);
    }
  };

  const handleRespondTransfer = async (requestId: number, accept: boolean) => {
    setIsActing(true);
    try {
      await TeamService.respondToLeadTransfer(requestId, accept);
      showToast(accept ? 'Leadership accepted! You are now the Team Lead.' : 'Lead transfer declined.', accept ? 'success' : 'info');
      setAcceptingTransfer(null);
      await refreshProfile();
      await refreshTeam();
      if (accept) {
        navigate('/lead/dashboard');
      } else {
        await loadData();
      }
    } catch (e: any) {
      showToast(e?.message || 'Could not process lead transfer.', 'error');
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 16px 40px' }}>
      {/* Back button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'white',
            border: '1px solid var(--color-border)',
            padding: '8px 16px',
            borderRadius: '9999px',
            color: 'var(--color-text-secondary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-subtle)',
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button
          onClick={loadData}
          title="Refresh notifications"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'white',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Mascot Banner */}
      <div style={{ marginBottom: '20px' }}>
        <MascotCompanionBanner
          defaultMood="surprised"
          defaultMessage="A team thinks you’d be a great fit."
        />
      </div>

      {/* Title */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 4px 0' }}>
          Notifications & Invitations
        </h1>
        <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
          Review pending cohort invitations and leadership transfer requests.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-secondary)' }}>
          <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px' }} />
          <div>Loading notifications...</div>
        </div>
      ) : invitations.length === 0 && transfers.length === 0 ? (
        <AppCard style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Inbox size={48} color="var(--color-text-secondary)" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
            No Notifications Right Now
          </h3>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
            Team invitations and leadership transfer requests will appear here.
          </p>
        </AppCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Section 1: Lead Transfer Requests */}
          {transfers.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Crown size={18} color="var(--color-pending)" />
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                  Leadership Transfer Requests ({transfers.length})
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {transfers.map((req) => (
                  <AppCard key={req.id} style={{ padding: '18px', borderLeft: '4px solid var(--color-pending)' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        {req.fromUserName || 'Team Lead'} wants you to become the Team Lead
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        Team: <strong>{req.teamName || `Team #${req.teamId}`}</strong>
                      </div>
                    </div>

                    <p style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                      If accepted, you will become the designated Team Lead with governance, review, and milestone submission permissions.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        disabled={isActing}
                        onClick={() => handleRespondTransfer(req.id, false)}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          background: 'transparent',
                          border: '1.5px solid var(--color-danger)',
                          color: 'var(--color-danger)',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Decline
                      </button>
                      <button
                        disabled={isActing}
                        onClick={() => setAcceptingTransfer(req)}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          background: 'var(--color-primary)',
                          color: 'white',
                          border: 'none',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 3px 0 #07335c',
                        }}
                      >
                        <Crown size={15} />
                        Accept Leadership
                      </button>
                    </div>
                  </AppCard>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Team Invitations */}
          {invitations.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Mail size={18} color="var(--color-primary)" />
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                  Team Invitations ({invitations.length})
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {invitations.map((inv) => (
                  <AppCard key={inv.id} style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                          {inv.teamName || `Team #${inv.teamId}`}
                        </div>
                        {inv.projectTitle && (
                          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                            {inv.projectTitle}
                          </div>
                        )}
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          Invited by <strong>{inv.leaderName || 'Team Lead'}</strong>
                        </div>
                      </div>

                      {inv.leaderBranch && (
                        <span
                          style={{
                            background: 'var(--color-canvas)',
                            border: '1px solid var(--color-border)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--color-primary)',
                          }}
                        >
                          {inv.leaderBranch}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px' }}>
                      <button
                        disabled={isActing}
                        onClick={() => handleRespondInvitation(inv.id, false, inv.teamName || 'Team')}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          background: 'transparent',
                          border: '1.5px solid var(--color-danger)',
                          color: 'var(--color-danger)',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Decline
                      </button>
                      <button
                        disabled={isActing}
                        onClick={() => handleRespondInvitation(inv.id, true, inv.teamName || 'Team')}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          background: 'var(--color-confirmed)',
                          color: 'white',
                          border: 'none',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 3px 0 #1b534b',
                        }}
                      >
                        {isActing ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />}
                        Accept Invitation
                      </button>
                    </div>
                  </AppCard>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Lead Transfer */}
      <Modal
        isOpen={acceptingTransfer !== null}
        onClose={() => setAcceptingTransfer(null)}
        title="Become Team Lead?"
      >
        {acceptingTransfer && (
          <div>
            <p style={{ margin: '0 0 16px 0', fontSize: '13.5px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              You will assume the role of Team Lead for <strong>"{acceptingTransfer.teamName}"</strong>.{' '}
              <strong>{acceptingTransfer.fromUserName}</strong> will step down to become a regular member.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setAcceptingTransfer(null)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActing}
                onClick={() => handleRespondTransfer(acceptingTransfer.id, true)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  cursor: isActing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 3px 0 #07335c',
                }}
              >
                {isActing ? 'Updating...' : 'Yes, I Accept'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
