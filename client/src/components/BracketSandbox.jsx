import React, { useState, useCallback, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import useTournament from '../hooks/useTournament';
import MatchDetail from './MatchDetail';

// Simple icon components
const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const TeamIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const DeleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3,6 5,6 21,6"/>
    <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

// Connection point component
const ConnectionPoint = ({ type, position, nodeId, pointId, isActive, onClick }) => {
  const colors = {
    winner: '#4ade80',
    loser: '#ef4444', 
    group: '#3b82f6'
  };

  return (
    <div
      style={{
        position: 'absolute',
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: isActive ? colors[type] : '#374151',
        border: `2px solid ${colors[type]}`,
        cursor: 'pointer',
        zIndex: 10,
        ...position,
        transition: 'all 0.2s',
        transform: isActive ? 'scale(1.2)' : 'scale(1)'
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick(nodeId, pointId, type);
      }}
    />
  );
};

// Connection Line Component
const ConnectionLine = ({ from, to, type, components, deleteMode = false, onDelete }) => {
  const fromComponent = components.find(c => c.id === from.nodeId);
  const toComponent = components.find(c => c.id === to.nodeId);
  
  if (!fromComponent || !toComponent) return null;

  const getConnectionPoint = (component, pointId) => {
    const { position } = component;
    const baseX = position.x;
    const baseY = position.y;
    
    if (component.type === 'match') {
      if (pointId === 'winner-out') return { x: baseX + 220 + 6, y: baseY + 30 + 6 };
      if (pointId === 'loser-out') return { x: baseX + 220 + 6, y: baseY + 60 + 6 };
      if (pointId === 'teamA-in') return { x: baseX - 6, y: baseY + 35 + 6 };
      if (pointId === 'teamB-in') return { x: baseX - 6, y: baseY + 65 + 6 };
    }
    
    if (component.type === 'team') {
      if (pointId === 'team-out') return { x: baseX + 160 + 6, y: baseY + 24 + 6 };
    }
    
    return { x: baseX, y: baseY };
  };

  const fromPoint = getConnectionPoint(fromComponent, from.pointId);
  const toPoint = getConnectionPoint(toComponent, to.pointId);
  
  const colors = {
    winner: '#4ade80',
    loser: '#ef4444', 
    group: '#3b82f6'
  };

  const strokeColor = deleteMode ? '#ef4444' : colors[type];
  const strokeWidth = deleteMode ? '4' : '3';

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: deleteMode ? 'auto' : 'none',
        zIndex: 1,
        cursor: deleteMode ? 'pointer' : 'default'
      }}
    >
      <line
        x1={fromPoint.x}
        y1={fromPoint.y}
        x2={toPoint.x}
        y2={toPoint.y}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={type === 'loser' ? '5,5' : 'none'}
        onClick={(e) => {
          if (deleteMode && onDelete) {
            e.stopPropagation();
            onDelete();
          }
        }}
      />
      <polygon
        points={`${toPoint.x-8},${toPoint.y-4} ${toPoint.x},${toPoint.y} ${toPoint.x-8},${toPoint.y+4}`}
        fill={strokeColor}
        onClick={(e) => {
          if (deleteMode && onDelete) {
            e.stopPropagation();
            onDelete();
          }
        }}
      />
    </svg>
  );
};

