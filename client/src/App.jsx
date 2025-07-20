import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import theme from "./styles/theme";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Profile from "./pages/Profile";
import ScrimDashboard from "./pages/ScrimDashboard";
import TeamDashboard from "./pages/TeamDashboard";
import TournamentDashboard from "./pages/TournamentDashboard";
import CreateTeam from "./pages/CreateTeam";
import TeamProfile from "./pages/TeamProfile";
import OAuthCallback from "./components/OAuthCallback";

const PublicRoute = ({ children }) => {
  const token = sessionStorage.getItem("token");
  return !token ? children : <Navigate to="/dashboard" replace />;
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />

            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <SignupPage />
                </PublicRoute>
              }
            />

            <Route path="/auth/success" element={<OAuthCallback />} />

            <Route path="/auth/error" element={<OAuthCallback />} />

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
              path="/profile"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <Profile />
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
              path="/create-team"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <CreateTeam />
                </ProtectedRoute>
              }
            />

            <Route
              path="/teams/:id"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <TeamProfile />
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
              path="/tournaments"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <TournamentDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
