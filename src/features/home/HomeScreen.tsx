import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  FileText,
  Users,
  Calendar,
  Award,
  CheckCircle2,
  BookOpen,
  Scale,
  GraduationCap,
  Briefcase,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type PreviewRole = 'student' | 'lead' | 'mentor';

const ROLE_PREVIEWS: Record<
  PreviewRole,
  {
    label: string;
    badge: string;
    headline: string;
    summary: string;
    metrics: { label: string; value: string; accent: string }[];
    highlights: string[];
  }
> = {
  student: {
    label: 'Student',
    badge: 'Individual Contributor',
    headline: 'Track contributions, proofs & CIE marks in one place',
    summary:
      'Log weekly deliverables with GitHub/PDF proofs, monitor your institutional phase milestones, and view verified consultation attendance.',
    metrics: [
      { label: 'Verified Proofs', value: '12', accent: 'text-[#15803D]' },
      { label: 'Phase 1 & 2 CIE', value: '44 / 50', accent: 'text-[#1D63ED]' },
      { label: 'Attendance Logs', value: '100%', accent: 'text-[#0A2540]' },
    ],
    highlights: [
      'Submit proof documents & links with peer-review status tracking',
      'View authentic RVCE rubric breakdowns directly on your dashboard',
      'Check upcoming mentor consultation slots & meeting remarks',
    ],
  },
  lead: {
    label: 'Team Lead',
    badge: 'Squad Coordinator',
    headline: 'Coordinate your squad, approve proofs & ship phase reports',
    summary:
      'Manage team recruitment, verify teammate contributions before mentor review, maintain the objectives checklist, and upload official phase PDFs.',
    metrics: [
      { label: 'Pending Reviews', value: '3', accent: 'text-[#B45309]' },
      { label: 'Objectives Done', value: '4 / 5', accent: 'text-[#15803D]' },
      { label: 'Squad Progress', value: '82%', accent: 'text-[#1D63ED]' },
    ],
    highlights: [
      'Review & approve peer contributions with one-click verification',
      'Invite engineering peers or process incoming join requests',
      'Upload Primary & Supplementary RVCE phase reports securely',
    ],
  },
  mentor: {
    label: 'Faculty Mentor',
    badge: 'Cohort Evaluator',
    headline: 'Evaluate cohorts with Gantt timelines & secure PDF previews',
    summary:
      'Oversee all assigned teams in a clean cohort table or institutional Gantt chart, grade CIE rubrics, broadcast notices, and inspect PDFs safely in-app.',
    metrics: [
      { label: 'Assigned Teams', value: '8', accent: 'text-[#1D63ED]' },
      { label: 'Avg Cohort Score', value: '86%', accent: 'text-[#15803D]' },
      { label: 'Pending Meetings', value: '2', accent: 'text-[#B45309]' },
    ],
    highlights: [
      'Switch seamlessly between Cohort Table and Institutional Phase Gantt',
      'Preview team PDFs inside an isolated in-app viewer with clean naming',
      'Export complete Excel CIE marks sheets with one click',
    ],
  },
};

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Institutional Phase Gantt',
    desc: 'Canonical RVCE Phase 1, 2 & 3 timelines with prioritized deliverable classification and milestone tracking.',
  },
  {
    icon: Award,
    title: 'Authentic RVCE Rubrics',
    desc: 'Transparent CIE marks allocation, individual member scoring, and mentor-controlled marks visibility.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure In-App PDF Viewer',
    desc: 'Documents render inside isolated in-memory Blob viewers so storage credentials are never exposed, with clean team-named downloads.',
  },
  {
    icon: Calendar,
    title: 'Official Consultation Ledger',
    desc: 'Schedule mentor meetings, log attendance per student, and preserve permanent meeting remarks.',
  },
  {
    icon: Users,
    title: 'Smart Team Formation',
    desc: 'Discover peers by branch and skills, send invitations, manage join requests, and select faculty mentors.',
  },
  {
    icon: FileText,
    title: 'Objectives & Phase Reports',
    desc: 'Interactive markdown objectives checklists paired with Primary and Supplementary report submission slots.',
  },
];

