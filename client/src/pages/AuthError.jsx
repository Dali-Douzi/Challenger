import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Alert,
} from "@mui/material";
import { Error, ArrowBack } from "@mui/icons-material";
import { ThemeProvider } from "@mui/material/styles";
import theme from "../styles/theme";

const AuthError = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("Authentication failed");

  useEffect(() => {
    // Get error message from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get("message");

    if (message) {
      setErrorMessage(decodeURIComponent(message));
    }
  }, []);

  const handleReturnToLogin = () => {
    navigate("/login");
  };

  const handleReturnToSignup = () => {
    navigate("/signup");
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
          <Paper elevation={3} sx={{ p: 6, textAlign: "center" }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Error
                sx={{
                  fontSize: 80,
                  color: "error.main",
                }}
              />

              <Typography
                variant="h4"
                component="h1"
                color="error.main"
                gutterBottom
              >
                Authentication Failed
              </Typography>

              <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
                {errorMessage}
              </Alert>

              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                There was a problem with your authentication. This could be due
                to:
              </Typography>

              <Box sx={{ textAlign: "left", mb: 3 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  component="ul"
                >
                  <li>Canceling the authorization process</li>
                  <li>Network connectivity issues</li>
                  <li>The OAuth provider being temporarily unavailable</li>
                  <li>Account access restrictions</li>
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  flexDirection: { xs: "column", sm: "row" },
                  width: "100%",
                }}
              >
                <Button
                  variant="contained"
                  startIcon={<ArrowBack />}
                  onClick={handleReturnToLogin}
                  sx={{ flex: 1 }}
                >
                  Back to Login
                </Button>

                <Button
                  variant="outlined"
                  onClick={handleReturnToSignup}
                  sx={{ flex: 1 }}
                >
                  Create Account
                </Button>
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 2 }}
              >
                If the problem persists, please try again later or contact
                support.
              </Typography>
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default AuthError;
