import React, { useState } from "react"
import { DndContext } from "@dnd-kit/core"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Tooltip,
  useTheme, // Added useTheme import
} from "@mui/material"
import { Link } from "react-router-dom"
import { ViewModule, ViewStream, AutoAwesome, Schedule, EmojiEvents, Info } from "@mui/icons-material"

/**
 * A draggable "team chip."
 */
function DraggableTeam({ team }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: team._id })
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
    width: "100%",
  }
  return (
    <Paper
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{
        p: 1,
        ...style,
        backgroundColor: team.color || "#424242", // This is for unplaced draggable teams
        color: "white",
        borderRadius: "4px",
        textOverflow: "ellipsis",
        overflow: "hidden",
        whiteSpace: "nowrap",
        minHeight: "36px",
        display: "flex",
        alignItems: "center",
      }}
      elevation={2}
    >
      {team.name}
    </Paper>
  )
}

/**
 * A droppable bracket slot for a team.
 */
const DroppableTeamSlot = ({ id, team, isTop = true, matchHasEmptySlot = false }) => {
  const { isOver, setNodeRef } = useDroppable({ id })
  const theme = useTheme() // useTheme for palette access

  return (
    <Box
      ref={setNodeRef}
      sx={{
        height: "36px",
        width: "100%",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        mb: isTop ? 1 : 0,
        mt: isTop ? 0 : 1,
      }}
    >
      {team ? (
        <Paper
          elevation={3}
          sx={{
            p: 1,
            height: "100%",
            width: "100%",
            backgroundColor: theme.palette.primary.main, // Use theme's primary color
            color: theme.palette.getContrastText(theme.palette.primary.main), // Ensure text contrast
            display: "flex",
            alignItems: "center",
            borderRadius: "6px",
            textOverflow: "ellipsis",
            overflow: "hidden",
            whiteSpace: "nowrap",
            fontSize: "0.875rem",
            border: "2px solid rgba(0, 0, 0, 0.4)", // Slightly softer border
            boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
          }}
        >
          {team.name}
        </Paper>
      ) : (
        <Paper
          elevation={1}
          sx={{
            p: 1,
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center", // Center placeholder text
            color: "#000000",
            fontSize: "0.75rem",
            overflow: "hidden",
            backgroundColor: isOver ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.6)",
            borderRadius: "6px",
            border: isOver ? "2px solid #000000" : "2px dashed rgba(0, 0, 0, 0.5)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "all 0.2s ease",
          }}
        >
          {matchHasEmptySlot ? "Drop team here" : "Empty slot"}
        </Paper>
      )}
    </Box>
  )
}

/**
 * Enhanced bracket match component with additional features
 */
