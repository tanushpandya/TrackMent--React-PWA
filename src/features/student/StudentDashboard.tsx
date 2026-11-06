import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Calendar,
  Layers,
  Copy,
  Check,
  Star,
  Users,
  AlertTriangle,
  Award,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { ContributionService } from '../../services/contribution.service';
import { AppointmentService } from '../../services/appointment.service';
import { FeedbackService } from '../../services/feedback.service';
import {
  ContributionModel,
  AppointmentModel,
  FeedbackModel,
} from '../../types';
import { MascotCompanionBanner } from '../../components/mascot/MascotCompanionBanner';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { AppCard } from '../../components/common/AppCard';
import { StatusPill } from '../../components/common/StatusPill';

export const StudentDashboard: React.FC = () => {
  const { profile, isLead } = useAuth();
  const { team, members, mentor, refreshTeam } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [contributions, setContributions] = useState<ContributionModel[]>([]);
  const [upcomingMeeting, setUpcomingMeeting] = useState<AppointmentModel | null>(null);
  const [feedbackList, setFeedbackList] = useState<FeedbackModel[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!team) return;
    try {
      setLoading(true);
      const [contribs, meeting, feedback] = await Promise.all([
        ContributionService.fetchForTeam(team.id),
        AppointmentService.fetchUpcomingForTeam(team.id),
        FeedbackService.fetchForTeam(team.id),
      ]);
      setContributions(contribs);
      setUpcomingMeeting(meeting);
      setFeedbackList(feedback);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, [team]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const copyTeamCode = () => {
    if (!team?.teamCode) return;
    navigator.clipboard.writeText(team.teamCode);
    setCopiedCode(true);
    showToast(`Team code ${team.teamCode} copied! 📋`, 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = profile?.fullName?.split(' ')[0] || 'Student';
  const pendingReviews = contributions.filter((c) => c.status === 'PENDING').length;
  const acceptedContributions = contributions.filter((c) => c.status === 'CONFIRMED').length;
  const meetMeNotice = feedbackList.find((f) => f.feedbackType === 'MEET_ME');

  return (
    <div style={{ animation: 'pageIn 0.35s ease both' }}>
      {/* Header */}
      <PageHeader
        eyebrow="YOUR PROJECT, IN MOTION"
        title={`${getGreeting()}, ${firstName} 👋`}
        subtitle="A little progress today adds up to something great. Here’s where your team is."
        actions={
          isLead ? (
            <button
              onClick={() => navigate('/lead/dashboard')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Star size={15} /> Lead Console
            </button>
          ) : undefined
        }
      />

      {/* Mascot Companion */}
      <MascotCompanionBanner
        defaultMood={meetMeNotice ? 'worried' : pendingReviews > 0 ? 'surprised' : 'happy'}
        defaultMessage={
          meetMeNotice
            ? `Your mentor requested a meeting: "${meetMeNotice.content || 'Please schedule time'}"`
            : 'You’re building something great. Keep going!'
        }
      />

      {/* Hero Overview & Progress Card */}
      {team && (
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 19,
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(244, 250, 251, 0.88))',
            border: '1px solid rgba(255, 255, 255, 0.95)',
            boxShadow: '0 18px 42px rgba(12, 64, 101, 0.16)',
            padding: 24,
            marginBottom: 20,
          }}
        >
          {/* Card top accent */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: 'linear-gradient(90deg, #07518d 0%, #087aa9 38%, #28bdca 72%, rgba(40, 189, 202, 0) 100%)',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              marginBottom: 18,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 750, color: '#5E788C' }}>Project Title</span>
                <span className="badge badge-blue">{team.theme}</span>
                <span className="badge badge-confirmed">{team.branch}</span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#102F48', margin: 0 }}>
                {team.projectTitle}
              </h2>
              <p style={{ fontSize: 13, color: '#5E788C', marginTop: 4, maxWidth: 640 }}>
                {team.projectGist}
              </p>
            </div>

            {/* Team Code with Copy button */}
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
                <div style={{ fontSize: 14, fontWeight: 900, color: '#0B4D88', letterSpacing: '1px' }}>
                  {team.teamCode}
                </div>
              </div>
              <button
                onClick={copyTeamCode}
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
                  transition: 'all 0.15s ease',
                }}
              >
                {copiedCode ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ margin: '20px 0 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12.5 }}>
              <span style={{ fontWeight: 800, color: '#102F48' }}>Overall Milestone Progress</span>
              <span style={{ fontWeight: 900, color: '#0B4D88' }}>{team.currentProgressPct}%</span>
            </div>
            <div
              style={{
                width: '100%',
                height: 10,
                borderRadius: 99,
                background: '#D5E8EF',
                overflow: 'hidden',
              }}
            >
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

          {/* Quick Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
            <button
              onClick={() => navigate('/student/contributions')}
              className="btn btn-primary"
            >
              <Sparkles size={16} /> Submit Contribution ↗
            </button>
            <button
              onClick={() => navigate('/student/team-info')}
              className="btn"
            >
              <Users size={16} /> View Team Details
            </button>
          </div>
        </div>
      )}

      {/* 4 Bento Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <MetricCard
          label="TEAM PROGRESS"
          value={`${team?.currentProgressPct || 0}%`}
          note="Sprint milestone active"
          variant={1}
        />
        <MetricCard
          label="CONTRIBUTIONS"
          value={contributions.length}
          note={`${pendingReviews} pending review`}
          variant={2}
        />
        <MetricCard
          label="TEAM MEMBERS"
          value={members.length}
          note="All in active sync"
          variant={3}
        />
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
          note={upcomingMeeting?.status || 'No meeting scheduled'}
          variant={4}
        />
      </div>

      {/* 2-Column Grid: Recent Work & Mentor Guidance */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {/* Recent Contributions */}
        <AppCard
          title="Recent Work & Deliverables"
          subtitle="Latest submissions from you and your teammates."
          actionText="View all"
          onAction={() => navigate('/student/contributions')}
        >
          {contributions.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#7992A1', fontSize: 13 }}>
              No contributions submitted yet. Click "Submit Contribution" to share your first deliverable!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {contributions.slice(0, 4).map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 0',
                    borderTop: i > 0 ? '1px solid #D5E8EF' : 'none',
                  }}
                >
                  <div style={{ minWidth: 0, paddingRight: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#102F48' }}>{c.title}</div>
                    <div style={{ fontSize: 11.5, color: '#5E788C', marginTop: 2 }}>
                      By {c.authorName || 'Teammate'} · {c.files?.length || 0} attachments
                    </div>
                  </div>
                  <StatusPill status={c.status} />
                </div>
              ))}
            </div>
          )}
        </AppCard>

        {/* Mentor Guidance & Feedback */}
        <AppCard
          title="Mentor Guidance & Notes"
          subtitle={
            mentor
              ? `Guidance from ${mentor.fullName} (${mentor.department || 'Mentor'})`
              : 'No mentor assigned to this team yet.'
          }
          actionText="Meeting details"
          onAction={() => navigate('/student/meeting')}
        >
          {feedbackList.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#7992A1', fontSize: 13 }}>
              {mentor
                ? 'Your mentor has not posted notes yet. Book an appointment to discuss milestones!'
                : 'Your Team Lead can browse available faculty mentors in the Lead Console.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {feedbackList.slice(0, 3).map((f) => (
                <div
                  key={f.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background:
                      f.feedbackType === 'MEET_ME'
                        ? '#FFF4D8'
                        : f.feedbackType === 'THUMBS_UP'
                        ? '#E4F6F0'
                        : '#E5F3FA',
                    border: `1px solid ${
                      f.feedbackType === 'MEET_ME'
                        ? 'rgba(166, 120, 39, 0.3)'
                        : f.feedbackType === 'THUMBS_UP'
                        ? 'rgba(50, 143, 129, 0.3)'
                        : 'rgba(23, 106, 167, 0.2)'
                    }`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 850, color: '#102F48' }}>
                      {f.feedbackType === 'MEET_ME'
                        ? '⚡ Urgent: Mentor Requested Meeting'
                        : f.feedbackType === 'THUMBS_UP'
                        ? '👍 Deliverable Acknowledged'
                        : '💬 Faculty Mentor Guidance'}
                    </span>
                    <span style={{ fontSize: 10, color: '#7992A1' }}>
                      {new Date(f.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {f.content && (
                    <div style={{ fontSize: 12.5, color: '#31566E', lineHeight: 1.45 }}>
                      "{f.content}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </AppCard>
      </div>
    </div>
  );
};
