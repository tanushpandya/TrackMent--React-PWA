import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Bell, LogOut, Copy, Check, ChevronRight, User, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';

interface TopbarProps {
  onToggleSidebar: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  to?: string;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar }) => {
  const { profile, isMentor, isLead, signOut } = useAuth();
  const { team: currentTeam } = useTeam();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'n1',
      title: 'Mentor Consultation Scheduled',
      desc: 'Milestone Review slot scheduled for tomorrow at 11:00 AM.',
      time: '10m ago',
      unread: true,
      to: isMentor ? '/mentor/queue-monitor' : '/student/meeting',
    },
    {
      id: 'n2',
      title: 'Phase 2 CIE Marks Released',
      desc: 'Academic evaluation report updated with rubric breakdown.',
      time: '1h ago',
      unread: true,
      to: '/student/team-info',
    },
    {
      id: 'n3',
      title: 'Attendance Ledger Verified',
      desc: 'Previous meeting attendance verified by Faculty Mentor.',
      time: '1d ago',
      unread: false,
      to: isMentor ? '/mentor/ledger' : '/student/ledger',
    },
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    showToast('All notifications marked as read', 'info');
  };

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const isLeader = Boolean(isLead || (currentTeam && profile && currentTeam.leaderId === profile.id));
  const roleLabel = isMentor ? 'MENTOR' : isLeader ? 'TEAM LEAD' : 'STUDENT';
  const roleBadgeStyle = isMentor
    ? 'bg-[#EFF6FF] text-[#1D63ED] border border-[#BFDBFE]'
    : isLeader
    ? 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]'
    : 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]';

  const portalName = isMentor ? 'Faculty Portal' : 'Student Portal';

  const getPageTitle = () => {
    const p = location.pathname;
    if (p.includes('/dashboard')) return 'Dashboard';
    if (p.includes('/contributions')) return 'Contributions & Proof';
    if (p.includes('/submissions')) return 'Submissions Queue';
    if (p.includes('/meeting') || p.includes('/meetings')) return 'Mentor Meetings';
    if (p.includes('/team-info')) return 'Team Workspace';
    if (p.includes('/leader-votes')) return 'Leader Votes';
    if (p.includes('/browse-teams')) return 'Browse Teams';
    if (p.includes('/browse-mentors')) return 'Find Mentor';
    if (p.includes('/recruit-students') || p.includes('/browse-students')) return 'Invite Candidates';
    if (p.includes('/create-team')) return 'Create Team';
    if (p.includes('/before-team')) return 'Team Formation';
    if (p.includes('/invitations')) return 'Invitations';
    if (p.includes('/join-requests')) return 'Join Requests';
    if (p.includes('/review')) return 'Review Submissions';
    if (p.includes('/progress')) return 'Progress Tracking';
    if (p.includes('/triage')) return 'Meeting Requests';
    if (p.includes('/queue-monitor')) return 'Appointment Scheduler';
    if (p.includes('/ledger')) return 'Entry Ledger';
    if (p.includes('/add-team')) return 'Browse & Add Teams';
    if (p.includes('/profile/edit') || p.includes('/edit')) return 'Profile Settings';
    return 'Overview';
  };

  const teamCode = currentTeam?.teamCode || '';

  const copyTeamCode = async () => {
    if (!teamCode) return;
    try {
      await navigator.clipboard.writeText(teamCode);
      setCopiedCode(true);
      showToast(`Team code ${teamCode} copied!`, 'success');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showToast('Failed to copy team code', 'error');
    }
  };

  return (
    <header className="h-14 frosted-chrome border-b border-[#D6E4EE] px-4 md:px-7 flex items-center justify-between sticky top-0 z-40 bg-white/95 backdrop-blur-md">
      {/* Left: Mobile Menu Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="md:hidden w-8 h-8 rounded-lg border border-[#D6E4EE] bg-white flex items-center justify-center text-[#0A2540] hover:bg-slate-50 transition-colors shrink-0"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Dynamic Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate">
          <span className="text-slate-400 hidden sm:inline">TrackMent</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline shrink-0" />
          <span className="text-slate-500 hidden sm:inline">{portalName}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline shrink-0" />
          <span className="font-bold text-[#0A2540] truncate">{getPageTitle()}</span>
        </nav>
      </div>

      {/* Right: Team/Context Pill, Role Badge, Notifications, User Chip */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Team Code / Context Pill (for students and leads) */}
        {!isMentor && Boolean(teamCode) && (
          <button
            onClick={copyTeamCode}
            title="Click to copy team code"
            className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[#D6E4EE] bg-white hover:bg-slate-50 text-[11px] font-mono font-bold text-[#0A2540] transition-colors"
          >
            <span>&lt;&gt;</span>
            <span>{teamCode}</span>
            {copiedCode ? (
              <Check className="w-3 h-3 text-[#15803D]" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400" />
            )}
          </button>
        )}

        {/* Mentor Cohort Context Pill */}
        {isMentor && (
          <div className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] text-[11px] font-semibold text-[#1D63ED]">
            RVCE • CSE &amp; AIML Cohort
          </div>
        )}

        {/* Role Badge */}
        <span
          className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase ${roleBadgeStyle}`}
        >
          {roleLabel}
        </span>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen((prev) => !prev)}
            aria-label="Notifications"
            className="relative w-8 h-8 rounded-lg border border-[#D6E4EE] bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors shadow-2xs"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#D97706] ring-2 ring-white" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#D6E4EE] rounded-xl shadow-surface z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-[#0A2540]">
                  Notifications ({unreadCount} unread)
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] font-semibold text-[#1D63ED] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (n.to) navigate(n.to);
                      setNotificationsOpen(false);
                    }}
                    className={`px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                      n.unread ? 'bg-[#EFF6FF]/40' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#0A2540]">
                        {n.title}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">
                        {n.time}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-500 mt-0.5 leading-snug">
                      {n.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Chip & Popover */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            className="h-8 px-2 rounded-lg border border-[#D6E4EE] bg-white hover:bg-slate-50 flex items-center gap-2 transition-colors shadow-2xs"
          >
            <span className="w-5 h-5 rounded-md bg-[#0F4C81] text-white text-[10px] font-bold flex items-center justify-center">
              {getInitials(profile?.fullName)}
            </span>
            <span className="hidden sm:inline text-xs font-semibold text-[#0A2540] max-w-[110px] truncate">
              {profile?.fullName || 'User'}
            </span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#D6E4EE] rounded-xl shadow-surface z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0A2540] truncate">
                    {profile?.fullName || 'User Profile'}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${roleBadgeStyle}`}>
                    {roleLabel}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                  {profile?.usn || profile?.facultyCode || (isMentor ? 'CSE Faculty' : 'RVCE')}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {profile?.email || ''}
                </div>
              </div>

              <div className="p-1.5 space-y-0.5 text-xs">
                <button
                  onClick={() => {
                    navigate('/profile/edit');
                    setProfileOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-lg text-left font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Profile Settings</span>
                </button>

                {!isMentor && (
                  <button
                    onClick={() => {
                      copyTeamCode();
                      setProfileOpen(false);
                    }}
                    className="w-full px-3 py-2 rounded-lg text-left font-semibold text-[#1D63ED] hover:bg-[#EFF6FF] flex items-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Team Code ({teamCode})</span>
                  </button>
                )}

                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={async () => {
                      setProfileOpen(false);
                      await signOut();
                      showToast('Logged out.', 'info');
                      navigate('/login');
                    }}
                    className="w-full px-3 py-2 rounded-lg text-left font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
