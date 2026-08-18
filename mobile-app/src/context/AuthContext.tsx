import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { saveToken, getToken, removeToken } from '../services/storage/authStorage';
import { loginApi, registerApi, getProfileApi } from '../services/api/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isColdStartNotice: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  isColdStartNotice: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isColdStartNotice, setIsColdStartNotice] = useState<boolean>(false);

  const refreshProfile = async () => {
    try {
      const activeToken = await getToken();
      if (activeToken) {
        const userData = await getProfileApi();
        setUser(userData);
      }
    } catch (error: any) {
      if (error?.isColdStart) {
        setIsColdStartNotice(true);
      }
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await getToken();
        if (storedToken) {
          setTokenState(storedToken);
          const userData = await getProfileApi();
          setUser(userData);
        }
      } catch (error: any) {
        if (error?.isColdStart) {
          setIsColdStartNotice(true);
        }
        await removeToken();
        setTokenState(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsColdStartNotice(false);
    try {
      const res = await loginApi(email, pass);
      await saveToken(res.token);
      setTokenState(res.token);
      setUser(res.user);
    } catch (error: any) {
      if (error?.isColdStart) {
        setIsColdStartNotice(true);
      }
      throw error;
    }
  };

  const register = async (name: string, email: string, pass: string) => {
    setIsColdStartNotice(false);
    try {
      const res = await registerApi(name, email, pass);
      await saveToken(res.token);
      setTokenState(res.token);
      setUser(res.user);
    } catch (error: any) {
      if (error?.isColdStart) {
        setIsColdStartNotice(true);
      }
      throw error;
    }
  };

  const logout = async () => {
    await removeToken();
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isColdStartNotice,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
