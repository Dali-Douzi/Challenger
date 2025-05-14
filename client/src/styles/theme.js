import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark", // Enable dark mode
    primary: {
      main: "#00FFFF", // Neon Cyan
    },
    secondary: {
      main: "#FF00FF", // Neon Magenta
    },
    background: {
      default: "#121212", // Dark background color
      paper: "#1C1C1C", // Slightly lighter background for paper elements
    },
    text: {
      primary: "#ffffff", // White text for primary text
      secondary: "#AAAAAA", // Light gray for secondary text
    },
    warning: {
      main: "#FFB400", // Bright Orange
    },
    error: {
      main: "#FF1744", // Intense Red
    },
    success: {
      main: "#00E676", // Bright Green
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          background: "linear-gradient(135deg, #1a1a1a 0%, #2C2F5D 100%)", // Gradient for paper
        },
      },
    },
  },
});

export default theme;