// Match Node Component - now much simpler
const MatchNode = ({ 
  id, 
  position, 
  onDrag, 
  onEdit, 
  match,
  selectedConnector = null, 
  onConnectionClick = () => {},
  deleteMode = false
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  
  const handleMouseDown = (e) => {
    if (selectedConnector || deleteMode) return;
    
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || selectedConnector || deleteMode) return;
    
    const canvas = document.getElementById('bracket-canvas');
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    
    const newX = e.clientX - canvasRect.left - dragOffset.x;
    const newY = e.clientY - canvasRect.top - dragOffset.y;
    
    onDrag(id, { x: newX, y: newY });
  }, [isDragging, selectedConnector, dragOffset, id, onDrag, deleteMode]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  const isConnectionMode = selectedConnector !== null;
  const isDeleteMode = deleteMode;

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: '220px',
        minHeight: '100px',
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        border: isDeleteMode ? '2px solid #ef4444' : isConnectionMode ? '2px dashed #64748b' : '2px solid #475569',
        borderRadius: '8px',
        userSelect: 'none',
        cursor: isDeleteMode ? 'pointer' : isConnectionMode ? 'crosshair' : (isDragging ? 'grabbing' : 'grab'),
        transition: isDragging ? 'none' : 'all 0.2s'
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if (isDeleteMode) {
          e.stopPropagation();
          if (onEdit) onEdit(id, 'delete');
        }
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: 'rgba(51, 65, 85, 0.8)',
        borderRadius: '6px 6px 0 0'
      }}>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>
          Match #{match?.slot || id}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onEdit) onEdit(id, isDeleteMode ? 'delete' : 'edit');
          }}
          style={{
            background: 'none',
            border: 'none',
            color: isDeleteMode ? '#ef4444' : '#94a3b8',
            cursor: 'pointer',
            padding: '2px'
          }}
        >
          {isDeleteMode ? <DeleteIcon /> : <PencilIcon />}
        </button>
      </div>

      {/* Team Slots */}
      <div style={{ padding: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Team A */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '8px 10px',
            backgroundColor: 'rgba(71, 85, 105, 0.3)',
            borderRadius: '4px'
          }}>
            <span style={{ fontSize: '0.85rem', color: '#e2e8f0', flex: 1 }}>
              {match?.teamA?.name || "Team A"}
            </span>
            <div style={{
              width: '24px',
              height: '20px',
              backgroundColor: 'rgba(51, 65, 85, 0.8)',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              color: '#94a3b8'
            }}>
              {match?.scoreA ?? '-'}
            </div>
          </div>

          {/* Team B */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '8px 10px',
            backgroundColor: 'rgba(71, 85, 105, 0.3)',
            borderRadius: '4px'
          }}>
            <span style={{ fontSize: '0.85rem', color: '#e2e8f0', flex: 1 }}>
              {match?.teamB?.name || "Team B"}
            </span>
            <div style={{
              width: '24px',
              height: '20px',
              backgroundColor: 'rgba(51, 65, 85, 0.8)',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              color: '#94a3b8'
            }}>
              {match?.scoreB ?? '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Connection Points */}
      <ConnectionPoint
        type="winner"
        position={{ right: '-6px', top: '30px' }}
        nodeId={id}
        pointId="winner-out"
        isActive={selectedConnector === 'winner'}
        onClick={onConnectionClick}
      />
      
      <ConnectionPoint
        type="loser"
        position={{ right: '-6px', top: '60px' }}
        nodeId={id}
        pointId="loser-out"
        isActive={selectedConnector === 'loser'}
        onClick={onConnectionClick}
      />

      <ConnectionPoint
        type="group"
        position={{ left: '-6px', top: '35px' }}
        nodeId={id}
        pointId="teamA-in"
        isActive={selectedConnector === 'group'}
        onClick={onConnectionClick}
      />

      <ConnectionPoint
        type="group"
        position={{ left: '-6px', top: '65px' }}
        nodeId={id}
        pointId="teamB-in"
        isActive={selectedConnector === 'group'}
        onClick={onConnectionClick}
      />
    </div>
  );
};

// Team Node Component
const TeamNode = ({ 
  id, 
  position, 
  onDrag, 
  team,
  onEdit, 
  selectedConnector = null, 
  onConnectionClick = () => {},
  deleteMode = false
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (selectedConnector || deleteMode) return;
    
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || selectedConnector || deleteMode) return;
    
    const canvas = document.getElementById('bracket-canvas');
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    
    const newX = e.clientX - canvasRect.left - dragOffset.x;
    const newY = e.clientY - canvasRect.top - dragOffset.y;
    
    onDrag(id, { x: newX, y: newY });
  }, [isDragging, selectedConnector, dragOffset, id, onDrag, deleteMode]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  const isConnectionMode = selectedConnector !== null;
  const isDeleteMode = deleteMode;

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: '160px',
        height: '60px',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        border: isDeleteMode ? '2px solid #ef4444' : isConnectionMode ? '2px dashed #3b82f6' : '2px solid #3b82f6',
        borderRadius: '8px',
        userSelect: 'none',
        cursor: isDeleteMode ? 'pointer' : isConnectionMode ? 'crosshair' : (isDragging ? 'grabbing' : 'grab'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        transition: isDragging ? 'none' : 'all 0.2s'
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if (isDeleteMode) {
          e.stopPropagation();
          if (onEdit) onEdit(id, 'delete');
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <TeamIcon />
        <span style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>
          {team?.name || "Team TBD"}
        </span>
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (onEdit) onEdit(id, isDeleteMode ? 'delete' : 'edit');
        }}
        style={{
          background: 'none',
          border: 'none',
          color: isDeleteMode ? '#ef4444' : '#94a3b8',
          cursor: 'pointer',
          padding: '2px'
        }}
      >
        {isDeleteMode ? <DeleteIcon /> : <PencilIcon />}
      </button>

      <ConnectionPoint
        type="group"
        position={{ right: '-6px', top: '24px' }}
        nodeId={id}
        pointId="team-out"
        isActive={selectedConnector === 'group'}
        onClick={onConnectionClick}
      />
    </div>
  );
};

