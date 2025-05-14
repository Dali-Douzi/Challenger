import { useState } from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  Modal,
  Paper,
} from "@mui/material";
import React from "react";

const JoinTeamModal = ({ isOpen, closeModal }) => {
  const [teamCode, setTeamCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("http://localhost:4444/api/teams/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ teamCode }),
      });

      if (res.ok) {
        alert("Joined team successfully!");
        closeModal(); // Close the modal on success
      } else {
        const data = await res.json();
        setError(data.message || "Failed to join team");
      }
    } catch (err) {
      console.error("Join team error:", err);
      setError("Server error");
    }
  };

  return (
    <Modal open={isOpen} onClose={closeModal}>
      <Paper sx={{ padding: 4, maxWidth: 400, margin: "auto", mt: 10 }}>
        <Typography variant="h6" gutterBottom>
          Join a Team
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Team Code"
            value={teamCode}
            onChange={(event) => setTeamCode(event.target.value)}
            fullWidth
            required
            variant="filled"
            sx={{ mb: 2 }}
          />
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
            <Button variant="contained" color="primary" type="submit">
              Join Team
            </Button>
            <Button variant="filled" color="secondary" onClick={closeModal}>
              Close
            </Button>
          </Box>
        </Box>
      </Paper>
    </Modal>
  );
};

export default JoinTeamModal;
