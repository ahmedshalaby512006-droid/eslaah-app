import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api/client';

export type UserRole = 'CUSTOMER' | 'TECHNICIAN' | 'ENGINEER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRole;
  isBanned?: boolean;
  technicianProfile?: any;
}

export interface LoginPayload {
  phoneNumber: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: UserRole;
}

interface AuthResponse {
  accessToken: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: LoginPayload) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      try {
        const parsedUser: User = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        
        // Verify user against backend silently
        api.get('/auth/me').then(res => {
          if (res.data) {
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
          }
        }).catch(err => {
          if (err.response?.status === 403) {
            // User is banned or invalid
            const bannedUser = { ...parsedUser, isBanned: true };
            setUser(bannedUser);
            localStorage.setItem('user', JSON.stringify(bannedUser));
          }
        });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    localStorage.removeItem('active_tech_job');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginPayload): Promise<void> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    const { accessToken, user: authenticatedUser } = response.data;

    setToken(accessToken);
    setUser(authenticatedUser);
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(authenticatedUser));
  };

  const register = async (userData: RegisterPayload): Promise<void> => {
    await api.post('/auth/register', userData);
  };

  const updateUser = (updatedUser: User): void => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };
  const logout = async (): Promise<void> => {
    try {
      if (token) await api.post('/auth/logout');
    } catch (err) {}
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (token) {
      // initial ping
      api.post('/auth/ping').catch(() => {});
      // ping every 30 seconds
      interval = setInterval(() => {
        api.post('/auth/ping').catch(() => {});
      }, 60000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token]);
  
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
          updateUser,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};