// State management
const componentsReducer = (state, action) => {
  switch (action.type) {
    case 'SET_COMPONENTS':
      return action.payload;
    case 'ADD_COMPONENT':
      return [...state, action.payload];
    case 'DELETE_COMPONENT':
      return state.filter(comp => comp.id !== action.id);
    case 'UPDATE_POSITION':
      return state.map(comp =>
        comp.id === action.id ? { ...comp, position: action.position } : comp
      );
    default:
      return state;
  }
};

const connectionsReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CONNECTIONS':
      return action.payload;
    case 'ADD_CONNECTION':
      return [...state, action.payload];
    case 'DELETE_CONNECTION':
      return state.filter(conn => conn.id !== action.id);
    default:
      return state;
  }
};

// Main Bracket Sandbox Component
const BracketSandbox = ({ tournamentId = null }) => {
  // Use existing tournament hook instead of custom data fetching
  const { tournament, matchesByPhase, loading, error, refresh } = useTournament(tournamentId);
  
  const [components, dispatchComponents] = React.useReducer(componentsReducer, []);
  const [connections, dispatchConnections] = React.useReducer(connectionsReducer, []);
  const [nextId, setNextId] = React.useState(1);
  const [selectedConnector, setSelectedConnector] = React.useState(null);
  const [pendingConnection, setPendingConnection] = React.useState(null);
  const [deleteMode, setDeleteMode] = React.useState(false);
  const [editMatch, setEditMatch] = React.useState(null);

  // Convert tournament matches to components when data loads
  useEffect(() => {
    if (matchesByPhase && matchesByPhase.length > 0) {
      const matchComponents = [];
      let yOffset = 100;
      
      matchesByPhase.forEach((phaseMatches, phaseIndex) => {
        phaseMatches.forEach((match, matchIndex) => {
          matchComponents.push({
            id: `match-${match._id}`,
            type: 'match',
            position: { 
              x: 300 + (phaseIndex * 300), 
              y: yOffset + (matchIndex * 120) 
            },
            match: match
          });
        });
      });
      
      // Add example team nodes
      if (tournament?.teams) {
        tournament.teams.forEach((team, index) => {
          matchComponents.push({
            id: `team-${team._id}`,
            type: 'team',
            position: { x: 50, y: 100 + (index * 80) },
            team: team
          });
        });
      }
      
      dispatchComponents({
        type: 'SET_COMPONENTS',
        payload: matchComponents
      });
      
      setNextId(matchComponents.length + 1);
    }
  }, [matchesByPhase, tournament]);

  const handleComponentDrag = useCallback((componentId, newPosition) => {
    dispatchComponents({
      type: 'UPDATE_POSITION',
      id: componentId,
      position: newPosition
    });
  }, []);

  const handleEdit = (componentId, action = 'edit') => {
    if (action === 'delete') {
      dispatchComponents({
        type: 'DELETE_COMPONENT',
        id: componentId
      });
      
      // Remove connections
      const connectionsToDelete = connections.filter(conn => 
        conn.from.nodeId === componentId || conn.to.nodeId === componentId
      );
      connectionsToDelete.forEach(conn => {
        dispatchConnections({
          type: 'DELETE_CONNECTION',
          id: conn.id
        });
      });
    } else {
      // For edit, find the component and open edit dialog
      const component = components.find(c => c.id === componentId);
      if (component && component.type === 'match') {
        setEditMatch(component.match);
      }
    }
  };

  const handleConnectionClick = (nodeId, pointId, type) => {
    if (!selectedConnector) return;
    
    if (!pendingConnection) {
      setPendingConnection({ nodeId, pointId, type: selectedConnector });
    } else {
      const newConnection = {
        id: `conn-${connections.length + 1}`,
        from: pendingConnection,
        to: { nodeId, pointId, type: selectedConnector },
        type: selectedConnector
      };
      
      dispatchConnections({
        type: 'ADD_CONNECTION',
        payload: newConnection
      });
      setPendingConnection(null);
      setSelectedConnector(null);
    }
  };

  const toggleConnector = (type) => {
    setSelectedConnector(selectedConnector === type ? null : type);
    setPendingConnection(null);
    setDeleteMode(false);
  };

  const toggleDeleteMode = () => {
    setDeleteMode(!deleteMode);
    setSelectedConnector(null);
    setPendingConnection(null);
  };

  const deleteConnection = (connectionId) => {
    dispatchConnections({
      type: 'DELETE_CONNECTION',
      id: connectionId
    });
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', backgroundColor: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress color="inherit" />
        <Typography sx={{ ml: 2 }}>Loading tournament...</Typography>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '100vh', backgroundColor: '#0f172a', color: 'white', padding: '20px' }}>
        <Alert severity="error">{error}</Alert>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', backgroundColor: '#0f172a', color: 'white' }}>
      {/* Simplified Toolbar */}
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 1000,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid rgba(71, 85, 105, 0.3)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <Typography variant="h6">
          🎯 Bracket Designer - {tournament?.name}
        </Typography>
        
        {/* Connector buttons */}
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button 
            onClick={() => toggleConnector('winner')}
            style={{
              backgroundColor: selectedConnector === 'winner' ? '#4ade80' : 'transparent',
              color: selectedConnector === 'winner' ? '#0f172a' : '#4ade80',
              border: '1px solid #4ade80',
              padding: '6px 12px', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontSize: '0.8rem'
            }}
          >
            🟢 Winner
          </button>
          <button 
            onClick={() => toggleConnector('loser')}
            style={{
              backgroundColor: selectedConnector === 'loser' ? '#ef4444' : 'transparent',
              color: selectedConnector === 'loser' ? '#0f172a' : '#ef4444',
              border: '1px solid #ef4444',
              padding: '6px 12px', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontSize: '0.8rem'
            }}
          >
            🔴 Loser
          </button>
          <button 
            onClick={() => toggleConnector('group')}
            style={{
              backgroundColor: selectedConnector === 'group' ? '#3b82f6' : 'transparent',
              color: selectedConnector === 'group' ? '#0f172a' : '#3b82f6',
              border: '1px solid #3b82f6',
              padding: '6px 12px', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontSize: '0.8rem'
            }}
          >
            🔵 Group
          </button>
          <button 
            onClick={toggleDeleteMode}
            style={{
              backgroundColor: deleteMode ? '#ef4444' : 'transparent',
              color: deleteMode ? 'white' : '#ef4444',
              border: '1px solid #ef4444',
              padding: '6px 12px', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontSize: '0.8rem'
            }}
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        id="bracket-canvas"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          marginTop: '60px',
          backgroundColor: '#0f172a',
          overflow: 'auto',
          cursor: deleteMode ? 'crosshair' : 'default'
        }}
      >
        {/* Grid */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          opacity: 0.1,
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          pointerEvents: 'none'
        }} />

        {/* Render connections */}
        {connections.map(connection => (
          <ConnectionLine
            key={connection.id}
            from={connection.from}
            to={connection.to}
            type={connection.type}
            components={components}
            deleteMode={deleteMode}
            onDelete={() => deleteConnection(connection.id)}
          />
        ))}

        {/* Render components */}
        {components.map(comp => {
          if (comp.type === 'match') {
            return (
              <MatchNode
                key={comp.id}
                id={comp.id}
                position={comp.position}
                onDrag={handleComponentDrag}
                onEdit={handleEdit}
                match={comp.match}
                selectedConnector={selectedConnector}
                onConnectionClick={handleConnectionClick}
                deleteMode={deleteMode}
              />
            );
          } else if (comp.type === 'team') {
            return (
              <TeamNode
                key={comp.id}
                id={comp.id}
                position={comp.position}
                onDrag={handleComponentDrag}
                onEdit={handleEdit}
                team={comp.team}
                selectedConnector={selectedConnector}
                onConnectionClick={handleConnectionClick}
                deleteMode={deleteMode}
              />
            );
          }
          return null;
        })}
      </div>

      {/* Match Edit Dialog using existing MatchDetail component */}
      <Dialog
        open={!!editMatch}
        onClose={() => setEditMatch(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Match</DialogTitle>
        <DialogContent>
          {editMatch && (
            <MatchDetail
              fetchMatch={() => Promise.resolve(editMatch)}
              saveMatch={async (data) => {
                // Here you would normally save to backend
                console.log('Save match:', data);
                await refresh(); // Refresh tournament data
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditMatch(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default BracketSandbox;