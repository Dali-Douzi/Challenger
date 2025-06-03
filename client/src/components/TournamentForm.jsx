import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  MenuItem,
  IconButton,
  Typography,
  CircularProgress,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import axios from "axios";

/**
 * @typedef {Object} Phase
 * @property {'SINGLE_ELIM'|'DOUBLE_ELIM'|'ROUND_ROBIN'|'SWISS_STAGE'|'WILD_CARD'} bracketType
 * @property {'PENDING'|'IN_PROGRESS'|'COMPLETE'} status
 */
/**
 * @typedef {Object} TournamentInput
 * @property {string} name
 * @property {string} description
 * @property {string} startDate
 * @property {string} game
 * @property {number} maxParticipants
 * @property {Phase[]} phases
 */
/**
 * @param {{ initialData?: Partial<TournamentInput & { _id?: string }>; onSubmit: (data: TournamentInput) => void }} props
 */
const TournamentForm = ({ initialData = {}, onSubmit }) => {
  const [name, setName] = useState(initialData.name || "");
  const [description, setDescription] = useState(initialData.description || "");
  const [startDate, setStartDate] = useState(
    initialData.startDate ? initialData.startDate.substring(0, 10) : ""
  );
  const [game, setGame] = useState(initialData.game || "");
  const [maxParticipants, setMaxParticipants] = useState(
    initialData.maxParticipants ?? ""
  );
  /** @type {[Phase[], React.Dispatch<React.SetStateAction<Phase[]>>]} */
  const [phases, setPhases] = useState(
    initialData.phases?.map((p) => ({
      bracketType: p.bracketType,
      status: p.status,
    })) || [{ bracketType: "SINGLE_ELIM", status: "PENDING" }]
  );

  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [gamesError, setGamesError] = useState("");

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const { data } = await axios.get("/api/games");
        setGames(data);
      } catch (err) {
        setGamesError(err.response?.data?.message || err.message);
      } finally {
        setLoadingGames(false);
      }
    };
    fetchGames();
  }, []);

  const handleAddPhase = () => {
    setPhases([...phases, { bracketType: "SINGLE_ELIM", status: "PENDING" }]);
  };

  const handleRemovePhase = (index) => {
    setPhases(phases.filter((_, i) => i !== index));
  };

  const handlePhaseChange = (index, field, value) => {
    const updated = phases.map((phase, i) =>
      i === index ? { ...phase, [field]: value } : phase
    );
    setPhases(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      startDate,
      game,
      maxParticipants: Number(maxParticipants),
      phases,
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Name */}
      <Box sx={{ mb: 2 }}>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          required
        />
      </Box>

      {/* Description */}
      <Box sx={{ mb: 2 }}>
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          rows={3}
          required
        />
      </Box>

      {/* Start Date */}
      <Box sx={{ mb: 2 }}>
        <TextField
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          required
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        {loadingGames ? (
          <Box sx={{ textAlign: "center", py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <TextField
            select
            label="Game"
            value={game}
            onChange={(e) => setGame(e.target.value)}
            fullWidth
            required
            error={!!gamesError}
            helperText={gamesError}
          >
            {games.map((g) => (
              <MenuItem key={g._id} value={g.name}>
                {g.name}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>

      <Box sx={{ mb: 2 }}>
        <TextField
          label="Max Participants"
          type="number"
          value={maxParticipants}
          onChange={(e) => setMaxParticipants(e.target.value)}
          fullWidth
          required
          inputProps={{ min: 2 }}
        />
      </Box>

      {/* Phases */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Phases
        </Typography>
        {phases.map((phase, idx) => (
          <Box key={idx} sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <TextField
              select
              label="Bracket Type"
              value={phase.bracketType}
              onChange={(e) =>
                handlePhaseChange(idx, "bracketType", e.target.value)
              }
              sx={{ flexGrow: 1 }}
              required
            >
              <MenuItem value="SINGLE_ELIM">Single Elimination</MenuItem>
              <MenuItem value="DOUBLE_ELIM">Double Elimination</MenuItem>
              <MenuItem value="ROUND_ROBIN">Round Robin</MenuItem>
              <MenuItem value="SWISS_STAGE">Swiss Stage</MenuItem>
              <MenuItem value="WILD_CARD">WildCard</MenuItem>
            </TextField>
            <IconButton
              color="error"
              onClick={() => handleRemovePhase(idx)}
              sx={{ ml: 1 }}
            >
              <Delete />
            </IconButton>
          </Box>
        ))}
        <Button variant="outlined" startIcon={<Add />} onClick={handleAddPhase}>
          Add Phase
        </Button>
      </Box>

      {/* Submit */}
      <Box sx={{ mt: 4 }}>
        <Button type="submit" variant="contained" fullWidth>
          {initialData._id ? "Update Tournament" : "Create Tournament"}
        </Button>
      </Box>
    </Box>
  );
};

export default TournamentForm;
