import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ArrowLeft,
  GraduationCap,
  Users,
  Award,
  FileCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  Search,
  HelpCircle,
  FileText,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { AppCard } from '../../components/common/AppCard';

export const UserManualScreen: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'overview' | 'rubrics' | 'leads' | 'reports' | 'faq'>('overview');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div style={{ animation: 'pageIn 0.35s ease both', maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white mb-4 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <PageHeader
        eyebrow="RVCE INSTITUTIONAL DOCUMENTATION"
        title="TrackMent User Manual & Governance Guide"
        subtitle="Operational standard operating procedures (SOP), rubrics marking scheme, and deliverable guidelines."
      />

      {/* Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 border-b border-white/10">
        {[
          { key: 'overview', label: '1. Overview & Workflow', icon: BookOpen },
          { key: 'rubrics', label: '2. 200-Mark Rubrics Scheme', icon: Award },
          { key: 'leads', label: '3. Team Governance', icon: Users },
          { key: 'reports', label: '4. Institutional Reports', icon: FileCheck },
          { key: 'faq', label: '5. FAQ & Troubleshooting', icon: HelpCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSel = activeSection === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isSel
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Section 1: Overview & Workflow */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          <AppCard title="TrackMent Platform Overview" subtitle="Continuous Peer-Accountable Experiential Learning System">
            <p className="text-sm text-slate-300 leading-relaxed">
              TrackMent is the institutional project tracking and peer-accountability platform developed for RV College
              of Engineering. It streamlines continuous internal evaluation (CIE), deliverable submission with cryptographic
              proof attachments, and faculty mentorship supervision across all phases of engineering projects.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-2">
                  <Users className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Student Members</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Submit micro-deliverables with proof attachments (PDF, videos, docs), participate in peer reviews, and track personal verified progress.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Team Leads</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Manage roster and invitations, maintain objectives checklist, upload official institutional reports, and coordinate mentor consultations.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-2">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Faculty Mentors</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Supervise multiple assigned teams via Gantt timeline, review submitted deliverables and proofs, and record official continuous evaluation marks.
                </p>
              </div>
            </div>
          </AppCard>
        </div>
      )}

      {/* Section 2: Rubrics Marking Scheme */}
      {activeSection === 'rubrics' && (
        <div className="space-y-6">
          <AppCard title="RVCE Experiential Learning 200-Mark Scale" subtitle="Governed by Circular RVCE/DA/030/2026-27">
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              Academic evaluations in TrackMent strictly adhere to the 200-mark Experiential Learning distribution.
              Fractional marks are distributed across canonical criteria using the Hamilton-Hare Largest Remainder algorithm.
            </p>

            <div className="space-y-4">
              {/* Phase 1 */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    Phase 1: Synopsis & Formulation
                    <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Max 40 Marks
                    </span>
                  </h4>
                  <span className="text-xs text-slate-400">Weight: 20%</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400">Problem Formulation & Literature Review</span>
                    <div className="text-sm font-bold text-white mt-1">20 Marks (50%)</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400">Project Objectives & Scope</span>
                    <div className="text-sm font-bold text-white mt-1">10 Marks (25%)</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400">Methodology & Architecture</span>
                    <div className="text-sm font-bold text-white mt-1">10 Marks (25%)</div>
                  </div>
                </div>
              </div>

              {/* Phase 2 */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    Phase 2: Milestone Review
                    <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                      Max 60 Marks
                    </span>
                  </h4>
                  <span className="text-xs text-slate-400">Weight: 30%</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400">Project Execution</span>
                    <div className="text-sm font-bold text-white mt-1">30 Marks (50%)</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400">Tools & Techniques</span>
                    <div className="text-sm font-bold text-white mt-1">20 Marks (33.3%)</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400">Partial Results (Clarity, Progress, Analysis)</span>
                    <div className="text-sm font-bold text-white mt-1">10 Marks (16.7%)</div>
                  </div>
                </div>
              </div>

              {/* Phase 3 */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    Phase 3: Final Demo & Evaluation
                    <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                      Max 100 Marks
                    </span>
                  </h4>
                  <span className="text-xs text-slate-400">Weight: 50%</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400">Prototype Demonstration</span>
                    <div className="text-sm font-bold text-white mt-1">30 Marks</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400">Results & Discussion</span>
                    <div className="text-sm font-bold text-white mt-1">20 Marks</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400">Project Report (PDF)</span>
                    <div className="text-sm font-bold text-white mt-1">20 Marks</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400">Poster & PPT Presentation</span>
                    <div className="text-sm font-bold text-white mt-1">10 Marks</div>
                  </div>
                </div>
                <div className="mt-3 p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs">
                  <span className="font-bold text-indigo-300">Ceiling Guard: </span>
                  <span className="text-slate-300">
                    Core evaluation caps at 80 Marks. Any additional marks (81–100) are reserved exclusively for
                    Notable Outcomes & Peer-Reviewed Publications.
                  </span>
                </div>
              </div>
            </div>
          </AppCard>
        </div>
      )}

      {/* Section 3: Team Governance */}
      {activeSection === 'leads' && (
        <div className="space-y-6">
          <AppCard title="Team Formation & Leadership Governance" subtitle="Roster rules and peer accountability protocol">
            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-white/5">
                <h5 className="text-sm font-bold text-white mb-1">Roster Size & Domain Check</h5>
                <p className="leading-relaxed">
                  Teams must strictly consist of members holding verified <code className="text-indigo-400 font-mono">@rvce.edu.in</code> accounts.
                  Maximum team size is 4 members as per institutional academic council norms.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-white/5">
                <h5 className="text-sm font-bold text-white mb-1">Leadership Transfer & Governance</h5>
                <p className="leading-relaxed">
                  A Team Lead can transfer leadership to any active teammate. In cases of leadership inactivity,
                  teammates can initiate a democratic vote for leadership succession.
                </p>
              </div>
            </div>
          </AppCard>
        </div>
      )}

      {/* Section 4: Institutional Reports */}
      {activeSection === 'reports' && (
        <div className="space-y-6">
          <AppCard title="Institutional Report Submission Guidelines" subtitle="PDF Format & Storage Requirements">
            <div className="space-y-4 text-xs text-slate-300">
              <p className="leading-relaxed">
                TrackMent provides dedicated storage slots for official institutional deliverables stored in a private
                cloud bucket with encrypted access tokens.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Slot 1 • Mandatory</span>
                  <h4 className="text-sm font-bold text-white mt-1 mb-2">Primary Project Report</h4>
                  <ul className="space-y-1.5 list-disc list-inside text-slate-400">
                    <li>Comprehensive institutional report adhering to RVCE formatting guidelines.</li>
                    <li>PDF format only, maximum file size 10 MB.</li>
                    <li>Uploaded exclusively by the authorized Team Lead.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10">
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Slot 2 • Optional</span>
                  <h4 className="text-sm font-bold text-white mt-1 mb-2">Supplementary Material</h4>
                  <ul className="space-y-1.5 list-disc list-inside text-slate-400">
                    <li>Appendices, user manuals, survey results, or schematic diagrams.</li>
                    <li>PDF format only, maximum file size 10 MB.</li>
                    <li>Can be replaced or updated at any point during project phases.</li>
                  </ul>
                </div>
              </div>
            </div>
          </AppCard>
        </div>
      )}

      {/* Section 5: FAQ & Troubleshooting */}
      {activeSection === 'faq' && (
        <div className="space-y-4">
          <AppCard title="Frequently Asked Questions" subtitle="Common inquiries and platform troubleshooting">
            <div className="space-y-3 text-xs">
              <details className="p-3.5 rounded-xl bg-slate-800/40 border border-white/5 cursor-pointer">
                <summary className="font-bold text-white text-sm">Why did my document upload fail?</summary>
                <p className="mt-2 text-slate-300 leading-relaxed">
                  Deliverable proof files must have one of the supported extensions: PDF, DOC, DOCX, PPT, PPTX, MP4, MOV, MKV, JPG, JPEG, or PNG,
                  and must be below 10 MB. Institutional project reports in the Team Info screen must strictly be in PDF format.
                </p>
              </details>

              <details className="p-3.5 rounded-xl bg-slate-800/40 border border-white/5 cursor-pointer">
                <summary className="font-bold text-white text-sm">How does the Hamilton-Hare rubric score sync work?</summary>
                <p className="mt-2 text-slate-300 leading-relaxed">
                  When a mentor enters total phase marks (e.g. 35 out of 40), the Largest Remainder algorithm calculates exact
                  proportional scores for each criterion and distributes any remainder based on priority, avoiding fractional rounding errors.
                </p>
              </details>

              <details className="p-3.5 rounded-xl bg-slate-800/40 border border-white/5 cursor-pointer">
                <summary className="font-bold text-white text-sm">Can other teammates edit the objectives checklist?</summary>
                <p className="mt-2 text-slate-300 leading-relaxed">
                  The Objectives Checklist is managed by the Team Lead to maintain consistency. Team members can view all items and track progress.
                </p>
              </details>
            </div>
          </AppCard>
        </div>
      )}
    </div>
  );
};
