import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  Users,
  Award,
  Edit3,
  UserMinus,
  ArrowRightLeft,
  LogOut,
  AlertTriangle,
  FileText,
  Download,
  Eye,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { TeamService } from '../../services/team.service';
import { TeamDeparture, TeamEvaluation } from '../../types';
import { ObjectivesChecklistWidget } from '../../components/dashboard/ObjectivesChecklistWidget';
import { DepartedMembersSection } from '../../components/common/DepartedMembersSection';

export const TeamInfoScreen: React.FC = () => {
  const { user, profile, isLead } = useAuth();
  const { team, members, mentor, refreshTeam } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [copiedCode, setCopiedCode] = useState(false);
  const [departures, setDepartures] = useState<TeamDeparture[]>([]);
  const [evaluations, setEvaluations] = useState<TeamEvaluation[]>([]);
  const [isMarksVisible, setIsMarksVisible] = useState<boolean>(true);

  // Inline team name edit state
  const [isEditingName, setIsEditingName] = useState(false);
  const [teamNameDraft, setTeamNameDraft] = useState('');

  // Edit Abstract modal state
  const [isEditAbstractOpen, setIsEditAbstractOpen] = useState(false);
  const [abstractDraft, setAbstractDraft] = useState('');
  const [savingAbstract, setSavingAbstract] = useState(false);

  // PDF Preview modal state
  const [previewDoc, setPreviewDoc] = useState<{ title: string; phase: string; fileName: string; date: string } | null>(null);

  // Leave Team & Transfer Lead modal state
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedMemberForTransfer, setSelectedMemberForTransfer] = useState<string>('');

  const isLeader = Boolean(isLead || (team && user && team.leaderId === user.id));

  useEffect(() => {
    if (team) {
      setTeamNameDraft(team.teamName);
      setAbstractDraft(team.abstractText || team.projectGist || '');
    }
  }, [team]);

  const loadExtras = useCallback(async () => {
    if (!team) return;
    try {
      const [deps, evals, vis] = await Promise.all([
        TeamService.fetchDepartures(team.id),
        TeamService.fetchTeamEvaluations(team.id),
        TeamService.fetchMarksVisibility(team.id),
      ]);
      setDepartures(deps);
      setEvaluations(evals);
      setIsMarksVisible(vis);
    } catch (e) {
      console.error('Error loading team extras:', e);
    }
  }, [team]);

  useEffect(() => {
    loadExtras();
  }, [loadExtras]);

  const copyCode = async () => {
    const code = team?.teamCode || 'TM-7JNTN';
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      showToast(`Team code ${code} copied!`, 'success');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showToast('Failed to copy code', 'error');
    }
  };

  const handleSaveTeamName = async () => {
    if (!team || !teamNameDraft.trim()) return;
    try {
      await TeamService.updateProjectInfo({
        teamId: team.id,
        projectTitle: team.projectTitle,
        projectGist: team.projectGist,
        theme: team.theme,
        branch: team.branch,
      });
      await refreshTeam();
      setIsEditingName(false);
      showToast(`Team name updated to ${teamNameDraft}! ✨`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update team name', 'error');
    }
  };

  const handleSaveAbstract = async () => {
    if (!team) return;
    setSavingAbstract(true);
    try {
      await TeamService.updateProjectInfo({
        teamId: team.id,
        projectTitle: team.projectTitle,
        projectGist: abstractDraft,
        theme: team.theme,
        branch: team.branch,
        abstractText: abstractDraft,
      });
      await refreshTeam();
      setIsEditAbstractOpen(false);
      showToast('Project abstract updated successfully! ✨', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update abstract', 'error');
    } finally {
      setSavingAbstract(false);
    }
  };

  const handleLeaveTeam = async () => {
    try {
      const removed = await TeamService.leaveTeam();
      showToast(
        `You have left the team. ${removed} contribution(s) removed from project history.`,
        'info'
      );
      await refreshTeam();
      navigate('/team-formation/before-team');
    } catch (err: any) {
      showToast(err?.message || 'Failed to leave team.', 'error');
      setIsLeaveModalOpen(false);
    }
  };

  const handleTransferLeadership = async (memberId: string) => {
    if (!team || !user) return;
    try {
      await TeamService.requestLeadTransfer(team.id, user.id, memberId);
      showToast('Leadership transfer initiated! 👑', 'success');
      setIsTransferModalOpen(false);
      await refreshTeam();
    } catch (err: any) {
      showToast(err?.message || 'Failed to transfer leadership', 'error');
    }
  };

  const deliverables = [
    { title: 'Project Synopsis & Scope Document', phase: 'Phase 1', fileName: 'Synopsis_Report_SentinelX.pdf', uploaded: true, date: '14 Nov 2026' },
    { title: 'Architectural Blueprint & Dataflow Diagram', phase: 'Phase 2', fileName: 'Architecture_Blueprint_v2.pdf', uploaded: true, date: '18 Nov 2026' },
    { title: 'Simulation Test Bench & Validation Suite', phase: 'Phase 2', fileName: 'Simulation_Validation_Suite.pdf', uploaded: true, date: '20 Nov 2026' },
    { title: 'Final Comprehensive Project Defense Thesis', phase: 'Phase 3', fileName: 'Defense_Thesis_Draft.pdf', uploaded: false, date: 'Pending' },
  ];

  const defaultAbstract =
    team?.projectGist ||
    team?.abstractText ||
    'No project abstract has been added yet. Click "+ Edit Abstract" to define your project scope, objectives, and tech stack.';

  const p1Eval = evaluations.find((e) => (e.phaseName || '').toLowerCase().includes('phase 1'));
  const p2Eval = evaluations.find((e) => (e.phaseName || '').toLowerCase().includes('phase 2'));
  const p3Eval = evaluations.find((e) => (e.phaseName || '').toLowerCase().includes('phase 3'));

  const p1 = p1Eval ? (p1Eval.memberMarks[user?.id || ''] ?? p1Eval.totalMarks ?? 0) : null;
  const p2 = p2Eval ? (p2Eval.memberMarks[user?.id || ''] ?? p2Eval.totalMarks ?? 0) : null;
  const p3 = p3Eval ? (p3Eval.memberMarks[user?.id || ''] ?? p3Eval.totalMarks ?? 0) : null;
  const total = (p1 || 0) + (p2 || 0) + (p3 || 0);
  const maxTotal = (p1Eval?.maxMarks || 40) + (p2Eval?.maxMarks || 100) + (p3Eval?.maxMarks || 60);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Top Team Identity & Inline Name Editor Header */}
      <div className="surface-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={teamNameDraft}
                  onChange={(e) => setTeamNameDraft(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-[#1D63ED] bg-white text-base font-bold text-[#0A2540] outline-none"
                />
                <button
                  onClick={handleSaveTeamName}
                  className="h-9 px-3.5 rounded-lg bg-[#1D63ED] text-white text-xs font-semibold hover:bg-[#1752C9]"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="h-9 px-2.5 rounded-lg border border-[#D6E4EE] bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold text-[#0A2540] tracking-tight">
                  {team?.teamName || 'TEAM 1'}
                </h1>
                {isLeader && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="h-7 px-2.5 rounded-md border border-[#BFDBFE] bg-[#EFF6FF] hover:bg-blue-100 text-[#1D63ED] text-xs font-semibold transition-colors"
                  >
                    ✎ Edit Name
                  </button>
                )}
              </>
            )}

            <button
              onClick={copyCode}
              title="Click to copy team code"
              className="h-7 px-2.5 rounded-md border border-[#D6E4EE] bg-slate-50 hover:bg-slate-100 font-mono text-xs font-bold text-[#0A2540] inline-flex items-center gap-1.5 transition-colors"
            >
              <span>&lt;&gt;</span>
              <span>{team?.teamCode || 'TM-7JNTN'}</span>
              {copiedCode ? <Check className="w-3 h-3 text-[#15803D]" /> : <Copy className="w-3 h-3 text-slate-400" />}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md bg-[#EFF6FF] text-[#1D63ED] border border-[#BFDBFE] text-xs font-semibold">
              {team?.theme || 'Artificial Intelligence'}
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
              {team?.branch || 'CSE'}
            </span>
            {mentor && (
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
                Mentor: {mentor.fullName}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => navigate(isLeader ? '/lead/ledger' : '/student/ledger')}
            className="h-9 px-3.5 rounded-lg border border-[#D6E4EE] bg-white hover:bg-slate-50 text-[#0A2540] text-xs font-semibold transition-colors"
          >
            View Entry Ledger →
          </button>
        </div>
      </div>

      {/* 2-Column Desktop Split (62% Left / 38% Right -> 7 cols / 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (7 cols): Abstract, Objectives Checklist & Deliverables */}
        <div className="lg:col-span-7 space-y-5">
          {/* Project Information & Overview */}
          <div className="surface-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-[14.5px] font-bold text-[#0A2540]">Project Information &amp; Overview</h2>
                <p className="text-xs text-slate-500">Abstract &amp; problem statement visible to your faculty mentor</p>
              </div>
              {isLeader && (
                <button
                  onClick={() => setIsEditAbstractOpen(true)}
                  className="h-8 px-3 rounded-lg bg-[#0F4C81] hover:bg-[#1D63ED] text-white text-xs font-semibold transition-colors"
                >
                  + Edit Abstract
                </button>
              )}
            </div>

            <p className="text-[13.5px] text-slate-700 leading-relaxed">{defaultAbstract}</p>

            {/* Interactive Objectives Checklist */}
            <div className="pt-4 border-t border-slate-100">
              {team && (
                <ObjectivesChecklistWidget team={team} isLeader={isLeader} onUpdated={refreshTeam} />
              )}
            </div>
          </div>

          {/* Project Reports & Deliverables */}
          <div className="surface-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14.5px] font-bold text-[#0A2540]">Project Reports &amp; Deliverables</h3>
                <p className="text-xs text-slate-500">Milestone PDF reports submitted for academic evaluation</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D63ED] text-xs font-mono font-semibold">
                3/4 Uploaded
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-[#D6E4EE] rounded-xl overflow-hidden">
              {deliverables.map((doc, idx) => (
                <div key={idx} className="p-3.5 bg-white flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[13px] text-[#0A2540] truncate">{doc.title}</span>
                      <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D63ED] text-[10px] font-bold font-mono">
                        {doc.phase}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {doc.fileName} • {doc.date}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {doc.uploaded ? (
                      <>
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="h-7 px-2.5 rounded-md border border-[#D6E4EE] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                        {isLeader && (
                          <button
                            onClick={() => showToast(`Replace dialog for ${doc.fileName}`, 'info')}
                            className="h-7 px-2.5 rounded-md border border-[#BFDBFE] bg-[#EFF6FF] hover:bg-blue-100 text-[#1D63ED] text-xs font-semibold transition-colors"
                          >
                            Replace
                          </button>
                        )}
                      </>
                    ) : (
                      isLeader && (
                        <button
                          onClick={() => showToast(`Upload dialog for ${doc.title}`, 'info')}
                          className="h-7 px-2.5 rounded-md bg-[#1D63ED] hover:bg-[#1752C9] text-white text-xs font-semibold transition-colors"
                        >
                          + Upload PDF
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Marks & Roster */}
        <div className="lg:col-span-5 space-y-5">
          {/* CIE Academic Marks (Released by Mentor) */}
          <div className="surface-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-[#0A2540]">Academic Marks</h3>
                <p className="text-xs text-slate-500">
                  {mentor ? `Released by ${mentor.fullName}` : 'Faculty Evaluation'}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                  evaluations.length > 0 && isMarksVisible
                    ? 'bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0]'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {evaluations.length > 0 && isMarksVisible ? 'Verified' : 'Pending'}
              </span>
            </div>

            {/* Score Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">Total Progress</span>
                <span className="font-mono text-[#1D63ED] font-bold">
                  {evaluations.length > 0 && isMarksVisible
                    ? `${total} / ${maxTotal} (${Math.round((total / maxTotal) * 100)}%)`
                    : 'Pending Faculty Release'}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#1D63ED]"
                  style={{
                    width: `${evaluations.length > 0 && isMarksVisible ? Math.min(100, (total / maxTotal) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* 3 Phase Breakdown */}
            <div className="space-y-2.5">
              <div
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  p1 !== null
                    ? 'border-[#A7F3D0] bg-[#ECFDF5]/50'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-[#0A2540]">Phase 1: Synopsis &amp; Scope</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {p1Eval?.createdAt ? `Evaluated on ${new Date(p1Eval.createdAt).toLocaleDateString()}` : 'Awaiting Review'}
                  </div>
                </div>
                <span className={`font-mono font-bold text-sm ${p1 !== null ? 'text-[#15803D]' : 'text-slate-400'}`}>
                  {p1 !== null ? `${p1}/40` : '--/40'}
                </span>
              </div>

              <div
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  p2 !== null
                    ? 'border-[#A7F3D0] bg-[#ECFDF5]/50'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-[#0A2540]">Phase 2: Architectural Demo</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {p2Eval?.createdAt ? `Evaluated on ${new Date(p2Eval.createdAt).toLocaleDateString()}` : 'Awaiting Review'}
                  </div>
                </div>
                <span className={`font-mono font-bold text-sm ${p2 !== null ? 'text-[#15803D]' : 'text-slate-400'}`}>
                  {p2 !== null ? `${p2}/100` : '--/100'}
                </span>
              </div>

              <div
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  p3 !== null
                    ? 'border-[#A7F3D0] bg-[#ECFDF5]/50'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-[#0A2540]">Phase 3: Final Defense</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {p3Eval?.createdAt ? `Evaluated on ${new Date(p3Eval.createdAt).toLocaleDateString()}` : 'Semester End'}
                  </div>
                </div>
                <span className={`font-mono font-semibold text-xs ${p3 !== null ? 'text-[#15803D]' : 'text-slate-400'}`}>
                  {p3 !== null ? `${p3}/60` : 'Pending / 60'}
                </span>
              </div>
            </div>
          </div>

          {/* Team Roster & Members */}
          <div className="surface-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-[#0A2540]">Team Roster</h3>
                <p className="text-xs text-slate-500">{members.length} active engineering members</p>
              </div>
              {!isLeader && (
                <button
                  onClick={() => setIsLeaveModalOpen(true)}
                  className="text-xs font-semibold text-[#BE123C] hover:underline"
                >
                  Leave Team
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {members.length === 0 ? (
                <div className="p-4 rounded-xl border border-[#D6E4EE] text-center text-xs text-slate-400">
                  No teammates joined yet. Share your team code to recruit members!
                </div>
              ) : (
                members.map((m) => {
                  const isMemberLead = team?.leaderId === m.id || m.role === 'TEAM_LEAD';
                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl border border-[#D6E4EE] bg-white flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#0F4C81] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          {m.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#0A2540] truncate">{m.fullName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {m.usn || m.email || 'Student'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isMemberLead ? (
                          <span className="px-2 py-0.5 rounded bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] text-[10px] font-bold font-mono">
                            LEAD
                          </span>
                        ) : (
                          <>
                            <span className="px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] text-[10px] font-bold font-mono">
                              MEMBER
                            </span>
                            {isLeader && (
                              <button
                                onClick={() => {
                                  setSelectedMemberForTransfer(m.id);
                                  setIsTransferModalOpen(true);
                                }}
                                className="h-6 px-2 rounded border border-[#D6E4EE] bg-white hover:bg-slate-50 text-[10.5px] font-semibold text-slate-600 transition-colors"
                              >
                                Make Lead
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Departed Members */}
            {departures.length > 0 && <DepartedMembersSection departures={departures} />}
          </div>
        </div>
      </div>

      {/* Edit Abstract Modal */}
      {isEditAbstractOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A2540]/40 backdrop-blur-[2px]">
          <div className="surface-card rounded-xl max-w-lg w-full overflow-hidden shadow-modal">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0A2540]">Edit Project Abstract</h3>
              <button onClick={() => setIsEditAbstractOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <textarea
                rows={6}
                value={abstractDraft}
                onChange={(e) => setAbstractDraft(e.target.value)}
                placeholder="Enter refined problem formulation, dataset characteristics, and algorithmic scope..."
                className="w-full p-3 rounded-lg border border-[#D6E4EE] bg-white text-xs text-[#0A2540] outline-none focus:border-[#1D63ED] leading-relaxed"
              />
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                onClick={() => setIsEditAbstractOpen(false)}
                className="h-8 px-3 rounded-lg border border-[#D6E4EE] bg-white text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                disabled={savingAbstract}
                onClick={handleSaveAbstract}
                className="h-8 px-4 rounded-lg bg-[#1D63ED] text-white text-xs font-semibold hover:bg-[#1752C9] disabled:opacity-50"
              >
                {savingAbstract ? 'Saving...' : 'Save Abstract'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Report Viewer Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A2540]/40 backdrop-blur-[2px]">
          <div className="surface-card rounded-xl max-w-lg w-full overflow-hidden shadow-modal">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1D63ED]" />
                <h3 className="text-sm font-bold text-[#0A2540]">{previewDoc.title}</h3>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-5 space-y-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1D63ED] flex items-center justify-center mx-auto mb-2">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-xs font-mono font-bold text-slate-800">{previewDoc.fileName}</p>
              <p className="text-xs text-slate-500">
                Uploaded for {previewDoc.phase} on {previewDoc.date}. Verified by Faculty Mentor.
              </p>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                onClick={() => setPreviewDoc(null)}
                className="h-8 px-3 rounded-lg border border-[#D6E4EE] bg-white text-xs font-semibold text-slate-600"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setPreviewDoc(null);
                  showToast(`Downloading ${previewDoc.fileName}...`, 'success');
                }}
                className="h-8 px-4 rounded-lg bg-[#1D63ED] hover:bg-[#1752C9] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Team Confirmation Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A2540]/40 backdrop-blur-[2px]">
          <div className="surface-card rounded-xl max-w-md w-full overflow-hidden shadow-modal p-5 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-rose-50 text-[#DC2626] border border-rose-200 text-[11px] font-bold">
              Confirm Action
            </div>
            <h3 className="text-base font-bold text-[#0A2540]">
              Leave {team?.teamName || 'Team'}?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Leaving this team will revoke your access to shared project deliverables and future milestone evaluations under <strong>{mentor?.fullName || 'Faculty Mentor'}</strong>. Your verified contributions remain archived in the cohort audit log.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="h-8 px-3 rounded-lg border border-[#D6E4EE] text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Stay in Team
              </button>
              <button
                onClick={handleLeaveTeam}
                className="h-8 px-4 rounded-lg bg-[#DC2626] hover:bg-red-700 text-white text-xs font-semibold transition-colors"
              >
                Confirm Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
