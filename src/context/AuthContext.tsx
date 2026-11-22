import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { AuthService } from '../services/auth.service';
import { fastCache } from '../utils/cache';
import { ProfileModel, Role } from '../types';

export type AuthStatus = 'loading' | 'newUser' | 'ready' | 'guest' | 'error';

interface AuthContextType {
  status: AuthStatus;
  user: User | null;
  profile: ProfileModel | null;
  isMentor: boolean;
  isLead: boolean;
  isStudent: boolean;
  role: Role | null;
  authError?: string | null;
  signInWithPassword: (email: string, pass: string) => Promise<ProfileModel | null>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  retryAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileModel | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // References to prevent unnecessary re-renders on tab switch / visibility changes
  const activeUserRef = useRef<User | null>(null);
  const activeProfileRef = useRef<ProfileModel | null>(null);
  activeUserRef.current = user;
  activeProfileRef.current = profile;

  const resolveSession = useCallback(async (currentUser: User | null) => {
    setAuthError(null);
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
      // If prof is null without throwing error, user has no profile row yet
      setProfile(null);
      setStatus('newUser');
    } catch (e: any) {
      console.error('Error loading profile (backend/network failure):', e);
      // QA-004 Fix: Do NOT send existing user to onboarding form on network failure!
      setAuthError(e?.message || 'Network connection failed. Unable to verify user profile.');
      setStatus('error');
    }
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

  const retryAuth = useCallback(async () => {
    setStatus('loading');
    setAuthError(null);
    const { data: { session } } = await supabase.auth.getSession();
    await resolveSession(session?.user || null);
  }, [resolveSession]);

  const signOut = useCallback(async () => {
    fastCache.clearAll();
    await AuthService.signOut();
    setUser(null);
    setProfile(null);
    setStatus('guest');
  }, []);

  const role = profile?.role || null;
  const isMentor = role === 'MENTOR';
  const isLead = role === 'TEAM_LEAD';
  const isStudent = role === 'STUDENT';

  const contextValue = useMemo<AuthContextType>(
    () => ({
      status,
      user,
      profile,
      isMentor,
      isLead,
      isStudent,
      role,
      authError,
      signInWithPassword,
      refreshProfile,
      signOut,
      retryAuth,
    }),
    [
      status,
      user,
      profile,
      isMentor,
      isLead,
      isStudent,
      role,
      authError,
      signInWithPassword,
      refreshProfile,
      signOut,
      retryAuth,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
