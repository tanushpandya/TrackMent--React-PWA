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
import { MetricCard } from '../../components/common/MetricCard';

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
        title: 'Phase 1: Synopsis & Problem Formulation',
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
        title: 'Phase 2: Milestone Review & Execution',
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
        title: 'Phase 3: Final Demo, Evaluation & Archiving',
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
              fontSize: 11,
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: 99,
              background: '#E4F6F0',
              color: '#328F81',
              border: '1px solid rgba(50, 143, 129, 0.3)',
            }}
          >
            <CheckCircle2 size={12} /> Completed
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: 99,
              background: '#E5F3FA',
              color: '#0B4D88',
              border: '1px solid rgba(11, 77, 136, 0.3)',
            }}
          >
            <Clock size={12} /> In Progress
          </span>
        );
      case 'OVERDUE':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: 99,
              background: '#FBECEB',
              color: '#B34F5C',
              border: '1px solid rgba(179, 79, 92, 0.3)',
            }}
          >
            <AlertTriangle size={12} /> Overdue
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 99,
              background: '#F1F5F9',
              color: '#64748B',
            }}
          >
            Pending
          </span>
        );
    }
  };

  if (!activeTeam) {
    return (
      <AppCard style={{ textAlign: 'center', padding: '40px 20px' }}>
        <Users size={36} color="#7992A1" style={{ margin: '0 auto 10px' }} />
        <h4 style={{ fontSize: 16, fontWeight: 800, color: '#102F48' }}>No Assigned Teams</h4>
        <p style={{ fontSize: 13, color: '#5E788C', marginTop: 4 }}>
          Claim or accept a team to view continuous evaluation Gantt timeline tracking.
        </p>
      </AppCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Header Banner & Team Selector Card */}
      <AppCard>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            paddingBottom: 16,
            borderBottom: '1px solid #D5E8EF',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="badge badge-blue">GANTT TIMELINE & EVIDENCE MATRIX</span>
              <span style={{ fontSize: 12, color: '#7992A1', fontWeight: 600 }}>RVCE Experiential Learning</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#102F48', margin: 0 }}>
                {activeTeam.teamName}
              </h2>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#0B4D88',
                  background: '#E5F3FA',
                  padding: '2px 8px',
                  borderRadius: 6,
                  border: '1px solid #D5E8EF',
                }}
              >
                {activeTeam.teamCode}
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#5E788C', marginTop: 6, maxWidth: 640 }}>
              {activeTeam.projectTitle || activeTeam.projectGist || 'Continuous milestone verification and evidence audit.'}
            </p>
          </div>

          {/* Team Switcher if multiple teams */}
          {teams.length > 1 && !singleTeam && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#5E788C' }}>Switch Team:</label>
              <select
                value={activeTeamId || activeTeam.id}
                onChange={(e) => {
                  const tid = parseInt(e.target.value, 10);
                  setActiveTeamId(tid);
                  if (onSelectTeam) onSelectTeam(tid);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1.5px solid #D5E8EF',
                  background: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#102F48',
                  outline: 'none',
                  cursor: 'pointer',
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
            gap: 12,
            marginTop: 16,
          }}
        >
          {/* Verified Progress */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 14,
              background: '#FFFFFF',
              border: '1px solid #D5E8EF',
              boxShadow: '0 2px 8px rgba(12, 64, 101, 0.05)',
            }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#7992A1', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Verified Progress
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: '#0B4D88' }}>{calculatedProgress}%</span>
              <span style={{ fontSize: 11, color: '#5E788C' }}>(Claimed: {activeTeam.currentProgressPct}%)</span>
            </div>
            <div style={{ width: '100%', height: 6, borderRadius: 99, background: '#D5E8EF', marginTop: 8, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${calculatedProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #0B4D88, #22B6C5)',
                  borderRadius: 99,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          {/* Submissions Log */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 14,
              background: '#FFFFFF',
              border: '1px solid #D5E8EF',
              boxShadow: '0 2px 8px rgba(12, 64, 101, 0.05)',
            }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#7992A1', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Deliverables Log
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: '#102F48' }}>{contributions.length}</span>
              <span style={{ fontSize: 11, color: '#5E788C' }}>Submissions</span>
            </div>
            <div style={{ display: 'flex', gap: 8, fontSize: 11, fontWeight: 700, marginTop: 8 }}>
              <span style={{ color: '#16A34A' }}>
                {contributions.filter((c) => c.status === 'CONFIRMED').length} Confirmed
              </span>
              <span style={{ color: '#A67827' }}>
                {contributions.filter((c) => c.status === 'PENDING').length} Pending
              </span>
            </div>
          </div>

          {/* Active Milestone */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 14,
              background: '#FFFFFF',
              border: '1px solid #D5E8EF',
              boxShadow: '0 2px 8px rgba(12, 64, 101, 0.05)',
            }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#7992A1', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Current Milestone
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#102F48', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {milestones.find((m) => m.status === 'IN_PROGRESS')?.title.split(':')[0] || 'Phase 2 Review'}
            </div>
            <div style={{ marginTop: 6 }}>
              {renderStatusBadge(milestones.find((m) => m.status === 'IN_PROGRESS')?.status || 'IN_PROGRESS')}
            </div>
          </div>

          {/* Institutional Reports */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 14,
              background: '#FFFFFF',
              border: '1px solid #D5E8EF',
              boxShadow: '0 2px 8px rgba(12, 64, 101, 0.05)',
            }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#7992A1', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Institutional Reports
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: '#102F48' }}>
                {activeTeam.reports?.length || 0}
              </span>
              <span style={{ fontSize: 11, color: '#5E788C' }}>/ 2 Submitted</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: activeTeam.reports?.some((r) => r.slot === 'primary') ? '#16A34A' : '#A67827', marginTop: 8 }}>
              {activeTeam.reports?.some((r) => r.slot === 'primary') ? '✅ Primary Report Uploaded' : '⚠️ Primary Report Pending'}
            </div>
          </div>
        </div>
      </AppCard>

      {/* 2. Visual Gantt Chart Milestone Cards */}
      <AppCard
        title="Milestone Timeline & Continuous Evaluation Schedule"
        subtitle="Planned vs. actual deliverable progress tracked against official academic rubrics."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {milestones.map((m, idx) => {
            const confirmedCount = (m.contributions || []).filter((c) => c.status === 'CONFIRMED').length;
            const pendingCount = (m.contributions || []).filter((c) => c.status === 'PENDING').length;
            const completionPct = Math.min(100, Math.round((confirmedCount / 2) * 100));

            return (
              <div
                key={m.id}
                style={{
                  padding: '18px 20px',
                  borderRadius: 16,
                  background: '#FFFFFF',
                  border: '1px solid #D5E8EF',
                  boxShadow: '0 2px 10px rgba(12, 64, 101, 0.04)',
                }}
              >
                {/* Milestone Top Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: '#0B4D88',
                        color: '#FFFFFF',
                        fontWeight: 900,
                        fontSize: 14,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: 15, fontWeight: 850, color: '#102F48', margin: 0 }}>
                          {m.title}
                        </h4>
                        <span className="badge badge-lead">Weight: {m.weightPct}%</span>
                      </div>
                      <p style={{ fontSize: 12.5, color: '#5E788C', margin: '4px 0 0 0' }}>
                        {m.description}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#5E788C', fontWeight: 600 }}>
                      <Calendar size={13} color="#7992A1" />
                      <span>
                        {formatDate(m.plannedStartDate)} → {formatDate(m.plannedEndDate)}
                      </span>
                    </div>
                    {renderStatusBadge(m.status)}
                  </div>
                </div>

                {/* Gantt Bar Fill */}
                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#5E788C',
                      marginBottom: 6,
                    }}
                  >
                    <span>
                      Evidence: {confirmedCount} Confirmed {pendingCount > 0 && `(${pendingCount} Pending)`}
                    </span>
                    <span style={{ color: '#0B4D88', fontWeight: 800 }}>{completionPct}% Verified</span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: 10,
                      borderRadius: 99,
                      background: '#E2E8F0',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${completionPct}%`,
                        height: '100%',
                        background:
                          m.status === 'COMPLETED'
                            ? 'linear-gradient(90deg, #16A34A, #34D399)'
                            : m.status === 'OVERDUE'
                            ? 'linear-gradient(90deg, #B34F5C, #F87171)'
                            : 'linear-gradient(90deg, #0B4D88, #22B6C5)',
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
                      marginTop: 14,
                      paddingTop: 12,
                      borderTop: '1px dashed #E2E8F0',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
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
                            gap: 6,
                            padding: '6px 10px',
                            borderRadius: 8,
                            background: '#F8FAFC',
                            border: '1px solid #D5E8EF',
                            fontSize: 12,
                            color: '#102F48',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            maxWidth: 260,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#E5F3FA';
                            e.currentTarget.style.borderColor = '#0B4D88';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#F8FAFC';
                            e.currentTarget.style.borderColor = '#D5E8EF';
                          }}
                        >
                          <FileText size={13} color="#0B4D88" style={{ flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.title}
                          </span>
                          <span
                            style={{
                              fontSize: 9.5,
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: 4,
                              background: isConfirmed ? '#E4F6F0' : isPending ? '#FFF4D8' : '#FBECEB',
                              color: isConfirmed ? '#328F81' : isPending ? '#A67827' : '#B34F5C',
                              flexShrink: 0,
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: 14,
          }}
        >
          {memberContributionStats.map(({ member, total, confirmed, pending, rejected, sharePct }) => (
            <div
              key={member.id}
              style={{
                padding: '16px',
                borderRadius: 14,
                background: '#FFFFFF',
                border: '1px solid #D5E8EF',
                boxShadow: '0 2px 8px rgba(12, 64, 101, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0B4D88, #22B6C5)',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: 14,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {member.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h5
                      style={{
                        fontSize: 13.5,
                        fontWeight: 800,
                        color: '#102F48',
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
                        fontSize: 11.5,
                        color: '#7992A1',
                        margin: '2px 0 0 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {member.usn ? `USN: ${member.usn}` : member.email}
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#5E788C', fontWeight: 600 }}>Contribution Share:</span>
                    <span style={{ color: '#0B4D88', fontWeight: 800 }}>{sharePct}% of Verified Work</span>
                  </div>
                  <div style={{ width: '100%', height: 6, borderRadius: 99, background: '#E2E8F0', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${sharePct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #0B4D88, #22B6C5)',
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
                  marginTop: 14,
                  paddingTop: 10,
                  borderTop: '1px solid #F1F5F9',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                <span style={{ color: '#16A34A' }}>{confirmed} Confirmed</span>
                <span style={{ color: '#A67827' }}>{pending} Pending</span>
                <span style={{ color: '#B34F5C' }}>{rejected} Rejected</span>
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
            background: 'rgba(16, 47, 72, 0.65)',
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
              boxShadow: '0 24px 60px rgba(10, 48, 77, 0.35)',
              padding: 24,
              border: '1px solid rgba(255, 255, 255, 0.8)',
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedContribution(null)}
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                background: 'transparent',
                border: 'none',
                color: '#7992A1',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background:
                    selectedContribution.status === 'CONFIRMED'
                      ? '#E4F6F0'
                      : selectedContribution.status === 'PENDING'
                      ? '#FFF4D8'
                      : '#FBECEB',
                  color:
                    selectedContribution.status === 'CONFIRMED'
                      ? '#328F81'
                      : selectedContribution.status === 'PENDING'
                      ? '#A67827'
                      : '#B34F5C',
                }}
              >
                {selectedContribution.status}
              </span>
              <span style={{ fontSize: 12, color: '#7992A1' }}>
                Submitted {formatDate(selectedContribution.createdAt || new Date().toISOString())}
              </span>
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 900, color: '#102F48', margin: '0 0 10px 0' }}>
              {selectedContribution.title}
            </h3>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 12,
                background: '#F4FAFC',
                border: '1px solid #D5E8EF',
                fontSize: 12.5,
                color: '#31566E',
                marginBottom: 16,
              }}
            >
              <User size={15} color="#0B4D88" />
              <span>
                Author: <strong>{selectedContribution.authorName || selectedContribution.studentName || 'Student'}</strong>
                {selectedContribution.authorUsn && ` (${selectedContribution.authorUsn})`}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 800, color: '#102F48', display: 'block', marginBottom: 4 }}>
                  Description & Scope
                </label>
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    fontSize: 13,
                    color: '#31566E',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {selectedContribution.description || 'No detailed description provided.'}
                </div>
              </div>

              {/* Uploaded Evidence Files */}
              {selectedContribution.files && selectedContribution.files.length > 0 && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 800, color: '#102F48', display: 'block', marginBottom: 6 }}>
                    Attached Deliverable Files ({selectedContribution.files.length})
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedContribution.files.map((file) => (
                      <div
                        key={file.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          padding: '10px 14px',
                          borderRadius: 10,
                          background: '#FFFFFF',
                          border: '1px solid #D5E8EF',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <FileText size={16} color="#0B4D88" style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#102F48', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.fileName}
                          </span>
                          <span style={{ fontSize: 11, color: '#7992A1', flexShrink: 0 }}>
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
                          className="btn btn-sm btn-primary"
                          style={{ padding: '4px 10px', fontSize: 11.5 }}
                        >
                          <Eye size={12} />
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
                  <label style={{ fontSize: 12, fontWeight: 800, color: '#102F48', display: 'block', marginBottom: 6 }}>
                    External Resource Links
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedContribution.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 14px',
                          borderRadius: 10,
                          background: '#E5F3FA',
                          border: '1px solid #D5E8EF',
                          color: '#0B4D88',
                          fontSize: 12.5,
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        <ExternalLink size={14} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {link}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setSelectedContribution(null)}
                className="btn btn-sm"
                style={{ padding: '8px 18px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
