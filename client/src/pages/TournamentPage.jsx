import React, { useState, useEffect } from "react"
import { useParams, Link as RouterLink, useNavigate } from "react-router-dom"
import { Container, Typography, Box, CircularProgress, Paper, Chip, Alert, Divider, Button } from "@mui/material"
import useTournament from "../hooks/useTournament"
import { useAuth } from "../context/AuthContext"
import useMyTeams from "../hooks/useMyTeams"
import ManageTeams from "../components/ManageTeams"
import ParticipantsSection from "../components/ParticipantsSection"
import Bracket from "../components/Bracket"
import ControlsSection from "../components/ControlsSection"

import moment from "moment"
import axios from "axios"

import EventIcon from "@mui/icons-material/Event"
import VideogameAssetIcon from "@mui/icons-material/VideogameAsset"
import GroupIcon from "@mui/icons-material/Group"
import EditIcon from "@mui/icons-material/Edit"
import SettingsIcon from "@mui/icons-material/Settings"
import GroupAddIcon from "@mui/icons-material/GroupAdd"

const TournamentPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { tournament, matchesByPhase, loading, error, refresh } = useTournament(id)
  const { teams: myTeams, loading: loadingMyTeams, error: myTeamsError } = useMyTeams()

  const [manageTeamsModalOpen, setManageTeamsModalOpen] = useState(false)
  const [pageError, setPageError] = useState("")

  const isOrganizer = React.useMemo(() => {
    if (tournament && typeof tournament.isOrganizer === "boolean") return tournament.isOrganizer
    return currentUser && tournament && tournament.organizer && tournament.organizer._id === currentUser._id
  }, [tournament, currentUser])

  const isReferee = React.useMemo(() => tournament && tournament.isReferee, [tournament])

  const userHasTeamsInTournament = React.useMemo(() => {
    if (!myTeams || !tournament || !Array.isArray(tournament.teams) || !Array.isArray(tournament.pendingTeams))
      return false
    const tournamentTeamIds = new Set([
      ...tournament.teams.map((t) => t._id),
      ...tournament.pendingTeams.map((t) => t._id),
    ])
    return myTeams.some((myTeam) => tournamentTeamIds.has(myTeam._id))
  }, [myTeams, tournament])

  const canJoinTournament = React.useMemo(() => {
    if (!tournament || tournament.status !== "REGISTRATION_OPEN" || isOrganizer) return false
    if (loadingMyTeams || !myTeams) return false
    const tournamentTeamIds = new Set([
      ...(tournament.teams || []).map((t) => t._id),
      ...(tournament.pendingTeams || []).map((t) => t._id),
    ])
    return myTeams.some((myTeam) => !tournamentTeamIds.has(myTeam._id))
  }, [tournament, myTeams, loadingMyTeams, isOrganizer])

  useEffect(() => {
    if (error) setPageError(error)
    if (myTeamsError) setPageError(myTeamsError)
  }, [error, myTeamsError])

  const handleBracketUpdate = async (updateInfo) => {
    const { phaseIndex, slot, teamId, position } = updateInfo
    console.log("TournamentPage: handleBracketUpdate received:", updateInfo)

    if (typeof phaseIndex !== "number" || typeof slot !== "number" || !teamId || !position) {
      console.error("TournamentPage: Invalid data received for bracket update.", updateInfo)
      setPageError("Invalid data for bracket update. Check console.")
      return
    }

    let matchChanges = {}
    // Corrected logic: single if/else if/else block
    if (position === "A") {
      matchChanges = { slot, teamA: teamId /*, teamB: undefined */ } // teamB: undefined is optional, depends on API
    } else if (position === "B") {
      matchChanges = { slot, teamB: teamId /*, teamA: undefined */ } // teamA: undefined is optional
    } else {
      // This case should ideally not be reached if 'position' is always 'A' or 'B' from Bracket.jsx
      console.error("TournamentPage: Invalid 'position' value for bracket update:", position)
      setPageError("Invalid position value for bracket update. Check console.")
      return
    }

    const payload = {
      phaseIndex,
      matches: [matchChanges], // API expects an array of match updates
    }
    console.log("TournamentPage: Sending payload to API:", payload)

    try {
      await axios.put(`/api/tournaments/${id}/bracket`, payload)
      console.log("TournamentPage: Bracket update API call successful.")
      refresh() // Refresh data to show the update
    } catch (err) {
      console.error("TournamentPage: Bracket update API call failed:", err.response || err)
      setPageError(err.response?.data?.message || "Failed to update bracket. Check console.")
    }
  }

  if (loading || (currentUser && loadingMyTeams)) {
    return (
      <Container sx={{ py: 4, textAlign: "center", color: "white" }}>
        <CircularProgress color="inherit" /> <Typography>Loading tournament details...</Typography>
      </Container>
    )
  }

  if (error || !tournament) {
    return (
      <Container sx={{ py: 4, color: "white" }}>
        <Alert severity="error">{error || "Tournament not found."}</Alert>
      </Container>
    )
  }

  const getStatusChip = (status) => {
    const statusString = String(status || "").toUpperCase()
    if (statusString === "REGISTRATION_OPEN") return <Chip label="Registration Open" color="success" />
    if (statusString === "REGISTRATION_LOCKED") return <Chip label="Registration Locked" color="warning" />
    if (statusString === "IN_PROGRESS") return <Chip label="In Progress" color="info" />
    if (statusString === "COMPLETED") return <Chip label="Completed" color="primary" />
    const fallbackLabel = statusString.replace(/_/g, " ") || "UNKNOWN"
    return <Chip label={fallbackLabel} color="default" />
  }

  return (
    <Container sx={{ py: 4, color: "white" }}>
      {pageError && (
        <Alert severity="error" onClose={() => setPageError("")} sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 3, mb: 4, bgcolor: "rgba(255,255,255,0.05)" }}>
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
              <Typography>{moment(tournament.startDate).format("LLL")}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <VideogameAssetIcon fontSize="small" />
              <Typography>{tournament.game}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <GroupIcon fontSize="small" />
              <Typography>
                Participants: {tournament.teams?.length || 0} / {tournament.maxParticipants || "N/A"}
              </Typography>
            </Box>
            {isOrganizer && tournament.refereeCode && (
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 1 }}>
                Your referee code: <strong>{tournament.refereeCode}</strong>
              </Typography>
            )}
          </Box>
          <Box sx={{ textAlign: { xs: "left", md: "right" }, mt: { xs: 2, md: 0 } }}>
            {getStatusChip(tournament.status)}
          </Box>
        </Box>
        <Typography variant="body1" sx={{ my: 2 }}>
          {tournament.description}
        </Typography>
        <Box sx={{ mt: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
          {isOrganizer && (
            <>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                component={RouterLink}
                to={`/tournaments/${id}/edit`}
              >
                Edit Tournament
              </Button>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                component={RouterLink}
                to={`/tournaments/${id}/settings`}
              >
                Manage Settings
              </Button>
            </>
          )}
          {!isOrganizer && userHasTeamsInTournament && (
            <Button variant="outlined" onClick={() => setManageTeamsModalOpen(true)}>
              Manage My Entries
            </Button>
          )}
          {!isOrganizer && canJoinTournament && tournament.status === "REGISTRATION_OPEN" && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<GroupAddIcon />}
              onClick={() => console.log("Attempting to join tournament with a new team.")}
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
          <ControlsSection tournament={tournament} onAction={refresh} />
        </Box>
      )}
      <Divider sx={{ my: 4, borderColor: "rgba(255,255,255,0.2)" }} />
      <Box my={3}>
        <Typography variant="h5" gutterBottom>
          Bracket
        </Typography>
        {tournament.status === "REGISTRATION_OPEN" ? (
          <Alert severity="info" sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "white" }}>
            Bracket will be available after registrations are locked.
          </Alert>
        ) : (
          <Bracket
            phases={tournament.phases || []}
            matchesByPhase={matchesByPhase || tournament.matchesByPhase || []}
            participants={tournament.teams || []}
            organizerMode={isOrganizer}
            onBracketUpdate={handleBracketUpdate}
            tournament={tournament}
          />
        )}
      </Box>
      <Divider sx={{ my: 4, borderColor: "rgba(255,255,255,0.2)" }} />
      <Box mb={4}>
        <Typography variant="h5" gutterBottom>
          Participants & Referees
        </Typography>
        <ParticipantsSection tournament={tournament} onUpdate={refresh} />
      </Box>
      <Box mt={4} sx={{ display: "flex", gap: 2, flexDirection: "column", alignItems: "flex-start" }}>
        {isOrganizer && (
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (
                window.confirm("Are you sure you want to cancel this entire tournament? This action cannot be undone.")
              ) {
                try {
                  await axios.delete(`/api/tournaments/${id}`)
                  navigate("/tournaments")
                } catch (err) {
                  setPageError(err.response?.data?.message || "Failed to cancel tournament.")
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
              if (window.confirm("Are you sure you want to quit as a referee for this tournament?")) {
                try {
                  await axios.delete(`/api/tournaments/${id}/referees/${currentUser._id}`)
                  refresh()
                } catch (err) {
                  setPageError(err.response?.data?.message || "Failed to quit as referee.")
                }
              }
            }}
          >
            Quit as Referee
          </Button>
        )}
      </Box>
      {!loadingMyTeams && currentUser && tournament && myTeams && (
        <ManageTeams
          open={manageTeamsModalOpen}
          onClose={() => setManageTeamsModalOpen(false)}
          tournament={tournament}
          myTeams={myTeams}
          loadingMyTeams={loadingMyTeams}
          onActionSuccess={refresh}
        />
      )}
    </Container>
  )
}

export default TournamentPage