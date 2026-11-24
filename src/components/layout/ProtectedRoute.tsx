import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
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
      <div className="min-h-screen grid place-items-center bg-[#F4F8FB]">
        <div className="text-center" style={{ animation: 'pageIn 0.3s ease both' }}>
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl brand-mark text-white text-xl font-bold grid place-items-center shadow-md">
            TM
          </div>
          <div className="text-[15px] font-bold text-[#0A2540]">Loading TrackMent...</div>
          <div className="text-xs text-slate-500 mt-1">Connecting to workspace</div>
        </div>
      </div>
    );
  }

  // QA-004 Fix: Dedicated error/retry state for backend outage or offline launch
  if (status === 'error') {
    return (
      <div className="min-h-screen grid place-items-center p-6 bg-[#F4F8FB]">
        <div className="surface-card max-w-md w-full p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#0A2540] mb-2">
            Unable to Connect
          </h2>
          <p className="text-[13px] text-slate-500 leading-relaxed mb-5">
            {authError || 'A network error or server outage occurred while loading your profile. Please check your connection and retry.'}
          </p>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={retryAuth}
              className="btn btn-primary flex-1"
            >
              Retry Connection
            </button>
            <button
              type="button"
              onClick={signOut}
              className="btn btn-secondary"
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

    // QA-011 Fix: Unified lead role detection to prevent blank page redirect loop on lead routes
    const isLeadUser = isLead || (team && team.leaderId === profile.id) || profile.role === 'TEAM_LEAD';

    // Students / Leads cannot access mentor screens
    if (location.pathname.startsWith('/mentor/')) {
      return <Navigate to={isLeadUser ? '/lead/dashboard' : '/student/dashboard'} replace />;
    }

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
