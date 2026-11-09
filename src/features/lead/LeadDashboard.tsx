import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  TrendingUp,
  Calendar,
  Users,
  Search,
  Award,
  ArrowRight,
  Sparkles,
  Inbox,
  AlertCircle,
  Copy,
  Check,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { ContributionService } from '../../services/contribution.service';
import { AppointmentService } from '../../services/appointment.service';
import { FeedbackService } from '../../services/feedback.service';
import { TeamService } from '../../services/team.service';
import {
  ContributionModel,
  AppointmentModel,
  FeedbackModel,
  JoinRequestModel,
  TeamEvaluation,
} from '../../types';
import { StudentAcademicMarksCard } from '../../components/common/StudentAcademicMarksCard';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { AppCard } from '../../components/common/AppCard';
import { StatusPill } from '../../components/common/StatusPill';
import { MascotCompanionBanner } from '../../components/mascot/MascotCompanionBanner';

export const LeadDashboard: React.FC = () => {
  const { profile } = useAuth();
  const { team, members, mentor, refreshTeam } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [pendingContributions, setPendingContributions] = useState<ContributionModel[]>([]);
  const [upcomingMeeting, setUpcomingMeeting] = useState<AppointmentModel | null>(null);
  const [feedbackList, setFeedbackList] = useState<FeedbackModel[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequestModel[]>([]);
  const [evaluations, setEvaluations] = useState<TeamEvaluation[]>([]);
  const [isMarksVisible, setIsMarksVisible] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!team) return;
    try {
      setLoading(true);
      const [pending, meeting, feedback, requests, evals, vis] = await Promise.all([
        ContributionService.fetchPendingForTeam(team.id),
        AppointmentService.fetchUpcomingForTeam(team.id),
        FeedbackService.fetchForTeam(team.id),
        TeamService.fetchJoinRequests(team.id, true),
        TeamService.fetchTeamEvaluations(team.id),
        TeamService.fetchMarksVisibility(team.id),
      ]);

      const teammateIds = new Set<string>();
      if (team?.leaderId) teammateIds.add(team.leaderId);
      (members || []).forEach((m) => teammateIds.add(m.id));

      const actualPendingRequests = requests.filter(
        (r) => r.status === 'PENDING' && !teammateIds.has(r.studentId)
      );

      setPendingContributions(pending);
      setUpcomingMeeting(meeting);
      setFeedbackList(feedback);
      setJoinRequests(actualPendingRequests);
      setEvaluations(evals);
      setIsMarksVisible(vis);
    } catch (e) {
      console.error('Error loading lead dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, [team]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyCode = () => {
    if (!team?.teamCode) return;
    navigator.clipboard.writeText(team.teamCode);
    setCopiedCode(true);
    showToast(`Team code ${team.teamCode} copied!`, 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const firstName = profile?.fullName?.split(' ')[0] || 'Lead';

  return (
    <div style={{ animation: 'pageIn 0.35s ease both' }}>
      <PageHeader
        eyebrow="TEAM LEAD GOVERNANCE CONSOLE"
        title={`Your team is moving forward, ${firstName} 👑`}
        subtitle="Review peer contributions, coordinate faculty mentor appointments, and lead project milestones."
        actions={
          <button
            onClick={() => navigate('/student/dashboard')}
            className="btn btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Eye size={15} /> Switch to Member View
          </button>
        }
      />

      <MascotCompanionBanner
        defaultMood={pendingContributions.length > 0 ? 'surprised' : 'happy'}
        defaultMessage={
          pendingContributions.length > 0
            ? `You have ${pendingContributions.length} team contribution(s) awaiting your review!`
            : 'Your team momentum looks great! Keep milestones active.'
        }
        subtitle="Prompt reviews keep the whole project team moving forward smoothly."
        isLead={true}
      />

      {/* Overview & Quick Actions Card */}
      {team && (
        <AppCard
          title={team.teamName}
          subtitle={`Theme: ${team.theme} · ${team.branch}`}
          actionText="Update Progress"
          onAction={() => navigate('/lead/progress')}
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
              <p style={{ fontSize: 13, color: '#5E788C', marginTop: 4 }}>
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

          {/* Progress Bar */}
          <div style={{ margin: '16px 0 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12.5 }}>
              <span style={{ fontWeight: 800, color: '#102F48' }}>Current Sprint Progress</span>
              <span style={{ fontWeight: 900, color: '#0B4D88' }}>{team.currentProgressPct}%</span>
            </div>
            <div style={{ width: '100%', height: 10, borderRadius: 99, background: '#D5E8EF', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${team.currentProgressPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #2676AC, #48C4CF)',
                  borderRadius: 99,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>

          {/* Lead Quick Actions Bar */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
            <button
              onClick={() => navigate('/lead/review')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <CheckCircle size={15} /> Review Queue ({pendingContributions.length})
            </button>
            <button
              onClick={() => navigate('/lead/progress')}
              className="btn"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <TrendingUp size={15} /> Update Progress
            </button>
            <button
              onClick={() => navigate('/lead/meeting')}
              className="btn"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Calendar size={15} /> Mentor Meetings
            </button>
            <button
              onClick={() => navigate('/lead/join-requests')}
              className="btn"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Inbox size={15} /> Join Requests ({joinRequests.length})
            </button>
            {!team.mentorId && (
              <button
                onClick={() => navigate('/lead/browse-mentors')}
                className="btn"
                style={{ display: 'flex', alignItems: 'center', gap: 6, borderColor: '#EDEBFA', color: '#6D65A5' }}
              >
                <Award size={15} /> Find Faculty Mentor
              </button>
            )}
          </div>
        </AppCard>
      )}

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <MetricCard label="PROJECT PROGRESS" value={`${team?.currentProgressPct || 0}%`} note="Milestone tracking" variant={1} />
        <MetricCard label="AWAITING REVIEW" value={pendingContributions.length} note="Deliverables pending" variant={2} />
        <MetricCard label="TEAM MEMBERS" value={members.length} note="1 lead · active roster" variant={3} />
        <MetricCard
          label="NEXT MEETING"
          value={
            upcomingMeeting
              ? new Date(upcomingMeeting.confirmedSlot || upcomingMeeting.requestedSlot).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                })
              : 'None'
          }
          note={upcomingMeeting?.status || 'No meeting booked'}
          variant={4}
        />
      </div>

      {/* Official Academic Milestone Marks */}
      <StudentAcademicMarksCard
        evaluations={evaluations}
        isMarksVisible={isMarksVisible}
        loading={loading}
      />

      {/* 2-Column: Review Queue Shortcut & Project Pulse */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
        {/* Pending Deliverables Queue */}
        <AppCard
          title="Review Queue (Deliverables Awaiting Action)"
          subtitle="Help your teammates keep good work moving."
          actionText="Open queue"
          onAction={() => navigate('/lead/review')}
        >
          {pendingContributions.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#7992A1', fontSize: 13 }}>
              All peer contributions have been reviewed! ✨
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingContributions.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid #D5E8EF',
                    background: '#FFFFFF',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#102F48' }}>{c.title}</div>
                    <div style={{ fontSize: 11.5, color: '#5E788C', marginTop: 2 }}>
                      By {c.authorName || 'Teammate'} · {c.files?.length || 0} proofs
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/lead/review')}
                    className="btn btn-primary btn-sm"
                  >
                    Review ↗
                  </button>
                </div>
              ))}
            </div>
          )}
        </AppCard>

        {/* Join Requests Shortcut */}
        <AppCard
          title="Incoming Join Requests"
          subtitle="Students seeking to join your project team."
          actionText="View all"
          onAction={() => navigate('/lead/join-requests')}
        >
          {joinRequests.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#7992A1', fontSize: 13 }}>
              No pending join requests right now.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {joinRequests.slice(0, 3).map((req) => (
                <div
                  key={req.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid #D5E8EF',
                    background: '#FFFFFF',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#102F48' }}>
                      {req.studentName || 'Student Applicant'}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#5E788C', marginTop: 2 }}>
                      {req.studentBranch} · USN: {req.studentUsn || '-'}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/lead/join-requests')}
                    className="btn btn-sm"
                  >
                    Respond ↗
                  </button>
                </div>
              ))}
            </div>
          )}
        </AppCard>
      </div>
    </div>
  );
};
