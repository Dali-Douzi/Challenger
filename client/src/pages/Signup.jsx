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
} from "@mui/material";
import { PhotoCamera, Delete, Person } from "@mui/icons-material";
import { ThemeProvider } from "@mui/material/styles";
import theme from "../styles/theme";
import { useAuth } from "../context/AuthContext";

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
