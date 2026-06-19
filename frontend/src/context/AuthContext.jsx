import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On load, ask the server who we are. The session lives in an httpOnly cookie,
  // so a valid cookie resolves the user; otherwise /me returns 401 and we stay
  // logged out.
  useEffect(() => {
    async function bootstrap() {
      try {
        setUser(await api("/api/auth/me"));
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  async function login(email, password) {
    // The server sets the httpOnly session cookie and returns the user.
    const me = await api("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setUser(me);
  }

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      // Even if the revoke call fails, drop the local session.
    }
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
