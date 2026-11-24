import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  TrendingUp,
  Calendar,
  Award,
  Inbox,
  Copy,
  Check,
  Eye,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { ContributionService } from '../../services/contribution.service';
import { AppointmentService } from '../../services/appointment.service';
import { TeamService } from '../../services/team.service';
import { FeedbackService } from '../../services/feedback.service';
import { supabase } from '../../services/supabase';
import {
  ContributionModel,
  ContributionStatus,
  AppointmentModel,
  JoinRequestModel,
  TeamEvaluation,
  FeedbackModel,
} from '../../types';
import { MascotCompanionBanner } from '../../components/mascot/MascotCompanionBanner';
import { StudentAcademicMarksCard } from '../../components/common/StudentAcademicMarksCard';
import { ObjectivesChecklistWidget } from '../../components/dashboard/ObjectivesChecklistWidget';

export const LeadDashboard: React.FC = () => {
  const { profile } = useAuth();
  const { team, members, mentor } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [pendingContributions, setPendingContributions] = useState<ContributionModel[]>([]);
  const [allContributions, setAllContributions] = useState<ContributionModel[]>([]);
  const [upcomingMeeting, setUpcomingMeeting] = useState<AppointmentModel | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequestModel[]>([]);
  const [evaluations, setEvaluations] = useState<TeamEvaluation[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackModel[]>([]);
  const [isMarksVisible, setIsMarksVisible] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!team) return;
    try {
      setLoading(true);
      const [pending, allContribs, meeting, requests, evals, vis, feedback] = await Promise.all([
        ContributionService.fetchPendingForTeam(team.id),
        ContributionService.fetchTeamContributions(team.id),
        AppointmentService.fetchUpcomingForTeam(team.id),
        TeamService.fetchJoinRequests(team.id, true),
        TeamService.fetchTeamEvaluations(team.id),
        TeamService.fetchMarksVisibility(team.id),
        FeedbackService.fetchTeamFeedback(team.id),
      ]);

      const teammateIds = new Set<string>();
      if (team?.leaderId) teammateIds.add(team.leaderId);
      (members || []).forEach((m) => teammateIds.add(m.id));

      const actualPendingRequests = requests.filter(
        (r) => r.status === 'PENDING' && !teammateIds.has(r.studentId)
      );

      setPendingContributions(pending);
      setAllContributions(allContribs);
      setUpcomingMeeting(meeting);
      setJoinRequests(actualPendingRequests);
      setEvaluations(evals);
      setIsMarksVisible(vis);
      setFeedbackList(feedback);
    } catch (e) {
      console.error('Error loading lead dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, [team, members]);

  useEffect(() => {
    loadData();

    if (!team) return;
    const channel = supabase
      .channel(`realtime:lead_dashboard_${team.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contributions', filter: `team_id=eq.${team.id}` }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `team_id=eq.${team.id}` }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'join_requests', filter: `team_id=eq.${team.id}` }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'evaluations', filter: `team_id=eq.${team.id}` }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [team, loadData]);

  const displayContributions: ContributionModel[] = allContributions;
  const verifiedCount = displayContributions.filter(
    (c) => c.status === 'CONFIRMED' || (c.status as string) === 'Verified'
  ).length;

  const p1Eval = evaluations.find((e) => (e.phaseName || '').toLowerCase().includes('phase 1'));
  const p2Eval = evaluations.find((e) => (e.phaseName || '').toLowerCase().includes('phase 2'));
  const p3Eval = evaluations.find((e) => (e.phaseName || '').toLowerCase().includes('phase 3'));

  const p1 = p1Eval?.totalMarks ?? 0;
  const p2 = p2Eval?.totalMarks ?? 0;
  const p3 = p3Eval?.totalMarks ?? 0;
  const totalMarks = p1 + p2 + p3;
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
    <div className="space-y-5">
      {/* Interactive Companion Mood Orb Banner */}
      <MascotCompanionBanner
        mentorName={mentorName}
        defaultMessage={
          activeSummons
            ? `Your mentor requested an urgent review: "${activeSummons.content || 'Consultation requested'}"`
            : upcomingMeeting
            ? `Upcoming meeting with ${mentorName} on ${meetingDateStr}`
            : `All milestones aligned. Keep pushing forward with your team.`
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
            <button onClick={() => navigate('/lead/meeting')} className="font-semibold text-[#1D63ED] hover:underline">
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
            <span className="text-slate-500">{pendingContributions.length} Pending Review</span>
            <button onClick={() => navigate('/lead/review')} className="font-semibold text-[#1D63ED] hover:underline">
              Review Queue →
            </button>
          </div>
        </div>

        {/* Card 4: Cumulative Score */}
        <div className="surface-card p-5 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cumulative Score</div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-[#0A2540] tabular-nums">
                  {hasMarks && isMarksVisible ? `${totalMarks}/200` : '--/200'}
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

      {/* Mentor Summons Alert Banner (Only shown if active summons or request from mentor) */}
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
                <span className="text-xs text-slate-500 font-mono">
                  {new Date(activeSummons.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs font-bold text-[#0A2540] mt-1">
                {activeSummons.content || 'Your mentor has requested an in-person meeting with your team.'}
              </p>
              <p className="text-xs text-slate-500">Issued by {activeSummons.mentorName || mentorName}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/lead/meeting')}
            className="h-8 px-3.5 rounded-lg bg-[#BE123C] hover:bg-[#9F1239] text-white text-xs font-semibold shrink-0 transition-colors shadow-2xs"
          >
            Schedule Consultation Now →
          </button>
        </div>
      )}

      {/* 2-Column Desktop Grid (8 cols / 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left (8 cols): Recent Contributions Table */}
        <div className="lg:col-span-8 surface-card rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#D6E4EE] flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-bold text-[#0A2540]">Recent Team Contributions</h2>
              <p className="text-xs text-slate-500">Live feed of artifacts submitted by your team members</p>
            </div>
            <button
              onClick={() => navigate('/lead/review')}
              className="text-xs font-semibold text-[#1D63ED] hover:underline"
            >
              Review Submissions ({pendingContributions.length}) →
            </button>
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
                      No team contributions submitted yet.
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
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold font-mono ${
                              isVerified
                                ? 'bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0]'
                                : 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
                            }`}
                          >
                            {isVerified ? 'Verified ✓' : 'Pending Review'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right (4 cols): Mentor Feedback & Governance Shortcuts */}
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

          {/* Quick Lead Governance Shortcuts */}
          <div className="surface-card rounded-xl p-5 space-y-3">
            <h3 className="text-[14px] font-bold text-[#0A2540]">Lead Governance</h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/lead/meeting')}
                className="w-full p-3 rounded-xl border border-[#D6E4EE] hover:border-[#1D63ED] bg-slate-50/70 hover:bg-[#EFF6FF]/50 flex items-center justify-between text-left transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-[#0A2540]">Schedule Mentor Meeting</div>
                  <div className="text-[11px] text-slate-500">Book 30-min consultation slot</div>
                </div>
                <span className="text-xs font-bold text-[#1D63ED]">Open →</span>
              </button>

              <button
                onClick={() => navigate('/lead/recruit-students')}
                className="w-full p-3 rounded-xl border border-[#D6E4EE] hover:border-[#1D63ED] bg-slate-50/70 hover:bg-[#EFF6FF]/50 flex items-center justify-between text-left transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-[#0A2540]">Invite Candidates</div>
                  <div className="text-[11px] text-slate-500">Engineering candidates pool</div>
                </div>
                <span className="text-xs font-bold text-[#1D63ED]">Browse →</span>
              </button>

              <button
                onClick={() => navigate('/lead/join-requests')}
                className="w-full p-3 rounded-xl border border-[#D6E4EE] hover:border-[#1D63ED] bg-slate-50/70 hover:bg-[#EFF6FF]/50 flex items-center justify-between text-left transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-[#0A2540]">Review Join Requests</div>
                  <div className="text-[11px] text-slate-500">
                    {joinRequests.length} pending student request(s)
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] font-mono text-[11px] font-bold">
                  {joinRequests.length}
                </span>
              </button>
            </div>
          </div>

          {/* Authentic RVCE Academic Marks Breakdown */}
          {isMarksVisible && (
            <StudentAcademicMarksCard
              evaluations={evaluations}
              isMarksVisible={isMarksVisible}
              loading={loading}
            />
          )}

          {/* Lead-Editable Project Objectives Checklist */}
          {team && (
            <ObjectivesChecklistWidget
              team={team}
              isLeader={true}
              onUpdated={loadData}
              compact
            />
          )}
        </div>
      </div>
    </div>
  );
};
