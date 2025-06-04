import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Button, Container } from "@mui/material";

// image imports
import teamsBg from "../images/teams-bg.jpg";
import scrimsBg from "../images/scrims-bg.jpg";
import tournamentsBg from "../images/tournaments-bg.jpg";

// footer import
import Footer from "../components/Footer";

const Dashboard = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: "Teams",
      description:
        "Join or create professional esports teams and compete at the highest level",
      link: "/teams",
      palette: "primary",
      image: teamsBg,
    },
    {
      title: "Scrims",
      description:
        "Practice with competitive scrimmage matches and improve your skills",
      link: "/scrims",
      palette: "secondary",
      image: scrimsBg,
    },
    {
      title: "Tournaments",
      description:
        "Compete in tournaments with prize pools and climb the rankings",
      link: "/tournaments",
      palette: "warning",
      image: tournamentsBg,
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: (theme) => theme.palette.background.default,
        color: (theme) => theme.palette.text.primary,
      }}
    >
      <Container maxWidth="lg">
        {/* Hero Section */}
        <Box sx={{ py: 10, textAlign: "center", color: "white" }}>
          <Typography variant="h2" sx={{ fontWeight: "bold", mb: 3 }}>
            Welcome to{" "}
            <Box
              component="span"
              sx={{ color: (theme) => theme.palette.primary.main }}
            >
              Challenger{" "}
            </Box>
            <br />
            The Ultimate Esports Platform
          </Typography>
          <Typography
            variant="h6"
            sx={{ color: (theme) => theme.palette.text.secondary, mb: 4 }}
          >
            Join teams, practice in scrims, and compete in tournaments
          </Typography>
        </Box>

        {/* Stacked Section Cards */}
        <Box
          sx={{
            pb: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: { xs: 6, md: 8 },
          }}
        >
          {sections.map(({ title, description, link, palette, image }) => (
            <Box
              key={title}
              sx={{
                position: "relative",
                overflow: "hidden",
                width: { xs: "100%", sm: "90%", md: "85%" },
                height: "60vh",
                backgroundColor: "rgba(0,0,0,0.05)",
                borderRadius: 2,
                border: "1px solid",
                borderColor: (theme) => theme.palette[palette].main,
              }}
            >
              {/* Background image */}
              <Box
                component="img"
                src={image}
                alt={`${title} background`}
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: 0.2,
                  zIndex: 0,
                }}
              />

              {/* Content overlay */}
              <Box
                sx={{
                  position: "relative",
                  zIndex: 1,
                  p: 4,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  textAlign: "center",
                }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    color: (theme) => theme.palette[palette].main,
                    fontWeight: "bold",
                    mb: 2,
                  }}
                >
                  {title}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: (theme) => theme.palette.text.secondary,
                    mb: 3,
                  }}
                >
                  {description}
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate(link)}
                  sx={{
                    backgroundColor: (theme) => theme.palette[palette].main,
                    "&:hover": {
                      backgroundColor: (theme) => theme.palette[palette].dark,
                    },
                    alignSelf: "center",
                    px: 4,
                    py: 1.5,
                  }}
                >
                  Go to {title}
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      </Container>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default Dashboard;
