import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Link,
  Container,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import theme from "../styles/theme";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    identifier: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.identifier) {
      newErrors.identifier = "Username or email is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setMessage("");

    try {
      const result = await login(formData.identifier, formData.password);

      if (result.success) {
        setMessage("Login successful! Redirecting...");
        setMessageType("success");

        // Navigate to dashboard
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      } else {
        setMessage(result.message || "Login failed");
        setMessageType("error");
      }
    } catch (error) {
      setMessage("An unexpected error occurred. Please try again.");
      setMessageType("error");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          py: 4,
        }}
      >
        <Container maxWidth="sm">
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              color="primary"
            >
              Sign in to your account
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Or{" "}
              <Link
                href="/signup"
                color="secondary"
                sx={{ fontWeight: "medium", textDecoration: "none" }}
              >
                create a new account
              </Link>
            </Typography>
          </Box>

          <Paper elevation={3} sx={{ p: 4 }}>
            <Box
              component="div"
              sx={{ display: "flex", flexDirection: "column", gap: 3 }}
            >
              <TextField
                fullWidth
                id="identifier"
                name="identifier"
                label="Username or Email"
                type="text"
                autoComplete="username email"
                value={formData.identifier}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                error={!!errors?.identifier}
                helperText={errors?.identifier}
                variant="outlined"
                placeholder="Enter username or email"
              />

              <TextField
                fullWidth
                id="password"
                name="password"
                label="Password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                error={!!errors?.password}
                helperText={errors?.password}
                variant="outlined"
              />

              {message && (
                <Alert
                  severity={
                    messageType === "success"
                      ? "success"
                      : messageType === "error"
                      ? "error"
                      : "info"
                  }
                  sx={{ mt: 2 }}
                >
                  {message}
                </Alert>
              )}

              <Button
                fullWidth
                variant="contained"
                onClick={handleSubmit}
                disabled={isLoading}
                sx={{
                  py: 1.5,
                  mt: 2,
                  fontSize: "1rem",
                  fontWeight: "medium",
                }}
              >
                {isLoading ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={20} color="inherit" />
                    Signing in...
                  </Box>
                ) : (
                  "Sign in"
                )}
              </Button>

              <Box sx={{ textAlign: "center", mt: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Need help?
                </Typography>
                <Link
                  href="/forgot-password"
                  color="secondary"
                  sx={{ textDecoration: "none" }}
                >
                  Forgot your password?
                </Link>
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default LoginPage;
