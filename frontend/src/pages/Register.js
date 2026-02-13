import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";
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
        background: "#0a0a0a",
      }}
    >
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{ width: "100%", maxWidth: 500, p: 3, borderRadius: 1, bgcolor: "#141414" }}
      >
        <Typography
          variant="body1"
          sx={{
            mb: 0.5,
            fontSize: 15,
            fontWeight: 600,
            textAlign: "center",
            color: "#fff",
          }}
        >
          CloudProp
        </Typography>
        <Typography sx={{ textAlign: "center", fontSize: 12, color: "text.secondary", mb: 2 }}>
          Create your account
        </Typography>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.4 }}>
          <Box>
            <TextField
              label="First Name"
              value={values.first_name}
              onChange={(event) => setValues((prev) => ({ ...prev, first_name: event.target.value }))}
              fullWidth
              required
            />
          </Box>
          <Box>
            <TextField
              label="Last Name"
              value={values.last_name}
              onChange={(event) => setValues((prev) => ({ ...prev, last_name: event.target.value }))}
              fullWidth
              required
            />
          </Box>
          <Box sx={{ gridColumn: "1 / -1" }}>
            <TextField
              label="Username"
              value={values.username}
              onChange={(event) => setValues((prev) => ({ ...prev, username: event.target.value }))}
              fullWidth
              required
            />
          </Box>
          <Box sx={{ gridColumn: "1 / -1" }}>
            <TextField
              label="Email"
              type="email"
              value={values.email}
              onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))}
              fullWidth
              required
            />
          </Box>
          <Box sx={{ gridColumn: "1 / -1" }}>
            <TextField
              label="Password"
              type="password"
              value={values.password}
              onChange={(event) => setValues((prev) => ({ ...prev, password: event.target.value }))}
              fullWidth
              required
            />
          </Box>
          <Box sx={{ gridColumn: "1 / -1" }}>
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
          </Box>
        </Box>
        <Button type="submit" variant="contained" fullWidth disabled={submitting} size="small" sx={{ mt: 2 }}>
          Register
        </Button>
        <Typography sx={{ textAlign: "center", mt: 1.5, fontSize: 12, color: "text.secondary" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#7c5cfc", fontWeight: 500 }}>
            Sign In
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}

export default Register;
