// src/ChatsPage.jsx

import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import Navbar from "../components/Navbar";
import ScrimChat from "./ScrimChat";
import { AuthContext } from "../context/AuthContext";

import {
  Box,
  Drawer,
  Toolbar,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  CircularProgress,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const drawerWidth = 300;

export default function ChatsPage() {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const { user } = useContext(AuthContext);

  const [scrims, setScrims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch all scrims
  useEffect(() => {
    const fetchScrims = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/scrims", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setScrims(res.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchScrims();
  }, []);

  // If no chatId in URL, auto-navigate to first scrim
  useEffect(() => {
    if (!chatId && scrims.length > 0) {
      navigate(`/chats/${scrims[0]._id}`, { replace: true });
    }
  }, [chatId, scrims, navigate]);

  return (
    <>
      <Navbar />

      <Box display="flex" height="calc(100vh - 64px)">
        {/* Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
        >
          <Toolbar
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <IconButton
                size="small"
                onClick={() => navigate("/scrims")}
                sx={{ mr: 1 }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h6" noWrap>
                Chats
              </Typography>
            </Box>
          </Toolbar>
          <Divider />

          {loading ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error" sx={{ p: 2 }}>
              {error}
            </Typography>
          ) : scrims.length === 0 ? (
            <Typography sx={{ p: 2 }}>No chats yet</Typography>
          ) : (
            <List disablePadding>
              {scrims.map((scrim) => {
                // Pick the “other” team
                const opponent =
                  scrim.teamA._id === user.teamId ? scrim.teamB : scrim.teamA;
                return (
                  <ListItemButton
                    key={scrim._id}
                    selected={scrim._id === chatId}
                    onClick={() => navigate(`/chats/${scrim._id}`)}
                  >
                    <ListItemText
                      primary={opponent.name}
                      secondary={`${scrim.format} • ${new Date(
                        scrim.scheduledTime
                      ).toLocaleString()}`}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Drawer>

        {/* Chat pane */}
        <Box flex={1} display="flex" flexDirection="column">
          {chatId ? (
            <ScrimChat chatId={chatId} />
          ) : (
            <Box
              flex={1}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Typography>Select a chat to get started</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
}
