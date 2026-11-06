import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Calendar, FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTeam } from '../../context/TeamContext';
import { LedgerService } from '../../services/ledger.service';
import { MeetingLedgerEntry } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { AppCard } from '../../components/common/AppCard';

export const StudentLedgerScreen: React.FC = () => {
  const { team } = useTeam();
  const navigate = useNavigate();

  const [entries, setEntries] = useState<MeetingLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLedger = useCallback(async () => {
    if (!team) return;
    try {
      setLoading(true);
      const data = await LedgerService.fetchLedger(team.id);
      setEntries(data);
    } catch (e) {
      console.error('Error loading ledger:', e);
    } finally {
      setLoading(false);
    }
  }, [team]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  return (
    <div style={{ animation: 'pageIn 0.35s ease both' }}>
      <PageHeader
        eyebrow="OFFICIAL RECORDS"
        title="Meeting & Attendance Ledger"
        subtitle={`Official audit trail of mentor reviews, notes, and member attendance records for ${team?.teamName || 'your team'}.`}
        actions={
          <button
            onClick={() => navigate(-1)}
            className="btn btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={14} /> Back
          </button>
        }
      />

      <AppCard title="Logged Consultations (Read-Only)">
        {loading ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: '#7992A1' }}>
            Loading ledger records...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ padding: '36px 0', textAlign: 'center', color: '#7992A1', fontSize: 13 }}>
            No meeting records logged by your mentor yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: '18px 22px',
                  borderRadius: 16,
                  border: '1px solid #D5E8EF',
                  background: '#FFFFFF',
                  boxShadow: '0 4px 14px rgba(12, 64, 101, 0.05)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                    marginBottom: 12,
                    paddingBottom: 10,
                    borderBottom: '1px solid #D5E8EF',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        background: '#0B4D88',
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      Meeting #{entry.meetingNumber}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#102F48' }}>
                      {new Date(entry.meetingDate).toLocaleDateString([], {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <span className="badge badge-confirmed">AUDIT VERIFIED</span>
                </div>

                {/* Summary Notes */}
                {entry.summaryNotes && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: '#F4FAFC',
                      border: '1px solid #D5E8EF',
                      marginBottom: 14,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 850, color: '#0B4D88', textTransform: 'uppercase' }}>
                      Mentor Notes & Discussion Summary
                    </div>
                    <div style={{ fontSize: 12.5, color: '#31566E', marginTop: 4, lineHeight: 1.5 }}>
                      "{entry.summaryNotes}"
                    </div>
                  </div>
                )}

                {/* Attendance List */}
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 850, color: '#7992A1', textTransform: 'uppercase', marginBottom: 8 }}>
                    Student Attendance Roster
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                    {entry.attendance.map((att) => (
                      <div
                        key={att.studentId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: att.isPresent ? '#E4F6F0' : '#FBECEB',
                          border: `1px solid ${att.isPresent ? 'rgba(50, 143, 129, 0.3)' : 'rgba(179, 79, 92, 0.3)'}`,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#102F48' }}>
                            {att.studentName}
                          </div>
                          <div style={{ fontSize: 10.5, color: '#5E788C' }}>{att.usn}</div>
                        </div>

                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 900,
                            color: att.isPresent ? '#328F81' : '#B34F5C',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {att.isPresent ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {att.isPresent ? 'Present' : 'Absent'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  );
};
