import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  Box,
  Drawer,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Typography,
  CircularProgress,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ScrimChat from "./ScrimChat";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4444";
const drawerWidth = 240;

export default function ChatsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [loading, setLoading] = useState(true);

  // load threads
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/api/scrims`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load chats");
        const data = await res.json();
        setChats(data);
        const initial = location.state?.chatId || data[0]?._id;
        setSelectedChatId(initial);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [location.state]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Navbar />
      <Box sx={{ display: "flex" }}>
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
          <List>
            {chats.map((scrim) => {
              const title = `${scrim.teamA.name} vs ${
                scrim.teamB?.name || "TBD"
              }`;
              const secondary = `${new Date(
                scrim.scheduledTime
              ).toLocaleString()} — ${scrim.format}`;
              return (
                <ListItem key={scrim._id} disablePadding>
                  <ListItemButton
                    selected={scrim._id === selectedChatId}
                    onClick={() => setSelectedChatId(scrim._id)}
                  >
                    <ListItemText primary={title} secondary={secondary} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Drawer>

        {/* Main chat area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            bgcolor: "background.default",
            p: 3,
            height: "100vh",
            overflow: "auto",
          }}
        >
          <Toolbar />
          {selectedChatId ? (
            // wrap ScrimChat to control its width from here
            <Box sx={{ maxWidth: 800, height: 800, mx: "auto" }}>
              <ScrimChat chatId={selectedChatId} />
            </Box>
          ) : (
            <Typography variant="h6" color="textSecondary">
              Select a chat from the sidebar
            </Typography>
          )}
        </Box>
      </Box>
    </>
  );
}
