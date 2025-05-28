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
  const { scrimId } = useParams();
  const { user } = useContext(AuthContext);
  const currentTeamId = user.teamId;

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load all chat threads for this user’s teams
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/scrims/chat", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setChats(res.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, []);

  // Default-select the first chat if none chosen
  useEffect(() => {
    if (!scrimId && chats.length > 0) {
      navigate(`/chats/${chats[0].scrim._id}`, { replace: true });
    }
  }, [scrimId, chats, navigate]);

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
          ) : chats.length === 0 ? (
            <Typography sx={{ p: 2 }}>No chats yet</Typography>
          ) : (
            <List disablePadding>
              {chats.map((chat) => {
                // Determine the opposing team
                const opponent =
                  chat.owner._id === currentTeamId
                    ? chat.challenger
                    : chat.owner;
                const time = new Date(
                  chat.scrim.scheduledTime
                ).toLocaleString();
                const id = chat.scrim._id; // URL param is the scrim ID
                return (
                  <ListItemButton
                    key={chat._id}
                    selected={id === scrimId}
                    onClick={() => navigate(`/chats/${id}`)}
                  >
                    <ListItemText
                      primary={opponent.name}
                      secondary={`${chat.scrim.format} • ${time}`}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Drawer>

        {/* Chat pane */}
        <Box flex={1} display="flex" flexDirection="column">
          {scrimId ? (
            <ScrimChat />
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
