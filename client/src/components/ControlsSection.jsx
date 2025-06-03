import React, { useState } from "react";
import { Box, Button, Typography, Alert, Stack, Chip, Divider } from "@mui/material";
import axios from "axios";

const ControlsSection = ({ tournament, onAction }) => {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { _id: id, status, phases, isOrganizer, isReferee, teams, maxParticipants } = tournament;

  // Generalized action helper: prefixes "/api/tournaments"
  const handleAction = async (url, method = "put", data = null) => {
    try {
      setError("");
      setLoading(true);
      await axios[method](`/api/tournaments/${id}${url}`, data);
      onAction(); // Refresh tournament data
    } catch (err) {
      setError(err.response?.data?.message || "Error performing action");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if we can proceed to next status
  const canCloseRegistration = () => {
    const teamCount = teams?.length || 0;
    return status === "REGISTRATION_OPEN" && teamCount >= 2; // Minimum 2 teams
  };

  const canLockBracket = () => {
    const teamCount = teams?.length || 0;
    return status === "REGISTRATION_LOCKED" && teamCount >= 2;
  };

  const canStartTournament = () => {
    return status === "BRACKET_LOCKED";
  };

  const canCompleteTournament = () => {
    return status === "IN_PROGRESS";
  };

  // Get current status info
  const getStatusInfo = () => {
    const teamCount = teams?.length || 0;
    
    switch (status) {
      case "REGISTRATION_OPEN":
        return {
          message: `Teams can join. Current: ${teamCount}/${maxParticipants}`,
          nextStep: teamCount >= 2 ? "You can close registration when ready" : "Need at least 2 teams to proceed"
        };
      case "REGISTRATION_LOCKED":
        return {
          message: "Registration is closed. Ready to set up bracket.",
          nextStep: "Lock the bracket to enable team placement"
        };
      case "BRACKET_LOCKED":
        return {
          message: "Bracket is ready. Place teams in their starting positions.",
          nextStep: "Start the tournament when bracket setup is complete"
        };
      case "IN_PROGRESS":
        return {
          message: "Tournament is active. Matches can be played and scored.",
          nextStep: "Complete matches and advance through rounds"
        };
      case "COMPLETE":
        return {
          message: "Tournament has ended.",
          nextStep: null
        };
      default:
        return {
          message: "Unknown status",
          nextStep: null
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Box>
      {error && (
        <Box mb={2}>
          <Alert severity="error" onClose={() => setError("")}>
            {error}
          </Alert>
        </Box>
      )}

      {/* Current Status Display */}
      <Box mb={3} sx={{ p: 2, bgcolor: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Typography variant="h6">Tournament Status:</Typography>
          <Chip 
            label={status?.replace(/_/g, " ") || "Unknown"} 
            color={(() => {
              switch (status) {
                case "REGISTRATION_OPEN": return "info";
                case "REGISTRATION_LOCKED": return "warning";
                case "BRACKET_LOCKED": return "warning";
                case "IN_PROGRESS": return "success";
                case "COMPLETE": return "default";
                default: return "error";
              }
            })()}
            variant="filled"
          />
        </Box>
        
        <Typography variant="body2" sx={{ mb: 1 }}>
          {statusInfo.message}
        </Typography>
        
        {statusInfo.nextStep && (
          <Typography variant="body2" color="text.secondary">
            Next: {statusInfo.nextStep}
          </Typography>
        )}

        {/* Team Count Warning */}
        {status === "REGISTRATION_OPEN" && (teams?.length || 0) >= maxParticipants && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Maximum participants reached ({maxParticipants}). Consider closing registration.
          </Alert>
        )}
      </Box>

      {/* ORGANIZER CONTROLS */}
      {isOrganizer && (
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Organizer Actions
          </Typography>
          
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
            {/* 1) Close Registration */}
            {status === "REGISTRATION_OPEN" && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleAction("/lock-registrations", "put")}
                disabled={!canCloseRegistration() || loading}
              >
                Close Registration ({teams?.length || 0} teams)
              </Button>
            )}

            {/* 2) Lock Bracket */}
            {status === "REGISTRATION_LOCKED" && (
              <Button
                variant="contained"
                color="secondary"
                onClick={() => handleAction("/lock-bracket", "put")}
                disabled={!canLockBracket() || loading}
              >
                Lock Bracket & Generate Matches
              </Button>
            )}

            {/* 3) Start Tournament */}
            {status === "BRACKET_LOCKED" && (
              <Button
                variant="contained"
                color="success"
                onClick={() => handleAction("/start", "put")}
                disabled={!canStartTournament() || loading}
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
                disabled={!canCompleteTournament() || loading}
              >
                Complete Tournament
              </Button>
            )}
          </Box>

          {/* Warnings for disabled buttons */}
          {status === "REGISTRATION_OPEN" && !canCloseRegistration() && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Need at least 2 teams to close registration.
            </Alert>
          )}
        </Box>
      )}

      {/* REFEREE CONTROLS */}
      {isReferee && !isOrganizer && (
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Referee Actions
          </Typography>
          
          {/* Referees can help start tournament once bracket is locked */}
          {status === "BRACKET_LOCKED" && (
            <Button
              variant="contained"
              color="success"
              onClick={() => handleAction("/start", "put")}
              disabled={loading}
            >
              Start Tournament
            </Button>
          )}
          
          {status !== "BRACKET_LOCKED" && (
            <Typography variant="body2" color="text.secondary">
              Referee actions will be available once the bracket is locked.
            </Typography>
          )}
        </Box>
      )}

      {/* PHASE CONTROLS */}
      {phases && phases.length > 0 && status === "IN_PROGRESS" && (
        <>
          <Divider sx={{ my: 3 }} />
          <Box>
            <Typography variant="h6" gutterBottom>
              Phase Management
            </Typography>
            <Stack spacing={2}>
              {phases.map((phase, idx) => (
                <Box
                  key={idx}
                  sx={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 2,
                    p: 2,
                    bgcolor: "rgba(255,255,255,0.03)",
                    borderRadius: 1
                  }}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1">
                      Phase {idx + 1}: {phase.bracketType?.replace(/_/g, " ")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Status: {phase.status?.replace(/_/g, " ")}
                    </Typography>
                  </Box>

                  {/* Only organizer can change phase statuses */}
                  {isOrganizer && (
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {phase.status === "PENDING" && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() =>
                            handleAction(`/phases/${idx}`, "put", {
                              status: "IN_PROGRESS",
                            })
                          }
                          disabled={loading}
                        >
                          Start Phase
                        </Button>
                      )}
                      {phase.status === "IN_PROGRESS" && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() =>
                            handleAction(`/phases/${idx}`, "put", {
                              status: "COMPLETE",
                            })
                          }
                          disabled={loading}
                        >
                          Complete Phase
                        </Button>
                      )}
                      {phase.status === "COMPLETE" && (
                        <Chip label="Completed" color="success" size="small" />
                      )}
                    </Box>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>
        </>
      )}

      {/* PROGRESS INDICATOR */}
      {teams && teams.length > 0 && (
        <Box mt={3} sx={{ p: 2, bgcolor: "rgba(255,255,255,0.03)", borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Tournament Progress
          </Typography>
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Participants
              </Typography>
              <Typography variant="body2">
                {teams.length}/{maxParticipants}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Phases
              </Typography>
              <Typography variant="body2">
                {phases?.length || 0} configured
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ControlsSection;