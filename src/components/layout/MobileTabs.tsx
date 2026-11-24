import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckCircle2, Calendar, Users, Layers, Clock, FileText, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';

export const MobileTabs: React.FC = () => {
  const { profile, isMentor, isLead } = useAuth();
  const { team } = useTeam();

  const isLeader = Boolean(
    isLead || (team && profile && team.leaderId === profile.id) || profile?.role === 'TEAM_LEAD'
  );

  const getTabs = () => {
    if (isMentor) {
      return [
        { label: 'Teams', to: '/mentor/dashboard', icon: LayoutDashboard },
        { label: 'Schedule', to: '/mentor/queue-monitor', icon: Calendar },
        { label: 'Requests', to: '/mentor/triage', icon: Clock },
        { label: 'Ledger', to: '/mentor/ledger', icon: Layers },
        { label: 'Profile', to: '/profile/edit', icon: User },
      ];
    }
    if (isLeader) {
      return [
        { label: 'Dashboard', to: '/lead/dashboard', icon: LayoutDashboard },
        { label: 'Review', to: '/lead/review', icon: FileText },
        { label: 'Team', to: '/student/team-info', icon: Users },
        { label: 'Schedule', to: '/student/meeting', icon: Calendar },
        { label: 'Profile', to: '/profile/edit', icon: User },
      ];
    }
    return [
      { label: 'Dashboard', to: '/student/dashboard', icon: LayoutDashboard },
      { label: 'Proof', to: '/student/contributions', icon: CheckCircle2 },
      { label: 'Schedule', to: '/student/meeting', icon: Calendar },
      { label: 'Team', to: '/student/team-info', icon: Users },
      { label: 'Profile', to: '/profile/edit', icon: User },
    ];
  };

  const tabs = getTabs();

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around px-2 pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] bg-white/95 border-t border-[#D6E4EE] backdrop-blur-md z-40"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                isActive ? 'text-[#1D63ED]' : 'text-slate-500 hover:text-[#0A2540]'
              }`
            }
          >
            <Icon className="w-[18px] h-[18px]" />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
