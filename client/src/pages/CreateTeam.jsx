import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Container,
  Box,
  Typography,
  Paper,
  Avatar,
  Stack,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

const getTeamInitials = (teamName) => {
  if (typeof teamName !== "string" || !teamName.trim()) return "";
  return teamName
    .trim()
    .split(/\s+/)
    .map((word) => word[0].toUpperCase())
    .slice(0, 2)
    .join("");
};

const CreateTeam = () => {
  const navigate = useNavigate();
  const { makeAuthenticatedRequest } = useAuth();

  const [name, setName] = useState("");
  const [game, setGame] = useState("");
  const [rank, setRank] = useState("");
  const [server, setServer] = useState("");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [gamesList, setGamesList] = useState([]);
  const [ranksList, setRanksList] = useState([]);
  const [serversList, setServersList] = useState([]);
  const [teamCode, setTeamCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        console.log("🎮 Fetching games from new endpoint...");
        const res = await fetch("http://localhost:4444/api/teams/games");
        console.log("🎮 Response status:", res.status);

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log("🎮 Received data:", data);

        if (Array.isArray(data)) {
          setGamesList(data);
          console.log("🎮 Games set successfully:", data.length);
        } else {
          console.error("🎮 Data is not an array:", data);
          setGamesList([]);
        }
      } catch (err) {
        console.error("Error fetching games:", err);
        setGamesList([]);
      }
    };
    fetchGames();
  }, []);

  const handleGameChange = (event) => {
    const selectedGameName = event.target.value;
    setGame(selectedGameName);
    const selectedGameObj = gamesList.find((g) => g.name === selectedGameName);
    setRanksList(selectedGameObj?.ranks || []);
    setServersList(selectedGameObj?.servers || []);
    setRank("");
    setServer("");
  };

  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setLogoPreview("");
  }, [logoFile]);

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }
    setLogoFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name || !game || !rank || !server) {
      alert("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("game", game);
      formData.append("rank", rank);
      formData.append("server", server);
      if (description) formData.append("description", description);
      if (logoFile) formData.append("logo", logoFile);

      // Use fetch directly instead of makeAuthenticatedRequest for FormData
      const response = await fetch("http://localhost:4444/api/teams/create", {
        method: "POST",
        credentials: "include", // Include cookies for authentication
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary
      });

      if (response && response.ok) {
        const team = await response.json();
        setTeamCode(team.teamCode);
        alert("Team created successfully!");
        setTimeout(() => navigate(`/teams/${team._id}`), 2000);
      } else if (response) {
        const data = await response.json();
        alert(data.message || "Failed to create team");
      }
    } catch (err) {
      console.error("Team creation error:", err);
      alert("Server error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper sx={{ padding: 4, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Create a New Team
        </Typography>
        <Box
          component="form"
          onSubmit={handleSubmit}
          display="flex"
          flexDirection="column"
          gap={2}
        >
          <Box>
            <Typography variant="h6" gutterBottom>
              Team Logo (Optional)
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={logoPreview}
                sx={{
                  width: 64,
                  height: 64,
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                }}
              >
                {getTeamInitials(name)}
              </Avatar>
              <Box>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  sx={{ mb: 1 }}
                  size="small"
                >
                  Upload Logo
                  <VisuallyHiddenInput
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                </Button>
                {logoFile && (
                  <Button
                    variant="text"
                    color="error"
                    onClick={() => setLogoFile(null)}
                    size="small"
                    sx={{ display: "block" }}
                  >
                    Remove Logo
                  </Button>
                )}
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ display: "block" }}
                >
                  Max 5MB, JPG/PNG/GIF
                </Typography>
              </Box>
            </Stack>
          </Box>

          <TextField
            label="Team Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            variant="filled"
            required
          />

          <TextField
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            variant="filled"
            multiline
            rows={2}
            placeholder="Tell us about your team..."
          />

          <FormControl fullWidth variant="filled" required>
            <InputLabel>Game</InputLabel>
            <Select value={game} onChange={handleGameChange}>
              <MenuItem value="">Select a Game</MenuItem>
              {gamesList.map((g) => (
                <MenuItem key={g._id || g.name} value={g.name}>
                  {g.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth variant="filled" required>
            <InputLabel>Rank</InputLabel>
            <Select
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              disabled={!game}
            >
              <MenuItem value="">Select a Rank</MenuItem>
              {ranksList.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth variant="filled" required>
            <InputLabel>Server</InputLabel>
            <Select
              value={server}
              onChange={(e) => setServer(e.target.value)}
              disabled={!game}
            >
              <MenuItem value="">Select a Server</MenuItem>
              {serversList.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting || !name || !game || !rank || !server}
          >
            {isSubmitting ? "Creating Team..." : "Create Team"}
          </Button>
        </Box>

        {teamCode && (
          <Box sx={{ mt: 4, p: 2, bgcolor: "background", borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Team Created Successfully! 🎉
            </Typography>
            <Typography variant="body1" gutterBottom>
              Your Team Code: <strong>{teamCode}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Share this code so others can join your team! Redirecting to your
              team page...
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default CreateTeam;
