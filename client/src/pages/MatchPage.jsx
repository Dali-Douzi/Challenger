import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from "@mui/material";
import axios from "axios";
import DateTimePicker from "../components/DateTimePicker";
import useGameFormats from "../hooks/useGameFormats"; // Import the custom hook

const MatchPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [format, setFormat] = useState("");
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [saving, setSaving] = useState(false);

  // Use the custom hook to get game formats
  const { formats, loading: formatsLoading, error: formatsError } = useGameFormats();

  const fetchMatch = async () => {
    try {
      setLoading(true);
      setError("");
      
      const { data } = await axios.get(`/api/matches/${id}`);
      setMatch(data);
      
      // Correction for scheduledAt - handle datetime-local format
      if (data.scheduledAt) {
        const date = new Date(data.scheduledAt);
        // Format YYYY-MM-DDTHH:mm for datetime-local input
        setScheduledAt(date.toISOString().slice(0, 16));
      } else {
        setScheduledAt("");
      }
      
      setFormat(data.format || "");
      setScoreA(data.scoreA != null ? data.scoreA : "");
      setScoreB(data.scoreB != null ? data.scoreB : "");
    } catch (err) {
      console.error("Error fetching match:", err);
      
      if (err.response?.status === 404) {
        setError("Match not found. The match ID might be invalid.");
      } else if (err.response?.status === 403) {
        setError("Access denied. You must be an organizer or referee to view this match.");
      } else if (err.response?.status === 401) {
        setError("Authentication required. Please log in.");
        // Optionally redirect to login
        // navigate("/login");
      } else {
        setError(err.response?.data?.message || "Error loading match");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchMatch();
    } else {
      setError("No match ID provided");
      setLoading(false);
    }
  }, [id]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      
      // Validation
      const errors = [];
      
      if (!scheduledAt) {
        errors.push("Match schedule is required");
      }
      
      if (!format.trim()) {
        errors.push("Match format is required");
      }
      
      if (scoreA !== "" && (isNaN(Number(scoreA)) || Number(scoreA) < 0)) {
        errors.push("Score A must be a valid non-negative number");
      }
      
      if (scoreB !== "" && (isNaN(Number(scoreB)) || Number(scoreB) < 0)) {
        errors.push("Score B must be a valid non-negative number");
      }
      
      // If both scores are provided, ensure they're not the same (unless 0-0)
      if (scoreA !== "" && scoreB !== "" && scoreA === scoreB && Number(scoreA) !== 0) {
        errors.push("Scores cannot be tied (except 0-0 for unplayed matches)");
      }
      
      if (errors.length > 0) {
        setError(errors.join(". "));
        return;
      }
      
      const payload = {
        scheduledAt: scheduledAt
          ? new Date(scheduledAt).toISOString()
          : undefined,
        format: format.trim(),
        scoreA: scoreA === "" ? undefined : Number(scoreA),
        scoreB: scoreB === "" ? undefined : Number(scoreB),
      };
      
      await axios.put(`/api/matches/${id}`, payload);
      
      // Redirect back to tournament page after successful save
      if (match?.tournament) {
        // Show brief success message before redirect
        setError("");
        navigate(`/tournaments/${match.tournament}`, {
          state: { successMessage: "Match updated successfully!" }
        });
      } else {
        // Fallback: refresh data if tournament ID not available
        await fetchMatch();
      }
    } catch (err) {
      console.error("Error saving match:", err);
      setError(err.response?.data?.message || "Error saving match");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ textAlign: "center", mt: 4 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2, color: "white" }}>Loading match...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Container>
    );
  }

  if (!match) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="warning">
          No match data available
        </Alert>
      </Container>
    );
  }

  const matchNumber = match.slot || "Unknown";
  const phaseIndex = match.phaseIndex !== undefined ? match.phaseIndex : 0;

  return (
    <Container sx={{ py: 4, color:"white" }}>
      {/* Back Button */}
      {match?.tournament && (
        <Box sx={{ mb: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => navigate(`/tournaments/${match.tournament}`)}
            sx={{ color: "white", borderColor: "white" }}
          >
            ← Back to Tournament
          </Button>
        </Box>
      )}

      <Typography variant="h5" gutterBottom>
        Match #{matchNumber} — Phase {phaseIndex + 1}
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

      {/* Debug info */}
      <Box sx={{ mt: 2, p: 2, bgcolor: "rgba(255,255,255,0.1)", borderRadius: 1 }}>
        <Typography variant="caption" display="block">
          Debug info:
        </Typography>
        <Typography variant="caption" display="block">
          Match ID: {match._id}
        </Typography>
        <Typography variant="caption" display="block">
          Tournament ID: {match.tournament}
        </Typography>
        <Typography variant="caption" display="block">
          Slot: {match.slot}
        </Typography>
        <Typography variant="caption" display="block">
          Phase Index: {match.phaseIndex}
        </Typography>
        <Typography variant="caption" display="block">
          Team A: {match.teamA ? `${match.teamA.name} (${match.teamA._id})` : "null"}
        </Typography>
        <Typography variant="caption" display="block">
          Team B: {match.teamB ? `${match.teamB.name} (${match.teamB._id})` : "null"}
        </Typography>
        <Typography variant="caption" display="block">
          Status: {match.status}
        </Typography>
      </Box>

      {/* Form for schedule, format, and scores */}
      <Box component="form" mt={4} noValidate autoComplete="off">
        <Stack spacing={3}>
          <DateTimePicker
            label="Match Schedule"
            value={scheduledAt}
            onChange={(newValue) => setScheduledAt(newValue)}
            required={true}
            error={!scheduledAt && error.includes("schedule")}
            helperText={!scheduledAt && error.includes("schedule") 
              ? "Match schedule is required" 
              : "Select when this match will be played"
            }
            minDateTime={new Date().toISOString()}
            disabled={false}
          />
          
          {/* Updated Format field - now using dropdown */}
          <FormControl 
            fullWidth 
            required 
            error={!format.trim() && error.includes("format")}
            disabled={formatsLoading}
          >
            <InputLabel id="format-select-label">Match Format *</InputLabel>
            <Select
              labelId="format-select-label"
              value={format}
              label="Match Format *"
              onChange={(e) => setFormat(e.target.value)}
              sx={{
                '& .MuiSelect-select': {
                  color: 'white',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.23)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
              }}
            >
              {formatsLoading ? (
                <MenuItem disabled>
                  Loading formats...
                </MenuItem>
              ) : formatsError ? (
                <MenuItem disabled>
                  Error loading formats
                </MenuItem>
              ) : formats.length === 0 ? (
                <MenuItem disabled>
                  No formats available
                </MenuItem>
              ) : (
                formats.map((formatOption) => (
                  <MenuItem key={formatOption} value={formatOption}>
                    {formatOption}
                  </MenuItem>
                ))
              )}
            </Select>
            <FormHelperText>
              {!format.trim() && error.includes("format") 
                ? "Match format is required" 
                : formatsError 
                  ? `Error loading formats: ${formatsError}`
                  : "Select the match format (e.g., Best of 3)"
              }
            </FormHelperText>
          </FormControl>
          
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, color: "text.primary" }}>
              Match Scores (Optional)
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                label={`Score - ${match?.teamA?.name || "Team A"}`}
                type="number"
                fullWidth
                value={scoreA}
                onChange={(e) => setScoreA(e.target.value)}
                inputProps={{ min: 0, step: 1 }}
                error={scoreA !== "" && (isNaN(Number(scoreA)) || Number(scoreA) < 0)}
                helperText={scoreA !== "" && (isNaN(Number(scoreA)) || Number(scoreA) < 0) ? "Must be a non-negative number" : ""}
              />
              <TextField
                label={`Score - ${match?.teamB?.name || "Team B"}`}
                type="number"
                fullWidth
                value={scoreB}
                onChange={(e) => setScoreB(e.target.value)}
                inputProps={{ min: 0, step: 1 }}
                error={scoreB !== "" && (isNaN(Number(scoreB)) || Number(scoreB) < 0)}
                helperText={scoreB !== "" && (isNaN(Number(scoreB)) || Number(scoreB) < 0) ? "Must be a non-negative number" : ""}
              />
            </Stack>
            {scoreA !== "" && scoreB !== "" && (
              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                Winner: {Number(scoreA) > Number(scoreB) 
                  ? match?.teamA?.name || "Team A" 
                  : Number(scoreB) > Number(scoreA)
                    ? match?.teamB?.name || "Team B"
                    : "Tie (not allowed)"
                }
              </Typography>
            )}
          </Box>
          
          <Box>
            <Button 
              variant="contained" 
              onClick={handleSave} 
              disabled={saving || !scheduledAt || !format.trim() || formatsLoading}
              size="large"
            >
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