import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Stack,
} from "@mui/material";
import { ArrowBack, Save } from "@mui/icons-material";
import axios from "axios";

const EditTournamentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
  });
  
  const [originalData, setOriginalData] = useState({});

  // Fetch tournament data
  useEffect(() => {
    const fetchTournament = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/api/tournaments/${id}`);
        
        const tournamentData = {
          name: data.name,
          description: data.description,
          startDate: data.startDate ? data.startDate.substring(0, 10) : "", // Format for date input
        };
        
        setFormData(tournamentData);
        setOriginalData(tournamentData);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load tournament");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTournament();
    }
  }, [id]);

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      
      // Validation
      if (!formData.name.trim()) {
        setError("Tournament name is required");
        return;
      }
      
      if (!formData.description.trim()) {
        setError("Tournament description is required");
        return;
      }
      
      if (!formData.startDate) {
        setError("Tournament start date is required");
        return;
      }
      
      // Check if start date is in the future
      const startDate = new Date(formData.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      
      if (startDate < today) {
        setError("Start date cannot be in the past");
        return;
      }

      // Prepare update data
      const updateData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        startDate: formData.startDate,
      };

      await axios.put(`/api/tournaments/${id}`, updateData);
      
      setSuccessMessage("Tournament updated successfully!");
      setOriginalData(formData); // Update original data
      
      // Redirect back to tournament page after short delay
      setTimeout(() => {
        navigate(`/tournaments/${id}`);
      }, 1500);
      
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update tournament");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/tournaments/${id}`);
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  if (loading) {
    return (
      <Container sx={{ py: 4, textAlign: "center", color: "white" }}>
        <CircularProgress color="inherit" size={60} />
        <Typography sx={{ mt: 2 }}>Loading tournament...</Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4, color: "white" }}>
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={handleCancel}
          sx={{ color: "white" }}
        >
          Back to Tournament
        </Button>
        <Typography variant="h4">Edit Tournament</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      <Paper sx={{ p: 4, bgcolor: "rgba(255,255,255,0.05)" }}>
        <Stack spacing={3}>
          <TextField
            label="Tournament Name"
            value={formData.name}
            onChange={handleInputChange("name")}
            fullWidth
            required
            variant="outlined"
            inputProps={{ maxLength: 100 }}
            helperText={`${formData.name.length}/100 characters`}
          />

          <TextField
            label="Description"
            value={formData.description}
            onChange={handleInputChange("description")}
            fullWidth
            required
            multiline
            rows={4}
            variant="outlined"
            inputProps={{ maxLength: 500 }}
            helperText={`${formData.description.length}/500 characters`}
          />

          <TextField
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={handleInputChange("startDate")}
            fullWidth
            required
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            inputProps={{
              min: new Date().toISOString().split('T')[0] // Prevent past dates
            }}
          />

          <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 4 }}>
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} /> : <Save />}
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* Warning about tournament status */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Note:</strong> You can only edit basic tournament information. 
          To modify participants, phases, or bracket settings, use the tournament management controls on the main tournament page.
        </Typography>
      </Alert>
    </Container>
  );
};

export default EditTournamentPage;