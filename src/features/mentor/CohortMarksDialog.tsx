import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { TeamService } from '../../services/team.service';
import { ProfileModel, TeamEvaluation, TeamModel } from '../../types';
import { Modal } from '../../components/common/Modal';
import { LargestRemainderAllocator, RubricCriterion } from '../../utils/largestRemainderAllocator';

interface CohortMarksDialogProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamModel;
  members: ProfileModel[];
  evaluations: TeamEvaluation[];
  onSaved: () => void;
}

export const CohortMarksDialog: React.FC<CohortMarksDialogProps> = ({
  isOpen,
  onClose,
  team,
  members,
  evaluations,
  onSaved,
}) => {
  const [selectedPhase, setSelectedPhase] = useState<'Phase 1' | 'Phase 2' | 'Phase 3'>('Phase 1');
  const [marks, setMarks] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [showRubricDetails, setShowRubricDetails] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phaseNumber = selectedPhase === 'Phase 1' ? 1 : selectedPhase === 'Phase 2' ? 2 : 3;
  const maxMarksNum = phaseNumber === 1 ? 40 : phaseNumber === 2 ? 60 : 100;
  const criteria = LargestRemainderAllocator.getCriteriaForPhase(phaseNumber);

  // Re-initialize when phase changes
  useEffect(() => {
    setMarks('');
    setRubricScores({});
    setError(null);
  }, [selectedPhase]);

  const handleTotalMarksChange = (valStr: string) => {
    setMarks(valStr);
    setError(null);
    const num = parseFloat(valStr);
    if (!isNaN(num) && num >= 0 && num <= maxMarksNum) {
      const allocated = LargestRemainderAllocator.allocate(selectedPhase, num);
      setRubricScores(allocated);
    } else {
      setRubricScores({});
    }
  };

  const handleCriterionScoreChange = (criterionKey: string, valStr: string) => {
    const num = parseFloat(valStr) || 0;
    const criterion = criteria.find((c) => c.key === criterionKey);
    const maxVal = criterion?.maxMarks || maxMarksNum;

    const clamped = Math.max(0, Math.min(maxVal, num));
    const nextScores = { ...rubricScores, [criterionKey]: clamped };
    setRubricScores(nextScores);

    const calculatedTotal = LargestRemainderAllocator.calculateTotal(phaseNumber, nextScores);
    setMarks(calculatedTotal.toString());
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const marksNum = parseFloat(marks);

    if (isNaN(marksNum) || marksNum < 0 || marksNum > maxMarksNum) {
      setError(`Marks must be between 0 and ${maxMarksNum} for ${selectedPhase}.`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const memberMarks: Record<string, number> = {};
      members.forEach((m) => {
        memberMarks[m.id] = marksNum;
      });

      await TeamService.recordTeamEvaluation({
        teamId: team.id,
        phaseName: selectedPhase,
        totalMarks: marksNum,
        maxMarks: maxMarksNum,
        memberMarks,
        remarks: remarks.trim() || undefined,
        rubricScores: Object.keys(rubricScores).length > 0 ? rubricScores : undefined,
      });

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record cohort marks.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Record Cohort Marks — ${team.teamName}`}>
      <form onSubmit={handleSave}>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
          Award cohort marks to all <strong>{members.length}</strong> team members simultaneously. Evaluation conforms to
          the official RVCE Experiential Learning 200-mark scheme.
        </p>

        {/* Phase selector tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {(['Phase 1', 'Phase 2', 'Phase 3'] as const).map((p) => {
            const pMax = p === 'Phase 1' ? 40 : p === 'Phase 2' ? 60 : 100;
            const isSel = selectedPhase === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedPhase(p)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid',
                  borderColor: isSel ? 'var(--color-primary)' : 'var(--color-border)',
                  background: isSel ? 'rgba(11, 77, 136, 0.1)' : 'white',
                  color: isSel ? 'var(--color-primary)' : 'var(--color-text-primary)',
                  fontSize: '13px',
                  fontWeight: isSel ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div>{p}</div>
                <div style={{ fontSize: '10px', color: isSel ? 'var(--color-primary)' : '#64748b' }}>
                  Max {pMax}M
                </div>
              </button>
            );
          })}
        </div>

        {/* Marks & Max Marks */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              Phase Total Marks *
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max={maxMarksNum}
              value={marks}
              onChange={(e) => handleTotalMarksChange(e.target.value)}
              placeholder={`0 - ${maxMarksNum}`}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-border)',
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              Institutional Max Scale
            </label>
            <input
              type="text"
              readOnly
              value={`${maxMarksNum} Marks (RVCE Scheme)`}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-border)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#64748b',
                background: '#f8fafc',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Rubrics Criteria Breakdown Section */}
        <div
          style={{
            marginBottom: '16px',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            background: 'var(--color-canvas)',
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            onClick={() => setShowRubricDetails(!showRubricDetails)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '12.5px',
              color: 'var(--color-text-primary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="#0284c7" />
              <span>RVCE Canonical Rubric Criteria ({selectedPhase})</span>
            </div>
            {showRubricDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showRubricDetails && (
            <div style={{ padding: '0 14px 14px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                Auto-allocated via Hamilton-Hare algorithm. You can fine-tune individual criterion scores below:
              </p>
              {criteria.map((c) => {
                const curVal = rubricScores[c.key] !== undefined ? rubricScores[c.key] : '';
                return (
                  <div
                    key={c.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      gap: '8px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {c.label}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                        Max {c.maxMarks} Marks
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={c.maxMarks}
                        value={curVal}
                        onChange={(e) => handleCriterionScoreChange(c.key, e.target.value)}
                        placeholder="0"
                        style={{
                          width: '60px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          textAlign: 'center',
                        }}
                      />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>/ {c.maxMarks}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Remarks */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            Remarks / Evaluation Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Strong architecture presentation, comprehensive literature survey."
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
            Save Cohort Marks
          </button>
        </div>
      </form>
    </Modal>
  );
};
