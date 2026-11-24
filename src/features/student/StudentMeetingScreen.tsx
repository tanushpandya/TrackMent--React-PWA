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
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { AppointmentService } from '../../services/appointment.service';
import { supabase } from '../../services/supabase';
import { AppointmentModel } from '../../types';

const HALF_HOUR_SLOTS = [
  '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM',
  '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'
];

export const StudentMeetingScreen: React.FC = () => {
  const { user, isLead } = useAuth();
  const { team, mentor, refreshTeam } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [upcomingMeeting, setUpcomingMeeting] = useState<AppointmentModel | null>(null);
  const [allMeetings, setAllMeetings] = useState<AppointmentModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Availability voting
  const [myVote, setMyVote] = useState<'available' | 'wont_come' | 'reschedule' | null>(() => {
    return (localStorage.getItem('apt_member_vote') as any) || null;
  });

  // Slot picker & booking state
  const [selectedSlot, setSelectedSlot] = useState('11:00 AM');
  const [requestDate, setRequestDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [meetingType, setMeetingType] = useState('Milestone 2 Defense & Demo');
  const [agenda, setAgenda] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Booked slots mock
  const bookedSlots = new Set(['09:30 AM', '03:00 PM']);

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

    if (!team) return;
    const channel = supabase
      .channel(`realtime:student_appointments_${team.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `team_id=eq.${team.id}` }, () => {
        loadAppointments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [team, loadAppointments]);

  const handleVote = (vote: 'available' | 'wont_come' | 'reschedule') => {
    setMyVote(vote);
    localStorage.setItem('apt_member_vote', vote);
    const labels = {
      available: 'Available ✓',
      wont_come: "Won't Come ✗",
      reschedule: 'Prefer Reschedule ↺',
    };
    showToast(`Availability recorded: ${labels[vote]}`, 'info');
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !user) return;
    if (!agenda.trim()) {
      showToast('Please provide an agenda for the consultation.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const combinedDateTime = new Date(`${requestDate}T11:00:00`).toISOString();
      await AppointmentService.request({
        teamId: team.id,
        requestedBy: user.id,
        mentorId: team.mentorId || '00000000-0000-0000-0000-000000000001',
        requestedSlot: combinedDateTime,
        agenda: `[${selectedSlot} - ${meetingType}] ${agenda.trim()}`,
      });

      showToast(`Slot ${selectedSlot} booked and request dispatched to mentor.`, 'success');
      setAgenda('');
      await loadAppointments();
    } catch (err: any) {
      showToast(err?.message || 'Failed to request appointment.', 'error');
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Top Header Card */}
      <div className="surface-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D63ED] text-[10px] font-bold font-mono">
              CONSULTATIONS
            </span>
            <h1 className="text-xl font-bold text-[#0A2540] tracking-tight">
              Schedule Faculty Consultation
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Book 30-minute review slots with {mentor?.fullName || 'your assigned faculty mentor'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/student/ledger')}
            className="h-8 px-3 rounded-lg border border-[#D6E4EE] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            Verified Ledger Logs →
          </button>
        </div>
      </div>

      {/* 2-Column Desktop Grid (7 cols Slot Picker & Form / 5 cols Upcoming & History) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (7 of 12 cols): 30-Min Interactive Slot Picker & Booking Form */}
        <div className="lg:col-span-7 surface-card p-5 space-y-5">
          <div>
            <h2 className="text-[14.5px] font-bold text-[#0A2540]">
              Available 30-Minute Consultation Slots
            </h2>
            <p className="text-xs text-slate-500">
              Select an open green slot for your upcoming milestone evaluation
            </p>
          </div>

          {/* Slots Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {HALF_HOUR_SLOTS.map((slot) => {
              const isBooked = bookedSlots.has(slot);
              const isSelected = selectedSlot === slot;

              return (
                <button
                  key={slot}
                  type="button"
                  disabled={isBooked}
                  onClick={() => setSelectedSlot(slot)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-[#1D63ED] bg-[#EFF6FF] ring-2 ring-[#1D63ED]/20 shadow-2xs'
                      : isBooked
                      ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                      : 'border-[#D6E4EE] bg-white hover:border-[#BFDBFE] hover:bg-slate-50/70 text-[#0A2540]'
                  }`}
                >
                  <div className="text-xs font-mono font-bold">{slot}</div>
                  <div className="mt-1">
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] font-bold font-mono ${
                        isSelected
                          ? 'bg-[#1D63ED] text-white'
                          : isBooked
                          ? 'bg-slate-200 text-slate-500'
                          : 'bg-[#ECFDF5] text-[#15803D]'
                      }`}
                    >
                      {isSelected ? 'Selected' : isBooked ? 'Booked' : 'Available'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Booking Details Form */}
          <form onSubmit={handleRequestSubmit} className="pt-4 border-t border-slate-100 space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Consultation Details ({selectedSlot})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#D6E4EE] bg-white text-xs text-[#0A2540] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={meetingType}
                  onChange={(e) => setMeetingType(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#D6E4EE] bg-white text-xs font-semibold text-[#0A2540] outline-none"
                >
                  <option value="Milestone 2 Defense & Demo">Milestone 2 Defense &amp; Demo</option>
                  <option value="Synopsis Check">Synopsis Scope Review</option>
                  <option value="Final CIE Viva">Final Comprehensive Defense</option>
                  <option value="Remedial Guidance">Remedial Architecture Check</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Agenda / Discussion Scope *
              </label>
              <textarea
                rows={3}
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                placeholder="e.g. Presenting live SHAP feature attribution demo on real-time packet captures..."
                className="w-full p-2.5 rounded-lg border border-[#D6E4EE] bg-white text-xs text-[#0A2540] outline-none focus:border-[#1D63ED] leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-9 rounded-lg bg-[#0F4C81] hover:bg-[#1D63ED] text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Booking &amp; Notify Mentor</span>
            </button>
          </form>
        </div>

        {/* Right Column (5 of 12 cols): Confirmed Consultation & History */}
        <div className="lg:col-span-5 space-y-5">
          {/* Confirmed Consultation Card */}
          <div className="surface-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-[#0A2540]">Active Consultation</h3>
                <p className="text-xs text-slate-500">Upcoming milestone review with mentor</p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                  upcomingMeeting
                    ? 'bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0]'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                {upcomingMeeting ? `${upcomingMeeting.status} ✓` : 'None Scheduled'}
              </span>
            </div>

            {upcomingMeeting ? (
              <div className="p-3.5 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5]/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0A2540]">
                    {new Date(upcomingMeeting.confirmedSlot || upcomingMeeting.requestedSlot).toLocaleDateString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })} • {new Date(upcomingMeeting.confirmedSlot || upcomingMeeting.requestedSlot).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-[#15803D]">
                    {mentor?.department || 'CS Dept'}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-snug">
                  {upcomingMeeting.agenda || 'Milestone consultation with faculty mentor.'}
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-[#D6E4EE] bg-slate-50/50 text-center text-xs text-slate-500">
                No active consultation scheduled. Pick a slot on the left to schedule a review.
              </div>
            )}

            {/* Member Availability Poll (only shown when an active meeting exists) */}
            {upcomingMeeting && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="text-xs font-semibold text-slate-700">Your Attendance Availability:</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleVote('available')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                      myVote === 'available'
                        ? 'bg-[#15803D] text-white border-[#15803D] font-bold shadow-2xs'
                        : 'bg-white text-slate-600 border-[#D6E4EE] hover:bg-slate-50'
                    }`}
                  >
                    Available ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVote('wont_come')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                      myVote === 'wont_come'
                        ? 'bg-[#BE123C] text-white border-[#BE123C] font-bold shadow-2xs'
                        : 'bg-white text-slate-600 border-[#D6E4EE] hover:bg-slate-50'
                    }`}
                  >
                    Can't Attend
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVote('reschedule')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                      myVote === 'reschedule'
                        ? 'bg-[#B45309] text-white border-[#B45309] font-bold shadow-2xs'
                        : 'bg-white text-slate-600 border-[#D6E4EE] hover:bg-slate-50'
                    }`}
                  >
                    Reschedule ↺
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Past Consultations History */}
          <div className="surface-card p-5 space-y-3.5">
            <h3 className="text-[14px] font-bold text-[#0A2540]">Past Consultation Logs</h3>
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {allMeetings.length === 0 ? (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-center text-xs text-slate-400">
                  No past consultation logs recorded yet.
                </div>
              ) : (
                allMeetings.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl border border-[#D6E4EE] bg-white hover:bg-slate-50/70 transition-colors space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0A2540]">{m.agenda || 'Consultation'}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#ECFDF5] text-[#15803D]">
                        {m.status}
                      </span>
                    </div>
                    <div className="text-slate-500 font-mono text-[11px]">
                      {new Date(m.confirmedSlot || m.requestedSlot).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
