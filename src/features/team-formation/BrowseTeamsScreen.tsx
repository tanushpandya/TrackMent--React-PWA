import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  X,
  Users,
  Send,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Building,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { TeamService } from '../../services/team.service';
import { TeamModel, JoinRequestModel } from '../../types';
import { AppCard } from '../../components/common/AppCard';
import { Modal } from '../../components/common/Modal';

const THEME_FILTERS = ['All', 'AI / ML', 'Web Dev', 'IoT', 'Cybersecurity', 'Cloud & DevOps'];

export const BrowseTeamsScreen: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [teams, setTeams] = useState<TeamModel[]>([]);
  const [mySentRequests, setMySentRequests] = useState<JoinRequestModel[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('All');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');

  // Request to Join modal
  const [targetTeam, setTargetTeam] = useState<TeamModel | null>(null);
  const [joinPitch, setJoinPitch] = useState('');
  const [isSending, setIsSending] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allTeams, sent] = await Promise.all([
        TeamService.fetchAllTeams(),
        user ? TeamService.fetchStudentJoinRequests(user.id) : Promise.resolve([]),
      ]);
      setTeams(allTeams);
      setMySentRequests(sent.filter((r) => r.status === 'PENDING'));
    } catch (e) {
      console.error('Error loading recruiting teams:', e);
      showToast('Could not load teams', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTeam || !user) return;

    setIsSending(true);
    try {
      await TeamService.sendJoinRequest(targetTeam.id, user.id, joinPitch.trim());
      showToast(`Join request sent to ${targetTeam.teamName}!`, 'success');
      setTargetTeam(null);
      setJoinPitch('');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Could not send join request.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const filteredTeams = teams.filter((t) => {
    if (selectedTheme !== 'All' && !t.theme.toLowerCase().includes(selectedTheme.toLowerCase())) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      t.teamName.toLowerCase().includes(q) ||
      t.projectTitle.toLowerCase().includes(q) ||
      t.theme.toLowerCase().includes(q)
    );
  });

  const sortedTeams = [...filteredTeams].sort((a, b) => {
    if (sortBy === 'name') return a.teamName.localeCompare(b.teamName);
    return b.id - a.id;
  });

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px 40px' }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/team-formation/before-team')}
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
          marginBottom: '20px',
          boxShadow: 'var(--shadow-subtle)',
        }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 4px 0' }}>
            Recruiting Teams
          </h1>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
            Discover open student cohorts looking for members and send a join request.
          </p>
        </div>

        <button
          onClick={loadData}
          title="Refresh teams"
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

      {/* Search & Filter Header */}
      <AppCard style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', marginBottom: '14px' }}>
          <Search
            size={16}
            color="var(--color-text-secondary)"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by team name, theme, or project..."
            style={{
              width: '100%',
              padding: '10px 36px',
              borderRadius: '8px',
              border: '1.5px solid var(--color-border)',
              fontSize: '13.5px',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Theme Filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {THEME_FILTERS.map((th) => {
            const isSelected = selectedTheme === th;
            return (
              <button
                key={th}
                onClick={() => setSelectedTheme(th)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                  background: isSelected ? 'rgba(11, 77, 136, 0.12)' : 'white',
                  color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {th}
              </button>
            );
          })}
        </div>
      </AppCard>

      {/* Teams Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-secondary)' }}>
          <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px' }} />
          <div>Loading recruiting teams...</div>
        </div>
      ) : sortedTeams.length === 0 ? (
        <AppCard style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Users size={48} color="var(--color-text-secondary)" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
            No Teams Found
          </h3>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
            Try adjusting your search query or theme filter.
          </p>
        </AppCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {sortedTeams.map((team) => {
            const hasRequested = mySentRequests.some((r) => r.teamId === team.id);

            return (
              <AppCard key={team.id} style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        {team.teamName}
                      </span>
                      <span
                        style={{
                          background: 'var(--color-canvas)',
                          border: '1px solid var(--color-border)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--color-primary)',
                        }}
                      >
                        CODE: {team.teamCode}
                      </span>
                    </div>

                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                      {team.projectTitle}
                    </div>

                    {team.projectGist && (
                      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                        {team.projectGist}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {team.theme && (
                        <span
                          style={{
                            background: 'rgba(11, 77, 136, 0.08)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            color: 'var(--color-primary)',
                          }}
                        >
                          {team.theme}
                        </span>
                      )}
                      {team.branch && (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          Branch: {team.branch}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    {hasRequested ? (
                      <span
                        style={{
                          background: 'rgba(166, 120, 39, 0.12)',
                          color: 'var(--color-pending)',
                          padding: '7px 14px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Clock size={14} />
                        Request Sent
                      </span>
                    ) : (
                      <button
                        onClick={() => setTargetTeam(team)}
                        style={{
                          padding: '8px 18px',
                          background: 'var(--color-primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 3px 0 #07335c',
                        }}
                      >
                        <Send size={14} />
                        Request to Join
                      </button>
                    )}
                  </div>
                </div>
              </AppCard>
            );
          })}
        </div>
      )}

      {/* Join Request Pitch Modal */}
      <Modal
        isOpen={targetTeam !== null}
        onClose={() => setTargetTeam(null)}
        title={`Request to Join ${targetTeam?.teamName || ''}`}
      >
        {targetTeam && (
          <form onSubmit={handleSendJoinRequest}>
            <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              Send a request to the Team Lead of <strong>{targetTeam.teamName}</strong>. You may attach a short pitch explaining your skills and how you can contribute.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                Pitch / Message to Leader (Optional)
              </label>
              <textarea
                rows={4}
                value={joinPitch}
                onChange={(e) => setJoinPitch(e.target.value)}
                placeholder="e.g. Hi! I have experience with React and PyTorch and would love to help implement the frontend and model inference pipeline..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--color-border)',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setTargetTeam(null)}
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
                type="submit"
                disabled={isSending}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 3px 0 #07335c',
                }}
              >
                {isSending ? <Loader2 size={16} className="spin" /> : 'Send Request'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
