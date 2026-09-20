import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { initialUser } from '../services/mockData';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBackendConnected: boolean;
  dbBackendInfo: string;
  loginWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithPassword: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => Promise<void>;
  toggleDemoMode: () => void;
  refreshBackendStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('resr_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [dbBackendInfo, setDbBackendInfo] = useState<string>('Overujem Supabase...');

  const refreshBackendStatus = async () => {
    const health = await api.checkHealth();
    setIsBackendConnected(health.isConnected);
    setDbBackendInfo(health.message);
  };

  // Sync Supabase Auth session on mount and listen to auth changes
  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          const profile: UserProfile = {
            id: 'user_demo_landlord', // map to portfolio user id for full portfolio access
            email: session.user.email || 'admin@resr.sk',
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Správca',
            role: 'landlord',
          };
          setUser(profile);
          api.setUserId(profile.id);
          localStorage.setItem('resr_current_user', JSON.stringify(profile));
        } else if (!session && mounted) {
          // If no active supabase session and not demo user
          const saved = localStorage.getItem('resr_current_user');
          if (saved) {
            const parsed = JSON.parse(saved);
            setUser(parsed);
            api.setUserId(parsed.id);
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Error fetching Supabase session:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const profile: UserProfile = {
          id: 'user_demo_landlord',
          email: session.user.email || 'admin@resr.sk',
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Správca',
          role: 'landlord',
        };
        setUser(profile);
        api.setUserId(profile.id);
        localStorage.setItem('resr_current_user', JSON.stringify(profile));
      } else {
        // If explicitly logged out
        const saved = localStorage.getItem('resr_current_user');
        if (!saved) {
          setUser(null);
        }
      }
      setIsLoading(false);
    });

    refreshBackendStatus();
    const interval = setInterval(refreshBackendStatus, 15000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loginWithPassword = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const profile: UserProfile = {
          id: 'user_demo_landlord',
          email: data.user.email || email,
          name: data.user.user_metadata?.full_name || email.split('@')[0],
          role: 'landlord',
        };
        setUser(profile);
        api.setUserId(profile.id);
        localStorage.setItem('resr_current_user', JSON.stringify(profile));
        return { success: true };
      }

      return { success: false, error: 'Nepodarilo sa overiť používateľa' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Nastala neočakávaná chyba pri prihlasovaní' };
    }
  };

  const signUpWithPassword = async (
    email: string,
    password: string,
    name?: string
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name || email.split('@')[0],
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session) {
        // Logged in immediately (email confirmation disabled or auto-confirmed)
        const profile: UserProfile = {
          id: 'user_demo_landlord',
          email: data.user?.email || email,
          name: name || email.split('@')[0],
          role: 'landlord',
        };
        setUser(profile);
        api.setUserId(profile.id);
        localStorage.setItem('resr_current_user', JSON.stringify(profile));
        return { success: true };
      }

      return {
        success: true,
        message: 'Účet bol vytvorený! Ak je zapnuté overenie emailu, skontrolujte si doručenú poštu.',
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Chyba pri vytváraní účtu' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut error:', err);
    }
    setUser(null);
    localStorage.removeItem('resr_current_user');
  };

  const toggleDemoMode = () => {
    setUser(initialUser);
    api.setUserId(initialUser.id);
    localStorage.setItem('resr_current_user', JSON.stringify(initialUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isBackendConnected,
        dbBackendInfo,
        loginWithPassword,
        signUpWithPassword,
        logout,
        toggleDemoMode,
        refreshBackendStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
