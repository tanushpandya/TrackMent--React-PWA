import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  Plus,
  ArrowRight,
  Filter,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AppointmentService } from '../../services/appointment.service';
import { TeamService } from '../../services/team.service';
import { supabase } from '../../services/supabase';
import { AppointmentModel, TeamModel } from '../../types';

interface SlotAppointment {
  id?: number | string;
  timeSlot: string;
  teamName: string;
  projectTitle?: string;
  type?: string;
  agenda?: string;
  status: 'confirmed' | 'requested' | 'open';
}

const HALF_HOUR_SLOTS = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM'
];

const SCHEDULER_DAYS = [
  { key: '2026-11-16', shortLabel: 'Mon 16', fullLabel: 'Monday, 16 Nov 2026', tag: 'Past' },
  { key: '2026-11-17', shortLabel: 'Tue 17', fullLabel: 'Tuesday, 17 Nov 2026', tag: 'Past' },
  { key: '2026-11-18', shortLabel: 'Wed 18', fullLabel: 'Wednesday, 18 Nov 2026', tag: 'Past' },
  { key: '2026-11-19', shortLabel: 'Thu 19', fullLabel: 'Thursday, 19 Nov 2026', tag: 'Yesterday' },
  { key: '2026-11-20', shortLabel: 'Fri 20', fullLabel: 'Friday, 20 Nov 2026', tag: 'Today' },
  { key: '2026-11-21', shortLabel: 'Sat 21', fullLabel: 'Saturday, 21 Nov 2026', tag: 'Tomorrow' },
];

