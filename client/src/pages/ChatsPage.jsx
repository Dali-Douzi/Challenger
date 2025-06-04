import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";

import Navbar from "../components/Navbar";
import ScrimChat from "./ScrimChat";
import { AuthContext } from "../context/AuthContext";
import { io } from "socket.io-client";

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
  const location = useLocation();
  const { chatId } = useParams();
  const { user } = useContext(AuthContext);

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const socketRef = React.useRef(null);

  // Function to fetch chats
  const fetchChats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/chats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChats(res.data);
      console.log("💬 Fetched chats:", res.data?.length || 0);
    } catch (err) {
      console.error("Error fetching chats:", err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // 1) Fetch all chats for this user on mount
  useEffect(() => {
    fetchChats();
  }, []);

  // 2) Re-fetch chats when navigating to /chats (e.g., from notifications)
  useEffect(() => {
    // Check if we just navigated here (e.g., from accepting a scrim request)
    if (location.pathname === "/chats" && !chatId) {
      console.log("💬 Navigated to /chats - refreshing chat list");
      fetchChats();
    }
  }, [location.pathname, chatId]);

  // 3) If no chatId in URL, navigate to first chat in the list
  useEffect(() => {
    if (!chatId && chats.length > 0) {
      console.log("💬 Auto-selecting first chat:", chats[0]._id);
      navigate(`/chats/${chats[0]._id}`, { replace: true });
    }
  }, [chatId, chats, navigate]);

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    console.log("🔌 Connecting to Socket.IO for chat list updates...");

    socketRef.current = io("http://localhost:4444", {
      auth: { token },
    });

    // Listen for scrim deletions that affect this user
    socketRef.current.on("scrimDeleted", (data) => {
      console.log("🗑️ Scrim deleted:", data);

      // Check if this affects the current user's team
      if (user.teamId && data.teamId === user.teamId.toString()) {
        console.log("🗑️ Scrim deletion affects my team - refreshing chat list");

        // Remove the deleted scrim's chat from local state
        setChats((prev) =>
          prev.filter((chat) => chat.scrim._id !== data.scrimId)
        );

        // If we're currently viewing the deleted chat, navigate away
        if (
          chatId &&
          chats.find(
            (chat) => chat._id === chatId && chat.scrim._id === data.scrimId
          )
        ) {
          console.log(
            "🗑️ Currently viewing deleted chat - navigating to first available"
          );
          const remainingChats = chats.filter(
            (chat) => chat.scrim._id !== data.scrimId
          );
          if (remainingChats.length > 0) {
            navigate(`/chats/${remainingChats[0]._id}`, { replace: true });
          } else {
            navigate("/chats", { replace: true });
          }
        }

        // Optional: Show notification
        // toast.info(`Scrim deleted by ${data.message}`);
      }
    });

    // Cleanup
    return () => {
      if (socketRef.current) {
        console.log("🔌 Disconnecting ChatsPage Socket.IO...");
        socketRef.current.disconnect();
      }
    };
  }, [user, chatId, chats, navigate]);

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
                // "opponent" logic: whoever isn't my team is the other team.
                const myTeamId = user.teamId;
                const teamA = chat.scrim.teamA;
                const teamB = chat.scrim.teamB;
                const opponent = teamA._id === myTeamId ? teamB : teamA;

                return (
                  <ListItemButton
                    key={chat._id}
                    selected={chat._id === chatId}
                    onClick={() => {
                      console.log("💬 Selecting chat:", chat._id);
                      navigate(`/chats/${chat._id}`);
                    }}
                  >
                    <ListItemText
                      primary={opponent?.name || "Unknown Team"}
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
            <ScrimChat key={chatId} /> // Add key prop to force re-render when chatId changes
          ) : (
            <Box
              flex={1}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Typography color="white">
                {loading ? "Loading chats..." : "Select a chat to get started"}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
}
