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
  CircularProgress,
  Container,
  Paper,
  Button,
} from "@mui/material";

const TeamDashboard = () => {
  const token = localStorage.getItem("token");
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  // Extracted fetch function so we can call it on mount and after joining
  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:4444/api/teams/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to fetch teams");
      }
      const data = await res.json();
      setTeams(data);
    } catch (err) {
      console.error("Error fetching teams:", err);
      setError("Error fetching your teams");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load
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

  // Called by JoinTeamModal on successful join
  const onJoinSuccess = () => {
    fetchTeams();
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

        {!error && teams.length === 0 && (
          <Typography>You haven’t created or joined any teams yet.</Typography>
        )}

        {!error && teams.length > 0 && (
          <Paper>
            <List>
              {teams.map((team) => (
                <ListItem key={team._id} disablePadding divider>
                  <ListItemButton component="a" href={`/teams/${team._id}`}>
                    <ListItemText
                      primary={team.name}
                      secondary={`Game: ${team.game} | Rank: ${team.rank}`}
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
