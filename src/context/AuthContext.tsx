import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AccountType, AdminAccount, Student } from '../types';
import { api, getAuthToken, setAuthToken } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  accountType: AccountType | null;
  user: AdminAccount | null;
  student: Omit<Student, 'password'> | null;
  login: (
    loginInput: string,
    passwordInput: string,
    mode?: 'auto' | AccountType
  ) => Promise<{ ok: boolean; accountType?: AccountType; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [user, setUser] = useState<AdminAccount | null>(null);
  const [student, setStudent] = useState<Omit<Student, 'password'> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setAccountType(null);
      setUser(null);
      setStudent(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.me();
      if (res.accountType === 'admin') {
        setAccountType('admin');
        setUser(res.user);
        setStudent(null);
      } else {
        setAccountType('student');
        setStudent(res.student);
        setUser(null);
      }
    } catch {
      setAuthToken(null);
      setAccountType(null);
      setUser(null);
      setStudent(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (
    loginInput: string,
    passwordInput: string,
    mode: 'auto' | AccountType = 'auto'
  ): Promise<{ ok: boolean; accountType?: AccountType; error?: string }> => {
    try {
      const res = await api.login(loginInput, passwordInput, mode);
      setAuthToken(res.token);
      if (res.accountType === 'admin') {
        setAccountType('admin');
        setUser(res.user);
        setStudent(null);
        return { ok: true, accountType: 'admin' };
      } else {
        setAccountType('student');
        setStudent(res.student);
        setUser(null);
        return { ok: true, accountType: 'student' };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kirishda xatolik yuz berdi';
      return { ok: false, error: msg };
    }
  };

  const logout = () => {
    setAuthToken(null);
    setAccountType(null);
    setUser(null);
    setStudent(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!(user || student),
        isLoading,
        accountType,
        user,
        student,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
