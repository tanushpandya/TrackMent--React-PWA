import { supabase, STUDENT_DOMAIN, FACULTY_DOMAIN } from './supabase';
import { ProfileModel, Role } from '../types';
import { fastCache } from '../utils/cache';

export class AuthService {
  static isAllowedEmail(email?: string | null): boolean {
    if (!email) return false;
    const lower = email.toLowerCase().trim();
    return lower.endsWith(`@${STUDENT_DOMAIN}`) || lower.endsWith(`@${FACULTY_DOMAIN}`);
  }

  static detectEmailRole(email?: string | null): 'STUDENT' | 'MENTOR' {
    if (!email) return 'STUDENT';
    const local = email.split('@')[0].toLowerCase();
    // RVCE Student format has branch and graduation year (e.g. alex.cs22)
    const hasBranchYearPattern = /\.[a-z]{2,4}\d{2}$/i.test(local);
    return hasBranchYearPattern ? 'STUDENT' : 'MENTOR';
  }

  static async signInWithGoogle(): Promise<void> {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectUrl = import.meta.env.VITE_APP_URL || origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          hd: STUDENT_DOMAIN, // Strictly restricts Google account picker to @rvce.edu.in
          prompt: 'select_account',
        },
      },
    });
    if (error) throw error;
  }

  static async signInWithPassword(
    email: string,
    password: string
  ): Promise<{ user: any; profile: ProfileModel | null }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!this.isAllowedEmail(cleanEmail)) {
      throw new Error('Please use your official @rvce.edu.in institutional email.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error) throw error;
    if (!data.user) throw new Error('Authentication failed.');

    const profile = await this.loadProfile(data.user.id);
    return { user: data.user, profile };
  }

  static async signOut(): Promise<void> {
    fastCache.invalidate();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async loadProfile(userId: string): Promise<ProfileModel | null> {
    return fastCache.dedupe(`profile_${userId}`, async () => {
      let { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!data) {
        try {
          const user = (await supabase.auth.getUser()).data.user;
          if (user?.email) {
            const byEmail = await supabase
              .from('profiles')
              .select('*')
              .ilike('email', user.email.trim())
              .maybeSingle();
            data = byEmail.data;
          }
        } catch (err) {
          console.warn('Fallback profile lookup by email failed:', err);
        }
      }

      if (!data) return null;

      return {
        id: data.id,
        email: data.email || '',
        fullName: data.full_name || '',
        role: data.role as Role,
        usn: data.usn,
        branch: data.branch,
        section: data.section,
        semester: data.semester,
        department: data.department,
        facultyCode: data.faculty_code,
        skills: data.skills || [],
        interests: data.interests || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    });
  }

  static async fetchProfile(userId: string): Promise<ProfileModel | null> {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      email: data.email || '',
      fullName: data.full_name || '',
      role: data.role as Role,
      usn: data.usn,
      branch: data.branch,
      section: data.section,
      semester: data.semester,
      skills: data.skills || [],
      interests: data.interests || [],
      department: data.department,
      facultyCode: data.faculty_code,
    };
  }

  static async createStudentProfile(data: {
    fullName: string;
    usn: string;
    branch: string;
    section?: string;
    semester?: number;
    skills: string[];
    interests: string[];
  }): Promise<ProfileModel> {
    try {
      const { data: res, error } = await supabase.rpc('upsert_student_profile', {
        p_full_name: data.fullName,
        p_usn: data.usn.toUpperCase().trim(),
        p_branch: data.branch,
        p_section: data.section || null,
        p_semester: data.semester || null,
        p_skills: data.skills,
        p_interests: data.interests,
      });
      if (error) throw error;
      if (res) {
        return {
          id: res.id,
          email: res.email || '',
          fullName: res.full_name || data.fullName,
          role: 'STUDENT',
          usn: res.usn,
          branch: res.branch,
          section: res.section,
          semester: res.semester,
          skills: res.skills || [],
          interests: res.interests || [],
        };
      }
    } catch (e: any) {
      console.warn('upsert_student_profile RPC fallback:', e);
      if (e?.message?.toLowerCase().includes('usn') || e?.code === '23505') {
        throw e;
      }
    }

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const payload = {
      id: user.id,
      email: user.email!,
      full_name: data.fullName,
      role: 'STUDENT',
      usn: data.usn.toUpperCase().trim(),
      branch: data.branch,
      section: data.section || null,
      semester: data.semester || null,
      skills: data.skills,
      interests: data.interests,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('profiles')
      .upsert(payload)
      .select()
      .single();

    if (insertErr) throw insertErr;
    return inserted as unknown as ProfileModel;
  }

  static async createFacultyProfile(data: {
    fullName: string;
    department: string;
    facultyCode: string;
  }): Promise<ProfileModel> {
    try {
      const { data: res, error } = await supabase.rpc('upsert_faculty_profile', {
        p_full_name: data.fullName,
        p_department: data.department,
        p_faculty_code: data.facultyCode.toUpperCase().trim(),
      });
      if (error) throw error;
      if (res) {
        return {
          id: res.id,
          email: res.email || '',
          fullName: res.full_name || data.fullName,
          role: 'MENTOR',
          department: res.department,
          facultyCode: res.faculty_code,
          skills: [],
          interests: [],
        };
      }
    } catch (e: any) {
      console.warn('upsert_faculty_profile RPC fallback:', e);
      if (e?.message?.toLowerCase().includes('faculty') || e?.code === '23505') {
        throw e;
      }
    }

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('Not authenticated');

    const payload = {
      id: user.id,
      email: user.email!,
      full_name: data.fullName,
      role: 'MENTOR',
      department: data.department,
      faculty_code: data.facultyCode.toUpperCase().trim(),
      skills: [],
      interests: [],
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('profiles')
      .upsert(payload)
      .select()
      .single();

    if (insertErr) throw insertErr;
    return inserted as unknown as ProfileModel;
  }

  static async saveProfile(profile: Partial<ProfileModel> & { id: string }): Promise<ProfileModel> {
    const isMentor = profile.role === 'MENTOR';

    if (isMentor) {
      const payload: Record<string, any> = {
        full_name: profile.fullName,
        department: profile.department,
      };
      if (profile.facultyCode) payload.faculty_code = profile.facultyCode;

      const { error } = await supabase.from('profiles').update(payload).eq('id', profile.id);
      if (error) throw error;
    } else {
      const payload: Record<string, any> = {
        full_name: profile.fullName,
        branch: profile.branch,
        section: profile.section,
        semester: profile.semester,
        skills: profile.skills,
        interests: profile.interests,
      };
      if (profile.usn) payload.usn = profile.usn.toUpperCase().trim();

      const { error } = await supabase.from('profiles').update(payload).eq('id', profile.id);
      if (error) throw error;
    }

    const reloaded = await this.loadProfile(profile.id);
    if (!reloaded) throw new Error('Could not reload profile after update');
    return reloaded;
  }

  static async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  static async deleteAccount(): Promise<void> {
    const { error } = await supabase.rpc('delete_user');
    if (error) throw error;
    await this.signOut();
  }
}
