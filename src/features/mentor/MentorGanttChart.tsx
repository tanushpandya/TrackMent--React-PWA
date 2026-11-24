import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  ExternalLink,
  Users,
  Eye,
  X,
  User,
  Layers,
  Sparkles,
  ChevronRight,
  TrendingUp,
  FileCheck,
  Check,
  RotateCcw,
  Loader2,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import {
  TeamModel,
  ProfileModel,
  ContributionModel,
  MilestoneModel,
} from '../../types';
import { StorageService } from '../../services/storage.service';
import { ContributionService } from '../../services/contribution.service';
import { TeamService } from '../../services/team.service';
import { AppCard } from '../../components/common/AppCard';
import { SecurePdfViewerModal } from '../../components/common/SecurePdfViewerModal';

// Bounded O(1) date formatter with India Standard Time context
const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const dateCache = new Map<string, string>();

function formatDate(iso: string): string {
  if (!iso) return 'Date Not Set';
  const cached = dateCache.get(iso);
  if (cached) return cached;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Invalid Date';
    const formatted = dateFormatter.format(d);
    if (dateCache.size < 500) {
      dateCache.set(iso, formatted);
    }
    return formatted;
  } catch {
    return iso;
  }
}

export type PhaseNumber = 1 | 2 | 3;

// Unambiguous Phase Word Boundary Patterns
const P3_REGEX = /\b(phase\s*3|phase\s*iii|p3|final\s*demo|final\s*prototype|final\s*evaluation|final\s*report|final\s*presentation)\b/i;
const P2_REGEX = /\b(phase\s*2|phase\s*ii|p2|milestone\s*review|midterm(\s*review)?|mid-term|partial\s*results?|core\s*implementation)\b/i;
const P1_REGEX = /\b(phase\s*1|phase\s*i|p1|synopsis|literature\s*survey|problem\s*formulation|problem\s*definition|system\s*architecture\s*spec)\b/i;

export interface ClassifiedDeliverable {
  contribution: ContributionModel;
  phase: PhaseNumber;
  reason: 'EXPLICIT_PROPERTY' | 'LABEL' | 'DATE_WINDOW' | 'UNASSIGNED';
  isAmbiguous: boolean;
  ambiguityReason?: string;
}

/**
 * Classifies a submission into Phase 1, Phase 2, or Phase 3.
 * Prioritizes:
 * 1. Explicit submission property if stored.
 * 2. Unambiguous phase labels (Phase 3 -> Phase 2 -> Phase 1).
 * 3. Date window fallback if approved schedule exists.
 * 4. Surfaces ambiguous or unassigned records without corrupting metrics.
 */
export function classifyDeliverable(
  c: ContributionModel,
  p1End: Date | null,
  p2End: Date | null
): ClassifiedDeliverable {
  // 1. Explicit property stored on record
  const explicitPhase = (c as any).phase ?? (c as any).phaseNumber ?? (c as any).phase_number;
  if (explicitPhase === 1 || explicitPhase === 2 || explicitPhase === 3) {
    return {
      contribution: c,
      phase: explicitPhase as PhaseNumber,
      reason: 'EXPLICIT_PROPERTY',
      isAmbiguous: false,
    };
  }

  // 2. Unambiguous textual indicators in title and description
  const text = `${c.title || ''} ${c.description || ''}`;
  const isP3 = P3_REGEX.test(text);
  const isP2 = P2_REGEX.test(text);
  const isP1 = P1_REGEX.test(text);

  const matchCount = (isP1 ? 1 : 0) + (isP2 ? 1 : 0) + (isP3 ? 1 : 0);
  if (matchCount > 1) {
    // Conflicting labels present in same text
    const chosenPhase: PhaseNumber = isP3 ? 3 : isP2 ? 2 : 1;
    return {
      contribution: c,
      phase: chosenPhase,
      reason: 'LABEL',
      isAmbiguous: true,
      ambiguityReason: 'Contains conflicting milestone labels',
    };
  }

  if (isP3) {
    return { contribution: c, phase: 3, reason: 'LABEL', isAmbiguous: false };
  }
  if (isP2) {
    return { contribution: c, phase: 2, reason: 'LABEL', isAmbiguous: false };
  }
  if (isP1) {
    return { contribution: c, phase: 1, reason: 'LABEL', isAmbiguous: false };
  }

  // 3. Date window fallback when schedule dates exist
  if (p1End && p2End && c.createdAt) {
    const cTime = Date.parse(c.createdAt);
    if (!Number.isNaN(cTime)) {
      if (cTime <= p1End.getTime()) {
        return { contribution: c, phase: 1, reason: 'DATE_WINDOW', isAmbiguous: false };
      } else if (cTime <= p2End.getTime()) {
        return { contribution: c, phase: 2, reason: 'DATE_WINDOW', isAmbiguous: false };
      } else {
        return { contribution: c, phase: 3, reason: 'DATE_WINDOW', isAmbiguous: false };
      }
    }
  }

  // 4. Default fallback when no label or valid date exists
  return {
    contribution: c,
    phase: 1,
    reason: 'UNASSIGNED',
    isAmbiguous: true,
    ambiguityReason: 'No milestone label or valid submission date',
  };
}

