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
import Navbar from "../components/Navbar";

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

// Helper to get team name initials
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
  const [name, setName] = useState("");
  const [game, setGame] = useState("");
  const [rank, setRank] = useState("");
  const [server, setServer] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [gamesList, setGamesList] = useState([]);
  const [ranksList, setRanksList] = useState([]);
  const [serversList, setServersList] = useState([]);
  const [teamCode, setTeamCode] = useState("");

  useEffect(() => {
    // Fetch available games
    const fetchGames = async () => {
      try {
        const res = await fetch("http://localhost:4444/api/games");
        const data = await res.json();
        setGamesList(data);
      } catch (err) {
        console.error("Error fetching games:", err);
      }
    };
    fetchGames();
  }, []);

  // Logo preview effect
  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setLogoPreview("");
  }, [logoFile]);

  const handleGameChange = (event) => {
    const selectedGame = event.target.value;
    setGame(selectedGame);
    const selectedGameObj = gamesList.find((g) => g.name === selectedGame);
    setRanksList(selectedGameObj?.ranks || []);
    setServersList(selectedGameObj?.servers || []);
    setRank("");
    setServer("");
  };

  const handleServerChange = (event) => {
    setServer(event.target.value);
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

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
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const token = localStorage.getItem("token");

    try {
      let response;

      if (logoFile) {
        // Use FormData when logo is included
        const formData = new FormData();
        formData.append("name", name);
        formData.append("game", game);
        formData.append("rank", rank);
        formData.append("server", server);
        formData.append("logo", logoFile);

        response = await fetch("http://localhost:4444/api/teams/create", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
      } else {
        // Use JSON when no logo
        const teamData = { name, game, rank, server };
        response = await fetch("http://localhost:4444/api/teams/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(teamData),
        });
      }

      if (response.ok) {
        const team = await response.json();
        setTeamCode(team.teamCode);
        alert("Team created successfully!");
      } else {
        const data = await response.json();
        alert(data.message || "Failed to create team");
      }
    } catch (err) {
      console.error("Team creation error:", err);
      alert("Server error");
    }
  };

  const teamInitials = getTeamInitials(name);

  return (
    <>
      <Navbar />
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
            {/* Team Logo Section */}
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
                  {teamInitials}
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
                      onClick={handleRemoveLogo}
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

            <FormControl fullWidth variant="filled" required>
              <InputLabel id="game-label">Game</InputLabel>
              <Select
                labelId="game-label"
                id="game-select"
                value={game}
                label="Game"
                onChange={handleGameChange}
              >
                <MenuItem value="">Select a Game</MenuItem>
                {gamesList.map((g) => (
                  <MenuItem key={g.name} value={g.name}>
                    {g.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth variant="filled" required>
              <InputLabel id="rank-label">Rank</InputLabel>
              <Select
                labelId="rank-label"
                id="rank-select"
                value={rank}
                label="Rank"
                onChange={(e) => setRank(e.target.value)}
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
              <InputLabel id="server-label">Server</InputLabel>
              <Select
                labelId="server-label"
                id="server-select"
                value={server}
                label="Server"
                onChange={handleServerChange}
              >
                <MenuItem value="">Select a Server</MenuItem>
                {serversList.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button type="submit" variant="contained" color="primary">
              Create Team
            </Button>
          </Box>

          {teamCode && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6">Your Team Code: {teamCode}</Typography>
              <Typography>
                Share this code with others to let them join your team!
              </Typography>
            </Box>
          )}
        </Paper>
      </Container>
    </>
  );
};

export default CreateTeam;
