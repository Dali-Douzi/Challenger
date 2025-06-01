import React, { useState } from "react";
import { Box, Button, Typography, Alert, Stack } from "@mui/material";
import axios from "axios";

const ControlsSection = ({ tournament, onAction }) => {
  const [error, setError] = useState("");
  const { _id: id, status, phases, isOrganizer, isReferee } = tournament;

  // Generalized action helper: prefixes "/api/tournaments"
  const handleAction = async (url, method = "put", data = null) => {
    try {
      setError("");
      await axios[method](`/api/tournaments/${id}${url}`, data);
      onAction();
    } catch (err) {
      setError(err.response?.data?.message || "Error performing action");
    }
  };

  // Only organizers can lock registrations or lock the bracket
  // Referees and organizers can start the tournament once bracket is locked
  // Organizers can complete the tournament at the end
  return (
    <Box>
      {error && (
        <Box mb={2}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      {/* ORGANIZER CONTROLS */}
      {isOrganizer && (
        <Box mb={2} sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {/* 1) Lock Registrations */}
          {status === "REGISTRATION_OPEN" && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleAction("/lock-registrations", "put")}
            >
              Lock Registrations
            </Button>
          )}

          {/* 2) Lock Bracket */}
          {status === "REGISTRATION_LOCKED" && (
            <Button
              variant="contained"
              color="secondary"
              onClick={() => handleAction("/lock-bracket", "put")}
            >
              Lock Bracket
            </Button>
          )}

          {/* 3) Start Tournament */}
          {/* Allow organizer to start once the bracket is locked */}
          {status === "BRACKET_LOCKED" && (
            <Button
              variant="contained"
              color="success"
              onClick={() => handleAction("/start", "put")}
            >
              Start Tournament
            </Button>
          )}

          {/* 4) Complete Tournament */}
          {status === "IN_PROGRESS" && (
            <Button
              variant="contained"
              color="warning"
              onClick={() => handleAction("/complete", "put")}
            >
              Complete Tournament
            </Button>
          )}
        </Box>
      )}

      {/* REFEREE CONTROLS */}
      {isReferee && !isOrganizer && (
        <Box mb={2}>
          {/* Once bracket is locked, referees can also start the tournament */}
          {status === "BRACKET_LOCKED" && (
            <Button
              variant="contained"
              color="success"
              onClick={() => handleAction("/start", "put")}
            >
              Start Tournament
            </Button>
          )}
        </Box>
      )}

      {/* INDIVIDUAL PHASE CONTROLS */}
      {phases && phases.length > 0 && (
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Phase Controls
          </Typography>
          <Stack spacing={2}>
            {phases.map((phase, idx) => (
              <Box
                key={idx}
                sx={{ display: "flex", alignItems: "center", gap: 2 }}
              >
                <Typography sx={{ flexGrow: 1 }}>
                  Phase {idx + 1}: {phase.bracketType} (
                  {phase.status.replace(/_/g, " ")})
                </Typography>

                {/* Only organizer can change phase statuses */}
                {isOrganizer && (
                  <>
                    {phase.status === "PENDING" && (
                      <Button
                        variant="outlined"
                        onClick={() =>
                          handleAction(`/phases/${idx}`, "put", {
                            status: "IN_PROGRESS",
                          })
                        }
                      >
                        Start Phase
                      </Button>
                    )}
                    {phase.status === "IN_PROGRESS" && (
                      <Button
                        variant="outlined"
                        onClick={() =>
                          handleAction(`/phases/${idx}`, "put", {
                            status: "COMPLETE",
                          })
                        }
                      >
                        Complete Phase
                      </Button>
                    )}
                  </>
                )}
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default ControlsSection;
