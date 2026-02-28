import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { login as loginApi, getMe, setToken, clearToken, TOKEN_KEY, type ApiUser } from "@/services/authService";

interface AuthContextValue {
  user: ApiUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const refreshUser = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      clearToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token, user: u } = await loginApi(email, password);
      setToken(token);
      setUser(u);
      navigate(u.role === "Site Manager" ? "/projects" : "/");
    },
    [navigate]
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    navigate("/login");
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
