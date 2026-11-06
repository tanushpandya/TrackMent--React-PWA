import React, { useState } from 'react';
import { Award, CheckCircle2, Loader2, User } from 'lucide-react';
import { TeamService } from '../../services/team.service';
import { ProfileModel, TeamEvaluation, TeamModel } from '../../types';
import { Modal } from '../../components/common/Modal';

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
  const [remarks, setRemarks] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        await TeamService.recordTeamEvaluation({
          teamId: team.id,
          phaseName: 'Phase 1',
          totalMarks: val,
          maxMarks: 50,
          memberMarks: { [member.id]: val },
          remarks: remarks.trim() || undefined,
        });
      }
      if (phase2Marks) {
        const val = parseFloat(phase2Marks);
        await TeamService.recordTeamEvaluation({
          teamId: team.id,
          phaseName: 'Phase 2',
          totalMarks: val,
          maxMarks: 100,
          memberMarks: { [member.id]: val },
          remarks: remarks.trim() || undefined,
        });
      }
      if (phase3Marks) {
        const val = parseFloat(phase3Marks);
        await TeamService.recordTeamEvaluation({
          teamId: team.id,
          phaseName: 'Phase 3',
          totalMarks: val,
          maxMarks: 100,
          memberMarks: { [member.id]: val },
          remarks: remarks.trim() || undefined,
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Grade ${member.fullName}`}>
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
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(11, 77, 136, 0.1)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            {(member.fullName || '?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {member.fullName}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {member.usn || 'USN N/A'} • {member.branch || 'Branch N/A'}
            </div>
          </div>
        </div>

        {/* Phase 1 (out of 50) */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
            <span>Phase 1: Synopsis & Architecture</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Max: 50</span>
          </div>
          <input
            type="number"
            step="0.5"
            value={phase1Marks}
            onChange={(e) => setPhase1Marks(e.target.value)}
            placeholder="Score out of 50"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1.5px solid var(--color-border)',
              fontSize: '13.5px',
              outline: 'none',
            }}
          />
        </div>

        {/* Phase 2 (out of 100) */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
            <span>Phase 2: Milestone Implementation</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Max: 100</span>
          </div>
          <input
            type="number"
            step="0.5"
            value={phase2Marks}
            onChange={(e) => setPhase2Marks(e.target.value)}
            placeholder="Score out of 100"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1.5px solid var(--color-border)',
              fontSize: '13.5px',
              outline: 'none',
            }}
          />
        </div>

        {/* Phase 3 (out of 100) */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
            <span>Phase 3: Final Defense & CIE</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>Max: 100</span>
          </div>
          <input
            type="number"
            step="0.5"
            value={phase3Marks}
            onChange={(e) => setPhase3Marks(e.target.value)}
            placeholder="Score out of 100"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1.5px solid var(--color-border)',
              fontSize: '13.5px',
              outline: 'none',
            }}
          />
        </div>

        {/* Remarks */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            Individual Remarks (Optional)
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Specific feedback regarding this student's individual contribution..."
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1.5px solid var(--color-border)',
              fontSize: '13px',
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
