import { useMemo, useState } from "react";
import { useThemeMode } from "../services/themeContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Paper, TextField, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { login } from "../services/auth";
import { useUser } from "../services/userContext";

function BrandLogo({ textColor, loginSuccess }) {
  const onyxSize = 28;
  const pmFontSize = Math.round(onyxSize * 0.7);
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        transition: "filter 0.3s ease",
        ...(loginSuccess && {
          animation: "loginShake 0.6s ease-in-out",
          filter: "drop-shadow(0 0 30px rgba(39, 202, 64, 0.8)) drop-shadow(0 0 60px rgba(39, 202, 64, 0.4)) brightness(1.2)",
        }),
      }}
    >
      <img
        src="/logo-icon.png"
        alt="Onyx PM"
        style={{
          height: 40,
          width: "auto",
          display: "block",
          background: "transparent",
          filter: "brightness(1.1)",
          mixBlendMode: "screen",
        }}
      />
      <Typography
        sx={{
          fontSize: onyxSize,
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: textColor,
          lineHeight: 1,
        }}
      >
        ONYX
      </Typography>
      <Box
        component="span"
        sx={{
          backgroundColor: "rgba(124,92,252,0.15)",
          color: "#7c5cfc",
          px: "10px",
          py: "3px",
          borderRadius: "6px",
          fontFamily: "'Syne', sans-serif",
          fontWeight: 600,
          letterSpacing: "0.05em",
          fontSize: `${pmFontSize}px`,
          textTransform: "uppercase",
          lineHeight: 1.4,
        }}
      >
        PM
      </Box>
    </Box>
  );
}

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useThemeMode();
  const theme = useTheme();
  const { refreshUser } = useUser();
  const [values, setValues] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const successMessage = useMemo(() => location.state?.message || "", [location.state]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!values.username.trim() || !values.password) {
      setError("Username and password are required.");
      return;
    }
    try {
      setSubmitting(true);
      setLoginSuccess(false);

      await login(values.username.trim(), values.password);
      const refreshedUser = await refreshUser();
      const shouldWelcome = Boolean(location.state?.showWelcome) && refreshedUser?.role === "landlord";
      const from = location.state?.from?.pathname;
      const nextPath = shouldWelcome ? "/welcome" : from && from !== "/welcome" ? from : "/dashboard";

      setLoginSuccess(true);
      setTimeout(() => {
        navigate(nextPath, { replace: true });
      }, 1200);
    } catch (requestError) {
      setError("Invalid username or password.");
      setLoginSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        bgcolor: "background.default",
        "@keyframes loginShake": {
          "0%, 100%": { transform: "translateX(0) rotate(0deg)" },
          "10%": { transform: "translateX(-4px) rotate(-3deg)" },
          "20%": { transform: "translateX(4px) rotate(3deg)" },
          "30%": { transform: "translateX(-4px) rotate(-2deg)" },
          "40%": { transform: "translateX(4px) rotate(2deg)" },
          "50%": { transform: "translateX(-2px) rotate(-1deg)" },
          "60%": { transform: "translateX(2px) rotate(1deg)" },
          "70%, 100%": { transform: "translateX(0) rotate(0deg)" },
        },
      }}
    >
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: 3,
          borderRadius: 1,
          bgcolor: "background.paper",
          transition: "all 0.3s ease",
          boxShadow:
            mode === "dark" ? "none" : `0 6px 24px ${alpha(theme.palette.text.primary, 0.12)}`,
          border: mode === "dark" ? undefined : "none",
        }}
      >
        <Box sx={{ mb: 1.8 }}>
          <Link
            to="/"
            style={{
              color: mode === "dark" ? theme.palette.text.secondary : "#6b7280",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {"\u2190"} Back to home
          </Link>
        </Box>
        <Box sx={{ mb: 2 }}>
          <BrandLogo textColor={mode === "dark" ? "#fff" : "#111827"} loginSuccess={loginSuccess} />
        </Box>
        {successMessage ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        ) : null}
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        <TextField
          label="Username"
          value={values.username}
          onChange={(event) => setValues((prev) => ({ ...prev, username: event.target.value }))}
          fullWidth
          required
          sx={{ mb: 1.6 }}
        />
        <TextField
          label="Password"
          type="password"
          value={values.password}
          onChange={(event) => setValues((prev) => ({ ...prev, password: event.target.value }))}
          fullWidth
          required
          sx={{ mb: 1.8 }}
        />
        <Button type="submit" variant="contained" fullWidth disabled={submitting || loginSuccess} size="small">
          Sign In
        </Button>
        <Typography sx={{ textAlign: "center", mt: 1.5, fontSize: 12, color: "text.secondary" }}>
          Don&apos;t have an account?{" "}
          <Link to="/register" style={{ color: theme.palette.primary.main, fontWeight: 500 }}>
            Register
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}

export default Login;
