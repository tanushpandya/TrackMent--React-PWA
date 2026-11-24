import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  UserPlus,
  Inbox,
  TrendingUp,
  Award,
  Vote,
  LogOut,
  FileText,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClose: () => void;
  accent?: 'lead';
}

const SidebarNavItem: React.FC<NavItemProps> = ({ to, label, icon: Icon, onClose, accent }) => (
  <NavLink
    to={to}
    onClick={onClose}
    className={({ isActive }) =>
      `w-full h-9 px-2.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors text-[13px] ${
        isActive
          ? 'bg-[#EFF6FF] text-[#1D63ED] font-semibold border border-[#BFDBFE]/80'
          : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2540] font-medium'
      }`
    }
  >
    {({ isActive }) => (
      <span className="flex items-center gap-2.5 min-w-0">
        <Icon
          className={`w-4 h-4 shrink-0 ${
            isActive
              ? 'text-[#1D63ED]'
              : accent === 'lead'
              ? 'text-amber-700'
              : 'text-slate-400'
          }`}
        />
        <span className="truncate">{label}</span>
      </span>
    )}
  </NavLink>
);

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { profile, isMentor, isLead, signOut } = useAuth();
  const { team } = useTeam();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const isLeader = Boolean(
    isLead || (team && profile && team.leaderId === profile.id) || profile?.role === 'TEAM_LEAD'
  );

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-[#0A2540]/40 backdrop-blur-[2px] z-40 md:hidden"
        />
      )}

      {/* 240px Fixed/Sticky Desktop Frosted Sidebar */}
      <aside
        className={`w-60 h-screen sticky top-0 frosted-chrome border-r border-[#D6E4EE] flex flex-col z-50 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } fixed md:sticky top-0 left-0 bg-white/95 md:bg-white/90 backdrop-blur-md`}
      >
        {/* Brand Header (56px high aligned with sticky top bar) */}
        <div className="h-14 px-4 border-b border-[#D6E4EE] flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg brand-mark flex items-center justify-center text-white font-bold text-sm shadow-2xs shrink-0">
            TM
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-bold text-[#0A2540] tracking-tight leading-none">
              TrackMent
            </div>
            <div className="text-[9.5px] font-bold tracking-wider text-slate-400 mt-1 uppercase">
              PROJECT COMPANION
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Groups */}
        <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {/* FACULTY NAVIGATION */}
          {isMentor && (
            <div className="space-y-1">
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                WORKSPACE
              </div>
              <SidebarNavItem to="/mentor/dashboard" label="Assigned Teams" icon={LayoutDashboard} onClose={onClose} />
              <SidebarNavItem to="/mentor/queue-monitor" label="Appointment Scheduler" icon={Calendar} onClose={onClose} />
              <SidebarNavItem to="/mentor/ledger" label="Official Ledger" icon={Layers} onClose={onClose} />
              <SidebarNavItem to="/mentor/triage" label="Meeting Requests" icon={Clock} onClose={onClose} />
              <SidebarNavItem to="/mentor/add-team" label="Browse & Add Teams" icon={UserPlus} onClose={onClose} />
            </div>
          )}

          {/* STUDENT & TEAM LEAD UNIFIED WORKSPACE */}
          {!isMentor && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  WORKSPACE
                </div>
                <SidebarNavItem
                  to={isLeader ? '/lead/dashboard' : '/student/dashboard'}
                  label="Dashboard"
                  icon={LayoutDashboard}
                  onClose={onClose}
                />
                <SidebarNavItem to="/student/team-info" label="Team Workspace" icon={Users} onClose={onClose} />
                <SidebarNavItem to="/student/contributions" label="Contributions & Proof" icon={CheckCircle2} onClose={onClose} />
                <SidebarNavItem to="/student/meeting" label="Consultations & Schedule" icon={Calendar} onClose={onClose} />
                <SidebarNavItem to="/student/ledger" label="Official Entry Ledger" icon={Layers} onClose={onClose} />
                <SidebarNavItem to="/student/leader-votes" label="Peer Reviews" icon={Vote} onClose={onClose} />
              </div>

              {/* PRIVILEGED LEAD GOVERNANCE FEATURES (Only shown if user is Team Lead) */}
              {isLeader && (
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center justify-between">
                    <span>LEAD PRIVILEGES</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#B45309] text-[9px] font-bold font-mono">
                      LEAD
                    </span>
                  </div>

                  <SidebarNavItem to="/lead/review" label="Review Submissions" icon={FileText} onClose={onClose} accent="lead" />
                  <SidebarNavItem to="/lead/progress" label="Progress Tracking" icon={TrendingUp} onClose={onClose} accent="lead" />
                  <SidebarNavItem to="/lead/join-requests" label="Join Requests" icon={Inbox} onClose={onClose} accent="lead" />
                  <SidebarNavItem to="/team-formation/browse-students" label="Invite Candidates" icon={UserPlus} onClose={onClose} accent="lead" />
                  <SidebarNavItem to="/lead/browse-mentors" label="Find Mentor" icon={Award} onClose={onClose} accent="lead" />
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Bottom User Card & Quick Profile */}
        <div className="p-3 border-t border-[#D6E4EE] shrink-0 bg-white/70 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/profile/edit');
            }}
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left group rounded-lg p-1 -m-1 hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-[#0F4C81] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              {getInitials(profile?.fullName)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#0A2540] truncate group-hover:text-[#1D63ED] transition-colors">
                {profile?.fullName || 'User'}
              </div>
              <div className="text-[11px] font-mono text-slate-400 truncate">
                {profile?.usn || profile?.facultyCode || (isMentor ? 'Faculty' : 'Member')}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={async () => {
              onClose();
              await signOut();
              showToast('Logged out.', 'info');
              navigate('/login');
            }}
            title="Sign Out"
            aria-label="Sign Out"
            className="w-8 h-8 rounded-lg border border-[#D6E4EE] bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-400 flex items-center justify-center transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    </>
  );
};
