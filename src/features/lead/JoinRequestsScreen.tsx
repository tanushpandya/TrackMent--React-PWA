import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserPlus,
  RefreshCw,
  Check,
  X,
  Inbox,
  User,
  ExternalLink,
  Loader2,
  BookOpen,
  Award,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { TeamService } from '../../services/team.service';
import { AuthService } from '../../services/auth.service';
import { JoinRequestModel, ProfileModel } from '../../types';

export const JoinRequestsScreen: React.FC = () => {
  const { user } = useAuth();
  const { team, members, refreshTeam } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<JoinRequestModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);

  // Student Profile Preview Modal
  const [selectedStudent, setSelectedStudent] = useState<ProfileModel | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!team) return;
    try {
      setLoading(true);
      const data = await TeamService.fetchJoinRequests(team.id, false);
      setRequests(data);
    } catch (e) {
      console.error('Error fetching join requests:', e);
      showToast('Could not load join requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [team, showToast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleRespond = async (requestId: number, accept: boolean) => {
    setActingId(requestId);
    try {
      await TeamService.respondToJoinRequest(requestId, accept);
      showToast(accept ? 'Student accepted into team roster.' : 'Join request declined.', accept ? 'success' : 'info');
      await Promise.all([loadRequests(), refreshTeam()]);
    } catch (e: any) {
      console.error('Error responding to request:', e);
      showToast(e?.message || 'Could not update request status.', 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleInspectStudent = async (studentId: string) => {
    try {
      setLoadingProfile(true);
      const prof = await AuthService.fetchProfile(studentId);
      setSelectedStudent(prof);
    } catch (e) {
      console.error('Failed to load student profile:', e);
      showToast('Could not fetch student details', 'error');
    } finally {
      setLoadingProfile(false);
    }
  };

  const teammateIds = new Set<string>();
  if (team?.leaderId) teammateIds.add(team.leaderId);
  (members || []).forEach((m) => teammateIds.add(m.id));

  // Teammates already in the team must never show up as pending join requests
  const pending = requests.filter(
    (r) => r.status === 'PENDING' && !teammateIds.has(r.studentId) && !(r as any).isAlreadyTeammate
  );
  const resolved = requests.filter(
    (r) => r.status !== 'PENDING' || teammateIds.has(r.studentId) || (r as any).isAlreadyTeammate
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Top Header Card */}
      <div className="surface-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] text-[10px] font-bold font-mono">
              MEMBERSHIP QUEUE
            </span>
            <h1 className="text-xl font-bold text-[#0A2540] tracking-tight">
              Join Requests &amp; Membership Queue
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Review, accept, or decline students applying to join <strong>{team?.teamName || 'your team'}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/lead/recruit-students')}
            className="h-8 px-3 rounded-lg border border-[#D6E4EE] bg-white hover:bg-slate-50 text-xs font-semibold text-[#1D63ED] transition-colors"
          >
            + Browse Candidate Pool →
          </button>
          <button
            onClick={loadRequests}
            title="Refresh Requests"
            className="h-8 px-3 rounded-lg border border-[#D6E4EE] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 inline-flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Pending Requests List */}
      <div className="surface-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-[14.5px] font-bold text-[#0A2540]">
            Pending Join Applications ({pending.length})
          </h2>
          <span className="text-xs font-mono font-bold text-slate-400">Team Cap: 4 Members</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1D63ED]" />
            <div className="text-sm">Loading applications...</div>
          </div>
        ) : pending.length === 0 ? (
          <div className="py-14 text-center space-y-2">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-[#0A2540]">No pending join requests</p>
            <p className="text-xs text-slate-500">
              When candidates apply to join your project team, their requests will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((req) => {
              const isActing = actingId === req.id;
              return (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-[#D6E4EE] bg-white hover:border-[#BFDBFE] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#0F4C81] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs font-mono">
                      {req.studentName?.charAt(0) || 'S'}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[14px] text-[#0A2540]">{req.studentName}</span>
                        <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D63ED] text-[10.5px] font-bold font-mono">
                          {req.studentBranch || 'Engineering'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        USN: <strong className="text-slate-700">{req.studentUsn || 'RVCE25AI048'}</strong> • Applied on{' '}
                        {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                      {req.note && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-1">
                          "{req.note}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleInspectStudent(req.studentId)}
                      className="h-8 px-3 rounded-lg border border-[#D6E4EE] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors"
                    >
                      Inspect Profile
                    </button>
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleRespond(req.id, false)}
                      className="h-8 px-3 rounded-lg border border-[#FECDD3] bg-white hover:bg-[#FFF1F2] text-[#BE123C] text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleRespond(req.id, true)}
                      className="h-8 px-4 rounded-lg bg-[#15803D] hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Approve &amp; Add</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Student Profile Preview Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A2540]/40 backdrop-blur-[2px]">
          <div className="surface-card rounded-xl max-w-md w-full overflow-hidden shadow-modal">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0A2540]">Candidate Profile</h3>
              <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#0F4C81] text-white flex items-center justify-center text-lg font-bold">
                  {selectedStudent.fullName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#0A2540]">{selectedStudent.fullName}</h4>
                  <div className="text-xs font-mono text-slate-500">
                    {selectedStudent.usn} • {selectedStudent.branch} • Sem {selectedStudent.semester}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
                Skills: Python, PyTorch, Scikit-Learn, Fastify, Docker, Network Flow Analysis.
              </p>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="h-8 px-4 rounded-lg bg-[#1D63ED] text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
