import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Mail,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Building,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { TeamService } from '../../services/team.service';
import { TeamInvitationModel } from '../../types';
import { AppCard } from '../../components/common/AppCard';
import { MascotCompanionBanner } from '../../components/mascot/MascotCompanionBanner';

export const BeforeTeamScreen: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { team, refreshTeam } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [invitations, setInvitations] = useState<TeamInvitationModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<number | null>(null);

  // If user already has a team, route to dashboard immediately
  useEffect(() => {
    if (team) {
      if (user?.role === 'TEAM_LEAD') {
        navigate('/lead/dashboard', { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    }
  }, [team, user, navigate]);

  const loadInvitations = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await TeamService.fetchStudentInvitations(user.id);
      setInvitations(data.filter((i) => i.status === 'PENDING'));
    } catch (e) {
      console.error('Error loading invitations:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const handleRespond = async (invitationId: number, accept: boolean, teamName: string) => {
    setRespondingId(invitationId);
    try {
      await TeamService.respondToInvitation(invitationId, accept);
      showToast(accept ? `Joined ${teamName}!` : 'Invitation declined.', accept ? 'success' : 'info');
      await refreshProfile();
      await refreshTeam();
      if (accept) {
        navigate('/student/dashboard');
      } else {
        await loadInvitations();
      }
    } catch (e: any) {
      showToast(e?.message || 'Could not respond to invitation.', 'error');
    } finally {
      setRespondingId(null);
    }
  };

  const firstName = profile?.fullName ? profile.fullName.split(' ')[0] : 'Student';

  return (
    <div style={{ minHeight: '100vh', padding: '36px 16px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Mascot Banner */}
        <div style={{ marginBottom: '20px' }}>
          <MascotCompanionBanner
            defaultMood="thinking"
            defaultMessage="There’s a team out there for your idea."
          />
        </div>

        {/* Central Action Card */}
        <AppCard style={{ padding: '32px 24px', textAlign: 'center' }}>
          {/* Groups Icon */}
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(11, 77, 136, 0.08)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <Users size={36} />
          </div>

          <h2
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
              margin: '0 0 8px 0',
            }}
          >
            Welcome, {firstName}!
          </h2>
          <p
            style={{
              margin: '0 0 24px 0',
              fontSize: '13.5px',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
            }}
          >
            Create your own team as leader or browse recruiting cohorts to send a join request.
          </p>

          {/* Pending Invitations Banner (if any) */}
          {invitations.length > 0 && (
            <div
              style={{
                background: 'rgba(11, 77, 136, 0.06)',
                border: '1.5px solid rgba(11, 77, 136, 0.2)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'left',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  marginBottom: '12px',
                }}
              >
                <Mail size={16} />
                You have {invitations.length} pending team invitation{invitations.length > 1 ? 's' : ''}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    style={{
                      background: 'white',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        {inv.teamName || `Team #${inv.teamId}`}
                      </div>
                      {inv.leaderBranch && (
                        <span
                          style={{
                            background: 'var(--color-canvas)',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--color-primary)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {inv.leaderBranch}
                        </span>
                      )}
                    </div>

                    {inv.projectTitle && (
                      <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        {inv.projectTitle}
                      </div>
                    )}
                    {inv.leaderName && (
                      <div style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        Invited by {inv.leaderName}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                      <button
                        disabled={respondingId === inv.id}
                        onClick={() => handleRespond(inv.id, false, inv.teamName || 'Team')}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          background: 'transparent',
                          border: '1px solid var(--color-danger)',
                          color: 'var(--color-danger)',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Decline
                      </button>
                      <button
                        disabled={respondingId === inv.id}
                        onClick={() => handleRespond(inv.id, true, inv.teamName || 'Team')}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          background: 'var(--color-primary)',
                          color: 'white',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        {respondingId === inv.id ? <Loader2 size={12} className="spin" /> : 'Accept'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Team Lead Path: Create a Team */}
            <button
              onClick={() => navigate('/team-formation/create-team')}
              style={{
                width: '100%',
                height: '46px',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 0 #07335c',
              }}
            >
              <Plus size={18} />
              Create a Team
            </button>

            {/* Student Path: Browse Recruiting Teams */}
            <button
              onClick={() => navigate('/team-formation/browse-teams')}
              style={{
                width: '100%',
                height: '46px',
                background: 'white',
                color: 'var(--color-text-primary)',
                border: '1.5px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Search size={18} color="var(--color-text-secondary)" />
              Browse Recruiting Teams
            </button>

            {/* Student Path: View Invitations */}
            <button
              onClick={() => navigate('/team-formation/invitations')}
              style={{
                width: '100%',
                height: '46px',
                background: 'white',
                color: invitations.length > 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                border: invitations.length > 0 ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Mail size={18} color={invitations.length > 0 ? 'var(--color-primary)' : 'var(--color-text-secondary)'} />
              View Invitations {invitations.length > 0 ? `(${invitations.length})` : ''}
            </button>
          </div>
        </AppCard>
      </div>
    </div>
  );
};
