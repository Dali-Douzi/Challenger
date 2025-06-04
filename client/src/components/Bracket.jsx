import React, { useState, useCallback, useEffect, useReducer } from "react";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Tooltip,
  Alert,
} from "@mui/material";
import {
  Add,
  EmojiEvents,
  Delete,
  Edit,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Undo,
  Redo,
  Save,
  Info,
} from "@mui/icons-material";

// Constants
const GRID_SIZE = 20;
const snapToGrid = (value) => Math.round(value / GRID_SIZE) * GRID_SIZE;
const generateId = () =>
  `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ============================================================================
// DRAGGABLE TEAM COMPONENT
// ============================================================================
const DraggableTeam = ({ team }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: String(team?._id || team?.id || `team-${Math.random()}`),
    });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
  };

  return (
    <Paper
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{
        p: 1.5,
        ...style,
        backgroundColor: team.color || "#1976d2",
        color: "white",
        borderRadius: "8px",
        textAlign: "center",
        minHeight: "40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.2)",
        fontWeight: 500,
        fontSize: "0.875rem",
      }}
      elevation={2}
    >
      {team?.name || "Unnamed Team"}
    </Paper>
  );
};

// ============================================================================
// TEAM SLOT COMPONENT (for matches/groups)
// ============================================================================
const TeamSlot = ({
  id,
  team = null,
  score = null,
  onScoreChange = null,
  showScore = false,
  isWinner = false,
  onTeamRemove = null,
  size = "normal", // "normal" or "compact"
}) => {
  const { isOver, setNodeRef } = useDroppable({ id: String(id || "") });

  return (
    <div
      ref={setNodeRef}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: size === "compact" ? "6px" : "10px",
        backgroundColor: isOver
          ? "rgba(25, 118, 210, 0.2)"
          : "rgba(255,255,255,0.08)",
        borderRadius: "6px",
        border: isOver
          ? "2px solid #1976d2"
          : "1px solid rgba(255,255,255,0.12)",
        minHeight: size === "compact" ? "32px" : "40px",
        transition: "all 0.2s ease",
        position: "relative",
      }}
    >
      {/* Winner Trophy */}
      {isWinner && <EmojiEvents sx={{ color: "#ffd700", fontSize: "18px" }} />}

      {/* Team Name */}
      <div
        style={{
          flex: 1,
          color: "#ffffff",
          fontSize: size === "compact" ? "0.75rem" : "0.875rem",
          fontWeight: "500",
          cursor: team && onTeamRemove ? "pointer" : "default",
        }}
        onClick={() => team && onTeamRemove && onTeamRemove()}
      >
        {team ? (
          team.name || "Unnamed Team"
        ) : (
          <span style={{ color: "#9ca3af", fontStyle: "italic" }}>
            {isOver ? "Drop team here" : "Empty slot"}
          </span>
        )}
      </div>

      {/* Score Input */}
      {showScore && (
        <input
          type="number"
          value={score != null ? score : ""}
          onChange={(e) =>
            onScoreChange && onScoreChange(parseInt(e.target.value) || 0)
          }
          style={{
            width: "45px",
            height: "30px",
            backgroundColor: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "4px",
            color: "#ffffff",
            textAlign: "center",
            fontSize: "0.875rem",
            fontWeight: "600",
          }}
          min="0"
        />
      )}
    </div>
  );
};

// ============================================================================
// MATCH COMPONENT
// ============================================================================
const MatchComponent = ({
  id,
  position,
  data,
  onUpdate,
  onDrag,
  onEdit,
  onDelete,
  deleteMode,
  participants,
  onConnectionPointClick,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e) => {
      if (deleteMode) return;
      setIsDragging(true);
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      e.preventDefault();
    },
    [deleteMode]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const canvas = document.getElementById("bracket-canvas");
      if (!canvas) return;

      const canvasRect = canvas.getBoundingClientRect();
      const newX = snapToGrid(e.clientX - canvasRect.left - dragOffset.x);
      const newY = snapToGrid(e.clientY - canvasRect.top - dragOffset.y);
      onDrag(id, { x: newX, y: newY });
    },
    [isDragging, dragOffset, id, onDrag]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const teamA = data?.teamA
    ? participants.find(
        (p) => String(p?._id || p?.id || "") === String(data.teamA)
      )
    : null;
  const teamB = data?.teamB
    ? participants.find(
        (p) => String(p?._id || p?.id || "") === String(data.teamB)
      )
    : null;

  const scoreA = Number(data?.scoreA) || 0;
  const scoreB = Number(data?.scoreB) || 0;
  const hasScores = data?.scoreA != null && data?.scoreB != null;
  const winnerA = hasScores && scoreA > scoreB;
  const winnerB = hasScores && scoreB > scoreA;

  const handleScoreChange = (team, score) => {
    const field = team === "A" ? "scoreA" : "scoreB";
    onUpdate(id, { ...(data || {}), [field]: score });
  };

  const handleTeamRemove = (team) => {
    const teamField = team === "A" ? "teamA" : "teamB";
    const scoreField = team === "A" ? "scoreA" : "scoreB";
    onUpdate(id, {
      ...(data || {}),
      [teamField]: null,
      [scoreField]: 0,
    });
  };

  return (
    <div
      id={`component-${id}`}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: "260px",
        backgroundColor: deleteMode
          ? "rgba(244, 67, 54, 0.2)"
          : "rgba(15, 23, 42, 0.95)",
        border: deleteMode ? "2px solid #f44336" : "2px solid #334155",
        borderRadius: "12px",
        padding: "16px",
        cursor: deleteMode ? "pointer" : isDragging ? "grabbing" : "grab",
        backdropFilter: "blur(8px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        userSelect: "none",
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if (deleteMode) {
          e.stopPropagation();
          onDelete(id);
        }
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ color: "#e2e8f0", fontWeight: "600" }}
        >
          {data?.name || `Match ${id.slice(-4)}`}
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(id);
          }}
          sx={{ color: "#94a3b8" }}
        >
          <Edit sx={{ fontSize: "16px" }} />
        </IconButton>
      </div>

      {/* Team A */}
      <div style={{ marginBottom: "8px" }}>
        <TeamSlot
          id={`${id}-teamA`}
          team={teamA}
          score={scoreA}
          showScore={true}
          isWinner={winnerA}
          onScoreChange={(score) => handleScoreChange("A", score)}
          onTeamRemove={() => handleTeamRemove("A")}
        />
      </div>

      {/* VS Divider */}
      <div
        style={{
          textAlign: "center",
          margin: "12px 0",
          color: "#64748b",
          fontSize: "0.75rem",
          fontWeight: "bold",
          letterSpacing: "1px",
        }}
      >
        VS
      </div>

      {/* Team B */}
      <div style={{ marginBottom: "16px" }}>
        <TeamSlot
          id={`${id}-teamB`}
          team={teamB}
          score={scoreB}
          showScore={true}
          isWinner={winnerB}
          onScoreChange={(score) => handleScoreChange("B", score)}
          onTeamRemove={() => handleTeamRemove("B")}
        />
      </div>

      {/* Connection Points */}
      <div
        className="connection-point winner"
        style={{
          position: "absolute",
          right: "-8px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          backgroundColor: "#4caf50",
          border: "2px solid #ffffff",
          cursor: "pointer",
          zIndex: 10,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onConnectionPointClick &&
            onConnectionPointClick(id, "winner", "output");
        }}
      />

      <div
        className="connection-point loser"
        style={{
          position: "absolute",
          left: "50%",
          bottom: "-8px",
          transform: "translateX(-50%)",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          backgroundColor: "#f44336",
          border: "2px solid #ffffff",
          cursor: "pointer",
          zIndex: 10,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onConnectionPointClick &&
            onConnectionPointClick(id, "loser", "output");
        }}
      />
    </div>
  );
};

// ============================================================================
// GROUP COMPONENT
// ============================================================================
const GroupComponent = ({
  id,
  position,
  data,
  onUpdate,
  onDrag,
  onEdit,
  onDelete,
  deleteMode,
  participants,
  onConnectionPointClick,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e) => {
      if (deleteMode) return;
      setIsDragging(true);
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      e.preventDefault();
    },
    [deleteMode]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const canvas = document.getElementById("bracket-canvas");
      if (!canvas) return;

      const canvasRect = canvas.getBoundingClientRect();
      const newX = snapToGrid(e.clientX - canvasRect.left - dragOffset.x);
      const newY = snapToGrid(e.clientY - canvasRect.top - dragOffset.y);
      onDrag(id, { x: newX, y: newY });
    },
    [isDragging, dragOffset, id, onDrag]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const slotCount = data?.slotCount || 4;
  const slots = data?.slots || [];

  const handleTeamDrop = (slotIndex, teamId) => {
    const newSlots = [...slots];
    while (newSlots.length <= slotIndex) {
      newSlots.push(null);
    }
    newSlots[slotIndex] = { teamId, score: 0 };
    onUpdate(id, { ...(data || {}), slots: newSlots });
  };

  const handleTeamRemove = (slotIndex) => {
    const newSlots = [...slots];
    if (slotIndex < newSlots.length) {
      newSlots[slotIndex] = null;
      onUpdate(id, { ...(data || {}), slots: newSlots });
    }
  };

  const handleScoreChange = (slotIndex, score) => {
    const newSlots = [...slots];
    if (slotIndex < newSlots.length && newSlots[slotIndex]) {
      newSlots[slotIndex] = { ...newSlots[slotIndex], score };
      onUpdate(id, { ...(data || {}), slots: newSlots });
    }
  };

  return (
    <div
      id={`component-${id}`}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: "240px",
        backgroundColor: deleteMode
          ? "rgba(244, 67, 54, 0.2)"
          : "rgba(15, 23, 42, 0.95)",
        border: deleteMode ? "2px solid #f44336" : "2px solid #334155",
        borderRadius: "12px",
        padding: "16px",
        cursor: deleteMode ? "pointer" : isDragging ? "grabbing" : "grab",
        backdropFilter: "blur(8px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        userSelect: "none",
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if (deleteMode) {
          e.stopPropagation();
          onDelete(id);
        }
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ color: "#e2e8f0", fontWeight: "600" }}
        >
          {data?.name || `Group ${id.slice(-4)}`}
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(id);
          }}
          sx={{ color: "#94a3b8" }}
        >
          <Edit sx={{ fontSize: "16px" }} />
        </IconButton>
      </div>

      {/* Team Slots */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {Array.from({ length: slotCount }, (_, i) => {
          const slot = slots[i];
          const team = slot?.teamId
            ? participants.find(
                (p) => String(p?._id || p?.id || "") === String(slot.teamId)
              )
            : null;
          return (
            <TeamSlot
              key={i}
              id={`${id}-slot-${i}`}
              team={team}
              score={slot?.score || null}
              showScore={true}
              isWinner={false}
              onScoreChange={(score) => handleScoreChange(i, score)}
              onTeamRemove={() => handleTeamRemove(i)}
              size="compact"
            />
          );
        })}
      </div>

      {/* Connection Point */}
      <div
        className="connection-point output"
        style={{
          position: "absolute",
          right: "-8px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          backgroundColor: "#2196f3",
          border: "2px solid #ffffff",
          cursor: "pointer",
          zIndex: 10,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onConnectionPointClick &&
            onConnectionPointClick(id, "output", "output");
        }}
      />
    </div>
  );
};

// ============================================================================
// SLOT COMPONENT (Single team qualifier)
// ============================================================================
const SlotComponent = ({
  id,
  position,
  data,
  onUpdate,
  onDrag,
  onEdit,
  onDelete,
  deleteMode,
  participants,
  onConnectionPointClick,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e) => {
      if (deleteMode) return;
      setIsDragging(true);
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      e.preventDefault();
    },
    [deleteMode]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const canvas = document.getElementById("bracket-canvas");
      if (!canvas) return;

      const canvasRect = canvas.getBoundingClientRect();
      const newX = snapToGrid(e.clientX - canvasRect.left - dragOffset.x);
      const newY = snapToGrid(e.clientY - canvasRect.top - dragOffset.y);
      onDrag(id, { x: newX, y: newY });
    },
    [isDragging, dragOffset, id, onDrag]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const team = data?.teamId
    ? participants.find(
        (p) => String(p?._id || p?.id || "") === String(data.teamId)
      )
    : null;

  const handleTeamRemove = () => {
    onUpdate(id, { ...(data || {}), teamId: null });
  };

  return (
    <div
      id={`component-${id}`}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: "200px",
        backgroundColor: deleteMode
          ? "rgba(244, 67, 54, 0.2)"
          : "rgba(15, 23, 42, 0.95)",
        border: deleteMode ? "2px solid #f44336" : "2px solid #334155",
        borderRadius: "12px",
        padding: "16px",
        cursor: deleteMode ? "pointer" : isDragging ? "grabbing" : "grab",
        backdropFilter: "blur(8px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        userSelect: "none",
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if (deleteMode) {
          e.stopPropagation();
          onDelete(id);
        }
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ color: "#e2e8f0", fontWeight: "600" }}
        >
          {data?.name || `Slot ${id.slice(-4)}`}
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(id);
          }}
          sx={{ color: "#94a3b8" }}
        >
          <Edit sx={{ fontSize: "16px" }} />
        </IconButton>
      </div>

      {/* Single Team Slot */}
      <TeamSlot
        id={`${id}-slot`}
        team={team}
        showScore={false}
        onTeamRemove={handleTeamRemove}
      />

      {/* Connection Point */}
      <div
        className="connection-point output"
        style={{
          position: "absolute",
          right: "-8px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          backgroundColor: "#2196f3",
          border: "2px solid #ffffff",
          cursor: "pointer",
          zIndex: 10,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onConnectionPointClick &&
            onConnectionPointClick(id, "output", "output");
        }}
      />
    </div>
  );
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
const componentsReducer = (state, action) => {
  switch (action.type) {
    case "SET_COMPONENTS":
      return Array.isArray(action.payload) ? action.payload : [];
    case "ADD_COMPONENT":
      return [...state, action.payload];
    case "DELETE_COMPONENT":
      return state.filter((comp) => comp.id !== action.id);
    case "UPDATE_COMPONENT":
      return state.map((comp) =>
        comp.id === action.id ? { ...comp, ...action.updates } : comp
      );
    case "UPDATE_POSITION":
      return state.map((comp) =>
        comp.id === action.id ? { ...comp, position: action.position } : comp
      );
    default:
      return state;
  }
};

// ============================================================================
// EDIT DIALOGS
// ============================================================================
const EditDialog = ({ open, onClose, data, onSave, type }) => {
  const [name, setName] = useState("");
  const [slotCount, setSlotCount] = useState(4);

  useEffect(() => {
    if (open && data) {
      setName(data.name || "");
      setSlotCount(data.slotCount || 4);
    } else if (open) {
      setName("");
      setSlotCount(4);
    }
  }, [open, data]);

  const handleSave = () => {
    if (type === "group") {
      onSave({ name, slotCount });
    } else {
      onSave({ name });
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Edit {type === "group" ? "Group" : type === "match" ? "Match" : "Slot"}
      </DialogTitle>
      <DialogContent>
        <TextField
          label={`${
            type === "group" ? "Group" : type === "match" ? "Match" : "Slot"
          } Name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          margin="normal"
          variant="outlined"
        />
        {type === "group" && (
          <TextField
            label="Number of Slots"
            type="number"
            value={slotCount}
            onChange={(e) =>
              setSlotCount(Math.max(1, parseInt(e.target.value) || 1))
            }
            fullWidth
            margin="normal"
            variant="outlined"
            inputProps={{ min: 1, max: 16 }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ============================================================================
// MAIN BRACKET COMPONENT
// ============================================================================
const Bracket = ({
  participants = [],
  organizerMode = false,
  tournament = {},
  onBracketUpdate,
  phases = [], // ✅ Add phases prop
  matchesByPhase = [], // ✅ Add matchesByPhase prop
}) => {
  // State
  const [components, dispatchComponents] = useReducer(componentsReducer, []);
  const [deleteMode, setDeleteMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [editingComponent, setEditingComponent] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Canvas panning
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = useState({ x: 0, y: 0 });

  // Get unplaced teams
  const getUnplacedTeams = () => {
    const placedTeamIds = new Set();
    components.forEach((comp) => {
      if (comp.type === "group" && comp.data.slots) {
        comp.data.slots.forEach((slot) => {
          if (slot?.teamId) placedTeamIds.add(String(slot.teamId));
        });
      } else if (comp.type === "slot" && comp.data.teamId) {
        placedTeamIds.add(String(comp.data.teamId));
      } else if (comp.type === "match") {
        if (comp.data.teamA) placedTeamIds.add(String(comp.data.teamA));
        if (comp.data.teamB) placedTeamIds.add(String(comp.data.teamB));
      }
    });
    return participants.filter(
      (team) => !placedTeamIds.has(String(team?._id || team?.id || ""))
    );
  };

  // History management
  const saveToHistory = () => {
    const state = { components };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Load/save from localStorage
  useEffect(() => {
    const tournamentId =
      tournament && "_id" in tournament ? tournament._id : "default";
    const saved = localStorage.getItem(`bracket-${tournamentId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.components && Array.isArray(parsed.components)) {
          dispatchComponents({
            type: "SET_COMPONENTS",
            payload: parsed.components,
          });
        }
      } catch (e) {
        console.error("Error loading saved bracket:", e);
      }
    }
  }, [tournament]);

  useEffect(() => {
    const tournamentId =
      tournament && "_id" in tournament ? tournament._id : "default";
    localStorage.setItem(
      `bracket-${tournamentId}`,
      JSON.stringify({ components })
    );
  }, [components, tournament]);

  // Component handlers
  const handleAddComponent = (type) => {
    const id = generateId();
    const centerX = 300 - panOffset.x;
    const centerY = 200 - panOffset.y;

    const newComponent = {
      id,
      type,
      position: { x: snapToGrid(centerX), y: snapToGrid(centerY) },
      data:
        type === "group"
          ? { slotCount: 4, slots: [], name: "" }
          : type === "match"
          ? { scoreA: 0, scoreB: 0, teamA: null, teamB: null, name: "" }
          : { teamId: null, name: "" },
    };

    saveToHistory();
    dispatchComponents({ type: "ADD_COMPONENT", payload: newComponent });
  };

  const handleComponentDrag = (id, position) => {
    dispatchComponents({ type: "UPDATE_POSITION", id, position });
  };

  const handleComponentUpdate = (id, data) => {
    dispatchComponents({ type: "UPDATE_COMPONENT", id, updates: { data } });

    // Notify parent if needed
    if (onBracketUpdate) {
      onBracketUpdate({ type: "component_update", componentId: id, data });
    }
  };

  const handleComponentDelete = (id) => {
    saveToHistory();
    dispatchComponents({ type: "DELETE_COMPONENT", id });
  };

  const handleEdit = (id) => {
    const component = components.find((c) => c.id === id);
    if (component) {
      setEditingComponent(component);
      setEditDialogOpen(true);
    }
  };

  const handleEditSave = (data) => {
    if (editingComponent) {
      saveToHistory();
      dispatchComponents({
        type: "UPDATE_COMPONENT",
        id: editingComponent.id,
        updates: { data: { ...(editingComponent.data || {}), ...data } },
      });
    }
    setEditingComponent(null);
    setEditDialogOpen(false);
  };

  // Canvas controls
  const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 2));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.1, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Canvas panning
  const handleCanvasMouseDown = (e) => {
    if (
      e.target.id === "bracket-canvas" ||
      e.target.classList.contains("canvas-background")
    ) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setPanStartOffset({ x: panOffset.x, y: panOffset.y });
      e.preventDefault();
    }
  };

  const handleCanvasMouseMove = useCallback(
    (e) => {
      if (isPanning) {
        const deltaX = e.clientX - panStart.x;
        const deltaY = e.clientY - panStart.y;
        setPanOffset({
          x: panStartOffset.x + deltaX / zoom,
          y: panStartOffset.y + deltaY / zoom,
        });
      }
    },
    [isPanning, panStart, panStartOffset, zoom]
  );

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  useEffect(() => {
    if (isPanning) {
      document.addEventListener("mousemove", handleCanvasMouseMove);
      document.addEventListener("mouseup", handleCanvasMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleCanvasMouseMove);
        document.removeEventListener("mouseup", handleCanvasMouseUp);
      };
    }
  }, [isPanning, handleCanvasMouseMove]);

  // Undo/Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      dispatchComponents({
        type: "SET_COMPONENTS",
        payload: prevState.components,
      });
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      dispatchComponents({
        type: "SET_COMPONENTS",
        payload: nextState.components,
      });
      setHistoryIndex(historyIndex + 1);
    }
  };

  const unplacedTeams = getUnplacedTeams();

  // Read-only view for non-organizers
  if (!organizerMode) {
    return (
      <Box sx={{ mb: 6 }}>
        <Typography variant="h6" sx={{ color: "text.primary", mb: 3 }}>
          Tournament Bracket
        </Typography>
        {components.length === 0 ? (
          <Alert severity="info">
            No bracket has been created yet. The tournament organizer will set
            up the bracket when ready.
          </Alert>
        ) : (
          <Box
            sx={{
              position: "relative",
              height: "70vh",
              backgroundColor: "#0f172a",
              borderRadius: "12px",
              overflow: "hidden",
              border: "1px solid rgba(148, 163, 184, 0.2)",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                transformOrigin: "center center",
              }}
            >
              {components.map((comp) => {
                const ComponentType = {
                  group: GroupComponent,
                  slot: SlotComponent,
                  match: MatchComponent,
                }[comp.type];

                return ComponentType ? (
                  <ComponentType
                    key={comp.id}
                    id={comp.id}
                    position={comp.position}
                    data={comp.data}
                    participants={participants}
                    deleteMode={false}
                    onUpdate={() => {}}
                    onDrag={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                ) : null;
              })}
            </div>
          </Box>
        )}
      </Box>
    );
  }

  // Organizer mode - full editor
  return (
    <DndContext
      onDragEnd={({ active, over }) => {
        if (!over) return;

        const teamId = String(active.id);
        const dropId = String(over.id);

        // Parse drop target
        if (dropId.includes("-slot") || dropId.includes("-team")) {
          const parts = dropId.split("-");
          const componentId = parts[0];
          const component = components.find((c) => c.id === componentId);

          if (component) {
            saveToHistory();

            if (component.type === "group") {
              const slotIndex = parseInt(parts[2]) || 0;
              const newSlots = [...(component.data.slots || [])];
              while (newSlots.length <= slotIndex) {
                newSlots.push(null);
              }
              newSlots[slotIndex] = { teamId, score: 0 };
              handleComponentUpdate(componentId, {
                ...(component.data || {}),
                slots: newSlots,
              });
            } else if (component.type === "slot") {
              handleComponentUpdate(componentId, {
                ...(component.data || {}),
                teamId,
              });
            } else if (component.type === "match") {
              const isTeamA = parts[1] === "teamA";
              const field = isTeamA ? "teamA" : "teamB";
              const scoreField = isTeamA ? "scoreA" : "scoreB";
              handleComponentUpdate(componentId, {
                ...(component.data || {}),
                [field]: teamId,
                [scoreField]:
                  (component.data && component.data[scoreField]) || 0,
              });
            }
          }
        }
      }}
    >
      <Box sx={{ mb: 6 }}>
        <Typography variant="h6" sx={{ color: "text.primary", mb: 3 }}>
          Bracket Designer
        </Typography>

        {/* Toolbar */}
        <Box
          sx={{
            mb: 3,
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => handleAddComponent("group")}
            size="small"
          >
            Group
          </Button>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => handleAddComponent("slot")}
            size="small"
          >
            Slot
          </Button>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => handleAddComponent("match")}
            size="small"
          >
            Match
          </Button>

          <Button
            variant={deleteMode ? "contained" : "outlined"}
            startIcon={<Delete />}
            onClick={() => setDeleteMode(!deleteMode)}
            size="small"
            color="error"
          >
            Delete {deleteMode ? "(ON)" : "(OFF)"}
          </Button>

          <Box sx={{ ml: 2, display: "flex", gap: 1, alignItems: "center" }}>
            <IconButton size="small" onClick={handleZoomIn}>
              <ZoomIn />
            </IconButton>
            <IconButton size="small" onClick={handleZoomOut}>
              <ZoomOut />
            </IconButton>
            <IconButton size="small" onClick={handleResetView}>
              <CenterFocusStrong />
            </IconButton>
          </Box>

          <Box sx={{ ml: 1, display: "flex", gap: 1 }}>
            <IconButton
              size="small"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
            >
              <Undo />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
            >
              <Redo />
            </IconButton>
          </Box>

          <Chip
            icon={<Save />}
            label="Auto-saved"
            size="small"
            color="success"
            variant="outlined"
            sx={{ ml: 2 }}
          />
        </Box>

        {/* Unplaced Teams */}
        {unplacedTeams.length > 0 && (
          <Paper
            sx={{ mb: 3, p: 2, bgcolor: "background.paper" }}
            elevation={3}
          >
            <Typography
              variant="subtitle1"
              gutterBottom
              sx={{ color: "text.primary" }}
            >
              Unplaced Teams ({unplacedTeams.length})
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              Drag teams into bracket components below
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 2,
              }}
            >
              {unplacedTeams.map((team) => (
                <DraggableTeam
                  key={team?._id || team?.id || Math.random()}
                  team={team}
                />
              ))}
            </Box>
          </Paper>
        )}

        {/* Canvas */}
        <Box
          sx={{
            position: "relative",
            height: "70vh",
            backgroundColor: "#0f172a",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid rgba(148, 163, 184, 0.2)",
          }}
          onMouseDown={handleCanvasMouseDown}
        >
          <div
            id="bracket-canvas"
            className="canvas-background"
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: "center center",
              cursor: deleteMode
                ? "crosshair"
                : isPanning
                ? "grabbing"
                : "grab",
              backgroundImage: `
                linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            }}
          >
            {components.map((comp) => {
              const ComponentType = {
                group: GroupComponent,
                slot: SlotComponent,
                match: MatchComponent,
              }[comp.type];

              return ComponentType ? (
                <ComponentType
                  key={comp.id}
                  id={comp.id}
                  position={comp.position}
                  data={comp.data}
                  onUpdate={handleComponentUpdate}
                  onDrag={handleComponentDrag}
                  onEdit={handleEdit}
                  onDelete={handleComponentDelete}
                  deleteMode={deleteMode}
                  participants={participants}
                />
              ) : null;
            })}
          </div>
        </Box>

        {/* Edit Dialog */}
        <EditDialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setEditingComponent(null);
          }}
          data={editingComponent?.data}
          onSave={handleEditSave}
          type={editingComponent?.type}
        />
      </Box>
    </DndContext>
  );
};

export default Bracket;