const BracketMatch = ({ match, phaseIndex, organizerMode, enhanced = false }) => {
  const theme = useTheme()
  const hasEmptySlot = !match.teamA || !match.teamB

  const getMatchStatusColor = (status) => {
    switch (status) {
      case "COMPLETED":
        return "success"
      case "SCHEDULED":
        return "warning"
      case "PENDING":
        return "default"
      default:
        return "default"
    }
  }

  const getWinnerIndicator = (team, isWinner) => {
    if (!isWinner || !enhanced) return null
    return (
      <Tooltip title="Winner">
        <EmojiEvents sx={{ color: "gold", fontSize: "16px", ml: 1 }} />
      </Tooltip>
    )
  }

  console.log(
    `BracketMatch: For Match ${match.matchNumber} (phase ${phaseIndex}), raw match.matchNumber is:`,
    match.matchNumber,
    typeof match.matchNumber,
  )

  return (
    <Paper
      sx={{
        p: 2.5,
        width: enhanced ? "280px" : "260px",
        height: "auto",
        minHeight: "170px", // Increased minHeight to give more space for the button
        backgroundColor: theme.palette.primary.main, // Use theme's primary color
        color: theme.palette.getContrastText(theme.palette.primary.main), // Default text color for contrast
        borderRadius: "8px",
        position: "relative",
        border:
          enhanced && match.status === "COMPLETED"
            ? "3px solid gold"
            : hasEmptySlot
              ? "2px dashed rgba(0, 0, 0, 0.4)"
              : "2px solid rgba(0, 0, 0, 0.3)",
        display: "flex",
        flexDirection: "column",
        overflow: "visible",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        pb: organizerMode && enhanced ? "40px" : "2.5", // Add padding at bottom if edit button is present
      }}
    >
      {/* Enhanced: Match Status Indicator */}
      {enhanced && (
        <Box
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, minHeight: "24px" }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontSize: "0.875rem",
              fontWeight: "bold",
              color: theme.palette.getContrastText(theme.palette.primary.main),
            }}
          >
            Match {match.matchNumber}
          </Typography>
          <Chip
            label={match.status || "PENDING"}
            size="small"
            color={getMatchStatusColor(match.status)}
            variant="filled"
            sx={{ fontSize: "0.7rem", height: "20px", fontWeight: "bold" }}
          />
        </Box>
      )}

      {/* Teams Container */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0, overflow: "visible" }}>
        {/* Team A Slot */}
        <Box sx={{ display: "flex", alignItems: "center", height: "36px" }}>
          <Box sx={{ flex: 1, overflow: "visible" }}>
            <DroppableTeamSlot
              id={`slot-${phaseIndex}-${match.matchNumber}-A`}
              team={match.teamA}
              isTop={true}
              matchHasEmptySlot={hasEmptySlot}
            />
          </Box>
          {getWinnerIndicator(match.teamA, match.winner?._id === match.teamA?._id)}
        </Box>

        {/* Enhanced: Score Display */}
        {enhanced && (match.scoreA !== null || match.scoreB !== null) && (
          <Box sx={{ textAlign: "center", py: 1, minHeight: "20px" }}>
            <Typography
              variant="body2"
              fontWeight="bold"
              sx={{ fontSize: "0.875rem", color: theme.palette.getContrastText(theme.palette.primary.main) }}
            >
              {match.scoreA ?? 0} - {match.scoreB ?? 0}
            </Typography>
          </Box>
        )}

        {/* Team B Slot */}
        <Box sx={{ display: "flex", alignItems: "center", height: "36px" }}>
          <Box sx={{ flex: 1, overflow: "visible" }}>
            <DroppableTeamSlot
              id={`slot-${phaseIndex}-${match.matchNumber}-B`}
              team={match.teamB}
              isTop={false}
              matchHasEmptySlot={hasEmptySlot}
            />
          </Box>
          {getWinnerIndicator(match.teamB, match.winner?._id === match.teamB?._id)}
        </Box>
      </Box>

      {/* Enhanced: Match Info */}
      {enhanced && match.scheduledAt && (
        <Box sx={{ display: "flex", alignItems: "center", mt: 1, justifyContent: "center", minHeight: "18px" }}>
          <Schedule sx={{ fontSize: "14px", mr: 0.5 }} />
          <Typography
            variant="caption"
            sx={{ fontSize: "0.7rem", color: theme.palette.getContrastText(theme.palette.primary.main) }}
          >
            {new Date(match.scheduledAt).toLocaleDateString()}
          </Typography>
        </Box>
      )}

      {/* Edit Button */}
      {organizerMode && (
        <Button
          component={Link}
          to={`/matches/${match._id}`} // Ensure match._id is available
          size="small"
          sx={{
            position: "absolute",
            right: "8px",
            bottom: "8px",
            minWidth: "auto",
            p: "6px 10px",
            fontSize: "0.75rem",
            height: "28px",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            color: "#000000",
            border: "2px solid #000000",
            borderRadius: "4px",
            fontWeight: "bold",
            "&:hover": {
              backgroundColor: "#ffffff",
              transform: "scale(1.05)",
            },
            zIndex: 10, // Ensure button is on top
          }}
          variant="contained"
        >
          {enhanced ? <Info fontSize="small" /> : "Edit"}
        </Button>
      )}
    </Paper>
  )
}

