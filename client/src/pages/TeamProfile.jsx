import React, { useEffect, useState, useCallback } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useAuth } from "../context/AuthContext";
import MemberRow from "../components/MemberRow";

const getTeamInitials = (teamName) => {
  if (typeof teamName !== "string" || !teamName.trim()) return "";
  return teamName
    .trim()
    .split(/\s+/)
    .map((word) => word[0].toUpperCase())
    .slice(0, 2)
    .join("");
};

const TeamProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, makeAuthenticatedRequest } = useAuth();

  const [team, setTeam] = useState(null);
  const [availableRanks, setAvailableRanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyTooltip, setCopyTooltip] = useState("Copy join code");

  // Logo upload states
  const [openLogoDialog, setOpenLogoDialog] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await makeAuthenticatedRequest(
        `http://localhost:4444/api/teams/${id}`
      );
      if (res && res.ok) {
        const data = await res.json();
        setTeam(data);
        setAvailableRanks(data.availableRanks || []);
      } else if (res) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to load team");
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, makeAuthenticatedRequest]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  // Logo preview effect
  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setLogoPreview("");
  }, [logoFile]);

  const handleCopyJoinCode = async () => {
    try {
      await navigator.clipboard.writeText(team.teamCode);
      setCopyTooltip("Copied!");
      setTimeout(() => setCopyTooltip("Copy join code"), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      const textArea = document.createElement("textarea");
      textArea.value = team.teamCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopyTooltip("Copied!");
      setTimeout(() => setCopyTooltip("Copy join code"), 2000);
    }
  };

  // Determine the currently‐logged‐in user's membership by comparing IDs as strings
  const currentMember = team?.members.find((m) => {
    // If m.user is populated (an object), use m.user._id; otherwise m.user is already an ObjectId/string
    const memberId = m.user?._id ? m.user._id.toString() : m.user.toString();
    return memberId === user?.id;
  });
  const currentUserRole = currentMember?.role;
  const isTeamMember = !!currentMember;

  const canSeeTeamCode =
    user &&
    isTeamMember &&
    (currentUserRole === "owner" || currentUserRole === "manager");

  const canUploadLogo = user && isTeamMember && currentUserRole === "owner";

  const canDeleteTeam = user && isTeamMember && currentUserRole === "owner";

  const handleDeleteTeam = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this team? This cannot be undone."
      )
    ) {
      return;
    }
    try {
      const res = await makeAuthenticatedRequest(
        `http://localhost:4444/api/teams/${id}`,
        {
          method: "DELETE",
        }
      );
      if (res && !res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete team");
      }
      navigate("/teams");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", logoFile);

      // Use fetch directly instead of makeAuthenticatedRequest for FormData
      const res = await fetch(`http://localhost:4444/api/teams/${id}/logo`, {
        method: "PUT",
        credentials: "include", // Include cookies for authentication
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to upload logo");
      }

      // Refresh team data
      await fetchTeam();
      setOpenLogoDialog(false);
      setLogoFile(null);
    } catch (err) {
      console.error("Logo upload error:", err);
      alert(err.message);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!window.confirm("Are you sure you want to delete the team logo?")) {
      return;
    }

    try {
      const res = await makeAuthenticatedRequest(
        `http://localhost:4444/api/teams/${id}/logo`,
        {
          method: "DELETE",
        }
      );

      if (res && !res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete logo");
      }

      await fetchTeam();
    } catch (err) {
      console.error("Logo delete error:", err);
      alert(err.message);
    }
  };

  const handleCloseLogoDialog = () => {
    setOpenLogoDialog(false);
    setLogoFile(null);
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

  const teamInitials = getTeamInitials(team.name);
  const logoSrc = logoPreview || team.logo || null;

  return (
    <>
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
              <Avatar
                src={logoSrc}
                alt={team.name}
                sx={{
                  width: 80,
                  height: 80,
                  mr: 2,
                  fontSize: "2rem",
                  fontWeight: "bold",
                }}
              >
                {!logoSrc && teamInitials}
              </Avatar>
              <Box>
                <Typography variant="h4">{team.name}</Typography>
                {canSeeTeamCode && (
                  <Box
                    sx={{ display: "flex", alignItems: "center", mt: 1, mb: 1 }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ color: "white", mr: 1 }}
                    >
                      Join Code: <strong>{team.teamCode}</strong>
                    </Typography>
                    <Tooltip title={copyTooltip} arrow>
                      <IconButton
                        onClick={handleCopyJoinCode}
                        size="small"
                        sx={{
                          color: "white",
                          "&:hover": {
                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                          },
                        }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
                <Typography variant="subtitle1" color="textSecondary">
                  Game: {team.game?.name || team.game} | Rank: {team.rank} |
                  Server: {team.server}
                </Typography>

                {/* Logo Upload Section - Only for owners */}
                {canUploadLogo && (
                  <Box sx={{ mt: 2 }}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setOpenLogoDialog(true)}
                      >
                        {team.logo ? "Change Logo" : "Upload Logo"}
                      </Button>
                      {team.logo && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={handleDeleteLogo}
                        >
                          Delete Logo
                        </Button>
                      )}
                    </Stack>
                  </Box>
                )}
              </Box>
            </Box>

            {canDeleteTeam && (
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
              {Array.isArray(team.members) &&
                team.members
                  .filter((member) => member.user) // Filter out members with null user
                  .map((member) => (
                    <MemberRow
                      key={member.user._id}
                      member={member}
                      teamId={id}
                      currentUserRole={
                        user && isTeamMember ? currentUserRole : null
                      }
                      availableRanks={availableRanks}
                      onMemberChange={fetchTeam}
                    />
                  ))}
            </List>
          </Paper>
        </Box>
      </Container>

      {/* Logo Upload Dialog */}
      <Dialog open={openLogoDialog} onClose={handleCloseLogoDialog} fullWidth>
        <DialogTitle>Update Team Logo</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", mt: 2 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Avatar
              src={logoSrc}
              sx={{
                width: 80,
                height: 80,
                fontSize: "1.5rem",
                fontWeight: "bold",
              }}
            >
              {!logoSrc && teamInitials}
            </Avatar>
            <Button variant="contained" component="label">
              Choose File
              <input
                hidden
                accept="image/*"
                type="file"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    // Validate file type
                    if (!file.type.startsWith("image/")) {
                      alert("Please select an image file");
                      return;
                    }
                    // Validate file size (5MB)
                    if (file.size > 5 * 1024 * 1024) {
                      alert("File size must be less than 5MB");
                      return;
                    }
                    setLogoFile(file);
                  }
                }}
              />
            </Button>
            <Typography variant="caption" color="textSecondary">
              Supported formats: JPG, PNG, GIF. Max size: 5MB
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseLogoDialog}>Cancel</Button>
          <Button
            onClick={handleLogoUpload}
            variant="contained"
            disabled={!logoFile || logoUploading}
          >
            {logoUploading ? <CircularProgress size={20} /> : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TeamProfile;
