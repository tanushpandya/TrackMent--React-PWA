import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { AuthService } from '../services/auth.service';
import { ProfileModel, Role } from '../types';

export type AuthStatus = 'loading' | 'newUser' | 'ready' | 'guest';

interface AuthContextType {
  status: AuthStatus;
  user: User | null;
  profile: ProfileModel | null;
  isMentor: boolean;
  isLead: boolean;
  isStudent: boolean;
  role: Role | null;
  signInWithPassword: (email: string, pass: string) => Promise<ProfileModel | null>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileModel | null>(null);

  // References to prevent unnecessary re-renders on tab switch / visibility changes
  const activeUserRef = useRef<User | null>(null);
  const activeProfileRef = useRef<ProfileModel | null>(null);
  activeUserRef.current = user;
  activeProfileRef.current = profile;

  const resolveSession = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setUser(null);
      setProfile(null);
      setStatus('guest');
      return;
    }

    // Strict institutional domain enforcement: Only @rvce.edu.in accounts permitted
    if (currentUser.email && !AuthService.isAllowedEmail(currentUser.email)) {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setStatus('guest');
      return;
    }

    setUser(currentUser);

    // Check if user has an existing profile in the database
    try {
      const prof = await AuthService.loadProfile(currentUser.id);
      if (prof) {
        setProfile(prof);
        setStatus('ready');
        return;
      }
    } catch (e) {
      console.error('Error loading profile:', e);
    }

    setProfile(null);
    setStatus('newUser');
  }, []);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveSession(session?.user || null);
    });

    // Listen for auth state changes without triggering full unmounts on tab switch
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setProfile(null);
        setStatus('guest');
        return;
      }

      // If token refreshed or background ping for already active user:
      // Don't trigger full reload or unmount the current page
      if (
        (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') &&
        activeUserRef.current?.id === session.user.id &&
        activeProfileRef.current !== null
      ) {
        return;
      }

      await resolveSession(session.user);

      // Clean up OAuth fragment hash from address bar after successful authentication
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [resolveSession]);

  const signInWithPassword = useCallback(async (email: string, pass: string) => {
    const res = await AuthService.signInWithPassword(email, pass);
    setUser(res.user);
    setProfile(res.profile);
    setStatus(res.profile ? 'ready' : 'newUser');
    return res.profile;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const prof = await AuthService.loadProfile(user.id);
      setProfile(prof);
      setStatus(prof ? 'ready' : 'newUser');
    } catch (e) {
      console.error('Error refreshing profile:', e);
    }
  }, [user]);

  const signOut = useCallback(async () => {
    await AuthService.signOut();
    setUser(null);
    setProfile(null);
    setStatus('guest');
  }, []);

  const role = profile?.role || null;
  const isMentor = role === 'MENTOR';
  const isLead = role === 'TEAM_LEAD';
  const isStudent = role === 'STUDENT';

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        profile,
        isMentor,
        isLead,
        isStudent,
        role,
        signInWithPassword,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
