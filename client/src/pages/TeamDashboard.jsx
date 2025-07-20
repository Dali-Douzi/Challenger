import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import JoinTeamModal from "../components/JoinTeamModal";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Container,
  Paper,
  Button,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";

const TeamDashboard = () => {
  const { makeAuthenticatedRequest } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await makeAuthenticatedRequest(
        "http://localhost:4444/api/teams/my"
      );
      if (res && res.ok) {
        const data = await res.json();
        const teamsArray = Array.isArray(data) ? data : [];
        setTeams(teamsArray);
      } else if (res) {
        const err = await res.json();
        throw new Error(err.message || "Failed to fetch teams");
      }
    } catch (err) {
      console.error("Error fetching teams:", err);
      setError("Error fetching your teams");
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleCreateTeam = () => {
    navigate("/create-team");
  };

  const handleJoinTeam = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const onJoinSuccess = () => {
    fetchTeams();
  };

  const getTeamInitials = (teamName) => {
    if (typeof teamName !== "string" || !teamName.trim()) return "";
    return teamName
      .trim()
      .split(/\s+/)
      .map((word) => word[0].toUpperCase())
      .slice(0, 2)
      .join("");
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ p: 4, color: "white" }}>
        <Typography variant="h5" gutterBottom>
          Your Teams
        </Typography>

        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateTeam}
          >
            + Create New Team
          </Button>
          <Button variant="outlined" color="secondary" onClick={handleJoinTeam}>
            Join a Team
          </Button>
        </Box>

        {error && (
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
        )}

        {!error && (!Array.isArray(teams) || teams.length === 0) && (
          <Typography>You haven't created or joined any teams yet.</Typography>
        )}

        {!error && Array.isArray(teams) && teams.length > 0 && (
          <Paper>
            <List>
              {teams.map((team) => (
                <ListItem key={team._id} disablePadding divider>
                  <ListItemButton component="a" href={`/teams/${team._id}`}>
                    <ListItemAvatar>
                      <Avatar
                        src={team.logo || ""}
                        alt={team.name}
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: team.logo ? "transparent" : "primary.main",
                          fontSize: "1.2rem",
                          fontWeight: "bold",
                        }}
                      >
                        {!team.logo && getTeamInitials(team.name)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={team.name}
                      secondary={`Game: ${
                        team.game?.name || team.game
                      } | Rank: ${team.rank}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        <JoinTeamModal
          isOpen={isModalOpen}
          closeModal={closeModal}
          onSuccess={onJoinSuccess}
        />
      </Box>
    </Container>
  );
};

export default TeamDashboard;
