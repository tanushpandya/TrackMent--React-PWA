import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  CheckCircle,
  TrendingUp,
  Calendar,
  Users,
  Search,
  Mail,
  Vote,
  Sparkles,
  Inbox,
  UserCheck,
  Award,
  Layers,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { profile, isMentor, isLead, isStudent, signOut } = useAuth();
  const { team } = useTeam();
  const navigate = useNavigate();

  const getNavItems = () => {
    if (isMentor) {
      return [
        { label: 'Overview', to: '/mentor/dashboard', icon: Home },
        { label: 'Add Team', to: '/mentor/add-team', icon: Users },
        { label: 'Meeting Requests', to: '/mentor/triage', icon: CheckCircle },
        { label: 'Queue Monitor', to: '/mentor/queue-monitor', icon: Calendar },
        { label: 'Profile', to: '/profile/edit', icon: UserIcon },
      ];
    }

    if (isLead) {
      return [
        { label: 'Overview', to: '/lead/dashboard', icon: Home },
        { label: 'Review Queue', to: '/lead/review', icon: CheckCircle },
        { label: 'Progress', to: '/lead/progress', icon: TrendingUp },
        { label: 'Meetings', to: '/lead/meeting', icon: Calendar },
        { label: 'Join Requests', to: '/lead/join-requests', icon: Inbox },
        { label: 'Find Mentor', to: '/lead/browse-mentors', icon: Award },
        { label: 'Team Details', to: '/student/team-info', icon: Users },
        { label: 'Profile', to: '/profile/edit', icon: UserIcon },
      ];
    }

    // Student member
    return [
      { label: 'Dashboard', to: '/student/dashboard', icon: Home },
      { label: 'Contributions', to: '/student/contributions', icon: Sparkles },
      { label: 'Submissions Queue', to: '/student/submissions', icon: Layers },
      { label: 'Mentor Meetings', to: '/student/meeting', icon: Calendar },
      { label: 'My Team', to: '/student/team-info', icon: Users },
      { label: 'Invitations', to: '/team-formation/invitations', icon: Mail },
      { label: 'Leader Votes', to: '/student/leader-votes', icon: Vote },
      { label: 'Browse Teams', to: '/team-formation/browse-teams', icon: Search },
      { label: 'Profile', to: '/profile/edit', icon: UserIcon },
    ];
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(16, 47, 72, 0.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 90,
            display: 'block',
          }}
        />
      )}

      <aside
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          width: 258,
          padding: '24px 16px 18px 18px',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(249, 253, 254, 0.85)',
          borderRight: '1px solid rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(18px)',
          zIndex: 95,
          transition: 'transform 0.28s ease',
          transform: isOpen || window.innerWidth > 800 ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            margin: '0 6px 28px',
            textDecoration: 'none',
            color: '#102F48',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 38,
              height: 38,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 13,
              color: '#31d2ec',
              fontSize: 22,
              fontWeight: 950,
              background: 'linear-gradient(145deg, #061d57, #1748b4 64%, #0c2c80)',
              boxShadow: '0 6px 16px rgba(15, 69, 149, 0.28)',
              userSelect: 'none',
            }}
          >
            T
            <span
              style={{
                position: 'absolute',
                right: 4,
                top: 3,
                fontSize: 11,
                color: '#43d6ee',
              }}
            >
              ↗
            </span>
          </div>
          <div>
            <div style={{ fontSize: 16.5, fontWeight: 900, letterSpacing: '-0.3px' }}>TrackMent</div>
            <div
              style={{
                fontSize: 8,
                letterSpacing: '1.35px',
                color: '#7190A0',
                fontWeight: 800,
                marginTop: 2,
              }}
            >
              PROJECT COMPANION
            </div>
          </div>
        </div>

        {/* Role Badge Indicator */}
        <div
          style={{
            margin: '0 6px 14px',
            fontSize: 9,
            letterSpacing: '1.2px',
            fontWeight: 900,
            color: '#7A94A3',
          }}
        >
          WORKSPACE
        </div>

        <div
          style={{
            margin: '0 6px 22px',
            padding: '7px 12px',
            borderRadius: 12,
            border: '1px solid #D5E8EF',
            background: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 800, color: '#102F48' }}>
            {isMentor ? 'Faculty Mentor' : isLead ? 'Team Lead' : 'Student Member'}
          </span>
          <span
            className={
              isMentor ? 'badge badge-mentor' : isLead ? 'badge badge-lead' : 'badge badge-blue'
            }
          >
            {isMentor ? 'MENTOR' : isLead ? 'LEAD' : 'STUDENT'}
          </span>
        </div>

        {/* Navigation Items */}
        <div
          style={{
            margin: '0 6px 10px',
            fontSize: 9,
            letterSpacing: '1.2px',
            fontWeight: 900,
            color: '#7A94A3',
          }}
        >
          YOUR SPACE
        </div>

        <nav
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            overflowY: 'auto',
            flex: 1,
            paddingRight: 4,
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 12,
                  color: isActive ? '#145D93' : '#557186',
                  fontSize: 12.5,
                  fontWeight: 750,
                  textDecoration: 'none',
                  background: isActive
                    ? 'linear-gradient(100deg, rgba(199, 233, 245, 0.9), rgba(229, 246, 247, 0.85))'
                    : 'transparent',
                  boxShadow: isActive ? 'inset 3px 0 #2C9CB9' : 'none',
                  transition: 'background 0.18s ease, transform 0.18s ease',
                })}
              >
                <Icon size={17} style={{ color: '#3A7C99', flexShrink: 0 }} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info & Logout */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 14,
            borderTop: '1px solid rgba(190, 218, 228, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#43AE9B',
                boxShadow: '0 0 0 4px rgba(67, 174, 155, 0.15)',
              }}
            />
            <span style={{ fontSize: 9.5, color: '#728C9B', fontWeight: 650 }}>Connected</span>
          </div>

          <button
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            title="Sign Out"
            style={{
              background: 'none',
              border: 'none',
              color: '#8AA0AB',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 750,
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: 6,
            }}
          >
            <LogOut size={13} />
            <span>Exit</span>
          </button>
        </div>
      </aside>
    </>
  );
};
