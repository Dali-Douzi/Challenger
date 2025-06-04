import React from "react";
import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  IconButton,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Paper,
  Tooltip,
} from "@mui/material";
import {
  Check,
  Close,
  GroupAdd,
  HowToReg,
  InfoOutlined,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import api from "../utils/api";
import ActionModal from "./ActionModal";
import useMyTeams from "../hooks/useMyTeams";

const ParticipantsSection = ({ tournament, onUpdate }) => {
  const [refModalOpen, setRefModalOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [selectedTeamToJoin, setSelectedTeamToJoin] = useState("");
  const [error, setError] = useState("");
  const [signupError, setSignupError] = useState("");

  const isOrganizer = tournament.isOrganizer;
  const isReferee = tournament.isReferee;
  const isRegistrationOpen = tournament.status === "REGISTRATION_OPEN";

  const {
    teams: myTeams,
    loading: myTeamsLoading,
    error: myTeamsError,
  } = useMyTeams();

  const { teamsInTournamentIds, eligibleTeamsToJoin } = useMemo(() => {
    if (!myTeams || !tournament.pendingTeams || !tournament.teams) {
      return { teamsInTournamentIds: new Set(), eligibleTeamsToJoin: [] };
    }
    const pendingTeamIds = tournament.pendingTeams.map((t) => t._id);
    const approvedTeamIds = tournament.teams.map((t) => t._id);
    const teamsInTournamentIdsSet = new Set([
      ...pendingTeamIds,
      ...approvedTeamIds,
    ]);

    const eligible = myTeams.filter(
      (myTeam) => !teamsInTournamentIdsSet.has(myTeam._id)
    );
    return {
      teamsInTournamentIds: teamsInTournamentIdsSet,
      eligibleTeamsToJoin: eligible,
    };
  }, [myTeams, tournament.pendingTeams, tournament.teams]);

  const userInvolvedTeamsWithStatus = useMemo(() => {
    if (!myTeams) return [];
    return myTeams
      .map((myTeam) => {
        if (tournament.teams.find((t) => t._id === myTeam._id)) {
          return { ...myTeam, tournamentStatus: "APPROVED" };
        }
        if (tournament.pendingTeams.find((t) => t._id === myTeam._id)) {
          return { ...myTeam, tournamentStatus: "PENDING" };
        }
        return null;
      })
      .filter(Boolean);
  }, [myTeams, tournament.teams, tournament.pendingTeams]);

  const handleApprove = async (teamId) => {
    setError("");
    try {
      await api.put(`/tournaments/${tournament._id}/teams/${teamId}/approve`); // ✅ Using api instead of axios
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || "Error approving team");
    }
  };

  const handleRemoveTeam = async (teamId, isPending = false) => {
    setError("");
    try {
      await api.delete(`/tournaments/${tournament._id}/teams/${teamId}`); // ✅ Using api instead of axios
      onUpdate();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Error ${isPending ? "rejecting" : "removing"} team`
      );
    }
  };

  const handleAddReferee = async (code) => {
    setError("");
    try {
      await api.post(`/tournaments/${tournament._id}/referees`, { code }); // ✅ Using api instead of axios
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || "Error adding referee");
    }
  };

  const handleRemoveReferee = async (userId) => {
    setError("");
    try {
      await api.delete(`/tournaments/${tournament._id}/referees/${userId}`); // ✅ Using api instead of axios
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || "Error removing referee");
    }
  };

  const handleSignup = async () => {
    if (!selectedTeamToJoin) return;
    setSignupError("");
    try {
      await api.post(`/tournaments/${tournament._id}/teams`, {
        // ✅ Using api instead of axios
        teamId: selectedTeamToJoin,
      });
      onUpdate();
      setSignupOpen(false);
      setSelectedTeamToJoin("");
    } catch (err) {
      setSignupError(err.response?.data?.message || "Error joining tournament");
    }
  };

  return (
    <Box>
      {error && (
        <Box mb={2}>
          <Alert severity="error" onClose={() => setError("")}>
            {error}
          </Alert>
        </Box>
      )}

      {isOrganizer && tournament.pendingTeams?.length > 0 && (
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: "flex", alignItems: "center" }}
          >
            <GroupAdd sx={{ mr: 1 }} /> Pending Team Requests (
            {tournament.pendingTeams.length})
          </Typography>
          <List dense>
            {tournament.pendingTeams.map((team) => (
              <ListItem
                key={team._id}
                secondaryAction={
                  <>
                    <Tooltip title="Approve Team">
                      <IconButton
                        edge="end"
                        color="success"
                        onClick={() => handleApprove(team._id)}
                        aria-label="approve team"
                      >
                        <Check />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Reject Team">
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={() => handleRemoveTeam(team._id, true)}
                        aria-label="reject team"
                      >
                        <Close />
                      </IconButton>
                    </Tooltip>
                  </>
                }
                sx={{
                  "&:hover": { bgcolor: "action.hover" },
                  borderRadius: 1,
                  mb: 0.5,
                }}
              >
                <ListItemText
                  primary={
                    <Link
                      to={`/teams/${team._id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      {team.name}
                    </Link>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ display: "flex", alignItems: "center" }}
        >
          <HowToReg sx={{ mr: 1 }} /> Participating Teams (
          {tournament.teams?.length || 0})
        </Typography>
        {tournament.teams?.length > 0 ? (
          <List dense>
            {tournament.teams.map((team) => (
              <ListItem
                key={team._id}
                secondaryAction={
                  isOrganizer && (
                    <Tooltip title="Remove Team">
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={() => handleRemoveTeam(team._id)}
                        aria-label="remove team"
                      >
                        <Close />
                      </IconButton>
                    </Tooltip>
                  )
                }
                sx={{
                  "&:hover": { bgcolor: "action.hover" },
                  borderRadius: 1,
                  mb: 0.5,
                }}
              >
                <ListItemText
                  primary={
                    <Link
                      to={`/teams/${team._id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      {team.name}
                    </Link>
                  }
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No teams are currently participating.
            {isRegistrationOpen && " Teams can join if registration is open."}
          </Typography>
        )}
      </Paper>

      {!isOrganizer && isRegistrationOpen && eligibleTeamsToJoin.length > 0 && (
        <Box mt={2} mb={3}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setSignupOpen(true)}
            startIcon={<GroupAdd />}
          >
            Join Tournament with another Team
          </Button>
        </Box>
      )}
      {!isOrganizer && userInvolvedTeamsWithStatus.length > 0 && (
        <Box mb={2}>
          <Typography variant="subtitle1" gutterBottom>
            Your Team Statuses:
          </Typography>
          {userInvolvedTeamsWithStatus.map((team) => (
            <Alert
              key={team._id}
              severity={
                team.tournamentStatus === "APPROVED" ? "success" : "info"
              }
              icon={
                team.tournamentStatus === "APPROVED" ? (
                  <Check fontSize="inherit" />
                ) : (
                  <InfoOutlined fontSize="inherit" />
                )
              }
              sx={{ mb: 1 }}
            >
              Team "{team.name}" is{" "}
              {team.tournamentStatus === "APPROVED"
                ? "participating"
                : "pending approval"}
              .
            </Alert>
          ))}
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Referees
        </Typography>
        <List dense>
          <ListItem
            sx={{
              "&:hover": { bgcolor: "action.hover" },
              borderRadius: 1,
              mb: 0.5,
            }}
          >
            <ListItemText
              primary={tournament.organizer.username}
              secondary="Organizer"
            />
          </ListItem>
          {tournament.referees.map((ref) => {
            if (ref._id === tournament.organizer._id) return null;
            return (
              <ListItem
                key={ref._id}
                secondaryAction={
                  isOrganizer && (
                    <Tooltip title="Remove Referee">
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={() => handleRemoveReferee(ref._id)}
                        aria-label="remove referee"
                      >
                        <Close />
                      </IconButton>
                    </Tooltip>
                  )
                }
                sx={{
                  "&:hover": { bgcolor: "action.hover" },
                  borderRadius: 1,
                  mb: 0.5,
                }}
              >
                <ListItemText primary={ref.username} />
              </ListItem>
            );
          })}
        </List>
      </Paper>

      {!isOrganizer && !isReferee && (
        <Box mt={2}>
          <Button variant="outlined" onClick={() => setRefModalOpen(true)}>
            Enter Referee Code
          </Button>
        </Box>
      )}

      <ActionModal
        open={refModalOpen}
        title="Enter Referee Code"
        label="Referee Code"
        placeholder="ABC123"
        onClose={() => setRefModalOpen(false)}
        onConfirm={(code) => {
          setRefModalOpen(false);
          handleAddReferee(code);
        }}
      />

      <Dialog
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Select Team to Join Tournament</DialogTitle>
        <DialogContent>
          {myTeamsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
              <CircularProgress />
            </Box>
          ) : myTeamsError ? (
            <Alert severity="error">{myTeamsError}</Alert>
          ) : eligibleTeamsToJoin.length === 0 ? (
            <Alert severity="info">
              All your teams are already in this tournament, or you have no
              teams eligible to join.
              {myTeams.length === 0 && (
                <Link to="/create-team"> Create a team</Link>
              )}
            </Alert>
          ) : (
            <FormControl fullWidth margin="normal">
              <InputLabel id="select-team-to-join-label">Team</InputLabel>
              <Select
                labelId="select-team-to-join-label"
                value={selectedTeamToJoin}
                label="Team"
                onChange={(e) => setSelectedTeamToJoin(e.target.value)}
              >
                {eligibleTeamsToJoin.map((team) => (
                  <MenuItem key={team._id} value={team._id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {signupError && (
            <Box mt={2}>
              <Alert severity="error" onClose={() => setSignupError("")}>
                {signupError}
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setSignupOpen(false);
              setSignupError("");
              setSelectedTeamToJoin("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSignup}
            disabled={
              !selectedTeamToJoin ||
              myTeamsLoading ||
              eligibleTeamsToJoin.length === 0
            }
            variant="contained"
          >
            Join
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ParticipantsSection;
