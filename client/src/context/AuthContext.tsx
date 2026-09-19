import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { initialUser } from '../services/mockData';
import { api } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isBackendConnected: boolean;
  dbBackendInfo: string;
  login: (email: string) => Promise<void>;
  register: (name: string, email: string) => Promise<void>;
  logout: () => void;
  toggleDemoMode: () => void;
  refreshBackendStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('resr_current_user') || localStorage.getItem('hearthstone_current_user');
    return saved ? JSON.parse(saved) : initialUser;
  });

  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [dbBackendInfo, setDbBackendInfo] = useState<string>('Checking PostgreSQL...');

  const refreshBackendStatus = async () => {
    const health = await api.checkHealth();
    setIsBackendConnected(health.isConnected);
    setDbBackendInfo(health.message);
  };

  useEffect(() => {
    if (user?.id) {
      api.setUserId(user.id);
      localStorage.setItem('resr_current_user', JSON.stringify(user));
    }
    refreshBackendStatus();
    const interval = setInterval(refreshBackendStatus, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const login = async (email: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return;
      }
    } catch {
      // Fallback
    }
    const newUser: UserProfile = {
      id: 'user_' + Date.now(),
      email,
      name: email.split('@')[0],
      role: 'landlord',
    };
    setUser(newUser);
  };

  const register = async (name: string, email: string) => {
    await login(email);
    setUser(prev => prev ? { ...prev, name } : null);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('resr_current_user');
    localStorage.removeItem('hearthstone_current_user');
  };

  const toggleDemoMode = () => {
    setUser(initialUser);
    api.setUserId(initialUser.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isBackendConnected,
        dbBackendInfo,
        login,
        register,
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
