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
  Avatar,
  IconButton,
  Divider,
} from "@mui/material";
import { PhotoCamera, Delete, Person, Google } from "@mui/icons-material";
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

const SignupPage = () => {
  const navigate = useNavigate();
  const { signup, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [errors, setErrors] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    avatar: "",
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

  // Check for OAuth callback messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthMessage = urlParams.get("message");
    const oauthError = urlParams.get("error");

    if (oauthMessage) {
      setMessage(oauthMessage);
      setMessageType("success");
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthError) {
      setMessage(oauthError);
      setMessageType("error");
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({
          ...prev,
          avatar: "Please select an image file",
        }));
        return;
      }

      // Validate file size (10MB limit to match backend)
      if (file.size > 10 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          avatar: "File size must be less than 10MB",
        }));
        return;
      }

      setAvatarFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);

      // Clear any previous error
      if (errors.avatar) {
        setErrors((prev) => ({
          ...prev,
          avatar: "",
        }));
      }
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const validateForm = () => {
    const newErrors = {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      avatar: "",
    };

    // Username validation
    if (!formData.username) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters long";
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    } else {
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(formData.password)) {
        newErrors.password =
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)";
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.values(newErrors).every((error) => error === "");
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setMessage("");

    try {
      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append("username", formData.username);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("password", formData.password);

      // Add avatar if selected
      if (avatarFile) {
        formDataToSend.append("avatar", avatarFile);
      }

      // Use the auth context signup function
      const result = await signup(formDataToSend);

      if (result.success) {
        setMessage("Account created successfully! Redirecting...");
        setMessageType("success");

        // Navigate to dashboard
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      } else {
        setMessage(result.message || "Registration failed");
        setMessageType("error");
      }
    } catch (error) {
      setMessage("An unexpected error occurred. Please try again.");
      setMessageType("error");
      console.error("Signup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleOAuthSignup = (provider) => {
    // Redirect to OAuth endpoint
    const apiUrl = "http://localhost:4444";
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
              Create your account
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Already have an account?{" "}
              <Link
                href="/login"
                color="secondary"
                sx={{ fontWeight: "medium", textDecoration: "none" }}
              >
                Sign in here
              </Link>
            </Typography>
          </Box>

          <Paper elevation={3} sx={{ p: 4 }}>
            <Box
              component="div"
              sx={{ display: "flex", flexDirection: "column", gap: 3 }}
            >
              {/* OAuth Signup Buttons */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ textAlign: "center", mb: 1 }}
                >
                  Quick sign up with
                </Typography>

                <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
                  <Button
                    variant="outlined"
                    onClick={() => handleOAuthSignup("google")}
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
                    onClick={() => handleOAuthSignup("discord")}
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
                    onClick={() => handleOAuthSignup("twitch")}
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
                  or create account with email
                </Typography>
              </Divider>

              {/* Avatar Upload Section */}
              <Box sx={{ textAlign: "center", mb: 2 }}>
                <Typography
                  variant="subtitle1"
                  color="text.primary"
                  gutterBottom
                >
                  Profile Picture (Optional)
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: avatarPreview
                        ? "transparent"
                        : "background.paper",
                      border: 2,
                      borderColor: "primary.main",
                    }}
                    src={avatarPreview}
                  >
                    {!avatarPreview && (
                      <Person sx={{ fontSize: 40, color: "text.secondary" }} />
                    )}
                  </Avatar>
                  <Box>
                    <input
                      accept="image/png,image/jpg,image/jpeg,image/webp"
                      style={{ display: "none" }}
                      id="avatar-input"
                      type="file"
                      onChange={handleFileChange}
                    />
                    <label htmlFor="avatar-input">
                      <IconButton color="primary" component="span">
                        <PhotoCamera />
                      </IconButton>
                    </label>
                    {avatarPreview && (
                      <IconButton color="error" onClick={removeAvatar}>
                        <Delete />
                      </IconButton>
                    )}
                  </Box>
                </Box>
                {errors.avatar && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ mt: 1, display: "block" }}
                  >
                    {errors.avatar}
                  </Typography>
                )}
              </Box>

              <TextField
                fullWidth
                id="username"
                name="username"
                label="Username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                error={!!errors.username}
                helperText={errors.username}
                variant="outlined"
              />

              <TextField
                fullWidth
                id="email"
                name="email"
                label="Email address"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                error={!!errors.email}
                helperText={errors.email}
                variant="outlined"
              />

              <TextField
                fullWidth
                id="password"
                name="password"
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                error={!!errors.password}
                helperText={errors.password}
                variant="outlined"
              />

              <TextField
                fullWidth
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
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
                    Creating account...
                  </Box>
                ) : (
                  "Create account"
                )}
              </Button>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textAlign: "center", mt: 2 }}
              >
                By creating an account, you agree to our Terms of Service and
                Privacy Policy
              </Typography>
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default SignupPage;
