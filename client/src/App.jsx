import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ScrimDashboard from "./pages/ScrimDashboard";
import TeamDashboard from "./pages/TeamDashboard";
import CreateTeam from "./pages/CreateTeam";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Profile from "./pages/Profile";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./styles/theme";
import React from "react";
import { Box } from "@mui/material";
import TeamProfile from "./pages/TeamProfile";
import EditScrim from "./pages/EditScrim";
import ScrimRequests from "./pages/ScrimRequests";
import ChatsPage from "./pages/ChatsPage";

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
              path="/create-team"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <CreateTeam />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="/teams" element={<TeamDashboard />} />
            <Route path="/teams/:id" element={<TeamProfile />} />
            <Route path="/scrims/edit" element={<EditScrim />} />
            <Route
              path="/scrims/:scrimId/requests"
              element={<ScrimRequests />}
            />
            <Route path="/chats" element={<ChatsPage />} />
            <Route path="/chats/:chatId" element={<ChatsPage />} />
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
