import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../services/auth";
import { useUser } from "../services/userContext";
import { Typography } from "@mui/material";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const { loading } = useUser();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (loading) {
    return <Typography sx={{ p: 2 }}>Loading...</Typography>;
  }

  return children;
}

export default ProtectedRoute;
