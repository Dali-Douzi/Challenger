// @ts-check

import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  MenuItem,
  IconButton,
  Typography,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";

/**
 * @typedef {{ bracketType: 'SINGLE_ELIM'|'DOUBLE_ELIM'|'ROUND_ROBIN' }} Phase
 * @typedef {Object} TournamentInput
 * @property {string} name
 * @property {string} description
 * @property {number} maxParticipants
 * @property {Phase[]} phases
 * @typedef {Object} InitialData
 * @property {string} [name]
 * @property {string} [description]
 * @property {number} [maxParticipants]
 * @property {Phase[]} [phases]
 * @property {string} [_id]
 */

const bracketTypes = [
  { value: "SINGLE_ELIM", label: "Single Elimination" },
  { value: "DOUBLE_ELIM", label: "Double Elimination" },
  { value: "ROUND_ROBIN", label: "Round Robin" },
];

/**
 * @param {{ initialData?: InitialData, onSubmit: (data: TournamentInput) => void }} props
 */
const TournamentForm = ({ initialData = {}, onSubmit }) => {
  const [name, setName] = useState(initialData.name || "");
  const [description, setDescription] = useState(initialData.description || "");
  const [maxParticipants, setMaxParticipants] = useState(
    initialData.maxParticipants ?? ""
  );

  /** @type {Phase[]} */
  const initialPhases =
    Array.isArray(initialData.phases) && initialData.phases.length
      ? initialData.phases.map((p) => ({
          // cast to union type
          bracketType: /** @type {Phase['bracketType']} */ (p.bracketType),
        }))
      : [{ bracketType: "SINGLE_ELIM" }];

  const [phases, setPhases] = useState(initialPhases);

  const addPhase = () => {
    setPhases([...phases, { bracketType: "SINGLE_ELIM" }]);
  };

  const removePhase = (index) => {
    setPhases(phases.filter((_, idx) => idx !== index));
  };

  const updatePhaseType = (index, value) => {
    const typed = /** @type {Phase['bracketType']} */ (value);
    setPhases(
      phases.map((phase, idx) =>
        idx === index ? { ...phase, bracketType: typed } : phase
      )
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      maxParticipants: Number(maxParticipants),
      phases,
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 2 }}>
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        fullWidth
        margin="normal"
      />
      <TextField
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
        fullWidth
        margin="normal"
        multiline
        rows={3}
      />
      <TextField
        label="Max Participants"
        type="number"
        value={maxParticipants}
        onChange={(e) => setMaxParticipants(e.target.value)}
        required
        fullWidth
        margin="normal"
        inputProps={{ min: 2 }}
      />

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6">Phases</Typography>
        {phases.map((phase, idx) => (
          <Box
            key={idx}
            sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}
          >
            <TextField
              select
              label={`Phase ${idx + 1} Type`}
              value={phase.bracketType}
              onChange={(e) => updatePhaseType(idx, e.target.value)}
              fullWidth
            >
              {bracketTypes.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            {phases.length > 1 && (
              <IconButton onClick={() => removePhase(idx)}>
                <Delete />
              </IconButton>
            )}
          </Box>
        ))}
        <Button startIcon={<Add />} onClick={addPhase} sx={{ mt: 2 }}>
          Add Phase
        </Button>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Button type="submit" variant="contained" fullWidth>
          {initialData._id ? "Update Tournament" : "Create Tournament"}
        </Button>
      </Box>
    </Box>
  );
};

export default TournamentForm;
