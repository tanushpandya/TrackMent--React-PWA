import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { TeamService } from '../services/team.service';
import { AuthService } from '../services/auth.service';
import { TeamModel, ProfileModel } from '../types';
import { useAuth } from './AuthContext';
import { fastCache } from '../utils/cache';

interface TeamContextType {
  team: TeamModel | null;
  members: ProfileModel[];
  mentor: ProfileModel | null;
  loading: boolean;
  refreshTeam: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isMentor } = useAuth();
  const userId = user?.id;

  // Instant pre-hydration from sessionStorage scoped to current user ID
  const [team, setTeam] = useState<TeamModel | null>(() => {
    if (!userId) return null;
    try {
      const stored = sessionStorage.getItem(`trackment_cached_team_${userId}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [members, setMembers] = useState<ProfileModel[]>(() => {
    if (!userId) return [];
    try {
      const stored = sessionStorage.getItem(`trackment_cached_members_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [mentor, setMentor] = useState<ProfileModel | null>(() => {
    if (!userId) return null;
    try {
      const stored = sessionStorage.getItem(`trackment_cached_mentor_${userId}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState<boolean>(() => !team);
  const isFirstFetch = useRef(true);
  const activeTeamRef = useRef<TeamModel | null>(team);
  activeTeamRef.current = team;

  const saveCache = useCallback((uid: string | undefined, t: TeamModel | null, m: ProfileModel[], men: ProfileModel | null) => {
    if (!uid) return;
    try {
      if (t) {
        sessionStorage.setItem(`trackment_cached_team_${uid}`, JSON.stringify(t));
        sessionStorage.setItem(`trackment_cached_members_${uid}`, JSON.stringify(m));
        sessionStorage.setItem(`trackment_cached_mentor_${uid}`, JSON.stringify(men));
      } else {
        sessionStorage.removeItem(`trackment_cached_team_${uid}`);
        sessionStorage.removeItem(`trackment_cached_members_${uid}`);
        sessionStorage.removeItem(`trackment_cached_mentor_${uid}`);
      }
    } catch (_) {}
  }, []);

  const loadTeamData = useCallback(async (isSilent = false) => {
    if (!userId || isMentor) {
      setTeam(null);
      setMembers([]);
      setMentor(null);
      setLoading(false);
      saveCache(userId, null, [], null);
      return;
    }

    try {
      // Only show full-screen skeleton if there is NO cached team available
      if (!isSilent && isFirstFetch.current && !activeTeamRef.current) {
        setLoading(true);
      }
      const myTeam = await TeamService.fetchMyTeam(userId);
      setTeam(myTeam);

      if (myTeam) {
        const [roster, mentorProfile] = await Promise.all([
          TeamService.fetchRoster(myTeam.id),
          myTeam.mentorId ? AuthService.loadProfile(myTeam.mentorId) : Promise.resolve(null),
        ]);
        setMembers(roster);
        setMentor(mentorProfile);
        saveCache(userId, myTeam, roster, mentorProfile);
      } else {
        setMembers([]);
        setMentor(null);
        saveCache(userId, null, [], null);
      }
    } catch (e) {
      console.error('Error loading team data:', e);
    } finally {
      isFirstFetch.current = false;
      setLoading(false);
    }
  }, [userId, isMentor, saveCache]);

  useEffect(() => {
    if (!userId) {
      setTeam(null);
      setMembers([]);
      setMentor(null);
      setLoading(false);
      isFirstFetch.current = true;
    } else {
      loadTeamData(false);
    }
  }, [userId, loadTeamData]);

  // Realtime updates subscription (runs silently without UI unmount)
  useEffect(() => {
    if (!userId || isMentor) return;

    let debounceTimer: any = null;
    const handleRealtimeChange = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fastCache.invalidate(`my_team_${userId}`);
        if (activeTeamRef.current?.id) {
          fastCache.invalidate(`roster_${activeTeamRef.current.id}`);
        }
        fastCache.invalidate('team_');
        loadTeamData(true);
      }, 300);
    };

    const channelName = `realtime:team_context_${userId}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, handleRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, handleRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_transfer_requests' }, handleRealtimeChange)
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [userId, isMentor, loadTeamData]);

  const refreshTeam = useCallback(async () => {
    if (userId) {
      fastCache.invalidate(`my_team_${userId}`);
      if (activeTeamRef.current?.id) {
        fastCache.invalidate(`roster_${activeTeamRef.current.id}`);
      }
    }
    await loadTeamData(false);
  }, [userId, loadTeamData]);

  const contextValue = useMemo<TeamContextType>(
    () => ({
      team,
      members,
      mentor,
      loading,
      refreshTeam,
    }),
    [team, members, mentor, loading, refreshTeam]
  );

  return (
    <TeamContext.Provider value={contextValue}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) throw new Error('useTeam must be used within TeamProvider');
  return context;
};
