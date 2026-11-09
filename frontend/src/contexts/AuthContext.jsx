import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("legal-portal-token")));
  useEffect(() => {
    if (!localStorage.getItem("legal-portal-token")) return;
    api.get("/auth/me").then(({ user: current }) => setUser(current)).catch(() => {
      localStorage.removeItem("legal-portal-token");
    }).finally(() => setLoading(false));
  }, []);
  const value = useMemo(() => ({
    user,
    loading,
    async login(email, password) {
      const result = await api.post("/auth/login", { email, password });
      localStorage.setItem("legal-portal-token", result.token);
      setUser(result.user);
    },
    logout() {
      localStorage.removeItem("legal-portal-token");
      setUser(null);
    }
  }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
