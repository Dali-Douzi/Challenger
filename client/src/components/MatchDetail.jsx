import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";

/**
 * Props:
 * - fetchMatch: async function returning the match object
 * - saveMatch: async function accepting { scheduledAt, format, scoreA, scoreB }
 */
const MatchDetail = ({ fetchMatch, saveMatch }) => {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formValues, setFormValues] = useState({
    scheduledAt: "",
    format: "",
    scoreA: "",
    scoreB: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchMatch();
        setMatch(data);
        setFormValues({
          scheduledAt: data.scheduledAt
            ? data.scheduledAt.substring(0, 16)
            : "",
          format: data.format || "",
          scoreA: data.scoreA != null ? data.scoreA : "",
          scoreB: data.scoreB != null ? data.scoreB : "",
        });
      } catch (err) {
        setError(err.message || "Error loading match");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchMatch]);

  const handleChange = (field) => (e) => {
    setFormValues((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await saveMatch({
        scheduledAt: formValues.scheduledAt
          ? new Date(formValues.scheduledAt).toISOString()
          : undefined,
        format: formValues.format,
        scoreA:
          formValues.scoreA === "" ? undefined : Number(formValues.scoreA),
        scoreB:
          formValues.scoreB === "" ? undefined : Number(formValues.scoreB),
      });
      const updated = await fetchMatch();
      setMatch(updated);
      setFormValues({
        scheduledAt: updated.scheduledAt
          ? updated.scheduledAt.substring(0, 16)
          : "",
        format: updated.format || "",
        scoreA: updated.scoreA != null ? updated.scoreA : "",
        scoreB: updated.scoreB != null ? updated.scoreB : "",
      });
    } catch (err) {
      setError(err.message || "Error saving match");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Box mb={2}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      <Typography variant="h6">
        Match #{match.slot} — Phase {match.phaseIndex + 1}
      </Typography>

      <Stack spacing={3} mt={2}>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Typography>Team A: {match.teamA?.name || "TBD"}</Typography>
          <Typography>vs</Typography>
          <Typography>Team B: {match.teamB?.name || "TBD"}</Typography>
        </Stack>

        <TextField
          label="Scheduled At"
          type="datetime-local"
          fullWidth
          value={formValues.scheduledAt}
          onChange={handleChange("scheduledAt")}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          label="Format"
          fullWidth
          value={formValues.format}
          onChange={handleChange("format")}
        />

        <Stack direction="row" spacing={2}>
          <TextField
            label="Score A"
            type="number"
            fullWidth
            value={formValues.scoreA}
            onChange={handleChange("scoreA")}
          />
          <TextField
            label="Score B"
            type="number"
            fullWidth
            value={formValues.scoreB}
            onChange={handleChange("scoreB")}
          />
        </Stack>

        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </Stack>

      {match.status === "COMPLETED" && (
        <Box mt={4}>
          <Alert severity="success">
            Winner: {match.winner?.name || "TBD"}
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default MatchDetail;
