import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { AuthService } from '../services/auth.service';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { RouteLoadingSpinner } from '../components/common/RouteLoadingSpinner';

// Fast critical path - loaded directly
import { LoginScreen } from '../features/auth/LoginScreen';

// Code-split dynamic routes - loaded on-demand
const StudentProfileScreen = lazy(() => import('../features/auth/StudentProfileScreen').then(m => ({ default: m.StudentProfileScreen })));
const FacultyProfileScreen = lazy(() => import('../features/auth/FacultyProfileScreen').then(m => ({ default: m.FacultyProfileScreen })));
const SetPasswordScreen = lazy(() => import('../features/auth/SetPasswordScreen').then(m => ({ default: m.SetPasswordScreen })));
const EditProfileScreen = lazy(() => import('../features/auth/EditProfileScreen').then(m => ({ default: m.EditProfileScreen })));

// Student screens
const StudentDashboard = lazy(() => import('../features/student/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const MyContributionsScreen = lazy(() => import('../features/student/MyContributionsScreen').then(m => ({ default: m.MyContributionsScreen })));
const TeamInfoScreen = lazy(() => import('../features/student/TeamInfoScreen').then(m => ({ default: m.TeamInfoScreen })));
const LeaderVotesScreen = lazy(() => import('../features/student/LeaderVotesScreen').then(m => ({ default: m.LeaderVotesScreen })));
const StudentMeetingScreen = lazy(() => import('../features/student/StudentMeetingScreen').then(m => ({ default: m.StudentMeetingScreen })));
const StudentLedgerScreen = lazy(() => import('../features/student/StudentLedgerScreen').then(m => ({ default: m.StudentLedgerScreen })));

// Team Lead screens
const LeadDashboard = lazy(() => import('../features/lead/LeadDashboard').then(m => ({ default: m.LeadDashboard })));
const ReviewContributionsScreen = lazy(() => import('../features/lead/ReviewContributionsScreen').then(m => ({ default: m.ReviewContributionsScreen })));
const UpdateProgressModal = lazy(() => import('../features/lead/UpdateProgressModal').then(m => ({ default: m.UpdateProgressModal })));
const JoinRequestsScreen = lazy(() => import('../features/lead/JoinRequestsScreen').then(m => ({ default: m.JoinRequestsScreen })));
const BrowseMentorsScreen = lazy(() => import('../features/lead/BrowseMentorsScreen').then(m => ({ default: m.BrowseMentorsScreen })));

// Mentor screens
const MentorDashboard = lazy(() => import('../features/mentor/MentorDashboard').then(m => ({ default: m.MentorDashboard })));
const TeamAdditionMenu = lazy(() => import('../features/mentor/TeamAdditionMenu').then(m => ({ default: m.TeamAdditionMenu })));
const TeamInformationView = lazy(() => import('../features/mentor/TeamInformationView').then(m => ({ default: m.TeamInformationView })));
const SplitTriageScreen = lazy(() => import('../features/mentor/SplitTriageScreen').then(m => ({ default: m.SplitTriageScreen })));
const QueueMonitorScreen = lazy(() => import('../features/mentor/QueueMonitorScreen').then(m => ({ default: m.QueueMonitorScreen })));
const EntryLedgerScreen = lazy(() => import('../features/mentor/EntryLedgerScreen').then(m => ({ default: m.EntryLedgerScreen })));

// Team Formation screens
const BeforeTeamScreen = lazy(() => import('../features/team-formation/BeforeTeamScreen').then(m => ({ default: m.BeforeTeamScreen })));
const CreateTeamScreen = lazy(() => import('../features/team-formation/CreateTeamScreen').then(m => ({ default: m.CreateTeamScreen })));
const BrowseTeamsScreen = lazy(() => import('../features/team-formation/BrowseTeamsScreen').then(m => ({ default: m.BrowseTeamsScreen })));
const BrowseStudentsScreen = lazy(() => import('../features/team-formation/BrowseStudentsScreen').then(m => ({ default: m.BrowseStudentsScreen })));
const TeamInvitationsModal = lazy(() => import('../features/team-formation/TeamInvitationsModal').then(m => ({ default: m.TeamInvitationsModal })));

// Docs & Public Experience
const HomeScreen = lazy(() => import('../features/home/HomeScreen').then(m => ({ default: m.HomeScreen })));
const TermsScreen = lazy(() => import('../features/legal/TermsScreen').then(m => ({ default: m.TermsScreen })));
const UserManualScreen = lazy(() => import('../features/docs/UserManualScreen').then(m => ({ default: m.UserManualScreen })));

/** Root redirect helper based on role */
const RootRedirect: React.FC = () => {
  const { status, user, profile, isMentor, isLead } = useAuth();
  const { team } = useTeam();
  if (status === 'loading') return null;
  if (status === 'guest' || !user) return <Navigate to="/home" replace />;
  if (status === 'newUser') {
    const detected = AuthService.detectEmailRole(user?.email);
    return <Navigate to={detected === 'MENTOR' ? '/profile/faculty' : '/profile/student'} replace />;
  }
  if (!profile) return <Navigate to="/login" replace />;
  if (isMentor) return <Navigate to="/mentor/dashboard" replace />;
  const isLeader = Boolean(isLead || (team && team.leaderId === profile.id) || profile.role === 'TEAM_LEAD');
  if (isLeader) return <Navigate to="/lead/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
};

/** 404 Not Found Page */
const NotFoundPage: React.FC = () => {
  const { profile, isMentor, isLead } = useAuth();
  const { team } = useTeam();
  const navigate = useNavigate();
  const location = useLocation();

  const isLeader = Boolean(isLead || (team && profile && team.leaderId === profile.id) || profile?.role === 'TEAM_LEAD');
  const homeRoute = profile
    ? isMentor
      ? '/mentor/dashboard'
      : isLeader
      ? '/lead/dashboard'
      : '/student/dashboard'
    : '/login';

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="surface-card max-w-md w-full p-8 text-center">
        <div className="w-14 h-14 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D63ED] flex items-center justify-center mx-auto mb-5">
          <Search className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-[#0A2540] mb-2">
          Page Not Found
        </h1>
        <p className="text-[13px] text-slate-500 leading-relaxed mb-6">
          The route <span className="font-mono text-slate-700">{location.pathname}</span> could not be resolved or was moved.
        </p>

        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="btn"
          >
            Back to Login
          </button>
          <button
            type="button"
            onClick={() => navigate(homeRoute)}
            className="btn btn-primary"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export const router = createBrowserRouter([
  // Root Redirect
  {
    path: '/',
    element: <RootRedirect />,
  },

  // Public Experience & Auth
  {
    path: '/home',
    element: (
      <Suspense fallback={<RouteLoadingSpinner />}>
        <HomeScreen />
      </Suspense>
    ),
  },
  {
    path: '/terms',
    element: (
      <Suspense fallback={<RouteLoadingSpinner />}>
        <TermsScreen />
      </Suspense>
    ),
  },
  {
    path: '/login',
    element: <LoginScreen />,
  },
  {
    path: '/profile/student',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<RouteLoadingSpinner />}>
          <StudentProfileScreen />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile/faculty',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<RouteLoadingSpinner />}>
          <FacultyProfileScreen />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile/password',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<RouteLoadingSpinner />}>
          <SetPasswordScreen />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/manual',
    element: (
      <Suspense fallback={<RouteLoadingSpinner />}>
        <UserManualScreen />
      </Suspense>
    ),
  },

  // Team Formation Entry Routes (pre-team onboarding, no AppShell)
  {
    path: '/team-formation/before-team',
    element: (
      <ProtectedRoute allowedRoles={['STUDENT', 'TEAM_LEAD']}>
        <Suspense fallback={<RouteLoadingSpinner />}>
          <BeforeTeamScreen />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/team-formation/create-team',
    element: (
      <ProtectedRoute allowedRoles={['STUDENT', 'TEAM_LEAD']}>
        <Suspense fallback={<RouteLoadingSpinner />}>
          <CreateTeamScreen />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/team-formation/browse-teams',
    element: (
      <ProtectedRoute allowedRoles={['STUDENT', 'TEAM_LEAD']}>
        <Suspense fallback={<RouteLoadingSpinner />}>
          <BrowseTeamsScreen />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/team-formation/invitations',
    element: (
      <ProtectedRoute allowedRoles={['STUDENT', 'TEAM_LEAD']}>
        <Suspense fallback={<RouteLoadingSpinner />}>
          <TeamInvitationsModal />
        </Suspense>
      </ProtectedRoute>
    ),
  },

  // Protected Core Application Routes inside AppShell
  {
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      // ── Shared Profile & Recruitment Routes inside AppShell ──
      {
        path: '/profile/edit',
        element: (
          <ProtectedRoute>
            <EditProfileScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/team-formation/browse-students',
        element: (
          <ProtectedRoute allowedRoles={['STUDENT', 'TEAM_LEAD']}>
            <BrowseStudentsScreen />
          </ProtectedRoute>
        ),
      },
      // ── Student Workspace ──
      {
        path: '/student/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['STUDENT', 'TEAM_LEAD']} requireTeam>
            <StudentDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '/student/contributions',
        element: (
          <ProtectedRoute allowedRoles={['STUDENT', 'TEAM_LEAD']} requireTeam>
            <MyContributionsScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/student/submissions',
        element: (
          <ProtectedRoute allowedRoles={['STUDENT', 'TEAM_LEAD']} requireTeam>
            <MyContributionsScreen submissionsOnly />
          </ProtectedRoute>
        ),
      },
      {
        path: '/student/team-info',
        element: (
          <ProtectedRoute allowedRoles={['STUDENT', 'TEAM_LEAD']} requireTeam>
            <TeamInfoScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/student/leader-votes',
        element: (
          <ProtectedRoute allowedRoles={['STUDENT', 'TEAM_LEAD']} requireTeam>
            <LeaderVotesScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/student/democratic-review',
        element: (
          <ProtectedRoute allowedRoles={['STUDENT', 'TEAM_LEAD']} requireTeam>
            <LeaderVotesScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/student/meeting',
        element: (
          <ProtectedRoute allowedRoles={['STUDENT', 'TEAM_LEAD']} requireTeam>
            <StudentMeetingScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/student/meetings',
        element: (
          <ProtectedRoute allowedRoles={['STUDENT', 'TEAM_LEAD']} requireTeam>
            <StudentMeetingScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/student/ledger',
        element: (
          <ProtectedRoute allowedRoles={['STUDENT', 'TEAM_LEAD']} requireTeam>
            <StudentLedgerScreen />
          </ProtectedRoute>
        ),
      },

      // ── Team Lead Workspace ──
      {
        path: '/lead/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['TEAM_LEAD']} requireTeam>
            <LeadDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '/lead/review',
        element: (
          <ProtectedRoute allowedRoles={['TEAM_LEAD']} requireTeam>
            <ReviewContributionsScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/lead/progress',
        element: (
          <ProtectedRoute allowedRoles={['TEAM_LEAD']} requireTeam>
            <UpdateProgressModal />
          </ProtectedRoute>
        ),
      },
      {
        path: '/lead/meeting',
        element: (
          <ProtectedRoute allowedRoles={['TEAM_LEAD']} requireTeam>
            <StudentMeetingScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/lead/meetings',
        element: (
          <ProtectedRoute allowedRoles={['TEAM_LEAD']} requireTeam>
            <StudentMeetingScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/lead/ledger',
        element: (
          <ProtectedRoute allowedRoles={['TEAM_LEAD']} requireTeam>
            <StudentLedgerScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/lead/join-requests',
        element: (
          <ProtectedRoute allowedRoles={['TEAM_LEAD']} requireTeam>
            <JoinRequestsScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/lead/browse-mentors',
        element: (
          <ProtectedRoute allowedRoles={['TEAM_LEAD']} requireTeam>
            <BrowseMentorsScreen />
          </ProtectedRoute>
        ),
      },

      // ── Faculty Mentor Workspace ──
      {
        path: '/mentor/dashboard',
        element: (
          <ProtectedRoute allowedRoles={['MENTOR']}>
            <MentorDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '/mentor/add-team',
        element: (
          <ProtectedRoute allowedRoles={['MENTOR']}>
            <TeamAdditionMenu />
          </ProtectedRoute>
        ),
      },
      {
        path: '/mentor/team-info',
        element: (
          <ProtectedRoute allowedRoles={['MENTOR']}>
            <TeamInformationView />
          </ProtectedRoute>
        ),
      },
      {
        path: '/mentor/triage',
        element: (
          <ProtectedRoute allowedRoles={['MENTOR']}>
            <SplitTriageScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/mentor/queue-monitor',
        element: (
          <ProtectedRoute allowedRoles={['MENTOR']}>
            <QueueMonitorScreen />
          </ProtectedRoute>
        ),
      },
      {
        path: '/mentor/ledger',
        element: (
          <ProtectedRoute allowedRoles={['MENTOR']}>
            <EntryLedgerScreen />
          </ProtectedRoute>
        ),
      },
    ],
  },

  // 404 Catch-All
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
