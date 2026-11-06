import React from 'react';
import { createBrowserRouter, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';

// Auth screens
import { LoginScreen } from '../features/auth/LoginScreen';
import { StudentProfileScreen } from '../features/auth/StudentProfileScreen';
import { FacultyProfileScreen } from '../features/auth/FacultyProfileScreen';
import { SetPasswordScreen } from '../features/auth/SetPasswordScreen';
import { EditProfileScreen } from '../features/auth/EditProfileScreen';

// Student screens
import { StudentDashboard } from '../features/student/StudentDashboard';
import { MyContributionsScreen } from '../features/student/MyContributionsScreen';
import { TeamInfoScreen } from '../features/student/TeamInfoScreen';
import { LeaderVotesScreen } from '../features/student/LeaderVotesScreen';
import { StudentMeetingScreen } from '../features/student/StudentMeetingScreen';
import { StudentLedgerScreen } from '../features/student/StudentLedgerScreen';

// Team Lead screens
import { LeadDashboard } from '../features/lead/LeadDashboard';
import { ReviewContributionsScreen } from '../features/lead/ReviewContributionsScreen';
import { UpdateProgressModal } from '../features/lead/UpdateProgressModal';
import { JoinRequestsScreen } from '../features/lead/JoinRequestsScreen';
import { BrowseMentorsScreen } from '../features/lead/BrowseMentorsScreen';

// Mentor screens
import { MentorDashboard } from '../features/mentor/MentorDashboard';
import { TeamAdditionMenu } from '../features/mentor/TeamAdditionMenu';
import { TeamInformationView } from '../features/mentor/TeamInformationView';
import { SplitTriageScreen } from '../features/mentor/SplitTriageScreen';
import { QueueMonitorScreen } from '../features/mentor/QueueMonitorScreen';
import { EntryLedgerScreen } from '../features/mentor/EntryLedgerScreen';

// Team Formation screens
import { BeforeTeamScreen } from '../features/team-formation/BeforeTeamScreen';
import { CreateTeamScreen } from '../features/team-formation/CreateTeamScreen';
import { BrowseTeamsScreen } from '../features/team-formation/BrowseTeamsScreen';
import { BrowseStudentsScreen } from '../features/team-formation/BrowseStudentsScreen';
import { TeamInvitationsModal } from '../features/team-formation/TeamInvitationsModal';

/** Root redirect helper based on role */
const RootRedirect: React.FC = () => {
  const { status, profile, isMentor, isLead } = useAuth();
  if (status === 'loading') return null;
  if (status === 'guest' || !profile) return <Navigate to="/login" replace />;
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
    element: <StudentProfileScreen />,
  },
  {
    path: '/profile/faculty',
    element: <FacultyProfileScreen />,
  },
  {
    path: '/profile/password',
    element: <SetPasswordScreen />,
  },
  {
    path: '/profile/edit',
    element: (
      <ProtectedRoute>
        <EditProfileScreen />
      </ProtectedRoute>
    ),
  },

  // Team Formation Entry Routes
  {
    path: '/team-formation/before-team',
    element: (
      <ProtectedRoute allowedRoles={['STUDENT', 'TEAM_LEAD']}>
        <BeforeTeamScreen />
      </ProtectedRoute>
    ),
  },
  {
    path: '/team-formation/create-team',
    element: (
      <ProtectedRoute allowedRoles={['STUDENT', 'TEAM_LEAD']}>
        <CreateTeamScreen />
      </ProtectedRoute>
    ),
  },
  {
    path: '/team-formation/browse-teams',
    element: (
      <ProtectedRoute allowedRoles={['STUDENT', 'TEAM_LEAD']}>
        <BrowseTeamsScreen />
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
  {
    path: '/team-formation/invitations',
    element: (
      <ProtectedRoute allowedRoles={['STUDENT', 'TEAM_LEAD']}>
        <TeamInvitationsModal />
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
