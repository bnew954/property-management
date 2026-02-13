import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Grid, Paper, TextField, Typography } from "@mui/material";
import { register } from "../services/auth";

function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const required = ["username", "email", "first_name", "last_name", "password"];
    for (const key of required) {
      if (!String(values[key] || "").trim()) {
        setError("Please complete all required fields.");
        return;
      }
    }

    if (values.password !== values.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      await register({
        username: values.username.trim(),
        email: values.email.trim(),
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        password: values.password,
      });
      navigate("/login", {
        replace: true,
        state: { message: "Registration successful. Please sign in." },
      });
    } catch (error) {
      console.log("Register error:", error.response?.status, error.response?.data);
      setError(JSON.stringify(error.response?.data));
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
        sx={{ width: "100%", maxWidth: 500, p: 4, borderRadius: 3, bgcolor: "#111827" }}
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
          Create your account
        </Typography>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        <Grid container spacing={1.8}>
          <Grid item xs={12} md={6}>
            <TextField
              label="First Name"
              value={values.first_name}
              onChange={(event) => setValues((prev) => ({ ...prev, first_name: event.target.value }))}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Last Name"
              value={values.last_name}
              onChange={(event) => setValues((prev) => ({ ...prev, last_name: event.target.value }))}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Username"
              value={values.username}
              onChange={(event) => setValues((prev) => ({ ...prev, username: event.target.value }))}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Email"
              type="email"
              value={values.email}
              onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Password"
              type="password"
              value={values.password}
              onChange={(event) => setValues((prev) => ({ ...prev, password: event.target.value }))}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Confirm Password"
              type="password"
              value={values.confirm_password}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, confirm_password: event.target.value }))
              }
              fullWidth
              required
            />
          </Grid>
        </Grid>
        <Button type="submit" variant="contained" fullWidth disabled={submitting} sx={{ mt: 2.5 }}>
          Register
        </Button>
        <Typography variant="body2" sx={{ textAlign: "center", mt: 2, color: "text.secondary" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#38bdf8", fontWeight: 600 }}>
            Sign In
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}

export default Register;
