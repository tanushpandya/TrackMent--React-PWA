import { supabase } from './supabase';
import { MeetingLedgerEntry, AttendanceRecord } from '../types';

export class LedgerService {
  static async fetchLedger(teamId: number): Promise<MeetingLedgerEntry[]> {
    const { data: rows, error } = await supabase
      .from('meeting_ledger')
      .select('*, meeting_attendance(student_id, is_present, profiles(full_name, usn))')
      .eq('team_id', teamId)
      .order('meeting_number', { ascending: false });

    if (error) throw error;

    // Fetch current team members to guarantee newly joined students are included
    const currentMembers: { id: string; name: string; usn: string }[] = [];
    try {
      const { data: tmRows } = await supabase
        .from('team_members')
        .select('user_id, profiles(id, full_name, usn)')
        .eq('team_id', teamId);

      for (const r of tmRows || []) {
        const p = (r.profiles as any) || {};
        const uid = (r.user_id || p.id || '').toString();
        if (uid) {
          currentMembers.push({
            id: uid,
            name: p.full_name?.trim() || 'Team Member',
            usn: p.usn?.trim() || '',
          });
        }
      }
    } catch (_) {}

    return (rows || []).map((r: any) => {
      const existingRecords: Record<string, AttendanceRecord> = {};
      for (const a of r.meeting_attendance || []) {
        const p = a.profiles || {};
        const studentId = (a.student_id || '').toString();
        if (studentId) {
          existingRecords[studentId] = {
            studentId,
            studentName: p.full_name || 'Unknown',
            usn: p.usn || '',
            isPresent: a.is_present ?? true,
          };
        }
      }

      const mergedAttendance: AttendanceRecord[] = [];
      for (const cm of currentMembers) {
        if (existingRecords[cm.id]) {
          mergedAttendance.push(existingRecords[cm.id]);
          delete existingRecords[cm.id];
        } else {
          mergedAttendance.push({
            studentId: cm.id,
            studentName: cm.name,
            usn: cm.usn,
            isPresent: true,
          });
        }
      }
      mergedAttendance.push(...Object.values(existingRecords));

      return {
        id: r.id.toString(),
        teamId: r.team_id.toString(),
        meetingNumber: Number(r.meeting_number),
        meetingDate: r.meeting_date,
        summaryNotes: r.summary_notes || '',
        attendance: mergedAttendance,
      };
    });
  }

  static async logMeeting(params: {
    teamId: number;
    appointmentId?: number | null;
    meetingDate?: string;
    attendance: Record<string, boolean>; // studentId -> isPresent
    summaryNotes?: string;
  }): Promise<void> {
    const { data: last } = await supabase
      .from('meeting_ledger')
      .select('meeting_number')
      .eq('team_id', params.teamId)
      .order('meeting_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextNumber = ((last?.meeting_number as number) || 0) + 1;

    const { data: ledger, error: ledgerError } = await supabase
      .from('meeting_ledger')
      .insert({
        team_id: params.teamId,
        appointment_id: params.appointmentId || null,
        meeting_number: nextNumber,
        meeting_date: params.meetingDate || new Date().toISOString(),
        summary_notes: params.summaryNotes?.trim() || '',
      })
      .select('id')
      .single();

    if (ledgerError) throw ledgerError;

    // Guarantee current team members are in the payload
    const attendanceMap = { ...params.attendance };
    try {
      const { data: tmRows } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', params.teamId);
      for (const r of tmRows || []) {
        if (r.user_id && attendanceMap[r.user_id] === undefined) {
          attendanceMap[r.user_id] = true;
        }
      }
    } catch (_) {}

    const attendanceRows = Object.entries(attendanceMap).map(([studentId, isPresent]) => ({
      meeting_ledger_id: ledger.id,
      student_id: studentId,
      is_present: isPresent,
    }));

    try {
      const { error: attError } = await supabase.from('meeting_attendance').insert(attendanceRows);
      if (attError) throw attError;
    } catch (e) {
      await supabase.from('meeting_ledger').delete().eq('id', ledger.id);
      throw e;
    }
  }

  static async setAttendance(params: {
    ledgerId: string;
    studentId: string;
    isPresent: boolean;
  }): Promise<void> {
    const { error } = await supabase.from('meeting_attendance').upsert({
      meeting_ledger_id: parseInt(params.ledgerId, 10),
      student_id: params.studentId,
      is_present: params.isPresent,
    });
    if (error) throw error;
  }

  static async toggleAttendance(
    meetingId: string,
    studentId: string,
    isPresent: boolean
  ): Promise<void> {
    return this.setAttendance({ ledgerId: meetingId, studentId, isPresent });
  }
}
