import React from 'react';
import { Award, CheckCircle2, Clock, Info, ShieldCheck } from 'lucide-react';
import { TeamEvaluation } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface StudentAcademicMarksCardProps {
  evaluations: TeamEvaluation[];
  isMarksVisible: boolean;
  loading?: boolean;
}

export const StudentAcademicMarksCard: React.FC<StudentAcademicMarksCardProps> = ({
  evaluations,
  isMarksVisible,
  loading = false,
}) => {
  const { user, profile, isMentor } = useAuth();

  // Filter out internal system records like __MARKS_VISIBILITY__
  const realEvals = (evaluations || []).filter((e) => {
    const p = (e.phaseName || '').toLowerCase().trim();
    return p && !p.startsWith('__') && !p.includes('visibility');
  });

  // Extract Phase 1, Phase 2, Phase 3
  const p1 =
    realEvals.find(
      (e) =>
        (e.phaseName.includes('1') || e.phaseName.toLowerCase().includes('synopsis')) &&
        e.memberMarks &&
        ((user?.id && e.memberMarks[user.id] !== undefined) ||
          (profile?.usn && e.memberMarks[profile.usn] !== undefined))
    ) ||
    realEvals.find(
      (e) => e.phaseName.includes('1') || e.phaseName.toLowerCase().includes('synopsis')
    );

  const p2 =
    realEvals.find(
      (e) =>
        (e.phaseName.includes('2') || e.phaseName.toLowerCase().includes('milestone')) &&
        e.memberMarks &&
        ((user?.id && e.memberMarks[user.id] !== undefined) ||
          (profile?.usn && e.memberMarks[profile.usn] !== undefined))
    ) ||
    realEvals.find(
      (e) => e.phaseName.includes('2') || e.phaseName.toLowerCase().includes('milestone')
    );

  const p3 =
    realEvals.find(
      (e) =>
        (e.phaseName.includes('3') || e.phaseName.toLowerCase().includes('final')) &&
        e.memberMarks &&
        ((user?.id && e.memberMarks[user.id] !== undefined) ||
          (profile?.usn && e.memberMarks[profile.usn] !== undefined))
    ) ||
    realEvals.find(
      (e) => e.phaseName.includes('3') || e.phaseName.toLowerCase().includes('final')
    );

  // Any additional evaluations that aren't p1, p2, or p3
  const extraEvals = realEvals.filter(
    (e) => e.id !== p1?.id && e.id !== p2?.id && e.id !== p3?.id
  );

  const getScore = (ev?: TeamEvaluation | null): number | null => {
    if (!ev) return null;
    if (user?.id && ev.memberMarks && ev.memberMarks[user.id] !== undefined) {
      return Number(ev.memberMarks[user.id]);
    }
    if (profile?.usn && ev.memberMarks && ev.memberMarks[profile.usn] !== undefined) {
      return Number(ev.memberMarks[profile.usn]);
    }
    return Number(ev.totalMarks || 0);
  };

  const p1Score = getScore(p1);
  const p2Score = getScore(p2);
  const p3Score = getScore(p3);

  const p1Max = p1?.maxMarks || 50;
  const p2Max = p2?.maxMarks || 100;
  const p3Max = p3?.maxMarks || 100;

  let totalAwarded = 0;
  let totalMax = 0;
  if (p1Score !== null) {
    totalAwarded += p1Score;
    totalMax += p1Max;
  }
  if (p2Score !== null) {
    totalAwarded += p2Score;
    totalMax += p2Max;
  }
  if (p3Score !== null) {
    totalAwarded += p3Score;
    totalMax += p3Max;
  }

  // Mentor or explicit visible setting allows viewing
  const showMarks = isMarksVisible || isMentor;

  return (
    <div
      style={{
        borderRadius: 18,
        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(244, 250, 251, 0.92))',
        border: '1px solid rgba(255, 255, 255, 0.95)',
        boxShadow: '0 12px 32px rgba(12, 64, 101, 0.12)',
        padding: '22px',
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: 'linear-gradient(90deg, #07518d 0%, #28bdca 100%)',
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: showMarks ? '#E6F7F2' : '#FFF4DE',
              color: showMarks ? '#1D8A74' : '#B87818',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Award size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 900, color: '#102F48', margin: 0 }}>
              Academic Evaluations & Milestone Marks
            </h3>
            <div style={{ fontSize: 11.5, color: '#5E788C', marginTop: 2 }}>
              Official continuous evaluation marks recorded by your faculty mentor.
            </div>
          </div>
        </div>

        <div>
          {showMarks ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 8,
                background: '#E4F6F0',
                border: '1px solid #A7E4D3',
                color: '#137962',
                fontSize: 11,
                fontWeight: 850,
              }}
            >
              <CheckCircle2 size={13} /> Released by Faculty
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 8,
                background: '#FFF4DE',
                border: '1px solid #F6D8A2',
                color: '#9E6700',
                fontSize: 11,
                fontWeight: 850,
              }}
            >
              <Clock size={13} /> Under Faculty Review
            </span>
          )}
        </div>
      </div>

      {/* Body content */}
      {loading ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: '#7992A1', fontSize: 13 }}>
          Loading evaluation marks...
        </div>
      ) : !showMarks ? (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 12,
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Info size={18} color="#64748B" />
          <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.45 }}>
            Phase evaluation marks are under faculty review and will be visible once released by your faculty mentor.
          </div>
        </div>
      ) : realEvals.length === 0 ? (
        <div
          style={{
            padding: '20px 16px',
            borderRadius: 12,
            background: '#F4FAFC',
            border: '1px solid #D5E8EF',
            textAlign: 'center',
            color: '#5E788C',
            fontSize: 13,
          }}
        >
          No milestone marks recorded yet. Consultations and milestone presentations will be graded by your faculty mentor.
        </div>
      ) : (
        <div>
          {/* Phase cards grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: 12,
              marginBottom: 16,
            }}
          >
            {/* Phase 1 */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 14,
                border: '1px solid #D5E8EF',
                background: p1Score !== null ? '#FFFFFF' : '#F9FBFC',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#7992A1', letterSpacing: '0.5px' }}>
                  PHASE 1
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 850, color: '#102F48', marginTop: 2 }}>
                  Synopsis & Architecture
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                {p1Score !== null ? (
                  <>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#0B4D88' }}>
                      {p1Score} <span style={{ fontSize: 13, color: '#7992A1', fontWeight: 600 }}>/ {p1Max}</span>
                    </div>
                    <span className="badge badge-confirmed" style={{ fontSize: 11 }}>
                      {((p1Score / p1Max) * 100).toFixed(0)}%
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 12.5, color: '#7992A1', fontStyle: 'italic' }}>
                    Not evaluated yet
                  </span>
                )}
              </div>
              {p1?.remarks && (
                <div style={{ fontSize: 11.5, color: '#5E788C', marginTop: 8, fontStyle: 'italic' }}>
                  "{p1.remarks}"
                </div>
              )}
            </div>

            {/* Phase 2 */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 14,
                border: '1px solid #D5E8EF',
                background: p2Score !== null ? '#FFFFFF' : '#F9FBFC',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#7992A1', letterSpacing: '0.5px' }}>
                  PHASE 2
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 850, color: '#102F48', marginTop: 2 }}>
                  Milestone Implementation
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                {p2Score !== null ? (
                  <>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#0B4D88' }}>
                      {p2Score} <span style={{ fontSize: 13, color: '#7992A1', fontWeight: 600 }}>/ {p2Max}</span>
                    </div>
                    <span className="badge badge-confirmed" style={{ fontSize: 11 }}>
                      {((p2Score / p2Max) * 100).toFixed(0)}%
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 12.5, color: '#7992A1', fontStyle: 'italic' }}>
                    Not evaluated yet
                  </span>
                )}
              </div>
              {p2?.remarks && (
                <div style={{ fontSize: 11.5, color: '#5E788C', marginTop: 8, fontStyle: 'italic' }}>
                  "{p2.remarks}"
                </div>
              )}
            </div>

            {/* Phase 3 */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 14,
                border: '1px solid #D5E8EF',
                background: p3Score !== null ? '#FFFFFF' : '#F9FBFC',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#7992A1', letterSpacing: '0.5px' }}>
                  PHASE 3
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 850, color: '#102F48', marginTop: 2 }}>
                  Final Defense & Viva
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                {p3Score !== null ? (
                  <>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#0B4D88' }}>
                      {p3Score} <span style={{ fontSize: 13, color: '#7992A1', fontWeight: 600 }}>/ {p3Max}</span>
                    </div>
                    <span className="badge badge-confirmed" style={{ fontSize: 11 }}>
                      {((p3Score / p3Max) * 100).toFixed(0)}%
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 12.5, color: '#7992A1', fontStyle: 'italic' }}>
                    Upcoming
                  </span>
                )}
              </div>
              {p3?.remarks && (
                <div style={{ fontSize: 11.5, color: '#5E788C', marginTop: 8, fontStyle: 'italic' }}>
                  "{p3.remarks}"
                </div>
              )}
            </div>
          </div>

          {/* Extra custom evaluations if any */}
          {extraEvals.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {extraEvals.map((ev) => {
                const sc = getScore(ev);
                return (
                  <div
                    key={ev.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: '1px solid #D5E8EF',
                      background: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#102F48' }}>{ev.phaseName}</div>
                      {ev.remarks && (
                        <div style={{ fontSize: 11.5, color: '#5E788C', marginTop: 2 }}>"{ev.remarks}"</div>
                      )}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#0B4D88' }}>
                      {sc} / {ev.maxMarks}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cumulative Score Summary Banner */}
          {totalMax > 0 && (
            <div
              style={{
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
                <span style={{ fontSize: 13, fontWeight: 800 }}>Your Cumulative Academic Score</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18, fontWeight: 900 }}>
                  {totalAwarded} / {totalMax}
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
                  {((totalAwarded / totalMax) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
