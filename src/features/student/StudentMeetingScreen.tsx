import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Plus,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Check,
  History,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { AppointmentService } from '../../services/appointment.service';
import { AppointmentModel } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { AppCard } from '../../components/common/AppCard';
import { StatusPill } from '../../components/common/StatusPill';
import { Modal } from '../../components/common/Modal';
import { MascotCompanionBanner } from '../../components/mascot/MascotCompanionBanner';

export const StudentMeetingScreen: React.FC = () => {
  const { user, isLead } = useAuth();
  const { team, mentor, refreshTeam } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [upcomingMeeting, setUpcomingMeeting] = useState<AppointmentModel | null>(null);
  const [allMeetings, setAllMeetings] = useState<AppointmentModel[]>([]);
  const [loading, setLoading] = useState(true);

  // New Request Modal state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestDate, setRequestDate] = useState('');
  const [requestTime, setRequestTime] = useState('10:30');
  const [agenda, setAgenda] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);

  const loadAppointments = useCallback(async () => {
    if (!team) return;
    try {
      setLoading(true);
      const [latest, all] = await Promise.all([
        AppointmentService.fetchUpcomingForTeam(team.id),
        AppointmentService.fetchAllForTeam(team.id),
      ]);
      setUpcomingMeeting(latest);
      setAllMeetings(all);
    } catch (e) {
      console.error('Error loading meetings:', e);
    } finally {
      setLoading(false);
    }
  }, [team]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Set default request date to tomorrow
  useEffect(() => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    setRequestDate(tmrw.toISOString().split('T')[0]);
  }, []);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !user) return;
    if (!team.mentorId) {
      showToast('No mentor allocated to this team. Please request a mentor first.', 'error');
      return;
    }
    if (!agenda.trim()) {
      showToast('Please provide an agenda for the consultation.', 'error');
      return;
    }

    setRequestLoading(true);
    try {
      const combinedDateTime = new Date(`${requestDate}T${requestTime}:00`).toISOString();
      await AppointmentService.request({
        teamId: team.id,
        requestedBy: user.id,
        mentorId: team.mentorId,
        requestedSlot: combinedDateTime,
        agenda: agenda.trim(),
      });

      showToast('Meeting request dispatched to mentor! 📅', 'success');
      setIsRequestModalOpen(false);
      setAgenda('');
      loadAppointments();
    } catch (err: any) {
      showToast(err?.message || 'Failed to request appointment.', 'error');
    } finally {
      setRequestLoading(false);
    }
  };

  const handleAcceptReschedule = async (appointmentId: number) => {
    try {
      await AppointmentService.acceptReschedule(appointmentId);
      showToast('Rescheduled appointment accepted! Confirmed with mentor. ✅', 'success');
      loadAppointments();
    } catch (err: any) {
      showToast(err?.message || 'Failed to accept reschedule.', 'error');
    }
  };

  const handleCancelMeeting = async (appointmentId: number) => {
    if (!window.confirm('Are you sure you want to cancel this appointment request?')) return;
    try {
      await AppointmentService.cancel(appointmentId);
      showToast('Appointment cancelled.', 'info');
      loadAppointments();
    } catch (err: any) {
      showToast(err?.message || 'Failed to cancel appointment.', 'error');
    }
  };

  const isLeader = team && user && team.leaderId === user.id;

  return (
    <div style={{ animation: 'pageIn 0.35s ease both' }}>
      <PageHeader
        eyebrow="FACULTY GUIDANCE"
        title="Mentor Meetings"
        subtitle="Coordinate scheduled consultations, review agendas, and track feedback from your faculty mentor."
        actions={
          isLeader && team?.mentorId ? (
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} /> Request Consultation ↗
            </button>
          ) : undefined
        }
      />

      <MascotCompanionBanner
        defaultMood={
          upcomingMeeting?.status === 'CONFIRMED'
            ? 'excited'
            : upcomingMeeting?.status === 'RESCHEDULED'
            ? 'worried'
            : 'happy'
        }
        defaultMessage={
          upcomingMeeting?.status === 'CONFIRMED'
            ? 'Your mentor meeting is confirmed! Make sure your questions are ready.'
            : upcomingMeeting?.status === 'RESCHEDULED'
            ? 'Your mentor proposed a new time slot. Please review.'
            : 'Stay in close touch with your mentor to keep deliverables on track.'
        }
      />

      {/* 3-Stage Workflow Pill Progress */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 14,
            background: upcomingMeeting ? '#FFFFFF' : '#E5F3FA',
            border: upcomingMeeting ? '1px solid #D5E8EF' : '2px solid #0B4D88',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: upcomingMeeting ? '#328F81' : '#0B4D88',
              color: '#FFFFFF',
              display: 'grid',
              placeItems: 'center',
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            {upcomingMeeting ? '✓' : '1'}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#102F48' }}>Propose Agenda</div>
            <div style={{ fontSize: 11, color: '#7992A1' }}>Lead selects date & goals</div>
          </div>
        </div>

        <div
          style={{
            padding: '12px 16px',
            borderRadius: 14,
            background:
              upcomingMeeting?.status === 'REQUESTED' || upcomingMeeting?.status === 'RESCHEDULED'
                ? '#E5F3FA'
                : '#FFFFFF',
            border:
              upcomingMeeting?.status === 'REQUESTED' || upcomingMeeting?.status === 'RESCHEDULED'
                ? '2px solid #0B4D88'
                : '1px solid #D5E8EF',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background:
                upcomingMeeting?.status === 'CONFIRMED'
                  ? '#328F81'
                  : upcomingMeeting?.status === 'REQUESTED' || upcomingMeeting?.status === 'RESCHEDULED'
                  ? '#0B4D88'
                  : '#CBD5E1',
              color: '#FFFFFF',
              display: 'grid',
              placeItems: 'center',
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            {upcomingMeeting?.status === 'CONFIRMED' ? '✓' : '2'}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#102F48' }}>Mentor Review</div>
            <div style={{ fontSize: 11, color: '#7992A1' }}>Triage & slot confirmation</div>
          </div>
        </div>

        <div
          style={{
            padding: '12px 16px',
            borderRadius: 14,
            background: upcomingMeeting?.status === 'CONFIRMED' ? '#E4F6F0' : '#FFFFFF',
            border: upcomingMeeting?.status === 'CONFIRMED' ? '2px solid #328F81' : '1px solid #D5E8EF',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: upcomingMeeting?.status === 'CONFIRMED' ? '#328F81' : '#CBD5E1',
              color: '#FFFFFF',
              display: 'grid',
              placeItems: 'center',
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            3
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#102F48' }}>Appointed</div>
            <div style={{ fontSize: 11, color: '#7992A1' }}>Confirmed session & ledger</div>
          </div>
        </div>
      </div>

      {/* Active Consultation Hero Card */}
      {upcomingMeeting ? (
        <AppCard title="Current Active Consultation">
          <div
            style={{
              padding: '18px 22px',
              borderRadius: 16,
              background:
                upcomingMeeting.status === 'CONFIRMED'
                  ? 'linear-gradient(145deg, #F4FDF9, #FFFFFF)'
                  : upcomingMeeting.status === 'RESCHEDULED'
                  ? 'linear-gradient(145deg, #FFFBF0, #FFFFFF)'
                  : '#FFFFFF',
              border: `1px solid ${
                upcomingMeeting.status === 'CONFIRMED'
                  ? 'rgba(50, 143, 129, 0.3)'
                  : upcomingMeeting.status === 'RESCHEDULED'
                  ? 'rgba(166, 120, 39, 0.3)'
                  : '#D5E8EF'
              }`,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
                marginBottom: 14,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <Calendar size={18} color="#0B4D88" />
                  <span style={{ fontSize: 16, fontWeight: 900, color: '#102F48' }}>
                    {new Date(upcomingMeeting.confirmedSlot || upcomingMeeting.requestedSlot).toLocaleDateString([], {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#0B4D88' }}>
                    at{' '}
                    {new Date(upcomingMeeting.confirmedSlot || upcomingMeeting.requestedSlot).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#7992A1' }}>
                  Faculty Mentor: <strong>{mentor?.fullName || 'Assigned Mentor'}</strong> ({mentor?.department || 'RVCE'})
                </div>
              </div>
              <StatusPill status={upcomingMeeting.status} />
            </div>

            {/* Agenda block */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                background: '#F4FAFC',
                border: '1px solid #D5E8EF',
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 850, color: '#0B4D88', textTransform: 'uppercase' }}>
                Consultation Agenda
              </div>
              <div style={{ fontSize: 13, color: '#31566E', marginTop: 4, lineHeight: 1.5 }}>
                {upcomingMeeting.agenda}
              </div>
            </div>

            {/* Rescheduled Note & Accept Action */}
            {upcomingMeeting.status === 'RESCHEDULED' && (
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: 12,
                  background: '#FFF4D8',
                  border: '1px solid rgba(166, 120, 39, 0.35)',
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 850, color: '#997027' }}>
                  Mentor Proposed New Time Slot:
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#102F48', margin: '4px 0' }}>
                  {new Date(upcomingMeeting.confirmedSlot!).toLocaleString()}
                </div>
                {upcomingMeeting.mentorNotes && (
                  <div style={{ fontSize: 12.5, color: '#5E788C' }}>
                    Note from mentor: "{upcomingMeeting.mentorNotes}"
                  </div>
                )}
                {isLeader && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    <button
                      onClick={() => handleAcceptReschedule(upcomingMeeting.id)}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Check size={14} /> Accept Rescheduled Slot
                    </button>
                    <button
                      onClick={() => handleCancelMeeting(upcomingMeeting.id)}
                      className="btn btn-sm"
                    >
                      Decline & Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
              <button
                onClick={() => navigate('/student/ledger')}
                className="btn btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <FileText size={14} /> Open Meeting Ledger ↗
              </button>

              {isLeader && upcomingMeeting.status === 'REQUESTED' && (
                <button
                  onClick={() => handleCancelMeeting(upcomingMeeting.id)}
                  className="btn btn-sm"
                  style={{ color: '#B34F5C' }}
                >
                  <XCircle size={14} /> Cancel Request
                </button>
              )}
            </div>
          </div>
        </AppCard>
      ) : (
        <AppCard title="No Upcoming Consultation">
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#7992A1', fontSize: 13.5 }}>
            {mentor ? (
              <div>
                <p style={{ margin: '0 0 16px 0' }}>
                  Your team does not have any pending or confirmed meetings.
                </p>
                {isLeader ? (
                  <button onClick={() => setIsRequestModalOpen(true)} className="btn btn-primary">
                    <Plus size={16} /> Request Consultation with {mentor.fullName}
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: '#5E788C' }}>
                    Your Team Lead can request an appointment with {mentor.fullName}.
                  </span>
                )}
              </div>
            ) : (
              <div>
                <p style={{ margin: '0 0 16px 0' }}>
                  No faculty mentor has been allocated to your team yet.
                </p>
                {isLeader && (
                  <button onClick={() => navigate('/lead/browse-mentors')} className="btn btn-primary">
                    Browse Faculty Mentors ↗
                  </button>
                )}
              </div>
            )}
          </div>
        </AppCard>
      )}

      {/* History of Past Meetings */}
      <AppCard title="Meeting Consultation History" actionText="Ledger" onAction={() => navigate('/student/ledger')}>
        {allMeetings.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#7992A1', fontSize: 13 }}>
            No previous meeting records.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {allMeetings.map((m, idx) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderTop: idx > 0 ? '1px solid #D5E8EF' : 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#102F48' }}>{m.agenda}</div>
                  <div style={{ fontSize: 11.5, color: '#7992A1', marginTop: 2 }}>
                    {new Date(m.confirmedSlot || m.requestedSlot).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    · {new Date(m.confirmedSlot || m.requestedSlot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <StatusPill status={m.status} />
              </div>
            ))}
          </div>
        )}
      </AppCard>

      {/* Request Consultation Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Request Faculty Consultation"
        subtitle={`Schedule an academic review with ${mentor?.fullName || 'Faculty Mentor'}`}
      >
        <form onSubmit={handleRequestSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="req-date">Proposed Date</label>
              <input
                id="req-date"
                type="date"
                required
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="req-time">Proposed Time Slot</label>
              <input
                id="req-time"
                type="time"
                required
                value={requestTime}
                onChange={(e) => setRequestTime(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="req-agenda">Consultation Agenda</label>
            <textarea
              id="req-agenda"
              required
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              className="form-textarea"
              placeholder="e.g. Discuss Phase 2 architecture, review user evaluation test data, resolve database schema queries..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button type="button" onClick={() => setIsRequestModalOpen(false)} className="btn">
              Cancel
            </button>
            <button type="submit" disabled={requestLoading} className="btn btn-primary">
              {requestLoading ? 'Dispatching...' : 'Dispatch Request ↗'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
