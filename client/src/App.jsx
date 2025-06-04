import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { Box } from "@mui/material";
import theme from "./styles/theme";

import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ScrimDashboard from "./pages/ScrimDashboard";
import EditScrim from "./pages/EditScrim";
import ScrimRequests from "./pages/ScrimRequests";
import TeamDashboard from "./pages/TeamDashboard";
import TeamProfile from "./pages/TeamProfile";
import CreateTeam from "./pages/CreateTeam";
import Profile from "./pages/Profile";
import ChatsPage from "./pages/ChatsPage";

import TournamentDashboard from "./pages/TournamentDashboard";
import CreateTournamentPage from "./pages/CreateTournamentPage";
import TournamentPage from "./pages/TournamentPage";
import EditTournamentPage from "./pages/EditTournamentPage";
import MatchPage from "./pages/MatchPage";
import BracketSandbox from "./components/BracketSandbox";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: theme.palette.background.default,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected routes */}
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
              path="/scrims/edit"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <EditScrim />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scrims/:scrimId/requests"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <ScrimRequests />
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
              path="/teams/:id"
              element={
                <ProtectedRoute>
                  <TeamProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-team"
              element={
                <ProtectedRoute>
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

            <Route
              path="/chats"
              element={
                <ProtectedRoute>
                  <ChatsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chats/:chatId"
              element={
                <ProtectedRoute>
                  <ChatsPage />
                </ProtectedRoute>
              }
            />

            {/* Tournament routes */}
            <Route
              path="/tournaments"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <TournamentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tournaments/create"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <CreateTournamentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tournaments/:id"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <TournamentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/matches/:id"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <MatchPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tournaments/:id/edit"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <EditTournamentPage />
                </ProtectedRoute>
              }
            />
            <Route path="/bracket-sandbox" element={<BracketSandbox />} />

            {/* 404 fallback */}
            <Route
              path="*"
              element={
                <Box sx={{ p: 4, textAlign: "center", color: "white" }}>
                  <h1>404 - Page not found</h1>
                </Box>
              }
            />
          </Routes>
        </Router>
      </Box>
    </ThemeProvider>
  );
}

export default App;
