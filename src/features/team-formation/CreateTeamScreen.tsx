import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserPlus,
  X,
  Loader2,
  CheckCircle2,
  Users,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { TeamService } from '../../services/team.service';
import { ProfileModel } from '../../types';
import { AppCard } from '../../components/common/AppCard';

export const CreateTeamScreen: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { refreshTeam } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [teamName, setTeamName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectGist, setProjectGist] = useState('');
  const [theme, setTheme] = useState('');
  const [selectedInvitees, setSelectedInvitees] = useState<ProfileModel[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load any selected invitees stored in session storage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('trackment_selected_invitees');
      if (stored) {
        setSelectedInvitees(JSON.parse(stored));
      }
    } catch (_) {}
  }, []);

  const handleRemoveInvitee = (id: string) => {
    const updated = selectedInvitees.filter((s) => s.id !== id);
    setSelectedInvitees(updated);
    try {
      sessionStorage.setItem('trackment_selected_invitees', JSON.stringify(updated));
    } catch (_) {}
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !projectTitle.trim() || !projectGist.trim() || !theme.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!user) {
      setError('You must be signed in to create a team.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newTeam = await TeamService.createTeam({
        teamName: teamName.trim(),
        projectTitle: projectTitle.trim(),
        projectGist: projectGist.trim(),
        theme: theme.trim(),
        branch: profile?.branch || '',
        invitees: selectedInvitees,
      });

      // Clear session storage invitees
      sessionStorage.removeItem('trackment_selected_invitees');

      showToast(`Team "${newTeam.teamName}" created! You are now the Team Lead.`, 'success');
      await refreshProfile();
      await refreshTeam();
      navigate('/lead/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Error creating team:', err);
      setError(err?.message || 'Could not create team. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '24px 16px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '640px' }}>
        {/* Navigation Back */}
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
            Become a Team Leader
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            Establish a new academic project team, invite members, and take leadership.
          </p>
        </div>

        {/* Form Card */}
        <AppCard style={{ padding: '28px' }}>
          <form onSubmit={handleCreateTeam}>
            {/* Team Name */}
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  marginBottom: '6px',
                }}
              >
                Team Name <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => {
                  setTeamName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. Nexus Innovators"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--color-border)',
                  fontSize: '14px',
                  outline: 'none',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            {/* Project Title */}
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  marginBottom: '6px',
                }}
              >
                Project Title <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => {
                  setProjectTitle(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. Distributed Edge Diagnostics for Agricultural Robotics"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--color-border)',
                  fontSize: '14px',
                  outline: 'none',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            {/* Project Gist / Abstract */}
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  marginBottom: '6px',
                }}
              >
                Project Gist / Abstract <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <textarea
                rows={3}
                value={projectGist}
                onChange={(e) => {
                  setProjectGist(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Briefly describe the problem statement, architectural approach, and expected deliverables..."
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--color-border)',
                  fontSize: '14px',
                  outline: 'none',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Theme */}
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  marginBottom: '6px',
                }}
              >
                Theme / Specialization <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="text"
                value={theme}
                onChange={(e) => {
                  setTheme(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. AI / ML, IoT, Web Dev, Cybersecurity"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--color-border)',
                  fontSize: '14px',
                  outline: 'none',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>

            {/* Invite Members Selection */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  Team Members ({selectedInvitees.length})
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/team-formation/browse-students?isRecruitingMode=false')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: 'linear-gradient(115deg, #0b4d88 0%, #087da9 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 0 #07335c, 0 4px 10px rgba(11, 77, 136, 0.25)',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <UserPlus size={14} />
                  Add Members
                </button>
              </div>

              {selectedInvitees.length === 0 ? (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: 'var(--color-canvas)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    fontSize: '13px',
                    textAlign: 'center',
                  }}
                >
                  No members added yet. Click "Add Members" to browse available students.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedInvitees.map((s) => (
                    <span
                      key={s.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'white',
                        border: '1px solid var(--color-border)',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <span
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: 'rgba(11, 77, 136, 0.12)',
                          color: 'var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 800,
                        }}
                      >
                        {(s.fullName || '?')[0].toUpperCase()}
                      </span>
                      {s.fullName} {s.usn ? `(${s.usn})` : ''}
                      <button
                        type="button"
                        onClick={() => handleRemoveInvitee(s.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
                  marginBottom: '20px',
                }}
              >
                {error}
              </div>
            )}

            {/* Create Team Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                height: '50px',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 800,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 0 #07335c',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="spin" />
                  Creating Team...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Create Team
                </>
              )}
            </button>
          </form>
        </AppCard>
      </div>
    </div>
  );
};
