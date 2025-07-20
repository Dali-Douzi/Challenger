import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Container,
} from "@mui/material";
import { CheckCircle, Error } from "@mui/icons-material";
import { ThemeProvider } from "@mui/material/styles";
import theme from "../styles/theme";
import { useAuth } from "../context/AuthContext";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthData } = useAuth();
  const [message, setMessage] = useState("Processing authentication...");
  const [messageType, setMessageType] = useState("info");
  const [isProcessing, setIsProcessing] = useState(true);

  // Get the correct API base URL
  const getApiBaseUrl = () => {
    if (process.env.NODE_ENV === "production") {
      return window.location.origin;
    }
    return "http://localhost:4444";
  };

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const urlParams = new URLSearchParams(location.search);
        const error = urlParams.get("error");

        // Handle error cases
        if (location.pathname === "/auth/error" || error) {
          const errorMessage = error || "OAuth authentication failed";
          setMessage(errorMessage);
          setMessageType("error");
          setIsProcessing(false);

          setTimeout(() => {
            navigate("/login", { replace: true });
          }, 3000);
          return;
        }

        // Handle success case
        if (location.pathname === "/auth/success") {
          setMessage(
            "You have been successfully logged in. Verifying session..."
          );
          setMessageType("success");

          // Wait a moment for cookies to be processed
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Verify authentication by calling /api/auth/me
          setMessage("Verifying your session...");

          try {
            const authTestResponse = await fetch(
              `${getApiBaseUrl()}/api/auth/me`,
              {
                credentials: "include",
              }
            );

            if (authTestResponse.ok) {
              const authData = await authTestResponse.json();

              if (authData.success && authData.user) {
                // Directly set the auth context with user data
                setAuthData(authData.user);

                setMessage(
                  "Authentication verified! Redirecting to your dashboard..."
                );

                // Redirect to dashboard
                setTimeout(() => {
                  setIsProcessing(false);
                  navigate("/dashboard", { replace: true });
                }, 1500);
                return;
              }
            }

            // Auth verification failed
            setMessage(
              "Session verification failed. Please try logging in again."
            );
            setMessageType("error");
            setIsProcessing(false);

            setTimeout(() => {
              navigate("/login", { replace: true });
            }, 3000);
            return;
          } catch (authTestError) {
            setMessage("Could not verify session. Please try again.");
            setMessageType("error");
            setIsProcessing(false);

            setTimeout(() => {
              navigate("/login", { replace: true });
            }, 3000);
            return;
          }
        }

        // Invalid OAuth path
        setMessage("Invalid authentication callback");
        setMessageType("error");
        setIsProcessing(false);

        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 2000);
      } catch (error) {
        setMessage("Authentication processing failed. Please try again.");
        setMessageType("error");
        setIsProcessing(false);

        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [location, navigate, setAuthData]);

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
              {messageType === "success" ? (
                <CheckCircle
                  sx={{
                    fontSize: 80,
                    color: "success.main",
                  }}
                />
              ) : messageType === "error" ? (
                <Error
                  sx={{
                    fontSize: 80,
                    color: "error.main",
                  }}
                />
              ) : (
                <CircularProgress size={80} sx={{ color: "primary.main" }} />
              )}

              <Typography
                variant="h4"
                component="h1"
                color={
                  messageType === "success"
                    ? "success.main"
                    : messageType === "error"
                    ? "error.main"
                    : "primary.main"
                }
                gutterBottom
              >
                {messageType === "success"
                  ? "Authentication Successful!"
                  : messageType === "error"
                  ? "Authentication Failed"
                  : "Processing Authentication..."}
              </Typography>

              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {message}
              </Typography>

              {isProcessing && (
                <CircularProgress size={40} sx={{ color: "primary.main" }} />
              )}

              {messageType === "success" && !isProcessing && (
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
              )}

              {messageType === "error" && (
                <Typography variant="caption" color="text.secondary">
                  You will be redirected to the login page shortly, or{" "}
                  <Box
                    component="a"
                    href="/login"
                    sx={{ color: "primary.main", textDecoration: "none" }}
                  >
                    click here
                  </Box>
                </Typography>
              )}
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default OAuthCallback;
