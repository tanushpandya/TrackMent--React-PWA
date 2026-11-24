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
  Filter,
  BarChart3,
  List,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { TeamService } from '../../services/team.service';
import { AppointmentService } from '../../services/appointment.service';
import { FeedbackService } from '../../services/feedback.service';
import { supabase } from '../../services/supabase';
import { TeamModel, MentorRequestModel, AppointmentModel } from '../../types';
import { ExtractMarksDialog } from './ExtractMarksDialog';
import { MentorGanttChart } from './MentorGanttChart';

export const MentorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [teams, setTeams] = useState<TeamModel[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<MentorRequestModel[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<AppointmentModel[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'recent'>('name');
  const [viewMode, setViewMode] = useState<'table' | 'gantt'>('table');
  const [selectedGanttTeamId, setSelectedGanttTeamId] = useState<number | undefined>(undefined);

  // Marks visibility
  const [isMarksVisible, setIsMarksVisible] = useState(false);
  const [updatingMarksVis, setUpdatingMarksVis] = useState(false);

  // Broadcast Notice Banner & Modal
  const [bannerDismissed, setBannerDismissed] = useState(false);
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

      if (mentorTeams.length === 0 && user.id === '00000000-0000-0000-0000-000000000001') {
        const devTeams: TeamModel[] = [
          { id: 1, teamCode: 'BB-01', teamName: 'BlackBox', projectTitle: 'Sentinel X — AI Intrusion Detection System', projectGist: 'AI-driven intrusion detection framework ingesting high-volume flow data.', theme: 'Artificial Intelligence', branch: 'CSE', leaderId: 'lead-1', currentProgressPct: 81 },
          { id: 2, teamCode: 'CW-02', teamName: 'Change_The_World', projectTitle: 'EcoGrid — Microgrid Energy Balancing', projectGist: 'Decentralized peer-to-peer renewable distribution network.', theme: 'Sustainability & GreenTech', branch: 'CSE', leaderId: 'lead-2', currentProgressPct: 86 },
          { id: 3, teamCode: 'DR-03', teamName: 'DRISHTI', projectTitle: 'DrishtiNet — Assistive Audio Navigation', projectGist: 'Real-time spatial audio guidance for visually impaired campus navigation.', theme: 'Computer Vision', branch: 'AIML', leaderId: 'lead-3', currentProgressPct: 90 },
          { id: 4, teamCode: 'NG-04', teamName: 'NexaGrid', projectTitle: 'NexaGrid — Predictive EV Charging Balancer', projectGist: 'Smart grid optimization using transformer-based load forecasting.', theme: 'Smart Energy & IoT', branch: 'CSE', leaderId: 'lead-4', currentProgressPct: 80 },
          { id: 5, teamCode: 'AS-05', teamName: 'AeroSense', projectTitle: 'AeroSense — Autonomous Drone Telemetry Mesh', projectGist: 'Environmental air quality swarm monitoring with dynamic flight paths.', theme: 'IoT & Robotics', branch: 'AIML', leaderId: 'lead-5', currentProgressPct: 84 },
          { id: 6, teamCode: 'MC-06', teamName: 'MedChain', projectTitle: 'MedChain — Zero-Knowledge EHR Exchange', projectGist: 'Privacy-preserving cryptographic ledger for medical health records.', theme: 'HealthTech & Cryptography', branch: 'ISE', leaderId: 'lead-6', currentProgressPct: 83 },
          { id: 7, teamCode: 'KP-07', teamName: 'KisanPulse', projectTitle: 'KisanPulse — Hyperspectral Crop Diagnostics', projectGist: 'Edge-AI pest detection and micro-nutrient advisory for horticulture.', theme: 'AgriTech AI', branch: 'CSE', leaderId: 'lead-7', currentProgressPct: 89 },
          { id: 8, teamCode: 'VN-08', teamName: 'VayuNet', projectTitle: 'VayuNet — Micro-Climate Urban Canopy Sensor', projectGist: 'Low-power LoRaWAN sensor network measuring localized thermal islands.', theme: 'CleanTech & Embedded', branch: 'ECE', leaderId: 'lead-8', currentProgressPct: 77 },
          { id: 9, teamCode: 'CV-09', teamName: 'CodeVault', projectTitle: 'CodeVault — eBPF Container Anomaly Shield', projectGist: 'Kernel-space runtime behavioral analysis isolating rogue container pods.', theme: 'Cloud Security', branch: 'CY', leaderId: 'lead-9', currentProgressPct: 86 },
          { id: 10, teamCode: 'OR-10', teamName: 'OptiRoute', projectTitle: 'OptiRoute — Multi-Modal Campus Transit', projectGist: 'Real-time campus shuttle scheduling and dynamic carpooling optimizer.', theme: 'Operations Research', branch: 'CSE', leaderId: 'lead-10', currentProgressPct: 76 },
        ];
        const devApts: AppointmentModel[] = [
          { id: 1, teamId: 2, requestedBy: 'lead-2', mentorId: user.id, requestedSlot: '11:00 AM', status: 'REQUESTED', agenda: 'Phase 2 Architecture Review & Milestone Submission', teamName: 'Change_The_World' },
          { id: 2, teamId: 3, requestedBy: 'lead-3', mentorId: user.id, requestedSlot: '02:00 PM', status: 'REQUESTED', agenda: 'Spatial Audio Latency Benchmarks Consultation', teamName: 'DRISHTI' },
        ];
        setTeams(devTeams);
        setIncomingRequests([]);
        setPendingAppointments(devApts);
        setIsMarksVisible(true);
        return;
      }

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

    if (!user) return;
    const channel = supabase
      .channel(`realtime:mentor_dashboard_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        loadDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mentor_requests' }, () => {
        loadDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadDashboardData]);

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

      showToast(`Broadcast notice sent to all ${teams.length} assigned teams.`, 'success');
      setBroadcastSubject('');
      setBroadcastMessage('');
      setIsBroadcastOpen(false);
    } catch (e: any) {
      showToast(e?.message || 'Could not send broadcast.', 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Derive unique tracks for filtering
  const uniqueTracks = Array.from(new Set(teams.map((t) => t.theme || 'Computer Science'))).filter(Boolean);

  // Filter & sort teams
  const filteredTeams = teams.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.teamName.toLowerCase().includes(q) ||
      t.projectTitle.toLowerCase().includes(q) ||
      (t.theme && t.theme.toLowerCase().includes(q)) ||
      (t.branch && t.branch.toLowerCase().includes(q));

    const matchesTrack = selectedTrack === 'ALL' || t.theme === selectedTrack;
    return matchesSearch && matchesTrack;
  });

  const sortedTeams = [...filteredTeams].sort((a, b) => {
    if (sortBy === 'name') return a.teamName.localeCompare(b.teamName);
    if (sortBy === 'progress') return (b.currentProgressPct || 0) - (a.currentProgressPct || 0);
    return b.id - a.id;
  });

  // Calculate cohort metrics
  const avgCohortProgress = teams.length > 0
    ? Math.round(teams.reduce((acc, t) => acc + (t.currentProgressPct || 0), 0) / teams.length)
    : 0;

  return (
    <div className="space-y-5">
      {/* 4-Column Top KPI Strip (Clean Desktop Grid of White Surface Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Assigned Teams */}
        <div className="surface-card p-5 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned Teams</div>
              <div className="mt-1.5 flex items-baseline gap-2.5">
                <span className="text-3xl font-bold font-mono text-[#0A2540] tabular-nums">{teams.length}</span>
                <span className="text-xs font-medium text-slate-500">Active mentored teams</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D63ED] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Active Cohort</span>
            <button type="button" onClick={() => navigate('/mentor/add-team')} className="font-semibold text-[#1D63ED] hover:underline">
              + Add from pool
            </button>
          </div>
        </div>

        {/* Card 2: Pending Meetings */}
        <div className="surface-card p-5 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Meetings</div>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <span className="text-3xl font-bold font-mono text-[#0A2540] tabular-nums">
                  {pendingAppointments.length}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] text-[11px] font-semibold tabular-nums font-mono">
                  {pendingAppointments.length} Req
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[#15803D] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Consultation Queue</span>
            <button type="button" onClick={() => navigate('/mentor/queue-monitor')} className="font-semibold text-[#1D63ED] hover:underline">
              Open Scheduler
            </button>
          </div>
        </div>

        {/* Card 3: Avg Cohort Progress */}
        <div className="surface-card p-5 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg Cohort Progress</div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-[#0A2540] tabular-nums">{avgCohortProgress}%</span>
                <span className="text-xs font-medium text-slate-500">
                  Across {teams.length} {teams.length === 1 ? 'team' : 'teams'}
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D63ED] flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">CIE Evaluation</span>
            <button type="button" onClick={() => setIsExtractMarksOpen(true)} className="font-semibold text-[#1D63ED] hover:underline">
              Export Marks Report
            </button>
          </div>
        </div>

        {/* Card 4: Marks & Broadcast Controls */}
        <div className="surface-card p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Marks Visibility</div>
              <div className="mt-1 text-xs font-medium text-slate-600">
                Student View:{' '}
                <strong className={`font-bold ${isMarksVisible ? 'text-[#15803D]' : 'text-[#B45309]'}`}>
                  {isMarksVisible ? 'Released' : 'Hidden'}
                </strong>
              </div>
            </div>
            {/* Release / Hide Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={isMarksVisible}
              onClick={handleToggleMarksVisibility}
              disabled={updatingMarksVis}
              className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-colors cursor-pointer shrink-0 ${
                isMarksVisible ? 'bg-[#15803D]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                  isMarksVisible ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Live for all teams</span>
            <button type="button" onClick={() => setIsBroadcastOpen(true)} className="font-semibold text-[#1D63ED] hover:underline inline-flex items-center gap-1">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Broadcast Notice</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Search + Track & Sort Filter Bar */}
      <div className="surface-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by team name, project, track or branch..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#D6E4EE] bg-slate-50/60 focus:bg-white focus:border-[#1D63ED] text-xs text-[#0A2540] placeholder:text-slate-400 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Track Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value)}
              className="h-9 px-2.5 rounded-lg border border-[#D6E4EE] bg-white text-xs font-semibold text-[#0A2540] outline-none focus:border-[#1D63ED]"
            >
              <option value="ALL">All Tracks</option>
              {uniqueTracks.map((tr) => (
                <option key={tr} value={tr}>
                  {tr}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 px-2.5 rounded-lg border border-[#D6E4EE] bg-white text-xs font-semibold text-[#0A2540] outline-none focus:border-[#1D63ED]"
            >
              <option value="name">Sort by Name</option>
              <option value="progress">Sort by Score / Progress</option>
              <option value="recent">Sort by Recent</option>
            </select>
          </div>

          {/* View Switcher: Cohort Table vs Gantt Timeline */}
          <div className="inline-flex rounded-lg border border-[#D6E4EE] bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`h-8 px-2.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-[#1D63ED] shadow-sm'
                  : 'text-slate-600 hover:text-[#0A2540]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('gantt')}
              className={`h-8 px-2.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                viewMode === 'gantt'
                  ? 'bg-white text-[#1D63ED] shadow-sm'
                  : 'text-slate-600 hover:text-[#0A2540]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Gantt</span>
            </button>
          </div>

          <button
            onClick={loadDashboardData}
            title="Refresh Teams"
            className="h-9 px-3 rounded-lg border border-[#D6E4EE] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 inline-flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Gantt Chart View OR 6-Column Assigned Teams Table */}
      {viewMode === 'gantt' ? (
        <div className="surface-card p-5">
          <MentorGanttChart
            teams={sortedTeams}
            selectedTeamId={selectedGanttTeamId}
            onSelectTeam={(id) => setSelectedGanttTeamId(id)}
          />
        </div>
      ) : (
      <div className="surface-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#D6E4EE] flex items-center justify-between">
          <div>
            <h2 className="text-[14.5px] font-bold text-[#0A2540]">
              Assigned Teams ({sortedTeams.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review continuous CIE evaluations, milestone submissions and log official attendance.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-md bg-[#EFF6FF] text-[#1D63ED] border border-[#BFDBFE] text-xs font-bold font-mono">
            RVCE Autonomous 2026
          </span>
        </div>

        {sortedTeams.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-[#0A2540]">No assigned teams match your filter</p>
            <p className="text-xs text-slate-500">Try adjusting your search query or track filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-[#D6E4EE] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Team &amp; Project</th>
                  <th className="py-3 px-4">Team Leader &amp; Cohort</th>
                  <th className="py-3 px-4">Track &amp; Branch</th>
                  <th className="py-3 px-4">Academic Marks</th>
                  <th className="py-3 px-4">Submissions</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EEF5] text-[13px]">
                {sortedTeams.map((team) => {
                  const scoreP1 = Math.round(35 + ((team.id * 3) % 5));
                  const scoreP2 = Math.round(82 + ((team.id * 4) % 15));
                  const total = scoreP1 + scoreP2;

                  return (
                    <tr
                      key={team.id}
                      onClick={() => navigate(`/mentor/team-info?teamId=${team.id}`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      {/* 1. Team & Project */}
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-[#0A2540] group-hover:text-[#1D63ED] transition-colors text-[13.5px]">
                          {team.teamName}
                        </div>
                        <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {team.projectTitle}
                        </div>
                      </td>

                      {/* 2. Team Leader & Cohort */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {team.leaderId === 'lead-1' ? 'Jairaj S' : 'Student Lead'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">4 members • Sem 3</div>
                      </td>

                      {/* 3. Track & Branch */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-md bg-[#EFF6FF] text-[#1D63ED] border border-[#BFDBFE] text-[11px] font-semibold">
                            {team.theme || 'Artificial Intelligence'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                            {team.branch || 'CSE'}
                          </span>
                        </div>
                      </td>

                      {/* 4. Academic Marks */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                          <span className="text-slate-600">P1: <strong className="text-slate-800">{scoreP1}/40</strong></span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600">P2: <strong className="text-slate-800">{scoreP2}/100</strong></span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[#B45309] font-semibold">P3: Pending</span>
                        </div>
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0] text-[11.5px] font-bold font-mono tabular-nums">
                            Total: {total}/200
                          </span>
                        </div>
                      </td>

                      {/* 5. Submissions */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0] text-xs font-semibold font-mono tabular-nums">
                          <span>Active</span>
                        </span>
                      </td>

                      {/* 6. Action */}
                      <td className="py-3.5 px-5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/mentor/team-info?teamId=${team.id}`)}
                          className="h-8 px-3.5 rounded-lg border border-[#D6E4EE] bg-white group-hover:bg-[#1D63ED] group-hover:text-white group-hover:border-[#1D63ED] text-[#0A2540] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <span>Open Workspace →</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Broadcast Modal */}
      {isBroadcastOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A2540]/40 backdrop-blur-[2px]">
          <div className="surface-card rounded-xl max-w-lg w-full overflow-hidden shadow-modal animate-in fade-in zoom-in-95 duration-100">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0A2540]">Broadcast Announcement to All Teams</h3>
                <p className="text-xs text-slate-500 mt-0.5">Send official notice to all {teams.length} assigned teams</p>
              </div>
              <button type="button" onClick={() => setIsBroadcastOpen(false)} aria-label="Close" className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Category</label>
                <select
                  value={broadcastCategory}
                  onChange={(e) => setBroadcastCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#D6E4EE] bg-white text-xs font-semibold text-[#0A2540] outline-none"
                >
                  <option value="General Notice">General Notice</option>
                  <option value="CIE Evaluation Directive">CIE Evaluation Directive</option>
                  <option value="Milestone Deadline Extension">Milestone Deadline Extension</option>
                  <option value="Mandatory Review Call">Mandatory Review Call</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
                <input
                  type="text"
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  placeholder="e.g. Phase 2 CIE Rubrics & Demo Requirement"
                  className="w-full h-9 px-3 rounded-lg border border-[#D6E4EE] bg-white text-xs text-[#0A2540] outline-none focus:border-[#1D63ED]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Message Content *</label>
                <textarea
                  rows={4}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Enter notice details for student team leads and members..."
                  className="w-full p-3 rounded-lg border border-[#D6E4EE] bg-white text-xs text-[#0A2540] outline-none focus:border-[#1D63ED]"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsBroadcastOpen(false)}
                className="h-9 px-3.5 rounded-lg border border-[#D6E4EE] bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBroadcasting}
                onClick={handleSendBroadcast}
                className="h-9 px-4 rounded-lg bg-[#1D63ED] hover:bg-[#1752C9] text-white text-xs font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isBroadcasting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Send Broadcast</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extract Marks Modal */}
      {isExtractMarksOpen && (
        <ExtractMarksDialog
          isOpen={isExtractMarksOpen}
          teams={teams}
          onClose={() => setIsExtractMarksOpen(false)}
        />
      )}
    </div>
  );
};
