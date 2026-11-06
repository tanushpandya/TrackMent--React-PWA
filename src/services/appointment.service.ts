import { supabase } from './supabase';
import { AppointmentModel, AppointmentStatus } from '../types';

export class AppointmentService {
  static async request(params: {
    teamId: number;
    requestedBy: string;
    mentorId: string;
    requestedSlot: string;
    agenda: string;
  }): Promise<AppointmentModel> {
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        team_id: params.teamId,
        requested_by: params.requestedBy,
        mentor_id: params.mentorId,
        requested_slot: params.requestedSlot,
        agenda: params.agenda.trim(),
        status: 'REQUESTED',
      })
      .select('*, teams(team_name)')
      .single();

    if (error) throw error;
    return this.mapAppointment(data);
  }

  static async fetchUpcomingForTeam(teamId: number): Promise<AppointmentModel | null> {
    const { data } = await supabase
      .from('appointments')
      .select('*, teams(team_name)')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    const apt = this.mapAppointment(data);
    if (apt.status === 'COMPLETED' || apt.status === 'CANCELLED') {
      return null;
    }
    return apt;
  }

  static async fetchLatestForTeam(teamId: number): Promise<AppointmentModel | null> {
    const { data } = await supabase
      .from('appointments')
      .select('*, teams(team_name)')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? this.mapAppointment(data) : null;
  }

  static async fetchAllForTeam(teamId: number): Promise<AppointmentModel[]> {
    const { data } = await supabase
      .from('appointments')
      .select('*, teams(team_name)')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    return (data || []).map(this.mapAppointment);
  }

  static async fetchPendingForMentor(mentorId: string): Promise<AppointmentModel[]> {
    const { data } = await supabase
      .from('appointments')
      .select('*, teams(team_name)')
      .eq('mentor_id', mentorId)
      .in('status', ['REQUESTED', 'RESCHEDULED'])
      .order('requested_slot', { ascending: true });

    return (data || []).map(this.mapAppointment);
  }

  static async fetchConfirmedForMentor(mentorId: string): Promise<AppointmentModel[]> {
    const { data } = await supabase
      .from('appointments')
      .select('*, teams(team_name)')
      .eq('mentor_id', mentorId)
      .in('status', ['CONFIRMED', 'IN_MEETING'])
      .order('confirmed_slot', { ascending: true });

    return (data || []).map(this.mapAppointment);
  }

  static async confirm(id: number, confirmedSlot?: string): Promise<void> {
    let slot = confirmedSlot;
    if (!slot) {
      const { data } = await supabase
        .from('appointments')
        .select('requested_slot')
        .eq('id', id)
        .single();
      slot = data?.requested_slot;
    }

    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'CONFIRMED',
        confirmed_slot: slot,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        throw new Error('You already have a confirmed meeting at that exact time slot.');
      }
      throw error;
    }
  }

  static async acceptReschedule(id: number): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'CONFIRMED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  static async reject(id: number, mentorNotes?: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'REJECTED',
        mentor_notes: mentorNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  static async cancel(id: number): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  static async reschedule(id: number, newSlot: string, mentorNotes?: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'RESCHEDULED',
        confirmed_slot: newSlot,
        mentor_notes: mentorNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  static async complete(id: number): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'COMPLETED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  private static mapAppointment(raw: any): AppointmentModel {
    return {
      id: Number(raw.id),
      teamId: Number(raw.team_id),
      requestedBy: raw.requested_by,
      mentorId: raw.mentor_id,
      requestedSlot: raw.requested_slot,
      confirmedSlot: raw.confirmed_slot,
      status: raw.status as AppointmentStatus,
      agenda: raw.agenda || '',
      mentorNotes: raw.mentor_notes,
      queuePosition: raw.queue_position,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      teamName: raw.teams?.team_name,
    };
  }
}
