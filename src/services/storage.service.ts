import { supabase, PROOFS_BUCKET, REPORTS_BUCKET, MAX_FILE_SIZE_BYTES, MAX_REPORT_FILE_SIZE_BYTES } from './supabase';
import { ContributionFile } from '../types';

export class StorageService {
  // Canonical allowed file extensions strictly matching Supabase Storage RLS policies
  static readonly ALLOWED_PROOF_EXTS = new Set([
    'mp4', 'mov', 'mkv',
    'pdf', 'docx', 'doc', 'pptx', 'ppt',
    'jpg', 'jpeg', 'png',
  ]);

  static readonly MIME_TYPES: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    mkv: 'video/x-matroska',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
  };

  static fileExtension(fileName: string): string {
    const parts = fileName.split('.');
    if (parts.length < 2) return '';
    return parts.pop()?.toLowerCase() || '';
  }

  static fileTypeFor(fileName: string): 'VIDEO' | 'IMAGE' | 'DOCUMENT' | 'ARCHIVE' {
    const ext = this.fileExtension(fileName);
    if (['mp4', 'mov', 'mkv'].includes(ext)) return 'VIDEO';
    if (['jpg', 'jpeg', 'png'].includes(ext)) return 'IMAGE';
    return 'DOCUMENT';
  }

  static getMimeType(fileName: string): string {
    const ext = this.fileExtension(fileName);
    return this.MIME_TYPES[ext] || 'application/octet-stream';
  }

  static validateFile(file: File): { isValid: boolean; errorMessage?: string } {
    const ext = this.fileExtension(file.name);
    if (!ext || !this.ALLOWED_PROOF_EXTS.has(ext)) {
      return {
        isValid: false,
        errorMessage: `Unsupported file type ".${ext || 'unknown'}". Allowed: PDF, DOC, DOCX, PPT, PPTX, MP4, MOV, MKV, JPG, JPEG, PNG.`,
      };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        errorMessage: `File "${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)}MB — max allowed is 50MB.`,
      };
    }

    return { isValid: true };
  }

  static validateReportFile(file: File): { isValid: boolean; errorMessage?: string } {
    const ext = this.fileExtension(file.name);
    if (ext !== 'pdf') {
      return {
        isValid: false,
        errorMessage: 'Institutional project reports must be in PDF format (.pdf).',
      };
    }

    if (file.size > MAX_REPORT_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        errorMessage: `Report is ${(file.size / (1024 * 1024)).toFixed(1)}MB — max allowed is 10MB.`,
      };
    }

    return { isValid: true };
  }

  static formatBytes(bytes: number): string {
    if (bytes <= 0) return '0 B';
    if (bytes >= 1048576) {
      return `${(bytes / 1048576).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  static async uploadProof(params: {
    teamId: number;
    contributionId: number;
    file: File;
  }): Promise<ContributionFile> {
    const val = this.validateFile(params.file);
    if (!val.isValid) throw new Error(val.errorMessage);

    const ext = this.fileExtension(params.file.name);
    const baseName = params.file.name.substring(0, params.file.name.lastIndexOf('.')) || params.file.name;
    const safeBaseName = baseName.replace(/[^A-Za-z0-9_-]/g, '_');
    // Generate canonical path matching RLS foldername policy: team_{teamId}/{contributionId}/{timestamp}_{name}.{ext}
    const path = `team_${params.teamId}/${params.contributionId}/${Date.now()}_${safeBaseName}.${ext}`;

    const contentType = this.getMimeType(params.file.name);

    const { error: uploadError } = await supabase.storage
      .from(PROOFS_BUCKET)
      .upload(path, params.file, {
        upsert: true,
        contentType,
      });

    if (uploadError) {
      console.error('[StorageService] Upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

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
    } catch (e: any) {
      // Clean up orphaned storage object on database insertion failure
      await supabase.storage.from(PROOFS_BUCKET).remove([path]).catch(() => {});
      throw new Error(`Failed to associate uploaded file with deliverable: ${e.message}`);
    }
  }

  static async getSignedUrl(storagePath: string, seconds = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(PROOFS_BUCKET)
      .createSignedUrl(storagePath, seconds);

    if (error || !data) {
      throw error || new Error('Could not generate signed URL for document');
    }
    return data.signedUrl;
  }

  static async getProofSignedUrl(storagePath: string, seconds = 3600): Promise<string> {
    return this.getSignedUrl(storagePath, seconds);
  }

  static async getReportSignedUrl(storagePath: string, seconds = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(REPORTS_BUCKET)
      .createSignedUrl(storagePath, seconds);

    if (error || !data) {
      throw error || new Error('Could not generate signed URL for team report');
    }
    return data.signedUrl;
  }

  static async removeProofs(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    try {
      await supabase.storage.from(PROOFS_BUCKET).remove(paths);
    } catch (err) {
      console.warn('[StorageService] Error purging proof blobs:', err);
    }
  }

  static async removeReports(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    try {
      await supabase.storage.from(REPORTS_BUCKET).remove(paths);
    } catch (err) {
      console.warn('[StorageService] Error purging report blobs:', err);
    }
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
