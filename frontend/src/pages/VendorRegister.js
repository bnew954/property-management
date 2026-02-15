import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, Paper, TextField, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { vendorRegister } from "../services/api";
import { useThemeMode } from "../services/themeContext";

function BrandLogo({ textColor }) {
  const onyxSize = 28;
  const pmFontSize = Math.round(onyxSize * 0.7);

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
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

function VendorRegister() {
  const navigate = useNavigate();
  const { token } = useParams();
  const { mode } = useThemeMode();
  const theme = useTheme();
  const [values, setValues] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const username = values.username.trim();
    if (!username || !values.password || !values.confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (values.password !== values.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Invalid registration link.");
      return;
    }

    try {
      setSubmitting(true);
      await vendorRegister(token, {
        username,
        password: values.password,
      });
      setSuccess("Registration complete. Redirecting to login...");
      setTimeout(() => {
        navigate("/login", {
          replace: true,
          state: {
            message: "Vendor portal account created successfully. Please sign in.",
          },
        });
      }, 800);
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.response?.data?.message || "Invalid token or link expired.";
      setError(typeof detail === "string" ? detail : "Registration failed. Please try again.");
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
        py: 4,
        bgcolor: "background.default",
      }}
    >
      <Paper
        component="form"
        onSubmit={submit}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: 3,
          borderRadius: 1,
          bgcolor: "background.paper",
          boxShadow: mode === "dark" ? "none" : `0 6px 24px ${alpha(theme.palette.text.primary, 0.12)}`,
          border: mode === "dark" ? undefined : "none",
        }}
      >
        <Box sx={{ mb: 2 }}>
          <BrandLogo textColor={mode === "dark" ? "#fff" : "#111827"} />
        </Box>
        <Typography variant="h5" sx={{ mb: 0.4, fontWeight: 600 }}>
          Vendor Portal Registration
        </Typography>
        <Typography sx={{ mb: 2, color: "text.secondary", fontSize: 13 }}>
          Complete your account setup using the invite link details.
        </Typography>
        {success ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
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
          onChange={(event) =>
            setValues((prev) => ({
              ...prev,
              username: event.target.value,
            }))
          }
          fullWidth
          required
          sx={{ mb: 1.5 }}
        />
        <TextField
          label="Password"
          type="password"
          value={values.password}
          onChange={(event) =>
            setValues((prev) => ({
              ...prev,
              password: event.target.value,
            }))
          }
          fullWidth
          required
          sx={{ mb: 1.5 }}
        />
        <TextField
          label="Confirm Password"
          type="password"
          value={values.confirmPassword}
          onChange={(event) =>
            setValues((prev) => ({
              ...prev,
              confirmPassword: event.target.value,
            }))
          }
          fullWidth
          required
          sx={{ mb: 2 }}
        />
        <Button type="submit" fullWidth variant="contained" disabled={submitting}>
          Create Account
        </Button>
      </Paper>
    </Box>
  );
}

export default VendorRegister;
