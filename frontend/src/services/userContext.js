import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isAuthenticated, logout } from "./auth";
import { getMe } from "./api";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(isAuthenticated()));

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
    if (!isAuthenticated()) {
      setLoading(false);
      setUser(null);
      return;
    }

    if (!user && !loading) {
      refreshUser().catch(() => {});
    }
  }, [loading, refreshUser, user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      refreshUser,
      clearUser,
      organization: user?.organization || null,
      role: user?.role || null,
      isVendor: user?.vendor_profile !== undefined && user?.vendor_profile !== null,
      isTenant: user?.role === "tenant",
      isLandlord: user?.role === "landlord",
      isOrgAdmin: Boolean(user?.is_org_admin),
      orgMaxUnits: user?.organization?.max_units,
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