interface Props {
  teams?: TeamModel[];
  selectedTeamId?: number;
  onSelectTeam?: (teamId: number) => void;
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
  // P0 Fix: Manage team selection through a single synchronized ID
  const [pdfPreviewFile, setPdfPreviewFile] = useState<{
    storagePath: string;
    fileName: string;
    submissionNumber: string | number;
  } | null>(null);
  const [internalTeamId, setInternalTeamId] = useState<number | null>(() => {
    if (singleTeam) return singleTeam.id;
    if (selectedTeamId !== undefined) return selectedTeamId;
    return teams[0]?.id || null;
  });

  // Effective selected team ID
  const activeTeamId = singleTeam ? singleTeam.id : (selectedTeamId ?? internalTeamId);

  // Derive the active team object from the effective active ID
  const activeTeam: TeamModel | null = useMemo(() => {
    if (singleTeam) return singleTeam;
    if (!activeTeamId && teams.length > 0) return teams[0];
    return teams.find((t) => t.id === activeTeamId) || teams[0] || null;
  }, [singleTeam, activeTeamId, teams]);

  const [teamMembers, setTeamMembers] = useState<ProfileModel[]>(singleTeamMembers);
  const [contributions, setContributions] = useState<ContributionModel[]>(singleTeamContributions || []);
  const [loadedTeamId, setLoadedTeamId] = useState<number | null>(
    singleTeam ? singleTeam.id : singleTeamContributions ? activeTeamId : null
  );
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Deliverable modal inspection state & accessibility refs
  const [selectedContribution, setSelectedContribution] = useState<ContributionModel | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const modalCloseButtonRef = useRef<HTMLButtonElement | null>(null);

  // Request sequencing token to prevent out-of-order race conditions on rapid team switching
  const fetchRequestIdRef = useRef<number>(0);

  // Switch team handler
  const handleTeamSwitch = useCallback(
    (newTeamId: number) => {
      // Clear open dialog immediately when team changes
      setSelectedContribution(null);
      setInternalTeamId(newTeamId);
      if (onSelectTeam) {
        onSelectTeam(newTeamId);
      }
    },
    [onSelectTeam]
  );

  // Load team data whenever activeTeamId changes
  const loadDataForActiveTeam = useCallback(() => {
    if (singleTeamContributions && singleTeamMembers.length > 0 && singleTeam) {
      setTeamMembers(singleTeamMembers);
      setContributions(singleTeamContributions);
      setLoadedTeamId(singleTeam.id);
      setLoadingDetails(false);
      setLoadError(null);
      return;
    }

    if (!activeTeam) return;

    const currentRequestId = ++fetchRequestIdRef.current;
    setLoadingDetails(true);
    setLoadError(null);

    Promise.all([
      TeamService.fetchTeamMembers(activeTeam.id),
      ContributionService.fetchForTeam(activeTeam.id),
    ])
      .then(([mems, contribs]) => {
        // Discard response if a newer team selection was triggered in the meantime
        if (fetchRequestIdRef.current === currentRequestId) {
          setTeamMembers(mems);
          setContributions(contribs);
          setLoadedTeamId(activeTeam.id);
          setLoadingDetails(false);
        }
      })
      .catch((err: any) => {
        if (fetchRequestIdRef.current === currentRequestId) {
          console.error('Error loading team data for timeline:', err);
          setLoadError(err?.message || 'Failed to load team deliverables and roster.');
          setLoadingDetails(false);
        }
      });
  }, [activeTeam, singleTeam, singleTeamMembers, singleTeamContributions]);

  useEffect(() => {
    loadDataForActiveTeam();
  }, [loadDataForActiveTeam]);

