import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  User,
  Users,
  Eye,
  Filter,
  Layers,
  ArrowRight,
  Sparkles,
  BarChart3,
  X,
  FileCheck,
} from 'lucide-react';
import {
  TeamModel,
  ProfileModel,
  ContributionModel,
  ContributionStatus,
  MilestoneModel,
} from '../../types';
import { StorageService } from '../../services/storage.service';
import { ContributionService } from '../../services/contribution.service';
import { TeamService } from '../../services/team.service';

interface Props {
  teams?: TeamModel[];
  selectedTeamId?: number;
  onSelectTeam?: (teamId: number) => void;
  // If embedded in team view with preloaded data
  singleTeam?: TeamModel;
  singleTeamMembers?: ProfileModel[];
  singleTeamContributions?: ContributionModel[];
}

export const MentorGanttChart: React.FC<Props> = ({
  teams = [],
  selectedTeamId,
  onSelectTeam,
  singleTeam,
  singleTeamMembers = [],
  singleTeamContributions,
}) => {
  // Determine active team
  const activeTeam = useMemo(() => {
    if (singleTeam) return singleTeam;
    if (selectedTeamId) return teams.find((t) => t.id === selectedTeamId) || teams[0];
    return teams[0] || null;
  }, [singleTeam, selectedTeamId, teams]);

  const [activeTeamId, setActiveTeamId] = useState<number | null>(activeTeam ? activeTeam.id : null);
  const [teamMembers, setTeamMembers] = useState<ProfileModel[]>(singleTeamMembers);
  const [contributions, setContributions] = useState<ContributionModel[]>(singleTeamContributions || []);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedContribution, setSelectedContribution] = useState<ContributionModel | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    if (activeTeam) {
      setActiveTeamId(activeTeam.id);
    }
  }, [activeTeam]);

  // Load team members and contributions if not preloaded
  useEffect(() => {
    if (singleTeamContributions && singleTeamMembers.length > 0) {
      setTeamMembers(singleTeamMembers);
      setContributions(singleTeamContributions);
      return;
    }

    if (!activeTeamId) return;

    let isMounted = true;
    setLoadingDetails(true);

    Promise.all([
      TeamService.fetchTeamMembers(activeTeamId),
      ContributionService.fetchForTeam(activeTeamId),
    ])
      .then(([mems, contribs]) => {
        if (isMounted) {
          setTeamMembers(mems);
          setContributions(contribs);
        }
      })
      .catch((err) => {
        console.error('Error loading team data for Gantt chart:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingDetails(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTeamId, singleTeamContributions, singleTeamMembers]);

  // Build canonical RVCE institutional milestones
  const milestones: MilestoneModel[] = useMemo(() => {
    if (!activeTeam) return [];

    const teamCreated = activeTeam.createdAt ? new Date(activeTeam.createdAt) : new Date(Date.now() - 60 * 86400000);
    const p1Start = new Date(teamCreated);
    const p1End = new Date(p1Start.getTime() + 25 * 86400000); // 25 days
    const p2Start = new Date(p1End.getTime() + 1 * 86400000);
    const p2End = new Date(p2Start.getTime() + 35 * 86400000); // 35 days
    const p3Start = new Date(p2End.getTime() + 1 * 86400000);
    const p3End = new Date(p3Start.getTime() + 30 * 86400000); // 30 days

    const now = new Date();

    // Map contributions to milestones based on phase keywords or dates
    const p1Contribs = contributions.filter((c) => {
      const lower = (c.title + ' ' + c.description).toLowerCase();
      if (lower.includes('phase 1') || lower.includes('synopsis') || lower.includes('literature') || lower.includes('problem')) {
        return true;
      }
      const cDate = c.createdAt ? new Date(c.createdAt) : new Date();
      return cDate <= p1End;
    });

    const p2Contribs = contributions.filter((c) => {
      const lower = (c.title + ' ' + c.description).toLowerCase();
      if (lower.includes('phase 2') || lower.includes('execution') || lower.includes('module') || lower.includes('partial')) {
        return true;
      }
      const cDate = c.createdAt ? new Date(c.createdAt) : new Date();
      return cDate > p1End && cDate <= p2End;
    });

    const p3Contribs = contributions.filter((c) => {
      const lower = (c.title + ' ' + c.description).toLowerCase();
      if (lower.includes('phase 3') || lower.includes('prototype') || lower.includes('report') || lower.includes('final')) {
        return true;
      }
      const cDate = c.createdAt ? new Date(c.createdAt) : new Date();
      return cDate > p2End;
    });

    const getStatus = (start: Date, end: Date, contribs: ContributionModel[]): MilestoneModel['status'] => {
      const confirmedCount = contribs.filter((c) => c.status === 'CONFIRMED').length;
      if (confirmedCount >= 2 && now > end) return 'COMPLETED';
      if (now > end && confirmedCount === 0) return 'OVERDUE';
      if (now >= start && now <= end) return 'IN_PROGRESS';
      if (now < start) return 'PENDING';
      return 'IN_PROGRESS';
    };

    return [
      {
        id: 'phase_1',
        phaseNumber: 1,
        title: 'Phase 1: Synopsis & Formulation',
        description: 'Problem Definition, Literature Review, Architecture & Scope (Max 40M)',
        weightPct: 20,
        plannedStartDate: p1Start.toISOString(),
        plannedEndDate: p1End.toISOString(),
        status: getStatus(p1Start, p1End, p1Contribs),
        contributions: p1Contribs,
      },
      {
        id: 'phase_2',
        phaseNumber: 2,
        title: 'Phase 2: Milestone Review',
        description: 'Project Execution, Implementation, Tools & Partial Results (Max 60M)',
        weightPct: 30,
        plannedStartDate: p2Start.toISOString(),
        plannedEndDate: p2End.toISOString(),
        status: getStatus(p2Start, p2End, p2Contribs),
        contributions: p2Contribs,
      },
      {
        id: 'phase_3',
        phaseNumber: 3,
        title: 'Phase 3: Final Demo & Evaluation',
        description: 'Prototype Demonstration, Results, Final Report & Presentation (Max 100M)',
        weightPct: 50,
        plannedStartDate: p3Start.toISOString(),
        plannedEndDate: p3End.toISOString(),
        status: getStatus(p3Start, p3End, p3Contribs),
        contributions: p3Contribs,
      },
    ];
  }, [activeTeam, contributions]);

  // Overall Verified Progress calculation based on weighted confirmed contributions
  const calculatedProgress = useMemo(() => {
    let weightedScore = 0;
    milestones.forEach((m) => {
      const confirmed = (m.contributions || []).filter((c) => c.status === 'CONFIRMED').length;
      // Cap at 100% per milestone
      const milestoneCompletion = Math.min(1.0, confirmed / 2.0); // 2 confirmed deliverables saturate milestone weight
      weightedScore += (m.weightPct * milestoneCompletion);
    });
    return Math.round(weightedScore);
  }, [milestones]);

  // Member-wise breakdown
  const memberContributionStats = useMemo(() => {
    const totalConfirmedAll = contributions.filter((c) => c.status === 'CONFIRMED').length;

    return teamMembers.map((member) => {
      const memberContribs = contributions.filter(
        (c) => c.authorId === member.id || c.studentUsn === member.usn || c.authorUsn === member.usn
      );
      const confirmed = memberContribs.filter((c) => c.status === 'CONFIRMED').length;
      const pending = memberContribs.filter((c) => c.status === 'PENDING').length;
      const rejected = memberContribs.filter((c) => c.status === 'REJECTED').length;

      const sharePct = totalConfirmedAll > 0 ? Math.round((confirmed / totalConfirmedAll) * 100) : 0;

      return {
        member,
        total: memberContribs.length,
        confirmed,
        pending,
        rejected,
        sharePct,
      };
    });
  }, [teamMembers, contributions]);

  const filteredContributions = useMemo(() => {
    if (filterStatus === 'ALL') return contributions;
    return contributions.filter((c) => c.status === filterStatus);
  }, [contributions, filterStatus]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  const getStatusBadge = (status: MilestoneModel['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
            <Clock className="w-3 h-3 animate-pulse" /> In Progress
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" /> Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full border border-white/5">
            Pending
          </span>
        );
    }
  };

  if (!activeTeam) {
    return (
      <div className="p-8 text-center rounded-2xl border border-white/10 bg-slate-900/60">
        <Users className="w-10 h-10 text-slate-500 mx-auto mb-2" />
        <h4 className="text-base font-bold text-white">No Assigned Teams</h4>
        <p className="text-xs text-slate-400">Claim or accept a team request to view project timeline tracking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Team Switcher */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-md p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                Gantt Timeline & Evidence Matrix
              </span>
              <span className="text-xs text-slate-400 font-semibold">• RVCE Experiential Learning</span>
            </div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              {activeTeam.teamName}
              <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-white/5">
                {activeTeam.teamCode}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              {activeTeam.projectTitle || activeTeam.projectGist || 'Continuous evaluation and milestone Gantt tracking.'}
            </p>
          </div>

          {/* Team Selector if multiple teams exist */}
          {teams.length > 1 && !singleTeam && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-medium">Switch Team:</label>
              <select
                value={activeTeamId || activeTeam.id}
                onChange={(e) => {
                  const tid = parseInt(e.target.value, 10);
                  setActiveTeamId(tid);
                  if (onSelectTeam) onSelectTeam(tid);
                }}
                className="bg-slate-800 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.teamName} ({t.teamCode})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* High-Level Progress Health Metric Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
          <div className="rounded-xl bg-slate-800/50 border border-white/5 p-3.5">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Verified Progress</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">{calculatedProgress}%</span>
              <span className="text-xs text-emerald-400 font-semibold">
                (Claimed: {activeTeam.currentProgressPct}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-700/60 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, calculatedProgress)}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl bg-slate-800/50 border border-white/5 p-3.5">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Submissions</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">{contributions.length}</span>
              <span className="text-xs text-slate-400 font-medium">Total logged</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-semibold">
              <span className="text-emerald-400">
                {contributions.filter((c) => c.status === 'CONFIRMED').length} Confirmed
              </span>
              <span>•</span>
              <span className="text-amber-400">
                {contributions.filter((c) => c.status === 'PENDING').length} Pending
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-800/50 border border-white/5 p-3.5">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Current Milestone</span>
            <div className="mt-1">
              <span className="text-sm font-bold text-indigo-300 line-clamp-1">
                {milestones.find((m) => m.status === 'IN_PROGRESS')?.title || 'Phase 3: Final Demo'}
              </span>
              <div className="mt-1.5">
                {getStatusBadge(milestones.find((m) => m.status === 'IN_PROGRESS')?.status || 'IN_PROGRESS')}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-800/50 border border-white/5 p-3.5">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Institutional Reports</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-black text-white">
                {activeTeam.reports?.length || 0}
              </span>
              <span className="text-xs text-slate-400">/ 2 slots</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {activeTeam.reports?.find((r) => r.slot === 'primary') ? '✅ Primary Report Available' : '⚠️ Primary Report Pending'}
            </p>
          </div>
        </div>
      </div>

      {/* Visual Gantt Chart Bars */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-md p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Milestone Timeline & Schedule</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Planned vs. Actual Deliverable Progress</span>
        </div>

        <div className="space-y-4">
          {milestones.map((m, idx) => {
            const confirmedCount = (m.contributions || []).filter((c) => c.status === 'CONFIRMED').length;
            const pendingCount = (m.contributions || []).filter((c) => c.status === 'PENDING').length;
            const completionPct = Math.min(100, Math.round((confirmedCount / 2) * 100));

            return (
              <div key={m.id} className="rounded-xl bg-slate-800/40 border border-white/5 p-4 transition hover:border-white/15">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {m.title}
                        <span className="text-[11px] text-slate-400 font-medium">
                          (Weight: {m.weightPct}%)
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400">{m.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      {formatDate(m.plannedStartDate)} → {formatDate(m.plannedEndDate)}
                    </span>
                    {getStatusBadge(m.status)}
                  </div>
                </div>

                {/* Gantt Bar Visualizer */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>
                      Evidence: {confirmedCount} Confirmed {pendingCount > 0 && `(${pendingCount} Pending)`}
                    </span>
                    <span className="font-bold text-slate-200">{completionPct}% Verified</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden border border-white/5 relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        m.status === 'COMPLETED'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-400'
                          : m.status === 'OVERDUE'
                          ? 'bg-gradient-to-r from-amber-600 to-rose-500'
                          : 'bg-gradient-to-r from-indigo-500 to-blue-400'
                      }`}
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                </div>

                {/* Associated Deliverables chips */}
                {m.contributions && m.contributions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-white/5">
                    {m.contributions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedContribution(c)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-700/60 border border-white/10 text-xs text-slate-300 hover:text-white transition group"
                      >
                        <FileText className="w-3 h-3 text-indigo-400 group-hover:text-indigo-300" />
                        <span className="truncate max-w-[150px] font-medium">{c.title}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            c.status === 'CONFIRMED'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : c.status === 'PENDING'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {c.status}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Individual Member Contribution Share Breakdown */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-md p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-white">Individual Member Contribution Share</h3>
              <p className="text-xs text-slate-400">
                Peer accountability matrix distinguishing individual share from overall team completion
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {memberContributionStats.map(({ member, total, confirmed, pending, rejected, sharePct }) => (
            <div
              key={member.id}
              className="rounded-xl bg-slate-800/40 border border-white/5 p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {member.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold text-white truncate">{member.fullName}</h5>
                    <p className="text-[11px] text-slate-400 truncate">
                      {member.usn ? `USN: ${member.usn}` : member.email}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 mt-3 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Contribution Share:</span>
                    <span className="font-bold text-indigo-400">{sharePct}% of Verified Work</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${Math.min(100, sharePct)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5 text-[11px] text-slate-400">
                <span className="text-emerald-400 font-semibold">{confirmed} Confirmed</span>
                <span className="text-amber-400 font-semibold">{pending} Pending</span>
                <span className="text-rose-400 font-semibold">{rejected} Rejected</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deliverable Evidence Inspection Drawer / Modal */}
      {selectedContribution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedContribution(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  selectedContribution.status === 'CONFIRMED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : selectedContribution.status === 'PENDING'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {selectedContribution.status}
              </span>
              <span className="text-xs text-slate-400">
                Submitted {formatDate(selectedContribution.createdAt || new Date().toISOString())}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white mb-2">{selectedContribution.title}</h3>

            <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 bg-slate-800/40 p-2.5 rounded-xl border border-white/5">
              <User className="w-4 h-4 text-indigo-400" />
              <span>
                Author: <strong>{selectedContribution.authorName || selectedContribution.studentName || 'Student'}</strong>
                {selectedContribution.authorUsn && ` (${selectedContribution.authorUsn})`}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Description & Scope</label>
                <div className="text-xs text-slate-300 bg-slate-800/60 p-3 rounded-xl border border-white/5 whitespace-pre-wrap leading-relaxed">
                  {selectedContribution.description || 'No detailed description provided.'}
                </div>
              </div>

              {/* Uploaded Evidence Files */}
              {selectedContribution.files && selectedContribution.files.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Attached Deliverable Files ({selectedContribution.files.length})
                  </label>
                  <div className="space-y-2">
                    {selectedContribution.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-white/5 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span className="text-white font-medium truncate">{file.fileName}</span>
                          <span className="text-slate-400 text-[10px]">
                            ({(file.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const url = await StorageService.getProofSignedUrl(file.storagePath);
                              window.open(url, '_blank', 'noopener,noreferrer');
                            } catch (e: any) {
                              alert(e.message || 'Could not open file.');
                            }
                          }}
                          className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 transition"
                        >
                          <Eye className="w-3 h-3" /> Preview
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* External Links */}
              {selectedContribution.links && selectedContribution.links.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">External Resource Links</label>
                  <div className="space-y-1.5">
                    {selectedContribution.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 p-2 rounded-xl border border-blue-500/20 truncate transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{link}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedContribution(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
