import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  Clock,
  UserPlus,
  Eye,
  EyeOff,
  Download,
  Megaphone,
  Search,
  ArrowUpDown,
  LayoutGrid,
  List,
  FileText,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Sparkles,
  Loader2,
  RefreshCw,
  Award,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { TeamService } from '../../services/team.service';
import { AppointmentService } from '../../services/appointment.service';
import { FeedbackService } from '../../services/feedback.service';
import { TeamModel, MentorRequestModel, AppointmentModel } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { AppCard } from '../../components/common/AppCard';
import { MetricCard } from '../../components/common/MetricCard';
import { Modal } from '../../components/common/Modal';
import { ExtractMarksDialog } from './ExtractMarksDialog';

export const MentorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [teams, setTeams] = useState<TeamModel[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<MentorRequestModel[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<AppointmentModel[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'recent'>('name');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  // Marks visibility
  const [isMarksVisible, setIsMarksVisible] = useState(false);
  const [updatingMarksVis, setUpdatingMarksVis] = useState(false);

  // Broadcast Notice Modal
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastCategory, setBroadcastCategory] = useState('General Notice');
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Extract Marks Modal
  const [isExtractMarksOpen, setIsExtractMarksOpen] = useState(false);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [mentorTeams, requests, pendingApts] = await Promise.all([
        TeamService.fetchMentorTeams(user.id),
        TeamService.fetchIncomingMentorRequests(user.id),
        AppointmentService.fetchPendingForMentor(user.id),
      ]);
      setTeams(mentorTeams);
      setIncomingRequests(requests);
      setPendingAppointments(pendingApts);

      if (mentorTeams.length > 0) {
        const vis = await TeamService.fetchMarksVisibility(mentorTeams[0].id);
        setIsMarksVisible(vis);
      }
    } catch (e) {
      console.error('Failed to load mentor dashboard data:', e);
      showToast('Could not load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRespondToMentorRequest = async (requestId: number, accept: boolean) => {
    try {
      await TeamService.respondToMentorRequest(requestId, accept);
      showToast(accept ? 'Mentorship request accepted!' : 'Mentorship request declined.', accept ? 'success' : 'info');
      await loadDashboardData();
    } catch (e: any) {
      console.error('Error responding to mentor request:', e);
      showToast(e?.message || 'Could not process response.', 'error');
    }
  };

  const handleToggleMarksVisibility = async () => {
    if (teams.length === 0) return;
    setUpdatingMarksVis(true);
    const nextState = !isMarksVisible;
    try {
      await TeamService.setMarksVisibilityForTeams(
        teams.map((t) => t.id),
        nextState
      );
      setIsMarksVisible(nextState);
      showToast(
        nextState
          ? 'Marks are now VISIBLE to students for all your assigned teams!'
          : 'Marks are now HIDDEN from students.',
        'success'
      );
    } catch (e: any) {
      console.error('Failed to update marks visibility:', e);
      showToast('Failed to update marks visibility', 'error');
    } finally {
      setUpdatingMarksVis(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastSubject.trim()) {
      showToast('Please enter an announcement subject.', 'error');
      return;
    }
    if (!broadcastMessage.trim()) {
      showToast('Please enter a message for the broadcast.', 'error');
      return;
    }
    if (!user) return;

    setIsBroadcasting(true);
    try {
      await FeedbackService.sendBroadcastNotice({
        teamIds: teams.map((t) => t.id),
        mentorId: user.id,
        subject: broadcastSubject.trim(),
        message: broadcastMessage.trim(),
        category: broadcastCategory,
      });

      showToast(`Broadcast notice sent to all ${teams.length} assigned teams! 📢`, 'success');
      setBroadcastSubject('');
      setBroadcastMessage('');
      setIsBroadcastOpen(false);
    } catch (e: any) {
      showToast(e?.message || 'Could not send broadcast.', 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Filter & sort teams
  const filteredTeams = teams.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      t.teamName.toLowerCase().includes(q) ||
      t.teamCode.toLowerCase().includes(q) ||
      t.projectTitle.toLowerCase().includes(q)
    );
  });

  const sortedTeams = [...filteredTeams].sort((a, b) => {
    if (sortBy === 'name') return a.teamName.localeCompare(b.teamName);
    if (sortBy === 'progress') return (b.currentProgressPct || 0) - (a.currentProgressPct || 0);
    return b.id - a.id;
  });

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 8px' }}>
      {/* Page Header (No Mascot on Faculty screens per specification) */}
      <PageHeader
        eyebrow="FACULTY PORTAL"
        title="Faculty Mentor Console"
        subtitle="Your teams' progress and the conversations that need your attention."
        actions={
          <button
            onClick={loadDashboardData}
            title="Refresh Dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '999px',
              background: 'white',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        }
      />

      {/* 2-Column Triage Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <MetricCard
          label="ASSIGNED TEAMS"
          value={teams.length}
          subtitle="Active academic projects"
          color="#0b4d88"
          icon={<Users size={22} />}
          onClick={() => {}}
        />
        <MetricCard
          label="PENDING MEETINGS"
          value={pendingAppointments.length}
          subtitle="Awaiting your confirmation"
          color="#a67827"
          icon={<Clock size={22} />}
          onClick={() => navigate('/mentor/triage')}
        />
      </div>

      {/* Incoming Mentorship Requests Strip */}
      {incomingRequests.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <Clock size={18} color="var(--color-primary)" />
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                margin: 0,
              }}
            >
              Incoming Mentorship Requests ({incomingRequests.length})
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {incomingRequests.map((req) => (
              <AppCard
                key={req.id}
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  borderLeft: '4px solid var(--color-primary)',
                }}
              >
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    {req.teamName || `Team #${req.teamId}`}
                  </div>
                  {req.message && (
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                      "{req.message}"
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleRespondToMentorRequest(req.id, false)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      background: 'transparent',
                      border: '1.5px solid var(--color-danger)',
                      color: 'var(--color-danger)',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleRespondToMentorRequest(req.id, true)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '8px',
                      background: 'var(--color-confirmed)',
                      border: 'none',
                      color: 'white',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 3px 0 #1b534b',
                    }}
                  >
                    Accept Team
                  </button>
                </div>
              </AppCard>
            ))}
          </div>
        </div>
      )}

      {/* Assigned Teams Section Header & Claim Team CTA */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2
              style={{
                fontSize: '19px',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Assigned Teams
            </h2>
            <span
              style={{
                background: 'rgba(11, 77, 136, 0.1)',
                color: 'var(--color-primary)',
                fontSize: '12px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              {teams.length}
            </span>
          </div>
        </div>

        {/* Claim Team CTA button */}
        <button
          onClick={() => navigate('/mentor/add-team')}
          style={{
            width: '100%',
            height: '46px',
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 0 #07335c',
            marginBottom: '16px',
          }}
        >
          <UserPlus size={18} />
          Claim Team
        </button>

        {/* Marks Management & Broadcast Notice Panel */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
            gap: '10px',
            marginBottom: '16px',
          }}
        >
          <button
            disabled={updatingMarksVis}
            onClick={handleToggleMarksVisibility}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: isMarksVisible ? '#0f5a47' : '#334155',
              color: 'white',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: updatingMarksVis ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {isMarksVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            {isMarksVisible ? 'Hide Student Marks' : 'Release Student Marks'}
          </button>

          <button
            onClick={() => setIsExtractMarksOpen(true)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: '#0d6838',
              color: 'white',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Download size={16} />
            Extract Marks
          </button>

          <button
            onClick={() => setIsBroadcastOpen(true)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'var(--color-cyan)',
              color: '#07335c',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Megaphone size={16} />
            Broadcast Notice
          </button>
        </div>

        {/* Search, Sort, and View Mode Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search
              size={16}
              color="var(--color-text-secondary)"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team name or code..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-border)',
                background: 'white',
                fontSize: '13.5px',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: 'white',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="name">Sort by Name</option>
              <option value="progress">Sort by Progress</option>
              <option value="recent">Sort by Most Recent</option>
            </select>

            <div
              style={{
                display: 'flex',
                background: 'white',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                padding: '2px',
              }}
            >
              <button
                onClick={() => setViewMode('cards')}
                style={{
                  padding: '6px',
                  borderRadius: '6px',
                  background: viewMode === 'cards' ? 'var(--color-canvas)' : 'transparent',
                  border: 'none',
                  color: viewMode === 'cards' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  padding: '6px',
                  borderRadius: '6px',
                  background: viewMode === 'list' ? 'var(--color-canvas)' : 'transparent',
                  border: 'none',
                  color: viewMode === 'list' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Teams Grid / List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-secondary)' }}>
          <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px' }} />
          <div>Loading assigned teams...</div>
        </div>
      ) : sortedTeams.length === 0 ? (
        <AppCard style={{ textAlign: 'center', padding: '60px 24px' }}>
          <BookOpen size={48} color="var(--color-text-secondary)" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px 0' }}>
            {searchQuery ? 'No teams match your search' : 'No Assigned Teams Yet'}
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '13.5px', color: 'var(--color-text-secondary)' }}>
            {searchQuery
              ? 'Try searching with a different term.'
              : 'Claim a team using the button above to begin mentoring and tracking academic milestones.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => navigate('/mentor/add-team')}
              style={{
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Browse & Add Teams
            </button>
          )}
        </AppCard>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: viewMode === 'cards' ? 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' : '1fr',
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          {sortedTeams.map((team) => (
            <AppCard key={team.id} style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              {/* Header: Name + Code Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '8px',
                  marginBottom: '8px',
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: '16.5px',
                      fontWeight: 800,
                      color: 'var(--color-text-primary)',
                      margin: '0 0 4px 0',
                    }}
                  >
                    {team.teamName}
                  </h3>
                  <div
                    style={{
                      display: 'inline-block',
                      background: 'rgba(11, 77, 136, 0.08)',
                      color: 'var(--color-primary)',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    CODE: {team.teamCode}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: 'var(--color-primary)',
                  }}
                >
                  {team.currentProgressPct || 0}%
                </div>
              </div>

              {/* Project Title & Abstract */}
              <div style={{ flex: 1, margin: '8px 0 16px 0' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {team.projectTitle}
                </div>
                {team.projectGist && (
                  <p
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--color-text-secondary)',
                      margin: '4px 0 0 0',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {team.projectGist}
                  </p>
                )}
                {team.theme && (
                  <div style={{ marginTop: '8px' }}>
                    <span
                      style={{
                        background: 'var(--color-canvas)',
                        border: '1px solid var(--color-border)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {team.theme}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  background: 'var(--color-border)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    width: `${team.currentProgressPct || 0}%`,
                    height: '100%',
                    background: 'var(--color-primary)',
                    borderRadius: '3px',
                  }}
                />
              </div>

              {/* Stacked Full-Width Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => navigate(`/mentor/team-info?teamId=${team.id}`)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 3px 0 #07335c',
                  }}
                >
                  <Award size={15} />
                  View Team & Marks
                </button>

                <button
                  onClick={() => navigate(`/mentor/ledger?teamId=${team.id}&teamName=${encodeURIComponent(team.teamName)}`)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'white',
                    color: 'var(--color-primary)',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <FileText size={15} />
                  Open Entry Ledger
                </button>
              </div>
            </AppCard>
          ))}
        </div>
      )}

      {/* Broadcast Notice Modal */}
      <Modal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        title="Broadcast Notice to All Teams"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Publish an official announcement to all <strong>{teams.length}</strong> of your assigned project teams.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Announcement Category
            </label>
            <select
              value={broadcastCategory}
              onChange={(e) => setBroadcastCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-border)',
                fontSize: '13px',
                background: '#FFFFFF',
                color: '#1E293B',
              }}
            >
              <option value="General Notice">📢 General Notice</option>
              <option value="Consultation Schedule">📅 Consultation Schedule</option>
              <option value="Deliverable Deadline">⏰ Deliverable Deadline</option>
              <option value="Urgent Reminder">⚠️ Urgent Reminder</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Subject
            </label>
            <input
              type="text"
              value={broadcastSubject}
              onChange={(e) => setBroadcastSubject(e.target.value)}
              placeholder="e.g. Phase 2 Architecture Review Consultations"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-border)',
                fontSize: '13px',
                color: '#1E293B',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
              Message
            </label>
            <textarea
              rows={4}
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Please bring your sprint architecture diagrams and test suite reports to this week's consultation..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-border)',
                fontSize: '13px',
                color: 'var(--color-text-primary)',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
            <button
              onClick={() => setIsBroadcastOpen(false)}
              style={{
                padding: '10px',
                borderRadius: '8px',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              disabled={isBroadcasting}
              onClick={handleSendBroadcast}
              style={{
                padding: '10px',
                borderRadius: '8px',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                cursor: isBroadcasting ? 'not-allowed' : 'pointer',
              }}
            >
              {isBroadcasting ? 'Broadcasting...' : 'Send Broadcast'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Extract Marks Modal */}
      <ExtractMarksDialog
        isOpen={isExtractMarksOpen}
        onClose={() => setIsExtractMarksOpen(false)}
        teams={teams}
      />
    </div>
  );
};
