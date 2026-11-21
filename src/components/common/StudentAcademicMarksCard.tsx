import React, { useState } from 'react';
import { Award, ShieldCheck, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { TeamEvaluation } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { AppCard } from './AppCard';
import { LargestRemainderAllocator } from '../../utils/largestRemainderAllocator';

interface StudentAcademicMarksCardProps {
  evaluations: TeamEvaluation[];
  isMarksVisible?: boolean;
  loading?: boolean;
}

export const StudentAcademicMarksCard: React.FC<StudentAcademicMarksCardProps> = ({
  evaluations = [],
  loading = false,
}) => {
  const { user, profile } = useAuth();
  const [expandedEvId, setExpandedEvId] = useState<number | null>(null);

  // 1. Filter out internal system records (e.g. __MARKS_VISIBILITY__)
  const cleanEvals = (evaluations || []).filter((e) => {
    const p = (e.phaseName || '').trim();
    if (!p || p.startsWith('__')) return false;
    const lower = p.toLowerCase();
    if (lower.includes('visibility') || lower.includes('dummy') || lower.includes('mock')) {
      return false;
    }

    // If individual member marks are set, check if this student is included
    const hasMemberMarks = e.memberMarks && Object.keys(e.memberMarks).length > 0;
    if (hasMemberMarks) {
      const hasId = user?.id && e.memberMarks[user.id] !== undefined;
      const hasUsn = profile?.usn && e.memberMarks[profile.usn] !== undefined;
      // If it has individual marks and this student is not in it, it belongs to another teammate
      if (!hasId && !hasUsn) {
        return false;
      }
    }
    return true;
  });

  // 2. Deduplicate by phase name (keeping the latest authentic entry per phase)
  const phaseMap = new Map<
    string,
    { ev: TeamEvaluation; score: number; maxMarks: number }
  >();

  for (const ev of cleanEvals) {
    const normKey = ev.phaseName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isIndividual =
      (user?.id && ev.memberMarks && ev.memberMarks[user.id] !== undefined) ||
      (profile?.usn && ev.memberMarks && ev.memberMarks[profile.usn] !== undefined);

    const score =
      user?.id && ev.memberMarks && ev.memberMarks[user.id] !== undefined
        ? Number(ev.memberMarks[user.id])
        : profile?.usn && ev.memberMarks && ev.memberMarks[profile.usn] !== undefined
        ? Number(ev.memberMarks[profile.usn])
        : Number(ev.totalMarks || 0);

    const maxMarks = Number(
      ev.maxMarks ||
        (normKey.includes('1') ? 40 : normKey.includes('2') ? 60 : normKey.includes('3') ? 100 : 50)
    );

    const existing = phaseMap.get(normKey);
    if (!existing) {
      phaseMap.set(normKey, { ev, score, maxMarks });
    } else {
      // Prioritize individual evaluation over older cohort row
      const existingIsIndiv =
        (user?.id && existing.ev.memberMarks && existing.ev.memberMarks[user.id] !== undefined) ||
        (profile?.usn && existing.ev.memberMarks && existing.ev.memberMarks[profile.usn] !== undefined);

      if (isIndividual && !existingIsIndiv) {
        phaseMap.set(normKey, { ev, score, maxMarks });
      }
    }
  }

  const items = Array.from(phaseMap.values());

  // If loading or no marks recorded yet, don't show an empty broken card
  if (loading) {
    return null;
  }

  if (items.length === 0) {
    return null;
  }

  // Calculate cumulative score
  let totalAwarded = 0;
  let totalMax = 0;
  items.forEach((item) => {
    totalAwarded += item.score;
    totalMax += item.maxMarks;
  });

  const cumulativePct =
    totalMax > 0 ? ((totalAwarded / totalMax) * 100).toFixed(1) : '0';

  return (
    <div style={{ marginBottom: 20 }}>
      <AppCard
        title="Academic Evaluations & Milestone Marks"
        subtitle="Official continuous evaluation milestone marks recorded by your faculty mentor."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(({ ev, score, maxMarks }) => {
            const pct = maxMarks > 0 ? ((score / maxMarks) * 100).toFixed(0) : '0';
            const hasRubrics = ev.rubricScores && Object.keys(ev.rubricScores).length > 0;
            const isExpanded = expandedEvId === ev.id;
            const phaseNum = LargestRemainderAllocator.resolvePhaseNumber(ev.phaseName);
            const criteria = LargestRemainderAllocator.getCriteriaForPhase(phaseNum);

            return (
              <div
                key={ev.id}
                style={{
                  padding: '14px 18px',
                  borderRadius: 14,
                  background: '#FFFFFF',
                  border: '1px solid #D5E8EF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 850, color: '#102F48' }}>
                        {ev.phaseName}
                      </span>
                      <span className="badge badge-confirmed">
                        {score} / {maxMarks} Marks
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#7992A1', marginTop: 3 }}>
                      Evaluated by {ev.evaluatorName || 'Faculty Mentor'}
                      {ev.createdAt && (
                        <>
                          {' · '}
                          {new Date(ev.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </>
                      )}
                    </div>
                    {ev.remarks && (
                      <div style={{ fontSize: 12.5, color: '#31566E', marginTop: 6 }}>
                        "{ev.remarks}"
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#0B4D88' }}>
                      {pct}%
                    </div>
                    {hasRubrics && (
                      <button
                        type="button"
                        onClick={() => setExpandedEvId(isExpanded ? null : ev.id)}
                        style={{
                          background: 'rgba(11, 77, 136, 0.08)',
                          border: 'none',
                          borderRadius: 8,
                          padding: '6px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#0B4D88',
                          cursor: 'pointer',
                        }}
                      >
                        <Sparkles size={12} />
                        {isExpanded ? 'Hide Rubric' : 'View Rubric'}
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Rubric Breakdown Drawer */}
                {hasRubrics && isExpanded && (
                  <div
                    style={{
                      marginTop: 6,
                      padding: '10px 14px',
                      background: '#F8FAFC',
                      borderRadius: 10,
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                      Criteria-level Marks Breakdown:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                      {criteria.map((c) => {
                        const cScore = ev.rubricScores?.[c.key];
                        if (cScore === undefined) return null;
                        return (
                          <div
                            key={c.key}
                            style={{
                              background: '#FFFFFF',
                              padding: '8px 10px',
                              borderRadius: 8,
                              border: '1px solid #E2E8F0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>{c.label}</span>
                            <span style={{ fontSize: 11.5, fontWeight: 800, color: '#0B4D88' }}>
                              {cScore} / {c.maxMarks}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Cumulative Score Summary Banner */}
          {totalMax > 0 && items.length > 1 && (
            <div
              style={{
                marginTop: 6,
                padding: '12px 18px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #0B4D88, #18719E)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color="#43D6EE" />
                <span style={{ fontSize: 13, fontWeight: 800 }}>
                  Cumulative Academic Score
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 17, fontWeight: 900 }}>
                  {totalAwarded} / {totalMax} Marks
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'rgba(255, 255, 255, 0.2)',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {cumulativePct}%
                </span>
              </div>
            </div>
          )}
        </div>
      </AppCard>
    </div>
  );
};
