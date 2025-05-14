import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ScrimDashboard from "./pages/ScrimDashboard";
import TeamDashboard from "./pages/TeamDashboard";
import ScrimChat from "./pages/ScrimChat";
import CreateTeam from "./pages/CreateTeam";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Settings from "./pages/Settings";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./styles/theme";
import React from "react";
import { Box } from "@mui/material";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: "100vh", // Ensures the background fills the viewport
          backgroundColor: theme.palette.background.default,
          display: "flex", // Flexbox layout
          flexDirection: "column",
        }}
      >
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scrims"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <ScrimDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <TeamDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team-dashboard/:id"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <TeamDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scrims/:id/chat"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <ScrimChat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-team"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <CreateTeam />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* Optional 404 route */}
            <Route
              path="*"
              element={
                <div style={{ padding: "2rem", textAlign: "center" }}>
                  <h1>404 - Page not found</h1>
                </div>
              }
            />
          </Routes>
        </Router>
      </Box>
    </ThemeProvider>
  );
}

export default App;
