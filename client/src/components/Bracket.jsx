import React, {
  useState,
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { DndContext } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
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
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
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

// Grid size for snapping - much finer for smoother routing
const GRID_SIZE = 5;

// Utility functions
const snapToGrid = (value) => Math.round(value / GRID_SIZE) * GRID_SIZE;

const generateId = () =>
  `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Connection Point Component
const ConnectionPoint = ({
  type,
  position,
  componentId,
  pointId,
  isActive,
  onClick,
  color = "#3b82f6",
}) => {
  return (
    <div
      id={`connection-${componentId}-${pointId}`}
      style={{
        position: "absolute",
        width: "14px",
        height: "14px",
        borderRadius: "50%",
        backgroundColor: isActive ? color : "#374151",
        border: `2px solid ${color}`,
        cursor: "pointer",
        zIndex: 20,
        ...position,
        transition: "all 0.2s",
        transform: isActive ? "scale(1.3)" : "scale(1)",
        boxShadow: isActive ? `0 0 8px ${color}` : "none",
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(componentId, pointId, type);
      }}
    />
  );
};

// Team Slot Component
const TeamSlot = ({
  id,
  team,
  score,
  onScoreChange,
  showScore,
  isWinner,
  disabled,
  onTeamRemove,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: String(id),
    disabled: Boolean(disabled),
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px",
        backgroundColor: isOver
          ? "rgba(59, 130, 246, 0.2)"
          : "rgba(71, 85, 105, 0.4)",
        borderRadius: "6px",
        border: isOver
          ? "2px solid #3b82f6"
          : "2px solid rgba(148, 163, 184, 0.2)",
        minHeight: "40px",
        transition: "all 0.2s",
        position: "relative",
      }}
    >
      {/* Winner Trophy */}
      {isWinner && <EmojiEvents sx={{ color: "gold", fontSize: "16px" }} />}

      {/* Team Name */}
      <div
        style={{
          flex: 1,
          color: "#e2e8f0",
          fontSize: "0.875rem",
          fontWeight: "500",
        }}
      >
        {team && team.name ? (
          <span
            onClick={() => onTeamRemove && onTeamRemove()}
            style={{ cursor: onTeamRemove ? "pointer" : "default" }}
          >
            {String(team.name)}
          </span>
        ) : (
          <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
            {isOver ? "Drop team here" : "Empty slot"}
          </span>
        )}
      </div>

      {/* Score Square */}
      {showScore && (
        <input
          type="number"
          value={score !== null && score !== undefined ? String(score) : ""}
          onChange={(e) => {
            const newScore =
              e.target.value === "" ? 0 : parseInt(e.target.value) || 0;
            if (onScoreChange) onScoreChange(newScore);
          }}
          style={{
            width: "40px",
            height: "28px",
            backgroundColor: "rgba(30, 41, 59, 0.8)",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            borderRadius: "4px",
            color: "#e2e8f0",
            textAlign: "center",
            fontSize: "0.75rem",
            fontWeight: "bold",
          }}
          disabled={disabled}
        />
      )}
    </div>
  );
};

// Group Component
const GroupComponent = ({
  id,
  position,
  data,
  onUpdate,
  onDrag,
  onEdit,
  onDelete,
  selectedForConnection,
  onConnectionPoint,
  deleteMode,
  participants,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (deleteMode) return;
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

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

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  const handleTeamDrop = (slotIndex, teamId) => {
    const currentData = data || {};
    const currentSlots = Array.isArray(currentData.slots)
      ? [...currentData.slots]
      : [];
    // Ensure the array is large enough
    while (currentSlots.length <= slotIndex) {
      currentSlots.push(null);
    }
    currentSlots[slotIndex] = { teamId, score: 0 };
    onUpdate(id, { ...currentData, slots: currentSlots });
  };

  const handleTeamRemove = (slotIndex) => {
    const currentData = data || {};
    const currentSlots = Array.isArray(currentData.slots)
      ? [...currentData.slots]
      : [];
    if (slotIndex < currentSlots.length) {
      currentSlots[slotIndex] = null;
      onUpdate(id, { ...currentData, slots: currentSlots });
    }
  };

  const handleScoreChange = (slotIndex, score) => {
    const currentData = data || {};
    const currentSlots = Array.isArray(currentData.slots)
      ? [...currentData.slots]
      : [];
    if (slotIndex < currentSlots.length && currentSlots[slotIndex]) {
      currentSlots[slotIndex] = { ...currentSlots[slotIndex], score };
      onUpdate(id, { ...currentData, slots: currentSlots });
    }
  };

  const currentData = data || {};

  return (
    <div
      id={`component-${id}`}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: "220px",
        backgroundColor: deleteMode
          ? "rgba(239, 68, 68, 0.2)"
          : "rgba(30, 41, 59, 0.95)",
        border: deleteMode
          ? "2px solid #ef4444"
          : selectedForConnection
          ? "2px solid #3b82f6"
          : "2px solid #475569",
        borderRadius: "12px",
        padding: "16px",
        cursor: deleteMode ? "pointer" : isDragging ? "grabbing" : "grab",
        backdropFilter: "blur(8px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
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
          marginBottom: "12px",
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ color: "#e2e8f0", fontWeight: "600" }}
        >
          {currentData && currentData.name
            ? String(currentData.name)
            : `Group ${id.slice(-4)}`}
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(id);
          }}
        >
          <Edit sx={{ fontSize: "16px", color: "#94a3b8" }} />
        </IconButton>
      </div>

      {/* Slots */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {Array.from(
          {
            length:
              currentData && typeof currentData.slotCount === "number"
                ? currentData.slotCount
                : 4,
          },
          (_, i) => {
            const slots = Array.isArray(currentData.slots)
              ? currentData.slots
              : [];
            const slot = slots[i] || null;
            const team =
              slot && slot.teamId
                ? participants.find(
                    (p) => String(p._id || p.id) === String(slot.teamId)
                  )
                : null;
            return (
              <TeamSlot
                key={i}
                id={`${id}-slot-${i}`}
                team={team}
                score={slot ? slot.score : null}
                showScore={true}
                isWinner={false}
                disabled={false}
                onScoreChange={(score) => handleScoreChange(i, score)}
                onTeamRemove={() => handleTeamRemove(i)}
              />
            );
          }
        )}
      </div>

      {/* Connection Points */}
      <ConnectionPoint
        type="output"
        position={{ right: "-7px", top: "30%" }}
        componentId={id}
        pointId="out"
        isActive={selectedForConnection === `${id}-out`}
        onClick={onConnectionPoint}
        color="#4ade80"
      />
      <ConnectionPoint
        type="input"
        position={{ left: "-7px", top: "50%" }}
        componentId={id}
        pointId="in"
        isActive={selectedForConnection === `${id}-in`}
        onClick={onConnectionPoint}
        color="#3b82f6"
      />
      <ConnectionPoint
        type="bottom"
        position={{
          left: "50%",
          bottom: "-7px",
          transform: "translateX(-50%)",
        }}
        componentId={id}
        pointId="bottom"
        isActive={selectedForConnection === `${id}-bottom`}
        onClick={onConnectionPoint}
        color="#ef4444"
      />
    </div>
  );
};

// Slot Component (single qualified team slot)
const SlotComponent = ({
  id,
  position,
  data,
  onUpdate,
  onDrag,
  onEdit,
  onDelete,
  selectedForConnection,
  onConnectionPoint,
  deleteMode,
  participants,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (deleteMode) return;
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

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

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  const handleTeamRemove = () => {
    const currentData = data || {};
    onUpdate(id, { ...currentData, teamId: null });
  };

  const currentData = data || {};
  const team = currentData.teamId
    ? participants.find(
        (p) => String(p._id || p.id) === String(currentData.teamId)
      )
    : null;

  return (
    <div
      id={`component-${id}`}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: "180px",
        backgroundColor: deleteMode
          ? "rgba(239, 68, 68, 0.2)"
          : "rgba(30, 41, 59, 0.95)",
        border: deleteMode
          ? "2px solid #ef4444"
          : selectedForConnection
          ? "2px solid #3b82f6"
          : "2px solid #475569",
        borderRadius: "12px",
        padding: "16px",
        cursor: deleteMode ? "pointer" : isDragging ? "grabbing" : "grab",
        backdropFilter: "blur(8px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
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
          marginBottom: "12px",
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ color: "#e2e8f0", fontWeight: "600" }}
        >
          {currentData && currentData.name
            ? String(currentData.name)
            : `Slot ${id.slice(-4)}`}
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(id);
          }}
        >
          <Edit sx={{ fontSize: "16px", color: "#94a3b8" }} />
        </IconButton>
      </div>

      {/* Single Team Slot */}
      <TeamSlot
        id={`${id}-slot`}
        team={team}
        score={null}
        showScore={false}
        isWinner={false}
        disabled={false}
        onScoreChange={null}
        onTeamRemove={handleTeamRemove}
      />

      {/* Connection Points */}
      <ConnectionPoint
        type="output"
        position={{ right: "-7px", top: "30%" }}
        componentId={id}
        pointId="out"
        isActive={selectedForConnection === `${id}-out`}
        onClick={onConnectionPoint}
        color="#4ade80"
      />
      <ConnectionPoint
        type="input"
        position={{ left: "-7px", top: "50%" }}
        componentId={id}
        pointId="in"
        isActive={selectedForConnection === `${id}-in`}
        onClick={onConnectionPoint}
        color="#3b82f6"
      />
      <ConnectionPoint
        type="bottom"
        position={{
          left: "50%",
          bottom: "-7px",
          transform: "translateX(-50%)",
        }}
        componentId={id}
        pointId="bottom"
        isActive={selectedForConnection === `${id}-bottom`}
        onClick={onConnectionPoint}
        color="#ef4444"
      />
    </div>
  );
};

// Match Component
const MatchComponent = ({
  id,
  position,
  data,
  onUpdate,
  onDrag,
  onEdit,
  onDelete,
  selectedForConnection,
  onConnectionPoint,
  deleteMode,
  participants,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (deleteMode) return;
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

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

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  const handleTeamRemove = (slot) => {
    const currentData = data || {};
    onUpdate(id, {
      ...currentData,
      [slot === "A" ? "teamA" : "teamB"]: null,
      [slot === "A" ? "scoreA" : "scoreB"]: 0,
    });
  };

  const handleScoreChange = (slot, score) => {
    const currentData = data || {};
    const newData = {
      ...currentData,
      [slot === "A" ? "scoreA" : "scoreB"]: score,
    };
    onUpdate(id, newData);
  };

  const currentData = data || {};
  const teamA = currentData.teamA
    ? participants.find(
        (p) => String(p._id || p.id) === String(currentData.teamA)
      )
    : null;
  const teamB = currentData.teamB
    ? participants.find(
        (p) => String(p._id || p.id) === String(currentData.teamB)
      )
    : null;

  // Determine winner
  const scoreA = Number(currentData.scoreA) || 0;
  const scoreB = Number(currentData.scoreB) || 0;
  const hasScores =
    currentData.scoreA !== undefined &&
    currentData.scoreA !== null &&
    currentData.scoreB !== undefined &&
    currentData.scoreB !== null;
  const winnerA = hasScores && scoreA > scoreB;
  const winnerB = hasScores && scoreB > scoreA;

  return (
    <div
      id={`component-${id}`}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        width: "220px",
        backgroundColor: deleteMode
          ? "rgba(239, 68, 68, 0.2)"
          : "rgba(30, 41, 59, 0.95)",
        border: deleteMode
          ? "2px solid #ef4444"
          : selectedForConnection
          ? "2px solid #3b82f6"
          : "2px solid #475569",
        borderRadius: "12px",
        padding: "16px",
        cursor: deleteMode ? "pointer" : isDragging ? "grabbing" : "grab",
        backdropFilter: "blur(8px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
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
          marginBottom: "12px",
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ color: "#e2e8f0", fontWeight: "600" }}
        >
          {currentData && currentData.name
            ? String(currentData.name)
            : `Match ${id.slice(-4)}`}
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(id);
          }}
        >
          <Edit sx={{ fontSize: "16px", color: "#94a3b8" }} />
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
          disabled={false}
          onScoreChange={(score) => handleScoreChange("A", score)}
          onTeamRemove={() => handleTeamRemove("A")}
        />
      </div>

      {/* VS */}
      <div
        style={{
          textAlign: "center",
          margin: "8px 0",
          color: "#64748b",
          fontSize: "0.75rem",
          fontWeight: "bold",
        }}
      >
        VS
      </div>

      {/* Team B */}
      <TeamSlot
        id={`${id}-teamB`}
        team={teamB}
        score={scoreB}
        showScore={true}
        isWinner={winnerB}
        disabled={false}
        onScoreChange={(score) => handleScoreChange("B", score)}
        onTeamRemove={() => handleTeamRemove("B")}
      />

      {/* Connection Points */}
      <ConnectionPoint
        type="winner"
        position={{ right: "-7px", top: "30%" }}
        componentId={id}
        pointId="winner"
        isActive={selectedForConnection === `${id}-winner`}
        onClick={onConnectionPoint}
        color="#4ade80"
      />
      <ConnectionPoint
        type="loser"
        position={{
          left: "50%",
          bottom: "-7px",
          transform: "translateX(-50%)",
        }}
        componentId={id}
        pointId="loser"
        isActive={selectedForConnection === `${id}-loser`}
        onClick={onConnectionPoint}
        color="#ef4444"
      />
      <ConnectionPoint
        type="input"
        position={{ left: "-7px", top: "30%" }}
        componentId={id}
        pointId="inA"
        isActive={selectedForConnection === `${id}-inA`}
        onClick={onConnectionPoint}
        color="#3b82f6"
      />
      <ConnectionPoint
        type="input"
        position={{ left: "-7px", top: "70%" }}
        componentId={id}
        pointId="inB"
        isActive={selectedForConnection === `${id}-inB`}
        onClick={onConnectionPoint}
        color="#3b82f6"
      />
    </div>
  );
};

// Connection Line Component with debugging and improved calculations
const ConnectionLine = ({ connection, components, onDelete, deleteMode }) => {
  const fromComp = components.find((c) => c.id === connection.from.componentId);
  const toComp = components.find((c) => c.id === connection.to.componentId);

  if (!fromComp || !toComp) return null;

  const getConnectionPoint = (comp, pointId) => {
    const { position } = comp;

    // Try to get the actual connection point element position
    const connectionPointId = `connection-${comp.id}-${pointId}`;
    const connectionElement = document.getElementById(connectionPointId);

    if (connectionElement) {
      const rect = connectionElement.getBoundingClientRect();
      const canvas = document.getElementById("bracket-canvas");
      const canvasRect = canvas
        ? canvas.getBoundingClientRect()
        : { left: 0, top: 0 };

      // Return the center of the actual connection point element
      return {
        x: rect.left - canvasRect.left + rect.width / 2,
        y: rect.top - canvasRect.top + rect.height / 2,
      };
    }

    // Fallback to calculated positions if element not found
    const width = comp.type === "slot" ? 180 : 220;
    let height;

    if (comp.type === "group") {
      const slotCount =
        comp.data && typeof comp.data.slotCount === "number"
          ? comp.data.slotCount
          : 4;
      height = 72 + slotCount * 48;
    } else if (comp.type === "match") {
      height = 144;
    } else if (comp.type === "slot") {
      height = 96;
    } else {
      height = 130;
    }

    // Fallback calculations
    switch (pointId) {
      case "out":
      case "winner":
        return { x: position.x + width + 7, y: position.y + height * 0.3 + 7 };
      case "loser":
        return { x: position.x + width + 7, y: position.y + height * 0.7 + 7 };
      case "in":
        return { x: position.x - 7, y: position.y + height * 0.5 + 7 };
      case "inA":
        return { x: position.x - 7, y: position.y + height * 0.3 + 7 };
      case "inB":
        return { x: position.x - 7, y: position.y + height * 0.7 + 7 };
      case "bottom":
        return { x: position.x + width / 2, y: position.y + height + 7 };
      default:
        return { x: position.x + width / 2, y: position.y + height / 2 };
    }
  };

  const fromPoint = getConnectionPoint(fromComp, connection.from.pointId);
  const toPoint = getConnectionPoint(toComp, connection.to.pointId);

  // Create grid-snapped path with minimal turns
  const createOptimalPath = (from, to) => {
    // Don't snap the start and end points to grid to ensure precise connection to dots
    const startX = from.x;
    const startY = from.y;
    const endX = to.x;
    const endY = to.y;

    // Consistent routing distance for all directions
    const routeDistance = 30;

    // Check connection types
    const isFromBottom =
      connection.from.pointId === "loser" ||
      connection.from.pointId === "bottom";
    const isFromGreen =
      connection.from.pointId === "winner" || connection.from.pointId === "out";
    const isToBlueInput =
      connection.to.pointId === "in" ||
      connection.to.pointId === "inA" ||
      connection.to.pointId === "inB";

    // Check height difference for green connections
    const heightDifference = Math.abs(startY - endY);

    if (isFromGreen && heightDifference > 10) {
      // Green connections with height difference: H-shaped routing
      const midY = snapToGrid((startY + endY) / 2); // Perfect middle point
      const midX1 = snapToGrid(startX + routeDistance); // Go right from green dot
      const midX2 = snapToGrid(endX - routeDistance); // Approach destination from left
      const path = `M ${startX} ${startY} L ${midX1} ${startY} L ${midX1} ${midY} L ${midX2} ${midY} L ${midX2} ${endY} L ${endX} ${endY}`;
      return path;
    } else if (isFromBottom && isToBlueInput) {
      // Red dot going to blue input: down first, then approach from side
      const midY = snapToGrid(startY + routeDistance); // Go down first
      const approachX = snapToGrid(endX - routeDistance); // Approach from side
      const path = `M ${startX} ${startY} L ${startX} ${midY} L ${approachX} ${midY} L ${approachX} ${endY} L ${endX} ${endY}`;
      return path;
    } else if (isFromBottom) {
      // Red dot going to other types: simple down then across
      const midY = snapToGrid(startY + routeDistance);
      const path = `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
      return path;
    } else {
      // Side connections: approach destination from side
      const midX = snapToGrid(startX + routeDistance);
      const approachX = snapToGrid(endX - routeDistance);
      const path = `M ${startX} ${startY} L ${midX} ${startY} L ${approachX} ${startY} L ${approachX} ${endY} L ${endX} ${endY}`;
      return path;
    }
  };

  const colors = {
    winner: "#4ade80",
    loser: "#ef4444",
    normal: "#3b82f6",
  };

  const color = deleteMode ? "#ef4444" : colors[connection.type];
  const pathData = createOptimalPath(fromPoint, toPoint);

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      {/* Main connection path with individual click handling */}
      <path
        d={pathData}
        stroke={color}
        strokeWidth={deleteMode ? 4 : 3}
        strokeDasharray={connection.type === "loser" ? "8,4" : "none"}
        fill="none"
        style={{
          cursor: deleteMode ? "pointer" : "default",
          pointerEvents: deleteMode ? "stroke" : "none",
        }}
        onClick={(e) => {
          if (deleteMode) {
            e.stopPropagation();
            onDelete(connection.id);
          }
        }}
      />

      {/* Arrow at end */}
      <polygon
        points={`${toPoint.x - 8},${toPoint.y - 4} ${toPoint.x},${toPoint.y} ${
          toPoint.x - 8
        },${toPoint.y + 4}`}
        fill={color}
        style={{
          cursor: deleteMode ? "pointer" : "default",
          pointerEvents: deleteMode ? "fill" : "none",
        }}
        onClick={(e) => {
          if (deleteMode) {
            e.stopPropagation();
            onDelete(connection.id);
          }
        }}
      />

      {/* Invisible wider click area for easier deletion */}
      {deleteMode && (
        <path
          d={pathData}
          stroke="transparent"
          strokeWidth="12"
          fill="none"
          style={{
            cursor: "pointer",
            pointerEvents: "stroke",
          }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(connection.id);
          }}
        />
      )}

      {/* Debug circles to show calculated connection points */}
      {process.env.NODE_ENV === "development" && (
        <>
          <circle
            cx={fromPoint.x}
            cy={fromPoint.y}
            r="3"
            fill="red"
            opacity="0.7"
          />
          <circle
            cx={toPoint.x}
            cy={toPoint.y}
            r="3"
            fill="blue"
            opacity="0.7"
          />
        </>
      )}
    </svg>
  );
};

