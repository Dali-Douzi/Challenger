// src/pages/TeamDashboard.jsx

import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
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
} from "@mui/material";

const TeamDashboard = () => {
  const token = localStorage.getItem("token");
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
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
    })();
  }, [token]);

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Your Teams
        </Typography>

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
                  <ListItemButton
                    component={RouterLink}
                    to={`/teams/${team._id}`}
                  >
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
      </Box>
    </Container>
  );
};

export default TeamDashboard;
