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
  Send,
  Plus,
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
import { ObjectivesChecklistWidget } from '../../components/dashboard/ObjectivesChecklistWidget';
import { TeamReportSubmissionCard } from '../../components/common/TeamReportSubmissionCard';
import { MentorGanttChart } from './MentorGanttChart';
import { CohortMarksDialog } from './CohortMarksDialog';
import { IndividualMemberMarksDialog } from './IndividualMemberMarksDialog';

interface MeetingLog {
  id: number;
  date: string;
  remarks: string;
  attendance: Record<string, boolean>;
}

export const TeamInformationView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const teamIdParam = searchParams.get('teamId');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const teamId = teamIdParam ? parseInt(teamIdParam, 10) : null;

  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'ledger' | 'gantt'>('overview');
  const [team, setTeam] = useState<TeamModel | null>(null);
  const [members, setMembers] = useState<ProfileModel[]>([]);
  const [contributions, setContributions] = useState<ContributionModel[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackModel[]>([]);
  const [evaluations, setEvaluations] = useState<TeamEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const [abstractExpanded, setAbstractExpanded] = useState(false);
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'date' | 'usn'>('all');

  // Directives form
  const [newDirectiveType, setNewDirectiveType] = useState('Feedback');
  const [newDirectiveText, setNewDirectiveText] = useState('');
  const [isSendingDirective, setIsSendingDirective] = useState(false);

  // Dialog states
  const [isCohortMarksOpen, setIsCohortMarksOpen] = useState(false);
  const [selectedMemberForMarks, setSelectedMemberForMarks] = useState<ProfileModel | null>(null);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  // Ledger state (starts empty; populated by mentor logs)
  const [meetings, setMeetings] = useState<MeetingLog[]>([]);

  const [isLogMeetingModalOpen, setIsLogMeetingModalOpen] = useState(false);
  const [newMeetingDate, setNewMeetingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newMeetingRemarks, setNewMeetingRemarks] = useState('');
  const [newMeetingAttendance, setNewMeetingAttendance] = useState<Record<string, boolean>>({});

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

      // Initialize default attendance for roster
      if (roster.length > 0) {
        setMeetings((prev) =>
          prev.map((m) => {
            const att: Record<string, boolean> = {};
            roster.forEach((mem) => {
              att[mem.usn || mem.fullName] = true;
            });
            return { ...m, attendance: { ...att, ...m.attendance } };
          })
        );
      }
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

  const handleSendDirective = async () => {
    if (!newDirectiveText.trim()) {
      showToast('Please enter directive or feedback content', 'error');
      return;
    }
    if (!team || !user) return;

    setIsSendingDirective(true);
    try {
      await FeedbackService.createFeedback({
        teamId: team.id,
        mentorId: user.id,
        comment: newDirectiveText.trim(),
        directiveType: newDirectiveType,
      });

      showToast('Directive sent to team lead and roster! 📢', 'success');
      setNewDirectiveText('');
      const updated = await FeedbackService.fetchTeamFeedback(team.id);
      setFeedbackList(updated);
    } catch (e: any) {
      showToast(e?.message || 'Failed to submit directive', 'error');
    } finally {
      setIsSendingDirective(false);
    }
  };

  const toggleAttendance = (meetingId: number, memberKey: string) => {
    setMeetings((prev) =>
      prev.map((m) => {
        if (m.id !== meetingId) return m;
        return {
          ...m,
          attendance: {
            ...m.attendance,
            [memberKey]: !m.attendance[memberKey],
          },
        };
      })
    );
    showToast('Attendance updated', 'info');
  };

  const handleSaveMeetingNotes = (meetingId: number, notes: string) => {
    setMeetings((prev) =>
      prev.map((m) => (m.id === meetingId ? { ...m, remarks: notes } : m))
    );
    showToast('Meeting notes updated and saved', 'success');
  };

  const handleCreateMeetingLog = () => {
    if (!newMeetingRemarks.trim()) {
      showToast('Please enter meeting agenda / mentor remarks', 'error');
      return;
    }
    const newLog: MeetingLog = {
      id: meetings.length + 1,
      date: newMeetingDate,
      remarks: newMeetingRemarks.trim(),
      attendance: { ...newMeetingAttendance },
    };
    setMeetings((prev) => [newLog, ...prev]);
    setIsLogMeetingModalOpen(false);
    setNewMeetingRemarks('');
    showToast('New meeting entry logged into ledger!', 'success');
  };

  if (!teamId || (!loading && !team)) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-slate-500 text-sm">Team not found or invalid team ID.</p>
        <button
          onClick={() => navigate('/mentor/dashboard')}
          className="h-9 px-4 rounded-lg bg-[#1D63ED] text-white text-xs font-semibold hover:bg-[#1752C9] transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (loading || !team) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-24 text-center space-y-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1D63ED]" />
        <div className="text-sm font-medium">Loading team workspace...</div>
      </div>
    );
  }

  const verifiedContributions = contributions.filter((c) => c.status === 'CONFIRMED');

  const p1Score = 38;
  const p2Score = 84;
  const p3Score = null;
  const totalEarned = p1Score + p2Score;
  const maxTotal = 200;

  const deliverables = [
    { title: 'Project Synopsis & Scope Document', phase: 'Phase 1', uploaded: true, format: 'PDF', date: '14 Nov 2026' },
    { title: 'Architectural Blueprint & Dataflow Diagram', phase: 'Phase 2', uploaded: true, format: 'PDF', date: '18 Nov 2026' },
    { title: 'Simulation Test Bench & Validation Suite', phase: 'Phase 2', uploaded: true, format: 'PDF', date: '20 Nov 2026' },
    { title: 'Final Comprehensive Project Defense Thesis', phase: 'Phase 3', uploaded: false, format: 'PDF', date: 'Pending' },
  ];

  const sortedContributions = [...verifiedContributions];
  if (submissionFilter === 'date') {
    sortedContributions.sort(
      (a, b) =>
        new Date(b.created_at || b.createdAt || 0).getTime() -
        new Date(a.created_at || a.createdAt || 0).getTime()
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Top Workspace Header */}
      <div className="surface-card rounded-xl px-5 pt-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => navigate('/mentor/dashboard')}
                className="h-8 px-3 rounded-lg border border-[#D6E4EE] bg-white hover:bg-slate-50 text-[#0A2540] text-xs font-semibold inline-flex items-center gap-1 transition-colors"
              >
                <span>← Assigned Teams</span>
              </button>
              <span className="px-2.5 py-0.5 rounded-md bg-[#EFF6FF] text-[#1D63ED] border border-[#BFDBFE] text-xs font-semibold">
                Track: {team.theme || 'Artificial Intelligence'}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
                Branch: {team.branch || 'CSE'}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0] text-xs font-semibold">
                Verified Only
              </span>
            </div>
            <div className="pt-1">
              <h1 className="text-xl font-bold text-[#0A2540] tracking-tight">{team.teamName}</h1>
              <p className="text-[13px] text-slate-600 font-medium mt-0.5">{team.projectTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/mentor/queue-monitor')}
              className="h-9 px-3.5 rounded-lg border border-[#D6E4EE] bg-white hover:bg-slate-50 text-[#0A2540] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-[#1D63ED]" />
              <span>Schedule Review</span>
            </button>
          </div>
        </div>

        {/* Horizontal Desktop Underline Navigation */}
        <div className="flex items-center gap-6 border-t border-slate-100 -mb-px overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 text-[13px] whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-[#1D63ED] text-[#1D63ED] font-bold'
                : 'border-transparent text-slate-500 hover:text-[#0A2540] font-medium'
            }`}
          >
            1. Overview &amp; Evaluation
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`py-3 text-[13px] whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'submissions'
                ? 'border-[#1D63ED] text-[#1D63ED] font-bold'
                : 'border-transparent text-slate-500 hover:text-[#0A2540] font-medium'
            }`}
          >
            2. Submissions &amp; Directives ({verifiedContributions.length})
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`py-3 text-[13px] whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'ledger'
                ? 'border-[#1D63ED] text-[#1D63ED] font-bold'
                : 'border-transparent text-slate-500 hover:text-[#0A2540] font-medium'
            }`}
          >
            3. Entry Ledger ({meetings.length})
          </button>
          <button
            onClick={() => setActiveTab('gantt')}
            className={`py-3 text-[13px] whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'gantt'
                ? 'border-[#1D63ED] text-[#1D63ED] font-bold'
                : 'border-transparent text-slate-500 hover:text-[#0A2540] font-medium'
            }`}
          >
            4. Phase Gantt Timeline
          </button>
        </div>
      </div>

      {/* ── TAB 1: OVERVIEW & EVALUATION ── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Official RVCE Team Reports */}
          {team && (
            <TeamReportSubmissionCard
              team={team}
              isLeader={false}
            />
          )}
          {/* 2-Column Desktop Grid (7 cols / 5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column (7 cols): Abstract & Deliverables */}
            <div className="lg:col-span-7 space-y-5">
              {/* Project Abstract & Objectives Card */}
              <div className="surface-card rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Project Abstract &amp; Objectives
                  </div>
                  <button
                    onClick={() => setAbstractExpanded(!abstractExpanded)}
                    className="text-xs font-semibold text-[#1D63ED] hover:underline"
                  >
                    {abstractExpanded ? 'Show Compact' : 'Expand Details'}
                  </button>
                </div>

                <p className="text-[13px] text-slate-700 leading-relaxed">
                  {team.projectGist ||
                    'Sentinel X is an AI-driven intrusion detection and threat investigation framework that ingests high-volume network flow data to classify benign traffic from complex cyber attacks across binary and multi-class domains. Pairing leak-free pre-processing with explainable AI.'}
                </p>

                {/* Interactive Objectives Checklist (Synced) */}
                <div className="pt-3 border-t border-slate-100">
                  <ObjectivesChecklistWidget team={team} isLeader={false} />
                </div>
              </div>

              {/* Project Reports & Deliverables Card */}
              <div className="surface-card rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[14px] font-bold text-[#0A2540]">Project Reports &amp; Deliverables</h3>
                    <p className="text-xs text-slate-500">Formal milestone PDF submissions for institutional compliance</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono font-semibold">
                    3/4 Uploaded
                  </span>
                </div>

                <div className="divide-y divide-slate-100 border border-[#D6E4EE] rounded-xl overflow-hidden">
                  {deliverables.map((doc, idx) => (
                    <div key={idx} className="p-3.5 bg-white flex items-center justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[13px] text-[#0A2540] truncate">{doc.title}</span>
                          <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D63ED] text-[10px] font-bold font-mono">
                            {doc.phase}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          Format: {doc.format} • {doc.date}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {doc.uploaded ? (
                          <span className="px-2.5 py-0.5 rounded-md bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0] text-xs font-semibold">
                            Verified ✓
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] text-xs font-semibold">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): 3-Phase CIE Marks Breakdown & Mentorship Supervision */}
            <div className="lg:col-span-5 space-y-5">
              {/* 3-Phase CIE Academic Marks Breakdown */}
              <div className="surface-card rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[14px] font-bold text-[#0A2540]">CIE Marks Breakdown</h3>
                    <p className="text-xs text-slate-500">Continuous Internal Evaluation (Max 200 pts)</p>
                  </div>
                  <button
                    onClick={() => setIsCohortMarksOpen(true)}
                    className="h-8 px-3 rounded-lg bg-[#0F4C81] hover:bg-[#1D63ED] text-white text-xs font-semibold transition-colors"
                  >
                    Update Marks
                  </button>
                </div>

                {/* Score Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Total Progress</span>
                    <span className="font-mono text-[#1D63ED] font-bold">{totalEarned} / {maxTotal} ({Math.round((totalEarned / maxTotal) * 100)}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1D63ED]"
                      style={{ width: `${(totalEarned / maxTotal) * 100}%` }}
                    />
                  </div>
                </div>

                {/* 3 Phases Detailed Cards */}
                <div className="space-y-2.5">
                  <div className="p-3 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5]/50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#0A2540]">Phase 1: Synopsis &amp; Problem Scope</div>
                      <div className="text-[11px] text-slate-500">Evaluated on Nov 14, 2026</div>
                    </div>
                    <span className="font-mono font-bold text-sm text-[#15803D]">{p1Score}/40</span>
                  </div>

                  <div className="p-3 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5]/50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#0A2540]">Phase 2: Architectural Defense &amp; Demo</div>
                      <div className="text-[11px] text-slate-500">Evaluated on Nov 20, 2026</div>
                    </div>
                    <span className="font-mono font-bold text-sm text-[#15803D]">{p2Score}/100</span>
                  </div>

                  <div className="p-3 rounded-lg border border-[#FDE68A] bg-[#FFFBEB]/50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#0A2540]">Phase 3: Final Defense &amp; Viva</div>
                      <div className="text-[11px] text-slate-500">Scheduled for Semester End</div>
                    </div>
                    <span className="font-mono font-semibold text-xs text-[#B45309]">Pending / 60</span>
                  </div>
                </div>
              </div>

              {/* Mentorship Status Card */}
              <div className="surface-card rounded-xl p-5 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-[13.5px] font-bold text-[#0A2540]">Active Mentorship Under Your Supervision</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Release team back to the unassigned cohort pool</p>
                </div>
                <button
                  onClick={() => setIsReleaseModalOpen(true)}
                  className="h-9 px-3.5 rounded-lg border border-[#FECDD3] bg-[#FFF1F2] hover:bg-rose-100 text-[#BE123C] text-xs font-semibold shrink-0 transition-colors"
                >
                  Relinquish Team
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Full-Width Card: Team Members Roster */}
          <div className="surface-card rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#D6E4EE] flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-[#0A2540]">Team Members — {members.length || 4}</h3>
                <p className="text-xs text-slate-500">Individual CIE marks and verified contribution counts</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-[#D6E4EE] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-5">Student Name &amp; Role</th>
                    <th className="py-3 px-4">USN &amp; Branch</th>
                    <th className="py-3 px-4">Phase Breakdown</th>
                    <th className="py-3 px-4">Submissions</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EEF5] text-[13px]">
                  {members.map((m, idx) => {
                    const isLead = idx === 0 || m.role === 'TEAM_LEAD';
                    return (
                      <tr key={m.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#0A2540]">{m.fullName}</span>
                            {isLead && (
                              <span className="px-2 py-0.5 rounded bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] text-[10.5px] font-bold font-mono">
                                LEAD
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                          <strong className="text-slate-800">{m.usn || 'RVCE25AI042'}</strong> • {m.branch || 'CSE'}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <div className="flex items-center gap-1.5 flex-wrap text-xs">
                            {(() => {
                              const validEvals = evaluations.filter(
                                (e) => e.phaseName && !e.phaseName.startsWith('__')
                              );
                              if (validEvals.length === 0) {
                                return (
                                  <span className="px-2 py-0.5 rounded bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] font-semibold">
                                    Pending Evaluation
                                  </span>
                                );
                              }
                              return validEvals.slice(0, 3).map((ev) => {
                                const score =
                                  ev.memberMarks?.[m.id] ??
                                  (m.usn ? ev.memberMarks?.[m.usn] : undefined) ??
                                  ev.totalMarks;
                                return (
                                  <span
                                    key={ev.id}
                                    className="px-2 py-0.5 rounded bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0] font-semibold"
                                  >
                                    {ev.phaseName}: {score ?? '—'}/{ev.maxMarks}
                                  </span>
                                );
                              });
                            })()}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <button
                            onClick={() => setActiveTab('submissions')}
                            className="font-semibold text-[#1D63ED] hover:underline font-mono"
                          >
                            {
                              contributions.filter(
                                (c) =>
                                  c.authorId === m.id ||
                                  c.author_id === m.id ||
                                  c.student_id === m.id
                              ).length
                            }{' '}
                            Submissions
                          </button>
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedMemberForMarks(m)}
                            className="h-8 px-3 rounded-lg border border-[#D6E4EE] bg-white hover:bg-[#EFF6FF] hover:text-[#1D63ED] hover:border-[#BFDBFE] text-[#0A2540] text-xs font-semibold transition-colors"
                          >
                            Upload Marks
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: SUBMISSIONS & DIRECTIVES ── */}
      {activeTab === 'submissions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left (7 cols): Verified Contributions Feed */}
          <div className="lg:col-span-7 surface-card rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-[14px] font-bold text-[#0A2540]">Verified Contributions</h2>
                <span className="px-2.5 py-0.5 rounded-md bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0] text-[11px] font-bold font-mono">
                  VERIFIED ONLY
                </span>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSubmissionFilter('all')}
                className={`h-8 px-3.5 rounded-lg text-xs font-bold transition-colors ${
                  submissionFilter === 'all'
                    ? 'bg-[#1D63ED] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({verifiedContributions.length})
              </button>
              <button
                onClick={() => setSubmissionFilter('date')}
                className={`h-8 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                  submissionFilter === 'date'
                    ? 'border-[#1D63ED] bg-[#EFF6FF] text-[#1D63ED]'
                    : 'border-[#D6E4EE] bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Upload Date
              </button>
            </div>

            {sortedContributions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D6E4EE] bg-slate-50/70 py-14 px-6 text-center space-y-1.5">
                <p className="text-[13.5px] font-semibold text-[#0A2540]">No verified contributions yet</p>
                <p className="text-xs text-slate-500">Student verified submissions for this team will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E6EEF5] border border-[#D6E4EE] rounded-xl overflow-hidden">
                {sortedContributions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-4 bg-white hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D63ED] text-[11px] font-semibold font-mono">
                          {sub.contribution_type || 'Code & Tests'}
                        </span>
                        <span className="text-[13.5px] font-bold text-[#0A2540] truncate">{sub.title}</span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        By <strong className="text-slate-700">{sub.author_name || 'Team Member'}</strong> • {new Date(sub.created_at || sub.createdAt || Date.now()).toLocaleDateString()}
                      </div>
                      {sub.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 mt-1">{sub.description}</p>
                      )}
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0] text-xs font-semibold shrink-0">
                      Verified ✓
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right (5 cols): Official Faculty Directives & Remarks */}
          <div className="lg:col-span-5 surface-card rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-[14px] font-bold text-[#0A2540]">Directives &amp; Mentor Guidance</h3>
              <p className="text-xs text-slate-500">Issue official guidance visible to all team members</p>
            </div>

            {/* Directive Input Form */}
            <div className="space-y-3 p-3.5 rounded-xl border border-[#D6E4EE] bg-slate-50/60">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-[#0A2540]">New Directive</label>
                <select
                  value={newDirectiveType}
                  onChange={(e) => setNewDirectiveType(e.target.value)}
                  className="h-7 px-2 rounded-md border border-[#D6E4EE] bg-white text-[11px] font-semibold text-[#0A2540]"
                >
                  <option value="Feedback">Feedback</option>
                  <option value="Correction">Correction Required</option>
                  <option value="Milestone Directive">Milestone Directive</option>
                </select>
              </div>
              <textarea
                rows={3}
                value={newDirectiveText}
                onChange={(e) => setNewDirectiveText(e.target.value)}
                placeholder="Enter feedback or directives for next sprint..."
                className="w-full p-2.5 rounded-lg border border-[#D6E4EE] bg-white text-xs text-[#0A2540] outline-none focus:border-[#1D63ED]"
              />
              <button
                type="button"
                disabled={isSendingDirective}
                onClick={handleSendDirective}
                className="w-full h-8 rounded-lg bg-[#1D63ED] hover:bg-[#1752C9] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSendingDirective ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send Directive</span>
              </button>
            </div>

            {/* Past Directives Feed */}
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {feedbackList.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  No directives logged yet.
                </div>
              ) : (
                feedbackList.map((f) => (
                  <div key={f.id} className="p-3.5 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF]/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1D63ED] text-white font-mono">
                        {f.directiveType || 'Directive'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed pt-1">{f.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: ENTRY LEDGER ── */}
      {activeTab === 'ledger' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-[#0A2540]">Official Attendance &amp; Meeting Ledger</h2>
              <p className="text-xs text-slate-500">Continuous institutional record of mentor meetings and attendance.</p>
            </div>
            <button
              onClick={() => setIsLogMeetingModalOpen(true)}
              className="h-9 px-3.5 rounded-lg bg-[#1D63ED] hover:bg-[#1752C9] text-white text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Log New Meeting</span>
            </button>
          </div>

          <div className="space-y-4">
            {meetings.map((mtg) => {
              const presentCount = Object.values(mtg.attendance).filter(Boolean).length;
              const totalCount = members.length || 4;
              const allPresent = presentCount === totalCount;

              return (
                <div key={mtg.id} className="surface-card rounded-xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#EFF6FF] text-[#1D63ED] border border-[#BFDBFE] text-xs font-bold font-mono">
                        Meeting #{mtg.id}
                      </span>
                      <span className="text-[13.5px] font-bold text-[#0A2540]">{mtg.date}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                          allPresent
                            ? 'bg-[#ECFDF5] text-[#15803D] border-[#A7F3D0]'
                            : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                        }`}
                      >
                        {allPresent ? 'All present' : `${presentCount}/${totalCount} present`}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Mentor Remarks & Agenda Textarea */}
                    <div className="lg:col-span-7 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-[#1D63ED]">
                          Mentor Remarks &amp; Agenda
                        </label>
                        <button
                          onClick={() => {
                            const val = (document.getElementById(`ledger-remarks-${mtg.id}`) as HTMLTextAreaElement)?.value;
                            handleSaveMeetingNotes(mtg.id, val || mtg.remarks);
                          }}
                          className="h-7 px-3 rounded-lg bg-[#0A2540] hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                        >
                          Save Notes
                        </button>
                      </div>
                      <textarea
                        id={`ledger-remarks-${mtg.id}`}
                        defaultValue={mtg.remarks}
                        rows={4}
                        className="w-full p-3.5 rounded-xl border border-[#D6E4EE] bg-[#EFF6FF]/35 focus:bg-white focus:border-[#1D63ED] text-[13px] text-[#0A2540] leading-relaxed outline-none"
                      />
                    </div>

                    {/* Attendance with Interactive Switches */}
                    <div className="lg:col-span-5 space-y-2.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Recorded Attendance ({presentCount}/{totalCount})
                      </div>
                      <div className="divide-y divide-slate-100 border border-[#D6E4EE] rounded-xl overflow-hidden">
                        {(members.length > 0 ? members : [{ fullName: 'Jairaj S', usn: 'RVCE25AI042' }]).map((m, idx) => {
                          const key = m.usn || m.fullName || `member-${idx}`;
                          const isPresent = mtg.attendance[key] ?? true;

                          return (
                            <div key={idx} className="px-4 py-2.5 bg-white flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-[13px] font-semibold text-[#0A2540] truncate">{m.fullName}</div>
                                <div className="text-xs text-slate-500 font-mono">{m.usn || 'RVCE25AI042'}</div>
                              </div>
                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className={`text-xs font-semibold ${isPresent ? 'text-[#15803D]' : 'text-[#BE123C]'}`}>
                                  {isPresent ? 'Present' : 'Absent'}
                                </span>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={isPresent}
                                  onClick={() => toggleAttendance(mtg.id, key)}
                                  className={`w-10 h-5 rounded-full p-0.5 flex items-center cursor-pointer transition-colors ${
                                    isPresent ? 'bg-[#15803D]' : 'bg-slate-300'
                                  }`}
                                >
                                  <span
                                    className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                                      isPresent ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 4: PHASE GANTT TIMELINE ── */}
      {activeTab === 'gantt' && team && (
        <div className="surface-card rounded-xl p-5">
          <MentorGanttChart
            singleTeam={team}
            singleTeamMembers={members}
            singleTeamContributions={contributions}
          />
        </div>
      )}

      {/* Relinquish Team Confirmation Modal */}
      {isReleaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A2540]/40 backdrop-blur-[2px]">
          <div className="surface-card rounded-xl max-w-md w-full overflow-hidden shadow-modal p-5 space-y-4">
            <h3 className="text-base font-bold text-[#0A2540]">Relinquish Team Mentorship?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to release <strong>{team.teamName}</strong>? The team will be returned to the unassigned cohort pool for reassignment.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsReleaseModalOpen(false)}
                className="h-8 px-3 rounded-lg border border-[#D6E4EE] text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={isReleasing}
                onClick={handleReleaseTeam}
                className="h-8 px-3 rounded-lg bg-[#BE123C] hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
              >
                {isReleasing ? 'Releasing...' : 'Confirm Relinquish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log New Meeting Modal */}
      {isLogMeetingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A2540]/40 backdrop-blur-[2px]">
          <div className="surface-card rounded-xl max-w-lg w-full overflow-hidden shadow-modal">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0A2540]">Log Consultation Meeting</h3>
              <button onClick={() => setIsLogMeetingModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Meeting Date</label>
                <input
                  type="date"
                  value={newMeetingDate}
                  onChange={(e) => setNewMeetingDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#D6E4EE] bg-white text-xs text-[#0A2540]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Agenda &amp; Remarks *</label>
                <textarea
                  rows={4}
                  value={newMeetingRemarks}
                  onChange={(e) => setNewMeetingRemarks(e.target.value)}
                  placeholder="Summarize discussed milestones, rubrics, and action items..."
                  className="w-full p-3 rounded-lg border border-[#D6E4EE] bg-white text-xs text-[#0A2540] outline-none focus:border-[#1D63ED]"
                />
              </div>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                onClick={() => setIsLogMeetingModalOpen(false)}
                className="h-8 px-3 rounded-lg border border-[#D6E4EE] bg-white text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMeetingLog}
                className="h-8 px-4 rounded-lg bg-[#1D63ED] text-white text-xs font-semibold hover:bg-[#1752C9]"
              >
                Save to Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cohort Marks Dialog */}
      {isCohortMarksOpen && (
        <CohortMarksDialog
          isOpen={isCohortMarksOpen}
          onClose={() => setIsCohortMarksOpen(false)}
          team={team}
          members={members}
          evaluations={evaluations}
          onSaved={() => {
            loadAllData();
            setIsCohortMarksOpen(false);
          }}
        />
      )}

      {/* Individual Member Marks Dialog */}
      {selectedMemberForMarks && team && (
        <IndividualMemberMarksDialog
          isOpen={Boolean(selectedMemberForMarks)}
          onClose={() => setSelectedMemberForMarks(null)}
          member={selectedMemberForMarks}
          team={team}
          evaluations={evaluations}
          onSaved={() => {
            loadAllData();
            setSelectedMemberForMarks(null);
          }}
        />
      )}
    </div>
  );
};