/**
 * Enhanced bracket connector with round labels
 */
const BracketConnector = ({ enhanced = false, fromRound, toRound }) => {
  if (!enhanced) {
    return (
      <Box
        sx={{
          position: "relative",
          width: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Divider orientation="horizontal" sx={{ width: "100%" }} />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        position: "relative",
        width: "60px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Connection Line */}
      <Box
        sx={{
          width: "100%",
          height: "2px",
          backgroundColor: "divider",
          position: "relative",
        }}
      >
        {/* Arrow */}
        <Box
          sx={{
            position: "absolute",
            right: "-6px",
            top: "-3px",
            width: 0,
            height: 0,
            borderLeft: "6px solid",
            borderTop: "4px solid transparent",
            borderBottom: "4px solid transparent",
            borderColor: "divider", // Uses theme's divider color
          }}
        />
      </Box>

      {/* Round Label */}
      <Typography variant="caption" sx={{ mt: 1, color: "text.secondary" }}>
        Round {toRound}
      </Typography>
    </Box>
  )
}

/**
 * A column of matches in the bracket
 */
const BracketColumn = ({ phase, matches, phaseIndex, organizerMode, enhanced = false }) => {
  const matchCount = matches.length

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: matchCount > 1 ? "space-around" : "flex-start", // Adjusted for single match
        alignItems: "center", // Center items if fewer matches
        height: "100%",
        minWidth: enhanced ? "280px" : "260px",
        maxWidth: enhanced ? "280px" : "260px",
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 2, textAlign: "center", color: "text.primary" }}>
        {phase.bracketType.replace(/_/g, " ")}
      </Typography>

      <Stack spacing={4} sx={{ height: "100%", width: "100%" }}>
        {" "}
        {/* Ensure stack takes width */}
        {matches.map((match) => (
          <BracketMatch
            key={match.matchNumber} // Ensure match has a unique key, matchNumber is good if unique per phase
            match={match}
            phaseIndex={phaseIndex}
            organizerMode={organizerMode}
            enhanced={enhanced}
          />
        ))}
      </Stack>
    </Box>
  )
}

/**
 * Bracket statistics component
 */
