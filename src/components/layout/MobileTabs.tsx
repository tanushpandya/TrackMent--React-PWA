import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Sparkles, Calendar, Users, CheckCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MobileTabs: React.FC = () => {
  const { isMentor, isLead } = useAuth();

  const getTabs = () => {
    if (isMentor) {
      return [
        { label: 'Overview', to: '/mentor/dashboard', icon: Home },
        { label: 'Add Team', to: '/mentor/add-team', icon: Users },
        { label: 'Triage', to: '/mentor/triage', icon: CheckCircle },
        { label: 'Queue', to: '/mentor/queue-monitor', icon: Calendar },
      ];
    }
    if (isLead) {
      return [
        { label: 'Overview', to: '/lead/dashboard', icon: Home },
        { label: 'Review', to: '/lead/review', icon: CheckCircle },
        { label: 'Progress', to: '/lead/progress', icon: TrendingUp },
        { label: 'Meetings', to: '/lead/meeting', icon: Calendar },
      ];
    }
    // Student
    return [
      { label: 'Dashboard', to: '/student/dashboard', icon: Home },
      { label: 'Contributions', to: '/student/contributions', icon: Sparkles },
      { label: 'Meetings', to: '/student/meeting', icon: Calendar },
      { label: 'My Team', to: '/student/team-info', icon: Users },
    ];
  };

  const tabs = getTabs();

  return (
    <nav
      className="mobile-only"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-around',
        padding: '8px 10px max(10px, env(safe-area-inset-bottom))',
        background: 'rgba(249, 253, 254, 0.94)',
        borderTop: '1px solid rgba(200, 224, 232, 0.8)',
        backdropFilter: 'blur(16px)',
        zIndex: 80,
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              textDecoration: 'none',
              color: isActive ? '#155F98' : '#718C9B',
              fontSize: 10,
              fontWeight: 800,
              padding: '4px 8px',
            })}
          >
            <Icon size={19} />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
