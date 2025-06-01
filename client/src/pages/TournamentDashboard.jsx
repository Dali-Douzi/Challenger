import React from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import useTournaments from "../hooks/useTournaments";

const TournamentDashboard = () => {
  const navigate = useNavigate();
  const { tournaments, loading, error } = useTournaments();

  if (loading) {
    return (
      <Container sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4, color: "white" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Tournaments</Typography>
        <Button
          variant="contained"
          onClick={() => navigate("/tournaments/create")}
        >
          Create Tournament
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 3,
          mt: 4,
        }}
      >
        {tournaments.map((t) => (
          <Card key={t._id} sx={{ width: "100%", minHeight: 200 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                {t.name}
              </Typography>
              <Typography color="text.secondary">Game: {t.game}</Typography>
              <Typography color="text.secondary">
                Starts: {new Date(t.startDate).toLocaleDateString()}
              </Typography>
              <Typography color="text.secondary">
                Status: {t.status.replace(/_/g, " ")}
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  component={Link}
                  to={`/tournaments/${t._id}`}
                >
                  View
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Container>
  );
};

export default TournamentDashboard;
