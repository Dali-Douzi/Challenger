import React from "react";
import { useParams } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import useTournament from "../hooks/useTournament";
import ParticipantsSection from "../components/ParticipantsSection";
import ControlsSection from "../components/ControlsSection";
import Bracket from "../components/Bracket";

const TournamentPage = () => {
  const { id } = useParams();
  const { tournament, matchesByPhase, loading, error, refresh } =
    useTournament(id);

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
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        {tournament.name}
      </Typography>
      <Typography variant="body1" gutterBottom>
        {tournament.description}
      </Typography>
      <Typography variant="caption" display="block" gutterBottom>
        Status: {tournament.status.replace(/_/g, " ")}
      </Typography>

      <Box my={3}>
        <ControlsSection tournament={tournament} onAction={refresh} />
      </Box>

      <Box my={3}>
        <ParticipantsSection tournament={tournament} onUpdate={refresh} />
      </Box>

      <Box my={3}>
        {tournament.status !== "REGISTRATION_OPEN" ? (
          <Bracket
            phases={tournament.phases}
            matchesByPhase={matchesByPhase}
            organizerMode={tournament.isOrganizer}
          />
        ) : (
          <Alert severity="info">
            Bracket will be available after registrations are locked.
          </Alert>
        )}
      </Box>
    </Container>
  );
};

export default TournamentPage;
