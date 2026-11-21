import React, { useState } from 'react';
import { Award, CheckCircle2, Loader2, User, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { TeamService } from '../../services/team.service';
import { ProfileModel, TeamEvaluation, TeamModel } from '../../types';
import { Modal } from '../../components/common/Modal';
import { LargestRemainderAllocator } from '../../utils/largestRemainderAllocator';

interface IndividualMemberMarksDialogProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamModel;
  member: ProfileModel;
  evaluations: TeamEvaluation[];
  onSaved: () => void;
}

export const IndividualMemberMarksDialog: React.FC<IndividualMemberMarksDialogProps> = ({
  isOpen,
  onClose,
  team,
  member,
  evaluations,
  onSaved,
}) => {
  const [phase1Marks, setPhase1Marks] = useState<string>('');
  const [phase2Marks, setPhase2Marks] = useState<string>('');
  const [phase3Marks, setPhase3Marks] = useState<string>('');
  const [phase1Rubric, setPhase1Rubric] = useState<Record<string, number>>({});
  const [phase2Rubric, setPhase2Rubric] = useState<Record<string, number>>({});
  const [phase3Rubric, setPhase3Rubric] = useState<Record<string, number>>({});
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [remarks, setRemarks] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTotalChange = (phase: number, valStr: string) => {
    setError(null);
    const maxVal = phase === 1 ? 40 : phase === 2 ? 60 : 100;
    const num = parseFloat(valStr);

    if (phase === 1) {
      setPhase1Marks(valStr);
      if (!isNaN(num) && num >= 0 && num <= maxVal) {
        setPhase1Rubric(LargestRemainderAllocator.allocate('Phase 1', num));
      }
    } else if (phase === 2) {
      setPhase2Marks(valStr);
      if (!isNaN(num) && num >= 0 && num <= maxVal) {
        setPhase2Rubric(LargestRemainderAllocator.allocate('Phase 2', num));
      }
    } else {
      setPhase3Marks(valStr);
      if (!isNaN(num) && num >= 0 && num <= maxVal) {
        setPhase3Rubric(LargestRemainderAllocator.allocate('Phase 3', num));
      }
    }
  };

  const handleCriterionChange = (phase: number, key: string, valStr: string) => {
    setError(null);
    const num = parseFloat(valStr) || 0;
    if (phase === 1) {
      const next = { ...phase1Rubric, [key]: num };
      setPhase1Rubric(next);
      setPhase1Marks(LargestRemainderAllocator.calculateTotal(1, next).toString());
    } else if (phase === 2) {
      const next = { ...phase2Rubric, [key]: num };
      setPhase2Rubric(next);
      setPhase2Marks(LargestRemainderAllocator.calculateTotal(2, next).toString());
    } else {
      const next = { ...phase3Rubric, [key]: num };
      setPhase3Rubric(next);
      setPhase3Marks(LargestRemainderAllocator.calculateTotal(3, next).toString());
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phase1Marks && !phase2Marks && !phase3Marks) {
      setError('Please enter marks for at least one phase.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (phase1Marks) {
        const val = parseFloat(phase1Marks);
        if (val < 0 || val > 40) throw new Error('Phase 1 marks must be between 0 and 40.');
        await TeamService.recordTeamEvaluation({
          teamId: team.id,
          phaseName: 'Phase 1',
          totalMarks: val,
          maxMarks: 40,
          memberMarks: { [member.id]: val },
          remarks: remarks.trim() || undefined,
          rubricScores: Object.keys(phase1Rubric).length > 0 ? phase1Rubric : undefined,
        });
      }
      if (phase2Marks) {
        const val = parseFloat(phase2Marks);
        if (val < 0 || val > 60) throw new Error('Phase 2 marks must be between 0 and 60.');
        await TeamService.recordTeamEvaluation({
          teamId: team.id,
          phaseName: 'Phase 2',
          totalMarks: val,
          maxMarks: 60,
          memberMarks: { [member.id]: val },
          remarks: remarks.trim() || undefined,
          rubricScores: Object.keys(phase2Rubric).length > 0 ? phase2Rubric : undefined,
        });
      }
      if (phase3Marks) {
        const val = parseFloat(phase3Marks);
        if (val < 0 || val > 100) throw new Error('Phase 3 marks must be between 0 and 100.');
        await TeamService.recordTeamEvaluation({
          teamId: team.id,
          phaseName: 'Phase 3',
          totalMarks: val,
          maxMarks: 100,
          memberMarks: { [member.id]: val },
          remarks: remarks.trim() || undefined,
          rubricScores: Object.keys(phase3Rubric).length > 0 ? phase3Rubric : undefined,
        });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record individual marks.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderPhaseCard = (
    phaseNum: number,
    phaseName: string,
    maxM: number,
    val: string,
    rubric: Record<string, number>
  ) => {
    const isExpanded = expandedPhase === phaseNum;
    const criteria = LargestRemainderAllocator.getCriteriaForPhase(phaseNum);

    return (
      <div
        style={{
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          padding: '12px',
          background: 'var(--color-canvas)',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {phaseName}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              RVCE Scale: Max {maxM} Marks
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="number"
              step="0.5"
              min="0"
              max={maxM}
              value={val}
              onChange={(e) => handleTotalChange(phaseNum, e.target.value)}
              placeholder="0"
              style={{
                width: '70px',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1.5px solid var(--color-border)',
                fontSize: '13px',
                fontWeight: 700,
                textAlign: 'center',
              }}
            />
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>/ {maxM}</span>
            <button
              type="button"
              onClick={() => setExpandedPhase(isExpanded ? null : phaseNum)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#64748b',
              }}
              title="Toggle rubric breakdown"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div style={{ marginTop: '10px', borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} color="#0284c7" />
              <span>Criterion-level allocation (Hamilton-Hare):</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {criteria.map((c) => (
                <div
                  key={c.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    background: 'white',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span style={{ fontSize: '11.5px', color: '#334155', fontWeight: 500 }}>
                    {c.label} ({c.maxMarks}M)
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={c.maxMarks}
                    value={rubric[c.key] !== undefined ? rubric[c.key] : ''}
                    onChange={(e) => handleCriterionChange(phaseNum, c.key, e.target.value)}
                    style={{
                      width: '50px',
                      padding: '4px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      fontSize: '11.5px',
                      textAlign: 'center',
                      fontWeight: 600,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Grade Member — ${member.fullName}`}>
      <form onSubmit={handleSave}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            background: 'var(--color-canvas)',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            marginBottom: '14px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--color-primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            {member.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {member.fullName}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {member.usn ? `USN: ${member.usn} • ` : ''}{team.teamName}
            </div>
          </div>
        </div>

        {/* Phase evaluations */}
        <div style={{ marginBottom: '14px' }}>
          {renderPhaseCard(1, 'Phase 1: Synopsis & Formulation', 40, phase1Marks, phase1Rubric)}
          {renderPhaseCard(2, 'Phase 2: Milestone Review', 60, phase2Marks, phase2Rubric)}
          {renderPhaseCard(3, 'Phase 3: Final Demo & Evaluation', 100, phase3Marks, phase3Rubric)}
        </div>

        {/* Remarks */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            Remarks / Feedback (Optional)
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Excellent domain knowledge and exemplary code quality."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1.5px solid var(--color-border)',
              fontSize: '13px',
              color: 'var(--color-text-primary)',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
        </div>

        {error && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(179, 79, 92, 0.08)',
              border: '1px solid var(--color-danger)',
              color: 'var(--color-danger)',
              fontSize: '12.5px',
              fontWeight: 600,
              marginBottom: '14px',
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px',
              borderRadius: '8px',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            style={{
              padding: '10px',
              borderRadius: '8px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              fontWeight: 700,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 3px 0 #07335c',
            }}
          >
            {isSaving ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
            Save Marks
          </button>
        </div>
      </form>
    </Modal>
  );
};
