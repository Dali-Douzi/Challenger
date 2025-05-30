import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Avatar,
  List,
  CircularProgress,
  Paper,
  Button,
  Stack,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import MemberRow from "../components/MemberRow";

const TeamProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const { user } = useAuth();

  const [team, setTeam] = useState(null);
  const [availableRanks, setAvailableRanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`http://localhost:4444/api/teams/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to load team");
      }
      const data = await res.json();
      setTeam(data);
      setAvailableRanks(data.availableRanks || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const currentMember = team?.members.find((m) => m.user._id === user._id);
  const currentUserRole = currentMember?.role;

  const handleDeleteTeam = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this team? This cannot be undone."
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`http://localhost:4444/api/teams/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete team");
      }
      // Redirect to the user's profile page after deletion
      navigate("/profile");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

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
    <>
      <Navbar />
      <Container maxWidth="md">
        <Box sx={{ color: "white", p: 4 }}>
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

          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            mb={4}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {team.logo && (
                <Avatar
                  src={team.logo}
                  alt={team.name}
                  sx={{ width: 80, height: 80, mr: 2 }}
                />
              )}
              <Box>
                <Typography variant="h4">{team.name}</Typography>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "white", mt: 1, mb: 1 }}
                >
                  Join Code: <strong>{team.teamCode}</strong>
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Game: {team.game} | Rank: {team.rank} | Server: {team.server}
                </Typography>
              </Box>
            </Box>
            {currentUserRole === "owner" && (
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteTeam}
              >
                Delete Team
              </Button>
            )}
          </Stack>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Members
            </Typography>
            <List>
              {team.members.map((member) => (
                <MemberRow
                  key={member.user._id}
                  member={member}
                  teamId={id}
                  currentUserRole={currentUserRole}
                  availableRanks={availableRanks}
                  onMemberChange={fetchTeam}
                />
              ))}
            </List>
          </Paper>
        </Box>
      </Container>
    </>
  );
};

export default TeamProfile;
