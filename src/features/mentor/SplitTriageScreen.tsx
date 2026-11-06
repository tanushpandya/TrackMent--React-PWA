import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  RefreshCw,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AppointmentService } from '../../services/appointment.service';
import { AppointmentModel } from '../../types';
import { AppCard } from '../../components/common/AppCard';
import { StatusPill } from '../../components/common/StatusPill';
import { Modal } from '../../components/common/Modal';

export const SplitTriageScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [pendingList, setPendingList] = useState<AppointmentModel[]>([]);
  const [confirmedList, setConfirmedList] = useState<AppointmentModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Reschedule Modal
  const [rescheduleApt, setRescheduleApt] = useState<AppointmentModel | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('11:00');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Actioning IDs
  const [actingId, setActingId] = useState<number | null>(null);

  const loadAppointments = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [pending, confirmed] = await Promise.all([
        AppointmentService.fetchPendingForMentor(user.id),
        AppointmentService.fetchConfirmedForMentor(user.id),
      ]);
      setPendingList(pending);
      setConfirmedList(confirmed);
    } catch (e) {
      console.error('Error loading appointments for mentor:', e);
      showToast('Could not load appointment triage list', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleConfirm = async (aptId: number) => {
    setActingId(aptId);
    try {
      await AppointmentService.confirm(aptId);
      showToast('Meeting slot confirmed! Added to schedule.', 'success');
      await loadAppointments();
    } catch (e: any) {
      showToast(e?.message || 'Could not confirm appointment.', 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (aptId: number) => {
    setActingId(aptId);
    try {
      await AppointmentService.reject(aptId, 'Mentor unavailable at this slot.');
      showToast('Meeting request declined.', 'info');
      await loadAppointments();
    } catch (e: any) {
      showToast(e?.message || 'Could not reject appointment.', 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleApt || !newDate || !newTime) return;

    setIsRescheduling(true);
    try {
      const slotUtc = new Date(`${newDate}T${newTime}:00`).toISOString();
      await AppointmentService.reschedule(rescheduleApt.id, slotUtc, rescheduleNotes.trim());
      showToast('Reschedule proposal sent to team for confirmation!', 'success');
      setRescheduleApt(null);
      setNewDate('');
      setRescheduleNotes('');
      await loadAppointments();
    } catch (e: any) {
      showToast(e?.message || 'Could not reschedule appointment.', 'error');
    } finally {
      setIsRescheduling(false);
    }
  };

  const rawFacultyName = (profile?.fullName || 'Faculty Mentor').trim();
  const facultyDisplayName = rawFacultyName.toLowerCase().startsWith('prof')
    ? rawFacultyName
    : `Prof. ${rawFacultyName}`;
  const facultyDept = profile?.department ? `${profile.department} • RVCE` : 'RVCE Faculty Mentor';

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 8px 40px' }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/mentor/dashboard')}
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
        Back to Dashboard
      </button>

      {/* Sub-Header Faculty Bar */}
      <AppCard style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'var(--color-primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '17px',
              }}
            >
              {(rawFacultyName || 'M')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {facultyDisplayName}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
                {facultyDept}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => navigate('/mentor/queue-monitor')}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'white',
                border: '1.5px solid var(--color-border)',
                color: 'var(--color-primary)',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Calendar size={14} />
              Open Queue Monitor
            </button>
            <button
              onClick={loadAppointments}
              title="Refresh"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'white',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </AppCard>

      {/* Page Title */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 4px 0' }}>
          Meeting Queue & Triage
        </h1>
        <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
          Review incoming appointment requests, confirm consultations, or propose rescheduled timings.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-secondary)' }}>
          <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px' }} />
          <div>Loading appointment queue...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Section 1: Pending Appointment Requests */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Clock size={18} color="var(--color-pending)" />
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                Pending Requests ({pendingList.length})
              </h2>
            </div>

            {pendingList.length === 0 ? (
              <AppCard style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }}>
                No pending appointment requests awaiting your review.
              </AppCard>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingList.map((apt) => (
                  <AppCard key={apt.id} style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                            {apt.teamName || `Team #${apt.teamId}`}
                          </span>
                          <StatusPill status={apt.status} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={14} color="var(--color-primary)" />
                            {new Date(apt.requestedSlot).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={14} color="var(--color-primary)" />
                            {new Date(apt.requestedSlot).toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {apt.agenda && (
                          <div
                            style={{
                              padding: '10px 14px',
                              background: 'var(--color-canvas)',
                              borderRadius: '8px',
                              border: '1px solid var(--color-border)',
                              fontSize: '13px',
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            <strong>Agenda:</strong> {apt.agenda}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          disabled={actingId === apt.id}
                          onClick={() => handleReject(apt.id)}
                          style={{
                            padding: '8px 14px',
                            background: 'transparent',
                            color: 'var(--color-danger)',
                            border: '1.5px solid var(--color-danger)',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Decline
                        </button>

                        <button
                          disabled={actingId === apt.id}
                          onClick={() => {
                            setRescheduleApt(apt);
                            setNewDate(new Date(apt.requestedSlot).toISOString().split('T')[0]);
                          }}
                          style={{
                            padding: '8px 14px',
                            background: 'white',
                            color: 'var(--color-pending)',
                            border: '1.5px solid var(--color-pending)',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Reschedule
                        </button>

                        <button
                          disabled={actingId === apt.id}
                          onClick={() => handleConfirm(apt.id)}
                          style={{
                            padding: '8px 16px',
                            background: 'var(--color-confirmed)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 3px 0 #1b534b',
                          }}
                        >
                          {actingId === apt.id ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                          Confirm Slot
                        </button>
                      </div>
                    </div>
                  </AppCard>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Confirmed Upcoming Consultations */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="var(--color-confirmed)" />
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                  Confirmed Consultations ({confirmedList.length})
                </h2>
              </div>
              <button
                onClick={() => navigate('/mentor/queue-monitor')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                View Timeline <ChevronRight size={15} />
              </button>
            </div>

            {confirmedList.length === 0 ? (
              <AppCard style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--color-text-secondary)' }}>
                No confirmed consultations scheduled yet.
              </AppCard>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {confirmedList.map((apt) => (
                  <AppCard
                    key={apt.id}
                    style={{
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {apt.teamName || `Team #${apt.teamId}`}
                        </span>
                        <StatusPill status={apt.status} />
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        Confirmed for:{' '}
                        <strong>
                          {new Date(apt.confirmedSlot || apt.requestedSlot).toLocaleString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </strong>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        navigate(
                          `/mentor/ledger?teamId=${apt.teamId}&teamName=${encodeURIComponent(
                            apt.teamName || 'Team'
                          )}&appointmentId=${apt.id}`
                        )
                      }
                      style={{
                        padding: '8px 14px',
                        background: 'white',
                        border: '1.5px solid var(--color-border)',
                        borderRadius: '8px',
                        color: 'var(--color-primary)',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <FileText size={14} />
                      Log in Ledger
                    </button>
                  </AppCard>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      <Modal
        isOpen={rescheduleApt !== null}
        onClose={() => setRescheduleApt(null)}
        title={`Reschedule Consultation — ${rescheduleApt?.teamName || ''}`}
      >
        {rescheduleApt && (
          <form onSubmit={handleRescheduleSubmit}>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              Propose an alternative consultation time slot to <strong>{rescheduleApt.teamName}</strong>.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  Proposed Date *
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
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

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  Proposed Time *
                </label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
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
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                Note to Team (Optional)
              </label>
              <textarea
                rows={3}
                value={rescheduleNotes}
                onChange={(e) => setRescheduleNotes(e.target.value)}
                placeholder="e.g. Please bring your phase 1 documentation..."
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setRescheduleApt(null)}
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
                disabled={isRescheduling}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  cursor: isRescheduling ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 3px 0 #07335c',
                }}
              >
                {isRescheduling ? <Loader2 size={16} className="spin" /> : 'Send Proposal'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
