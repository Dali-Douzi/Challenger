import React from "react";
import { Box, Typography, Paper, Button } from "@mui/material";
import { DragIndicator } from "@mui/icons-material";
import { Link } from "react-router-dom";

const Bracket = ({ phases, matchesByPhase, organizerMode }) => {
  return (
    <Box>
      {phases.map((phase, idx) => (
        <Box key={idx} sx={{ mb: 4 }}>
          <Typography variant="h6">
            Phase {idx + 1} – {phase.bracketType.replace("_", " ")} (
            {phase.status})
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            {matchesByPhase[idx]?.map((match) => (
              <Paper
                key={match._id}
                sx={{
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                elevation={1}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {organizerMode && <DragIndicator fontSize="small" />}
                  <Box>
                    <Typography variant="body1">
                      {match.teamA?.name || "TBD"} vs{" "}
                      {match.teamB?.name || "TBD"}
                    </Typography>
                    {match.scheduledAt && (
                      <Typography variant="caption">
                        {new Date(match.scheduledAt).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Button
                  component={Link}
                  to={`/matches/${match._id}`}
                  size="small"
                >
                  Edit
                </Button>
              </Paper>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default Bracket;
