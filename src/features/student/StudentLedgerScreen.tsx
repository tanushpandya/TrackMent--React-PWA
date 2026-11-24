import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Calendar, FileText, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTeam } from '../../context/TeamContext';
import { useAuth } from '../../context/AuthContext';
import { LedgerService } from '../../services/ledger.service';
import { supabase } from '../../services/supabase';
import { MeetingLedgerEntry } from '../../types';

export const StudentLedgerScreen: React.FC = () => {
  const { team, mentor } = useTeam();
  const { isLead } = useAuth();
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

    if (!team) return;
    const channel = supabase
      .channel(`realtime:student_ledger_${team.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_ledger', filter: `team_id=eq.${team.id}` }, () => {
        loadLedger();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [team, loadLedger]);

  const displayEntries = entries;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Top Header Card */}
      <div className="surface-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D63ED] text-[10px] font-bold font-mono">
              VERIFIED LEDGER
            </span>
            <h1 className="text-xl font-bold text-[#0A2540] tracking-tight">
              Verified Attendance &amp; Entry Ledger (Read-Only)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Official institutional audit trail of mentor reviews, directives, and attendance records for{' '}
            <strong>{team?.teamName || 'your team'}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0] text-xs font-bold font-mono">
            {displayEntries.length} Verified Logs
          </span>
          <button
            onClick={() => navigate('/student/meeting')}
            className="h-8 px-3 rounded-lg border border-[#D6E4EE] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            Schedule Next Consultation →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-2 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1D63ED]" />
          <div className="text-sm">Loading verified ledger...</div>
        </div>
      ) : displayEntries.length === 0 ? (
        <div className="surface-card p-12 text-center space-y-2">
          <FileText className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-[#0A2540]">No Verified Ledger Entries Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Meeting attendance, discussion minutes, and directives will be permanently logged here once verified by your Faculty Mentor.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayEntries.map((entry, idx) => {
            const presentCount = entry.attendance.filter((a) => a.isPresent).length;
            const totalCount = entry.attendance.length;
            const allPresent = presentCount === totalCount;

            return (
              <div key={entry.id || idx} className="surface-card rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#EFF6FF] text-[#1D63ED] border border-[#BFDBFE] text-xs font-bold font-mono">
                      Meeting #{entry.meetingNumber || displayEntries.length - idx}
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
                  <span className="text-xs text-slate-400 font-mono">
                    Signed by {mentor?.fullName || 'Faculty Mentor'}
                  </span>
                </div>

                <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Summary / Remarks */}
                  <div className="lg:col-span-7 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#1D63ED]">
                      Official Faculty Directives &amp; Meeting Minutes
                    </div>
                    <div className="p-4 rounded-xl border border-[#D6E4EE] bg-[#EFF6FF]/40 text-[13px] text-slate-700 leading-relaxed font-sans">
                      {entry.summaryNotes}
                    </div>
                  </div>

                  {/* Attendance List */}
                  <div className="lg:col-span-5 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Recorded Attendance ({presentCount}/{totalCount})
                    </div>
                    <div className="divide-y divide-slate-100 border border-[#D6E4EE] rounded-xl overflow-hidden">
                      {entry.attendance.map((att) => (
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
                          <span
                            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold font-mono border ${
                              att.isPresent
                                ? 'bg-[#ECFDF5] text-[#15803D] border-[#A7F3D0]'
                                : 'bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]'
                            }`}
                          >
                            {att.isPresent ? 'Present ✓' : 'Absent ✗'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
