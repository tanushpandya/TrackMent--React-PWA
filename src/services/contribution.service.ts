import { supabase, PROOFS_BUCKET } from './supabase';
import { fastCache } from '../utils/cache';
import { ContributionModel, ContributionVote, ContributionStatus } from '../types';

export class ContributionService {
  static async fetchForTeam(teamId: number): Promise<ContributionModel[]> {
    return fastCache.dedupe(`contribs_${teamId}`, async () => {
      try {
        const { data, error } = await supabase
          .from('contributions')
          .select('*, profiles:author_id(full_name), contribution_files(*)')
          .eq('team_id', teamId)
          .neq('status', 'SOFT_DELETED')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map(this.mapContribution);
        }
      } catch (_) {}

      const { data } = await supabase
        .from('contributions')
        .select('*, contribution_files(*)')
        .eq('team_id', teamId)
        .neq('status', 'SOFT_DELETED')
        .order('created_at', { ascending: false });

      return (data || []).map(this.mapContribution);
    }, 15000);
  }

  static async fetchTeamContributions(teamId: number): Promise<ContributionModel[]> {
    return this.fetchForTeam(teamId);
  }

  static async fetchPendingForTeam(teamId: number): Promise<ContributionModel[]> {
    return fastCache.dedupe(`contribs_pending_${teamId}`, async () => {
      try {
        const { data, error } = await supabase
          .from('contributions')
          .select('*, profiles:author_id(full_name), contribution_files(*)')
          .eq('team_id', teamId)
          .eq('status', 'PENDING')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map(this.mapContribution);
        }
      } catch (_) {}

      const { data } = await supabase
        .from('contributions')
        .select('*, contribution_files(*)')
        .eq('team_id', teamId)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      return (data || []).map(this.mapContribution);
    }, 15000);
  }

  static async submit(params: {
    teamId: number;
    authorId: string;
    title: string;
    description: string;
    links?: string[];
  }): Promise<ContributionModel> {
    const { data, error } = await supabase
      .from('contributions')
      .insert({
        team_id: params.teamId,
        author_id: params.authorId,
        title: params.title.trim(),
        description: params.description.trim(),
        links: params.links || [],
        status: 'PENDING',
      })
      .select('*, profiles:author_id(full_name)')
      .single();

    if (error) throw error;
    fastCache.invalidate('contribs_');
    return this.mapContribution(data);
  }

  static async submitReview(params: {
    contributionId: number;
    reviewerId: string;
    verdict: 'CONFIRMED' | 'REJECTED';
    rejectionReason?: string;
  }): Promise<void> {
    const { error } = await supabase.from('contribution_reviews').insert({
      contribution_id: params.contributionId,
      reviewer_id: params.reviewerId,
      verdict: params.verdict,
      rejection_reason: params.rejectionReason?.trim() || null,
    });
    if (error) throw error;
    fastCache.invalidate('contribs_');
  }

  static async fetchVotes(contributionIds: number[]): Promise<ContributionVote[]> {
    if (contributionIds.length === 0) return [];
    const { data, error } = await supabase
      .from('contribution_votes')
      .select('contribution_id, voter_id, verdict, rejection_reason')
      .in('contribution_id', contributionIds);

    if (error) throw error;
    return (data || []).map((d: any) => ({
      contributionId: d.contribution_id,
      voterId: d.voter_id,
      verdict: d.verdict,
      reason: d.rejection_reason,
    }));
  }

  static async castVote(params: {
    contributionId: number;
    verdict: 'CONFIRMED' | 'REJECTED';
    reason?: string;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('vote_on_contribution', {
      p_contribution_id: params.contributionId,
      p_verdict: params.verdict,
      p_reason: params.reason || null,
    });
    if (error) throw error;
    fastCache.invalidate('contribs_');
    return data?.toString() || 'PENDING';
  }

  static async deleteContribution(contributionId: number, authorId: string): Promise<void> {
    fastCache.invalidate('contribs_');
    // 1. Collect files to delete
    let paths: string[] = [];
    try {
      const { data: files } = await supabase
        .from('contribution_files')
        .select('storage_path')
        .eq('contribution_id', contributionId);
      paths = (files || []).map((f: any) => f.storage_path).filter(Boolean);
    } catch (_) {}

    // 2. Delete contribution row
    const { error } = await supabase
      .from('contributions')
      .delete()
      .eq('id', contributionId)
      .eq('author_id', authorId)
      .eq('status', 'PENDING');

    if (error) throw error;

    // 3. Remove storage objects
    if (paths.length > 0) {
      try {
        await supabase.storage.from(PROOFS_BUCKET).remove(paths);
      } catch (_) {}
    }
  }

  private static mapContribution(raw: any): ContributionModel {
    return {
      id: Number(raw.id),
      teamId: Number(raw.team_id),
      authorId: raw.author_id,
      authorName: raw.profiles?.full_name || raw.author_name,
      title: raw.title || '',
      description: raw.description || '',
      links: raw.links || [],
      status: raw.status as ContributionStatus,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      files: (raw.contribution_files || []).map((f: any) => ({
        id: Number(f.id),
        contributionId: Number(f.contribution_id),
        storagePath: f.storage_path,
        fileName: f.file_name,
        fileType: f.file_type,
        fileSizeBytes: Number(f.file_size_bytes || 0),
        createdAt: f.created_at,
      })),
    };
  }
}