export const HomeScreen: React.FC = () => {
  const { user, profile, isMentor, isLead } = useAuth();
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState<PreviewRole>('mentor');

  const dashboardRoute = profile
    ? isMentor
      ? '/mentor/dashboard'
      : isLead
      ? '/lead/dashboard'
      : '/student/dashboard'
    : '/login';

  const preview = ROLE_PREVIEWS[activeRole];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Frosted Top Navigation */}
      <header className="sticky top-0 z-40 frosted-chrome border-b border-[#D6E4EE]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/home" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl brand-mark text-white flex items-center justify-center font-bold text-sm shadow-sm">
              TM
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-[#0A2540]">TrackMent</span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#1D63ED] border border-[#BFDBFE] text-[10px] font-bold uppercase tracking-wider">
                RVCE PWA
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#preview" className="hover:text-[#1D63ED] transition-colors">
              Workspace Preview
            </a>
            <a href="#features" className="hover:text-[#1D63ED] transition-colors">
              Capabilities
            </a>
            <Link to="/manual" className="hover:text-[#1D63ED] transition-colors">
              User Manual
            </Link>
            <Link to="/terms" className="hover:text-[#1D63ED] transition-colors">
              Terms &amp; Privacy
            </Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              to="/manual"
              className="hidden sm:inline-flex h-9 px-3.5 rounded-lg border border-[#D6E4EE] bg-white hover:bg-slate-50 text-xs font-semibold text-[#0A2540] items-center gap-1.5 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#1D63ED]" />
              <span>Guide</span>
            </Link>
            <button
              type="button"
              onClick={() => navigate(user ? dashboardRoute : '/login')}
              className="h-9 px-4 rounded-lg bg-[#1D63ED] hover:bg-[#1752C9] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>{user ? 'Open Workspace' : 'Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-14">
        {/* Hero Section */}
        <section className="surface-card rounded-2xl p-6 sm:p-10 text-center space-y-5 relative overflow-hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D63ED] text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Academic Project Mentorship &amp; CIE Tracking</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0A2540] max-w-3xl mx-auto leading-tight">
            One workspace for students, team leads, and faculty mentors.
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            TrackMent streamlines engineering project lifecycles at RVCE — from team formation and
            verified contribution proofs to institutional Gantt timelines, consultation ledgers, and
            authentic CIE evaluations.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(user ? dashboardRoute : '/login')}
              className="h-11 px-6 rounded-xl bg-[#1D63ED] hover:bg-[#1752C9] text-white text-sm font-bold inline-flex items-center gap-2 transition-colors shadow-sm"
            >
              <span>{user ? 'Go to My Dashboard' : 'Sign In with @rvce.edu.in'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/manual"
              className="h-11 px-5 rounded-xl border border-[#D6E4EE] bg-white hover:bg-slate-50 text-[#0A2540] text-sm font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-[#1D63ED]" />
              <span>User Manual &amp; Troubleshooter</span>
            </Link>
          </div>
        </section>

        {/* Interactive Workspace Preview */}
        <section id="preview" className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A2540]">
                Interactive Workspace Preview
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Switch roles to explore how TrackMent adapts to each member of the academic workflow.
              </p>
            </div>

            <div className="inline-flex rounded-xl border border-[#D6E4EE] bg-white/90 p-1 self-start sm:self-auto">
              {(
                [
                  { id: 'student', label: 'Student', icon: GraduationCap },
                  { id: 'lead', label: 'Team Lead', icon: Layers },
                  { id: 'mentor', label: 'Mentor', icon: Briefcase },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeRole === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveRole(tab.id)}
                    className={`h-9 px-3.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
                      isActive
                        ? 'bg-[#1D63ED] text-white shadow-sm'
                        : 'text-slate-600 hover:text-[#0A2540]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="surface-card rounded-2xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-block px-2.5 py-1 rounded-md bg-[#EFF6FF] text-[#1D63ED] border border-[#BFDBFE] text-[11px] font-bold uppercase tracking-wider">
                {preview.badge}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-[#0A2540]">{preview.headline}</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{preview.summary}</p>
              <ul className="space-y-2.5 pt-1">
                {preview.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#0A2540]">
                    <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
              {preview.metrics.map((m) => (
                <div
                  key={m.label}
                  className="p-4 rounded-xl border border-[#D6E4EE] bg-slate-50/80 flex items-center justify-between"
                >
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {m.label}
                  </span>
                  <span className={`text-xl font-extrabold font-mono ${m.accent}`}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Showcase Grid */}
        <section id="features" className="space-y-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A2540]">
              Built for End-to-End Project Accountability
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Every tool required to plan, verify, and evaluate academic software projects.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="surface-card rounded-xl p-5 space-y-2.5">
                  <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D63ED] flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-[#0A2540]">{f.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="frosted-chrome border-t border-[#D6E4EE] py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="font-semibold text-[#0A2540]">
            TrackMent • RVCE Autonomous Project Mentorship Platform
          </div>
          <div className="flex items-center gap-5">
            <Link to="/manual" className="hover:text-[#1D63ED] inline-flex items-center gap-1 font-medium">
              <BookOpen className="w-3.5 h-3.5" />
              <span>User Manual</span>
            </Link>
            <Link to="/terms" className="hover:text-[#1D63ED] inline-flex items-center gap-1 font-medium">
              <Scale className="w-3.5 h-3.5" />
              <span>Terms &amp; Privacy</span>
            </Link>
            <Link to="/login" className="hover:text-[#1D63ED] font-semibold text-[#1D63ED]">
              Sign In →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
