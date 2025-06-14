import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Profile = React.memo(() => {
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch user teams
  useEffect(() => {
    if (user) {
      // Use credentials: 'include' for cookie-based authentication
      fetch("/api/teams/my", {
        credentials: "include",
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch teams");
          return res.json();
        })
        .then((data) => {
          const teamsWithRole = data.map((team) => {
            const member = team.members.find(
              (m) => m.user._id.toString() === user.id
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

  // Handle avatar file preview
  useEffect(() => {
    if (avatarFile) {
      const url = URL.createObjectURL(avatarFile);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview("");
  }, [avatarFile]);

  // Memoized avatar source - Cloudinary URLs don't need cache busting
  const avatarSrc = useMemo(() => {
    if (preview) {
      return preview;
    }

    if (user?.avatar) {
      // Cloudinary URLs are already optimized and cached
      return user.avatar;
    }

    return null;
  }, [preview, user?.avatar]);

  // Validation functions
  const validateForm = useCallback(
    (type) => {
      switch (type) {
        case "username":
          if (!formValues.newUsername.trim()) {
            return "New username is required";
          }
          if (formValues.newUsername.length < 3) {
            return "Username must be at least 3 characters long";
          }
          if (!formValues.currentPassword) {
            return "Current password is required";
          }
          break;
        case "email":
          if (!formValues.newEmail.trim()) {
            return "New email is required";
          }
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(formValues.newEmail)) {
            return "Please enter a valid email address";
          }
          if (!formValues.currentPassword) {
            return "Current password is required";
          }
          break;
        case "password":
          if (!formValues.currentPassword) {
            return "Current password is required";
          }
          if (!formValues.newPassword) {
            return "New password is required";
          }
          if (formValues.newPassword.length < 8) {
            return "New password must be at least 8 characters long";
          }
          if (formValues.newPassword !== formValues.confirmPassword) {
            return "New passwords do not match";
          }
          break;
        case "avatar":
          if (!avatarFile) {
            return "Please select a file first";
          }
          break;
        default:
          return null;
      }
      return null;
    },
    [formValues, avatarFile]
  );

  const handleOpen = useCallback((type) => {
    setOpenDialog({ type });
    setError("");
  }, []);

  const handleClose = useCallback(() => {
    setOpenDialog({ type: null });
    setAvatarFile(null);
    setPreview("");
    setError("");
    setIsSubmitting(false);
  }, []);

  const handleChange = useCallback((e) => {
    setFormValues((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(""); // Clear error when user starts typing
  }, []);

  // Enhanced file selection handler with better validation
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    setError("");

    if (file) {
      // Validate file type
      const allowedTypes = [
        "image/png",
        "image/jpg",
        "image/jpeg",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        setError("Please select a valid image file (PNG, JPG, JPEG, or WEBP)");
        e.target.value = "";
        return;
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setError("File is too large. Maximum size is 10MB");
        e.target.value = "";
        return;
      }

      // Check image dimensions (optional)
      const img = new Image();
      img.onload = function () {
        if (img.naturalWidth < 100 || img.naturalHeight < 100) {
          setError("Image too small. Minimum size is 100x100 pixels");
          e.target.value = "";
          return;
        }
        setAvatarFile(file);
      };
      img.src = URL.createObjectURL(file);
    }
  }, []);

  const handleSubmit = async () => {
    const validationError = validateForm(openDialog.type);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      let result;

      switch (openDialog.type) {
        case "avatar":
          result = await updateAvatar(avatarFile);
          break;
        case "username":
          result = await updateUsername(
            formValues.newUsername,
            formValues.currentPassword
          );
          break;
        case "email":
          result = await updateEmail(
            formValues.newEmail,
            formValues.currentPassword
          );
          break;
        case "password":
          result = await updatePassword(
            formValues.currentPassword,
            formValues.newPassword
          );
          break;
        default:
          throw new Error("Unknown dialog type");
      }

      if (result.success) {
        handleClose();
        // Reset form for non-avatar updates
        if (openDialog.type !== "avatar") {
          setFormValues((prev) => ({
            ...prev,
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
            newUsername: "",
            newEmail: "",
          }));
        }
      } else {
        setError(result.message || "Update failed");
      }
    } catch (err) {
      console.error("Update failed:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <Alert severity="error">
          User not found. Please try logging in again.
        </Alert>
      </Box>
    );
  }

  const avatarProps = avatarSrc ? { src: avatarSrc } : {};

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
            sx={{
              width: 100,
              height: 100,
              mx: "auto",
              mb: 2,
              border: "3px solid rgba(255,255,255,0.1)",
            }}
          >
            {!avatarSrc && user.username?.[0]?.toUpperCase()}
          </Avatar>
          <Typography variant="h5" gutterBottom>
            {user.username}
          </Typography>
          <Typography variant="subtitle1" gutterBottom color="text.secondary">
            {user.email}
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
              mt: 3,
              mb: 3,
            }}
          >
            {["avatar", "username", "email", "password"].map((type) => (
              <Button
                key={type}
                fullWidth
                variant="outlined"
                onClick={() => handleOpen(type)}
                disabled={isSubmitting}
                sx={{
                  borderColor: "rgba(255,255,255,0.3)",
                  color: "white",
                  "&:hover": {
                    borderColor: "rgba(255,255,255,0.5)",
                    bgcolor: "rgba(255,255,255,0.05)",
                  },
                }}
              >
                {type === "avatar"
                  ? "Update Avatar"
                  : type === "password"
                  ? "Change Password"
                  : `Update ${type.charAt(0).toUpperCase() + type.slice(1)}`}
              </Button>
            ))}
          </Box>

          <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
            My Teams
          </Typography>
          {userTeams.length > 0 ? (
            <Box sx={{ textAlign: "left" }}>
              {userTeams.map(({ team, role }) => (
                <Box
                  key={team._id}
                  onClick={() => navigate(`/teams/${team._id}`)}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 2,
                    px: 2,
                    mb: 1,
                    borderRadius: 1,
                    bgcolor: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.08)",
                      borderColor: "rgba(255,255,255,0.2)",
                    },
                  }}
                >
                  <Typography>{team.name}</Typography>
                  <Typography
                    sx={{
                      textTransform: "capitalize",
                      color: "primary.main",
                      fontWeight: 500,
                    }}
                  >
                    {role}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
              No teams found. Join or create a team to get started!
            </Typography>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!openDialog.type}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            bgcolor: "background.paper",
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          {openDialog.type === "avatar" && "Update Avatar"}
          {openDialog.type === "username" && "Update Username"}
          {openDialog.type === "email" && "Update Email"}
          {openDialog.type === "password" && "Change Password"}
        </DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {openDialog.type === "avatar" && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                py: 2,
              }}
            >
              <Avatar
                src={avatarSrc}
                sx={{
                  width: 120,
                  height: 120,
                  border: "3px solid rgba(255,255,255,0.1)",
                }}
              />
              <Button
                variant="contained"
                component="label"
                disabled={isSubmitting}
                sx={{ minWidth: 140 }}
              >
                Choose File
                <input
                  hidden
                  accept="image/*"
                  type="file"
                  onChange={handleFileSelect}
                />
              </Button>
              {avatarFile && (
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    Selected: {avatarFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Size: {(avatarFile.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </Box>
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textAlign: "center" }}
              >
                Recommended: Square image, minimum 100x100px, maximum 10MB
              </Typography>
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
                variant="outlined"
              />
              <TextField
                label="New Username"
                name="newUsername"
                fullWidth
                margin="normal"
                value={formValues.newUsername}
                onChange={handleChange}
                disabled={isSubmitting}
                variant="outlined"
                helperText="Username must be at least 3 characters long"
              />
              <TextField
                label="Current Password"
                name="currentPassword"
                type="password"
                fullWidth
                margin="normal"
                value={formValues.currentPassword}
                onChange={handleChange}
                disabled={isSubmitting}
                variant="outlined"
                helperText="Required to confirm your identity"
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
                variant="outlined"
              />
              <TextField
                label="New Email"
                name="newEmail"
                type="email"
                fullWidth
                margin="normal"
                value={formValues.newEmail}
                onChange={handleChange}
                disabled={isSubmitting}
                variant="outlined"
                helperText="Please enter a valid email address"
              />
              <TextField
                label="Current Password"
                name="currentPassword"
                type="password"
                fullWidth
                margin="normal"
                value={formValues.currentPassword}
                onChange={handleChange}
                disabled={isSubmitting}
                variant="outlined"
                helperText="Required to confirm your identity"
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
                onChange={handleChange}
                disabled={isSubmitting}
                variant="outlined"
              />
              <TextField
                label="New Password"
                name="newPassword"
                type="password"
                fullWidth
                margin="normal"
                value={formValues.newPassword}
                onChange={handleChange}
                disabled={isSubmitting}
                variant="outlined"
                helperText="Must be at least 8 characters with uppercase, lowercase, number, and special character"
              />
              <TextField
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                fullWidth
                margin="normal"
                value={formValues.confirmPassword}
                onChange={handleChange}
                disabled={isSubmitting}
                variant="outlined"
                helperText="Must match the new password"
              />
            </>
          )}
        </DialogContent>

        <DialogActions
          sx={{ p: 3, borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          <Button
            onClick={handleClose}
            disabled={isSubmitting}
            sx={{ minWidth: 80 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
            sx={{ minWidth: 120 }}
          >
            {isSubmitting ? "Updating..." : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

Profile.displayName = "Profile";

export default Profile;
