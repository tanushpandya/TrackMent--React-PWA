import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
  Plus,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Clock,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LedgerService } from '../../services/ledger.service';
import { TeamService } from '../../services/team.service';
import { MeetingLedgerEntry, ProfileModel } from '../../types';
import { AppCard } from '../../components/common/AppCard';
import { Modal } from '../../components/common/Modal';

export const EntryLedgerScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const teamIdParam = searchParams.get('teamId');
  const teamNameParam = searchParams.get('teamName');
  const appointmentIdParam = searchParams.get('appointmentId');

  const teamId = teamIdParam ? parseInt(teamIdParam, 10) : null;
  const teamName = teamNameParam || (teamId ? `Team #${teamId}` : 'Team');
  const appointmentId = appointmentIdParam ? parseInt(appointmentIdParam, 10) : null;

  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [ledgerEntries, setLedgerEntries] = useState<MeetingLedgerEntry[]>([]);
  const [members, setMembers] = useState<ProfileModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Log meeting modal state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [summaryNotes, setSummaryNotes] = useState<string>('');
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  const [togglingMap, setTogglingMap] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    if (!teamId) return;
    try {
      setLoading(true);
      const [entries, roster] = await Promise.all([
        LedgerService.fetchLedger(teamId),
        TeamService.fetchTeamMembers(teamId),
      ]);
      setLedgerEntries(entries);
      setMembers(roster);

      // Initialize default attendance for roster
      const initAtt: Record<string, boolean> = {};
      roster.forEach((m: ProfileModel) => {
        initAtt[m.id] = true;
      });
      setAttendanceMap(initAtt);
    } catch (e) {
      console.error('Error loading ledger:', e);
      showToast('Could not load ledger entries', 'error');
    } finally {
      setLoading(false);
    }
  }, [teamId, showToast]);

  useEffect(() => {
    loadData();
    if (appointmentId) {
      setIsLogModalOpen(true);
    }
  }, [loadData, appointmentId]);

  // Count absences per student across all ledger entries
  const absenceCounts: Record<string, number> = {};
  ledgerEntries.forEach((entry) => {
    entry.attendance.forEach((att) => {
      if (!att.isPresent) {
        absenceCounts[att.studentId] = (absenceCounts[att.studentId] || 0) + 1;
      }
    });
  });

  const handleToggleAttendance = async (meetingId: string, studentId: string, currentPresent: boolean) => {
    const key = `${meetingId}_${studentId}`;
    setTogglingMap((prev) => ({ ...prev, [key]: true }));
    try {
      await LedgerService.toggleAttendance(meetingId, studentId, !currentPresent);
      await loadData();
    } catch (e: any) {
      showToast(e?.message || 'Could not update attendance status.', 'error');
    } finally {
      setTogglingMap((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleLogMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) return;

    setIsSubmittingLog(true);
    try {
      await LedgerService.logMeeting({
        teamId,
        appointmentId,
        meetingDate: new Date(meetingDate).toISOString(),
        summaryNotes: summaryNotes.trim(),
        attendance: attendanceMap,
      });

      showToast('Consultation and student attendance successfully logged!', 'success');
      setIsLogModalOpen(false);
      setSummaryNotes('');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to log consultation.', 'error');
    } finally {
      setIsSubmittingLog(false);
    }
  };

  if (!teamId) {
    return (
      <div style={{ padding: '60px 16px', textAlign: 'center' }}>
        <p>No team specified for entry ledger.</p>
        <button onClick={() => navigate('/mentor/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 8px 40px' }}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'white',
          border: '1px solid var(--color-border)',
          padding: '8px 16px',
          borderRadius: '9999px',
          color: 'var(--color-text-secondary)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '20px',
          boxShadow: 'var(--shadow-subtle)',
        }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Header with Log Meeting Action */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 4px 0' }}>
            Entry Ledger — {teamName}
          </h1>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
            Official audit trail of mentor reviews, discussion notes, and member attendance records.
          </p>
        </div>

        <button
          onClick={() => setIsLogModalOpen(true)}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 3px 0 #07335c',
          }}
        >
          <Plus size={16} />
          Log Consultation
        </button>
      </div>

      {/* Entries List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-secondary)' }}>
          <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px' }} />
          <div>Loading ledger entries...</div>
        </div>
      ) : ledgerEntries.length === 0 ? (
        <AppCard style={{ textAlign: 'center', padding: '60px 24px' }}>
          <FileText size={48} color="var(--color-text-secondary)" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
            No Consultation Entries Recorded Yet
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
            Click "Log Consultation" above to record notes and mark attendance for this team.
          </p>
          <button
            onClick={() => setIsLogModalOpen(true)}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Log First Meeting
          </button>
        </AppCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {ledgerEntries.map((entry) => (
            <AppCard key={entry.id} style={{ padding: '20px' }}>
              {/* Meeting Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--color-border)',
                  paddingBottom: '12px',
                  marginBottom: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      background: 'var(--color-primary)',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: '12px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    Meeting #{entry.meetingNumber}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} />
                    {new Date(entry.meetingDate).toLocaleDateString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Summary Notes */}
              {entry.summaryNotes && (
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'var(--color-canvas)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    fontSize: '13.5px',
                    color: 'var(--color-text-primary)',
                    marginBottom: '16px',
                    lineHeight: 1.45,
                  }}
                >
                  <strong>Discussion Notes:</strong> {entry.summaryNotes}
                </div>
              )}

              {/* Attendance Matrix */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Student Attendance
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
                  {entry.attendance.map((att) => {
                    const isRedFlagged = (absenceCounts[att.studentId] || 0) >= 2;
                    const isToggling = togglingMap[`${entry.id}_${att.studentId}`];

                    return (
                      <div
                        key={att.studentId}
                        style={{
                          padding: '10px 12px',
                          background: 'white',
                          borderRadius: '8px',
                          border: isRedFlagged ? '1.5px solid var(--color-danger)' : '1px solid var(--color-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {att.studentName}
                            {isRedFlagged && (
                              <span title="Flagged: >= 2 absences in ledger">
                                <AlertTriangle size={13} color="var(--color-danger)" />
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                            {att.usn || 'USN N/A'}
                          </div>
                        </div>

                        {/* Interactive Toggle Button */}
                        <button
                          disabled={isToggling}
                          onClick={() => handleToggleAttendance(entry.id, att.studentId, att.isPresent)}
                          title="Click to toggle attendance"
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: att.isPresent ? 'rgba(50, 143, 129, 0.12)' : 'rgba(179, 79, 92, 0.12)',
                            color: att.isPresent ? 'var(--color-confirmed)' : 'var(--color-danger)',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {isToggling ? (
                            <Loader2 size={12} className="spin" />
                          ) : att.isPresent ? (
                            <>
                              <CheckCircle2 size={12} /> Present
                            </>
                          ) : (
                            <>
                              <XCircle size={12} /> Absent
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </AppCard>
          ))}
        </div>
      )}

      {/* Log Consultation Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title={`Log Consultation — ${teamName}`}
      >
        <form onSubmit={handleLogMeetingSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
              Meeting Date *
            </label>
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-border)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
              Discussion Summary & Action Items
            </label>
            <textarea
              rows={4}
              value={summaryNotes}
              onChange={(e) => setSummaryNotes(e.target.value)}
              placeholder="e.g. Reviewed sprint 2 deliverables, recommended refactoring database schema, next consultation set for next week..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-border)',
                fontSize: '13px',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Student Attendance Checklist */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
              Mark Attendance ({members.length} members)
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              {members.map((m) => {
                const isPresent = attendanceMap[m.id] !== false;
                return (
                  <div
                    key={m.id}
                    onClick={() =>
                      setAttendanceMap((prev) => ({
                        ...prev,
                        [m.id]: !isPresent,
                      }))
                    }
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: isPresent ? 'rgba(50, 143, 129, 0.08)' : 'rgba(179, 79, 92, 0.08)',
                      border: '1px solid',
                      borderColor: isPresent ? 'var(--color-confirmed)' : 'var(--color-danger)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {m.fullName}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginLeft: '6px' }}>
                        ({m.usn || 'USN N/A'})
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: isPresent ? 'var(--color-confirmed)' : 'var(--color-danger)',
                      }}
                    >
                      {isPresent ? 'PRESENT' : 'ABSENT'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setIsLogModalOpen(false)}
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
              disabled={isSubmittingLog}
              style={{
                padding: '10px',
                borderRadius: '8px',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                cursor: isSubmittingLog ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 3px 0 #07335c',
              }}
            >
              {isSubmittingLog ? <Loader2 size={16} className="spin" /> : 'Save Entry'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
