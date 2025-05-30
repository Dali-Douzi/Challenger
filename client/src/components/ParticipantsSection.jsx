import React, { useState } from "react";
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
} from "@mui/material";
import { Check, Close } from "@mui/icons-material";
import { Link } from "react-router-dom";
import axios from "axios";
import ActionModal from "./ActionModal";
import useMyTeams from "../hooks/useMyTeams";

const ParticipantsSection = ({ tournament, onUpdate }) => {
  const [refModalOpen, setRefModalOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [error, setError] = useState("");
  const [signupError, setSignupError] = useState("");

  const isOrganizer = tournament.isOrganizer;
  const isRegistrationOpen = tournament.status === "REGISTRATION_OPEN";

  // Fetch user's teams
  const {
    teams: myTeams,
    loading: teamsLoading,
    error: teamsError,
  } = useMyTeams();

  const handleApprove = async (teamId) => {
    try {
      await axios.put(`/tournaments/${tournament._id}/teams/${teamId}/approve`);
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || "Error approving team");
    }
  };

  const handleRemoveTeam = async (teamId) => {
    try {
      await axios.delete(`/tournaments/${tournament._id}/teams/${teamId}`);
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || "Error removing team");
    }
  };

  const handleAddReferee = async (code) => {
    try {
      await axios.post(`/tournaments/${tournament._id}/referees`, { code });
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || "Error adding referee");
    }
  };

  const handleRemoveReferee = async (userId) => {
    try {
      await axios.delete(`/tournaments/${tournament._id}/referees/${userId}`);
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || "Error removing referee");
    }
  };

  const handleSignup = async () => {
    try {
      setSignupError("");
      await axios.post(`/tournaments/${tournament._id}/teams`, {
        teamId: selectedTeam,
      });
      onUpdate();
      setSignupOpen(false);
    } catch (err) {
      setSignupError(err.response?.data?.message || "Error joining tournament");
    }
  };

  return (
    <Box>
      {error && (
        <Box mb={2}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      <Typography variant="h6">Teams</Typography>

      {isOrganizer && tournament.pendingTeams?.length > 0 && (
        <Box mt={1} mb={2}>
          <Typography variant="subtitle2">Pending Requests</Typography>
          <List>
            {tournament.pendingTeams.map((team) => (
              <ListItem
                key={team._id}
                secondaryAction={
                  <>
                    <IconButton
                      edge="end"
                      onClick={() => handleApprove(team._id)}
                    >
                      <Check />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleRemoveTeam(team._id)}
                    >
                      <Close />
                    </IconButton>
                  </>
                }
              >
                <ListItemText
                  primary={<Link to={`/teams/${team._id}`}>{team.name}</Link>}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <List>
        {tournament.teams.map((team) => (
          <ListItem
            key={team._id}
            secondaryAction={
              isOrganizer && (
                <IconButton
                  edge="end"
                  onClick={() => handleRemoveTeam(team._id)}
                >
                  <Close />
                </IconButton>
              )
            }
          >
            <ListItemText
              primary={<Link to={`/teams/${team._id}`}>{team.name}</Link>}
            />
          </ListItem>
        ))}
      </List>

      {!isOrganizer && isRegistrationOpen && (
        <Box mt={2}>
          <Button variant="outlined" onClick={() => setSignupOpen(true)}>
            Join Tournament
          </Button>
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6">Referees</Typography>
      <List>
        <ListItem>
          <ListItemText
            primary={tournament.organizer.username}
            secondary="Organizer"
          />
        </ListItem>
        {tournament.referees.map((ref) => (
          <ListItem
            key={ref._id}
            secondaryAction={
              isOrganizer &&
              ref._id !== tournament.organizer._id && (
                <IconButton
                  edge="end"
                  onClick={() => handleRemoveReferee(ref._id)}
                >
                  <Close />
                </IconButton>
              )
            }
          >
            <ListItemText primary={ref.username} />
          </ListItem>
        ))}
      </List>

      {isOrganizer && (
        <Box mt={2}>
          <Button variant="outlined" onClick={() => setRefModalOpen(true)}>
            Add Referee
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

      <Dialog open={signupOpen} onClose={() => setSignupOpen(false)}>
        <DialogTitle>Select a Team to Join</DialogTitle>
        <DialogContent>
          {teamsLoading ? (
            <CircularProgress />
          ) : teamsError ? (
            <Alert severity="error">{teamsError}</Alert>
          ) : (
            <FormControl fullWidth>
              <InputLabel id="select-team-label">Team</InputLabel>
              <Select
                labelId="select-team-label"
                value={selectedTeam}
                label="Team"
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                {myTeams.map((team) => (
                  <MenuItem key={team._id} value={team._id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {signupError && (
            <Box mt={2}>
              <Alert severity="error">{signupError}</Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSignupOpen(false)}>Cancel</Button>
          <Button onClick={handleSignup} disabled={!selectedTeam}>
            Join
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ParticipantsSection;
