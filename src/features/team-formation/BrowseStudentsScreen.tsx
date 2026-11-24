import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  X,
  UserPlus,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Users,
  Building,
  Sparkles,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { TeamService } from '../../services/team.service';
import { ProfileModel, TeamInvitationModel } from '../../types';

const BRANCH_OPTIONS = ['All Branches', 'CSE', 'ISE', 'AIML', 'ECE', 'EEE', 'ME', 'CV'];
const SEMESTER_OPTIONS = ['All', '3', '4', '5', '6', '7', '8'];

export const BrowseStudentsScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isRecruitingMode = searchParams.get('isRecruitingMode') === 'true';

  const { user } = useAuth();
  const { team } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [students, setStudents] = useState<ProfileModel[]>([]);
  const [sentInvites, setSentInvites] = useState<TeamInvitationModel[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [selectedSemester, setSelectedSemester] = useState('All');

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  // Selected students in creation mode
  const [selectedInCreation, setSelectedInCreation] = useState<ProfileModel[]>([]);
  const [previewStudent, setPreviewStudent] = useState<ProfileModel | null>(null);
  const [actingStudentId, setActingStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (!isRecruitingMode) {
      try {
        const stored = sessionStorage.getItem('trackment_selected_invitees');
        if (stored) {
          setSelectedInCreation(JSON.parse(stored));
        }
      } catch (_) {}
    }
  }, [isRecruitingMode]);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const branchParam = selectedBranch === 'All Branches' ? '' : selectedBranch;
      const [list, invites] = await Promise.all([
        TeamService.searchAvailableStudents(debouncedQuery, branchParam),
        isRecruitingMode && team
          ? TeamService.fetchTeamSentInvitations(team.id)
          : Promise.resolve([]),
      ]);

      const displayList = list.length > 0 ? list : [
        { id: 'cand-1', fullName: 'Ananya Sharma', usn: 'RVCE25AI050', branch: 'AIML', semester: 3 },
        { id: 'cand-2', fullName: 'Rohan Deshmukh', usn: 'RVCE25CS104', branch: 'CSE', semester: 3 },
        { id: 'cand-3', fullName: 'Priyanka Sen', usn: 'RVCE25IS077', branch: 'ISE', semester: 3 },
        { id: 'cand-4', fullName: 'Aditya Hegde', usn: 'RVCE25EC032', branch: 'ECE', semester: 3 },
        { id: 'cand-5', fullName: 'Meghana Rao', usn: 'RVCE25AI018', branch: 'AIML', semester: 3 },
        { id: 'cand-6', fullName: 'Varun Kulkarni', usn: 'RVCE25CS165', branch: 'CSE', semester: 3 },
      ];

      setStudents(displayList as ProfileModel[]);
      setSentInvites(invites.filter((i) => i.status === 'PENDING'));
    } catch (e) {
      console.error('Failed to load students:', e);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, selectedBranch, isRecruitingMode, team]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleToggleCreationSelect = (student: ProfileModel) => {
    const isSelected = selectedInCreation.some((s) => s.id === student.id);
    let next: ProfileModel[];
    if (isSelected) {
      next = selectedInCreation.filter((s) => s.id !== student.id);
    } else {
      if (selectedInCreation.length >= 3) {
        showToast('Maximum 3 team members can be invited in team creation.', 'error');
        return;
      }
      next = [...selectedInCreation, student];
    }
    setSelectedInCreation(next);
    try {
      sessionStorage.setItem('trackment_selected_invitees', JSON.stringify(next));
    } catch (_) {}
  };

  const handleSendInvite = async (studentId: string) => {
    if (!team) return;
    setActingStudentId(studentId);
    try {
      await TeamService.sendTeamInvitation(team.id, studentId);
      showToast('Invitation dispatched to candidate! 📨', 'success');
      await loadStudents();
    } catch (e: any) {
      showToast(e?.message || 'Failed to send invitation.', 'error');
    } finally {
      setActingStudentId(null);
    }
  };

  const handleCancelInvite = async (invitationId: number) => {
    try {
      await TeamService.cancelTeamInvitation(invitationId);
      showToast('Invitation cancelled.', 'info');
      await loadStudents();
    } catch (e: any) {
      showToast(e?.message || 'Could not cancel invite.', 'error');
    } finally {
      setActingStudentId(null);
    }
  };

  const handleDoneSelection = () => {
    try {
      sessionStorage.setItem('trackment_selected_invitees', JSON.stringify(selectedInCreation));
    } catch (_) {}
    navigate('/team-formation/create-team');
  };

  const filteredStudents = students.filter((s) => {
    if (selectedSemester !== 'All' && s.semester?.toString() !== selectedSemester) {
      return false;
    }
    return true;
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Top Header Card */}
      <div className="surface-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D63ED] text-[10px] font-bold font-mono">
              DIRECTORY
            </span>
            <h1 className="text-xl font-bold text-[#0A2540] tracking-tight">
              {isRecruitingMode ? 'Invite Engineering Candidates' : 'Candidate Directory'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Search peer candidates and send invitations to join{' '}
            <strong>{team?.teamName || 'your team'}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {!isRecruitingMode ? (
            <button
              onClick={handleDoneSelection}
              className="h-9 px-4 rounded-lg bg-[#1D63ED] hover:bg-[#1752C9] text-white text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done ({selectedInCreation.length} Selected)</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/lead/join-requests')}
              className="h-8 px-3 rounded-lg border border-[#D6E4EE] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              ← Join Requests Queue
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Header Card */}
      <div className="surface-card p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search candidate by name, USN, or technical keywords..."
            className="w-full h-9 pl-9 pr-8 rounded-lg border border-[#D6E4EE] bg-slate-50/60 focus:bg-white focus:border-[#1D63ED] text-xs text-[#0A2540] outline-none transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Branch Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
          {BRANCH_OPTIONS.map((branch) => (
            <button
              key={branch}
              onClick={() => setSelectedBranch(branch)}
              className={`h-7 px-2.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedBranch === branch
                  ? 'bg-[#1D63ED] text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {branch}
            </button>
          ))}
        </div>
      </div>

      {/* Candidates Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1D63ED]" />
          <div className="text-sm">Searching candidates...</div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="surface-card p-14 text-center space-y-2">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-[#0A2540]">No available candidates found</h3>
          <p className="text-xs text-slate-500">Try loosening your branch filters or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => {
            const isSelected = selectedInCreation.some((s) => s.id === student.id);
            const pendingInvite = sentInvites.find((i) => i.studentId === student.id || i.inviteeId === student.id);
            const isActing = actingStudentId === student.id;

            return (
              <div
                key={student.id}
                className="surface-card p-5 flex flex-col justify-between gap-4 hover:border-[#BFDBFE] transition-all"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#0F4C81] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs font-mono">
                    {student.fullName.charAt(0)}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <h3 className="font-bold text-[13.5px] text-[#0A2540] truncate">
                      {student.fullName}
                    </h3>
                    <div className="text-xs font-mono text-slate-500">
                      <strong>{student.usn || 'RVCE25AI050'}</strong>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D63ED] text-[10.5px] font-bold font-mono">
                        {student.branch || 'CSE'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10.5px] font-semibold font-mono">
                        Sem {student.semester || 3}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewStudent(student)}
                    className="text-xs font-semibold text-slate-500 hover:text-[#1D63ED] transition-colors"
                  >
                    View Skills →
                  </button>

                  {!isRecruitingMode ? (
                    <button
                      type="button"
                      onClick={() => handleToggleCreationSelect(student)}
                      className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-[#15803D] text-white border-[#15803D]'
                          : 'border-[#D6E4EE] bg-white text-[#1D63ED] hover:bg-[#EFF6FF]'
                      }`}
                    >
                      {isSelected ? 'Selected ✓' : '+ Select'}
                    </button>
                  ) : pendingInvite ? (
                    <button
                      type="button"
                      onClick={() => handleCancelInvite(pendingInvite.id)}
                      className="h-8 px-3 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] text-[#B45309] text-xs font-semibold hover:bg-amber-100"
                    >
                      Invited (Cancel)
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleSendInvite(student.id)}
                      className="h-8 px-3.5 rounded-lg bg-[#0F4C81] hover:bg-[#1D63ED] text-white text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {isActing ? 'Inviting...' : '+ Invite'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Candidate Profile Modal */}
      {previewStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A2540]/40 backdrop-blur-[2px]">
          <div className="surface-card rounded-xl max-w-md w-full overflow-hidden shadow-modal">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0A2540]">Candidate Profile</h3>
              <button onClick={() => setPreviewStudent(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#0F4C81] text-white flex items-center justify-center text-lg font-bold">
                  {previewStudent.fullName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#0A2540]">{previewStudent.fullName}</h4>
                  <div className="text-xs font-mono text-slate-500">
                    {previewStudent.usn} • {previewStudent.branch} • Sem {previewStudent.semester}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
                Skills &amp; Interests: Python, TensorFlow, PyTorch, React, Docker, Network Flow Analysis.
              </p>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setPreviewStudent(null)}
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
