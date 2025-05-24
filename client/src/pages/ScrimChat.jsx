import React, { useContext, useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client"; // Ensure socket.io-client is installed
import { AuthContext } from "../context/AuthContext";
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Avatar,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4444";
let socket;

// Helper: initials fallback
const getInitials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");

export default function ScrimChat({ chatId: propChatId }) {
  const { user } = useContext(AuthContext);
  const { state } = useLocation();
  const navigate = useNavigate();
  const { chatId: paramChatId } = useParams();
  const chatId = propChatId || state?.chatId || paramChatId;
  const token = localStorage.getItem("token") || "";

  const [scrim, setScrim] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  // Redirect if no chatId
  useEffect(() => {
    if (!chatId) navigate("/chats");
  }, [chatId, navigate]);

  // Real-time via Socket.IO
  useEffect(() => {
    if (!chatId) return;
    socket = io(API_BASE, { auth: { token } });
    socket.emit("joinRoom", chatId);
    socket.on("newMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => socket.disconnect();
  }, [chatId, token]);

  // Fetch scrim & history once
  useEffect(() => {
    if (!chatId) return;
    let mounted = true;
    const fetchChat = async () => {
      try {
        const [scrimRes, chatRes] = await Promise.all([
          axios.get(`${API_BASE}/api/scrims/${chatId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/api/scrims/chat/${chatId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (mounted) {
          setScrim(scrimRes.data);
          setMessages(chatRes.data.messages || []);
        }
      } catch (err) {
        console.error("Chat load error:", err);
      }
    };
    fetchChat();
    return () => {
      mounted = false;
    };
  }, [chatId, token]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || !chatId) return;
    socket.emit("sendMessage", { scrimId: chatId, text });
    setText("");
  };

  if (!scrim) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <Typography>Loading chat…</Typography>
      </Box>
    );
  }

  // Header info
  const headerTitle = `${scrim.teamA.name} vs ${scrim.teamB?.name || "TBD"}`;
  const headerSub = `${new Date(scrim.scheduledTime).toLocaleString()} — ${
    scrim.format
  }`;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: "background.paper",
          boxShadow: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6">{headerTitle}</Typography>
        <Typography variant="body2" color="textSecondary">
          {headerSub}
        </Typography>
      </Box>

      {/* Messages */}
      <Paper sx={{ flexGrow: 1, p: 2, overflowY: "auto", bgcolor: "#f9f9f9" }}>
        {messages.length === 0 ? (
          <Typography color="textSecondary">No messages yet.</Typography>
        ) : (
          messages.map((msg) => {
            const isMine =
              msg.sender._id === user.id || msg.sender._id === user._id;
            // Display actual usernames
            const senderName = isMine
              ? user.username || user.name
              : msg.sender.username;
            const avatarSrc = isMine ? user.avatar : msg.sender.avatar;

            return (
              <Box
                key={msg._id}
                sx={{
                  mb: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isMine ? "flex-end" : "flex-start",
                }}
              >
                <Typography variant="subtitle2">{senderName}</Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    display: "flex",
                    alignItems: "center",
                    flexDirection: isMine ? "row-reverse" : "row",
                  }}
                >
                  <Avatar src={avatarSrc} sx={{ width: 24, height: 24, mx: 1 }}>
                    {!avatarSrc && getInitials(senderName)}
                  </Avatar>
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      maxWidth: "70%",
                      bgcolor: isMine ? "primary.main" : "grey.200",
                    }}
                  >
                    <Typography sx={{ color: isMine ? "white" : "black" }}>
                      {msg.text}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" sx={{ mt: 0.5 }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </Typography>
              </Box>
            );
          })
        )}
        <div ref={bottomRef} />
      </Paper>

      {/* Input */}
      <Box sx={{ display: "flex", gap: 1, mt: 2, p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Type your message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
        />
        <IconButton color="primary" onClick={handleSend}>
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