export const QueueMonitorScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeDayIdx, setActiveDayIdx] = useState(4); // Default Friday 20 Nov
  const [filterType, setFilterType] = useState<'all' | 'confirmed' | 'requested' | 'open'>('all');
  const [teams, setTeams] = useState<TeamModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [facultyActive, setFacultyActive] = useState(true);

  // Appointments schedule keyed by timeSlot
  const [schedule, setSchedule] = useState<Record<string, SlotAppointment>>({
    '11:00 AM': {
      id: 'apt-1',
      timeSlot: '11:00 AM',
      teamName: 'Change_The_World',
      projectTitle: 'EcoGrid — Microgrid Energy Balancing',
      type: 'Phase 2 Architecture Review',
      agenda: 'Milestone 2 Defense & live microgrid load balancing demo.',
      status: 'confirmed',
    },
    '02:00 PM': {
      id: 'apt-2',
      timeSlot: '02:00 PM',
      teamName: 'DRISHTI',
      projectTitle: 'DrishtiNet — Assistive Audio Navigation',
      type: 'Technical Consultation',
      agenda: 'Assistive spatial audio pipeline latency review.',
      status: 'requested',
    },
    '03:30 PM': {
      id: 'apt-3',
      timeSlot: '03:30 PM',
      teamName: 'BlackBox',
      projectTitle: 'Sentinel X — AI Intrusion Detection System',
      type: 'Milestone Review',
      agenda: 'SHAP explainability verification baseline discussion.',
      status: 'confirmed',
    },
  });

  // Booking Form State
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [bookingSlot, setBookingSlot] = useState('11:30 AM');
  const [bookingType, setBookingType] = useState('Milestone Review');
  const [bookingAgenda, setBookingAgenda] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  // Incoming Requests Queue
  const [pendingRequests, setPendingRequests] = useState([
    {
      id: 'req-1',
      teamName: 'DRISHTI',
      timeSlot: '02:00 PM',
      dayLabel: 'Friday, 20 Nov',
      agenda: 'Assistive spatial audio pipeline latency review with Dr. Badarinath.',
    },
    {
      id: 'req-2',
      teamName: 'KisanPulse',
      timeSlot: '04:30 PM',
      dayLabel: 'Friday, 20 Nov',
      agenda: 'Edge-AI pest detection dataset validation consultation.',
    },
  ]);

  const slot11Ref = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [mentorTeams, confirmedApts, pendingApts] = await Promise.all([
        TeamService.fetchMentorTeams(user.id),
        AppointmentService.fetchConfirmedForMentor(user.id),
        AppointmentService.fetchPendingForMentor(user.id),
      ]);

      setTeams(mentorTeams);
      if (mentorTeams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(mentorTeams[0].id.toString());
      }
    } catch (e) {
      console.error('Failed to load appointments:', e);
    } finally {
      setLoading(false);
    }
  }, [user, selectedTeamId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApproveRequest = async (reqId: string, timeSlot: string) => {
    const req = pendingRequests.find((r) => r.id === reqId);
    if (!req) return;

    setSchedule((prev) => ({
      ...prev,
      [timeSlot]: {
        id: reqId,
        timeSlot,
        teamName: req.teamName,
        type: 'Confirmed Consultation',
        agenda: req.agenda,
        status: 'confirmed',
      },
    }));

    setPendingRequests((prev) => prev.filter((r) => r.id !== reqId));
    showToast(`Approved appointment for ${req.teamName} at ${timeSlot}!`, 'success');
  };

  const handleRejectRequest = (reqId: string) => {
    const req = pendingRequests.find((r) => r.id === reqId);
    setPendingRequests((prev) => prev.filter((r) => r.id !== reqId));
    showToast(`Declined request from ${req?.teamName || 'team'}`, 'info');
  };

  const handleConfirmNewBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const teamObj = teams.find((t) => t.id.toString() === selectedTeamId) || {
      teamName: 'Change_The_World',
      projectTitle: 'EcoGrid — Microgrid Energy Balancing',
    };

    setSchedule((prev) => ({
      ...prev,
      [bookingSlot]: {
        id: 'apt-' + Date.now(),
        timeSlot: bookingSlot,
        teamName: teamObj.teamName,
        projectTitle: teamObj.projectTitle,
        type: bookingType,
        agenda: bookingAgenda || 'Milestone Review & Demonstration',
        status: 'confirmed',
      },
    }));

    setBookingAgenda('');
    showToast(`Appointment confirmed for ${teamObj.teamName} at ${bookingSlot}!`, 'success');
  };

  const handleFocus11AM = () => {
    if (slot11Ref.current) {
      slot11Ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      slot11Ref.current.classList.add('ring-2', 'ring-[#1D63ED]');
      setTimeout(() => {
        slot11Ref.current?.classList.remove('ring-2', 'ring-[#1D63ED]');
      }, 2000);
    }
  };

  const currentDay = SCHEDULER_DAYS[activeDayIdx];

  const confirmedCount = Object.values(schedule).filter((s) => s.status === 'confirmed').length;
  const requestedCount = pendingRequests.length;
  const openCount = HALF_HOUR_SLOTS.length - confirmedCount - requestedCount;

  const visibleSlots = HALF_HOUR_SLOTS.filter((time) => {
    const appt = schedule[time];
    if (filterType === 'confirmed') return appt?.status === 'confirmed';
    if (filterType === 'requested') return appt?.status === 'requested';
    if (filterType === 'open') return !appt || appt.status === 'open';
    return true;
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Top Faculty Status Strip */}
      <div className="surface-card rounded-xl p-4 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#0A2540] text-white text-sm font-bold flex items-center justify-center shrink-0 font-mono">
            {(profile?.fullName || 'FM')
              .trim()
              .split(/\s+/)
              .map((p) => p[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[15px] font-bold text-[#0A2540]">
                {profile?.fullName || 'Faculty Mentor'}
                {profile?.department ? ` — ${profile.department}` : ''}
              </h1>
              <button
                type="button"
                onClick={() => setFacultyActive(!facultyActive)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors ${
                  facultyActive
                    ? 'bg-[#ECFDF5] text-[#15803D] border-[#A7F3D0]'
                    : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${facultyActive ? 'bg-[#15803D]' : 'bg-[#B45309]'}`} />
                <span>{facultyActive ? 'Active' : 'In Review'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Faculty Consultation Queue &amp; 30-Minute Milestone Review Slots</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="h-9 px-3 rounded-lg bg-[#FFF1F2] text-[#BE123C] border border-[#FECDD3] text-xs font-semibold inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#BE123C]" />
            <span>Attendance Red Flags: Monitor • 0</span>
          </span>
          <button
            onClick={() => navigate('/mentor/ledger')}
            className="h-9 px-3.5 rounded-lg bg-[#1D63ED] hover:bg-[#1752C9] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <span>+ Log New Meeting</span>
          </button>
        </div>
      </div>

      {/* Date Switcher & Filter Control Bar */}
      <div className="surface-card rounded-xl p-4 space-y-3.5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Date Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center h-9 rounded-lg border border-[#D6E4EE] bg-white overflow-hidden shadow-2xs">
              <button
                disabled={activeDayIdx === 0}
                onClick={() => setActiveDayIdx((prev) => Math.max(0, prev - 1))}
                className="px-3 h-full text-slate-600 hover:bg-slate-50 disabled:opacity-35 border-r border-[#D6E4EE] text-xs font-bold"
              >
                &lt;
              </button>
              <div className="px-3.5 text-xs font-bold text-[#0A2540]">
                {currentDay.fullLabel} <span className="text-[#1D63ED] font-semibold">({currentDay.tag})</span>
              </div>
              <button
                disabled={activeDayIdx === SCHEDULER_DAYS.length - 1}
                onClick={() => setActiveDayIdx((prev) => Math.min(SCHEDULER_DAYS.length - 1, prev + 1))}
                className="px-3 h-full text-slate-600 hover:bg-slate-50 disabled:opacity-35 border-l border-[#D6E4EE] text-xs font-bold"
              >
                &gt;
              </button>
            </div>

            {/* Quick Day Selector Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              {SCHEDULER_DAYS.map((d, idx) => (
                <button
                  key={d.key}
                  onClick={() => setActiveDayIdx(idx)}
                  className={`h-7 px-2.5 rounded-md text-xs font-semibold transition-all ${
                    activeDayIdx === idx
                      ? 'bg-white text-[#1D63ED] shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-[#0A2540]'
                  }`}
                >
                  {d.shortLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Focus Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleFocus11AM}
              className="h-9 px-3 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] hover:bg-blue-100 text-[#1D63ED] text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Focus 11:00 AM</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={`h-7 px-2.5 rounded-md text-xs font-semibold transition-colors ${
              filterType === 'all'
                ? 'bg-[#1D63ED] text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Slots ({HALF_HOUR_SLOTS.length})
          </button>
          <button
            onClick={() => setFilterType('confirmed')}
            className={`h-7 px-2.5 rounded-md text-xs font-semibold border transition-colors ${
              filterType === 'confirmed'
                ? 'bg-[#ECFDF5] text-[#15803D] border-[#A7F3D0] font-bold'
                : 'bg-white text-slate-600 border-[#D6E4EE] hover:bg-slate-50'
            }`}
          >
            Confirmed ({confirmedCount})
          </button>
          <button
            onClick={() => setFilterType('requested')}
            className={`h-7 px-2.5 rounded-md text-xs font-semibold border transition-colors ${
              filterType === 'requested'
                ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A] font-bold'
                : 'bg-white text-slate-600 border-[#D6E4EE] hover:bg-slate-50'
            }`}
          >
            Requested ({requestedCount})
          </button>
          <button
            onClick={() => setFilterType('open')}
            className={`h-7 px-2.5 rounded-md text-xs font-semibold border transition-colors ${
              filterType === 'open'
                ? 'bg-blue-50 text-[#1D63ED] border-blue-200 font-bold'
                : 'bg-white text-slate-600 border-[#D6E4EE] hover:bg-slate-50'
            }`}
          >
            Open Slots ({openCount})
          </button>
        </div>
      </div>

      {/* 2-Column Desktop Split (68% Timeline / 32% Sidebar -> 8 cols / 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left (68% -> 8 of 12 cols): 30-Minute Timeline from 08:00 AM to 06:00 PM */}
        <div className="lg:col-span-8 surface-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-[14.5px] font-bold text-[#0A2540]">
                Timeline Schedule ({currentDay.fullLabel})
              </h2>
              <p className="text-xs text-slate-500">30-minute consultation intervals from 08:00 AM to 06:00 PM</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              {visibleSlots.length} Slots
            </span>
          </div>

          <div className="space-y-2.5">
            {visibleSlots.map((timeSlot) => {
              const appt = schedule[timeSlot];
              const is11AM = timeSlot === '11:00 AM';

              if (appt && appt.status === 'confirmed') {
                return (
                  <div
                    key={timeSlot}
                    ref={is11AM ? slot11Ref : undefined}
                    className="p-3.5 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="px-2.5 py-1 rounded-md bg-[#15803D] text-white font-mono font-bold text-xs shrink-0">
                        {timeSlot}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[13.5px] text-[#0A2540]">{appt.teamName}</span>
                          <span className="px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] text-[10px] font-bold font-mono">
                            Confirmed ✓
                          </span>
                        </div>
                        {appt.projectTitle && (
                          <div className="text-xs text-slate-600 line-clamp-1">{appt.projectTitle}</div>
                        )}
                        <p className="text-xs text-slate-500">{appt.agenda}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => navigate('/mentor/ledger')}
                        className="h-8 px-3 rounded-lg border border-[#A7F3D0] bg-white hover:bg-emerald-50 text-xs font-semibold text-[#15803D] transition-colors"
                      >
                        Ledger Log →
                      </button>
                    </div>
                  </div>
                );
              }

              if (appt && appt.status === 'requested') {
                return (
                  <div
                    key={timeSlot}
                    className="p-3.5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="px-2.5 py-1 rounded-md bg-[#B45309] text-white font-mono font-bold text-xs shrink-0">
                        {timeSlot}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[13.5px] text-[#0A2540]">{appt.teamName}</span>
                          <span className="px-2 py-0.5 rounded bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] text-[10px] font-bold font-mono">
                            Pending Request
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{appt.agenda}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveRequest(appt.id?.toString() || 'req-1', timeSlot)}
                        className="h-8 px-3 rounded-lg bg-[#15803D] hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectRequest(appt.id?.toString() || 'req-1')}
                        className="h-8 px-2.5 rounded-lg border border-[#FECDD3] bg-white text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={timeSlot}
                  ref={is11AM ? slot11Ref : undefined}
                  className="p-3 rounded-xl border border-dashed border-[#D6E4EE] bg-white/70 hover:bg-[#EFF6FF]/30 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-slate-400 w-20">
                      {timeSlot}
                    </span>
                    <span className="text-xs font-medium text-slate-400">Available Open Slot</span>
                  </div>
                  <button
                    onClick={() => {
                      setBookingSlot(timeSlot);
                      showToast(`Selected slot ${timeSlot} in booking form`, 'info');
                    }}
                    className="h-7 px-2.5 rounded-md border border-[#D6E4EE] bg-white hover:bg-[#EFF6FF] hover:text-[#1D63ED] hover:border-[#BFDBFE] text-xs font-semibold text-slate-600 transition-colors"
                  >
                    + Book Consultation
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right (32% -> 4 of 12 cols): Schedule New Appointment Form & Incoming Requests */}
        <div className="lg:col-span-4 space-y-5">
          {/* Schedule New Appointment Form Card */}
          <div className="surface-card rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-[14px] font-bold text-[#0A2540]">Schedule New Appointment</h3>
              <p className="text-xs text-slate-500">Book slot and notify student team lead</p>
            </div>

            <form onSubmit={handleConfirmNewBooking} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Mentored Team *</label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#D6E4EE] bg-white text-xs font-semibold text-[#0A2540] outline-none focus:border-[#1D63ED]"
                >
                  {teams.length > 0 ? (
                    teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.teamName}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="1">BlackBox (Sentinel X)</option>
                      <option value="2">Change_The_World (EcoGrid)</option>
                      <option value="3">DRISHTI (DrishtiNet)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
                  <select
                    value={bookingSlot}
                    onChange={(e) => setBookingSlot(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-[#D6E4EE] bg-white text-xs font-mono font-semibold text-[#0A2540] outline-none focus:border-[#1D63ED]"
                  >
                    {HALF_HOUR_SLOTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={bookingType}
                    onChange={(e) => setBookingType(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-[#D6E4EE] bg-white text-xs font-semibold text-[#0A2540] outline-none focus:border-[#1D63ED]"
                  >
                    <option value="Milestone Review">Milestone Review</option>
                    <option value="Synopsis Check">Synopsis Check</option>
                    <option value="Final Defense">Final Defense</option>
                    <option value="Remedial Guidance">Remedial Guidance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Agenda / Notes</label>
                <input
                  type="text"
                  value={bookingAgenda}
                  onChange={(e) => setBookingAgenda(e.target.value)}
                  placeholder="e.g. Phase 2 Demo & Rubrics Review..."
                  className="w-full h-9 px-3 rounded-lg border border-[#D6E4EE] bg-white text-xs text-[#0A2540] outline-none focus:border-[#1D63ED]"
                />
              </div>

              <button
                type="submit"
                className="w-full h-9 px-4 rounded-lg bg-[#1D63ED] hover:bg-[#1752C9] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Confirm &amp; Notify Team
              </button>
            </form>
          </div>

          {/* Incoming Meeting Requests Summary */}
          <div className="surface-card rounded-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[#0A2540]">Incoming Meeting Requests</h3>
              <span
                className={`px-2 py-0.5 rounded-md text-xs font-bold font-mono ${
                  pendingRequests.length > 0
                    ? 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
                    : 'bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0]'
                }`}
              >
                {pendingRequests.length}
              </span>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#ECFDF5]/60 border border-[#A7F3D0] text-xs text-[#15803D] font-medium text-center">
                All student meeting requests have been processed.
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="p-3 rounded-xl border border-[#FDE68A] bg-[#FFFBEB]/60 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#0A2540]">{req.teamName}</span>
                      <span className="text-[11px] font-semibold text-[#B45309] font-mono">
                        {req.dayLabel} • {req.timeSlot}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-600 leading-snug">{req.agenda}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleApproveRequest(req.id, req.timeSlot)}
                        className="flex-1 h-7 rounded-md bg-[#15803D] hover:bg-emerald-800 text-white text-[11px] font-semibold transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="flex-1 h-7 rounded-md border border-[#FECDD3] bg-white hover:bg-[#FFF1F2] text-[#BE123C] text-[11px] font-semibold transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
