import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api, { setAuthToken } from '../services/api';

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
    // Token is in memory only - session survives React re-renders but not page refresh
    // This is by design for XSS protection
    setIsLoading(false);
  }, []);

  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      const response = await api.post('/auth/login', { identifier, password });

      const data = response.data.data;
      const token = data.token;
      const userData: User = {
        id: data.user.id,
        name: data.user.name,
        phone: data.user.phone,
        email: data.user.email,
        schoolId: data.user.schoolId,
        userType: data.user.userType,
      };

      setAuthToken(token);
      setUser(userData);

      return { success: true };
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
      return { success: false, error: msg || 'Login failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAuthToken(null);
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
