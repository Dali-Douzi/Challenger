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
      <Container sx={{ mt: 4, textAlign: "center" }}>
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
        Tournaments
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate("/tournaments/create")}
      >
        Create Tournament
      </Button>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 2,
          mt: 2,
        }}
      >
        {tournaments.map((t) => (
          <Card key={t._id}>
            <CardContent>
              <Typography variant="h6">{t.name}</Typography>
              <Typography color="text.secondary">
                Starts: {new Date(t.startDate).toLocaleDateString()}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
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
