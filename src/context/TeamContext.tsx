import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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

  // Instant pre-hydration from sessionStorage: eliminates the 500ms initial wait waterfall
  const [team, setTeam] = useState<TeamModel | null>(() => {
    try {
      const stored = sessionStorage.getItem('trackment_cached_team');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [members, setMembers] = useState<ProfileModel[]>(() => {
    try {
      const stored = sessionStorage.getItem('trackment_cached_members');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [mentor, setMentor] = useState<ProfileModel | null>(() => {
    try {
      const stored = sessionStorage.getItem('trackment_cached_mentor');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState<boolean>(() => !team);
  const isFirstFetch = useRef(true);

  const saveCache = (t: TeamModel | null, m: ProfileModel[], men: ProfileModel | null) => {
    try {
      if (t) {
        sessionStorage.setItem('trackment_cached_team', JSON.stringify(t));
        sessionStorage.setItem('trackment_cached_members', JSON.stringify(m));
        sessionStorage.setItem('trackment_cached_mentor', JSON.stringify(men));
      } else {
        sessionStorage.removeItem('trackment_cached_team');
        sessionStorage.removeItem('trackment_cached_members');
        sessionStorage.removeItem('trackment_cached_mentor');
      }
    } catch (_) {}
  };

  const loadTeamData = useCallback(async (isSilent = false) => {
    if (!user || isMentor) {
      setTeam(null);
      setMembers([]);
      setMentor(null);
      setLoading(false);
      saveCache(null, [], null);
      return;
    }

    try {
      // Only show full-screen skeleton if there is NO cached team available
      if (!isSilent && isFirstFetch.current && !team) {
        setLoading(true);
      }
      const myTeam = await TeamService.fetchMyTeam(user.id);
      setTeam(myTeam);

      if (myTeam) {
        const [roster, mentorProfile] = await Promise.all([
          TeamService.fetchRoster(myTeam.id),
          myTeam.mentorId ? AuthService.loadProfile(myTeam.mentorId) : Promise.resolve(null),
        ]);
        setMembers(roster);
        setMentor(mentorProfile);
        saveCache(myTeam, roster, mentorProfile);
      } else {
        setMembers([]);
        setMentor(null);
        saveCache(null, [], null);
      }
    } catch (e) {
      console.error('Error loading team data:', e);
    } finally {
      isFirstFetch.current = false;
      setLoading(false);
    }
  }, [user?.id, isMentor, team]);

  useEffect(() => {
    loadTeamData(false);
  }, [loadTeamData]);

  // Realtime updates subscription (runs silently without UI unmount)
  const currentUserId = user?.id;
  useEffect(() => {
    if (!currentUserId || isMentor) return;

    const channelName = `realtime:team_context_${currentUserId}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        loadTeamData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        loadTeamData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_transfer_requests' }, () => {
        loadTeamData(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, isMentor, loadTeamData]);

  return (
    <TeamContext.Provider
      value={{
        team,
        members,
        mentor,
        loading,
        refreshTeam: () => loadTeamData(false),
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
