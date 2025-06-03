// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Container,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  CircularProgress,
  Box,
  Alert,
} from "@mui/material";

const API_BASE = "http://localhost:4444";

const ScrimRequests = () => {
  const { scrimId } = useParams();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState(null);

  // ✅ DEBUG: Log scrimId
  console.log("🔍 ScrimRequests - scrimId:", scrimId);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        console.log("🔍 Fetching scrim details for:", scrimId);
        
        // GET /api/scrims/:scrimId
        const { data: scrim } = await axios.get(
          `${API_BASE}/api/scrims/${scrimId}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
          }
        );

        console.log("🔍 Fetched scrim data:", scrim);

        // Map populated scrim.requests (Team docs) into UI rows
        const mapped = (scrim.requests || []).map((team) => ({
          id: team._id,
          fromTeamName: team.name,
          scrimTitle: `${scrim.teamA.name} vs ${scrim.teamB?.name || "TBD"}`,
          proposedDate: new Date(scrim.scheduledTime).toLocaleString(),
          status: scrim.status,
        }));
        
        console.log("🔍 Mapped requests:", mapped);
        setRequests(mapped);
      } catch (err) {
        console.error("🚨 fetchRequests error:", err);
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    if (scrimId) {
      fetchRequests();
    }
  }, [scrimId]);

  const handleAction = async (teamId, action) => {
    console.log(`🔍 Handling ${action} for team:`, teamId);
    
    setActionLoading((prev) => ({ ...prev, [teamId]: true }));
    try {
      // PUT /api/scrims/accept/:scrimId or /api/scrims/decline/:scrimId
      const response = await axios.put(`${API_BASE}/api/scrims/${action}/${scrimId}`, {
        teamId,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      console.log(`🔍 ${action} response:`, response.data);
      
      setRequests((prev) => prev.filter((r) => r.id !== teamId));
      
      // ✅ ADDED: Redirect to chat after accepting
      if (action === 'accept') {
        console.log("🔍 Accept successful, redirecting to chat:", `/chats/${scrimId}`);
        
        // Small delay to ensure backend operations complete
        setTimeout(() => {
          navigate(`/chats/${scrimId}`);
        }, 500);
      }
    } catch (err) {
      console.error(`🚨 Failed to ${action} request ${teamId}:`, err);
      const errorMessage = err.response?.data?.message || err.message;
      alert(`Error: ${errorMessage}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [teamId]: false }));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Scrim Requests
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {requests.length === 0 ? (
        <Typography>No pending requests.</Typography>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Requesting Team</TableCell>
              <TableCell>Fixture</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req.id}>
                <TableCell>{req.fromTeamName}</TableCell>
                <TableCell>{req.scrimTitle}</TableCell>
                <TableCell>{req.proposedDate}</TableCell>
                <TableCell>{req.status}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="contained"
                    disabled={actionLoading[req.id]}
                    onClick={() => handleAction(req.id, "accept")}
                    sx={{ mr: 1 }}
                  >
                    {actionLoading[req.id] ? (
                      <CircularProgress size={16} />
                    ) : (
                      "Accept"
                    )}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    disabled={actionLoading[req.id]}
                    onClick={() => handleAction(req.id, "decline")}
                  >
                    {actionLoading[req.id] ? (
                      <CircularProgress size={16} />
                    ) : (
                      "Decline"
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Container>
  );
};

export default ScrimRequests;