const BracketStats = ({ tournament, matchesByPhase }) => {
  const totalMatches = matchesByPhase.flat().length
  const completedMatches = matchesByPhase.flat().filter((m) => m.status === "COMPLETED").length
  const scheduledMatches = matchesByPhase.flat().filter((m) => m.status === "SCHEDULED").length

  return (
    <Box sx={{ mb: 3, p: 2, bgcolor: "background.paper", borderRadius: "4px" }}>
      <Typography variant="h6" gutterBottom sx={{ color: "text.primary" }}>
        Tournament Progress
      </Typography>
      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Total Matches
          </Typography>
          <Typography variant="h6" sx={{ color: "text.primary" }}>
            {totalMatches}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Completed
          </Typography>
          <Typography variant="h6" color="success.main">
            {completedMatches}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Scheduled
          </Typography>
          <Typography variant="h6" color="warning.main">
            {scheduledMatches}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Progress
          </Typography>
          <Typography variant="h6" sx={{ color: "text.primary" }}>
            {totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0}%
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

/**
 * Main Bracket component with enhanced features
 */
const Bracket = ({ phases, matchesByPhase, participants, organizerMode, onBracketUpdate, tournament }) => {
  const [viewMode, setViewMode] = useState("visual")
  const [autoGenerating, setAutoGenerating] = useState(false)
  const [enhancedMode, setEnhancedMode] = useState(true) // Default to true

  const handleAutoGenerate = async () => {
    if (!organizerMode || participants.length === 0) return

    setAutoGenerating(true)
    try {
      const shuffledTeams = [...participants].sort(() => Math.random() - 0.5)
      const firstPhaseMatches = matchesByPhase[0] || []
      const updates = []

      for (let i = 0; i < Math.min(shuffledTeams.length, firstPhaseMatches.length * 2); i += 2) {
        const matchIndex = Math.floor(i / 2)
        const match = firstPhaseMatches[matchIndex]

        if (match) {
          updates.push({
            phaseIndex: 0,
            slot: match.matchNumber,
            teamId: shuffledTeams[i]._id,
            position: "A",
          })

          if (shuffledTeams[i + 1]) {
            updates.push({
              phaseIndex: 0,
              slot: match.matchNumber,
              teamId: shuffledTeams[i + 1]._id,
              position: "B",
            })
          }
        }
      }
      for (const update of updates) {
        await onBracketUpdate(update)
      }
    } catch (error) {
      console.error("Auto-generation failed:", error)
    } finally {
      setAutoGenerating(false)
    }
  }

  const getUnplacedTeams = () => {
    const placedTeamIds = new Set()
    matchesByPhase.forEach((matchesInPhase) => {
      // Ensure matchesInPhase is an array
      ;(matchesInPhase || []).forEach((match) => {
        if (match.teamA) placedTeamIds.add(match.teamA._id)
        if (match.teamB) placedTeamIds.add(match.teamB._id)
      })
    })
    return participants.filter((team) => !placedTeamIds.has(team._id))
  }

  const unplacedTeams = getUnplacedTeams()

  return (
    <DndContext
      onDragEnd={({ active, over }) => {
        console.log("Bracket.jsx - onDragEnd fired. Active:", active, "Over:", over)

        if (!active) {
          // Only need to check active here, over can be null
          console.log("Bracket.jsx - onDragEnd: No 'active' element. Bailing.")
          return
        }

        if (!over || !over.id) {
          // Check if over or over.id is null/undefined
          console.log("Bracket.jsx - onDragEnd: No 'over' target or 'over.id' is missing. Bailing. Over:", over)
          return // Exit if no valid drop target
        }

        // If we reach here, 'over' and 'over.id' are valid
        console.log("Bracket.jsx - onDragEnd: Raw over.id:", over.id)
        const parts = String(over.id).split("-")
        console.log("Bracket.jsx - onDragEnd: 'over.id' parts:", parts)

        if (parts[0] === "slot" && parts.length === 4) {
          const phaseIndex = Number(parts[1])
          const slotValueFromId = parts[2] // Keep as string first for logging
          const slot = Number(slotValueFromId) // Then convert to number
          const requestedPosition = parts[3]

          console.log("Bracket.jsx - onDragEnd: Parsed data:", {
            phaseIndex,
            slot, // This is the potentially NaN value
            slotValueFromId, // Log the string value from ID
            requestedPosition,
            teamId: String(active.id),
          })

          if (isNaN(slot)) {
            console.error(
              `Bracket.jsx - onDragEnd: 'slot' is NaN. Original value from ID (parts[2]) was: "${slotValueFromId}". Check match.matchNumber for this slot. Bailing.`,
            )
            return
          }

          const currentMatch = (matchesByPhase[phaseIndex] || []).find((m) => m.matchNumber === slot)
          if (!currentMatch) {
            console.log(
              "Bracket.jsx - onDragEnd: currentMatch not found for phaseIndex:",
              phaseIndex,
              "slot:",
              slot,
              ". Bailing.",
            )
            return
          }
          console.log("Bracket.jsx - onDragEnd: currentMatch found:", currentMatch)

          let finalPosition = requestedPosition
          if (requestedPosition === "A" && currentMatch.teamA && !currentMatch.teamB) {
            finalPosition = "B"
            console.log("Bracket.jsx - onDragEnd: Switched to finalPosition 'B'")
          } else if (requestedPosition === "B" && currentMatch.teamB && !currentMatch.teamA) {
            finalPosition = "A"
            console.log("Bracket.jsx - onDragEnd: Switched to finalPosition 'A'")
          }

          const updatePayload = {
            phaseIndex,
            slot,
            teamId: String(active.id),
            position: finalPosition,
          }
          console.log("Bracket.jsx - onDragEnd: Calling onBracketUpdate with:", updatePayload)
          onBracketUpdate(updatePayload)
        } else {
          console.log("Bracket.jsx - onDragEnd: Dropped on non-slot or invalid slot ID format. over.id:", over.id)
        }
      }}
    >
      <Box sx={{ mb: 6 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h6" sx={{ color: "text.primary" }}>
            Tournament Bracket
          </Typography>
          {enhancedMode && (
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, newMode) => newMode && setViewMode(newMode)}
                size="small"
              >
                <ToggleButton value="visual" aria-label="visual view">
                  <ViewModule />
                </ToggleButton>
                <ToggleButton value="list" aria-label="list view">
                  <ViewStream />
                </ToggleButton>
              </ToggleButtonGroup>
              {organizerMode && unplacedTeams.length > 0 && (
                <Button
                  variant="outlined"
                  startIcon={<AutoAwesome />}
                  onClick={handleAutoGenerate}
                  disabled={autoGenerating}
                  size="small"
                >
                  {autoGenerating ? "Generating..." : "Auto-Generate"}
                </Button>
              )}
            </Box>
          )}
        </Box>

        {enhancedMode && tournament && <BracketStats tournament={tournament} matchesByPhase={matchesByPhase} />}

        {organizerMode && unplacedTeams.length > 0 && (
          <Paper sx={{ mb: 4, p: 2, bgcolor: "background.paper", borderRadius: "4px" }} elevation={3}>
            <Typography variant="subtitle1" gutterBottom sx={{ color: "text.primary" }}>
              Unplaced Teams ({unplacedTeams.length})
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 1,
              }}
            >
              {unplacedTeams.map((team) => (
                <DraggableTeam key={team._id} team={team} />
              ))}
            </Box>
          </Paper>
        )}

        {viewMode === "visual" ? (
          <Box
            sx={{
              display: "flex",
              overflowX: "auto",
              pb: 2, // Padding at the bottom of the scrollable area
              gap: enhancedMode ? 3 : 2, // More gap in enhanced mode
              minHeight: "500px",
              ...(enhancedMode && {
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "8px",
                p: 2, // Padding inside the bordered box
              }),
            }}
          >
            {(phases || []).map((phase, phaseIndex) => (
              <React.Fragment key={phaseIndex}>
                {phaseIndex > 0 && (
                  <BracketConnector enhanced={enhancedMode} fromRound={phaseIndex} toRound={phaseIndex + 1} />
                )}
                <BracketColumn
                  phase={phase}
                  matches={matchesByPhase[phaseIndex] || []}
                  phaseIndex={phaseIndex}
                  organizerMode={organizerMode}
                  enhanced={enhancedMode}
                />
              </React.Fragment>
            ))}
          </Box>
        ) : (
          enhancedMode && (
            <Box>
              {(phases || []).map((phase, phaseIndex) => (
                <Paper key={phaseIndex} sx={{ mb: 3, p: 2, bgcolor: "background.paper" }} elevation={2}>
                  <Typography variant="h6" gutterBottom sx={{ color: "text.primary" }}>
                    Phase {phaseIndex + 1} — {phase.bracketType.replace(/_/g, " ")}
                    <Chip
                      label={phase.status}
                      size="small"
                      sx={{ ml: 2 }}
                      color={phase.status === "COMPLETE" ? "success" : "default"}
                    />
                  </Typography>
                  <Stack spacing={2}>
                    {(matchesByPhase[phaseIndex] || []).map((match) => (
                      <BracketMatch
                        key={match.matchNumber} // Ensure match has a unique key
                        match={match}
                        phaseIndex={phaseIndex}
                        organizerMode={organizerMode}
                        enhanced={enhancedMode}
                      />
                    ))}
                  </Stack>
                </Paper>
              ))}
            </Box>
          )
        )}
      </Box>
    </DndContext>
  )
}

export default Bracket