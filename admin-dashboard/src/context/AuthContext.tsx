import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  schoolId: string;
  userType: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try to get user profile from server using httpOnly cookie
        const response = await api.get('/auth/me');
        if (response.data?.data) {
          setUser(response.data.data);
        }
      } catch (error) {
        // Not authenticated - no valid cookie
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      const response = await api.post('/auth/login', { identifier, password });

      if (response.status === 200) {
        const data = response.data.data;
        const userData: User = {
          id: data.user.id,
          name: data.user.name,
          phone: data.user.phone,
          email: data.user.email,
          schoolId: data.user.schoolId,
          userType: data.user.userType,
        };

        setUser(userData);
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || 'Login failed';
      if (msg.includes('not found') || msg.includes('No account')) {
        return { success: false, error: 'No account found with this email or phone number.' };
      }
      if (msg.includes('Invalid credentials')) {
        return { success: false, error: 'Invalid email/phone or password.' };
      }
      if (msg.includes('not activated')) {
        return { success: false, error: 'Account not activated. Please contact your school admin.' };
      }
      if (msg.includes('locked')) {
        return { success: false, error: 'Account temporarily locked due to too many failed attempts.' };
      }
      return { success: false, error: 'Login failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore errors - clear state anyway
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
