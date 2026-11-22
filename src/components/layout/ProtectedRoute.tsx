import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { AuthService } from '../../services/auth.service';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('STUDENT' | 'TEAM_LEAD' | 'MENTOR')[];
  requireTeam?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireTeam = false,
}) => {
  const { status, user, profile, isMentor, isLead, authError, retryAuth, signOut } = useAuth();
  const { team, loading: teamLoading } = useTeam();
  const location = useLocation();

  // 1. Still resolving session on initial cold load
  if (status === 'loading' || (status === 'ready' && !isMentor && teamLoading && team === null)) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'linear-gradient(180deg, #6FAFD0 0%, #C4E0EB 27%, #F6FBFD 53%, #C8E8EF 78%, #A9CEDE 100%)',
        }}
      >
        <div style={{ textAlign: 'center', animation: 'pageIn 0.3s ease both' }}>
          <div
            style={{
              width: 52,
              height: 52,
              margin: '0 auto 16px',
              borderRadius: 16,
              background: 'linear-gradient(145deg, #061d57, #1748b4 64%, #0c2c80)',
              color: '#31d2ec',
              fontSize: 26,
              fontWeight: 950,
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 8px 24px rgba(15, 69, 149, 0.35)',
            }}
          >
            T
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#102F48' }}>Loading TrackMent...</div>
          <div style={{ fontSize: 12, color: '#5E788C', marginTop: 4 }}>Connecting to workspace</div>
        </div>
      </div>
    );
  }

  // QA-004 Fix: Dedicated error/retry state for backend outage or offline launch
  if (status === 'error') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          background: 'linear-gradient(180deg, #6FAFD0 0%, #C4E0EB 27%, #F6FBFD 53%, #C8E8EF 78%, #A9CEDE 100%)',
        }}
      >
        <div
          style={{
            maxWidth: 440,
            width: '100%',
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '32px 24px',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(10, 48, 77, 0.18)',
            border: '1.5px solid #D5E8EF',
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: '#FFF1F2',
              border: '1px solid #FECDD3',
              color: '#E11D48',
              fontSize: 24,
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
            }}
          >
            ⚠️
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#102F48', margin: '0 0 8px 0' }}>
            Unable to Connect
          </h2>
          <p style={{ fontSize: 13, color: '#5E788C', lineHeight: 1.6, margin: '0 0 20px 0' }}>
            {authError || 'A network error or server outage occurred while loading your profile. Please check your connection and retry.'}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={retryAuth}
              className="btn btn-primary"
              style={{ flex: 1, padding: '10px 16px', fontWeight: 800 }}
            >
              Retry Connection
            </button>
            <button
              type="button"
              onClick={signOut}
              className="btn btn-secondary"
              style={{ padding: '10px 16px', fontWeight: 700 }}
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Not logged in
  if (status === 'guest' || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. New user without profile row
  if (status === 'newUser') {
    const detected = AuthService.detectEmailRole(user.email);
    const target = detected === 'MENTOR' ? '/profile/faculty' : '/profile/student';
    if (location.pathname !== target) {
      return <Navigate to={target} replace />;
    }
    return <>{children}</>;
  }

  // 4. Authenticated with profile
  if (profile) {
    // If user already has a profile, redirect away from onboarding forms
    if (location.pathname === '/profile/student' || location.pathname === '/profile/faculty') {
      const isLeadUser = isLead || (team && team.leaderId === profile.id) || profile.role === 'TEAM_LEAD';
      return <Navigate to={isMentor ? '/mentor/dashboard' : isLeadUser ? '/lead/dashboard' : '/student/dashboard'} replace />;
    }

    // Role isolation: Mentors
    if (isMentor) {
      const isAllowed =
        location.pathname.startsWith('/mentor/') ||
        location.pathname === '/profile/edit' ||
        location.pathname === '/profile/password';
      if (!isAllowed) {
        return <Navigate to="/mentor/dashboard" replace />;
      }
      return <>{children}</>;
    }

    // Students / Leads cannot access mentor screens
    if (location.pathname.startsWith('/mentor/')) {
      return <Navigate to={isLead ? '/lead/dashboard' : '/student/dashboard'} replace />;
    }

    // QA-011 Fix: Unified lead role detection to prevent blank page redirect loop on lead routes
    const isLeadUser = isLead || (team && team.leaderId === profile.id) || profile.role === 'TEAM_LEAD';
    if (location.pathname.startsWith('/lead/') && !isLeadUser) {
      return <Navigate to="/student/dashboard" replace />;
    }

    // Team membership isolation
    const hasTeam = Boolean(team);
    const isTeamFormationEntry =
      location.pathname === '/team-formation/before-team' ||
      location.pathname === '/team-formation/create-team' ||
      location.pathname === '/team-formation/browse-teams';

    if (requireTeam && !hasTeam) {
      return <Navigate to="/team-formation/before-team" replace />;
    }

    if (hasTeam && isTeamFormationEntry) {
      return <Navigate to={isLeadUser ? '/lead/dashboard' : '/student/dashboard'} replace />;
    }

    const effectiveRole: ('STUDENT' | 'TEAM_LEAD' | 'MENTOR') = isLeadUser ? 'TEAM_LEAD' : profile.role;
    if (allowedRoles && !allowedRoles.includes(effectiveRole)) {
      return <Navigate to={isLeadUser ? '/lead/dashboard' : '/student/dashboard'} replace />;
    }
  }

  return <>{children}</>;
};
