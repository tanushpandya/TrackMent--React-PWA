import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

/** Root redirect helper based on role */
const RootRedirect: React.FC = () => {
  const { status, user, profile, isMentor, isLead } = useAuth();
  if (status === 'loading') return null;
  if (status === 'guest' || !user) return <Navigate to="/login" replace />;
  if (status === 'newUser') {
    const detected = AuthService.detectEmailRole(user?.email);
    return <Navigate to={detected === 'MENTOR' ? '/profile/faculty' : '/profile/student'} replace />;
  }
  if (!profile) return <Navigate to="/login" replace />;
  if (isMentor) return <Navigate to="/mentor/dashboard" replace />;
  if (isLead) return <Navigate to="/lead/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
};

/** 404 Not Found Page (matches Flutter router errorBuilder) */
const NotFoundPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const homeRoute = profile
    ? profile.role === 'MENTOR'
      ? '/mentor/dashboard'
      : profile.role === 'TEAM_LEAD'
      ? '/lead/dashboard'
      : '/student/dashboard'
    : '/login';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAFC',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'rgba(37, 99, 235, 0.1)',
            color: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            margin: '0 auto 20px',
          }}
        >
          🔍
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>
          Page Not Found
        </h1>
        <p style={{ margin: '0 0 24px 0', fontSize: '13.5px', color: '#64748B', lineHeight: 1.5 }}>
          The route "{location.pathname}" could not be resolved or was moved.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: 'white',
              color: '#334155',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Back to Login
          </button>
          <button
            onClick={() => navigate(homeRoute)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#2563EB',
              color: 'white',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
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

  // Auth (Public / Onboarding)
  {
    path: '/login',
    element: <LoginScreen />,
  },
  {
    path: '/profile/student',
    element: (
      <Suspense fallback={<RouteLoadingSpinner />}>
        <StudentProfileScreen />
      </Suspense>
    ),
  },
  {
    path: '/profile/faculty',
    element: (
      <Suspense fallback={<RouteLoadingSpinner />}>
        <FacultyProfileScreen />
      </Suspense>
    ),
  },
  {
    path: '/profile/password',
    element: (
      <Suspense fallback={<RouteLoadingSpinner />}>
        <SetPasswordScreen />
      </Suspense>
    ),
  },
  {
    path: '/profile/edit',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<RouteLoadingSpinner />}>
          <EditProfileScreen />
        </Suspense>
      </ProtectedRoute>
    ),
  },

  // Team Formation Entry Routes
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
    path: '/team-formation/browse-students',
    element: (
      <ProtectedRoute allowedRoles={['STUDENT', 'TEAM_LEAD']}>
        <Suspense fallback={<RouteLoadingSpinner />}>
          <BrowseStudentsScreen />
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