  // Modal accessibility: Escape key listener and focus management
  useEffect(() => {
    if (!selectedContribution) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedContribution(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Move focus into the modal close button for accessibility
    setTimeout(() => {
      modalCloseButtonRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the trigger button when dialog closes
      triggerRef.current?.focus();
    };
  }, [selectedContribution]);

  // Institutional Milestone Calculation with Asia/Kolkata timezone and canonical academic calendar
  const { milestones, scheduleUnavailable, rawDeliverables } = useMemo(() => {
    if (!activeTeam) {
      return { milestones: [], scheduleUnavailable: true, rawDeliverables: [] };
    }

    // Canonical Institutional Calendar Schedule (RVCE Experiential Learning 2026)
    // Phase 1: 7th Sept 2026 to 30th Sept 2026
    // Phase 2: 1st Oct 2026 to 30th Oct 2026
    // Phase 3: 31st Oct 2026 to 3rd Dec 2026
    const p1Start = new Date('2026-09-07T00:00:00+05:30');
    const p1End = new Date('2026-09-30T23:59:59.999+05:30');
    const p2Start = new Date('2026-10-01T00:00:00+05:30');
    const p2End = new Date('2026-10-30T23:59:59.999+05:30');
    const p3Start = new Date('2026-10-31T00:00:00+05:30');
    const p3End = new Date('2026-12-03T23:59:59.999+05:30');
    const isScheduleAvailable = true;

    const p1Contribs: ContributionModel[] = [];
    const p2Contribs: ContributionModel[] = [];
    const p3Contribs: ContributionModel[] = [];
    const classifiedList: ClassifiedDeliverable[] = [];

    // Classify each contribution using prioritized unambiguous logic
    for (let i = 0; i < contributions.length; i++) {
      const c = contributions[i];
      const classified = classifyDeliverable(
        c,
        p1End,
        p2End
      );
      classifiedList.push(classified);

      if (classified.phase === 1) {
        p1Contribs.push(c);
      } else if (classified.phase === 2) {
        p2Contribs.push(c);
      } else {
        p3Contribs.push(c);
      }
    }

    const now = new Date();

    const derivePhaseStatus = (
      start: Date,
      end: Date,
      contribs: ContributionModel[]
    ): MilestoneModel['status'] => {
      let confirmedCount = 0;
      for (let j = 0; j < contribs.length; j++) {
        if (contribs[j].status === 'CONFIRMED') confirmedCount++;
      }

      if (!isScheduleAvailable) {
        return confirmedCount >= 2 ? 'COMPLETED' : 'IN_PROGRESS';
      }

      const nowTime = now.getTime();
      const endTime = end.getTime();
      const startTime = start.getTime();

      if (nowTime > endTime) {
        // Deadline passed
        return confirmedCount >= 2 ? 'COMPLETED' : 'OVERDUE';
      }
      if (nowTime >= startTime && nowTime <= endTime) {
        // Active calendar window
        return 'IN_PROGRESS';
      }
      if (nowTime < startTime) {
        return 'PENDING';
      }
      return 'IN_PROGRESS';
    };

    const milestoneList: MilestoneModel[] = [
      {
        id: 'phase_1',
        phaseNumber: 1,
        title: 'Phase 1: Synopsis & Formulation',
        description: 'Problem Definition, Literature Review, Architecture & Scope (Max 40M)',
        weightPct: 20,
        plannedStartDate: isScheduleAvailable ? p1Start.toISOString() : '',
        plannedEndDate: isScheduleAvailable ? p1End.toISOString() : '',
        status: derivePhaseStatus(p1Start, p1End, p1Contribs),
        contributions: p1Contribs,
      },
      {
        id: 'phase_2',
        phaseNumber: 2,
        title: 'Phase 2: Milestone Review',
        description: 'Project Execution, Implementation, Tools & Partial Results (Max 60M)',
        weightPct: 30,
        plannedStartDate: isScheduleAvailable ? p2Start.toISOString() : '',
        plannedEndDate: isScheduleAvailable ? p2End.toISOString() : '',
        status: derivePhaseStatus(p2Start, p2End, p2Contribs),
        contributions: p2Contribs,
      },
      {
        id: 'phase_3',
        phaseNumber: 3,
        title: 'Phase 3: Final Demo & Evaluation',
        description: 'Prototype Demonstration, Results, Final Report & Presentation (Max 100M)',
        weightPct: 50,
        plannedStartDate: isScheduleAvailable ? p3Start.toISOString() : '',
        plannedEndDate: isScheduleAvailable ? p3End.toISOString() : '',
        status: derivePhaseStatus(p3Start, p3End, p3Contribs),
        contributions: p3Contribs,
      },
    ];

    return {
      milestones: milestoneList,
      scheduleUnavailable: !isScheduleAvailable,
      rawDeliverables: classifiedList,
    };
  }, [activeTeam, contributions]);

  // Derived progress percentage strictly based on verified evidence
  const calculatedProgress = useMemo(() => {
    let weightedScore = 0;
    milestones.forEach((m) => {
      let confirmed = 0;
      const list = m.contributions || [];
      for (let i = 0; i < list.length; i++) {
        if (list[i].status === 'CONFIRMED') confirmed++;
      }
      const milestoneCompletion = Math.min(1.0, confirmed / 2.0);
      weightedScore += m.weightPct * milestoneCompletion;
    });
    return Math.round(weightedScore);
  }, [milestones]);

  // P1 Fix: Dynamic Current Milestone Determination (Eliminates hardcoded Phase 2 fallback)
  const currentMilestoneSummary = useMemo(() => {
    if (milestones.length === 0) {
      return { title: 'Milestones Not Initialized', status: 'PENDING' as const, alertNote: null };
    }

    const allCompleted = milestones.every((m) => m.status === 'COMPLETED');
    if (allCompleted) {
      return { title: 'All Milestones Completed', status: 'COMPLETED' as const, alertNote: null };
    }

    // Check if any milestone is overdue
    const overdueMilestone = milestones.find((m) => m.status === 'OVERDUE');
    // Check if any milestone is in active window
    const inProgressMilestone = milestones.find((m) => m.status === 'IN_PROGRESS');
    // Check if any milestone is pending
    const pendingMilestone = milestones.find((m) => m.status === 'PENDING');

    if (inProgressMilestone) {
      const isPriorOverdue = overdueMilestone && overdueMilestone.phaseNumber < inProgressMilestone.phaseNumber;
      return {
        title: inProgressMilestone.title.split(':')[0],
        status: isPriorOverdue ? ('OVERDUE' as const) : ('IN_PROGRESS' as const),
        alertNote: isPriorOverdue ? `${overdueMilestone.title.split(':')[0]} Overdue` : null,
      };
    }

    if (overdueMilestone) {
      return {
        title: overdueMilestone.title.split(':')[0],
        status: 'OVERDUE' as const,
        alertNote: 'Deliverables Pending',
      };
    }

    if (pendingMilestone) {
      return {
        title: pendingMilestone.title.split(':')[0],
        status: 'PENDING' as const,
        alertNote: null,
      };
    }

    return {
      title: milestones[0].title.split(':')[0],
      status: milestones[0].status,
      alertNote: null,
    };
  }, [milestones]);

  // Optimized single-pass Map indexing O(N + M) for member contribution breakdown
  const memberContributionStats = useMemo(() => {
    let totalConfirmedAll = 0;
    const statsByMemberKey = new Map<string, { total: number; confirmed: number; pending: number; rejected: number }>();

    for (let i = 0; i < contributions.length; i++) {
      const c = contributions[i];
      const isConfirmed = c.status === 'CONFIRMED';
      const isPending = c.status === 'PENDING';
      const isRejected = c.status === 'REJECTED';

      if (isConfirmed) totalConfirmedAll++;

      const keys: string[] = [];
      if (c.authorId) keys.push(c.authorId);
      if (c.studentUsn) keys.push(c.studentUsn);
      if (c.authorUsn && c.authorUsn !== c.studentUsn) keys.push(c.authorUsn);

      for (let k = 0; k < keys.length; k++) {
        const key = keys[k];
        let record = statsByMemberKey.get(key);
        if (!record) {
          record = { total: 0, confirmed: 0, pending: 0, rejected: 0 };
          statsByMemberKey.set(key, record);
        }
        record.total++;
        if (isConfirmed) record.confirmed++;
        if (isPending) record.pending++;
        if (isRejected) record.rejected++;
      }
    }

    return teamMembers.map((member) => {
      const stats =
        statsByMemberKey.get(member.id) ||
        (member.usn ? statsByMemberKey.get(member.usn) : null) || {
          total: 0,
          confirmed: 0,
          pending: 0,
          rejected: 0,
        };

      const sharePct =
        totalConfirmedAll > 0 ? Math.round((stats.confirmed / totalConfirmedAll) * 100) : 0;

      return {
        member,
        ...stats,
        sharePct,
      };
    });
  }, [teamMembers, contributions]);

  const renderStatusBadge = (status: MilestoneModel['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: 20,
              background: '#ECFDF5',
              color: '#059669',
              border: '1px solid #A7F3D0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <CheckCircle2 size={12} /> Completed
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: 20,
              background: '#E0F2FE',
              color: '#0369A1',
              border: '1px solid #BAE6FD',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Clock size={12} /> In Progress
          </span>
        );
      case 'OVERDUE':
        return (
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: 20,
              background: '#FFF1F2',
              color: '#E11D48',
              border: '1px solid #FECDD3',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <AlertTriangle size={12} /> Overdue
          </span>
        );
      default:
        return (
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: 20,
              background: '#F1F5F9',
              color: '#64748B',
              border: '1px solid #CBD5E1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Pending
          </span>
        );
    }
  };

  // Guard: if no teams at all
  if (!activeTeam) {
    return (
      <AppCard style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ color: '#64748B', fontSize: 15, fontWeight: 600 }}>
          No team selected or no teams assigned to mentor yet.
        </div>
      </AppCard>
    );
  }

  const isDataMatching = loadedTeamId === activeTeam.id && !loadingDetails;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Header Overview & Team Selector */}
      <AppCard style={{ padding: '24px 28px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#0B4D88',
                  background: '#E5F3FA',
                  padding: '3px 10px',
                  borderRadius: 6,
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                }}
              >
                Milestone Timeline & Evidence Matrix • RVCE Experiential Learning
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
                {activeTeam.teamName}
              </h2>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 800,
                  color: '#0B4D88',
                  background: '#E5F3FA',
                  padding: '3px 10px',
                  borderRadius: 8,
                  border: '1px solid #BAE6FD',
                  fontFamily: 'monospace',
                }}
              >
                {activeTeam.teamCode}
              </span>
            </div>

            <p style={{ fontSize: 13.5, color: '#64748B', marginTop: 8, maxWidth: 680, lineHeight: 1.55 }}>
              {activeTeam.projectTitle || activeTeam.projectGist || 'Continuous milestone verification, evidence audit, and rubric evaluation.'}
            </p>
          </div>

          {/* Team Switcher if multiple teams */}
          {teams.length > 1 && !singleTeam && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label htmlFor="team-switcher-select" style={{ fontSize: 13, fontWeight: 700, color: '#64748B' }}>
                Active Team:
              </label>
              <select
                id="team-switcher-select"
                value={activeTeam.id}
                onChange={(e) => handleTeamSwitch(parseInt(e.target.value, 10))}
                disabled={loadingDetails}
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1.5px solid #CBD5E1',
                  background: loadingDetails ? '#F1F5F9' : '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#0F172A',
                  outline: 'none',
                  cursor: loadingDetails ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
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

        {/* Schedule unavailable notice */}
        {scheduleUnavailable && (
          <div
            style={{
              marginTop: 16,
              padding: '10px 14px',
              borderRadius: 12,
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              color: '#92400E',
              fontSize: 12.5,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} color="#D97706" style={{ flexShrink: 0 }} />
            <span>
              <strong>Institutional Schedule Notice:</strong> Team registration timestamp is not recorded. Default deliverable phases are displayed; automated deadline verification requires a registered creation date.
            </span>
          </div>
        )}

        {/* Loading state skeleton / spinner */}
        {loadingDetails && (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              marginTop: 20,
              background: '#F8FAFC',
              borderRadius: 16,
              border: '1.5px dashed #CBD5E1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Loader2 size={32} color="#0B4D88" className="spin" />
            <div style={{ fontSize: 14, fontWeight: 750, color: '#0F172A' }}>
              Loading milestone timeline & deliverables for {activeTeam.teamName}...
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>
              Retrieving verified proof submissions and peer accountability logs
            </div>
          </div>
        )}

        {/* Load error state with retry button */}
        {!loadingDetails && loadError && (
          <div
            style={{
              padding: '24px 20px',
              marginTop: 20,
              background: '#FFF1F2',
              borderRadius: 16,
              border: '1.5px solid #FECDD3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <AlertTriangle size={24} color="#E11D48" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#9F1239' }}>
                  Failed to load deliverables for {activeTeam.teamName}
                </div>
                <div style={{ fontSize: 12.5, color: '#BE123C', marginTop: 2 }}>
                  {loadError}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={loadDataForActiveTeam}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 10,
                background: '#E11D48',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={14} /> Retry Fetch
            </button>
          </div>
        )}

        {/* 4 Summary Metric Tiles - Rendered only when loaded data matches active team */}
        {isDataMatching && !loadError && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: 14,
              marginTop: 20,
            }}
          >
            {/* Verified Progress */}
            <div
              style={{
                padding: '16px',
                borderRadius: 16,
                background: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  Verified Progress
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: '#0B4D88' }}>{calculatedProgress}%</span>
                  <span style={{ fontSize: 11.5, color: '#94A3B8' }}>(Claimed: {activeTeam.currentProgressPct}%)</span>
                </div>
              </div>
              <div style={{ width: '100%', height: 7, borderRadius: 99, background: '#E2E8F0', marginTop: 12, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${calculatedProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #0B4D88 0%, #22B6C5 100%)',
                    borderRadius: 99,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>

            {/* Submissions Log */}
            <div
              style={{
                padding: '16px',
                borderRadius: 16,
                background: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  Submissions
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: '#0F172A' }}>{contributions.length}</span>
                  <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Total logged</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 700, marginTop: 12 }}>
                <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Check size={13} /> {contributions.filter((c) => c.status === 'CONFIRMED').length} Confirmed
                </span>
                <span style={{ color: '#D97706', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  • {contributions.filter((c) => c.status === 'PENDING').length} Pending
                </span>
              </div>
            </div>

            {/* Current Milestone */}
            <div
              style={{
                padding: '16px',
                borderRadius: 16,
                background: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  Current Milestone
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0F172A', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentMilestoneSummary.title}
                </div>
                {currentMilestoneSummary.alertNote && (
                  <div style={{ fontSize: 11, color: '#E11D48', fontWeight: 700, marginTop: 2 }}>
                    {currentMilestoneSummary.alertNote}
                  </div>
                )}
              </div>
              <div style={{ marginTop: 12 }}>
                {renderStatusBadge(currentMilestoneSummary.status)}
              </div>
            </div>

            {/* Institutional Reports - Primary Report Uploaded (not Verified without explicit sign-off) */}
            <div
              style={{
                padding: '16px',
                borderRadius: 16,
                background: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  Institutional Reports
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: '#0F172A' }}>
                    {activeTeam.reports?.length || 0}
                  </span>
                  <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>/ 2 slots</span>
                </div>
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 12 }}>
                {activeTeam.reports?.some((r) => r.slot === 'primary') ? (
                  <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <FileCheck size={13} /> Primary Report Uploaded
                  </span>
                ) : (
                  <span style={{ color: '#D97706', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={13} /> Primary Report Pending
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </AppCard>

      {/* 2. Visual Timeline & Deliverables Matrix */}
      {isDataMatching && !loadError && (
        <AppCard
          title="Milestone Timeline & Deliverables"
          subtitle="Institutional Schedule & Evidence Verification Progress"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {milestones.map((m, idx) => {
              const confirmedCount = (m.contributions || []).filter((c) => c.status === 'CONFIRMED').length;
              const pendingCount = (m.contributions || []).filter((c) => c.status === 'PENDING').length;
              const completionPct = Math.min(100, Math.round((confirmedCount / 2) * 100));

              return (
                <div
                  key={m.id}
                  style={{
                    padding: '20px 22px',
                    borderRadius: 18,
                    background: '#FFFFFF',
                    border: '1.5px solid #E2E8F0',
                    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  {/* Milestone Top Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 14,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          background: 'linear-gradient(135deg, #0B4D88, #22B6C5)',
                          color: '#FFFFFF',
                          fontWeight: 900,
                          fontSize: 16,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          boxShadow: '0 4px 10px rgba(11, 77, 136, 0.2)',
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', margin: 0 }}>
                            {m.title}
                          </h4>
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: '#F1F5F9',
                              color: '#475569',
                              border: '1px solid #CBD5E1',
                            }}
                          >
                            Weight: {m.weightPct}%
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                          {m.description}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                        <Calendar size={14} color="#94A3B8" />
                        <span>
                          {m.plannedStartDate ? `${formatDate(m.plannedStartDate)} → ${formatDate(m.plannedEndDate)}` : 'Schedule Pending'}
                        </span>
                      </div>
                      {renderStatusBadge(m.status)}
                    </div>
                  </div>

                  {/* Progress Bar & Evidence Verification Progress */}
                  <div style={{ marginTop: 14 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: '#64748B',
                        marginBottom: 8,
                      }}
                    >
                      <span>
                        Evidence Verification Progress: {confirmedCount} Confirmed {pendingCount > 0 && `(${pendingCount} Pending)`}
                      </span>
                      <span style={{ color: '#0B4D88', fontWeight: 900 }}>{completionPct}% Verified</span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: 10,
                        borderRadius: 99,
                        background: '#E2E8F0',
                        overflow: 'hidden',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
                      }}
                    >
                      <div
                        style={{
                          width: `${completionPct}%`,
                          height: '100%',
                          background:
                            m.status === 'COMPLETED'
                              ? 'linear-gradient(90deg, #10B981, #34D399)'
                              : m.status === 'OVERDUE'
                              ? 'linear-gradient(90deg, #E11D48, #F87171)'
                              : 'linear-gradient(90deg, #0B4D88 0%, #22B6C5 100%)',
                          borderRadius: 99,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Associated Deliverable Chips */}
                  {m.contributions && m.contributions.length > 0 ? (
                    <div
                      style={{
                        marginTop: 16,
                        paddingTop: 14,
                        borderTop: '1px dashed #E2E8F0',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 10,
                      }}
                    >
                      {m.contributions.map((c) => {
                        const isConfirmed = c.status === 'CONFIRMED';
                        const isPending = c.status === 'PENDING';
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={(e) => {
                              triggerRef.current = e.currentTarget;
                              setSelectedContribution(c);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '8px 12px',
                              borderRadius: 10,
                              background: '#F8FAFC',
                              border: '1.5px solid #E2E8F0',
                              fontSize: 12.5,
                              color: '#0F172A',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              maxWidth: 320,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#EFF6FF';
                              e.currentTarget.style.borderColor = '#0B4D88';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#F8FAFC';
                              e.currentTarget.style.borderColor = '#E2E8F0';
                              e.currentTarget.style.transform = 'none';
                            }}
                          >
                            <FileText size={15} color="#0B4D88" style={{ flexShrink: 0 }} />
                            <span
                              style={{
                                fontWeight: 700,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                                textAlign: 'left',
                              }}
                            >
                              {c.title}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '2px 7px',
                                borderRadius: 5,
                                background: isConfirmed ? '#ECFDF5' : isPending ? '#FFFBEB' : '#FFF1F2',
                                color: isConfirmed ? '#059669' : isPending ? '#D97706' : '#E11D48',
                                border: isConfirmed ? '1px solid #A7F3D0' : isPending ? '1px solid #FDE68A' : '1px solid #FECDD3',
                                flexShrink: 0,
                                letterSpacing: '0.3px',
                                textTransform: 'uppercase',
                              }}
                            >
                              {c.status}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: 14,
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: '#F8FAFC',
                        border: '1px dashed #E2E8F0',
                        fontSize: 12,
                        color: '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <HelpCircle size={14} color="#94A3B8" />
                      <span>No deliverables logged for this milestone yet.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </AppCard>
      )}

      {/* 3. Individual Member Contribution Share Breakdown */}
      {isDataMatching && !loadError && (
        <AppCard
          title="Individual Member Contribution Share"
          subtitle="Peer accountability matrix distinguishing personal verified work from overall team completion."
        >
          {memberContributionStats.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: 13.5 }}>
              No roster members found for this team.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 290px), 1fr))',
                gap: 16,
              }}
            >
              {memberContributionStats.map(({ member, total, confirmed, pending, rejected, sharePct }) => (
                <div
                  key={member.id}
                  style={{
                    padding: '18px',
                    borderRadius: 16,
                    background: '#FFFFFF',
                    border: '1.5px solid #E2E8F0',
                    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          background: 'linear-gradient(135deg, #0B4D88, #22B6C5)',
                          color: '#FFFFFF',
                          fontWeight: 900,
                          fontSize: 16,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          boxShadow: '0 4px 10px rgba(11, 77, 136, 0.2)',
                        }}
                      >
                        {member.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h5
                          style={{
                            fontSize: 14.5,
                            fontWeight: 850,
                            color: '#0F172A',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {member.fullName}
                        </h5>
                        <p
                          style={{
                            fontSize: 12,
                            color: '#64748B',
                            margin: '3px 0 0 0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontWeight: 600,
                          }}
                        >
                          {member.usn ? `USN: ${member.usn}` : member.email}
                        </p>
                      </div>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>Contribution Share:</span>
                        <span style={{ color: '#0B4D88', fontWeight: 900 }}>{sharePct}% of Verified Work</span>
                      </div>
                      <div style={{ width: '100%', height: 7, borderRadius: 99, background: '#E2E8F0', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${sharePct}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #0B4D88 0%, #22B6C5 100%)',
                            borderRadius: 99,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: 16,
                      paddingTop: 12,
                      borderTop: '1px solid #F1F5F9',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Check size={13} /> {confirmed} Confirmed
                    </span>
                    <span style={{ color: '#D97706' }}>
                      {pending} Pending
                    </span>
                    <span style={{ color: '#E11D48' }}>
                      {rejected} Rejected
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AppCard>
      )}

      {/* 4. Deliverable Evidence Inspection Modal with Full Keyboard & Modal Accessibility */}
      {selectedContribution && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deliverable-modal-title"
          aria-describedby="deliverable-modal-desc"
          onClick={() => setSelectedContribution(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 580,
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 20,
              background: '#FFFFFF',
              boxShadow: '0 25px 60px rgba(15, 23, 42, 0.3)',
              padding: 26,
              border: '1.5px solid rgba(255, 255, 255, 0.8)',
            }}
          >
            <button
              ref={modalCloseButtonRef}
              type="button"
              aria-label="Close deliverable details dialog"
              onClick={() => setSelectedContribution(null)}
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                background: '#F1F5F9',
                border: 'none',
                color: '#64748B',
                width: 32,
                height: 32,
                borderRadius: 8,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background:
                    selectedContribution.status === 'CONFIRMED'
                      ? '#ECFDF5'
                      : selectedContribution.status === 'PENDING'
                      ? '#FFFBEB'
                      : '#FFF1F2',
                  color:
                    selectedContribution.status === 'CONFIRMED'
                      ? '#059669'
                      : selectedContribution.status === 'PENDING'
                      ? '#D97706'
                      : '#E11D48',
                  border:
                    selectedContribution.status === 'CONFIRMED'
                      ? '1px solid #A7F3D0'
                      : selectedContribution.status === 'PENDING'
                      ? '1px solid #FDE68A'
                      : '1px solid #FECDD3',
                }}
              >
                {selectedContribution.status}
              </span>
              <span style={{ fontSize: 12.5, color: '#64748B' }}>
                Submitted {formatDate(selectedContribution.createdAt || '')}
              </span>
            </div>

            <h3
              id="deliverable-modal-title"
              style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', margin: '0 0 12px 0' }}
            >
              {selectedContribution.title}
            </h3>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                borderRadius: 14,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                fontSize: 13,
                color: '#334155',
                marginBottom: 18,
              }}
            >
              <User size={16} color="#0B4D88" />
              <span>
                Author: <strong>{selectedContribution.authorName || selectedContribution.studentName || 'Student'}</strong>
                {selectedContribution.authorUsn && ` (${selectedContribution.authorUsn})`}
              </span>
            </div>

            <div id="deliverable-modal-desc" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: 6 }}>
                  Description & Scope
                </label>
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: 14,
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    fontSize: 13.5,
                    color: '#334155',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selectedContribution.description || 'No detailed description provided.'}
                </div>
              </div>

              {/* Uploaded Evidence Files */}
              {selectedContribution.files && selectedContribution.files.length > 0 && (
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: 8 }}>
                    Attached Deliverable Files ({selectedContribution.files.length})
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedContribution.files.map((file) => (
                      <div
                        key={file.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '12px 16px',
                          borderRadius: 12,
                          background: '#FFFFFF',
                          border: '1.5px solid #E2E8F0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <FileText size={18} color="#0B4D88" style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.fileName}
                          </span>
                          <span style={{ fontSize: 11.5, color: '#64748B', flexShrink: 0 }}>
                            ({(file.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setPdfPreviewFile({
                              storagePath: file.storagePath,
                              fileName: file.fileName,
                              submissionNumber: selectedContribution.id,
                            });
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 12px',
                            borderRadius: 8,
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#1D4ED8',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={13} />
                          <span>Preview</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* External Links */}
              {selectedContribution.links && selectedContribution.links.length > 0 && (
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: 8 }}>
                    External Resource Links
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedContribution.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '12px 16px',
                          borderRadius: 12,
                          background: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          color: '#1D4ED8',
                          fontSize: 13,
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        <ExternalLink size={15} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {link}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Secure In-App PDF Viewer Modal (Prevents Supabase URL/Credential Exposure) */}
      <SecurePdfViewerModal
        isOpen={Boolean(pdfPreviewFile)}
        onClose={() => setPdfPreviewFile(null)}
        resolveUrl={
          pdfPreviewFile
            ? () => StorageService.getSignedUrl(pdfPreviewFile.storagePath)
            : undefined
        }
        teamName={activeTeam?.teamName || 'Team'}
        submissionNumber={pdfPreviewFile?.submissionNumber ?? 1}
        title={pdfPreviewFile?.fileName}
      />
    </div>
  );
};
