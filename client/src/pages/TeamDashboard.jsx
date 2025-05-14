import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Container,
  List,
  ListItem,
} from "@mui/material";
import React from "react";

const TeamDashboard = () => {
  const { id } = useParams(); // Dynamic team ID from URL
  const [team, setTeam] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:4444/api/teams/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Failed to fetch team");
        }

        const data = await res.json();
        setTeam(data);
      } catch (err) {
        setError(err.message);
        console.error("Error fetching team:", err);
      }
    };

    fetchTeam();
  }, [id]);

  if (error) {
    return (
      <Container maxWidth="sm">
        <Paper sx={{ padding: 4, mt: 4 }}>
          <Typography variant="h5">Team Dashboard</Typography>
          <Typography color="error">{error}</Typography>
        </Paper>
      </Container>
    );
  }

  if (!team) {
    return (
      <Container maxWidth="sm">
        <Paper sx={{ padding: 4, mt: 4 }}>
          <Typography variant="h5">Team Dashboard</Typography>
          <Typography>Loading team details...</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Paper sx={{ padding: 4, mt: 4 }}>
        <Typography variant="h4">{team.name}</Typography>
        <Typography variant="h6">Game: {team.game}</Typography>
        <Typography variant="h6">Rank: {team.rank}</Typography>
        <Typography variant="h6">Team Code: {team.teamCode}</Typography>

        <Typography variant="h6" sx={{ mt: 2 }}>
          Members
        </Typography>
        <List>
          {team.members.map((m) => (
            <ListItem key={m.user._id || m.user}>
              {m.user.username || m.user.email || m.user} ({m.role})
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
};

export default TeamDashboard;