// Draggable Team
const DraggableTeam = ({ team }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: String(team._id || team.id || `team-${Math.random()}`),
    });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
    width: "100%",
  };

  return (
    <Paper
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{
        p: 1.5,
        ...style,
        backgroundColor: team.color || "#424242",
        color: "white",
        borderRadius: "6px",
        textOverflow: "ellipsis",
        overflow: "hidden",
        whiteSpace: "nowrap",
        minHeight: "40px",
        display: "flex",
        alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
      elevation={2}
    >
      {team && team.name ? String(team.name) : "Unnamed Team"}
    </Paper>
  );
};

// Component state management
const componentsReducer = (state, action) => {
  switch (action.type) {
    case "SET_COMPONENTS":
      return action.payload;
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

const connectionsReducer = (state, action) => {
  switch (action.type) {
    case "SET_CONNECTIONS":
      return action.payload;
    case "ADD_CONNECTION":
      return [...state, action.payload];
    case "DELETE_CONNECTION":
      return state.filter((conn) => conn.id !== action.id);
    default:
      return state;
  }
};

// Edit Dialogs
const EditGroupDialog = ({ open, onClose, data, onSave }) => {
  const [name, setName] = useState("");
  const [slotCount, setSlotCount] = useState(4);

  useEffect(() => {
    if (open && data) {
      setName(data.name || "");
      setSlotCount(data.slotCount || 4);
    }
  }, [open, data]);

  const handleSave = () => {
    onSave({ name, slotCount });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit Group</DialogTitle>
      <DialogContent>
        <TextField
          label="Group Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Number of Slots"
          type="number"
          value={slotCount}
          onChange={(e) =>
            setSlotCount(Math.max(1, parseInt(e.target.value) || 1))
          }
          fullWidth
          margin="normal"
          inputProps={{ min: 1, max: 16 }}
        />
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

const EditSlotDialog = ({ open, onClose, data, onSave }) => {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open && data) {
      setName(data.name || "");
    }
  }, [open, data]);

  const handleSave = () => {
    onSave({ name });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit Slot</DialogTitle>
      <DialogContent>
        <TextField
          label="Slot Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          margin="normal"
        />
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

const EditMatchDialog = ({ open, onClose, data, onSave }) => {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open && data) {
      setName(data.name || "");
    }
  }, [open, data]);

  const handleSave = () => {
    onSave({ name });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit Match</DialogTitle>
      <DialogContent>
        <TextField
          label="Match Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          margin="normal"
        />
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

// Main Bracket Component
const Bracket = ({
  phases = [],
  matchesByPhase = [],
  participants = [],
  onBracketUpdate = async () => {},
  organizerMode = false,
  tournament = {},
}) => {
  const navigate = useNavigate();
  const [components, dispatchComponents] = useReducer(componentsReducer, []);
  const [connections, dispatchConnections] = useReducer(connectionsReducer, []);

  // UI States
  const [connectionMode, setConnectionMode] = useState(null); // 'winner', 'loser', 'normal'
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Edit dialogs
  const [editingComponent, setEditingComponent] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState({
    group: false,
    slot: false,
    match: false,
  });

  // History for undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Get unplaced teams
  const getUnplacedTeams = () => {
    const placedTeamIds = new Set();
    components.forEach((comp) => {
      if (comp.type === "group" && Array.isArray(comp.data.slots)) {
        comp.data.slots.forEach((slot) => {
          if (slot && slot.teamId) placedTeamIds.add(String(slot.teamId));
        });
      } else if (comp.type === "slot" && comp.data.teamId) {
        placedTeamIds.add(String(comp.data.teamId));
      } else if (comp.type === "match") {
        if (comp.data.teamA) placedTeamIds.add(String(comp.data.teamA));
        if (comp.data.teamB) placedTeamIds.add(String(comp.data.teamB));
      }
    });
    return participants.filter(
      (team) => !placedTeamIds.has(String(team._id || team.id))
    );
  };

  // Save state to history
  const saveToHistory = () => {
    const state = { components, connections };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Load initial state or from localStorage
  useEffect(() => {
    const id =
      tournament && "_id" in tournament ? String(tournament._id).trim() : "";
    const tournamentId = id || "default";
    const saved = localStorage.getItem(`bracket-${tournamentId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const savedComponents = Array.isArray(parsed.components)
          ? parsed.components
          : [];
        const savedConnections = Array.isArray(parsed.connections)
          ? parsed.connections
          : [];
        dispatchComponents({
          type: "SET_COMPONENTS",
          payload: savedComponents,
        });
        dispatchConnections({
          type: "SET_CONNECTIONS",
          payload: savedConnections,
        });
      } catch (e) {
        console.error("Error loading saved bracket:", e);
      }
    }
  }, [tournament]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    const tournamentId =
      tournament && typeof tournament === "object" && "_id" in tournament
        ? String(tournament._id)
        : "default";
    localStorage.setItem(
      `bracket-${tournamentId}`,
      JSON.stringify({
        components: Array.isArray(components) ? components : [],
        connections: Array.isArray(connections) ? connections : [],
      })
    );
  }, [components, connections, tournament]);

  // Component handlers
  const handleAddComponent = (type) => {
    const id = generateId();
    // Place new components in the center of the current view
    const centerX = 400 - panOffset.x;
    const centerY = 300 - panOffset.y;

    const newComponent = {
      id,
      type,
      position: { x: snapToGrid(centerX), y: snapToGrid(centerY) },
      data: {},
    };

    if (type === "group") {
      newComponent.data = { slotCount: 4, slots: [] };
    } else if (type === "match") {
      newComponent.data = { scoreA: 0, scoreB: 0 };
    }

    saveToHistory();
    dispatchComponents({ type: "ADD_COMPONENT", payload: newComponent });
  };

  const handleComponentDrag = (id, position) => {
    dispatchComponents({ type: "UPDATE_POSITION", id, position });
  };

  const handleComponentUpdate = (id, data) => {
    dispatchComponents({ type: "UPDATE_COMPONENT", id, updates: { data } });

    // Check for automatic routing
    if (data && data.scoreA !== undefined && data.scoreB !== undefined) {
      const component = components.find((c) => c.id === id);
      if (component && component.type === "match") {
        const scoreA = Number(data.scoreA) || 0;
        const scoreB = Number(data.scoreB) || 0;
        const hasWinner = scoreA !== scoreB && data.teamA && data.teamB;

        if (hasWinner) {
          const winnerId = scoreA > scoreB ? data.teamA : data.teamB;
          const loserId = scoreA > scoreB ? data.teamB : data.teamA;

          // Route winner and loser through connections
          connections.forEach((conn) => {
            if (conn.from && conn.from.componentId === id) {
              const targetComp = components.find(
                (c) => c.id === conn.to.componentId
              );
              if (targetComp) {
                if (conn.type === "winner" && winnerId) {
                  routeTeamToComponent(winnerId, targetComp, conn.to.pointId);
                } else if (conn.type === "loser" && loserId) {
                  routeTeamToComponent(loserId, targetComp, conn.to.pointId);
                }
              }
            }
          });
        }
      }
    }
  };

  const routeTeamToComponent = (teamId, targetComp, pointId) => {
    if (targetComp.type === "slot") {
      dispatchComponents({
        type: "UPDATE_COMPONENT",
        id: targetComp.id,
        updates: { data: { ...targetComp.data, teamId } },
      });
    } else if (targetComp.type === "match") {
      const field = pointId === "inA" ? "teamA" : "teamB";
      dispatchComponents({
        type: "UPDATE_COMPONENT",
        id: targetComp.id,
        updates: { data: { ...targetComp.data, [field]: teamId } },
      });
    }
  };

  const handleComponentDelete = (id) => {
    saveToHistory();

    // Delete connections first
    connections.forEach((conn) => {
      if (conn.from.componentId === id || conn.to.componentId === id) {
        dispatchConnections({ type: "DELETE_CONNECTION", id: conn.id });
      }
    });

    // Then delete the component
    dispatchComponents({ type: "DELETE_COMPONENT", id });
  };

  const handleConnectionPoint = (componentId, pointId, type) => {
    if (!connectionMode) return;

    const connectionId = `${componentId}-${pointId}`;

    if (!selectedConnection) {
      setSelectedConnection({ componentId, pointId, connectionId });
    } else {
      // Create connection
      if (selectedConnection.componentId !== componentId) {
        const newConnection = {
          id: generateId(),
          type: connectionMode,
          from: {
            componentId: selectedConnection.componentId,
            pointId: selectedConnection.pointId,
          },
          to: { componentId, pointId },
        };
        saveToHistory();
        dispatchConnections({ type: "ADD_CONNECTION", payload: newConnection });
      }
      setSelectedConnection(null);
      setConnectionMode(null);
    }
  };

  const handleConnectionDelete = (connectionId) => {
    saveToHistory();
    dispatchConnections({ type: "DELETE_CONNECTION", id: connectionId });
  };

  // Edit handlers
  const handleEdit = (id) => {
    const component = components.find((c) => c.id === id);
    if (component) {
      setEditingComponent(component);
      setEditDialogOpen({
        group: component.type === "group",
        slot: component.type === "slot",
        match: component.type === "match",
      });
    }
  };

  const handleEditSave = (data) => {
    if (editingComponent) {
      saveToHistory();
      dispatchComponents({
        type: "UPDATE_COMPONENT",
        id: editingComponent.id,
        updates: { data: { ...editingComponent.data, ...data } },
      });
    }
    setEditingComponent(null);
  };

  // Undo/Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      dispatchComponents({
        type: "SET_COMPONENTS",
        payload: prevState.components,
      });
      dispatchConnections({
        type: "SET_CONNECTIONS",
        payload: prevState.connections,
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
      dispatchConnections({
        type: "SET_CONNECTIONS",
        payload: nextState.connections,
      });
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Canvas controls
  const handleZoomIn = () => setZoom(Math.min(zoom + 0.1, 2));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.1, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Canvas panning functionality
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = useState({ x: 0, y: 0 });

  const handleCanvasMouseDown = (e) => {
    // Only start panning if clicking on the canvas background (not on components)
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

  const unplacedTeams = getUnplacedTeams();

  if (!organizerMode) {
    // Read-only view for non-organizers
    return (
      <Box sx={{ mb: 6 }}>
        <Typography variant="h6" sx={{ color: "text.primary", mb: 3 }}>
          Tournament Bracket
        </Typography>
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
            {/* Grid */}
            <div
              className="canvas-background"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.1,
                backgroundImage: `
                  linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                pointerEvents: "auto",
              }}
            />

            {/* Connections */}
            {connections.map((connection) => (
              <ConnectionLine
                key={connection.id}
                connection={connection}
                components={components}
                onDelete={handleConnectionDelete}
                deleteMode={false}
              />
            ))}

            {/* Components */}
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
                />
              ) : null;
            })}
          </div>
        </Box>
      </Box>
    );
  }

  return (
    <DndContext
      onDragEnd={({ active, over }) => {
        if (!over) return;

        const teamId = String(active.id);
        const dropId = String(over.id);

        // Handle team placement - check for both -slot and -team patterns
        if (dropId.indexOf("-slot") !== -1 || dropId.indexOf("-team") !== -1) {
          const parts = dropId.split("-");
          const componentId = parts[0];
          const component = components.find((c) => c.id === componentId);

          if (component) {
            saveToHistory();

            if (component.type === "group") {
              const slotIndex = parseInt(parts[2]) || 0;
              const newSlots = Array.isArray(component.data.slots)
                ? [...component.data.slots]
                : [];
              // Ensure array is large enough
              while (newSlots.length <= slotIndex) {
                newSlots.push(null);
              }
              newSlots[slotIndex] = { teamId, score: 0 };
              handleComponentUpdate(componentId, {
                ...component.data,
                slots: newSlots,
              });
            } else if (component.type === "slot") {
              handleComponentUpdate(componentId, { ...component.data, teamId });
            } else if (component.type === "match") {
              // Handle both -teamA and -teamB patterns
              const isTeamA = parts[1] === "teamA";
              const field = isTeamA ? "teamA" : "teamB";
              const scoreField = isTeamA ? "scoreA" : "scoreB";
              const currentData = component.data || {};
              handleComponentUpdate(componentId, {
                ...currentData,
                [field]: teamId,
                [scoreField]: currentData[scoreField] || 0,
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
          {/* Component Buttons */}
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

          {/* Connection Buttons */}
          <Button
            variant={connectionMode === "winner" ? "contained" : "outlined"}
            onClick={() => {
              setConnectionMode(connectionMode === "winner" ? null : "winner");
              setSelectedConnection(null);
              setDeleteMode(false);
            }}
            size="small"
            sx={{
              color: connectionMode === "winner" ? "white" : "#4ade80",
              borderColor: "#4ade80",
              backgroundColor:
                connectionMode === "winner" ? "#4ade80" : "transparent",
            }}
          >
            🟢 Winner
          </Button>
          <Button
            variant={connectionMode === "loser" ? "contained" : "outlined"}
            onClick={() => {
              setConnectionMode(connectionMode === "loser" ? null : "loser");
              setSelectedConnection(null);
              setDeleteMode(false);
            }}
            size="small"
            sx={{
              color: connectionMode === "loser" ? "white" : "#ef4444",
              borderColor: "#ef4444",
              backgroundColor:
                connectionMode === "loser" ? "#ef4444" : "transparent",
            }}
          >
            🔴 Loser
          </Button>
          <Button
            variant={connectionMode === "normal" ? "contained" : "outlined"}
            onClick={() => {
              setConnectionMode(connectionMode === "normal" ? null : "normal");
              setSelectedConnection(null);
              setDeleteMode(false);
            }}
            size="small"
            sx={{
              color: connectionMode === "normal" ? "white" : "#3b82f6",
              borderColor: "#3b82f6",
              backgroundColor:
                connectionMode === "normal" ? "#3b82f6" : "transparent",
            }}
          >
            🔵 Link
          </Button>

          {/* Delete Button */}
          <Button
            variant={deleteMode ? "contained" : "outlined"}
            startIcon={<Delete />}
            onClick={() => {
              setDeleteMode(!deleteMode);
              setConnectionMode(null);
              setSelectedConnection(null);
            }}
            size="small"
            color="error"
          >
            Delete {deleteMode ? "(ON)" : "(OFF)"}
          </Button>

          {/* Canvas Controls */}
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
            <Tooltip title="Click and drag on empty areas to pan">
              <IconButton size="small" disabled>
                <Info sx={{ fontSize: "16px" }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Undo/Redo */}
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

          {/* Save Indicator */}
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
              Drag teams into component slots below
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
            }}
          >
            {/* Grid */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.1,
                backgroundImage: `
                  linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                pointerEvents: "none",
              }}
            />

            {/* Connections - simple independent rendering */}
            {connections.map((connection) => (
              <ConnectionLine
                key={connection.id}
                connection={connection}
                components={components}
                onDelete={handleConnectionDelete}
                deleteMode={deleteMode}
              />
            ))}

            {/* Components */}
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
                  selectedForConnection={selectedConnection?.connectionId}
                  onConnectionPoint={handleConnectionPoint}
                  deleteMode={deleteMode}
                  participants={participants}
                />
              ) : null;
            })}
          </div>
        </Box>

        {/* Edit Dialogs */}
        <EditGroupDialog
          open={editDialogOpen.group}
          onClose={() => {
            setEditDialogOpen({ group: false, slot: false, match: false });
            setEditingComponent(null);
          }}
          data={editingComponent?.data}
          onSave={handleEditSave}
        />
        <EditSlotDialog
          open={editDialogOpen.slot}
          onClose={() => {
            setEditDialogOpen({ group: false, slot: false, match: false });
            setEditingComponent(null);
          }}
          data={editingComponent?.data}
          onSave={handleEditSave}
        />
        <EditMatchDialog
          open={editDialogOpen.match}
          onClose={() => {
            setEditDialogOpen({ group: false, slot: false, match: false });
            setEditingComponent(null);
          }}
          data={editingComponent?.data}
          onSave={handleEditSave}
        />
      </Box>
    </DndContext>
  );
};

export default Bracket;
