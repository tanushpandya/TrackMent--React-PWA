import React, { useState, useMemo, useEffect } from 'react';
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

  useEffect(() => {
    if (activeTeam) {
      setActiveTeamId(activeTeam.id);
    }
  }, [activeTeam]);

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
    const p1End = new Date(p1Start.getTime() + 25 * 86400000);
    const p2Start = new Date(p1End.getTime() + 1 * 86400000);
    const p2End = new Date(p2Start.getTime() + 35 * 86400000);
    const p3Start = new Date(p2End.getTime() + 1 * 86400000);
    const p3End = new Date(p3Start.getTime() + 30 * 86400000);

    const now = new Date();

    const p1Contribs = contributions.filter((c) => {
      const lower = (c.title + ' ' + (c.description || '')).toLowerCase();
      if (lower.includes('phase 1') || lower.includes('synopsis') || lower.includes('literature') || lower.includes('problem')) {
        return true;
      }
      const cDate = c.createdAt ? new Date(c.createdAt) : new Date();
      return cDate <= p1End;
    });

    const p2Contribs = contributions.filter((c) => {
      const lower = (c.title + ' ' + (c.description || '')).toLowerCase();
      if (lower.includes('phase 2') || lower.includes('execution') || lower.includes('module') || lower.includes('partial')) {
        return true;
      }
      const cDate = c.createdAt ? new Date(c.createdAt) : new Date();
      return cDate > p1End && cDate <= p2End;
    });

    const p3Contribs = contributions.filter((c) => {
      const lower = (c.title + ' ' + (c.description || '')).toLowerCase();
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

  const calculatedProgress = useMemo(() => {
    let weightedScore = 0;
    milestones.forEach((m) => {
      const confirmed = (m.contributions || []).filter((c) => c.status === 'CONFIRMED').length;
      const milestoneCompletion = Math.min(1.0, confirmed / 2.0);
      weightedScore += m.weightPct * milestoneCompletion;
    });
    return Math.round(weightedScore);
  }, [milestones]);

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

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  const renderStatusBadge = (status: MilestoneModel['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11.5,
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 99,
              background: '#ECFDF5',
              color: '#059669',
              border: '1px solid #A7F3D0',
            }}
          >
            <CheckCircle2 size={13} /> Completed
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11.5,
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 99,
              background: '#EFF6FF',
              color: '#2563EB',
              border: '1px solid #BFDBFE',
            }}
          >
            <Clock size={13} /> In Progress
          </span>
        );
      case 'OVERDUE':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11.5,
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 99,
              background: '#FFF1F2',
              color: '#E11D48',
              border: '1px solid #FECDD3',
            }}
          >
            <AlertTriangle size={13} /> Overdue
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11.5,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 99,
              background: '#F1F5F9',
              color: '#64748B',
              border: '1px solid #E2E8F0',
            }}
          >
            Pending
          </span>
        );
    }
  };

  if (!activeTeam) {
    return (
      <AppCard style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            background: '#F1F5F9',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 16px',
          }}
        >
          <Users size={28} color="#64748B" />
        </div>
        <h4 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>No Assigned Teams</h4>
        <p style={{ fontSize: 13.5, color: '#64748B', marginTop: 6, maxWidth: 380, marginInline: 'auto' }}>
          Claim or accept a team to view continuous evaluation Gantt timeline tracking and evidence verification.
        </p>
      </AppCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Header Banner & Team Selector Card */}
      <AppCard>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            paddingBottom: 20,
            borderBottom: '1.5px solid #E2E8F0',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1D4ED8',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                Gantt Timeline & Evidence Matrix
              </span>
              <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>• RVCE Experiential Learning</span>
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
              <label style={{ fontSize: 13, fontWeight: 700, color: '#64748B' }}>Active Team:</label>
              <select
                value={activeTeamId || activeTeam.id}
                onChange={(e) => {
                  const tid = parseInt(e.target.value, 10);
                  setActiveTeamId(tid);
                  if (onSelectTeam) onSelectTeam(tid);
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#0F172A',
                  outline: 'none',
                  cursor: 'pointer',
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

        {/* 4 Summary Metric Tiles */}
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
                {milestones.find((m) => m.status === 'IN_PROGRESS')?.title.split(':')[0] || 'Phase 2: Milestone Review'}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              {renderStatusBadge(milestones.find((m) => m.status === 'IN_PROGRESS')?.status || 'IN_PROGRESS')}
            </div>
          </div>

          {/* Institutional Reports */}
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
                  <CheckCircle2 size={13} /> Primary Report Verified
                </span>
              ) : (
                <span style={{ color: '#D97706', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={13} /> Primary Report Pending
                </span>
              )}
            </div>
          </div>
        </div>
      </AppCard>

      {/* 2. Visual Gantt Chart Milestone Cards */}
      <AppCard
        title="Milestone Timeline & Schedule"
        subtitle="Planned vs. Actual Deliverable Progress"
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
                        {formatDate(m.plannedStartDate)} → {formatDate(m.plannedEndDate)}
                      </span>
                    </div>
                    {renderStatusBadge(m.status)}
                  </div>
                </div>

                {/* Progress Bar & Evidence Summary */}
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
                      Evidence: {confirmedCount} Confirmed {pendingCount > 0 && `(${pendingCount} Pending)`}
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
                {m.contributions && m.contributions.length > 0 && (
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
                          onClick={() => setSelectedContribution(c)}
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
                )}
              </div>
            );
          })}
        </div>
      </AppCard>

      {/* 3. Individual Member Contribution Share Breakdown */}
      <AppCard
        title="Individual Member Contribution Share"
        subtitle="Peer accountability matrix distinguishing personal verified work from overall team completion."
      >
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
      </AppCard>

      {/* 4. Deliverable Evidence Inspection Modal */}
      {selectedContribution && (
        <div
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
              type="button"
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
                Submitted {formatDate(selectedContribution.createdAt || new Date().toISOString())}
              </span>
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', margin: '0 0 12px 0' }}>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                          onClick={async () => {
                            try {
                              const url = await StorageService.getSignedUrl(file.storagePath);
                              window.open(url, '_blank', 'noopener,noreferrer');
                            } catch (e: any) {
                              alert(e.message || 'Could not open file.');
                            }
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
    </div>
  );
};
