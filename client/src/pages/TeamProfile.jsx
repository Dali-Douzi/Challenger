import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Paper,
} from "@mui/material";

const TeamProfile = () => {
  const { id } = useParams();
  const token = localStorage.getItem("token");

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`http://localhost:4444/api/teams/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to load team");
        }
        const data = await res.json();
        setTeam(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ p: 4 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ p: 4 }}>
        {/* Banner */}
        {team.banner && (
          <Box
            component="img"
            src={team.banner}
            alt="Team Banner"
            sx={{
              width: "100%",
              height: 200,
              objectFit: "cover",
              borderRadius: 1,
              mb: 3,
            }}
          />
        )}

        {/* Logo & Basic Info */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
          {team.logo && (
            <Avatar
              src={team.logo}
              alt={team.name}
              sx={{ width: 80, height: 80, mr: 2 }}
            />
          )}
          <Box>
            <Typography variant="h4">{team.name}</Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Game: {team.game} | Rank: {team.rank}
            </Typography>
          </Box>
        </Box>

        {/* Members List */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Members
          </Typography>
          <List>
            {team.members.map(({ user, role }) => (
              <ListItem key={user._id} divider>
                <ListItemAvatar>
                  <Avatar src={user.avatar} alt={user.username}>
                    {user.username[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={user.username} secondary={role} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>
    </Container>
  );
};

export default TeamProfile;
