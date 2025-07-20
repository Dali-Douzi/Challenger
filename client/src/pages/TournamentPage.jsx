import React, { useState, useEffect } from "react";
import {
  useParams,
  Link as RouterLink,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Paper,
  Chip,
  Alert,
  Divider,
  Button,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import useTournament from "../hooks/useTournament";
import { useAuth } from "../context/AuthContext";
import useMyTeams from "../hooks/useMyTeams";
import ManageTeams from "../components/ManageTeams";
import ParticipantsSection from "../components/ParticipantsSection";
import ControlsSection from "../components/ControlsSection";

import moment from "moment";
import axios from "axios";
import EventIcon from "@mui/icons-material/Event";
import VideogameAssetIcon from "@mui/icons-material/VideogameAsset";
import GroupIcon from "@mui/icons-material/Group";
import EditIcon from "@mui/icons-material/Edit";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import AccountTreeIcon from "@mui/icons-material/AccountTree";

const TournamentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { tournament, loading, error, refresh } = useTournament(id);
  const {
    teams: myTeams,
    loading: loadingMyTeams,
    error: myTeamsError,
  } = useMyTeams();

  const [manageTeamsModalOpen, setManageTeamsModalOpen] = useState(false);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [joinTeamModalOpen, setJoinTeamModalOpen] = useState(false);

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const isOrganizer = React.useMemo(() => {
    if (tournament && typeof tournament.isOrganizer === "boolean")
      return tournament.isOrganizer;
    return (
      currentUser &&
      tournament &&
      tournament.organizer &&
      tournament.organizer._id === currentUser._id
    );
  }, [tournament, currentUser]);

  const isReferee = React.useMemo(
    () => tournament && tournament.isReferee,
    [tournament]
  );

  const userHasTeamsInTournament = React.useMemo(() => {
    if (
      !myTeams ||
      !tournament ||
      !Array.isArray(tournament.teams) ||
      !Array.isArray(tournament.pendingTeams)
    )
      return false;
    const tournamentTeamIds = new Set([
      ...tournament.teams.map((t) => t._id),
      ...tournament.pendingTeams.map((t) => t._id),
    ]);
    return myTeams.some((myTeam) => tournamentTeamIds.has(myTeam._id));
  }, [myTeams, tournament]);

  const canJoinTournament = React.useMemo(() => {
    if (!tournament || tournament.status !== "REGISTRATION_OPEN" || isOrganizer)
      return false;
    if (loadingMyTeams || !myTeams) return false;
    const tournamentTeamIds = new Set([
      ...(tournament.teams || []).map((t) => t._id),
      ...(tournament.pendingTeams || []).map((t) => t._id),
    ]);
    return myTeams.some((myTeam) => !tournamentTeamIds.has(myTeam._id));
  }, [tournament, myTeams, loadingMyTeams, isOrganizer]);

  const eligibleTeamsToJoin = React.useMemo(() => {
    if (!myTeams || !tournament) return [];
    const tournamentTeamIds = new Set([
      ...(tournament.teams || []).map((t) => t._id),
      ...(tournament.pendingTeams || []).map((t) => t._id),
    ]);
    return myTeams.filter((myTeam) => !tournamentTeamIds.has(myTeam._id));
  }, [myTeams, tournament]);

  const [selectedTeamToJoin, setSelectedTeamToJoin] = useState("");
  const [joinTeamLoading, setJoinTeamLoading] = useState(false);

  const handleJoinTournament = async () => {
    if (!selectedTeamToJoin) return;

    setJoinTeamLoading(true);
    setPageError("");

    try {
      await axios.post(`/tournaments/${id}/teams`, {
        teamId: selectedTeamToJoin,
      });

      const teamName =
        myTeams.find((t) => t._id === selectedTeamToJoin)?.name || "Team";
      setSuccessMessage(`${teamName} request submitted successfully!`);
      setJoinTeamModalOpen(false);
      setSelectedTeamToJoin("");
      await handleTournamentAction();
    } catch (err) {
      setPageError(err.response?.data?.message || "Failed to join tournament");
    } finally {
      setJoinTeamLoading(false);
    }
  };

  useEffect(() => {
    if (error) setPageError(error);
    if (myTeamsError) setPageError(myTeamsError);
  }, [error, myTeamsError]);

  const handleTournamentAction = async () => {
    setPageError("");
    setSuccessMessage("");
    try {
      await refresh();
      setSuccessMessage("Tournament updated successfully");
    } catch (err) {
      setPageError("Failed to refresh tournament data");
    }
  };

  const handleCloseSuccess = () => {
    setSuccessMessage("");
  };

  const handleCloseError = () => {
    setPageError("");
  };

  const canViewBracket = () => {
    return tournament && tournament.status !== "REGISTRATION_OPEN";
  };

  if (loading || (currentUser && loadingMyTeams)) {
    return (
      <Container sx={{ py: 4, textAlign: "center", color: "white" }}>
        <CircularProgress color="inherit" size={60} />
        <Typography sx={{ mt: 2 }}>Loading tournament details...</Typography>
      </Container>
    );
  }

  if (error || !tournament) {
    return (
      <Container sx={{ py: 4, color: "white" }}>
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate("/tournaments")}
            >
              Back to Tournaments
            </Button>
          }
        >
          {error || "Tournament not found."}
        </Alert>
      </Container>
    );
  }

  const getStatusChip = (status) => {
    const statusString = String(status || "").toUpperCase();
    if (statusString === "REGISTRATION_OPEN")
      return <Chip label="Registration Open" color="success" />;
    if (statusString === "REGISTRATION_LOCKED")
      return <Chip label="Registration Locked" color="warning" />;
    if (statusString === "BRACKET_LOCKED")
      return <Chip label="Bracket Locked" color="warning" />;
    if (statusString === "IN_PROGRESS")
      return <Chip label="In Progress" color="info" />;
    if (statusString === "COMPLETED")
      return <Chip label="Completed" color="primary" />;
    const fallbackLabel = statusString.replace(/_/g, " ") || "UNKNOWN";
    return <Chip label={fallbackLabel} color="default" />;
  };

  return (
    <Container sx={{ py: 4, color: "white" }}>
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSuccess}
          severity="success"
          icon={<CheckCircleIcon />}
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {pageError && (
        <Alert
          severity="error"
          onClose={handleCloseError}
          sx={{ mb: 2 }}
          icon={<ErrorIcon />}
        >
          {pageError}
        </Alert>
      )}

      <Paper
        elevation={3}
        sx={{ p: 3, mb: 4, bgcolor: "rgba(255,255,255,0.05)" }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "flex-start", md: "center" },
            gap: 2,
            mb: 2,
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {tournament.name}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <EventIcon fontSize="small" />
              <Typography>
                {moment(tournament.startDate).format("LLL")}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <VideogameAssetIcon fontSize="small" />
              <Typography>{tournament.game}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <GroupIcon fontSize="small" />
              <Typography>
                Participants: {tournament.teams?.length || 0} /{" "}
                {tournament.maxParticipants || "N/A"}
              </Typography>
            </Box>
            {isOrganizer && tournament.refereeCode && (
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 1 }}>
                Your referee code: <strong>{tournament.refereeCode}</strong>
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              textAlign: { xs: "left", md: "right" },
              mt: { xs: 2, md: 0 },
            }}
          >
            {getStatusChip(tournament.status)}
          </Box>
        </Box>
        <Typography variant="body1" sx={{ my: 2 }}>
          {tournament.description}
        </Typography>
        <Box sx={{ mt: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
          {isOrganizer && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              component={RouterLink}
              to={`/tournaments/${id}/edit`}
            >
              Edit Tournament
            </Button>
          )}
          {!isOrganizer && userHasTeamsInTournament && (
            <Button
              variant="outlined"
              onClick={() => setManageTeamsModalOpen(true)}
            >
              Manage My Entries
            </Button>
          )}
          {!isOrganizer &&
            canJoinTournament &&
            tournament.status === "REGISTRATION_OPEN" && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<GroupAddIcon />}
                onClick={() => setJoinTeamModalOpen(true)}
              >
                Join with Team
              </Button>
            )}
        </Box>
      </Paper>

      {isOrganizer && tournament && (
        <Box my={3}>
          <Typography variant="h5" gutterBottom>
            Organizer Controls
          </Typography>
          <ControlsSection
            tournament={tournament}
            onAction={handleTournamentAction}
          />
        </Box>
      )}

      <Divider sx={{ my: 4, borderColor: "rgba(255,255,255,0.2)" }} />

      <Box my={3}>
        <Typography variant="h5" gutterBottom>
          Tournament Bracket
        </Typography>
        {!canViewBracket() ? (
          <Alert
            severity="info"
            sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "white" }}
          >
            Bracket will be available after registrations are locked.
          </Alert>
        ) : (
          <Paper
            elevation={2}
            sx={{
              p: 3,
              bgcolor: "rgba(255,255,255,0.05)",
              textAlign: "center",
            }}
          >
            <Typography variant="h6" gutterBottom>
              View Tournament Bracket
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, opacity: 0.8 }}>
              See the full tournament bracket with all matches and progression
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AccountTreeIcon />}
              component={RouterLink}
              to={`/tournaments/${id}/bracket`}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: "1.1rem",
              }}
            >
              View Bracket
            </Button>
          </Paper>
        )}
      </Box>

      <Divider sx={{ my: 4, borderColor: "rgba(255,255,255,0.2)" }} />

      <Box mb={4}>
        <Typography variant="h5" gutterBottom>
          Participants & Referees
        </Typography>
        <ParticipantsSection
          tournament={tournament}
          onUpdate={handleTournamentAction}
        />
      </Box>

      <Box
        mt={4}
        sx={{
          display: "flex",
          gap: 2,
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        {isOrganizer && (
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (
                window.confirm(
                  "Are you sure you want to cancel this entire tournament? This action cannot be undone."
                )
              ) {
                try {
                  await axios.delete(`/tournaments/${id}`);
                  setSuccessMessage("Tournament cancelled successfully");
                  setTimeout(() => navigate("/tournaments"), 2000);
                } catch (err) {
                  setPageError(
                    err.response?.data?.message ||
                      "Failed to cancel tournament."
                  );
                }
              }
            }}
          >
            Cancel Entire Tournament
          </Button>
        )}
        {isReferee && !isOrganizer && currentUser && (
          <Button
            variant="outlined"
            color="warning"
            onClick={async () => {
              if (
                window.confirm(
                  "Are you sure you want to quit as a referee for this tournament?"
                )
              ) {
                try {
                  await axios.delete(
                    `/tournaments/${id}/referees/${currentUser._id}`
                  );
                  setSuccessMessage("You have quit as referee");
                  await refresh();
                } catch (err) {
                  setPageError(
                    err.response?.data?.message || "Failed to quit as referee."
                  );
                }
              }
            }}
          >
            Quit as Referee
          </Button>
        )}
      </Box>

      <JoinTeamDialog
        open={joinTeamModalOpen}
        onClose={() => {
          setJoinTeamModalOpen(false);
          setSelectedTeamToJoin("");
        }}
        eligibleTeams={eligibleTeamsToJoin}
        selectedTeam={selectedTeamToJoin}
        onTeamChange={(e) => setSelectedTeamToJoin(e.target.value)}
        onJoin={handleJoinTournament}
        loading={joinTeamLoading}
      />

      <ManageTeams
        open={manageTeamsModalOpen}
        onClose={() => setManageTeamsModalOpen(false)}
        tournament={tournament}
        myTeams={myTeams}
        loadingMyTeams={loadingMyTeams}
        onActionSuccess={handleTournamentAction}
      />
    </Container>
  );
};

const JoinTeamDialog = ({
  open,
  onClose,
  eligibleTeams,
  selectedTeam,
  onTeamChange,
  onJoin,
  loading,
}) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Join Tournament with Team</DialogTitle>
      <DialogContent>
        {!eligibleTeams || eligibleTeams.length === 0 ? (
          <Alert severity="info" sx={{ mt: 1 }}>
            All your teams are already in this tournament or you have no
            eligible teams.
          </Alert>
        ) : (
          <FormControl fullWidth margin="normal">
            <InputLabel>Select Team</InputLabel>
            <Select
              value={selectedTeam}
              label="Select Team"
              onChange={onTeamChange}
            >
              {eligibleTeams.map((team) => (
                <MenuItem key={team._id} value={team._id}>
                  {team.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onJoin}
          disabled={!selectedTeam || loading}
          variant="contained"
        >
          {loading ? "Joining..." : "Join Tournament"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TournamentPage;
