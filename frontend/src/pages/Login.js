import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";
import { login } from "../services/auth";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
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
        background: "radial-gradient(circle at top, #1f2a44 0%, #0a0e1a 60%)",
      }}
    >
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{ width: "100%", maxWidth: 420, p: 4, borderRadius: 3, bgcolor: "#111827" }}
      >
        <Typography
          variant="h4"
          sx={{
            mb: 0.7,
            fontWeight: 800,
            textAlign: "center",
            background: "linear-gradient(90deg, #38bdf8 0%, #6366f1 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          CloudProp
        </Typography>
        <Typography variant="body2" sx={{ textAlign: "center", color: "text.secondary", mb: 3 }}>
          Sign in to continue
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
          sx={{ mb: 2 }}
        />
        <TextField
          label="Password"
          type="password"
          value={values.password}
          onChange={(event) => setValues((prev) => ({ ...prev, password: event.target.value }))}
          fullWidth
          required
          sx={{ mb: 2.5 }}
        />
        <Button type="submit" variant="contained" fullWidth disabled={submitting}>
          Sign In
        </Button>
        <Typography variant="body2" sx={{ textAlign: "center", mt: 2, color: "text.secondary" }}>
          Don&apos;t have an account?{" "}
          <Link to="/register" style={{ color: "#38bdf8", fontWeight: 600 }}>
            Register
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}

export default Login;
