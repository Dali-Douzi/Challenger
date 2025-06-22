import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  CircularProgress,
  Container,
  Paper,
} from "@mui/material";
import { CheckCircle } from "@mui/icons-material";
import { ThemeProvider } from "@mui/material/styles";
import theme from "../styles/theme";
import { useAuth } from "../context/AuthContext";

const AuthSuccess = () => {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleSuccessfulAuth = async () => {
      try {
        // Wait a moment for cookies to be set
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Check if user is now authenticated
        if (checkAuth) {
          await checkAuth();
        }

        // Redirect to dashboard
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      } catch (error) {
        console.error("Auth check failed:", error);
        // Redirect to login with error message
        navigate("/login?error=Authentication failed. Please try again.");
      }
    };

    handleSuccessfulAuth();
  }, [navigate, checkAuth]);

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
          <Paper elevation={3} sx={{ p: 6, textAlign: "center" }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
              }}
            >
              <CheckCircle
                sx={{
                  fontSize: 80,
                  color: "success.main",
                }}
              />

              <Typography
                variant="h4"
                component="h1"
                color="success.main"
                gutterBottom
              >
                Authentication Successful!
              </Typography>

              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                You have been successfully logged in. Redirecting to your
                dashboard...
              </Typography>

              <CircularProgress size={40} sx={{ color: "primary.main" }} />

              <Typography variant="caption" color="text.secondary">
                If you are not redirected automatically,{" "}
                <Box
                  component="a"
                  href="/dashboard"
                  sx={{ color: "primary.main", textDecoration: "none" }}
                >
                  click here
                </Box>
              </Typography>
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default AuthSuccess;
