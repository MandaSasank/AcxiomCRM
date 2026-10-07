import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserDto, UserRole } from '../types/crm.ts';

interface AuthContextType {
  user: UserDto | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string, roleName?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('acxiom_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load current user profile on startup
  useEffect(() => {
    async function loadUser() {
      const savedToken = localStorage.getItem('acxiom_token');
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
          } else {
            localStorage.removeItem('acxiom_token');
            setToken(null);
          }
        } else {
          localStorage.removeItem('acxiom_token');
          setToken(null);
        }
      } catch (err) {
        console.error('Failed to verify session:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('acxiom_token', data.token);
        return { success: true };
      }
      return { success: false, message: data.message || 'Login failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  };

  const register = async (name: string, email: string, password: string, roleName?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, email, password, roleName }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // If not already logged in, automatically login as the newly registered user
        if (!user) {
          return await login(email, password);
        }
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Registration failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.warn('Logout API warning:', err);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('acxiom_token');
    }
  };

  // Convenient demo persona switcher
  const switchDemoRole = async (role: UserRole) => {
    let email = 'admin@acxiomcrm.com';
    let pass = 'Admin@1234';

    if (role === 'Manager') {
      email = 'manager@acxiomcrm.com';
      pass = 'Manager@1234';
    } else if (role === 'SalesExecutive') {
      email = 'sales@acxiomcrm.com';
      pass = 'Sales@1234';
    }

    await login(email, pass);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, switchDemoRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
