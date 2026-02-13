import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { isAuthenticated } from "../services/auth";
import { useUser } from "../services/userContext";
import { getProperties } from "../services/api";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const { user, loading } = useUser();
  const [propertyCount, setPropertyCount] = useState(null);
  const [countLoading, setCountLoading] = useState(false);
  const organizationId = user?.organization?.id;
  const isLandingOnWelcome = location.pathname === "/welcome";

  useEffect(() => {
    if (loading || !user) {
      setPropertyCount(null);
      setCountLoading(false);
      return;
    }

    const isOrgAdminLandlord = user.role === "landlord" && Boolean(user.is_org_admin);
    if (!isOrgAdminLandlord) {
      setPropertyCount(null);
      setCountLoading(false);
      return;
    }

    let cancelled = false;
    setCountLoading(true);

    getProperties()
      .then((response) => {
        if (cancelled) {
          return;
        }
        const payload = response?.data;
        let count = 0;
        if (Array.isArray(payload)) {
          count = payload.length;
        } else if (Array.isArray(payload?.results)) {
          count = payload.results.length;
        } else if (typeof payload?.count === "number") {
          count = payload.count;
        }
        setPropertyCount(count);
      })
      .catch(() => {
        if (!cancelled) {
          setPropertyCount(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCountLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loading, user, organizationId, location.pathname]);

  const isLandlordWithNoProperties =
    user?.role === "landlord" &&
    Boolean(user?.is_org_admin) &&
    Number.isFinite(propertyCount) &&
    propertyCount === 0;

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (loading || countLoading) {
    return (
      <Box sx={{ p: 2, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "30vh" }}>
        <CircularProgress size={22} />
      </Box>
    );
  }

  if (isLandlordWithNoProperties && !isLandingOnWelcome) {
    return <Navigate to="/welcome" replace />;
  }

  if (!isLandlordWithNoProperties && isLandingOnWelcome) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
