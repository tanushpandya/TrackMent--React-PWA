import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, History, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { TeamService } from '../../services/team.service';
import { ProgressHistoryEntry } from '../../types';
import { AppCard } from '../../components/common/AppCard';

export const UpdateProgressModal: React.FC = () => {
  const { user, isLead } = useAuth();
  const { team, refreshTeam } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const currentPct = team?.currentProgressPct ?? 0;
  const [newPct, setNewPct] = useState<number>(currentPct);
  const [milestoneNote, setMilestoneNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<ProgressHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (team) {
      setNewPct(team.currentProgressPct ?? 0);
      loadHistory(team.id);
    }
  }, [team]);

  const loadHistory = async (teamId: number) => {
    try {
      setLoadingHistory(true);
      const data = await TeamService.fetchProgressHistory(teamId);
      setHistory(data);
    } catch (e) {
      console.error('Failed to load progress history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getProgressColor = (pct: number) => {
    if (pct < 30) return 'var(--color-danger)';
    if (pct < 70) return 'var(--color-pending)';
    return 'var(--color-confirmed)';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneNote.trim()) {
      setError('Please add a milestone note describing what was achieved.');
      return;
    }
    if (!team) {
      setError('Could not find your team. Please try again.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await TeamService.updateProgress({
        teamId: team.id,
        progressPct: newPct,
        milestoneNote: milestoneNote.trim(),
      });
      await refreshTeam();
      showToast(`Progress successfully updated to ${newPct}%!`, 'success');
      navigate('/lead/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Could not save progress. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '24px 16px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '720px' }}>
        {/* Navigation Back */}
        <button
          onClick={() => navigate('/lead/dashboard')}
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
        <div style={{ marginBottom: '24px' }}>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
              margin: '0 0 6px 0',
            }}
          >
            Update Team Progress
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Record incremental milestone completion for <strong>{team?.teamName || 'your team'}</strong>.
          </p>
        </div>

        {/* Interactive Progress Slider Card */}
        <AppCard style={{ padding: '28px', marginBottom: '24px', textAlign: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              padding: '0 8px',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                Current
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
                {currentPct}%
              </div>
            </div>

            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--color-canvas)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-secondary)',
              }}
            >
              <ArrowRight size={20} />
            </div>

            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                New Progress
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-primary)' }}>
                {newPct}%
              </div>
            </div>
          </div>

          {/* Huge Number Display */}
          <div
            style={{
              fontSize: '64px',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              color: getProgressColor(newPct),
              marginBottom: '16px',
              transition: 'color 0.2s ease',
            }}
          >
            {newPct}%
          </div>

          {/* Range Slider */}
          <div style={{ padding: '0 8px' }}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={newPct}
              onChange={(e) => setNewPct(Number(e.target.value))}
              style={{
                width: '100%',
                height: '10px',
                borderRadius: '6px',
                accentColor: getProgressColor(newPct),
                cursor: 'pointer',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginTop: '8px',
              }}
            >
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </AppCard>

        {/* Form Submission Card */}
        <AppCard style={{ padding: '24px', marginBottom: '24px' }}>
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  marginBottom: '6px',
                }}
              >
                Milestone Note <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <p
                style={{
                  margin: '0 0 10px 0',
                  fontSize: '12.5px',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Describe what features, tests, or deliverables were finished to attain this percentage.
              </p>
              <textarea
                value={milestoneNote}
                onChange={(e) => {
                  setMilestoneNote(e.target.value);
                  if (error) setError(null);
                }}
                rows={3}
                placeholder="e.g. Completed initial frontend auth screens, wireframes, and Supabase integration"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--color-border)',
                  fontSize: '14px',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(179, 79, 92, 0.08)',
                  border: '1px solid var(--color-danger)',
                  color: 'var(--color-danger)',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              style={{
                width: '100%',
                height: '48px',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 0 #07335c',
                transition: 'all 0.1s ease',
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="spin" />
                  Saving Progress...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Save Progress
                </>
              )}
            </button>
          </form>
        </AppCard>

        {/* Progress History Card */}
        <AppCard style={{ padding: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            <History size={18} color="var(--color-primary)" />
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                margin: 0,
              }}
            >
              Milestone Progress History
            </h3>
          </div>

          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
              <Loader2 size={24} className="spin" style={{ margin: '0 auto 8px' }} />
              <div>Loading history...</div>
            </div>
          ) : history.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 16px',
                color: 'var(--color-text-secondary)',
                fontSize: '13.5px',
              }}
            >
              No milestone updates recorded yet. Save an update above to begin tracking history.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {history.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '12px 14px',
                    background: 'var(--color-canvas)',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                      marginTop: '6px',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {item.milestoneNote || 'Manual progress update'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      {item.recordedAt ? new Date(item.recordedAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : ''}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: 'var(--color-primary)',
                      background: 'rgba(11, 77, 136, 0.08)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                    }}
                  >
                    {item.progressPct}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </AppCard>
      </div>
    </div>
  );
};
