import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileText,
  Users,
  CheckCircle2,
  Loader2,
  Inbox,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AppointmentService } from '../../services/appointment.service';
import { AppointmentModel } from '../../types';
import { AppCard } from '../../components/common/AppCard';
import { StatusPill } from '../../components/common/StatusPill';

export const QueueMonitorScreen: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<AppointmentModel[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConfirmed = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await AppointmentService.fetchConfirmedForMentor(user.id);
      setAppointments(data);
    } catch (e) {
      console.error('Failed to load confirmed queue:', e);
      showToast('Could not load queue schedule', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadConfirmed();
  }, [loadConfirmed]);

  const handlePrevDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() - 1);
    setSelectedDate(next);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // Filter meetings for the selected day
  const dayAppointments = appointments.filter((a) => {
    const slot = new Date(a.confirmedSlot || a.requestedSlot);
    return isSameDay(slot, selectedDate);
  });

  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8 AM to 6 PM

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 8px 40px' }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/mentor/triage')}
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
        Back to Triage
      </button>

      {/* Date Header Controls */}
      <AppCard style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 2px 0' }}>
              Consultation Queue & Timeline
            </h1>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
              Chronological schedule of confirmed meetings with student teams.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handlePrevDay}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'white',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={handleToday}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                background: 'white',
                border: '1px solid var(--color-border)',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--color-primary)',
                cursor: 'pointer',
              }}
            >
              Today
            </button>

            <div
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                minWidth: '150px',
                textAlign: 'center',
              }}
            >
              {selectedDate.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>

            <button
              onClick={handleNextDay}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'white',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </AppCard>

      {/* Hourly Schedule Timeline */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-secondary)' }}>
          <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px' }} />
          <div>Loading timeline...</div>
        </div>
      ) : dayAppointments.length === 0 ? (
        <AppCard style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Inbox size={48} color="var(--color-text-secondary)" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
            No Consultations Scheduled for this Day
          </h3>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
            Switch dates or confirm pending requests from the triage queue.
          </p>
        </AppCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {hours.map((hour) => {
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            const hourLabel = `${displayHour.toString().padStart(2, '0')}:00 ${period}`;

            // Check if any appointment is in this hour
            const inHourApts = dayAppointments.filter((a) => {
              const d = new Date(a.confirmedSlot || a.requestedSlot);
              return d.getHours() === hour;
            });

            if (inHourApts.length === 0) return null;

            return (
              <div
                key={hour}
                style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start',
                }}
              >
                {/* Time badge */}
                <div
                  style={{
                    width: '80px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--color-text-secondary)',
                    paddingTop: '8px',
                    textAlign: 'right',
                  }}
                >
                  {hourLabel}
                </div>

                {/* Event Cards in this Hour */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {inHourApts.map((apt) => (
                    <AppCard
                      key={apt.id}
                      style={{
                        padding: '16px 20px',
                        borderLeft: '4px solid var(--color-confirmed)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                              {apt.teamName || `Team #${apt.teamId}`}
                            </span>
                            <StatusPill status={apt.status} />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                            <Clock size={13} color="var(--color-primary)" />
                            {new Date(apt.confirmedSlot || apt.requestedSlot).toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>

                          {apt.agenda && (
                            <div style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                              <strong>Agenda:</strong> {apt.agenda}
                            </div>
                          )}
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
                            background: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 3px 0 #07335c',
                          }}
                        >
                          <FileText size={14} />
                          Open Ledger
                        </button>
                      </div>
                    </AppCard>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
