import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  Sparkles,
  Search,
  Mail,
  User,
  LogOut,
  FolderKanban,
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

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { profile, isMentor, isLead, signOut } = useAuth();
  const { team } = useTeam();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const isLeader = Boolean(isLead || (team && profile && team.leaderId === profile.id));

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const roleLabel = isMentor ? 'MENTOR' : isLeader ? 'TEAM LEAD' : 'STUDENT';
  const roleBadgeStyle = isMentor
    ? 'bg-[#EFF6FF] text-[#1D63ED] border border-[#BFDBFE]'
    : isLeader
    ? 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]'
    : 'bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0]';

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
          <div className="w-8 h-8 rounded-lg brand-mark flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
            TM
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-bold text-[#0A2540] tracking-tight leading-none">TrackMent</div>
            <div className="text-[9.5px] font-bold tracking-wider text-slate-400 mt-1 uppercase">PROJECT COMPANION</div>
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold shrink-0 ${roleBadgeStyle}`}>
            {roleLabel}
          </span>
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {/* FACULTY NAVIGATION */}
          {isMentor && (
            <div className="space-y-1">
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                WORKSPACE
              </div>
              <NavLink
                to="/mentor/dashboard"
                onClick={onClose}
                className={({ isActive }) =>
                  `w-full h-9 px-2.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors text-[13px] ${
                    isActive
                      ? 'bg-[#EFF6FF] text-[#1D63ED] font-semibold border border-[#BFDBFE]/80'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2540] font-medium'
                  }`
                }
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <LayoutDashboard className="w-4 h-4 shrink-0 text-[#1D63ED]" />
                  <span className="truncate">Assigned Teams</span>
                </span>
              </NavLink>

              <NavLink
                to="/mentor/queue-monitor"
                onClick={onClose}
                className={({ isActive }) =>
                  `w-full h-9 px-2.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors text-[13px] ${
                    isActive
                      ? 'bg-[#EFF6FF] text-[#1D63ED] font-semibold border border-[#BFDBFE]/80'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2540] font-medium'
                  }`
                }
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Calendar className="w-4 h-4 shrink-0 text-slate-500" />
                  <span className="truncate">Appointment Scheduler</span>
                </span>
              </NavLink>

              <NavLink
                to="/mentor/ledger"
                onClick={onClose}
                className={({ isActive }) =>
                  `w-full h-9 px-2.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors text-[13px] ${
                    isActive
                      ? 'bg-[#EFF6FF] text-[#1D63ED] font-semibold border border-[#BFDBFE]/80'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2540] font-medium'
                  }`
                }
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Layers className="w-4 h-4 shrink-0 text-slate-500" />
                  <span className="truncate">Official Ledger</span>
                </span>
              </NavLink>

              <NavLink
                to="/mentor/triage"
                onClick={onClose}
                className={({ isActive }) =>
                  `w-full h-9 px-2.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors text-[13px] ${
                    isActive
                      ? 'bg-[#EFF6FF] text-[#1D63ED] font-semibold border border-[#BFDBFE]/80'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2540] font-medium'
                  }`
                }
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Clock className="w-4 h-4 shrink-0 text-slate-500" />
                  <span className="truncate">Meeting Requests</span>
                </span>
              </NavLink>

              <NavLink
                to="/mentor/add-team"
                onClick={onClose}
                className={({ isActive }) =>
                  `w-full h-9 px-2.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors text-[13px] ${
                    isActive
                      ? 'bg-[#EFF6FF] text-[#1D63ED] font-semibold border border-[#BFDBFE]/80'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2540] font-medium'
                  }`
                }
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <UserPlus className="w-4 h-4 shrink-0 text-slate-500" />
                  <span className="truncate">Browse &amp; Add Teams</span>
                </span>
              </NavLink>

              <div className="pt-2">
                <NavLink
                  to="/profile/edit"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `w-full h-9 px-2.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors text-[13px] ${
                      isActive
                        ? 'bg-[#EFF6FF] text-[#1D63ED] font-semibold border border-[#BFDBFE]/80'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2540] font-medium'
                    }`
                  }
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <User className="w-4 h-4 shrink-0 text-slate-500" />
                    <span className="truncate">Profile Settings</span>
                  </span>
                </NavLink>
              </div>
            </div>
          )}

          {/* STUDENT & TEAM LEAD UNIFIED WORKSPACE */}
          {!isMentor && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  WORKSPACE
                </div>
                <NavLink
                  to="/student/dashboard"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `w-full h-9 px-2.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors text-[13px] ${
                      isActive
                        ? 'bg-[#EFF6FF] text-[#1D63ED] font-semibold border border-[#BFDBFE]/80'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2540] font-medium'
                    }`
                  }
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <LayoutDashboard className="w-4 h-4 shrink-0 text-[#1D63ED]" />
                    <span className="truncate">Dashboard</span>
                  </span>
                </NavLink>

                <NavLink
                  to="/student/team-info"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `w-full h-9 px-2.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors text-[13px] ${
                      isActive
                        ? 'bg-[#EFF6FF] text-[#1D63ED] font-semibold border border-[#BFDBFE]/80'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2540] font-medium'
                    }`
                  }
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Users className="w-4 h-4 shrink-0 text-slate-500" />
                    <span className="truncate">Team Workspace</span>
                  </span>
                </NavLink>

                <NavLink
                  to="/student/contributions"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `w-full h-9 px-2.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors text-[13px] ${
                      isActive
                        ? 'bg-[#EFF6FF] text-[#1D63ED] font-semibold border border-[#BFDBFE]/80'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2540] font-medium'
                    }`
                  }
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-slate-500" />
                    <span className="truncate">Contributions &amp; Proof</span>
                  </span>
                </NavLink>

                <NavLink
                  to="/student/meeting"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `w-full h-9 px-2.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors text-[13px] ${
                      isActive
                        ? 'bg-[#EFF6FF] text-[#1D63ED] font-semibold border border-[#BFDBFE]/80'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2540] font-medium'
                    }`
                  }
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Calendar className="w-4 h-4 shrink-0 text-slate-500" />
                    <span className="truncate">Consultations &amp; Schedule</span>
                  </span>
                </NavLink>

                <NavLink
                  to="/student/ledger"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `w-full h-9 px-2.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors text-[13px] ${
                      isActive
                        ? 'bg-[#EFF6FF] text-[#1D63ED] font-semibold border border-[#BFDBFE]/80'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2540] font-medium'
                    }`
                  }
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Layers className="w-4 h-4 shrink-0 text-slate-500" />
                    <span className="truncate">Official Entry Ledger</span>
                  </span>
                </NavLink>
              </div>

              {/* PRIVILEGED LEAD GOVERNANCE FEATURES (Only shown if user is Team Lead) */}
              {isLeader && (
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center justify-between">
                    <span>LEAD PRIVILEGES</span>
                    <span className="px-1.5 py-0.2 rounded bg-[#FEF3C7] text-[#B45309] text-[9px] font-bold font-mono">
                      LEAD
                    </span>
                  </div>

                  <NavLink
                    to="/lead/review"
                    onClick={onClose}
                    className={({ isActive }) =>
                      `w-full h-9 px-2.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors text-[13px] ${
                        isActive
                          ? 'bg-[#EFF6FF] text-[#1D63ED] font-semibold border border-[#BFDBFE]/80'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2540] font-medium'
                      }`
                    }
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 shrink-0 text-amber-700" />
                      <span className="truncate">Review Submissions</span>
                    </span>
                  </NavLink>

                  <NavLink
                    to="/lead/join-requests"
                    onClick={onClose}
                    className={({ isActive }) =>
                      `w-full h-9 px-2.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors text-[13px] ${
                        isActive
                          ? 'bg-[#EFF6FF] text-[#1D63ED] font-semibold border border-[#BFDBFE]/80'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2540] font-medium'
                      }`
                    }
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Inbox className="w-4 h-4 shrink-0 text-amber-700" />
                      <span className="truncate">Join Requests</span>
                    </span>
                  </NavLink>

                  <NavLink
                    to="/lead/recruit-students"
                    onClick={onClose}
                    className={({ isActive }) =>
                      `w-full h-9 px-2.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors text-[13px] ${
                        isActive
                          ? 'bg-[#EFF6FF] text-[#1D63ED] font-semibold border border-[#BFDBFE]/80'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2540] font-medium'
                      }`
                    }
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <UserPlus className="w-4 h-4 shrink-0 text-amber-700" />
                      <span className="truncate">Invite Candidates</span>
                    </span>
                  </NavLink>

                  <NavLink
                    to="/lead/browse-mentors"
                    onClick={onClose}
                    className={({ isActive }) =>
                      `w-full h-9 px-2.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors text-[13px] ${
                        isActive
                          ? 'bg-[#EFF6FF] text-[#1D63ED] font-semibold border border-[#BFDBFE]/80'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2540] font-medium'
                      }`
                    }
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Award className="w-4 h-4 shrink-0 text-amber-700" />
                      <span className="truncate">Find Mentor</span>
                    </span>
                  </NavLink>
                </div>
              )}

              {/* Profile & Settings */}
              <div className="pt-2 border-t border-slate-100">
                <NavLink
                  to="/profile/edit"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `w-full h-9 px-2.5 rounded-lg flex items-center justify-between gap-2 text-left transition-colors text-[13px] ${
                      isActive
                        ? 'bg-[#EFF6FF] text-[#1D63ED] font-semibold border border-[#BFDBFE]/80'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#0A2540] font-medium'
                    }`
                  }
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <User className="w-4 h-4 shrink-0 text-slate-500" />
                    <span className="truncate">Profile Settings</span>
                  </span>
                </NavLink>
              </div>
            </div>
          )}
        </div>

        {/* Bottom User Card & Quick Profile */}
        <div className="p-3 border-t border-[#D6E4EE] shrink-0 bg-white/70 flex items-center justify-between gap-2">
          <div
            onClick={() => navigate('/profile/edit')}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
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
          </div>

          <button
            onClick={async () => {
              await signOut();
              showToast('Logged out.', 'info');
              navigate('/login');
            }}
            title="Log Out"
            className="w-8 h-8 rounded-lg border border-[#D6E4EE] bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-400 flex items-center justify-center transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    </>
  );
};
