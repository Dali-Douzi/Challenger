import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  IconButton,
  Chip,
  Divider,
  Paper,
  Stack,
} from "@mui/material";
import {
  CameraAlt,
  Person,
  Email,
  Lock,
  Groups,
  Edit,
  Verified,
} from "@mui/icons-material";
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
  const [dominantColors, setDominantColors] = useState({
    primary: "rgba(25, 118, 210, 0.08)",
    secondary: "rgba(156, 39, 176, 0.08)",
  });

  // Fetch user teams
  useEffect(() => {
    if (user) {
      fetch("http://localhost:4444/api/teams/my", {
        credentials: "include",
      })
        .then((res) => {
          if (!res.ok) {
            const error = new Error("Failed to fetch teams");
            throw error;
          }
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

  // Memoized avatar source
  const avatarSrc = useMemo(() => {
    if (preview) return preview;
    if (user?.avatar) return user.avatar;
    return null;
  }, [preview, user?.avatar]);

  // Extract dominant colors from avatar
  const extractColorsFromImage = useCallback((imageSrc) => {
    if (!imageSrc) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        ).data;

        // Advanced dominant color extraction
        const colorMap = {};
        const tolerance = 40; // Group similar colors more aggressively

        for (let i = 0; i < imageData.length; i += 16) {
          // Sample every 4th pixel for performance
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const alpha = imageData[i + 3];

          if (alpha < 128) continue; // Skip transparent pixels

          // Skip very dark or very light colors for better gradients
          const brightness = (r + g + b) / 3;
          if (brightness < 30 || brightness > 225) continue;

          // Group similar colors with tolerance
          const key = `${Math.floor(r / tolerance) * tolerance},${
            Math.floor(g / tolerance) * tolerance
          },${Math.floor(b / tolerance) * tolerance}`;
          colorMap[key] = (colorMap[key] || 0) + 1;
        }

        // Get top 2 most dominant colors
        const sortedColors = Object.entries(colorMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 2);

        if (sortedColors.length >= 2) {
          // Extract both dominant colors
          const color1 = sortedColors[0][0]; // Most dominant
          const color2 = sortedColors[1][0]; // Second most dominant

          setDominantColors({
            primary: `rgba(${color1}, 0.15)`, // Slightly more opacity for primary
            secondary: `rgba(${color2}, 0.10)`, // Less opacity for secondary
          });
        } else if (sortedColors.length === 1) {
          // Fallback: use single color with different opacities
          const color1 = sortedColors[0][0];
          setDominantColors({
            primary: `rgba(${color1}, 0.15)`,
            secondary: `rgba(${color1}, 0.08)`,
          });
        }
      } catch (error) {
        console.log("Color extraction failed, using default colors");
        // Keep default colors on error
      }
    };
    img.src = imageSrc;
  }, []);

  // Extract colors when avatar changes
  useEffect(() => {
    if (avatarSrc && avatarSrc.startsWith("http")) {
      extractColorsFromImage(avatarSrc);
    }
  }, [avatarSrc, extractColorsFromImage]);

  // Validation functions
  const validateForm = useCallback(
    (type) => {
      if (!formValues.currentPassword) {
        return "Current password is required";
      }

      switch (type) {
        case "username":
          if (!formValues.newUsername.trim()) return "New username is required";
          if (formValues.newUsername.length < 3)
            return "Username must be at least 3 characters long";
          break;
        case "email":
          if (!formValues.newEmail.trim()) return "New email is required";
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(formValues.newEmail))
            return "Please enter a valid email address";
          break;
        case "password":
          if (!formValues.newPassword) return "New password is required";
          if (formValues.newPassword.length < 8)
            return "New password must be at least 8 characters long";
          if (formValues.newPassword !== formValues.confirmPassword)
            return "New passwords do not match";
          break;
        case "avatar":
          if (!avatarFile) return "Please select a file first";
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
    setError("");
  }, []);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    setError("");

    if (file) {
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

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setError("File is too large. Maximum size is 10MB");
        e.target.value = "";
        return;
      }

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
          // Avatar update now requires current password
          result = await updateAvatar(avatarFile, formValues.currentPassword);
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
          const error = new Error("Unknown dialog type");
          throw error;
      }

      if (result.success) {
        handleClose();
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

  const getRoleColor = (role) => {
    switch (role) {
      case "owner":
        return "error";
      case "manager":
        return "warning";
      case "player":
        return "primary";
      case "substitute":
        return "secondary";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress size={50} thickness={4} />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ maxWidth: 600, mx: "auto", mt: 8, p: 2 }}>
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          User not found. Please try logging in again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: 3, minHeight: "100vh" }}>
      {/* Profile Header Card */}
      <Card
        elevation={6}
        sx={{
          mb: 4,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${dominantColors.primary} 0%, ${dominantColors.secondary} 100%)`,
          border: "1px solid rgba(255, 255, 255, 0.1)",
          overflow: "visible",
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            {/* Avatar Section with Floating Edit Button */}
            <Box sx={{ position: "relative", mb: 3 }}>
              <Avatar
                src={avatarSrc}
                sx={{
                  width: 140,
                  height: 140,
                  border: "6px solid",
                  borderColor: "background.paper",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
                  fontSize: "3rem",
                  fontWeight: 700,
                }}
              >
                {!avatarSrc && user.username?.[0]?.toUpperCase()}
              </Avatar>

              <IconButton
                onClick={() => handleOpen("avatar")}
                sx={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  backgroundColor: "primary.main",
                  color: "white",
                  width: 48,
                  height: 48,
                  boxShadow: 4,
                  "&:hover": {
                    backgroundColor: "primary.dark",
                    transform: "scale(1.1)",
                  },
                  transition: "all 0.2s ease",
                }}
              >
                <CameraAlt />
              </IconButton>
            </Box>

            {/* User Info */}
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  mb: 1,
                }}
              >
                <Typography variant="h3" fontWeight="bold" color="text.primary">
                  {user.username}
                </Typography>
                <Verified color="primary" sx={{ fontSize: 28 }} />
              </Box>

              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ mb: 2, opacity: 0.8 }}
              >
                {user.email}
              </Typography>
            </Box>

            {/* Action Buttons */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                gap: 2,
                maxWidth: 500,
                width: "100%",
              }}
            >
              {[
                { type: "username", icon: <Person />, label: "Username" },
                { type: "email", icon: <Email />, label: "Email" },
                { type: "password", icon: <Lock />, label: "Password" },
              ].map(({ type, icon, label }) => (
                <Button
                  key={type}
                  fullWidth
                  variant="outlined"
                  startIcon={icon}
                  onClick={() => handleOpen(type)}
                  disabled={isSubmitting}
                  sx={{
                    py: 1.5,
                    borderRadius: 3,
                    borderWidth: 2,
                    fontWeight: 600,
                    textTransform: "none",
                    "&:hover": {
                      borderWidth: 2,
                      transform: "translateY(-2px)",
                      boxShadow: 3,
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  {label}
                </Button>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Teams Section */}
      <Card
        elevation={6}
        sx={{ borderRadius: 4, border: "1px solid rgba(255, 255, 255, 0.1)" }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Groups color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h4" fontWeight="bold">
              My Teams
            </Typography>
            <Chip label={userTeams.length} color="primary" size="small" />
          </Box>

          <Divider sx={{ mb: 3, opacity: 0.6 }} />

          {userTeams.length > 0 ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                },
                gap: 3,
              }}
            >
              {userTeams.map(({ team, role }) => (
                <Paper
                  key={team._id}
                  elevation={3}
                  onClick={() => navigate(`/teams/${team._id}`)}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: 6,
                      borderColor: "primary.main",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                    }}
                  >
                    <Avatar
                      src={team.logo}
                      sx={{
                        width: 64,
                        height: 64,
                        mb: 2,
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      }}
                    >
                      {team.name[0]?.toUpperCase()}
                    </Avatar>

                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {team.name}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {team.game?.name || "Unknown Game"}
                    </Typography>

                    <Chip
                      label={role}
                      color={getRoleColor(role)}
                      variant="filled"
                      size="small"
                      sx={{
                        textTransform: "capitalize",
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </Paper>
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
              <Groups sx={{ fontSize: 80, opacity: 0.3, mb: 3 }} />
              <Typography variant="h5" gutterBottom fontWeight="600">
                No Teams Yet
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Join or create a team to start your competitive journey!
              </Typography>
              <Button
                variant="contained"
                size="large"
                sx={{ borderRadius: 3, px: 4 }}
                onClick={() => navigate("/teams")}
              >
                Explore Teams
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Dialogs */}
      <Dialog
        open={!!openDialog.type}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 4,
            border: "1px solid rgba(255, 255, 255, 0.1)",
          },
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            gap: 2,
            py: 3,
          }}
        >
          {openDialog.type === "avatar" && (
            <>
              <CameraAlt color="primary" />
              <Typography variant="h6" fontWeight="bold">
                Update Avatar
              </Typography>
            </>
          )}
          {openDialog.type === "username" && (
            <>
              <Person color="primary" />
              <Typography variant="h6" fontWeight="bold">
                Update Username
              </Typography>
            </>
          )}
          {openDialog.type === "email" && (
            <>
              <Email color="primary" />
              <Typography variant="h6" fontWeight="bold">
                Update Email
              </Typography>
            </>
          )}
          {openDialog.type === "password" && (
            <>
              <Lock color="primary" />
              <Typography variant="h6" fontWeight="bold">
                Change Password
              </Typography>
            </>
          )}
        </DialogTitle>

        <DialogContent sx={{ p: 4, pt: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {openDialog.type === "avatar" && (
            <Stack spacing={3} alignItems="center" sx={{ mt: 2 }}>
              <TextField
                label="Current Password"
                name="currentPassword"
                type="password"
                value={formValues.currentPassword}
                onChange={handleChange}
                disabled={isSubmitting}
                fullWidth
                variant="outlined"
                helperText="Required to confirm your identity"
                autoComplete="off"
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2 },
                }}
              />

              <Avatar
                src={avatarSrc}
                sx={{
                  width: 120,
                  height: 120,
                  border: "4px solid",
                  borderColor: "divider",
                  boxShadow: 2,
                  mt: 2,
                }}
              >
                {user.username?.[0]?.toUpperCase()}
              </Avatar>

              <Button
                variant="contained"
                component="label"
                disabled={isSubmitting}
                startIcon={<CameraAlt />}
                sx={{
                  minWidth: 160,
                  py: 1.5,
                  borderRadius: 3,
                  fontWeight: 600,
                }}
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
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    bgcolor: "action.hover",
                    borderRadius: 2,
                    width: "100%",
                    textAlign: "center",
                  }}
                >
                  <Typography variant="body2" fontWeight="600">
                    Selected: {avatarFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Size: {(avatarFile.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </Paper>
              )}

              <Typography
                variant="caption"
                color="text.secondary"
                textAlign="center"
                sx={{ px: 2 }}
              >
                Recommended: Square image, minimum 100×100px, maximum 10MB
              </Typography>
            </Stack>
          )}

          {openDialog.type === "username" && (
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                label="Current Password"
                name="currentPassword"
                type="password"
                value={formValues.currentPassword}
                onChange={handleChange}
                disabled={isSubmitting}
                fullWidth
                variant="outlined"
                helperText="Required to confirm your identity"
                autoComplete="off"
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2 },
                }}
              />

              <TextField
                label="Current Username"
                value={formValues.currentUsername}
                disabled
                fullWidth
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2 },
                  "& .MuiInputBase-input.Mui-disabled": {
                    WebkitTextFillColor: "rgba(255, 255, 255, 0.6)",
                  },
                }}
              />

              <TextField
                label="New Username"
                name="newUsername"
                value={formValues.newUsername}
                onChange={handleChange}
                disabled={isSubmitting}
                fullWidth
                variant="outlined"
                helperText="Username must be at least 3 characters long"
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2 },
                  "& .MuiFormHelperText-root": {
                    marginTop: 1,
                    fontSize: "0.75rem",
                  },
                }}
              />
            </Stack>
          )}

          {openDialog.type === "email" && (
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                label="Current Password"
                name="currentPassword"
                type="password"
                value={formValues.currentPassword}
                onChange={handleChange}
                disabled={isSubmitting}
                fullWidth
                variant="outlined"
                helperText="Required to confirm your identity"
                autoComplete="off"
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2 },
                }}
              />

              <TextField
                label="Current Email"
                value={formValues.currentEmail}
                disabled
                fullWidth
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2 },
                  "& .MuiInputBase-input.Mui-disabled": {
                    WebkitTextFillColor: "rgba(255, 255, 255, 0.6)",
                  },
                }}
              />

              <TextField
                label="New Email"
                name="newEmail"
                type="email"
                value={formValues.newEmail}
                onChange={handleChange}
                disabled={isSubmitting}
                fullWidth
                variant="outlined"
                helperText="Please enter a valid email address"
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2 },
                  "& .MuiFormHelperText-root": {
                    marginTop: 1,
                    fontSize: "0.75rem",
                  },
                }}
              />
            </Stack>
          )}

          {openDialog.type === "password" && (
            <Stack spacing={3} sx={{ mt: 2 }}>
              <TextField
                label="Current Password"
                name="currentPassword"
                type="password"
                value={formValues.currentPassword}
                onChange={handleChange}
                disabled={isSubmitting}
                fullWidth
                variant="outlined"
                autoComplete="off"
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2 },
                }}
              />

              <TextField
                label="New Password"
                name="newPassword"
                type="password"
                value={formValues.newPassword}
                onChange={handleChange}
                disabled={isSubmitting}
                fullWidth
                variant="outlined"
                helperText="Must be at least 8 characters long"
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2 },
                  "& .MuiFormHelperText-root": {
                    marginTop: 1,
                    fontSize: "0.75rem",
                  },
                }}
              />

              <TextField
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={formValues.confirmPassword}
                onChange={handleChange}
                disabled={isSubmitting}
                fullWidth
                variant="outlined"
                helperText="Must match the new password"
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: 2 },
                  "& .MuiFormHelperText-root": {
                    marginTop: 1,
                    fontSize: "0.75rem",
                  },
                }}
              />
            </Stack>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            p: 3,
            pt: 2,
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            gap: 2,
          }}
        >
          <Button
            onClick={handleClose}
            disabled={isSubmitting}
            sx={{
              minWidth: 100,
              borderRadius: 2,
              py: 1.2,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={18} /> : null}
            sx={{
              minWidth: 140,
              borderRadius: 2,
              fontWeight: 600,
              py: 1.2,
            }}
          >
            {isSubmitting ? "Updating..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

Profile.displayName = "Profile";

export default Profile;
