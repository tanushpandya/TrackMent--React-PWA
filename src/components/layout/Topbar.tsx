import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar }) => {
  const { profile, isMentor, isLead } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const getBreadcrumbTitle = () => {
    const p = location.pathname;
    if (p.includes('/dashboard')) return 'Dashboard';
    if (p.includes('/contributions')) return 'Contributions';
    if (p.includes('/submissions')) return 'Submissions Queue';
    if (p.includes('/meeting')) return 'Meetings';
    if (p.includes('/team-info')) return 'Team Details';
    if (p.includes('/leader-votes')) return 'Leader Votes';
    if (p.includes('/browse-teams')) return 'Browse Teams';
    if (p.includes('/browse-mentors')) return 'Find Mentor';
    if (p.includes('/browse-students')) return 'Browse Students';
    if (p.includes('/create-team')) return 'Create Team';
    if (p.includes('/before-team')) return 'Team Formation';
    if (p.includes('/invitations')) return 'Invitations';
    if (p.includes('/join-requests')) return 'Join Requests';
    if (p.includes('/review')) return 'Review Queue';
    if (p.includes('/progress')) return 'Progress';
    if (p.includes('/triage')) return 'Meeting Triage';
    if (p.includes('/queue-monitor')) return 'Queue Monitor';
    if (p.includes('/ledger')) return 'Meeting Ledger';
    if (p.includes('/feedback')) return 'Feedback';
    if (p.includes('/add-team')) return 'Add Team';
    if (p.includes('/edit')) return 'Profile';
    return 'Overview';
  };

  const roleLabel = isMentor ? 'Mentor' : isLead ? 'Team Lead' : 'Student';

  return (
    <header
      style={{
        height: 68,
        padding: '0 clamp(16px, 4vw, 48px)',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.75)',
        background: 'rgba(246, 251, 252, 0.55)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Mobile Menu Button */}
      <button
        onClick={onToggleSidebar}
        className="mobile-only"
        aria-label="Toggle navigation menu"
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          border: '1px solid #D5E8EF',
          background: 'rgba(255, 255, 255, 0.85)',
          display: 'grid',
          placeItems: 'center',
          color: '#102F48',
          marginRight: 14,
          cursor: 'pointer',
        }}
      >
        <Menu size={19} />
      </button>

      {/* Breadcrumb Trail */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          fontSize: 12,
          color: '#7992A1',
        }}
      >
        <span style={{ fontWeight: 650 }}>TrackMent</span>
        <b style={{ color: '#ADC2CC' }}>/</b>
        <span style={{ color: '#5E788C', fontWeight: 650 }}>{roleLabel}</span>
        <b style={{ color: '#ADC2CC' }}>/</b>
        <strong style={{ color: '#102F48', fontWeight: 850 }}>{getBreadcrumbTitle()}</strong>
      </div>

      {/* Top Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginLeft: 'auto',
        }}
      >
        <button
          onClick={() => {
            if (isMentor) {
              navigate('/mentor/triage');
            } else if (isLead) {
              navigate('/lead/join-requests');
            } else {
              navigate('/team-formation/invitations');
            }
          }}
          aria-label="Notifications"
          title="View active notifications & requests"
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            border: '1px solid #D5E8EF',
            background: 'rgba(255, 255, 255, 0.85)',
            display: 'grid',
            placeItems: 'center',
            color: '#39748E',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <Bell size={17} />
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#FF9A6F',
            }}
          />
        </button>

        {/* Profile Avatar Button */}
        <button
          onClick={() => navigate('/profile/edit')}
          aria-label="User profile"
          title={profile?.fullName || 'Profile'}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'linear-gradient(145deg, #1c70a9, #55b8bd)',
            border: '2px solid #ffffff',
            boxShadow: '0 4px 10px rgba(28, 112, 169, 0.25)',
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 900,
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {getInitials(profile?.fullName)}
        </button>
      </div>
    </header>
  );
};
