import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Typography, Box, Button, Alert } from "@mui/material";
import axios from "axios";
import TournamentForm from "../components/TournamentForm";
import ActionModal from "../components/ActionModal";

const CreateTournamentPage = () => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Handle new tournament creation
  const handleCreate = async (formData) => {
    try {
      const { data } = await axios.post("/tournaments", formData);
      navigate(`/tournaments/${data._id}`);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Error creating tournament");
    }
  };

  // Handle referee-code join (stub; requires backend support to find by code)
  const handleRefereeJoin = async (code) => {
    try {
      // Example: lookup tournament by code then join
      const res = await axios.get(`/tournaments/code/${code}`);
      await axios.post(`/tournaments/${res.data._id}/referees`, { code });
      navigate(`/tournaments/${res.data._id}`);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Invalid referee code");
    }
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Create Tournament
      </Typography>

      {errorMsg && (
        <Box mb={2}>
          <Alert severity="error">{errorMsg}</Alert>
        </Box>
      )}

      {/* Tournament creation form */}
      <TournamentForm onSubmit={handleCreate} />

      {/* Referee join button & modal */}
      <Box mt={4}>
        <Button variant="outlined" onClick={() => setModalOpen(true)}>
          Enter Referee Code
        </Button>
      </Box>

      <ActionModal
        open={modalOpen}
        title="Enter Referee Code"
        label="Referee Code"
        placeholder="ABC123"
        onClose={() => setModalOpen(false)}
        onConfirm={async (value) => {
          setModalOpen(false);
          await handleRefereeJoin(value);
        }}
      />
    </Container>
  );
};

export default CreateTournamentPage;
