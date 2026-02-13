import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isAuthenticated, logout } from "./auth";
import { getMe } from "./api";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const clearUser = useCallback(() => {
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated()) {
      setUser(null);
      return null;
    }
    setLoading(true);
    try {
      const response = await getMe();
      setUser(response.data || null);
      return response.data || null;
    } catch (error) {
      logout();
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated() && !user) {
      refreshUser().catch(() => {});
    }
  }, [refreshUser, user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      refreshUser,
      clearUser,
      role: user?.role || null,
      isTenant: user?.role === "tenant",
      isLandlord: user?.role === "landlord",
    }),
    [clearUser, loading, refreshUser, user]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider.");
  }
  return context;
}

