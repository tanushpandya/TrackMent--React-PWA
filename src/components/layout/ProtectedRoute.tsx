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
  const { status, user, profile, isMentor, isLead } = useAuth();
  const { team, loading: teamLoading } = useTeam();
  const location = useLocation();

  // 1. Still resolving session
  if (status === 'loading' || (status === 'ready' && !isMentor && teamLoading)) {
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
    // Role isolation: Mentors
    if (isMentor) {
      const isAllowed = location.pathname.startsWith('/mentor/') || location.pathname === '/profile/edit';
      if (!isAllowed) {
        return <Navigate to="/mentor/dashboard" replace />;
      }
      return <>{children}</>;
    }

    // Students / Leads cannot access mentor screens
    if (location.pathname.startsWith('/mentor/')) {
      return <Navigate to={isLead ? '/lead/dashboard' : '/student/dashboard'} replace />;
    }

    // Lead-only routes
    const isLeadUser = isLead || (team && team.leaderId === profile.id);
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

    if (allowedRoles && !allowedRoles.includes(profile.role)) {
      return <Navigate to={isLeadUser ? '/lead/dashboard' : '/student/dashboard'} replace />;
    }
  }

  return <>{children}</>;
};
