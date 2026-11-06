import { supabase, PROOFS_BUCKET, MAX_FILE_SIZE_BYTES } from './supabase';
import { ContributionFile } from '../types';

export class StorageService {
  static fileTypeFor(fileName: string): 'VIDEO' | 'IMAGE' | 'DOCUMENT' | 'ARCHIVE' {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['mp4', 'mov', 'mkv', 'webm'].includes(ext)) return 'VIDEO';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'IMAGE';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'ARCHIVE';
    return 'DOCUMENT';
  }

  static validateFile(file: File): { isValid: boolean; errorMessage?: string } {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        errorMessage: `File size exceeds the 50MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
      };
    }
    return { isValid: true };
  }

  static async uploadProof(params: {
    teamId: number;
    contributionId: number;
    file: File;
  }): Promise<ContributionFile> {
    const val = this.validateFile(params.file);
    if (!val.isValid) throw new Error(val.errorMessage);

    const safeName = params.file.name.replace(/[^A-Za-z0-9._-]/g, '_');
    const path = `team_${params.teamId}/${params.contributionId}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(PROOFS_BUCKET)
      .upload(path, params.file, {
        upsert: true,
      });

    if (uploadError) throw uploadError;

    try {
      const { data, error: dbError } = await supabase
        .from('contribution_files')
        .insert({
          contribution_id: params.contributionId,
          storage_path: path,
          file_name: params.file.name,
          file_type: this.fileTypeFor(params.file.name),
          file_size_bytes: params.file.size,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return {
        id: Number(data.id),
        contributionId: Number(data.contribution_id),
        storagePath: data.storage_path,
        fileName: data.file_name,
        fileType: data.file_type,
        fileSizeBytes: Number(data.file_size_bytes),
        createdAt: data.created_at,
      };
    } catch (e) {
      // Clean up orphaned storage object
      await supabase.storage.from(PROOFS_BUCKET).remove([path]);
      throw e;
    }
  }

  static async getSignedUrl(storagePath: string, seconds = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(PROOFS_BUCKET)
      .createSignedUrl(storagePath, seconds);

    if (error || !data) {
      throw error || new Error('Could not generate signed URL');
    }
    return data.signedUrl;
  }

  static async filesFor(contributionId: number): Promise<ContributionFile[]> {
    const { data, error } = await supabase
      .from('contribution_files')
      .select('*')
      .eq('contribution_id', contributionId);

    if (error) throw error;
    return (data || []).map((d: any) => ({
      id: Number(d.id),
      contributionId: Number(d.contribution_id),
      storagePath: d.storage_path,
      fileName: d.file_name,
      fileType: d.file_type,
      fileSizeBytes: Number(d.file_size_bytes),
      createdAt: d.created_at,
    }));
  }
}
