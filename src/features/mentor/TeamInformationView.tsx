import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  ShieldCheck,
  ThumbsUp,
  Trash2,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { TeamService } from '../../services/team.service';
import { ContributionService } from '../../services/contribution.service';
import { FeedbackService } from '../../services/feedback.service';
import {
  TeamModel,
  ProfileModel,
  ContributionModel,
  FeedbackModel,
  TeamEvaluation,
} from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { AppCard } from '../../components/common/AppCard';
import { StatusPill } from '../../components/common/StatusPill';
import { Modal } from '../../components/common/Modal';
import { CohortMarksDialog } from './CohortMarksDialog';
import { IndividualMemberMarksDialog } from './IndividualMemberMarksDialog';
import { FeedbackModal } from './FeedbackModal';

export const TeamInformationView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const teamIdParam = searchParams.get('teamId');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const teamId = teamIdParam ? parseInt(teamIdParam, 10) : null;

  const [activeTab, setActiveTab] = useState<'overview' | 'submissions'>('overview');
  const [team, setTeam] = useState<TeamModel | null>(null);
  const [members, setMembers] = useState<ProfileModel[]>([]);
  const [contributions, setContributions] = useState<ContributionModel[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackModel[]>([]);
  const [evaluations, setEvaluations] = useState<TeamEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const [abstractExpanded, setAbstractExpanded] = useState(false);

  // Dialog states
  const [isCohortMarksOpen, setIsCohortMarksOpen] = useState(false);
  const [selectedMemberForMarks, setSelectedMemberForMarks] = useState<ProfileModel | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  const loadAllData = useCallback(async () => {
    if (!teamId) return;
    try {
      setLoading(true);
      const [teamData, roster, contribs, feed, evals] = await Promise.all([
        TeamService.fetchTeamById(teamId),
        TeamService.fetchTeamMembers(teamId),
        ContributionService.fetchTeamContributions(teamId),
        FeedbackService.fetchTeamFeedback(teamId),
        TeamService.fetchTeamEvaluations(teamId),
      ]);
      setTeam(teamData);
      setMembers(roster);
      setContributions(contribs);
      setFeedbackList(feed);
      const cleanEvals = evals.filter((e: any) => {
        const p = (e.phaseName || '').toLowerCase().trim();
        return (
          p &&
          !p.startsWith('__') &&
          !p.includes('visibility') &&
          !p.includes('dummy') &&
          !p.includes('mock') &&
          !p.includes('test') &&
          !p.includes('demo')
        );
      });
      setEvaluations(cleanEvals);
    } catch (e) {
      console.error('Failed to load team data:', e);
      showToast('Could not load team details', 'error');
    } finally {
      setLoading(false);
    }
  }, [teamId, showToast]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleReleaseTeam = async () => {
    if (!team) return;
    setIsReleasing(true);
    try {
      await TeamService.abandonTeam(team.id);
      showToast(`Mentorship released for ${team.teamName}.`, 'info');
      setIsReleaseModalOpen(false);
      navigate('/mentor/dashboard');
    } catch (e: any) {
      showToast(e?.message || 'Could not release team.', 'error');
    } finally {
      setIsReleasing(false);
    }
  };

  if (!teamId || (!loading && !team)) {
    return (
      <div style={{ padding: '60px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px' }}>Team not found or invalid team ID.</p>
        <button
          onClick={() => navigate('/mentor/dashboard')}
          style={{
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (loading || !team) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--color-text-secondary)' }}>
        <Loader2 size={36} className="spin" style={{ margin: '0 auto 12px' }} />
        <div>Loading team information...</div>
      </div>
    );
  }

  const verifiedContributions = contributions.filter((c) => c.status === 'CONFIRMED');

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 8px 40px' }}>
      {/* Back button */}
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

      {/* Hero Overview Card */}
      <AppCard style={{ padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1
                style={{
                  fontSize: '22px',
                  fontWeight: 900,
                  color: 'var(--color-text-primary)',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                {team.teamName}
              </h1>
              <span
                style={{
                  background: 'var(--color-canvas)',
                  border: '1px solid var(--color-border)',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color: 'var(--color-primary)',
                }}
              >
                CODE: {team.teamCode}
              </span>
            </div>

            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '6px' }}>
              {team.projectTitle}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
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
                <span style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
                  Department: <strong>{team.branch}</strong>
                </span>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Progress
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-primary)' }}>
              {team.currentProgressPct || 0}%
            </div>
          </div>
        </div>

        {/* Abstract */}
        {team.projectGist && (
          <div style={{ marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
                maxHeight: abstractExpanded ? 'none' : '44px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {team.projectGist}
            </div>
            {team.projectGist.length > 120 && (
              <button
                onClick={() => setAbstractExpanded(!abstractExpanded)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '4px',
                  padding: 0,
                }}
              >
                {abstractExpanded ? (
                  <>
                    Show less <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    Read full abstract <ChevronDown size={14} />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </AppCard>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1.5px solid var(--color-border)', paddingBottom: '4px' }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'overview' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontSize: '14px',
            fontWeight: activeTab === 'overview' ? 800 : 600,
            cursor: 'pointer',
          }}
        >
          Team Overview & Marks
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'submissions' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'submissions' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontSize: '14px',
            fontWeight: activeTab === 'submissions' ? 800 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          Submissions & Feedback
          <span
            style={{
              background: 'rgba(11, 77, 136, 0.1)',
              color: 'var(--color-primary)',
              fontSize: '11px',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '999px',
            }}
          >
            {verifiedContributions.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Mentorship Supervision Actions */}
          <AppCard style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 2px 0' }}>
                  Mentorship Supervision
                </h3>
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
                  Log consultations, award milestone marks, or manage faculty allocation.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setIsCohortMarksOpen(true)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 3px 0 #07335c',
                  }}
                >
                  <Award size={15} />
                  Record Cohort Marks
                </button>

                <button
                  onClick={() => navigate(`/mentor/ledger?teamId=${team.id}&teamName=${encodeURIComponent(team.teamName)}`)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: 'white',
                    color: 'var(--color-primary)',
                    border: '1.5px solid var(--color-border)',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <FileText size={15} />
                  Open Entry Ledger
                </button>

                <button
                  onClick={() => setIsReleaseModalOpen(true)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'transparent',
                    color: 'var(--color-danger)',
                    border: '1px solid var(--color-danger)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Release Team
                </button>
              </div>
            </div>
          </AppCard>

          {/* Academic Evaluations / Marks Summary */}
          <AppCard style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} color="var(--color-primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                  Academic Phase Evaluations
                </h3>
              </div>
            </div>

            {evaluations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                No evaluation marks recorded yet. Click "Record Cohort Marks" above to grade this team.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {evaluations.map((ev) => {
                  const memberIds = Object.keys(ev.memberMarks || {});
                  const isIndividual = memberIds.length === 1;
                  const targetMember = isIndividual ? members.find((m) => m.id === memberIds[0]) : null;

                  return (
                    <div
                      key={ev.id}
                      style={{
                        padding: '12px 16px',
                        background: 'var(--color-canvas)',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            {ev.phaseName}
                          </span>
                          {targetMember ? (
                            <span className="badge badge-blue" style={{ fontSize: 11 }}>
                              Individual: {targetMember.fullName || targetMember.usn}
                            </span>
                          ) : (
                            <span className="badge badge-confirmed" style={{ fontSize: 11 }}>
                              Cohort (All Members)
                            </span>
                          )}
                        </div>
                        {ev.remarks && (
                          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                            "{ev.remarks}"
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 900,
                          color: 'var(--color-primary)',
                          background: 'rgba(11, 77, 136, 0.08)',
                          padding: '4px 12px',
                          borderRadius: '6px',
                        }}
                      >
                        {ev.totalMarks} / {ev.maxMarks}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </AppCard>

          {/* Team Members Matrix */}
          <AppCard style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Users size={18} color="var(--color-primary)" />
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                Team Members ({members.length})
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {members.map((m) => {
                const isLeader = m.id === team.leaderId;
                return (
                  <div
                    key={m.id}
                    style={{
                      padding: '14px',
                      background: 'var(--color-canvas)',
                      borderRadius: '10px',
                      border: isLeader ? '1.5px solid rgba(11, 77, 136, 0.3)' : '1px solid var(--color-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {m.fullName}
                        </span>
                        {isLeader && (
                          <span
                            style={{
                              background: 'var(--color-primary)',
                              color: 'white',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            LEAD
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                        <div>USN: <strong>{m.usn || 'N/A'}</strong></div>
                        <div>Dept: {m.branch || 'N/A'} {m.semester ? `• Sem ${m.semester}` : ''} {m.section ? `• Sec ${m.section}` : ''}</div>
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                      <button
                        onClick={() => setSelectedMemberForMarks(m)}
                        style={{
                          width: '100%',
                          padding: '6px',
                          background: 'white',
                          border: '1px solid var(--color-border)',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: 'var(--color-primary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        <Award size={13} />
                        Grade Individually
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </AppCard>
        </div>
      )}

      {/* Tab 2: Submissions & Feedback */}
      {activeTab === 'submissions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Action: Publish Feedback */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Verified Contributions & Deliverables ({verifiedContributions.length})
            </div>
            <button
              onClick={() => setIsFeedbackModalOpen(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 3px 0 #07335c',
              }}
            >
              <MessageSquare size={15} />
              Publish Feedback
            </button>
          </div>

          {verifiedContributions.length === 0 ? (
            <AppCard style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }}>
              No verified deliverables submitted by this team yet.
            </AppCard>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {verifiedContributions.map((c) => (
                <AppCard key={c.id} style={{ padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {c.title}
                        </span>
                        <StatusPill status={c.status} />
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        Submitted by <strong>{c.studentName || 'Student'}</strong> ({c.studentUsn || ''})
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', margin: '10px 0', lineHeight: 1.4 }}>
                    {c.description}
                  </p>

                  {c.proofUrl && (
                    <div style={{ marginTop: '8px' }}>
                      <a
                        href={c.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          color: 'var(--color-primary)',
                          textDecoration: 'none',
                        }}
                      >
                        <ExternalLink size={14} />
                        View Attached Deliverable / Artifact
                      </a>
                    </div>
                  )}
                </AppCard>
              ))}
            </div>
          )}

          {/* Past Feedback Items Feed */}
          <div style={{ marginTop: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
              Past Mentor Feedback
            </h3>

            {feedbackList.length === 0 ? (
              <AppCard style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--color-text-secondary)' }}>
                No feedback published to this team yet.
              </AppCard>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {feedbackList.map((f) => (
                  <AppCard key={f.id} style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      {f.feedbackType === 'THUMBS_UP' ? (
                        <span style={{ color: 'var(--color-confirmed)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', fontWeight: 700 }}>
                          <ThumbsUp size={15} /> Endorsement
                        </span>
                      ) : f.feedbackType === 'MEET_ME' ? (
                        <span style={{ color: 'var(--color-pending)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', fontWeight: 700 }}>
                          <Calendar size={15} /> Consultation Requested
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12.5px', fontWeight: 700 }}>
                          <MessageSquare size={15} /> Mentor Note
                        </span>
                      )}
                      <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
                        • {new Date(f.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                      {f.content}
                    </p>
                  </AppCard>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cohort Marks Dialog */}
      <CohortMarksDialog
        isOpen={isCohortMarksOpen}
        onClose={() => setIsCohortMarksOpen(false)}
        team={team}
        members={members}
        evaluations={evaluations}
        onSaved={loadAllData}
      />

      {/* Individual Marks Dialog */}
      {selectedMemberForMarks && (
        <IndividualMemberMarksDialog
          isOpen={true}
          onClose={() => setSelectedMemberForMarks(null)}
          team={team}
          member={selectedMemberForMarks}
          evaluations={evaluations}
          onSaved={loadAllData}
        />
      )}

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        teamId={team.id}
        teamName={team.teamName}
        onFeedbackSent={loadAllData}
      />

      {/* Release Team Confirmation Modal */}
      <Modal
        isOpen={isReleaseModalOpen}
        onClose={() => setIsReleaseModalOpen(false)}
        title={`Release ${team.teamName}?`}
      >
        <div>
          <p style={{ margin: '0 0 16px 0', fontSize: '13.5px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Are you sure you want to release mentorship of <strong>{team.teamName}</strong>? This team will become available for other faculty mentors to claim.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              onClick={() => setIsReleaseModalOpen(false)}
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
              disabled={isReleasing}
              onClick={handleReleaseTeam}
              style={{
                padding: '10px',
                borderRadius: '8px',
                background: 'var(--color-danger)',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                cursor: isReleasing ? 'not-allowed' : 'pointer',
              }}
            >
              {isReleasing ? 'Releasing...' : 'Confirm Release'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
