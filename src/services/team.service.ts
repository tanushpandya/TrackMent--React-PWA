import { supabase, PROOFS_BUCKET } from './supabase';
import {
  TeamModel,
  ProfileModel,
  TeamDirectoryEntry,
  TeamDeparture,
  TeamInvitationModel,
  JoinRequestModel,
  LeadTransferRequestModel,
  MentorRequestModel,
  ProgressHistoryEntry,
  TeamEvaluation,
} from '../types';

export class TeamService {
  static async fetchMyTeam(userId: string): Promise<TeamModel | null> {
    const { data: memberData } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (memberData?.team_id) {
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', memberData.team_id)
        .maybeSingle();
      if (teamData) return this.mapTeam(teamData);
    }

    // Fallback: check if user is leader of a team
    const { data: leadData } = await supabase
      .from('teams')
      .select('*')
      .eq('leader_id', userId)
      .maybeSingle();

    if (leadData) return this.mapTeam(leadData);
    return null;
  }

  static async fetchTeamById(teamId: number): Promise<TeamModel | null> {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .maybeSingle();

    if (data) return this.mapTeam(data);

    // Fallback to directory RPC
    try {
      const dir = await this.fetchTeamDirectory();
      const match = dir.find((d) => d.team.id === teamId);
      if (match) return match.team;
    } catch (_) {}

    return null;
  }

  static async fetchRoster(teamId: number): Promise<ProfileModel[]> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('profiles(*)')
        .eq('team_id', teamId);

