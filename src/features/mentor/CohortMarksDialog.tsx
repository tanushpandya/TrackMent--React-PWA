import React, { useState } from 'react';
import { Award, CheckCircle2, Loader2, X } from 'lucide-react';
import { TeamService } from '../../services/team.service';
import { ProfileModel, TeamEvaluation, TeamModel } from '../../types';
import { Modal } from '../../components/common/Modal';

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
  const [maxMarks, setMaxMarks] = useState<string>('50');
  const [remarks, setRemarks] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const marksNum = parseFloat(marks);
    const maxMarksNum = parseFloat(maxMarks) || 50;

    if (isNaN(marksNum) || marksNum < 0 || marksNum > maxMarksNum) {
      setError(`Marks must be between 0 and ${maxMarksNum}.`);
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
          Award cohort marks to all <strong>{members.length}</strong> team members simultaneously.
        </p>

        {/* Phase selector tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {(['Phase 1', 'Phase 2', 'Phase 3'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setSelectedPhase(p);
                setMaxMarks(p === 'Phase 1' ? '50' : '100');
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid',
                borderColor: selectedPhase === p ? 'var(--color-primary)' : 'var(--color-border)',
                background: selectedPhase === p ? 'rgba(11, 77, 136, 0.1)' : 'white',
                color: selectedPhase === p ? 'var(--color-primary)' : 'var(--color-text-primary)',
                fontSize: '13px',
                fontWeight: selectedPhase === p ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Marks & Max Marks */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              Marks Awarded
            </label>
            <input
              type="number"
              step="0.5"
              value={marks}
              onChange={(e) => {
                setMarks(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. 42"
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
              Maximum Marks
            </label>
            <input
              type="number"
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value)}
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
        </div>

        {/* Remarks */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            Remarks / Evaluation Notes (Optional)
          </label>
          <textarea
            rows={3}
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
