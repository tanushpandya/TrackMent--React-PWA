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
  HelpCircle,
  FileText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { AppCard } from '../../components/common/AppCard';

export const UserManualScreen: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'overview' | 'rubrics' | 'leads' | 'reports' | 'faq' | 'troubleshooter'>('overview');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [selectedSymptom, setSelectedSymptom] = useState<string>('login');

  const checklistSteps = [
    { id: 'c1', text: 'Sign in using your official @rvce.edu.in institutional email' },
    { id: 'c2', text: 'Complete your Student or Faculty profile with USN / Department' },
    { id: 'c3', text: 'Create or join a project team and confirm your Team Lead' },
    { id: 'c4', text: 'Submit your first contribution with proof links or PDF attachment' },
    { id: 'c5', text: 'Verify your Phase 1, 2 & 3 objectives and consultation ledger' },
  ];

  const troubleshooterGuides: Record<string, { title: string; steps: string[] }> = {
    login: {
      title: 'Cannot sign in or stuck on Login screen',
      steps: [
        'Ensure you are using an active @rvce.edu.in email address (personal Gmail accounts are blocked).',
        'If using Google OAuth, allow popups/redirects and refresh once if the callback hash stalls.',
        'Clear site data for localhost / trackment if an old session token expired.',
      ],
    },
    pdf: {
      title: 'PDF report will not preview or download',
      steps: [
        'TrackMent opens PDFs inside the Secure In-App Viewer using an isolated Blob URL.',
        'Ensure the uploaded file is a valid .pdf under the maximum size limit.',
        'Click "Download PDF" in the viewer header to save it as <team_name>_<submission_number>.pdf.',
      ],
    },
    marks: {
      title: 'CIE Academic Marks are not visible on dashboard',
      steps: [
        'Faculty mentors control the Marks Visibility toggle on the Mentor Dashboard.',
        'Ask your mentor to switch Marks Visibility to "Released" after grading Phase 1 / Phase 2.',
        'Individual scores are isolated — you will only see your own rubric breakdown.',
      ],
    },
    team: {
      title: 'Teammate invite or join request is missing',
      steps: [
        'Verify that the student has completed their Student Profile before inviting them.',
        'Students already in another active team cannot accept new invitations.',
        'Team Leads can manage pending requests under Lead → Join Requests.',
      ],
    },
  };

  const completedCount = checklistSteps.filter((s) => checkedItems[s.id]).length;

  return (
    <div style={{ animation: 'pageIn 0.35s ease both', maxWidth: 960, margin: '0 auto', paddingBottom: 60 }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="btn btn-sm"
        style={{ marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}
      >
        <ArrowLeft size={14} />
        <span>Back to Dashboard</span>
      </button>

      <PageHeader
        eyebrow="RVCE INSTITUTIONAL DOCUMENTATION"
        title="TrackMent User Manual & Governance SOP"
        subtitle="Operational standard operating procedures, 200-mark continuous evaluation scheme, and deliverable guidelines."
      />

      {/* Navigation Pills */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 20,
          borderBottom: '1.5px solid #D5E8EF',
        }}
      >
        {[
          { key: 'overview', label: '1. Platform Overview', icon: BookOpen },
          { key: 'rubrics', label: '2. 200-Mark Rubrics Scheme', icon: Award },
          { key: 'leads', label: '3. Team Governance', icon: Users },
          { key: 'reports', label: '4. Institutional Reports', icon: FileCheck },
          { key: 'faq', label: '5. FAQ & Governance', icon: HelpCircle },
          { key: 'troubleshooter', label: '6. Checklist & Troubleshooter', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSel = activeSection === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSection(tab.key as any)}
              className={isSel ? 'btn btn-sm btn-primary' : 'btn btn-sm'}
              style={{
                borderRadius: 12,
                padding: '8px 14px',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12.5,
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Section 1: Overview & Workflow */}
      {activeSection === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AppCard title="TrackMent Platform Overview" subtitle="Continuous Peer-Accountable Experiential Learning System">
            <p style={{ fontSize: 13.5, color: '#31566E', lineHeight: 1.6, margin: 0 }}>
              TrackMent is the institutional project governance and peer-accountability platform developed for RV College
              of Engineering. It streamlines continuous internal evaluation (CIE), proof deliverable submission, and faculty
              mentorship supervision across all phases of engineering projects.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                gap: 14,
                marginTop: 20,
              }}
            >
              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: '#FFFFFF',
                  border: '1px solid #D5E8EF',
                  boxShadow: '0 2px 8px rgba(12, 64, 101, 0.04)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#E5F3FA',
                    color: '#0B4D88',
                    display: 'grid',
                    placeItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Users size={18} />
                </div>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: '#102F48', margin: '0 0 6px 0' }}>
                  Student Members
                </h4>
                <p style={{ fontSize: 12.5, color: '#5E788C', lineHeight: 1.5, margin: 0 }}>
                  Submit micro-deliverables with attached evidence (PDF, videos, docs), participate in peer reviews, and track personal verified progress.
                </p>
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: '#FFFFFF',
                  border: '1px solid #D5E8EF',
                  boxShadow: '0 2px 8px rgba(12, 64, 101, 0.04)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#E4F6F0',
                    color: '#328F81',
                    display: 'grid',
                    placeItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <ShieldCheck size={18} />
                </div>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: '#102F48', margin: '0 0 6px 0' }}>
                  Team Leads
                </h4>
                <p style={{ fontSize: 12.5, color: '#5E788C', lineHeight: 1.5, margin: 0 }}>
                  Manage roster and invitations, maintain objectives checklist, upload official institutional reports, and coordinate mentor consultations.
                </p>
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: '#FFFFFF',
                  border: '1px solid #D5E8EF',
                  boxShadow: '0 2px 8px rgba(12, 64, 101, 0.04)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#EDEBFA',
                    color: '#6D65A5',
                    display: 'grid',
                    placeItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <GraduationCap size={18} />
                </div>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: '#102F48', margin: '0 0 6px 0' }}>
                  Faculty Mentors
                </h4>
                <p style={{ fontSize: 12.5, color: '#5E788C', lineHeight: 1.5, margin: 0 }}>
                  Supervise multiple assigned teams via Gantt timeline, review submitted deliverables and proofs, and record official continuous evaluation marks.
                </p>
              </div>
            </div>
          </AppCard>
        </div>
      )}

      {/* Section 2: Rubrics Marking Scheme */}
      {activeSection === 'rubrics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AppCard title="RVCE Experiential Learning 200-Mark Scale" subtitle="Governed by Circular RVCE/DA/030/2026-27">
            <p style={{ fontSize: 13.5, color: '#31566E', lineHeight: 1.6, margin: '0 0 16px 0' }}>
              Academic evaluations in TrackMent strictly adhere to the 200-mark Experiential Learning distribution.
              Fractional marks are distributed across canonical criteria using the Hamilton-Hare Largest Remainder algorithm.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Phase 1 */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: '#FFFFFF',
                  border: '1px solid #D5E8EF',
                  boxShadow: '0 2px 8px rgba(12, 64, 101, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 850, color: '#102F48', margin: 0 }}>
                      Phase 1: Synopsis & Formulation
                    </h4>
                    <span className="badge badge-confirmed">Max 40 Marks</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#5E788C', fontWeight: 600 }}>Weight: 20%</span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <div style={{ padding: 10, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11.5, color: '#5E788C' }}>Problem Formulation & Literature</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#102F48', marginTop: 2 }}>20 Marks (50%)</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11.5, color: '#5E788C' }}>Project Objectives & Scope</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#102F48', marginTop: 2 }}>10 Marks (25%)</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11.5, color: '#5E788C' }}>Methodology & Architecture</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#102F48', marginTop: 2 }}>10 Marks (25%)</div>
                  </div>
                </div>
              </div>

              {/* Phase 2 */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: '#FFFFFF',
                  border: '1px solid #D5E8EF',
                  boxShadow: '0 2px 8px rgba(12, 64, 101, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 850, color: '#102F48', margin: 0 }}>
                      Phase 2: Milestone Review
                    </h4>
                    <span className="badge badge-blue">Max 60 Marks</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#5E788C', fontWeight: 600 }}>Weight: 30%</span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <div style={{ padding: 10, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11.5, color: '#5E788C' }}>Project Execution</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#102F48', marginTop: 2 }}>30 Marks (50%)</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11.5, color: '#5E788C' }}>Tools & Techniques</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#102F48', marginTop: 2 }}>20 Marks (33.3%)</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11.5, color: '#5E788C' }}>Partial Results (4+3+3)</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#102F48', marginTop: 2 }}>10 Marks (16.7%)</div>
                  </div>
                </div>
              </div>

              {/* Phase 3 */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: '#FFFFFF',
                  border: '1px solid #D5E8EF',
                  boxShadow: '0 2px 8px rgba(12, 64, 101, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 850, color: '#102F48', margin: 0 }}>
                      Phase 3: Final Demo & Evaluation
                    </h4>
                    <span className="badge badge-lead">Max 100 Marks</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#5E788C', fontWeight: 600 }}>Weight: 50%</span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <div style={{ padding: 10, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11, color: '#5E788C' }}>Prototype Demonstration</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#102F48', marginTop: 2 }}>30 Marks</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11, color: '#5E788C' }}>Results & Discussion</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#102F48', marginTop: 2 }}>20 Marks</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11, color: '#5E788C' }}>Project Report (PDF)</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#102F48', marginTop: 2 }}>20 Marks</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11, color: '#5E788C' }}>Poster & PPT Presentation</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#102F48', marginTop: 2 }}>10 Marks</div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: '#EDEBFA',
                    border: '1px solid rgba(109, 101, 165, 0.25)',
                    fontSize: 12,
                    color: '#6D65A5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Sparkles size={16} />
                  <span>
                    <strong>Ceiling Guard:</strong> Core deliverables cap at 80 Marks. Marks from 81 to 100 are strictly reserved for Notable Outcomes and Peer-Reviewed Publications.
                  </span>
                </div>
              </div>
            </div>
          </AppCard>
        </div>
      )}

      {/* Section 3: Team Governance */}
      {activeSection === 'leads' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AppCard title="Team Formation & Leadership Governance" subtitle="Roster rules and peer accountability protocol">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 14, borderRadius: 12, background: '#FFFFFF', border: '1px solid #D5E8EF' }}>
                <h5 style={{ fontSize: 13.5, fontWeight: 800, color: '#102F48', margin: '0 0 4px 0' }}>
                  Roster Size & Domain Enforcement
                </h5>
                <p style={{ fontSize: 12.5, color: '#5E788C', lineHeight: 1.55, margin: 0 }}>
                  Teams must strictly consist of members holding verified <code style={{ color: '#0B4D88', fontWeight: 700 }}>@rvce.edu.in</code> accounts.
                  Maximum team size is 4 members as per institutional academic council norms.
                </p>
              </div>

              <div style={{ padding: 14, borderRadius: 12, background: '#FFFFFF', border: '1px solid #D5E8EF' }}>
                <h5 style={{ fontSize: 13.5, fontWeight: 800, color: '#102F48', margin: '0 0 4px 0' }}>
                  Democratic Leadership Succession
                </h5>
                <p style={{ fontSize: 12.5, color: '#5E788C', lineHeight: 1.55, margin: 0 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AppCard title="Institutional Report Submission Guidelines" subtitle="PDF format and cloud storage requirements">
            <p style={{ fontSize: 13, color: '#31566E', lineHeight: 1.6, margin: '0 0 16px 0' }}>
              TrackMent provides dedicated storage slots for official institutional deliverables stored in a private
              cloud bucket with encrypted access tokens.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
              <div style={{ padding: 16, borderRadius: 14, background: '#FFFFFF', border: '1px solid #D5E8EF' }}>
                <span className="badge badge-lead">SLOT 1 • MANDATORY</span>
                <h4 style={{ fontSize: 14.5, fontWeight: 800, color: '#102F48', margin: '10px 0 6px 0' }}>
                  Primary Project Report
                </h4>
                <ul style={{ fontSize: 12.5, color: '#5E788C', lineHeight: 1.6, paddingLeft: 18, margin: 0 }}>
                  <li>Comprehensive institutional report adhering to RVCE formatting guidelines.</li>
                  <li>PDF format only, maximum file size 10 MB.</li>
                  <li>Uploaded exclusively by the authorized Team Lead.</li>
                </ul>
              </div>

              <div style={{ padding: 16, borderRadius: 14, background: '#FFFFFF', border: '1px solid #D5E8EF' }}>
                <span className="badge badge-blue">SLOT 2 • OPTIONAL</span>
                <h4 style={{ fontSize: 14.5, fontWeight: 800, color: '#102F48', margin: '10px 0 6px 0' }}>
                  Supplementary Material
                </h4>
                <ul style={{ fontSize: 12.5, color: '#5E788C', lineHeight: 1.6, paddingLeft: 18, margin: 0 }}>
                  <li>Appendices, user manuals, survey results, or schematic diagrams.</li>
                  <li>PDF format only, maximum file size 10 MB.</li>
                  <li>Can be replaced or updated at any point during project phases.</li>
                </ul>
              </div>
            </div>
          </AppCard>
        </div>
      )}

      {/* Section 5: FAQ & Troubleshooting */}
      {activeSection === 'faq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <AppCard title="Frequently Asked Questions" subtitle="Common inquiries and platform troubleshooting">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: 14, borderRadius: 12, background: '#FFFFFF', border: '1px solid #D5E8EF' }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#102F48' }}>
                  Why did my document upload fail?
                </div>
                <p style={{ fontSize: 12.5, color: '#5E788C', lineHeight: 1.55, margin: '6px 0 0 0' }}>
                  Deliverable proof files must have one of the supported extensions: PDF, DOC, DOCX, PPT, PPTX, MP4, MOV, MKV, JPG, JPEG, or PNG,
                  and must be below 10 MB. Institutional project reports in the Team Info screen must strictly be in PDF format.
                </p>
              </div>

              <div style={{ padding: 14, borderRadius: 12, background: '#FFFFFF', border: '1px solid #D5E8EF' }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#102F48' }}>
                  How does the Hamilton-Hare rubric score sync work?
                </div>
                <p style={{ fontSize: 12.5, color: '#5E788C', lineHeight: 1.55, margin: '6px 0 0 0' }}>
                  When a mentor enters total phase marks (e.g. 35 out of 40), the Largest Remainder algorithm calculates exact
                  proportional scores for each criterion and distributes any remainder based on priority, avoiding fractional rounding errors.
                </p>
              </div>

              <div style={{ padding: 14, borderRadius: 12, background: '#FFFFFF', border: '1px solid #D5E8EF' }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#102F48' }}>
                  Can other teammates edit the objectives checklist?
                </div>
                <p style={{ fontSize: 12.5, color: '#5E788C', lineHeight: 1.55, margin: '6px 0 0 0' }}>
                  The Objectives Checklist is managed by the Team Lead to maintain consistency. Team members can view all items and track progress.
                </p>
              </div>
            </div>
          </AppCard>
        </div>
      )}

      {/* ── SECTION 6: INTERACTIVE CHECKLIST & TROUBLESHOOTER ── */}
      {activeSection === 'troubleshooter' && (
        <div className="space-y-5">
          <div className="surface-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-[#0A2540]">
                  Quick-Start Onboarding Checklist
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track your setup progress ({completedCount} of {checklistSteps.length} completed)
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0] text-xs font-bold font-mono">
                {Math.round((completedCount / checklistSteps.length) * 100)}%
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-[#1D63ED] transition-all duration-300"
                style={{ width: `${(completedCount / checklistSteps.length) * 100}%` }}
              />
            </div>

            <div className="space-y-2">
              {checklistSteps.map((step) => {
                const checked = Boolean(checkedItems[step.id]);
                return (
                  <label
                    key={step.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      checked
                        ? 'bg-[#ECFDF5]/60 border-[#A7F3D0]'
                        : 'bg-white border-[#D6E4EE] hover:border-[#1D63ED]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setCheckedItems((prev) => ({ ...prev, [step.id]: !prev[step.id] }))
                      }
                      className="w-4 h-4 accent-[#1D63ED] rounded"
                    />
                    <span
                      className={`text-xs font-semibold ${
                        checked ? 'line-through text-slate-500' : 'text-[#0A2540]'
                      }`}
                    >
                      {step.text}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="surface-card rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-[#0A2540]">
                Interactive Issue Troubleshooter
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pick the issue you are experiencing for step-by-step resolution.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'login', label: 'Sign-In / OAuth' },
                { id: 'pdf', label: 'PDF Viewer / Download' },
                { id: 'marks', label: 'Marks Visibility' },
                { id: 'team', label: 'Team Invites' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSymptom(s.id)}
                  className={`h-9 px-3.5 rounded-lg text-xs font-bold border transition-colors ${
                    selectedSymptom === s.id
                      ? 'bg-[#1D63ED] text-white border-[#1D63ED]'
                      : 'bg-white text-slate-600 border-[#D6E4EE] hover:border-[#1D63ED]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-slate-50/90 border border-[#D6E4EE] space-y-2.5">
              <div className="text-sm font-bold text-[#0A2540]">
                {troubleshooterGuides[selectedSymptom].title}
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-700 leading-relaxed">
                {troubleshooterGuides[selectedSymptom].steps.map((st, idx) => (
                  <li key={idx}>{st}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
