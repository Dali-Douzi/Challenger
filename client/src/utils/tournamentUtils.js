/**
 * Tournament utility functions for validation and business logic
 */

/**
 * Validates tournament status transitions
 */
export const TOURNAMENT_STATUSES = {
    REGISTRATION_OPEN: "REGISTRATION_OPEN",
    REGISTRATION_LOCKED: "REGISTRATION_LOCKED", 
    BRACKET_LOCKED: "BRACKET_LOCKED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETE: "COMPLETE"
  }
  
  export const VALID_STATUS_TRANSITIONS = {
    [TOURNAMENT_STATUSES.REGISTRATION_OPEN]: [TOURNAMENT_STATUSES.REGISTRATION_LOCKED],
    [TOURNAMENT_STATUSES.REGISTRATION_LOCKED]: [TOURNAMENT_STATUSES.BRACKET_LOCKED, TOURNAMENT_STATUSES.REGISTRATION_OPEN],
    [TOURNAMENT_STATUSES.BRACKET_LOCKED]: [TOURNAMENT_STATUSES.IN_PROGRESS],
    [TOURNAMENT_STATUSES.IN_PROGRESS]: [TOURNAMENT_STATUSES.COMPLETE],
    [TOURNAMENT_STATUSES.COMPLETE]: []
  }
  
  /**
   * Check if a status transition is valid
   */
  export const isValidStatusTransition = (currentStatus, newStatus) => {
    return VALID_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) || false
  }
  
  /**
   * Get user-friendly status labels
   */
  export const getStatusLabel = (status) => {
    const labels = {
      [TOURNAMENT_STATUSES.REGISTRATION_OPEN]: "Registration Open",
      [TOURNAMENT_STATUSES.REGISTRATION_LOCKED]: "Registration Locked",
      [TOURNAMENT_STATUSES.BRACKET_LOCKED]: "Bracket Locked",
      [TOURNAMENT_STATUSES.IN_PROGRESS]: "In Progress", 
      [TOURNAMENT_STATUSES.COMPLETE]: "Complete"
    }
    return labels[status] || status?.replace(/_/g, " ") || "Unknown"
  }
  
  /**
   * Get status chip color for Material-UI
   */
  export const getStatusChipColor = (status) => {
    switch (status) {
      case TOURNAMENT_STATUSES.REGISTRATION_OPEN:
        return "success"
      case TOURNAMENT_STATUSES.REGISTRATION_LOCKED:
        return "warning"
      case TOURNAMENT_STATUSES.BRACKET_LOCKED:
        return "warning"
      case TOURNAMENT_STATUSES.IN_PROGRESS:
        return "info"
      case TOURNAMENT_STATUSES.COMPLETE:
        return "primary"
      default:
        return "default"
    }
  }
  
  /**
   * Tournament readiness validation
   */
  export const validateTournamentReadiness = (tournament, targetStatus) => {
    const teamCount = tournament.teams?.length || 0
    
    switch (targetStatus) {
      case TOURNAMENT_STATUSES.REGISTRATION_LOCKED:
        if (teamCount < 2) {
          return { valid: false, message: "Need at least 2 teams to close registration" }
        }
        break
        
      case TOURNAMENT_STATUSES.BRACKET_LOCKED:
        if (teamCount < 2) {
          return { valid: false, message: "Need at least 2 teams to lock bracket" }
        }
        if (tournament.status !== TOURNAMENT_STATUSES.REGISTRATION_LOCKED) {
          return { valid: false, message: "Must close registration first" }
        }
        break
        
      case TOURNAMENT_STATUSES.IN_PROGRESS:
        if (tournament.status !== TOURNAMENT_STATUSES.BRACKET_LOCKED) {
          return { valid: false, message: "Must lock bracket first" }
        }
        break
        
      case TOURNAMENT_STATUSES.COMPLETE:
        if (tournament.status !== TOURNAMENT_STATUSES.IN_PROGRESS) {
          return { valid: false, message: "Tournament must be in progress to complete" }
        }
        break
    }
    
    return { valid: true }
  }
  
  /**
   * Check what actions are available for a tournament
   */
  export const getAvailableActions = (tournament, userRole = "viewer") => {
    const actions = {
      canJoinAsTeam: false,
      canApproveTeams: false,
      canLockRegistration: false,
      canLockBracket: false,
      canStartTournament: false,
      canCompleteTournament: false,
      canEditBracket: false,
      canEditMatches: false,
      canCancelTournament: false
    }
  
    if (!tournament) return actions
  
    const isOrganizer = userRole === "organizer"
    const isReferee = userRole === "referee" || isOrganizer
  
    // Team joining
    actions.canJoinAsTeam = tournament.status === TOURNAMENT_STATUSES.REGISTRATION_OPEN && 
                           tournament.teams.length < tournament.maxParticipants
  
    // Organizer actions
    if (isOrganizer) {
      actions.canApproveTeams = tournament.status === TOURNAMENT_STATUSES.REGISTRATION_OPEN
      actions.canLockRegistration = tournament.status === TOURNAMENT_STATUSES.REGISTRATION_OPEN && 
                                   tournament.teams.length >= 2
      actions.canLockBracket = tournament.status === TOURNAMENT_STATUSES.REGISTRATION_LOCKED && 
                             tournament.teams.length >= 2
      actions.canCompleteTournament = tournament.status === TOURNAMENT_STATUSES.IN_PROGRESS
      actions.canEditBracket = tournament.status === TOURNAMENT_STATUSES.BRACKET_LOCKED
      actions.canCancelTournament = tournament.status !== TOURNAMENT_STATUSES.COMPLETE
    }
  
    // Referee + Organizer actions
    if (isReferee) {
      actions.canStartTournament = tournament.status === TOURNAMENT_STATUSES.BRACKET_LOCKED
      actions.canEditMatches = tournament.status === TOURNAMENT_STATUSES.IN_PROGRESS || 
                             tournament.status === TOURNAMENT_STATUSES.BRACKET_LOCKED
    }
  
    return actions
  }
  
  /**
   * Bracket validation helpers
   */
  export const validateBracketUpdate = (tournament, updateInfo, matchesByPhase) => {
    const { phaseIndex, slot, teamId, position } = updateInfo
  
    // Basic validation
    if (typeof phaseIndex !== "number" || typeof slot !== "number" || !teamId || !position) {
      return { valid: false, message: "Invalid update data" }
    }
  
    // Status validation
    if (tournament.status !== TOURNAMENT_STATUSES.BRACKET_LOCKED) {
      return { 
        valid: false, 
        message: `Cannot update bracket when tournament status is "${getStatusLabel(tournament.status)}"` 
      }
    }
  
    // Phase validation
    if (!tournament.phases[phaseIndex]) {
      return { valid: false, message: `Invalid phase index: ${phaseIndex}` }
    }
  
    // Team validation
    const teamExists = tournament.teams.some(team => team._id === teamId)
    if (!teamExists) {
      return { valid: false, message: "Selected team is not part of this tournament" }
    }
  
    // Match validation
    const targetMatch = (matchesByPhase[phaseIndex] || []).find((m) => (m.matchNumber || m.slot) === slot)
    if (!targetMatch) {
      return { valid: false, message: `Match not found for phase ${phaseIndex}, slot ${slot}` }
    }
  
    // Completed match validation
    if (targetMatch.status === "COMPLETED") {
      return { valid: false, message: "Cannot modify completed matches" }
    }
  
    // Same team in both slots validation
    if (position === "A" && targetMatch.teamB && targetMatch.teamB._id === teamId) {
      return { valid: false, message: "Cannot place the same team in both slots of a match" }
    }
    if (position === "B" && targetMatch.teamA && targetMatch.teamA._id === teamId) {
      return { valid: false, message: "Cannot place the same team in both slots of a match" }
    }
  
    // Team already placed validation
    const currentPhaseMatches = matchesByPhase[phaseIndex] || []
    const teamAlreadyPlaced = currentPhaseMatches.some(match => {
      if ((match.matchNumber || match.slot) === slot) return false // Ignore target match
      return (match.teamA && match.teamA._id === teamId) || (match.teamB && match.teamB._id === teamId)
    })
  
    if (teamAlreadyPlaced) {
      return { valid: false, message: "Team is already placed in another match in this phase" }
    }
  
    return { valid: true }
  }
  
  /**
   * Calculate tournament progress
   */
  export const getTournamentProgress = (matchesByPhase) => {
    const allMatches = matchesByPhase.flat()
    const totalMatches = allMatches.length
    const completedMatches = allMatches.filter(m => m.status === "COMPLETED").length
    const scheduledMatches = allMatches.filter(m => m.status === "SCHEDULED").length
    const pendingMatches = totalMatches - completedMatches - scheduledMatches
  
    return {
      totalMatches,
      completedMatches,
      scheduledMatches,
      pendingMatches,
      percentComplete: totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0
    }
  }
  
  /**
   * Format dates for tournament display
   */
  export const formatTournamentDate = (dateString) => {
    if (!dateString) return "Not set"
    
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days ago`
    } else if (diffDays === 0) {
      return "Today"
    } else if (diffDays === 1) {
      return "Tomorrow"
    } else if (diffDays <= 7) {
      return `In ${diffDays} days`
    } else {
      return date.toLocaleDateString()
    }
  }
  
  /**
   * Error message standardization
   */
  export const getStandardErrorMessage = (error) => {
    if (error.response?.status === 400) {
      return error.response.data.message || "Invalid request"
    } else if (error.response?.status === 401) {
      return "Authentication required. Please log in."
    } else if (error.response?.status === 403) {
      return "Access denied. You don't have permission to perform this action."
    } else if (error.response?.status === 404) {
      return "Resource not found"
    } else if (error.response?.status >= 500) {
      return "Server error. Please try again later."
    } else if (error.message) {
      return error.message
    } else {
      return "An unexpected error occurred"
    }
  }