      if (!error && data && data.length > 0) {
        return data
          .map((d: any) => d.profiles)
          .filter(Boolean)
          .map((p: any) => ({
            id: p.id,
            email: p.email || '',
            fullName: p.full_name || '',
            role: p.role,
            usn: p.usn,
            branch: p.branch,
            section: p.section,
            semester: p.semester,
            skills: p.skills || [],
            interests: p.interests || [],
            department: p.department,
            facultyCode: p.faculty_code,
          }));
      }
    } catch (_) {}

    // Fallback to RPC inspect_team_roster
    try {
      const { data: res } = await supabase.rpc('inspect_team_roster', {
        p_team_id: teamId,
      });
      if (Array.isArray(res)) {
        return res.map((r: any) => ({
          id: (r.id || r.user_id || '').toString(),
          email: r.email || '',
          fullName: r.full_name || '',
          role: r.is_lead ? 'TEAM_LEAD' : r.role || 'STUDENT',
          usn: r.usn,
          branch: r.branch,
          section: r.section,
          semester: r.semester,
          skills: r.skills || [],
          interests: r.interests || [],
          department: r.department,
          facultyCode: r.faculty_code,
        }));
      }
    } catch (_) {}

    return [];
  }

  static async fetchTeamMembers(teamId: number): Promise<ProfileModel[]> {
    return this.fetchRoster(teamId);
  }

  static async fetchMentorTeams(mentorId: string): Promise<TeamModel[]> {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('mentor_id', mentorId)
      .order('team_name');
    return (data || []).map(this.mapTeam);
  }

  static async fetchAllTeams(excludeTeamId?: number): Promise<TeamModel[]> {
    try {
      const { data, error } = await supabase.rpc('get_recruiting_teams');
      if (!error && Array.isArray(data)) {
        const teams = data.map(this.mapTeam);
        return excludeTeamId ? teams.filter((t) => t.id !== excludeTeamId) : teams;
      }
    } catch (_) {}

    const { data } = await supabase
      .from('teams')
      .select('id, team_name, project_title, project_gist, theme, branch, leader_id, mentor_id, current_progress_pct, created_at, updated_at')
      .order('id', { ascending: false });

    const teams = (data || []).map(this.mapTeam);
    return excludeTeamId ? teams.filter((t) => t.id !== excludeTeamId) : teams;
  }

  static async fetchTeamDirectory(): Promise<TeamDirectoryEntry[]> {
    try {
      const { data, error } = await supabase.rpc('get_team_directory');
      if (!error && Array.isArray(data)) {
        return data.map((d: any) => ({
          team: this.mapTeam(d),
          leaderName: d.leader_name || d.leader?.full_name,
          leaderUsn: d.leader_usn || d.leader?.usn,
          leaderEmail: d.leader_email || d.leader?.email,
        }));
      }
    } catch (_) {}

    const { data } = await supabase
      .from('teams')
      .select('*, leader:profiles!leader_id(full_name, usn, email)')
      .order('id', { ascending: false })
      .limit(1000);

    return (data || []).map((d: any) => ({
      team: this.mapTeam(d),
      leaderName: d.leader?.full_name,
      leaderUsn: d.leader?.usn,
      leaderEmail: d.leader?.email,
    }));
  }

  static async createTeam(data: {
    leaderId?: string;
    teamName: string;
    projectTitle: string;
    projectGist: string;
    theme: string;
    branch: string;
    invitees?: ProfileModel[];
  }): Promise<TeamModel> {
    const leaderId = data.leaderId || (await supabase.auth.getUser()).data.user?.id;
    if (!leaderId) throw new Error('Not signed in');

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const rand = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const teamCode = `TM-${rand}`;

    const { data: created, error } = await supabase
      .from('teams')
      .insert({
        team_code: teamCode,
        team_name: data.teamName,
        project_title: data.projectTitle,
        project_gist: data.projectGist,
        theme: data.theme,
        branch: data.branch,
        leader_id: leaderId,
      })
      .select()
      .single();

    if (error) throw error;
    const team = this.mapTeam(created);

    if (data.invitees && data.invitees.length > 0) {
      for (const inv of data.invitees) {
        try {
          await this.sendInvitation(team.id, inv.id);
        } catch (_) {}
      }
    }

    return team;
  }

  static async updateProjectInfo(data: {
    teamId: number;
    projectTitle: string;
    projectGist: string;
    theme: string;
    branch: string;
    abstractText?: string;
    objectives?: string;
  }): Promise<void> {
    try {
      await supabase.rpc('update_team_project_info', {
        p_team_id: data.teamId,
        p_project_title: data.projectTitle,
        p_project_gist: data.projectGist,
        p_theme: data.theme,
        p_branch: data.branch,
        p_abstract: data.abstractText || null,
        p_objectives: data.objectives || null,
      });
      return;
    } catch (_) {}

    const { error } = await supabase
      .from('teams')
      .update({
        project_title: data.projectTitle,
        project_gist: data.projectGist,
        theme: data.theme,
        branch: data.branch,
        abstract: data.abstractText || null,
        objectives: data.objectives || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.teamId);

    if (error) throw error;
  }

  static async updateProgress(data: {
    teamId: number;
    progressPct: number;
    milestoneNote: string;
  }): Promise<void> {
    const { error } = await supabase.rpc('update_team_progress', {
      p_team_id: data.teamId,
      p_progress_pct: data.progressPct,
      p_milestone_note: data.milestoneNote,
    });
    if (error) {
      // Fallback: direct table updates
      await supabase.from('teams').update({ current_progress_pct: data.progressPct }).eq('id', data.teamId);
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await supabase.from('progress_history').insert({
          team_id: data.teamId,
          updated_by: user.id,
          progress_pct: data.progressPct,
          milestone_note: data.milestoneNote,
        });
      }
    }
  }

  static async fetchProgressHistory(teamId: number): Promise<ProgressHistoryEntry[]> {
    const { data } = await supabase
      .from('progress_history')
      .select('*')
      .eq('team_id', teamId)
      .order('recorded_at', { ascending: false });

    return (data || []).map((d: any) => ({
      id: d.id,
      teamId: d.team_id,
      updatedBy: d.updated_by,
      progressPct: d.progress_pct,
      milestoneNote: d.milestone_note,
      recordedAt: d.recorded_at,
    }));
  }

  static async leaveTeam(): Promise<number> {
    const { data: res, error } = await supabase.rpc('leave_team');
    if (error) throw error;

    let removed = 0;
    let paths: string[] = [];
    if (res && typeof res === 'object') {
      removed = res.contributions_removed || 0;
      paths = Array.isArray(res.storage_paths) ? res.storage_paths : [];
    }
    if (paths.length > 0) {
      try {
        await supabase.storage.from(PROOFS_BUCKET).remove(paths);
      } catch (_) {}
    }
    return removed;
  }

  static async removeTeamMember(teamId: number, memberId: string): Promise<void> {
    try {
      const { data: res } = await supabase.rpc('remove_team_member', {
        p_team_id: teamId,
        p_member_id: memberId,
      });
      if (res && res.storage_paths) {
        await supabase.storage.from(PROOFS_BUCKET).remove(res.storage_paths);
      }
      return;
    } catch (_) {}

    await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', memberId);
  }

  static async fetchDepartures(teamId: number): Promise<TeamDeparture[]> {
    const { data } = await supabase
      .from('team_departures')
      .select('*')
      .eq('team_id', teamId)
      .order('left_at', { ascending: false });

    return (data || []).map((d: any) => ({
      id: d.id,
      teamId: d.team_id,
      userId: d.user_id,
      fullName: d.full_name,
      usn: d.usn,
      contributionsRemoved: d.contributions_removed || 0,
      joinedAt: d.joined_at,
      leftAt: d.left_at,
    }));
  }

  static async claimTeam(params: {
    teamId: number;
    mentorId: string;
    teamCode?: string;
  }): Promise<TeamModel | null> {
    try {
      const { data: res } = await supabase.rpc('claim_team_by_id', {
        p_team_id: params.teamId,
      });
      if (res) return await this.fetchTeamById(params.teamId);
    } catch (_) {}

    if (params.teamCode) {
      try {
        const { data: res } = await supabase.rpc('claim_team_by_code', {
          p_code: params.teamCode.trim().toUpperCase(),
        });
        if (res) {
          const claimedId = typeof res === 'number' ? res : parseInt(res, 10);
          return await this.fetchTeamById(claimedId);
        }
      } catch (_) {}
    }

    const { data: updated } = await supabase
      .from('teams')
      .update({ mentor_id: params.mentorId, updated_at: new Date().toISOString() })
      .eq('id', params.teamId)
      .filter('mentor_id', 'is', null)
      .select()
      .maybeSingle();

    return updated ? this.mapTeam(updated) : null;
  }

  static async abandonTeam(teamId: number): Promise<void> {
    try {
      await supabase.rpc('abandon_team', { p_team_id: teamId });
      return;
    } catch (_) {}

    const { error } = await supabase
      .from('teams')
      .update({ mentor_id: null, updated_at: new Date().toISOString() })
      .eq('id', teamId);
    if (error) throw error;
  }

  static async searchAvailableStudents(query = '', branch = ''): Promise<ProfileModel[]> {
    try {
      const { data, error } = await supabase.rpc('search_available_students', {
        p_query: query,
        p_branch: branch || null,
      });
      if (!error && Array.isArray(data)) {
        return data.map((p: any) => ({
          id: p.id,
          email: p.email || '',
          fullName: p.full_name || '',
          role: 'STUDENT',
          usn: p.usn,
          branch: p.branch,
          section: p.section,
          semester: p.semester,
          skills: p.skills || [],
          interests: p.interests || [],
        }));
      }
    } catch (_) {}

    let q = supabase.from('profiles').select('*').eq('role', 'STUDENT');
    if (branch) q = q.eq('branch', branch);
    if (query) q = q.ilike('full_name', `%${query}%`);

    const { data } = await q.limit(50);
    return (data || []).map((p: any) => ({
      id: p.id,
      email: p.email || '',
      fullName: p.full_name || '',
      role: 'STUDENT',
      usn: p.usn,
      branch: p.branch,
      section: p.section,
      semester: p.semester,
      skills: p.skills || [],
      interests: p.interests || [],
    }));
  }

  static async fetchSentInvitations(teamId: number): Promise<TeamInvitationModel[]> {
    const { data } = await supabase
      .from('team_invitations')
      .select('*, teams(team_name)')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    return (data || []).map((d: any) => ({
      id: d.id,
      teamId: d.team_id,
      teamName: d.teams?.team_name,
      studentId: d.student_id,
      status: d.status,
      createdAt: d.created_at,
    }));
  }

  static async fetchTeamSentInvitations(teamId: number): Promise<TeamInvitationModel[]> {
    return this.fetchSentInvitations(teamId);
  }

  static async fetchStudentInvitations(studentId: string): Promise<TeamInvitationModel[]> {
    return this.fetchTeamInvitations(studentId);
  }

  static async fetchTeamInvitations(studentId: string): Promise<TeamInvitationModel[]> {
    const { data } = await supabase
      .from('team_invitations')
      .select('*, teams(team_name, project_title, branch, leader:profiles!leader_id(full_name, branch))')
      .eq('student_id', studentId)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    return (data || []).map((d: any) => ({
      id: d.id,
      teamId: d.team_id,
      teamName: d.teams?.team_name,
      projectTitle: d.teams?.project_title,
      leaderName: d.teams?.leader?.full_name,
      leaderBranch: d.teams?.leader?.branch || d.teams?.branch,
      studentId: d.student_id,
      status: d.status,
      createdAt: d.created_at,
    }));
  }

  static async cancelInvitation(teamId: number, studentId: string): Promise<void> {
    const { error } = await supabase
      .from('team_invitations')
      .delete()
      .eq('team_id', teamId)
      .eq('student_id', studentId)
      .eq('status', 'PENDING');
    if (error) throw error;
  }

  static async sendInvitation(teamId: number, studentId: string): Promise<void> {
    const { error } = await supabase.from('team_invitations').insert({
      team_id: teamId,
      student_id: studentId,
      status: 'PENDING',
    });
    if (error) throw error;
  }

  static async respondToInvitation(invitationId: number, accept: boolean): Promise<void> {
    const status = accept ? 'ACCEPTED' : 'REJECTED';
    const { error } = await supabase
      .from('team_invitations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', invitationId);
    if (error) throw error;
  }

  static async fetchJoinRequests(teamId: number, pendingOnly = false): Promise<JoinRequestModel[]> {
    let query = supabase
      .from('join_requests')
      .select('*, profiles:student_id(full_name, usn, branch, skills)')
      .eq('team_id', teamId);

    if (pendingOnly) {
      query = query.eq('status', 'PENDING');
    }

    const { data } = await query.order('created_at', { ascending: false });

    return (data || []).map((d: any) => ({
      id: d.id,
      teamId: d.team_id,
      studentId: d.student_id,
      studentName: d.profiles?.full_name,
      studentUsn: d.profiles?.usn,
      studentBranch: d.profiles?.branch,
      skills: d.profiles?.skills || [],
      message: d.message,
      status: d.status,
      createdAt: d.created_at,
    }));
  }

  static async sendJoinRequest(teamId: number, studentId: string, message = ''): Promise<void> {
    const { error } = await supabase.from('join_requests').insert({
      team_id: teamId,
      student_id: studentId,
      message: message.trim() || null,
      status: 'PENDING',
    });
    if (error) throw error;
  }

  static async respondToJoinRequest(requestId: number, accept: boolean): Promise<void> {
    const status = accept ? 'ACCEPTED' : 'REJECTED';
    const { error } = await supabase
      .from('join_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', requestId);
    if (error) throw error;
  }

  static async fetchStudentJoinRequests(studentId: string): Promise<JoinRequestModel[]> {
    const { data } = await supabase
      .from('join_requests')
      .select('*, teams(team_name)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    return (data || []).map((d: any) => ({
      id: d.id,
      teamId: d.team_id,
      studentId: d.student_id,
      studentName: d.teams?.team_name,
      message: d.message,
      status: d.status,
      createdAt: d.created_at,
    }));
  }

  static async listFacultyMentors(query = '', department = ''): Promise<ProfileModel[]> {
    try {
      const { data, error } = await supabase.rpc('list_faculty_mentors', {
        p_query: query || null,
        p_department: department || null,
      });
      if (!error && Array.isArray(data)) {
        return data.map((p: any) => ({
          id: p.id,
          email: p.email || '',
          fullName: p.full_name || '',
          role: 'MENTOR',
          department: p.department,
          facultyCode: p.faculty_code,
          skills: [],
          interests: [],
        }));
      }
    } catch (_) {}

    let q = supabase.from('profiles').select('*').eq('role', 'MENTOR');
    if (department) q = q.eq('department', department);
    if (query) q = q.ilike('full_name', `%${query}%`);

    const { data } = await q.limit(50);
    return (data || []).map((p: any) => ({
      id: p.id,
      email: p.email || '',
      fullName: p.full_name || '',
      role: 'MENTOR',
      department: p.department,
      facultyCode: p.faculty_code,
      skills: [],
      interests: [],
    }));
  }

  static async sendMentorRequest(teamId: number, mentorId: string, message = ''): Promise<void> {
    try {
      await supabase.rpc('send_mentor_request', {
        p_team_id: teamId,
        p_mentor_id: mentorId,
        p_message: message || null,
      });
      return;
    } catch (_) {}

    const { error } = await supabase.from('mentor_requests').insert({
      team_id: teamId,
      mentor_id: mentorId,
      message: message.trim() || null,
      status: 'PENDING',
    });
    if (error) throw error;
  }

  static async fetchTeamSentMentorRequests(teamId: number): Promise<MentorRequestModel[]> {
    const { data } = await supabase
      .from('mentor_requests')
      .select('*, profiles:mentor_id(full_name)')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    return (data || []).map((d: any) => ({
      id: d.id,
      teamId: d.team_id,
      mentorId: d.mentor_id,
      mentorName: d.profiles?.full_name,
      status: d.status,
      message: d.message,
      createdAt: d.created_at,
    }));
  }

  static async fetchIncomingMentorRequests(mentorId: string): Promise<MentorRequestModel[]> {
    const { data } = await supabase
      .from('mentor_requests')
      .select('*, teams(team_name)')
      .eq('mentor_id', mentorId)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    return (data || []).map((d: any) => ({
      id: d.id,
      teamId: d.team_id,
      mentorId: d.mentor_id,
      teamName: d.teams?.team_name,
      status: d.status,
      message: d.message,
      createdAt: d.created_at,
    }));
  }

  static async respondToMentorRequest(requestId: number, accept: boolean): Promise<void> {
    try {
      await supabase.rpc('respond_to_mentor_request', {
        p_request_id: requestId,
        p_verdict: accept ? 'ACCEPTED' : 'REJECTED',
      });
      return;
    } catch (_) {}

    const { error } = await supabase
      .from('mentor_requests')
      .update({
        status: accept ? 'ACCEPTED' : 'REJECTED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);
    if (error) throw error;
  }

  static async cancelMentorRequest(teamId: number, mentorId: string): Promise<void> {
    const { error } = await supabase
      .from('mentor_requests')
      .delete()
      .eq('team_id', teamId)
      .eq('mentor_id', mentorId)
      .eq('status', 'PENDING');
    if (error) throw error;
  }

  static async fetchIncomingLeadTransfers(userId: string): Promise<LeadTransferRequestModel[]> {
    const { data } = await supabase
      .from('lead_transfer_requests')
      .select('*, teams(team_name), from_user:profiles!from_user_id(full_name)')
      .eq('to_user_id', userId)
      .eq('status', 'PENDING');

    return (data || []).map((d: any) => ({
      id: d.id,
      teamId: d.team_id,
      teamName: d.teams?.team_name,
      fromUserId: d.from_user_id,
      fromUserName: d.from_user?.full_name,
      toUserId: d.to_user_id,
      status: d.status,
      createdAt: d.created_at,
    }));
  }

  static async fetchOutgoingLeadTransfer(teamId: number): Promise<LeadTransferRequestModel | null> {
    const { data } = await supabase
      .from('lead_transfer_requests')
      .select('*, profiles:to_user_id(full_name)')
      .eq('team_id', teamId)
      .eq('status', 'PENDING')
      .maybeSingle();

    if (!data) return null;
    return {
      id: data.id,
      teamId: data.team_id,
      fromUserId: data.from_user_id,
      toUserId: data.to_user_id,
      toUserName: data.profiles?.full_name,
      status: data.status,
      createdAt: data.created_at,
    };
  }

  static async requestLeadTransfer(teamId: number, fromUserId: string, toUserId: string): Promise<void> {
    const { error } = await supabase.from('lead_transfer_requests').insert({
      team_id: teamId,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      status: 'PENDING',
    });
    if (error) throw error;
  }

  static async respondToLeadTransfer(requestId: number, accept: boolean): Promise<void> {
    const { error } = await supabase.rpc('respond_lead_transfer', {
      p_request_id: requestId,
      p_verdict: accept ? 'ACCEPTED' : 'REJECTED',
    });
    if (error) throw error;
  }

  static async revertLeadToMember(): Promise<void> {
    const { error } = await supabase.rpc('revert_lead_to_member');
    if (error) throw error;
  }

  static async fetchTeamEvaluations(teamId: number): Promise<TeamEvaluation[]> {
    const { data } = await supabase
      .from('team_evaluations')
      .select('*, evaluator:profiles!evaluator_id(full_name)')
      .eq('team_id', teamId)
      .not('phase_name', 'like', '__%')
      .order('created_at', { ascending: false });

    return (data || [])
      .filter((d: any) => {
        const name = (d.phase_name || '').toLowerCase().trim();
        if (!name) return false;
        if (name.startsWith('__')) return false;
        if (name.includes('visibility')) return false;
        if (name.includes('dummy') || name.includes('mock') || name.includes('test') || name.includes('demo')) return false;
        return true;
      })
      .map((d: any) => ({
        id: d.id,
        teamId: d.team_id,
        evaluatorId: d.evaluator_id,
        evaluatorName: d.evaluator?.full_name,
        phaseName: d.phase_name,
        totalMarks: Number(d.total_marks || 0),
        maxMarks: Number(d.max_marks || 50),
        memberMarks: d.member_marks || {},
        remarks: d.remarks,
        createdAt: d.created_at,
      }));
  }

  static async recordTeamEvaluation(data: {
    teamId: number;
    phaseName: string;
    totalMarks: number;
    maxMarks?: number;
    memberMarks: Record<string, number>;
    remarks?: string;
  }): Promise<void> {
    try {
      await supabase.rpc('record_team_evaluation', {
        p_team_id: data.teamId,
        p_phase_name: data.phaseName,
        p_total_marks: data.totalMarks,
        p_max_marks: data.maxMarks || 50,
        p_member_marks: data.memberMarks,
        p_remarks: data.remarks || null,
      });
      return;
    } catch (_) {}

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('team_evaluations').insert({
      team_id: data.teamId,
      evaluator_id: user.id,
      phase_name: data.phaseName,
      total_marks: data.totalMarks,
      max_marks: data.maxMarks || 50,
      member_marks: data.memberMarks,
      remarks: data.remarks || null,
    });
    if (error) throw error;
  }

  static async setMarksVisibility(teamId: number, isVisible: boolean): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not signed in');

    try {
      const { data: existing } = await supabase
        .from('team_evaluations')
        .select('id')
        .eq('team_id', teamId)
        .eq('phase_name', '__MARKS_VISIBILITY__')
        .maybeSingle();

      if (existing) {
        await supabase
          .from('team_evaluations')
          .update({
            total_marks: isVisible ? 1.0 : 0.0,
            remarks: isVisible ? 'VISIBLE' : 'HIDDEN',
            updated_at: new Date().toISOString(),
          })
          .eq('id', (existing as any).id);
      } else {
        await supabase.from('team_evaluations').insert({
          team_id: teamId,
          evaluator_id: user.id,
          phase_name: '__MARKS_VISIBILITY__',
          total_marks: isVisible ? 1.0 : 0.0,
          max_marks: 1.0,
          remarks: isVisible ? 'VISIBLE' : 'HIDDEN',
        });
      }
    } catch (_) {}
  }

  static async setMarksVisibilityForTeams(teamIds: number[], isVisible: boolean): Promise<void> {
    for (const tid of teamIds) {
      await this.setMarksVisibility(tid, isVisible);
    }
  }

  static async fetchMarksVisibility(teamId: number): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('team_evaluations')
        .select('total_marks, remarks')
        .eq('team_id', teamId)
        .eq('phase_name', '__MARKS_VISIBILITY__')
        .maybeSingle();

      // If mentor explicitly marked evaluations as hidden
      if (data && ((data as any).total_marks === 0.0 || (data as any).remarks === 'HIDDEN')) {
        return false;
      }
      // If mentor explicitly made visible or default when evaluations exist
      return true;
    } catch (_) {
      return true;
    }
  }

  private static mapTeam(raw: any): TeamModel {
    return {
      id: Number(raw.id),
      teamCode: raw.team_code || '',
      teamName: raw.team_name || '',
      projectTitle: raw.project_title || '',
      projectGist: raw.project_gist || '',
      abstractText: raw.abstract || raw.project_abstract,
      objectives: raw.objectives || raw.project_objectives,
      theme: raw.theme || '',
      branch: raw.branch || '',
      leaderId: raw.leader_id || '',
      mentorId: raw.mentor_id,
      currentProgressPct: Number(raw.current_progress_pct || 0),
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }
}
