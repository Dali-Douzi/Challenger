import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Button, Container } from "@mui/material";

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "background.default",
        color: "text.primary",
      }}
    >
      {/* Hero Section */}
      <Container maxWidth="lg">
        <Box sx={{ py: 10, textAlign: "center" }}>
          <Typography variant="h2" sx={{ fontWeight: "bold", mb: 3 }}>
            Welcome to{" "}
            <Box component="span" sx={{ color: "primary.main" }}>
              Challenger{" "}
            </Box>
            <br />
            The Ultimate Esports Platform
          </Typography>
          <Typography variant="h6" sx={{ color: "text.secondary", mb: 4 }}>
            Join teams, practice in scrims, and compete in tournaments
          </Typography>
        </Box>

        {/* Main 3 Sections */}
        <Box sx={{ pb: 8 }}>
          {/* Teams Section */}
          <Box
            sx={{
              position: "relative",
              overflow: "hidden",
              py: 6,
              textAlign: "center",
              backgroundColor: "rgba(0, 255, 255, 0.1)", // primary.main 10% opacity
              borderRadius: 2,
              mb: 4,
              border: "1px solid",
              borderColor: "primary.main",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundImage: 'url("/images/teams-bg.jpg")',
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.2,
                zIndex: 0,
              },
            }}
          >
            <Box sx={{ position: "relative", zIndex: 1 }}>
              <Typography
                variant="h3"
                sx={{ color: "primary.main", fontWeight: "bold", mb: 2 }}
              >
                Teams
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: "text.secondary", mb: 3 }}
              >
                Join or create professional esports teams and compete at the
                highest level
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate("/teams")}
                sx={{
                  backgroundColor: "primary.main",
                  "&:hover": { backgroundColor: "primary.main" },
                  px: 4,
                  py: 1.5,
                }}
              >
                Browse Teams
              </Button>
            </Box>
          </Box>

          {/* Scrims Section */}
          <Box
            sx={{
              position: "relative",
              overflow: "hidden",
              py: 6,
              textAlign: "center",
              backgroundColor: "rgba(255, 0, 255, 0.1)", // secondary.main 10% opacity
              borderRadius: 2,
              mb: 4,
              border: "1px solid",
              borderColor: "secondary.main",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundImage: 'url("/images/scrims-bg.jpg")',
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.2,
                zIndex: 0,
              },
            }}
          >
            <Box sx={{ position: "relative", zIndex: 1 }}>
              <Typography
                variant="h3"
                sx={{ color: "secondary.main", fontWeight: "bold", mb: 2 }}
              >
                Scrims
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: "text.secondary", mb: 3 }}
              >
                Practice with competitive scrimmage matches and improve your
                skills
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate("/scrims")}
                sx={{
                  backgroundColor: "secondary.main",
                  "&:hover": { backgroundColor: "secondary.main" },
                  px: 4,
                  py: 1.5,
                }}
              >
                Find Scrims
              </Button>
            </Box>
          </Box>

          {/* Tournaments Section */}
          <Box
            sx={{
              position: "relative",
              overflow: "hidden",
              py: 6,
              textAlign: "center",
              backgroundColor: "rgba(255, 180, 0, 0.1)", // warning.main 10% opacity
              borderRadius: 2,
              border: "1px solid",
              borderColor: "warning.main",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundImage: 'url("/images/tournaments-bg.jpg")',
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.2,
                zIndex: 0,
              },
            }}
          >
            <Box sx={{ position: "relative", zIndex: 1 }}>
              <Typography
                variant="h3"
                sx={{ color: "warning.main", fontWeight: "bold", mb: 2 }}
              >
                Tournaments
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: "text.secondary", mb: 3 }}
              >
                Compete in tournaments with prize pools and climb the rankings
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate("/tournaments")}
                sx={{
                  backgroundColor: "warning.main",
                  "&:hover": { backgroundColor: "warning.main" },
                  color: "text.primary",
                  px: 4,
                  py: 1.5,
                }}
              >
                Enter Tournament
              </Button>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Dashboard;
