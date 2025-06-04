import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Typography, Box, Button, Alert } from "@mui/material";
import api from "../utils/api"; // ✅ Use authenticated API
import TournamentForm from "../components/TournamentForm";
import ActionModal from "../components/ActionModal";

const CreateTournamentPage = () => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [refCode, setRefCode] = useState("");
  const [tourneyId, setTourneyId] = useState("");
  const [showCode, setShowCode] = useState(false);

  const handleCreate = async (formData) => {
    try {
      const { data } = await api.post("/tournaments", formData); // ✅ Using api instead of axios
      setRefCode(data.refereeCode);
      setTourneyId(data._id);
      setShowCode(true);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Error creating tournament");
    }
  };

  const handleRefereeJoin = async (code) => {
    try {
      const res = await api.get(`/tournaments/code/${code}`); // ✅ Using api instead of axios
      await api.post(`/tournaments/${res.data._id}/referees`, { code }); // ✅ Using api instead of axios
      navigate(`/tournaments/${res.data._id}`);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Invalid referee code");
    }
  };

  return (
    <Container sx={{ py: 4, color: "white" }}>
      <Typography variant="h4" gutterBottom>
        Create Tournament
      </Typography>

      {errorMsg && (
        <Box mb={2}>
          <Alert severity="error">{errorMsg}</Alert>
        </Box>
      )}

      {!showCode ? (
        <>
          <TournamentForm onSubmit={handleCreate} />

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
        </>
      ) : (
        <Box sx={{ textAlign: "center", mt: 4 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            🎉 Tournament created! Your referee code is:{" "}
            <strong>{refCode}</strong>
          </Alert>
          <Button
            variant="contained"
            onClick={() => navigate(`/tournaments/${tourneyId}`)}
          >
            Go to Tournament
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default CreateTournamentPage;
