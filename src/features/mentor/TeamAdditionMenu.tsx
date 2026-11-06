import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  X,
  UserPlus,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  HelpCircle,
  Building,
  User,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { TeamService } from '../../services/team.service';
import { TeamDirectoryEntry, TeamModel } from '../../types';
import { AppCard } from '../../components/common/AppCard';
import { Modal } from '../../components/common/Modal';

type FilterType = 'available' | 'all' | 'mine';

export const TeamAdditionMenu: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [entries, setEntries] = useState<TeamDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('available');

  // Claim by code state
  const [teamCodeInput, setTeamCodeInput] = useState('');
  const [claimingByCode, setClaimingByCode] = useState(false);

  // Claim Confirmation Modal
  const [confirmEntry, setConfirmEntry] = useState<TeamDirectoryEntry | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  const loadDirectory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await TeamService.fetchTeamDirectory();
      setEntries(data);
    } catch (e) {
      console.error('Error loading team directory:', e);
      showToast('Could not load teams', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  const handleClaimByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamCodeInput.trim() || !user) return;
    setClaimingByCode(true);
    try {
      const res = await TeamService.claimTeam({
        teamId: 0,
        mentorId: user.id,
        teamCode: teamCodeInput.trim().toUpperCase(),
      });
      if (res) {
        showToast(`Successfully claimed "${res.teamName}"!`, 'success');
        setTeamCodeInput('');
        await loadDirectory();
        navigate('/mentor/dashboard');
      } else {
        showToast('Invalid team code or team already claimed.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Could not claim team by code.', 'error');
    } finally {
      setClaimingByCode(false);
    }
  };

  const handleConfirmClaim = async () => {
    if (!confirmEntry || !user) return;
    setIsClaiming(true);
    try {
      const res = await TeamService.claimTeam({
        teamId: confirmEntry.team.id,
        mentorId: user.id,
      });
      if (res) {
        showToast(`You are now mentoring ${confirmEntry.team.teamName}!`, 'success');
        setConfirmEntry(null);
        await loadDirectory();
        navigate('/mentor/dashboard');
      } else {
        showToast('Could not claim team. It may already have a mentor.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Could not claim team.', 'error');
    } finally {
      setIsClaiming(false);
    }
  };

  const myId = user?.id;

  const filteredEntries = entries.filter((entry) => {
    const t = entry.team;
    if (filter === 'available' && t.mentorId != null) return false;
    if (filter === 'mine' && t.mentorId !== myId) return false;

    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    const nameMatch = t.teamName.toLowerCase().includes(q);
    const codeMatch = t.teamCode.toLowerCase().includes(q);
    const titleMatch = t.projectTitle.toLowerCase().includes(q);
    const leaderMatch = (entry.leaderName || '').toLowerCase().includes(q) || (entry.leaderUsn || '').toLowerCase().includes(q);
    return nameMatch || codeMatch || titleMatch || leaderMatch;
  });

  return (
    <div style={{ minHeight: '100vh', padding: '24px 16px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '960px' }}>
        {/* Navigation Back */}
        <button
          onClick={() => navigate('/mentor/dashboard')}
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
          Back to Dashboard
        </button>

        {/* Page Title */}
        <div style={{ marginBottom: '20px' }}>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
              margin: '0 0 6px 0',
            }}
          >
            Browse & Add Teams
          </h1>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
            Search student teams by code, leader USN, or project theme to claim them for mentorship.
          </p>
        </div>

        {/* Quick Claim by Code Box */}
        <AppCard style={{ padding: '20px', marginBottom: '24px' }}>
          <form onSubmit={handleClaimByCode} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
              <KeyRound
                size={16}
                color="var(--color-text-secondary)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                value={teamCodeInput}
                onChange={(e) => setTeamCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter 5-character Team Code (e.g. 7K9M2)..."
                maxLength={8}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 36px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--color-border)',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={claimingByCode || !teamCodeInput.trim()}
              style={{
                height: '42px',
                padding: '0 20px',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: claimingByCode || !teamCodeInput.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 3px 0 #07335c',
              }}
            >
              {claimingByCode ? <Loader2 size={16} className="spin" /> : <UserPlus size={16} />}
              Claim by Code
            </button>
          </form>
        </AppCard>

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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search code, leader USN, team name, or project title..."
              style={{
                width: '100%',
                padding: '10px 36px 10px 36px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-border)',
                fontSize: '13.5px',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
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

          {/* Filter Chips */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            <button
              onClick={() => setFilter('available')}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                border: '1px solid',
                borderColor: filter === 'available' ? 'var(--color-primary)' : 'var(--color-border)',
                background: filter === 'available' ? 'rgba(11, 77, 136, 0.12)' : 'white',
                color: filter === 'available' ? 'var(--color-primary)' : 'var(--color-text-primary)',
                fontSize: '12.5px',
                fontWeight: filter === 'available' ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              Available (No Mentor)
            </button>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                border: '1px solid',
                borderColor: filter === 'all' ? 'var(--color-primary)' : 'var(--color-border)',
                background: filter === 'all' ? 'rgba(11, 77, 136, 0.12)' : 'white',
                color: filter === 'all' ? 'var(--color-primary)' : 'var(--color-text-primary)',
                fontSize: '12.5px',
                fontWeight: filter === 'all' ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              All Teams
            </button>
            <button
              onClick={() => setFilter('mine')}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                border: '1px solid',
                borderColor: filter === 'mine' ? 'var(--color-primary)' : 'var(--color-border)',
                background: filter === 'mine' ? 'rgba(11, 77, 136, 0.12)' : 'white',
                color: filter === 'mine' ? 'var(--color-primary)' : 'var(--color-text-primary)',
                fontSize: '12.5px',
                fontWeight: filter === 'mine' ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              My Teams
            </button>
          </div>
        </AppCard>

        {/* Directory List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-secondary)' }}>
            <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px' }} />
            <div>Loading team directory...</div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <AppCard style={{ textAlign: 'center', padding: '60px 24px' }}>
            <HelpCircle size={44} color="var(--color-text-secondary)" style={{ margin: '0 auto 14px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
              No teams match your search or filter
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Try searching with another keyword or resetting the category filter.
            </p>
            {(query || filter !== 'available') && (
              <button
                onClick={() => {
                  setQuery('');
                  setFilter('available');
                }}
                style={{
                  background: 'transparent',
                  border: '1.5px solid var(--color-border)',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                }}
              >
                Reset Filters
              </button>
            )}
          </AppCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredEntries.map((entry) => {
              const team = entry.team;
              const isMine = myId != null && team.mentorId === myId;
              const isOtherClaimed = team.mentorId != null && !isMine;

              return (
                <AppCard
                  key={team.id}
                  style={{
                    padding: '20px',
                    border: isMine ? '1.5px solid rgba(11, 77, 136, 0.4)' : undefined,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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

                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '4px' }}>
                        {team.projectTitle}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          fontSize: '12.5px',
                          color: 'var(--color-text-secondary)',
                          marginTop: '6px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {entry.leaderName && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <User size={13} />
                            Lead: {entry.leaderName} {entry.leaderUsn ? `(${entry.leaderUsn})` : ''}
                          </span>
                        )}
                        {team.branch && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Building size={13} />
                            {team.branch}
                          </span>
                        )}
                        {team.theme && (
                          <span
                            style={{
                              background: 'rgba(11, 77, 136, 0.06)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--color-primary)',
                            }}
                          >
                            {team.theme}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {isMine ? (
                        <span
                          style={{
                            background: 'rgba(50, 143, 129, 0.12)',
                            color: 'var(--color-confirmed)',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <CheckCircle2 size={14} />
                          My Team
                        </span>
                      ) : isOtherClaimed ? (
                        <span
                          style={{
                            background: 'var(--color-canvas)',
                            color: 'var(--color-text-secondary)',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          Mentored by another
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmEntry(entry)}
                          style={{
                            padding: '8px 16px',
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
                          <UserPlus size={14} />
                          Claim Team
                        </button>
                      )}
                    </div>
                  </div>
                </AppCard>
              );
            })}
          </div>
        )}

        {/* Claim Confirmation Modal */}
        <Modal
          isOpen={confirmEntry !== null}
          onClose={() => setConfirmEntry(null)}
          title={`Mentor ${confirmEntry?.team.teamName || ''}?`}
        >
          {confirmEntry && (
            <div>
              <p style={{ margin: '0 0 14px 0', fontSize: '13.5px', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                Add this team directly for mentorship?
              </p>

              <div
                style={{
                  padding: '14px',
                  background: 'var(--color-canvas)',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border)',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  {confirmEntry.team.projectTitle}
                </div>
                {confirmEntry.leaderName && (
                  <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    Leader: {confirmEntry.leaderName} {confirmEntry.leaderUsn ? `(${confirmEntry.leaderUsn})` : ''}
                  </div>
                )}
                {confirmEntry.team.theme && (
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                    Track: {confirmEntry.team.theme} {confirmEntry.team.branch ? `• ${confirmEntry.team.branch}` : ''}
                  </div>
                )}
              </div>

              <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                No code verification required. You will immediately be registered as this team's faculty mentor.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setConfirmEntry(null)}
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
                  disabled={isClaiming}
                  onClick={handleConfirmClaim}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    fontWeight: 700,
                    cursor: isClaiming ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 3px 0 #07335c',
                  }}
                >
                  {isClaiming ? <Loader2 size={16} className="spin" /> : 'Confirm & Add'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};
