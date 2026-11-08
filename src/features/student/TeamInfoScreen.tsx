import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  Users,
  Award,
  Edit3,
  UserMinus,
  ArrowRightLeft,
  LogOut,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { TeamService } from '../../services/team.service';
import { TeamDeparture, TeamEvaluation } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { AppCard } from '../../components/common/AppCard';
import { StatusPill } from '../../components/common/StatusPill';
import { Modal } from '../../components/common/Modal';
import { MascotCompanionBanner } from '../../components/mascot/MascotCompanionBanner';
import { StudentAcademicMarksCard } from '../../components/common/StudentAcademicMarksCard';

export const TeamInfoScreen: React.FC = () => {
  const { user, profile, isLead, isMentor } = useAuth();
  const { team, members, mentor, refreshTeam } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [copiedCode, setCopiedCode] = useState(false);
  const [departures, setDepartures] = useState<TeamDeparture[]>([]);
  const [evaluations, setEvaluations] = useState<TeamEvaluation[]>([]);
  const [isMarksVisible, setIsMarksVisible] = useState<boolean>(true);

  // Modals state
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedMemberForTransfer, setSelectedMemberForTransfer] = useState<string>('');

  // Edit Project form state
  const [editTitle, setEditTitle] = useState(team?.projectTitle || '');
  const [editGist, setEditGist] = useState(team?.projectGist || '');
  const [editTheme, setEditTheme] = useState(team?.theme || '');
  const [editBranch, setEditBranch] = useState(team?.branch || '');
  const [editAbstract, setEditAbstract] = useState(team?.abstractText || '');
  const [editObjectives, setEditObjectives] = useState(team?.objectives || '');
  const [editLoading, setEditLoading] = useState(false);

  const loadExtras = useCallback(async () => {
    if (!team) return;
    try {
      const [deps, evals, vis] = await Promise.all([
        TeamService.fetchDepartures(team.id),
        TeamService.fetchTeamEvaluations(team.id),
        TeamService.fetchMarksVisibility(team.id),
      ]);
      setDepartures(deps);
      setEvaluations(evals);
      setIsMarksVisible(vis);
    } catch (e) {
      console.error('Error loading team extras:', e);
    }
  }, [team]);

  useEffect(() => {
    loadExtras();
  }, [loadExtras]);

  useEffect(() => {
    if (team) {
      setEditTitle(team.projectTitle);
      setEditGist(team.projectGist);
      setEditTheme(team.theme);
      setEditBranch(team.branch);
      setEditAbstract(team.abstractText || '');
      setEditObjectives(team.objectives || '');
    }
  }, [team]);

  const copyCode = () => {
    if (!team?.teamCode) return;
    navigator.clipboard.writeText(team.teamCode);
    setCopiedCode(true);
    showToast(`Team code ${team.teamCode} copied!`, 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;

    setEditLoading(true);
    try {
      await TeamService.updateProjectInfo({
        teamId: team.id,
        projectTitle: editTitle,
        projectGist: editGist,
        theme: editTheme,
        branch: editBranch,
        abstractText: editAbstract,
        objectives: editObjectives,
      });
      await refreshTeam();
      showToast('Project details updated successfully! ✨', 'success');
      setIsEditProjectOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update project info', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleLeaveTeam = async () => {
    try {
      const removed = await TeamService.leaveTeam();
      showToast(
        `You have left the team. ${removed} contribution(s) removed from project history.`,
        'info'
      );
      await refreshTeam();
      navigate('/team-formation/before-team');
    } catch (err: any) {
      showToast(err?.message || 'Failed to leave team.', 'error');
      setIsLeaveModalOpen(false);
    }
  };

  const handleTransferLeadership = async () => {
    if (!team || !user || !selectedMemberForTransfer) return;
    try {
      await TeamService.requestLeadTransfer(team.id, user.id, selectedMemberForTransfer);
      showToast('Leadership transfer invitation sent to member! 👑', 'success');
      setIsTransferModalOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to request leadership transfer.', 'error');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!team) return;
    if (!window.confirm(`Are you sure you want to remove ${memberName} from the team?`)) return;

    try {
      await TeamService.removeTeamMember(team.id, memberId);
      showToast(`${memberName} has been removed from the team.`, 'info');
      await refreshTeam();
      loadExtras();
    } catch (err: any) {
      showToast(err?.message || 'Failed to remove member.', 'error');
    }
  };

  const isLeader = team && user && team.leaderId === user.id;

  return (
    <div style={{ animation: 'pageIn 0.35s ease both' }}>
      <PageHeader
        eyebrow="TEAM GOVERNANCE"
        title="Team Details & Roster"
        subtitle="Shared project specifications, assigned faculty mentorship, active roster, and governance."
      />

      <MascotCompanionBanner
        defaultMood="happy"
        defaultMessage="Your team is doing amazing work together!"
        subtitle="Your friendly project companion is cheering you on."
      />

      {/* 1. Team Info Header Card */}
      {team && (
        <AppCard
          title={team.teamName}
          subtitle={`Theme: ${team.theme} · Department: ${team.branch}`}
          actionText={isLeader ? 'Edit Project Specs' : undefined}
          onAction={() => setIsEditProjectOpen(true)}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: '#102F48', margin: 0 }}>
                {team.projectTitle}
              </h2>
              <p style={{ fontSize: 13.5, color: '#5E788C', marginTop: 6, lineHeight: 1.55 }}>
                {team.projectGist}
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 12,
                border: '1px solid #D5E8EF',
                background: '#FFFFFF',
              }}
            >
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: '#7992A1', letterSpacing: '0.8px' }}>
                  TEAM CODE
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#0B4D88', letterSpacing: '1px' }}>
                  {team.teamCode}
                </div>
              </div>
              <button
                onClick={copyCode}
                title="Copy team code"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1px solid #D5E8EF',
                  background: copiedCode ? '#E4F6F0' : '#F4F9FB',
                  color: copiedCode ? '#328F81' : '#0B4D88',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
              >
                {copiedCode ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {team.abstractText && (
            <div
              style={{
                marginTop: 14,
                padding: '12px 16px',
                borderRadius: 12,
                background: '#F4FAFC',
                border: '1px solid #D5E8EF',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 850, color: '#0B4D88', textTransform: 'uppercase' }}>
                Abstract
              </div>
              <div style={{ fontSize: 12.5, color: '#31566E', marginTop: 4, lineHeight: 1.5 }}>
                {team.abstractText}
              </div>
            </div>
          )}

          {team.objectives && (
            <div
              style={{
                marginTop: 10,
                padding: '12px 16px',
                borderRadius: 12,
                background: '#F4FAFC',
                border: '1px solid #D5E8EF',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 850, color: '#0B4D88', textTransform: 'uppercase' }}>
                Key Objectives
              </div>
              <div style={{ fontSize: 12.5, color: '#31566E', marginTop: 4, lineHeight: 1.5 }}>
                {team.objectives}
              </div>
            </div>
          )}
        </AppCard>
      )}

      {/* 2. Faculty Mentor Card */}
      <AppCard title="Faculty Mentorship" subtitle="Assigned mentor guidance and consultation oversight.">
        {mentor ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 14,
              padding: '14px 18px',
              borderRadius: 14,
              background: '#EDEBFA',
              border: '1px solid rgba(109, 101, 165, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6D65A5, #8E85CC)',
                  color: '#FFFFFF',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 15,
                  fontWeight: 900,
                }}
              >
                {mentor.fullName[0]}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 850, color: '#102F48' }}>{mentor.fullName}</div>
                <div style={{ fontSize: 12, color: '#6D65A5', marginTop: 2 }}>
                  {mentor.department} · Code: {mentor.facultyCode}
                </div>
              </div>
            </div>
            <StatusPill status="CONFIRMED" />
          </div>
        ) : (
          <div
            style={{
              padding: '18px',
              borderRadius: 14,
              background: '#F9FDFE',
              border: '1px dashed #B7D5E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#102F48' }}>
                No Faculty Mentor Allocated Yet
              </div>
              <div style={{ fontSize: 12, color: '#5E788C', marginTop: 2 }}>
                Teams can browse and request faculty mentors once their project gist is finalized.
              </div>
            </div>
            {isLeader && (
              <button onClick={() => navigate('/lead/browse-mentors')} className="btn btn-primary btn-sm">
                <Award size={14} /> Browse Mentors ↗
              </button>
            )}
          </div>
        )}
      </AppCard>

      {/* 3. Academic Marks & Milestone Evaluations */}
      <StudentAcademicMarksCard evaluations={evaluations} isMarksVisible={isMarksVisible} />

      {/* 4. Active Team Members Roster */}
      <AppCard title={`Team Members (${members.length})`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {members.map((m) => {
            const isMemberLead = team?.leaderId === m.id;
            const isSelf = user?.id === m.id;

            return (
              <div
                key={m.id}
                style={{
                  padding: '16px',
                  borderRadius: 14,
                  border: '1px solid #D5E8EF',
                  background: isSelf ? '#F4FAFC' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0B4D88, #27B5C9)',
                        color: '#FFFFFF',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 13,
                        fontWeight: 900,
                      }}
                    >
                      {m.fullName[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#102F48' }}>{m.fullName}</div>
                      <div style={{ fontSize: 11.5, color: '#7992A1' }}>{m.usn || m.email}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {isMemberLead && <span className="badge badge-lead">LEAD</span>}
                    {isSelf && <span className="badge badge-blue">YOU</span>}
                  </div>
                </div>

                <div style={{ fontSize: 11.5, color: '#5E788C' }}>
                  {m.branch} · Sem {m.semester || '-'} · Sec {m.section || '-'}
                </div>

                {m.skills && m.skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {m.skills.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        style={{
                          fontSize: 10,
                          padding: '2px 8px',
                          borderRadius: 8,
                          background: '#E5F3FA',
                          color: '#0B4D88',
                          fontWeight: 700,
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {isLeader && !isMemberLead && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 8 }}>
                    <button
                      onClick={() => {
                        setSelectedMemberForTransfer(m.id);
                        setIsTransferModalOpen(true);
                      }}
                      className="btn btn-sm"
                      style={{ flex: 1, fontSize: 11 }}
                    >
                      <ArrowRightLeft size={12} /> Transfer Lead
                    </button>
                    <button
                      onClick={() => handleRemoveMember(m.id, m.fullName)}
                      className="btn btn-sm"
                      style={{ color: '#B34F5C', fontSize: 11 }}
                      title="Remove member from team"
                    >
                      <UserMinus size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AppCard>

      {/* 5. Departed Members Section */}
      {departures.length > 0 && (
        <AppCard title="Departed Members History" subtitle="Members who previously left or were transitioned out.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {departures.map((d) => (
              <div
                key={d.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 750, color: '#4B5563' }}>{d.fullName}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                    Left {new Date(d.leftAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} ·{' '}
                    {d.contributionsRemoved} deliverables purged
                  </div>
                </div>
                <span className="badge badge-danger">LEFT TEAM</span>
              </div>
            ))}
          </div>
        </AppCard>
      )}

      {/* 6. Leave Team Section */}
      <AppCard
        title="Team Governance Actions"
        accent={false}
        style={{ border: '1px solid rgba(179, 79, 92, 0.35)', background: '#FFF9F9' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#B34F5C' }}>Leave Project Team</div>
            <div style={{ fontSize: 12, color: '#70899A', marginTop: 2 }}>
              Leaves your current team and marks your contributions as removed per academic governance.
            </div>
          </div>
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="btn btn-danger"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <LogOut size={15} /> Leave Team
          </button>
        </div>
      </AppCard>

      {/* Edit Project Info Modal */}
      <Modal
        isOpen={isEditProjectOpen}
        onClose={() => setIsEditProjectOpen(false)}
        title="Edit Project Specifications"
        subtitle="Update project title, gist, abstract, and milestone objectives."
        maxWidth={620}
      >
        <form onSubmit={handleUpdateProject}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-proj-title">Project Title</label>
            <input
              id="edit-proj-title"
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-proj-gist">Project Gist (Short Pitch)</label>
            <textarea
              id="edit-proj-gist"
              required
              value={editGist}
              onChange={(e) => setEditGist(e.target.value)}
              className="form-textarea"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-proj-theme">Theme / Domain</label>
              <input
                id="edit-proj-theme"
                type="text"
                required
                value={editTheme}
                onChange={(e) => setEditTheme(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-proj-branch">Department Branch</label>
              <input
                id="edit-proj-branch"
                type="text"
                required
                value={editBranch}
                onChange={(e) => setEditBranch(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-proj-abstract">Formal Abstract</label>
            <textarea
              id="edit-proj-abstract"
              value={editAbstract}
              onChange={(e) => setEditAbstract(e.target.value)}
              className="form-textarea"
              placeholder="Detailed technical abstract of the project..."
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="edit-proj-objectives">Milestone Objectives</label>
            <textarea
              id="edit-proj-objectives"
              value={editObjectives}
              onChange={(e) => setEditObjectives(e.target.value)}
              className="form-textarea"
              placeholder="Key project deliverables and objectives..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button type="button" onClick={() => setIsEditProjectOpen(false)} className="btn">
              Cancel
            </button>
            <button type="submit" disabled={editLoading} className="btn btn-primary">
              {editLoading ? 'Saving...' : 'Update Specifications ↗'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Leave Team Modal */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="Leave Project Team?"
        subtitle="Please review academic governance consequences."
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
          <AlertTriangle size={36} color="#B34F5C" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: '#102F48', lineHeight: 1.5 }}>
            {isLeader ? (
              <span>
                <strong>You are currently the Team Lead.</strong> You should transfer leadership to
                another member before leaving, otherwise the team will remain leaderless. Leaving
                will delete all your submitted contributions.
              </span>
            ) : (
              <span>
                Are you sure you want to leave <strong>{team?.teamName}</strong>? All your submitted
                contributions and proof files will be purged from storage, and your departure will be
                logged in the team ledger.
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={() => setIsLeaveModalOpen(false)} className="btn">
            Cancel
          </button>
          <button type="button" onClick={handleLeaveTeam} className="btn btn-danger">
            Confirm Leave Team
          </button>
        </div>
      </Modal>

      {/* Transfer Leadership Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transfer Team Leadership"
        subtitle="Nominate a teammate to take over leadership responsibilities."
      >
        <div className="form-group">
          <label className="form-label" htmlFor="select-new-lead">Select New Team Lead</label>
          <select
            id="select-new-lead"
            value={selectedMemberForTransfer}
            onChange={(e) => setSelectedMemberForTransfer(e.target.value)}
            className="form-select"
          >
            <option value="">Choose a member...</option>
            {members
              .filter((m) => m.id !== user?.id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} ({m.usn || m.email})
                </option>
              ))}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button type="button" onClick={() => setIsTransferModalOpen(false)} className="btn">
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedMemberForTransfer}
            onClick={handleTransferLeadership}
            className="btn btn-primary"
          >
            Send Transfer Request ↗
          </button>
        </div>
      </Modal>
    </div>
  );
};
