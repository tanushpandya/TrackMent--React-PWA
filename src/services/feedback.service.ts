import { supabase } from './supabase';
import { fastCache } from '../utils/cache';
import { FeedbackModel, FeedbackType } from '../types';

export class FeedbackService {
  static async submit(params: {
    teamId: number;
    mentorId: string;
    feedbackType: FeedbackType;
    content?: string | null;
    sendEmailNotification?: boolean;
  }): Promise<FeedbackModel> {
    fastCache.invalidate('feedback_');
    const trimmed = params.content?.trim();
    const cleanContent = trimmed && trimmed.length > 0 ? trimmed : null;

    const { data, error } = await supabase
      .from('feedback')
      .insert({
        team_id: params.teamId,
        mentor_id: params.mentorId,
        feedback_type: params.feedbackType,
        content: cleanContent,
      })
      .select('*, profiles:mentor_id(full_name)')
      .single();

    if (error) throw error;
    return this.mapFeedback(data);
  }

  static async submitFeedback(params: {
    teamId: number;
    mentorId: string;
    feedbackType: FeedbackType;
    content?: string | null;
    sendEmailNotification?: boolean;
  }): Promise<FeedbackModel> {
    return this.submit(params);
  }

  static async toggleContributionThumbsUp(params: {
    teamId: number;
    mentorId: string;
    contributionId: number;
  }): Promise<boolean> {
    const { data: existing } = await supabase
      .from('feedback')
      .select('id')
      .eq('contribution_id', params.contributionId)
      .eq('mentor_id', params.mentorId)
      .eq('feedback_type', 'THUMBS_UP')
      .maybeSingle();

    if (existing) {
      await supabase.from('feedback').delete().eq('id', existing.id);
      return false; // un-liked
    } else {
      await supabase.from('feedback').insert({
        team_id: params.teamId,
        mentor_id: params.mentorId,
        contribution_id: params.contributionId,
        feedback_type: 'THUMBS_UP',
        content: 'Acknowledged contribution deliverable 👍',
      });
      return true; // liked
    }
  }

  static async submitBatch(params: {
    teamId: number;
    mentorId: string;
    entries: { feedbackType: FeedbackType; content?: string | null }[];
  }): Promise<void> {
    if (params.entries.length === 0) return;
    const rows = params.entries.map((e) => ({
      team_id: params.teamId,
      mentor_id: params.mentorId,
      feedback_type: e.feedbackType,
      content: e.content?.trim() || null,
    }));

    const { error } = await supabase.from('feedback').insert(rows);
    if (error) throw error;
  }

  static async fetchForTeam(teamId: number): Promise<FeedbackModel[]> {
    return fastCache.dedupe(`feedback_${teamId}`, async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select('*, profiles:mentor_id(full_name)')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(this.mapFeedback);
    }, 15000);
  }

  static async fetchTeamFeedback(teamId: number): Promise<FeedbackModel[]> {
    return this.fetchForTeam(teamId);
  }

  static async fetchActiveMeetMe(teamId: number): Promise<FeedbackModel | null> {
    const { data } = await supabase
      .from('feedback')
      .select('*, profiles:mentor_id(full_name)')
      .eq('team_id', teamId)
      .eq('feedback_type', 'MEET_ME')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? this.mapFeedback(data) : null;
  }

  static async sendBroadcastNotice(params: {
    teamIds: number[];
    mentorId: string;
    subject: string;
    message: string;
    category?: string;
  }): Promise<number> {
    if (params.teamIds.length === 0) return 0;
    const categoryTag = params.category ? `[${params.category.toUpperCase()}] ` : '';
    const formattedContent = `📢 ${categoryTag}${params.subject.trim()}\n\n${params.message.trim()}`;

    const rows = params.teamIds.map((teamId) => ({
      team_id: teamId,
      mentor_id: params.mentorId,
      feedback_type: 'GENERAL',
      content: formattedContent,
    }));

    const { error } = await supabase.from('feedback').insert(rows);
    if (error) {
      console.warn('Could not insert broadcast feedback rows:', error);
    } else {
      fastCache.invalidate('feedback_');
    }

    try {
      await supabase.functions.invoke('send-team-notification', {
        body: {
          teamIds: params.teamIds,
          subject: `📢 [TrackMent Broadcast] ${params.subject}`,
          message: params.message,
        },
      });
    } catch (_) {}

    return params.teamIds.length;
  }

  private static mapFeedback(raw: any): FeedbackModel {
    return {
      id: Number(raw.id),
      teamId: Number(raw.team_id),
      mentorId: raw.mentor_id,
      mentorName: raw.profiles?.full_name,
      contributionId: raw.contribution_id ? Number(raw.contribution_id) : null,
      appointmentId: raw.appointment_id ? Number(raw.appointment_id) : null,
      feedbackType: raw.feedback_type as FeedbackType,
      content: raw.content,
      createdAt: raw.created_at,
    };
  }
}
