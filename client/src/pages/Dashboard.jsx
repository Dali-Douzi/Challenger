import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  Button,
  TextField,
  Box,
  Typography,
  Container,
  Avatar,
  Paper,
  Grid,
} from "@mui/material";
import JoinTeamModal from "../components/JoinTeamModal";
import React from "react";

const Dashboard = () => {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:4444/api/teams/my", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        setTeams(Array.isArray(data) ? data : [data]);
      } catch (err) {
        console.error("Failed to load teams:", err);
      }
    };

    fetchTeams();
  }, []);

  const handleCreateTeam = () => {
    navigate("/create-team");
  };

  const handleViewTeam = (teamId) => {
    navigate(`/team-dashboard/${teamId}`);
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("http://localhost:4444/api/auth/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword || undefined,
        }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUser((prev) => ({ ...prev, email: updatedUser.email }));
        alert("Profile updated successfully!");
        setNewPassword("");
      } else {
        const data = await res.json();
        alert(data.message || "Update failed");
      }
    } catch (err) {
      console.error("Update error:", err);
      alert("Server error");
    }
  };

  const handleAvatarUpload = async (event) => {
    event.preventDefault();
    if (!avatarFile) return alert("Please select a file first.");

    const formData = new FormData();
    formData.append("avatar", avatarFile);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:4444/api/auth/avatar", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUser((prev) => ({ ...prev, avatar: data.avatar }));
        alert("Avatar uploaded successfully!");
      } else {
        alert("Upload failed.");
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      alert("Server error.");
    }
  };

  const handleJoinTeam = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  if (!user) return <p>Loading user...</p>;

  return (
    <Container maxWidth="sm">
      <Paper sx={{ padding: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          User Dashboard
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6">
            <strong>Email:</strong> {user.email}
          </Typography>
          <Typography variant="h6">
            <strong>Username:</strong> {user.username}
          </Typography>
        </Box>

        {/* Avatar Section */}
        <Box sx={{ mb: 3, textAlign: "center" }}>
          <Typography variant="h6">Profile Picture</Typography>
          {avatarPreview || user.avatar ? (
            <Avatar
              src={avatarPreview || user.avatar}
              sx={{ width: 100, height: 100, mx: "auto" }}
            />
          ) : (
            <Typography>No avatar uploaded.</Typography>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files[0];
              setAvatarFile(file);
              setAvatarPreview(URL.createObjectURL(file));
            }}
          />
          <Button
            variant="filled"
            color="secondary"
            onClick={handleAvatarUpload}
          >
            Upload Avatar
          </Button>
        </Box>

        {/* Update Email or Password */}
        <form onSubmit={handleUpdate}>
          <Typography variant="h6">Update Email or Password</Typography>
          <TextField
            label="New Email"
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            fullWidth
            variant="filled"
            sx={{ mb: 2 }}
          />
          <TextField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            fullWidth
            variant="filled"
            sx={{ mb: 2 }}
          />
          <Button type="submit" variant="contained" color="primary">
            Update
          </Button>
        </form>

        {/* Create New Team */}
        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateTeam}
          >
            + Create New Team
          </Button>
        </Box>

        {/* Join Team Button */}
        <Box sx={{ mt: 2 }}>
          <Button variant="filled" color="secondary" onClick={handleJoinTeam}>
            Join a Team
          </Button>
        </Box>

        {/* Team List */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6">Your Teams</Typography>
          {teams.length === 0 ? (
            <Typography>No teams joined yet.</Typography>
          ) : (
            <Grid container spacing={2}>
              {teams.map((team) => (
                <Grid size={{ xs: 6, md: 8 }}>
                  <Paper
                    sx={{ padding: 2, cursor: "pointer" }}
                    onClick={() => handleViewTeam(team._id)}
                  >
                    <Typography variant="body1">
                      <strong>{team.name}</strong> — {team.game}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Paper>
      <JoinTeamModal isOpen={isModalOpen} closeModal={closeModal} />
    </Container>
  );
};

export default Dashboard;
