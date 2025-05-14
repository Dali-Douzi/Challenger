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
} from "@mui/material";

const CreateTeam = () => {
  const [name, setName] = useState("");
  const [game, setGame] = useState("");
  const [rank, setRank] = useState("");
  const [gamesList, setGamesList] = useState([]);
  const [ranksList, setRanksList] = useState([]);
  const [teamCode, setTeamCode] = useState("");

  useEffect(() => {
    // Fetch available games and ranks
    const fetchGames = async () => {
      const res = await fetch("http://localhost:4444/api/games");
      const data = await res.json();
      setGamesList(data); // assuming data is an array of games
    };

    fetchGames();
  }, []);

  const handleGameChange = (event) => {
    const selectedGame = event.target.value;
    setGame(selectedGame);

    // Find the ranks corresponding to the selected game
    const selectedGameObj = gamesList.find((g) => g.name === selectedGame);
    setRanksList(selectedGameObj ? selectedGameObj.ranks : []);
    setRank(""); // Reset rank when game changes
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const teamData = { name, game, rank };

    const token = localStorage.getItem("token");

    try {
      const res = await fetch("http://localhost:4444/api/teams/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(teamData),
      });

      if (res.ok) {
        const team = await res.json();
        setTeamCode(team.teamCode); // Set the generated team code
        alert("Team created successfully!");
      } else {
        const data = await res.json();
        alert(data.message || "Failed to create team");
      }
    } catch (err) {
      console.error("Team creation error:", err);
      alert("Server error");
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
          <TextField
            label="Team Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            fullWidth
            variant="filled"
          />

          <FormControl fullWidth variant="filled">
            <InputLabel>Game</InputLabel>
            <Select value={game} onChange={handleGameChange}>
              <MenuItem value="">Select a Game</MenuItem>
              {gamesList.map((g) => (
                <MenuItem key={g.name} value={g.name}>
                  {g.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth variant="filled">
            <InputLabel>Rank</InputLabel>
            <Select
              value={rank}
              onChange={(event) => setRank(event.target.value)}
            >
              <MenuItem value="">Select a Rank</MenuItem>
              {ranksList.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
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
  );
};

export default CreateTeam;
