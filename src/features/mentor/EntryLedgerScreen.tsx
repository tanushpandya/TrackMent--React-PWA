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
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LedgerService } from '../../services/ledger.service';
import { TeamService } from '../../services/team.service';
import { MeetingLedgerEntry, ProfileModel, TeamModel } from '../../types';

export const EntryLedgerScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const teamIdParam = searchParams.get('teamId');
  const appointmentIdParam = searchParams.get('appointmentId');

  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [mentorTeams, setMentorTeams] = useState<TeamModel[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(
    teamIdParam ? parseInt(teamIdParam, 10) : null
  );

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

  // Load mentor teams
  useEffect(() => {
    if (!user) return;
    TeamService.fetchMentorTeams(user.id).then((teams) => {
      setMentorTeams(teams);
      if (!selectedTeamId && teams.length > 0) {
        setSelectedTeamId(teams[0].id);
      }
    });
  }, [user]);

  const loadData = useCallback(async () => {
    if (!selectedTeamId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [entries, roster] = await Promise.all([
        LedgerService.fetchLedger(selectedTeamId),
        TeamService.fetchTeamMembers(selectedTeamId),
      ]);
      setLedgerEntries(entries);
      setMembers(roster);

      const initAtt: Record<string, boolean> = {};
      roster.forEach((m: ProfileModel) => {
        initAtt[m.id] = true;
      });
      setAttendanceMap(initAtt);
    } catch (e) {
      console.error('Error loading ledger:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    loadData();
    if (appointmentIdParam) {
      setIsLogModalOpen(true);
    }
  }, [loadData, appointmentIdParam]);

  const handleToggleAttendance = async (meetingId: string, studentId: string, currentPresent: boolean) => {
    const key = `${meetingId}_${studentId}`;
    setTogglingMap((prev) => ({ ...prev, [key]: true }));
    try {
      await LedgerService.toggleAttendance(meetingId, studentId, !currentPresent);
      await loadData();
      showToast('Attendance updated', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Could not update attendance.', 'error');
    } finally {
      setTogglingMap((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleLogMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    if (!summaryNotes.trim()) {
      showToast('Please enter summary notes / mentor directives.', 'error');
      return;
    }

    setIsSubmittingLog(true);
    try {
      await LedgerService.logMeeting({
        teamId: selectedTeamId,
        appointmentId: appointmentIdParam ? parseInt(appointmentIdParam, 10) : undefined,
        meetingDate: new Date(meetingDate).toISOString(),
        summaryNotes: summaryNotes.trim(),
        attendance: attendanceMap,
      });

      showToast('Consultation and attendance successfully logged to ledger!', 'success');
      setIsLogModalOpen(false);
      setSummaryNotes('');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to log consultation.', 'error');
    } finally {
      setIsSubmittingLog(false);
    }
  };

  const currentTeam = mentorTeams.find((t) => t.id === selectedTeamId);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Top Header Card */}
      <div className="surface-card rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => navigate('/mentor/dashboard')}
              className="h-8 px-3 rounded-lg border border-[#D6E4EE] bg-white hover:bg-slate-50 text-[#0A2540] text-xs font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <span>← Assigned Teams</span>
            </button>
            <span className="px-2.5 py-0.5 rounded-md bg-[#EFF6FF] text-[#1D63ED] border border-[#BFDBFE] text-xs font-semibold font-mono">
              OFFICIAL LEDGER
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#0A2540] tracking-tight pt-1">
            Official Entry Ledger — {currentTeam?.teamName || 'Team Consultation Records'}
          </h1>
          <p className="text-xs text-slate-500">
            Cryptographically sealed and signed records of student meeting attendance and milestone directives.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {mentorTeams.length > 0 && (
            <select
              value={selectedTeamId || ''}
              onChange={(e) => setSelectedTeamId(parseInt(e.target.value, 10))}
              className="h-9 px-3 rounded-lg border border-[#D6E4EE] bg-white text-xs font-semibold text-[#0A2540] outline-none focus:border-[#1D63ED]"
            >
              {mentorTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teamName}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setIsLogModalOpen(true)}
            className="h-9 px-3.5 rounded-lg bg-[#1D63ED] hover:bg-[#1752C9] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Log New Meeting</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-2 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1D63ED]" />
          <div className="text-sm">Loading ledger records...</div>
        </div>
      ) : ledgerEntries.length === 0 ? (
        <div className="surface-card rounded-xl p-14 text-center space-y-2">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-[#0A2540]">No Consultations Logged in Ledger Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Log your first consultation and record attendance for institutional verification.
          </p>
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="h-9 px-4 rounded-lg bg-[#1D63ED] text-white text-xs font-semibold inline-flex items-center gap-1.5 mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Meeting Entry</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {ledgerEntries.map((entry, idx) => {
            const presentCount = entry.attendance.filter((a) => a.isPresent).length;
            const totalCount = entry.attendance.length;
            const allPresent = presentCount === totalCount;

            return (
              <div key={entry.id || idx} className="surface-card rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#EFF6FF] text-[#1D63ED] border border-[#BFDBFE] text-xs font-bold font-mono">
                      Meeting #{ledgerEntries.length - idx}
                    </span>
                    <span className="text-[13.5px] font-bold text-[#0A2540]">
                      {new Date(entry.meetingDate).toLocaleDateString(undefined, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                        allPresent
                          ? 'bg-[#ECFDF5] text-[#15803D] border-[#A7F3D0]'
                          : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                      }`}
                    >
                      {allPresent ? 'All present' : `${presentCount}/${totalCount} present`}
                    </span>
                  </div>
                </div>

                <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Summary & Remarks */}
                  <div className="lg:col-span-7 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#1D63ED]">
                      Mentor Remarks &amp; Action Directives
                    </div>
                    <p className="text-[13px] text-slate-700 leading-relaxed bg-[#EFF6FF]/40 border border-[#D6E4EE] rounded-xl p-3.5">
                      {entry.summaryNotes}
                    </p>
                  </div>

                  {/* Attendance List */}
                  <div className="lg:col-span-5 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Recorded Attendance ({presentCount}/{totalCount})
                    </div>
                    <div className="divide-y divide-slate-100 border border-[#D6E4EE] rounded-xl overflow-hidden">
                      {entry.attendance.map((att) => {
                        const isToggling = togglingMap[`${entry.id}_${att.studentId}`];
                        return (
                          <div
                            key={att.studentId}
                            className="px-4 py-2.5 bg-white flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-[13px] font-semibold text-[#0A2540] truncate">
                                {att.studentName}
                              </div>
                              <div className="text-xs text-slate-500 font-mono">{att.usn}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-xs font-semibold ${
                                  att.isPresent ? 'text-[#15803D]' : 'text-[#BE123C]'
                                }`}
                              >
                                {att.isPresent ? 'Present' : 'Absent'}
                              </span>
                              <button
                                type="button"
                                disabled={isToggling}
                                onClick={() => handleToggleAttendance(entry.id, att.studentId, att.isPresent)}
                                className={`w-10 h-5 rounded-full p-0.5 flex items-center cursor-pointer transition-colors ${
                                  att.isPresent ? 'bg-[#15803D]' : 'bg-slate-300'
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                                    att.isPresent ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Meeting Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A2540]/40 backdrop-blur-[2px]">
          <div className="surface-card rounded-xl max-w-lg w-full overflow-hidden shadow-modal">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0A2540]">Log Consultation Meeting</h3>
              <button onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleLogMeetingSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Meeting Date</label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#D6E4EE] bg-white text-xs text-[#0A2540]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Summary Notes &amp; Directives *
                </label>
                <textarea
                  rows={4}
                  value={summaryNotes}
                  onChange={(e) => setSummaryNotes(e.target.value)}
                  placeholder="Record discussed topics, milestone feedback, and next deliverables..."
                  className="w-full p-3 rounded-lg border border-[#D6E4EE] bg-white text-xs text-[#0A2540] outline-none focus:border-[#1D63ED]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Student Member Attendance
                </label>
                <div className="divide-y divide-slate-100 border border-[#D6E4EE] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {members.map((m) => {
                    const isPresent = attendanceMap[m.id] ?? true;
                    return (
                      <div key={m.id} className="px-3.5 py-2 bg-white flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#0A2540] truncate">{m.fullName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{m.usn}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttendanceMap((prev) => ({ ...prev, [m.id]: !isPresent }))}
                          className={`h-6 px-2.5 rounded text-[11px] font-semibold border transition-colors ${
                            isPresent
                              ? 'bg-[#ECFDF5] text-[#15803D] border-[#A7F3D0]'
                              : 'bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]'
                          }`}
                        >
                          {isPresent ? 'Present ✓' : 'Absent ✗'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="h-8 px-3 rounded-lg border border-[#D6E4EE] bg-white text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLog}
                  className="h-8 px-4 rounded-lg bg-[#1D63ED] text-white text-xs font-semibold hover:bg-[#1752C9] disabled:opacity-50"
                >
                  {isSubmittingLog ? 'Saving...' : 'Save to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
