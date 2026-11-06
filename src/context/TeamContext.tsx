import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { TeamService } from '../services/team.service';
import { AuthService } from '../services/auth.service';
import { TeamModel, ProfileModel } from '../types';
import { useAuth } from './AuthContext';

interface TeamContextType {
  team: TeamModel | null;
  members: ProfileModel[];
  mentor: ProfileModel | null;
  loading: boolean;
  refreshTeam: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, isMentor } = useAuth();
  const [team, setTeam] = useState<TeamModel | null>(null);
  const [members, setMembers] = useState<ProfileModel[]>([]);
  const [mentor, setMentor] = useState<ProfileModel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadTeamData = useCallback(async () => {
    if (!user || isMentor) {
      setTeam(null);
      setMembers([]);
      setMentor(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const myTeam = await TeamService.fetchMyTeam(user.id);
      setTeam(myTeam);

      if (myTeam) {
        const [roster, mentorProfile] = await Promise.all([
          TeamService.fetchRoster(myTeam.id),
          myTeam.mentorId ? AuthService.loadProfile(myTeam.mentorId) : Promise.resolve(null),
        ]);
        setMembers(roster);
        setMentor(mentorProfile);
      } else {
        setMembers([]);
        setMentor(null);
      }
    } catch (e) {
      console.error('Error loading team data:', e);
    } finally {
      setLoading(false);
    }
  }, [user, isMentor]);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  // Realtime updates subscription
  useEffect(() => {
    if (!user || isMentor) return;

    const channelName = `realtime:team_context_${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        loadTeamData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        loadTeamData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_transfer_requests' }, () => {
        loadTeamData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isMentor, loadTeamData]);

  return (
    <TeamContext.Provider
      value={{
        team,
        members,
        mentor,
        loading,
        refreshTeam: loadTeamData,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) throw new Error('useTeam must be used within TeamProvider');
  return context;
};
