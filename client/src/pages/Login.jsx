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
  Divider,
} from "@mui/material";
import { Google } from "@mui/icons-material";
import { ThemeProvider } from "@mui/material/styles";
import theme from "../styles/theme";
import { useAuth } from "../context/AuthContext";

// Custom Discord Icon Component
const DiscordIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0188 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9554 2.4189-2.1568 2.4189Z" />
  </svg>
);

// Custom Twitch Icon Component
const TwitchIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M2.149 0L.537 4.119v15.581h5.4V24h3.131l3.134-4.3h4.65L24 12.615V0H2.149zm19.164 11.646l-3.131 3.135h-5.4L9.65 17.919v-3.138H3.737V2.687h17.576v8.959zM20.388 8.959h-2.149v5.4h2.149v-5.4zm-5.4 0h-2.149v5.4h2.149v-5.4z" />
  </svg>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, user } = useAuth(); // Added user here

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    identifier: "",
    password: "",
  });
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false); // Renamed to avoid conflict
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  // Get the correct API base URL
  const getApiBaseUrl = () => {
    if (process.env.NODE_ENV === "production") {
      return window.location.origin;
    }
    return "http://localhost:4444";
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, isLoading, navigate]);

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

    setIsSubmittingLogin(true); // Updated variable name
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
      setIsSubmittingLogin(false); // Updated variable name
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleOAuthLogin = (provider) => {
    // Redirect to OAuth endpoint with proper URL construction
    const apiUrl = getApiBaseUrl();
    window.location.href = `${apiUrl}/api/auth/${provider}`;
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
              {/* OAuth Login Buttons */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ textAlign: "center", mb: 1 }}
                >
                  Quick sign in with
                </Typography>

                <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
                  <Button
                    variant="outlined"
                    onClick={() => handleOAuthLogin("google")}
                    sx={{
                      flex: 1,
                      py: 1.5,
                      borderColor: "#DB4437",
                      color: "#DB4437",
                      "&:hover": {
                        borderColor: "#C23321",
                        bgcolor: "#DB4437",
                        color: "white",
                      },
                    }}
                    startIcon={<Google />}
                  >
                    Google
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={() => handleOAuthLogin("discord")}
                    sx={{
                      flex: 1,
                      py: 1.5,
                      borderColor: "#5865F2",
                      color: "#5865F2",
                      "&:hover": {
                        borderColor: "#4752C4",
                        bgcolor: "#5865F2",
                        color: "white",
                      },
                    }}
                    startIcon={<DiscordIcon />}
                  >
                    Discord
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={() => handleOAuthLogin("twitch")}
                    sx={{
                      flex: 1,
                      py: 1.5,
                      borderColor: "#9146FF",
                      color: "#9146FF",
                      "&:hover": {
                        borderColor: "#772CE8",
                        bgcolor: "#9146FF",
                        color: "white",
                      },
                    }}
                    startIcon={<TwitchIcon />}
                  >
                    Twitch
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  or continue with email
                </Typography>
              </Divider>

              {/* Traditional Login Form */}
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
                disabled={isSubmittingLogin} // Updated variable name
                sx={{
                  py: 1.5,
                  mt: 2,
                  fontSize: "1rem",
                  fontWeight: "medium",
                }}
              >
                {isSubmittingLogin ? ( // Updated variable name
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
