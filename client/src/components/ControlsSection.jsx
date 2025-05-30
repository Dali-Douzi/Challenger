import React, { useState } from "react";
import { Box, Button, Typography, Alert, Stack } from "@mui/material";
import axios from "axios";

const ControlsSection = ({ tournament, onAction }) => {
  const [error, setError] = useState("");
  const { _id: id, status, phases, isOrganizer, isReferee } = tournament;

  const handleAction = async (url, method = "put", data) => {
    try {
      setError("");
      await axios[method](`/tournaments/${id}${url}`, data);
      onAction();
    } catch (err) {
      setError(err.response?.data?.message || "Error performing action");
    }
  };

  return (
    <Box>
      {error && (
        <Box mb={2}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      <Typography variant="h6" gutterBottom>
        Controls
      </Typography>

      <Stack direction="row" spacing={2} flexWrap="wrap">
        {/* Lock registrations */}
        {isOrganizer && status === "REGISTRATION_OPEN" && (
          <Button
            variant="contained"
            onClick={() => handleAction("/lock-registrations")}
          >
            Lock Registrations
          </Button>
        )}

        {/* Lock bracket */}
        {isOrganizer && status === "REGISTRATION_LOCKED" && (
          <Button
            variant="contained"
            onClick={() => handleAction("/lock-bracket")}
          >
            Lock Bracket
          </Button>
        )}

        {/* Start tournament */}
        {(isOrganizer || isReferee) && status === "BRACKET_LOCKED" && (
          <Button variant="contained" onClick={() => handleAction("/start")}>
            Start Tournament
          </Button>
        )}

        {/* Complete tournament */}
        {isOrganizer && status === "IN_PROGRESS" && (
          <Button
            variant="contained"
            color="secondary"
            onClick={() => handleAction("/complete")}
          >
            Complete Tournament
          </Button>
        )}
      </Stack>

      {/* Phase controls */}
      {isOrganizer && status !== "REGISTRATION_OPEN" && (
        <Box mt={4}>
          <Typography variant="subtitle1" gutterBottom>
            Phases
          </Typography>
          <Stack direction="column" spacing={1}>
            {phases.map((phase, idx) => (
              <Box
                key={idx}
                sx={{ display: "flex", alignItems: "center", gap: 2 }}
              >
                <Typography>
                  Phase {idx + 1} ({phase.bracketType.replace("_", " ")}):{" "}
                  {phase.status.replace("_", " ")}
                </Typography>

                {/* Start phase */}
                {phase.status === "PENDING" && (
                  <Button
                    size="small"
                    onClick={() =>
                      handleAction(`/phases/${idx}`, "put", {
                        status: "IN_PROGRESS",
                      })
                    }
                  >
                    Start Phase
                  </Button>
                )}

                {/* Complete phase */}
                {phase.status === "IN_PROGRESS" && (
                  <Button
                    size="small"
                    color="secondary"
                    onClick={() =>
                      handleAction(`/phases/${idx}`, "put", {
                        status: "COMPLETE",
                      })
                    }
                  >
                    Complete Phase
                  </Button>
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
