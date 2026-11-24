import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Scale,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Lock,
  FileText,
  Users,
  BookOpen,
} from 'lucide-react';

interface TldrTopic {
  id: string;
  label: string;
  question: string;
  answer: string;
  keyPoints: string[];
}

const TLDR_TOPICS: TldrTopic[] = [
  {
    id: 'auth',
    label: 'Account & @rvce.edu.in',
    question: 'Who can sign in to TrackMent?',
    answer:
      'Only verified RVCE students and faculty members with an official @rvce.edu.in institutional email address can authenticate and access project workspaces.',
    keyPoints: [
      'Google OAuth & email sign-in strictly enforce the @rvce.edu.in domain.',
      'Your role (Student, Team Lead, or Mentor) is automatically verified.',
      'Never share your account credentials or session tokens with others.',
    ],
  },
  {
    id: 'files',
    label: 'PDFs & Proof Uploads',
    question: 'How are our project reports and PDFs handled?',
    answer:
      'Uploaded reports and contribution proofs are stored privately in Supabase Storage and rendered inside TrackMent’s isolated in-app Blob PDF viewer so signed URLs are never leaked.',
    keyPoints: [
      'Only authorized team members and assigned faculty mentors can view files.',
      'Downloaded PDFs are automatically named <team_name>_<submission_number>.pdf.',
      'Do not upload copyrighted third-party material or sensitive personal data.',
    ],
  },
  {
    id: 'marks',
    label: 'CIE Marks & Ledger',
    question: 'Are marks and attendance records official?',
    answer:
      'TrackMent records continuous CIE evaluations, rubric scores, and consultation ledger attendance entered by your assigned faculty mentor.',
    keyPoints: [
      'Mentors control when CIE marks become visible to students.',
      'Individual member scores are isolated so you only see your own marks.',
      'In case of any discrepancy, contact your faculty mentor directly.',
    ],
  },
  {
    id: 'privacy',
    label: 'Data & Privacy',
    question: 'What data does TrackMent store?',
    answer:
      'TrackMent stores only academic profile information (name, USN, branch, semester), team membership, contribution logs, meeting remarks, and rubric evaluations.',
    keyPoints: [
      'Zero third-party advertising or external data selling.',
      'Row-Level Security (RLS) isolates data strictly by team and mentor assignment.',
      'Data is retained strictly for institutional project evaluation.',
    ],
  },
];

export const TermsScreen: React.FC = () => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(TLDR_TOPICS[0].id);
  const activeTopic = TLDR_TOPICS.find((t) => t.id === selectedTopicId) || TLDR_TOPICS[0];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 frosted-chrome border-b border-[#D6E4EE]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link
            to="/home"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#0A2540] hover:text-[#1D63ED] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>

          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#1D63ED]" />
            <span className="text-sm font-extrabold text-[#0A2540]">Terms &amp; Privacy</span>
          </div>

          <Link
            to="/manual"
            className="h-8 px-3 rounded-lg border border-[#D6E4EE] bg-white hover:bg-slate-50 text-xs font-semibold text-[#0A2540] inline-flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#1D63ED]" />
            <span>User Manual</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Hero */}
        <section className="surface-card rounded-2xl p-6 sm:p-8 space-y-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D63ED] text-[11px] font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Institutional Policy • RVCE TrackMent</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A2540]">
            Terms of Use &amp; Privacy Notice
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Clear, student-friendly guidelines governing institutional access, document security,
            and academic evaluation records on TrackMent.
          </p>
        </section>

        {/* Interactive TL;DR Resolver */}
        <section className="surface-card rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#1D63ED]" />
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#0A2540]">
                Interactive TL;DR Resolver
              </h2>
              <p className="text-xs text-slate-500">
                Select a topic below for an instant plain-English summary.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {TLDR_TOPICS.map((topic) => {
              const active = topic.id === activeTopic.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`h-9 px-3.5 rounded-lg text-xs font-bold border transition-colors ${
                    active
                      ? 'bg-[#1D63ED] text-white border-[#1D63ED] shadow-sm'
                      : 'bg-white text-slate-600 border-[#D6E4EE] hover:border-[#1D63ED] hover:text-[#0A2540]'
                  }`}
                >
                  {topic.label}
                </button>
              );
            })}
          </div>

          <div className="p-5 rounded-xl bg-slate-50/90 border border-[#D6E4EE] space-y-3">
            <h3 className="text-sm sm:text-base font-bold text-[#0A2540]">
              {activeTopic.question}
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {activeTopic.answer}
            </p>
            <ul className="space-y-2 pt-1">
              {activeTopic.keyPoints.map((pt) => (
                <li key={pt} className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0 mt-0.5" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Full Policy Sections */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="surface-card rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-[#0A2540] font-bold text-sm">
              <Lock className="w-4 h-4 text-[#1D63ED]" />
              <span>1. Authentication &amp; Role Access</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Access is restricted to active `@rvce.edu.in` accounts. Attempting to bypass role
              guards, impersonate another student or faculty member, or tamper with team records
              violates institutional conduct policies.
            </p>
          </div>

          <div className="surface-card rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-[#0A2540] font-bold text-sm">
              <FileText className="w-4 h-4 text-[#1D63ED]" />
              <span>2. Academic Submissions &amp; Proofs</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              All uploaded PDFs, reports, and contribution proofs must represent authentic student
              work. Team Leads and Mentors may review, verify, or request revisions on submitted
              deliverables.
            </p>
          </div>

          <div className="surface-card rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-[#0A2540] font-bold text-sm">
              <Users className="w-4 h-4 text-[#1D63ED]" />
              <span>3. Team Membership &amp; Mentorship</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Students may join one active project team at a time. Faculty mentors may accept or
              relinquish team supervision in accordance with department allocation rules.
            </p>
          </div>

          <div className="surface-card rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-[#0A2540] font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-[#1D63ED]" />
              <span>4. Security &amp; Data Protection</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              TrackMent enforces Supabase Row-Level Security (RLS) and in-app Blob PDF rendering to
              prevent unauthorized access or credential leakage.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};
