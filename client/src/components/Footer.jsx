import React from "react";
import { Box, Typography, Container, Link, IconButton } from "@mui/material";
import TwitterIcon from "@mui/icons-material/Twitter";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";

const Footer = () => (
  <Box
    component="footer"
    sx={{
      py: 6,
      backgroundColor: (theme) => theme.palette.background.paper,
      borderTop: (theme) => `1px solid ${theme.palette.divider}`,
    }}
  >
    <Container maxWidth="lg">
      {/* three-column layout */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
          gap: 4,
        }}
      >
        {/* Branding */}
        <Box>
          <Typography variant="h6" gutterBottom>
            <Box
              component="span"
              sx={{ color: (theme) => theme.palette.primary.main }}
            >
              Challenger
            </Box>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The ultimate esports platform connecting teams, scrims, and{" "}
            <Box
              component="span"
              sx={{ color: (theme) => theme.palette.secondary.main }}
            >
              tournaments
            </Box>{" "}
            worldwide.
          </Typography>
        </Box>

        {/* Quick Links */}
        <Box>
          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{ color: (theme) => theme.palette.primary.main }}
          >
            Quick Links
          </Typography>
          <Link
            href="/teams"
            variant="body2"
            display="block"
            sx={{
              color: "text.primary",
              textDecoration: "none",
              "&:hover": {
                color: (theme) => theme.palette.primary.main,
                textDecoration: "underline",
              },
            }}
          >
            Teams
          </Link>
          <Link
            href="/scrims"
            variant="body2"
            display="block"
            sx={{
              color: "text.primary",
              textDecoration: "none",
              "&:hover": {
                color: (theme) => theme.palette.primary.main,
                textDecoration: "underline",
              },
            }}
          >
            Scrims
          </Link>
          <Link
            href="/tournaments"
            variant="body2"
            display="block"
            sx={{
              color: "text.primary",
              textDecoration: "none",
              "&:hover": {
                color: (theme) => theme.palette.primary.main,
                textDecoration: "underline",
              },
            }}
          >
            Tournaments
          </Link>
          <Link
            href="/contact"
            variant="body2"
            display="block"
            sx={{
              color: "text.primary",
              textDecoration: "none",
              "&:hover": {
                color: (theme) => theme.palette.primary.main,
                textDecoration: "underline",
              },
            }}
          >
            Contact Us
          </Link>
        </Box>

        {/* Social Media */}
        <Box>
          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{ color: (theme) => theme.palette.primary.main }}
          >
            Follow Us
          </Typography>
          <Box>
            <IconButton
              component="a"
              href="https://twitter.com"
              target="_blank"
              rel="noopener"
              aria-label="Twitter"
              sx={{
                color: (theme) => theme.palette.secondary.main,
                "&:hover": { color: (theme) => theme.palette.primary.main },
              }}
            >
              <TwitterIcon />
            </IconButton>
            <IconButton
              component="a"
              href="https://facebook.com"
              target="_blank"
              rel="noopener"
              aria-label="Facebook"
              sx={{
                color: (theme) => theme.palette.secondary.main,
                "&:hover": { color: (theme) => theme.palette.primary.main },
              }}
            >
              <FacebookIcon />
            </IconButton>
            <IconButton
              component="a"
              href="https://instagram.com"
              target="_blank"
              rel="noopener"
              aria-label="Instagram"
              sx={{
                color: (theme) => theme.palette.secondary.main,
                "&:hover": { color: (theme) => theme.palette.primary.main },
              }}
            >
              <InstagramIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Copyright */}
      <Box mt={4} textAlign="center">
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()}{" "}
          <Box
            component="span"
            sx={{ color: (theme) => theme.palette.primary.main }}
          >
            Challenger
          </Box>
          . All rights reserved.
        </Typography>
      </Box>
    </Container>
  </Box>
);

export default Footer;
