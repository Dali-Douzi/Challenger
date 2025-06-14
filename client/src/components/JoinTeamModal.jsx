import React, { useState } from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  Modal,
  Paper,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";

const JoinTeamModal = ({ isOpen, closeModal, onSuccess }) => {
  const { makeAuthenticatedRequest } = useAuth();
  const [teamCode, setTeamCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!teamCode.trim()) {
      setError("Please enter a team code");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await makeAuthenticatedRequest(
        "http://localhost:4444/api/teams/join",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ teamCode: teamCode.trim().toUpperCase() }),
        }
      );

      if (response && response.ok) {
        const data = await response.json();
        alert(`Successfully joined ${data.team.name}!`);
        setTeamCode("");
        closeModal();
        onSuccess();
      } else if (response) {
        const errorData = await response.json();
        setError(errorData.message || "Failed to join team");
      }
    } catch (err) {
      console.error("Join team error:", err);
      setError("Server error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTeamCode("");
    setError("");
    setIsSubmitting(false);
    closeModal();
  };

  return (
    <Modal open={isOpen} onClose={handleClose}>
      <Paper sx={{ padding: 4, maxWidth: 400, margin: "auto", mt: 10 }}>
        <Typography variant="h6" gutterBottom>
          Join a Team
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Enter the team code shared by the team owner to join their team.
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Team Code"
            value={teamCode}
            onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
            fullWidth
            required
            variant="filled"
            sx={{ mb: 2 }}
            placeholder="e.g. ABC123"
            inputProps={{
              style: { textTransform: "uppercase" },
              maxLength: 10,
            }}
            disabled={isSubmitting}
          />

          {error && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <Box
            sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
          >
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
              sx={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={isSubmitting || !teamCode.trim()}
              sx={{ flex: 1 }}
            >
              {isSubmitting ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Joining...
                </>
              ) : (
                "Join Team"
              )}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Modal>
  );
};

export default JoinTeamModal;
