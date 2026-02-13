import { useMemo, useState } from "react";
import { useThemeMode } from "../services/themeContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Paper, TextField, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { login } from "../services/auth";
import { useUser } from "../services/userContext";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useThemeMode();
  const theme = useTheme();
  const { refreshUser } = useUser();
  const [values, setValues] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      await login(values.username.trim(), values.password);
      await refreshUser();
      navigate("/", { replace: true });
    } catch (requestError) {
      setError("Invalid username or password.");
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
          boxShadow:
            mode === "dark" ? "none" : `0 6px 24px ${alpha(theme.palette.text.primary, 0.12)}`,
          border: mode === "dark" ? undefined : "none",
        }}
      >
        <Typography
          variant="body1"
          sx={{
            mb: 2,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            textAlign: "center",
            color: "text.primary",
          }}
        >
          Onyx PM
        </Typography>
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
        <Button type="submit" variant="contained" fullWidth disabled={submitting} size="small">
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
