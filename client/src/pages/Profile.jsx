import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Avatar,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Card,
  CardContent,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const API_URL = "http://localhost:4444";
  const {
    user,
    loading,
    updateUsername,
    updateEmail,
    updatePassword,
    updateAvatar,
  } = useAuth();
  const navigate = useNavigate();

  const [openDialog, setOpenDialog] = useState({ type: null });
  const [formValues, setFormValues] = useState({
    currentUsername: "",
    newUsername: "",
    currentEmail: "",
    newEmail: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [userTeams, setUserTeams] = useState([]);

  useEffect(() => {
    if (user) {
      axios
        .get(`/api/teams/my`)
        .then((res) => {
          const teamsWithRole = res.data.map((team) => {
            const member = team.members.find(
              (m) => m.user.toString() === user.id
            );
            return { team, role: member?.role || "player" };
          });
          setUserTeams(teamsWithRole);
        })
        .catch((err) => console.error("Error fetching teams:", err));

      setFormValues((prev) => ({
        ...prev,
        currentUsername: user.username,
        currentEmail: user.email,
      }));
    }
  }, [user]);

  useEffect(() => {
    if (avatarFile) {
      const url = URL.createObjectURL(avatarFile);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview("");
  }, [avatarFile]);

  if (loading)
    return (
      <Typography align="center" sx={{ mt: 4, color: "white" }}>
        Loading...
      </Typography>
    );
  if (!user)
    return (
      <Typography align="center" sx={{ mt: 4, color: "white" }}>
        User not found.
      </Typography>
    );

  const handleOpen = (type) => setOpenDialog({ type });
  const handleClose = () => {
    setOpenDialog({ type: null });
    setAvatarFile(null);
  };
  const _handleChange = (e) =>
    setFormValues((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    try {
      switch (openDialog.type) {
        case "avatar":
          if (avatarFile) await updateAvatar(avatarFile);
          break;
        case "username":
          await updateUsername(
            formValues.newUsername,
            formValues.currentPassword
          );
          break;
        case "email":
          await updateEmail(formValues.newEmail, formValues.currentPassword);
          break;
        case "password":
          if (formValues.newPassword !== formValues.confirmPassword) {
            alert("New passwords do not match");
            return;
          }
          await updatePassword(
            formValues.currentPassword,
            formValues.newPassword
          );
          break;
        default:
          break;
      }
      handleClose();
    } catch (err) {
      console.error("Update failed:", err);
      alert("Update failed. Please try again.");
    }
  };

  const avatarSrc =
    preview ||
    (user.avatar ? `${API_URL}${user.avatar}?t=${Date.now()}` : null);
  const avatarProps = {};
  if (avatarSrc) avatarProps.src = avatarSrc;

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 4, color: "white" }}>
      <Card
        sx={{
          mb: 4,
          bgcolor: "rgba(255,255,255,0.05)",
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <CardContent sx={{ textAlign: "center", pt: 4, pb: 4 }}>
          <Avatar
            {...avatarProps}
            sx={{ width: 100, height: 100, mx: "auto", mb: 2 }}
          >
            {!avatarSrc && user.username?.[0]?.toUpperCase()}
          </Avatar>
          <Typography variant="h5" gutterBottom>
            {user.username}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            {user.email}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
              mt: 2,
              mb: 3,
            }}
          >
            {["avatar", "username", "email", "password"].map((type) => (
              <Button
                key={type}
                fullWidth
                variant="outlined"
                onClick={() => handleOpen(type)}
              >
                {type === "avatar"
                  ? "Update Avatar"
                  : type === "password"
                  ? "Change Password"
                  : `Update ${type.charAt(0).toUpperCase() + type.slice(1)}`}
              </Button>
            ))}
          </Box>
          <Typography variant="h6" gutterBottom>
            My Teams
          </Typography>
          {userTeams.length > 0 ? (
            userTeams.map(({ team, role }) => (
              <Box
                key={team._id}
                onClick={() => navigate(`/teams/${team._id}`)}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  py: 1,
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                }}
              >
                <Typography>{team.name}</Typography>
                <Typography sx={{ textTransform: "capitalize" }}>
                  {role}
                </Typography>
              </Box>
            ))
          ) : (
            <Typography>No teams found.</Typography>
          )}
        </CardContent>
      </Card>
      <Dialog open={!!openDialog.type} onClose={handleClose} fullWidth>
        <DialogTitle>
          {openDialog.type === "avatar" && "Update Avatar"}
          {openDialog.type === "username" && "Update Username"}
          {openDialog.type === "email" && "Update Email"}
          {openDialog.type === "password" && "Change Password"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", mt: 2 }}>
          {openDialog.type === "avatar" && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Avatar src={avatarSrc} sx={{ width: 80, height: 80 }} />
              <Button variant="contained" component="label">
                Choose File
                <input
                  hidden
                  accept="image/*"
                  type="file"
                  onChange={(e) =>
                    e.target.files[0] && setAvatarFile(e.target.files[0])
                  }
                />
              </Button>
            </Box>
          )}
          {openDialog.type === "username" && (
            <>
              <TextField
                label="Current Username"
                name="currentUsername"
                fullWidth
                margin="normal"
                value={formValues.currentUsername}
                disabled
              />
              <TextField
                label="New Username"
                name="newUsername"
                fullWidth
                margin="normal"
                value={formValues.newUsername}
                onChange={_handleChange}
              />
              <TextField
                label="Current Password"
                name="currentPassword"
                type="password"
                fullWidth
                margin="normal"
                value={formValues.currentPassword}
                onChange={_handleChange}
              />
            </>
          )}
          {openDialog.type === "email" && (
            <>
              <TextField
                label="Current Email"
                name="currentEmail"
                fullWidth
                margin="normal"
                value={formValues.currentEmail}
                disabled
              />
              <TextField
                label="New Email"
                name="newEmail"
                type="email"
                fullWidth
                margin="normal"
                value={formValues.newEmail}
                onChange={_handleChange}
              />
              <TextField
                label="Current Password"
                name="currentPassword"
                type="password"
                fullWidth
                margin="normal"
                value={formValues.currentPassword}
                onChange={_handleChange}
              />
            </>
          )}
          {openDialog.type === "password" && (
            <>
              <TextField
                label="Current Password"
                name="currentPassword"
                type="password"
                fullWidth
                margin="normal"
                value={formValues.currentPassword}
                onChange={_handleChange}
              />
              <TextField
                label="New Password"
                name="newPassword"
                type="password"
                fullWidth
                margin="normal"
                value={formValues.newPassword}
                onChange={_handleChange}
              />
              <TextField
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                fullWidth
                margin="normal"
                value={formValues.confirmPassword}
                onChange={_handleChange}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;
