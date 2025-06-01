import React from "react"
import { useMemo, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Button,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material"
import { DeleteForever, Cancel } from "@mui/icons-material"
import axios from "axios"

const ManageTeams = ({
  open,
  onClose,
  tournament, // Full tournament object
  myTeams, // Array of user's teams from useMyTeams
  loadingMyTeams,
  onActionSuccess, // This will be the 'refresh' function from useTournament
}) => {
  const [processingTeamId, setProcessingTeamId] = useState(null)
  const [error, setError] = useState("")

  const teamsToShow = useMemo(() => {
    if (!myTeams || !tournament) return []
    const tournamentTeamIds = new Set([
      ...tournament.teams.map((t) => t._id),
      ...tournament.pendingTeams.map((t) => t._id),
    ])

    return myTeams
      .filter((myTeam) => tournamentTeamIds.has(myTeam._id))
      .map((myTeam) => {
        const isApproved = tournament.teams.some((t) => t._id === myTeam._id)
        return {
          ...myTeam,
          statusInTournament: isApproved ? "APPROVED" : "PENDING",
        }
      })
  }, [myTeams, tournament])

  const handleTeamAction = async (teamId, teamName, currentStatus) => {
    const actionText = currentStatus === "APPROVED" ? "leave this tournament" : "cancel your request"
    if (!window.confirm(`Are you sure you want to ${actionText} with team "${teamName}"?`)) {
      return
    }
    setProcessingTeamId(teamId)
    setError("")
    try {
      await axios.delete(`/api/tournaments/${tournament._id}/teams/${teamId}`)
      onActionSuccess() // Refresh tournament data
      // If only one team was shown and it's removed, consider closing modal
      if (teamsToShow.length === 1 && teamsToShow[0]._id === teamId) {
        onClose()
      }
    } catch (err) {
      setError(err.response?.data?.message || `Error performing action for ${teamName}.`)
    } finally {
      setProcessingTeamId(null)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Manage Your Team Entries for "{tournament?.name}"</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {loadingMyTeams && <CircularProgress sx={{ display: "block", margin: "20px auto" }} />}

        {!loadingMyTeams && teamsToShow.length === 0 && (
          <Typography>None of your teams are currently in this tournament.</Typography>
        )}

        {!loadingMyTeams && teamsToShow.length > 0 && (
          <List>
            {teamsToShow.map((team) => (
              <ListItem
                key={team._id}
                divider
                secondaryAction={
                  <Tooltip title={team.statusInTournament === "APPROVED" ? "Leave Tournament" : "Cancel Request"}>
                    <span>
                      {" "}
                      {/* Tooltip needs a DOM element child if button is disabled */}
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={() => handleTeamAction(team._id, team.name, team.statusInTournament)}
                        disabled={processingTeamId === team._id}
                        aria-label={team.statusInTournament === "APPROVED" ? "leave tournament" : "cancel request"}
                      >
                        {processingTeamId === team._id ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : team.statusInTournament === "APPROVED" ? (
                          <DeleteForever />
                        ) : (
                          <Cancel />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                }
              >
                <ListItemText
                  primary={team.name}
                  secondary={`Status: ${
                    team.statusInTournament === "APPROVED" ? "Approved & Participating" : "Request Pending"
                  }`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export default ManageTeams;