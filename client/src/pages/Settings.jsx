import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import React from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Avatar,
  Paper,
  Box,
} from "@mui/material";

const Settings = () => {
  const { user, setUser } = useContext(AuthContext);
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");

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
          username,
          email,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUser((prev) => ({
          ...prev,
          username: updatedUser.username,
          email: updatedUser.email,
        }));
        alert("Profile updated successfully!");
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
        setAvatarPreview(data.avatar);
        alert("Avatar uploaded successfully!");
      } else {
        alert("Upload failed.");
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      alert("Server error.");
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ padding: 4, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Account Settings
        </Typography>

        <Box
          component="form"
          onSubmit={handleUpdate}
          display="flex"
          flexDirection="column"
          gap={2}
        >
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            variant="filled"
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            variant="filled"
          />
          <TextField
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            fullWidth
            variant="filled"
          />
          <TextField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            variant="filled"
          />
          <Button type="submit" variant="contained" color="primary">
            Update Info
          </Button>
        </Box>

        <Box mt={4}>
          <Typography variant="h6">Profile Picture</Typography>
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            gap={2}
          >
            {avatarPreview ? (
              <Avatar src={avatarPreview} sx={{ width: 100, height: 100 }} />
            ) : (
              <Typography>No avatar uploaded.</Typography>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
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
        </Box>
      </Paper>
    </Container>
  );
};

export default Settings;
