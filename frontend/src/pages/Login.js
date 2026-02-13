import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";
import { login } from "../services/auth";
import { useUser } from "../services/userContext";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
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
        background: "#0a0a0a",
      }}
    >
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{ width: "100%", maxWidth: 420, p: 3, borderRadius: 1, bgcolor: "#141414" }}
      >
        <Typography
          variant="body1"
          sx={{
            mb: 2,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            textAlign: "center",
            color: "#fff",
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
          <Link to="/register" style={{ color: "#7c5cfc", fontWeight: 500 }}>
            Register
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}

export default Login;
