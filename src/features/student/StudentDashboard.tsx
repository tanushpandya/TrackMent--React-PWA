import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Copy,
  Check,
  Star,
  Users,
  TrendingUp,
  Calendar,
  CheckCircle,
  Award,
  AlertTriangle,
  FileText,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { ContributionService } from '../../services/contribution.service';
import { AppointmentService } from '../../services/appointment.service';
import { FeedbackService } from '../../services/feedback.service';
import { TeamService } from '../../services/team.service';
import { supabase } from '../../services/supabase';
import {
  ContributionModel,
  ContributionStatus,
  AppointmentModel,
  FeedbackModel,
  TeamEvaluation,
  JoinRequestModel,
} from '../../types';
import { MascotCompanionBanner } from '../../components/mascot/MascotCompanionBanner';
import { StudentAcademicMarksCard } from '../../components/common/StudentAcademicMarksCard';
import { ObjectivesChecklistWidget } from '../../components/dashboard/ObjectivesChecklistWidget';

export const StudentDashboard: React.FC = () => {
  const { profile, user, isLead } = useAuth();
  const { team, members, mentor } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const isLeader = Boolean(isLead || (team && user && team.leaderId === user.id));

  const [contributions, setContributions] = useState<ContributionModel[]>([]);
  const [upcomingMeeting, setUpcomingMeeting] = useState<AppointmentModel | null>(null);
  const [feedbackList, setFeedbackList] = useState<FeedbackModel[]>([]);
  const [evaluations, setEvaluations] = useState<TeamEvaluation[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequestModel[]>([]);
  const [isMarksVisible, setIsMarksVisible] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!team) return;
    try {
      setLoading(true);
      const isLeaderRole = Boolean(isLead || (team && user && team.leaderId === user.id));
      const [contribs, meeting, feedback, evals, vis, requests] = await Promise.all([
        ContributionService.fetchForTeam(team.id),
        AppointmentService.fetchUpcomingForTeam(team.id),
        FeedbackService.fetchForTeam(team.id),
        TeamService.fetchTeamEvaluations(team.id),
        TeamService.fetchMarksVisibility(team.id),
        isLeaderRole ? TeamService.fetchJoinRequests(team.id, true) : Promise.resolve([]),
      ]);
      setContributions(contribs);
      setUpcomingMeeting(meeting);
      setFeedbackList(feedback);
      setEvaluations(evals);
      setIsMarksVisible(vis);
      setJoinRequests(requests || []);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, [team, isLead, user]);

  useEffect(() => {
    loadDashboardData();

    if (!team) return;
    const channel = supabase
      .channel(`realtime:student_dashboard_${team.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contributions', filter: `team_id=eq.${team.id}` }, () => {
        loadDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `team_id=eq.${team.id}` }, () => {
        loadDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback', filter: `team_id=eq.${team.id}` }, () => {
        loadDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'evaluations', filter: `team_id=eq.${team.id}` }, () => {
        loadDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'join_requests', filter: `team_id=eq.${team.id}` }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [team, loadDashboardData]);

  const displayContributions: ContributionModel[] = contributions;
  const verifiedCount = displayContributions.filter(
    (c) => c.status === 'CONFIRMED' || (c.status as string) === 'Verified'
  ).length;

  const p1Eval = evaluations.find((e) => (e.phaseName || '').toLowerCase().includes('phase 1'));
  const p2Eval = evaluations.find((e) => (e.phaseName || '').toLowerCase().includes('phase 2'));
  const p3Eval = evaluations.find((e) => (e.phaseName || '').toLowerCase().includes('phase 3'));

  const p1 = p1Eval ? (p1Eval.memberMarks[user?.id || ''] ?? p1Eval.totalMarks ?? 0) : 0;
  const p2 = p2Eval ? (p2Eval.memberMarks[user?.id || ''] ?? p2Eval.totalMarks ?? 0) : 0;
  const p3 = p3Eval ? (p3Eval.memberMarks[user?.id || ''] ?? p3Eval.totalMarks ?? 0) : 0;
  const total = p1 + p2 + p3;
  const hasMarks = evaluations.length > 0;

  const activeSummons = feedbackList.find((f) => f.feedbackType === 'MEET_ME');
  const directives = feedbackList;

  const meetingTimeStr = upcomingMeeting
    ? new Date(upcomingMeeting.confirmedSlot || upcomingMeeting.requestedSlot).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'None';
  const meetingDateStr = upcomingMeeting
    ? new Date(upcomingMeeting.confirmedSlot || upcomingMeeting.requestedSlot).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : 'No Meeting Booked';

  const mentorName = mentor?.fullName || 'Assigned Faculty Mentor';

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Interactive Companion Mood Orb Banner */}
      <MascotCompanionBanner
        mentorName={mentorName}
        defaultMessage={
          activeSummons
            ? `Your mentor requested an urgent review: "${activeSummons.content || 'Consultation requested'}"`
            : upcomingMeeting
            ? `Upcoming meeting with ${mentorName} on ${meetingDateStr}`
            : `All milestones aligned. Keep pushing forward with your team! ✨`
        }
        subtitle="Your friendly project companion is cheering you on."
        actionText="+ Submit Proof"
        onAction={() => navigate('/student/contributions')}
      />

      {/* 4-Column Top KPI Strip (Surface Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Milestone Progress */}
        <div className="surface-card p-5 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Milestone Progress</div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-[#0A2540] tabular-nums">
                  {team?.currentProgressPct ?? 0}%
                </span>
                <span className="text-xs font-medium text-slate-500">Target: 100%</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D63ED] flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">{team?.currentProgressPct ?? 0}% Completed</span>
            <button onClick={() => navigate('/student/team-info')} className="font-semibold text-[#1D63ED] hover:underline">
              Workspace →
            </button>
          </div>
        </div>

        {/* Card 2: Mentor Meeting */}
        <div className="surface-card p-5 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mentor Meeting</div>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <span className="text-3xl font-bold font-mono text-[#0A2540] tabular-nums">
                  {meetingTimeStr}
                </span>
                {upcomingMeeting && (
                  <span className="px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0] text-[11px] font-semibold font-mono">
                    {upcomingMeeting.status} ✓
                  </span>
                )}
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[#15803D] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 truncate max-w-[150px]">{meetingDateStr}</span>
            <button onClick={() => navigate('/student/meeting')} className="font-semibold text-[#1D63ED] hover:underline">
              Open Scheduler →
            </button>
          </div>
        </div>

        {/* Card 3: Contributions */}
        <div className="surface-card p-5 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contributions</div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-[#0A2540] tabular-nums">
                  {displayContributions.length}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0] text-[11px] font-semibold font-mono">
                  {verifiedCount} Verified
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D63ED] flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">{displayContributions.length - verifiedCount} Pending</span>
            {isLeader ? (
              <button
                onClick={() => navigate('/lead/review')}
                className="font-semibold text-[#B45309] hover:underline"
              >
                Review Queue →
              </button>
            ) : (
              <button
                onClick={() => navigate('/student/contributions')}
                className="font-semibold text-[#1D63ED] hover:underline"
              >
                Submit Proof →
              </button>
            )}
          </div>
        </div>

        {/* Card 4: Cumulative Score */}
        <div className="surface-card p-5 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cumulative Score</div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-[#0A2540] tabular-nums">
                  {hasMarks && isMarksVisible ? `${total}/200` : '--/200'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold font-mono ${
                    hasMarks && isMarksVisible
                      ? 'bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0]'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {hasMarks && isMarksVisible ? 'Released' : 'Pending'}
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D63ED] flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {hasMarks && isMarksVisible ? `P1: ${p1} • P2: ${p2} • P3: ${p3}` : 'Awaiting Faculty Release'}
            </span>
            <button onClick={() => navigate('/student/team-info')} className="font-semibold text-[#1D63ED] hover:underline">
              View Rubrics →
            </button>
          </div>
        </div>
      </div>

      {/* Mentor Summons Alert Banner (Only shown if active summons from mentor) */}
      {activeSummons && (
        <div className="surface-card rounded-xl p-4 bg-gradient-to-r from-white via-[#FFF1F2]/60 to-[#FFFBEB]/50 border border-[#FECDD3] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#BE123C] text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#BE123C] text-white text-[10px] font-bold font-mono">
                  MENTOR SUMMONS
                </span>
                <span className="text-xs font-bold text-[#0A2540]">Mandatory Consultation Requested</span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {activeSummons.content || 'Your mentor has requested an in-person meeting with your team.'}
              </p>
              <p className="text-xs text-slate-500">Issued by {activeSummons.mentorName || mentorName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/student/meeting')}
              className="h-8 px-3.5 rounded-lg bg-[#0F4C81] hover:bg-[#1D63ED] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Review Meeting Details →
            </button>
          </div>
        </div>
      )}

      {/* 2-Column Desktop Grid (8 cols / 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left (8 cols): Recent Contributions Table */}
        <div className="lg:col-span-8 surface-card rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#D6E4EE] flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-bold text-[#0A2540]">Recent Team Contributions</h2>
              <p className="text-xs text-slate-500">Live verified proof ledger for continuous CIE evaluation</p>
            </div>
            <div className="flex items-center gap-2">
              {isLeader && displayContributions.some(c => c.status !== 'CONFIRMED' && (c.status as string) !== 'Verified') && (
                <button
                  onClick={() => navigate('/lead/review')}
                  className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] hover:bg-amber-100 transition-colors"
                >
                  Review Pending Queue →
                </button>
              )}
              <button
                onClick={() => navigate('/student/contributions')}
                className="text-xs font-semibold text-[#1D63ED] hover:underline"
              >
                + Submit Contribution →
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-[#D6E4EE] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Contribution &amp; Module</th>
                  <th className="py-3 px-4">Author &amp; USN</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EEF5] text-[13px]">
                {displayContributions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                      No team contributions submitted yet. Click "+ Submit Contribution" to record your progress.
                    </td>
                  </tr>
                ) : (
                  displayContributions.map((c) => {
                    const isVerified = c.status === 'CONFIRMED' || (c.status as string) === 'Verified';
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-[#0A2540]">{c.title}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            {c.contribution_type || 'Core Implementation'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                          <strong className="text-slate-800">{c.authorName || c.author_name || 'Member'}</strong>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                          {new Date(c.createdAt || c.created_at || Date.now()).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          {isVerified ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold font-mono bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0]">
                              Verified ✓
                            </span>
                          ) : isLeader ? (
                            <button
                              onClick={() => navigate('/lead/review')}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold font-mono bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] hover:bg-amber-100 transition-colors"
                            >
                              Review Now →
                            </button>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold font-mono bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                              Pending Review
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right (4 cols): Mentor Guidance & Quick Shortcuts */}
        <div className="lg:col-span-4 space-y-5">
          {/* Mentor Feedback & Guidance Cards */}
          <div className="surface-card rounded-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-[14.5px] font-bold text-[#0A2540]">Mentor Guidance</h2>
              <span className="font-mono text-xs font-bold text-slate-400">{directives.length}</span>
            </div>

            {directives.length === 0 ? (
              <div className="p-6 rounded-xl border border-[#D6E4EE] bg-slate-50/50 text-center text-xs text-slate-400">
                No mentor guidance or directives issued yet.
              </div>
            ) : (
              <div className="space-y-3">
                {directives.map((d: any, idx) => {
                  const isSummons =
                    (d.directiveType || '').toLowerCase().includes('summons') || d.feedbackType === 'MEET_ME';
                  return (
                    <div
                      key={d.id || idx}
                      className={`p-3.5 rounded-xl border space-y-1.5 ${
                        isSummons
                          ? 'border-[#FECDD3] bg-[#FFF1F2]/60'
                          : 'border-[#BFDBFE] bg-[#EFF6FF]/45'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            isSummons ? 'bg-[#BE123C] text-white' : 'bg-[#1D63ED] text-white'
                          }`}
                        >
                          {d.directiveType || d.feedbackType || 'Directive'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-[#0A2540]">
                        {d.mentorName || d.author || mentorName}
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{d.content || d.comment}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lead Governance Card (Elevated Privileges for Team Leader) */}
          {isLeader && (
            <div className="surface-card rounded-xl p-5 space-y-3 border-amber-200/80 bg-gradient-to-b from-white to-[#FFFDF7]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-bold text-[#0A2540]">Lead Governance</h3>
                  <span className="px-1.5 py-0.2 rounded bg-[#FEF3C7] text-[#B45309] text-[9.5px] font-bold font-mono">
                    LEAD
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-amber-700">Privileged Controls</span>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/lead/review')}
                  className="w-full p-3 rounded-xl border border-[#D6E4EE] hover:border-[#1D63ED] bg-white hover:bg-[#EFF6FF]/50 flex items-center justify-between text-left transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-[#0A2540]">📝 Review Submissions</div>
                    <div className="text-[11px] text-slate-500">
                      {displayContributions.filter(c => c.status !== 'CONFIRMED' && (c.status as string) !== 'Verified').length} pending peer submissions
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#1D63ED]">Review →</span>
                </button>

                <button
                  onClick={() => navigate('/lead/join-requests')}
                  className="w-full p-3 rounded-xl border border-[#D6E4EE] hover:border-[#1D63ED] bg-white hover:bg-[#EFF6FF]/50 flex items-center justify-between text-left transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-[#0A2540]">📥 Join Requests</div>
                    <div className="text-[11px] text-slate-500">{joinRequests.length} student application(s)</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-mono text-[11px] font-bold">
                    {joinRequests.length}
                  </span>
                </button>

                <button
                  onClick={() => navigate('/lead/recruit-students')}
                  className="w-full p-3 rounded-xl border border-[#D6E4EE] hover:border-[#1D63ED] bg-white hover:bg-[#EFF6FF]/50 flex items-center justify-between text-left transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-[#0A2540]">👥 Invite Candidates</div>
                    <div className="text-[11px] text-slate-500">Discover &amp; recruit engineering peers</div>
                  </div>
                  <span className="text-xs font-bold text-[#1D63ED]">Browse →</span>
                </button>
              </div>
            </div>
          )}

          {/* Authentic RVCE Academic Marks Breakdown */}
          {isMarksVisible && (
            <StudentAcademicMarksCard
              evaluations={evaluations}
              isMarksVisible={isMarksVisible}
              loading={loading}
            />
          )}

          {/* Institutional Project Objectives Checklist */}
          {team && (
            <ObjectivesChecklistWidget
              team={team}
              isLeader={isLeader}
              onUpdated={loadDashboardData}
              compact
            />
          )}

          {/* Quick Member Actions */}
          <div className="surface-card rounded-xl p-5 space-y-3">
            <h3 className="text-[14px] font-bold text-[#0A2540]">Quick Navigation</h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/student/team-info')}
                className="w-full p-3 rounded-xl border border-[#D6E4EE] hover:border-[#1D63ED] bg-slate-50/70 hover:bg-[#EFF6FF]/50 flex items-center justify-between text-left transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-[#0A2540]">👥 View Team Workspace</div>
                  <div className="text-[11px] text-slate-500">Deliverables, checklist &amp; marks</div>
                </div>
                <span className="text-xs font-bold text-[#1D63ED]">Open →</span>
              </button>

              <button
                onClick={() => navigate('/student/contributions')}
                className="w-full p-3 rounded-xl border border-[#D6E4EE] hover:border-[#1D63ED] bg-slate-50/70 hover:bg-[#EFF6FF]/50 flex items-center justify-between text-left transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-[#0A2540]">✨ Add Contribution</div>
                  <div className="text-[11px] text-slate-500">Submit proofs &amp; code links</div>
                </div>
                <span className="text-xs font-bold text-[#1D63ED]">Studio →</span>
              </button>

              <button
                onClick={() => navigate('/student/ledger')}
                className="w-full p-3 rounded-xl border border-[#D6E4EE] hover:border-[#1D63ED] bg-slate-50/70 hover:bg-[#EFF6FF]/50 flex items-center justify-between text-left transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-[#0A2540]">📋 Official Entry Ledger</div>
                  <div className="text-[11px] text-slate-500">Verified consultation attendance</div>
                </div>
                <span className="text-xs font-bold text-[#1D63ED]">Logs →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
