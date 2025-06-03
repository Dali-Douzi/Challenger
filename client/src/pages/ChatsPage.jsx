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
  const { chatId } = useParams(); // now chatId is the param name
  const { user } = useContext(AuthContext);

  const [chats, setChats] = useState([]); // renamed from “scrims” → “chats”
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 1) Fetch all chats for this user
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/chats", {
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

  // 2) If no chatId in URL, navigate to first chat in the list
  useEffect(() => {
    if (!chatId && chats.length > 0) {
      navigate(`/chats/${chats[0]._id}`, { replace: true });
    }
  }, [chatId, chats, navigate]);

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
                // “opponent” logic: whoever isn’t my team is the other team.
                // chat.scrim.teamA and chat.scrim.teamB are full objects with “_id” and “name”
                const myTeamId = user.teamId;
                const teamA = chat.scrim.teamA;
                const teamB = chat.scrim.teamB;
                const opponent = teamA._id === myTeamId ? teamB : teamA;

                return (
                  <ListItemButton
                    key={chat._id}
                    selected={chat._id === chatId}
                    onClick={() => navigate(`/chats/${chat._id}`)}
                  >
                    <ListItemText
                      primary={opponent.name}
                      secondary={`${chat.scrim.format} • ${new Date(
                        chat.scrim.scheduledTime
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
