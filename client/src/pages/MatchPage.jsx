import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Stack,
} from "@mui/material";
import axios from "axios";

const MatchPage = () => {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [format, setFormat] = useState("");
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchMatch = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/matches/${id}`);
      setMatch(data);
      setScheduledAt(data.scheduledAt ? data.scheduledAt.substring(0, 16) : "");
      setFormat(data.format || "");
      setScoreA(data.scoreA != null ? data.scoreA : "");
      setScoreB(data.scoreB != null ? data.scoreB : "");
    } catch (err) {
      setError(err.response?.data?.message || "Error loading match");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatch();
  }, [id]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.put(`/matches/${id}`, {
        scheduledAt: scheduledAt
          ? new Date(scheduledAt).toISOString()
          : undefined,
        format,
        scoreA: scoreA === "" ? undefined : Number(scoreA),
        scoreB: scoreB === "" ? undefined : Number(scoreB),
      });
      await fetchMatch();
    } catch (err) {
      setError(err.response?.data?.message || "Error saving match");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ textAlign: "center", mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4, color:"white" }}>
      <Typography variant="h5" gutterBottom>
        Match #{match.slot} — Phase {match.phaseIndex + 1}
      </Typography>

      {/* Teams display */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          flexWrap: "wrap",
          mt: 2,
        }}
      >
        <Typography variant="subtitle1">
          Team A: {match.teamA?.name || "TBD"}
        </Typography>
        <Typography variant="subtitle2">vs</Typography>
        <Typography variant="subtitle1">
          Team B: {match.teamB?.name || "TBD"}
        </Typography>
      </Box>

      {/* Form for schedule, format, and scores */}
      <Box component="form" mt={4} noValidate autoComplete="off">
        <Stack spacing={3}>
          <TextField
            label="Scheduled At"
            type="datetime-local"
            fullWidth
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Format"
            fullWidth
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Score A"
              type="number"
              fullWidth
              value={scoreA}
              onChange={(e) => setScoreA(e.target.value)}
            />
            <TextField
              label="Score B"
              type="number"
              fullWidth
              value={scoreB}
              onChange={(e) => setScoreB(e.target.value)}
            />
          </Stack>
          <Box>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </Box>
        </Stack>
      </Box>

      {match.status === "COMPLETED" && (
        <Box mt={4}>
          <Alert severity="success">
            Winner: {match.winner?.name || "TBD"}
          </Alert>
        </Box>
      )}
    </Container>
  );
};

export default MatchPage;
