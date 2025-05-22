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

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4444";

const ScrimRequests = () => {
  const { scrimId } = useParams();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        // GET /api/scrims/:scrimId
        const { data: scrim } = await axios.get(
          `${API_BASE}/api/scrims/${scrimId}`
        );

        // Map populated scrim.requests (Team docs) into UI rows
        const mapped = (scrim.requests || []).map((team) => ({
          id: team._id,
          fromTeamName: team.name,
          scrimTitle: `${scrim.teamA.name} vs ${scrim.teamB?.name || "TBD"}`,
          proposedDate: new Date(scrim.scheduledTime).toLocaleString(),
          status: scrim.status,
        }));
        setRequests(mapped);
      } catch (err) {
        console.error("🚨 fetchRequests error:", err);
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [scrimId]);

  const handleAction = async (teamId, action) => {
    setActionLoading((prev) => ({ ...prev, [teamId]: true }));
    try {
      // PUT /api/scrims/accept/:scrimId or /api/scrims/decline/:scrimId
      await axios.put(`${API_BASE}/api/scrims/${action}/${scrimId}`, {
        teamId,
      });
      setRequests((prev) => prev.filter((r) => r.id !== teamId));
    } catch (err) {
      console.error(`Failed to ${action} request ${teamId}:`, err);
      alert(err.response?.data?.message || err.message);
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
