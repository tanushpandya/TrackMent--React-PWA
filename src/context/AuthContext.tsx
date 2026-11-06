import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileModel | null>(null);

  const resolveSession = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setUser(null);
      setProfile(null);
      setStatus('guest');
      return;
    }

    setUser(currentUser);

    // First, check if user has an existing profile in the database
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

    // If no existing profile, check domain compliance before onboarding
    if (currentUser.email && !AuthService.isAllowedEmail(currentUser.email)) {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setStatus('guest');
      return;
    }

    setProfile(null);
    setStatus('newUser');
  }, []);

  useEffect(() => {
    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveSession(session?.user || null);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveSession(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [resolveSession]);

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
