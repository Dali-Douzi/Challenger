import React, { useContext, useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Avatar,
  CircularProgress,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

let socket;

// Up to two initials from a name
const getInitials = (str) =>
  str
    .trim()
    .split(/\s+/)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");

export default function ScrimChat() {
  const { user } = useContext(AuthContext);
  const { scrimId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";

  const [scrim, setScrim] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  // Our user’s ID for message alignment
  const myId = user?.id || user?._id;

  // Redirect back if no scrimId in URL
  useEffect(() => {
    if (!scrimId) navigate("/chats");
  }, [scrimId, navigate]);

  // Socket.io: join the one-to-one chat room by scrimId
  useEffect(() => {
    if (!scrimId) return;
    socket = io("/", { auth: { token } });
    socket.emit("joinRoom", scrimId);
    socket.on("newMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => {
      socket.disconnect();
    };
  }, [scrimId, token]);

  // Load scrim metadata and chat messages
  useEffect(() => {
    if (!scrimId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [scrimRes, chatRes] = await Promise.all([
          axios.get(`/api/scrims/${scrimId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`/api/scrims/chat/${scrimId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (!mounted) return;
        setScrim(scrimRes.data);
        setMessages(chatRes.data.messages || []);
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [scrimId, token]);

  // Auto-scroll as messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || !scrimId) return;
    socket.emit("sendMessage", { scrimId, text });
    setText("");
  };

  if (loading) {
    return (
      <Box flex={1} display="flex" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Box flex={1} display="flex" alignItems="center" justifyContent="center">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // Cluster messages by sender + same minute
  const clusters = [];
  messages.forEach((msg) => {
    const senderObj =
      typeof msg.sender === "object" ? msg.sender : { _id: msg.sender };
    const senderId = senderObj._id;
    const minuteKey = new Date(msg.timestamp).toISOString().slice(0, 16);
    const last = clusters[clusters.length - 1];
    if (last && last.senderId === senderId && last.minuteKey === minuteKey) {
      last.msgs.push(msg);
    } else {
      clusters.push({ senderId, senderObj, minuteKey, msgs: [msg] });
    }
  });

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
        }}
      >
        <Typography variant="h6">{headerTitle}</Typography>
        <Typography variant="body2" color="textSecondary">
          {headerSub}
        </Typography>
      </Box>

      {/* Messages */}
      <Paper
        square
        sx={{
          flex: 1,
          p: 2,
          bgcolor: "grey.50",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {clusters.map((cluster, i) => {
          const isMine = cluster.senderId === myId;
          const name = isMine
            ? user.username || user.email || "You"
            : cluster.senderObj.username || "Unknown";
          const avatar = isMine ? user.avatar : cluster.senderObj.avatar;
          return (
            <Box
              key={i}
              sx={{
                mb: 3,
                display: "flex",
                flexDirection: "column",
                alignItems: isMine ? "flex-end" : "flex-start",
              }}
            >
              {/* Avatar & name once */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: isMine ? "row-reverse" : "row",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Avatar src={avatar} sx={{ width: 32, height: 32, mx: 1 }}>
                  {!avatar && getInitials(name)}
                </Avatar>
                <Typography variant="subtitle2">{name}</Typography>
              </Box>

              {/* Each message in cluster */}
              {cluster.msgs.map((msg) => {
                const time = new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                });
                return (
                  <Box
                    key={msg._id}
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      bgcolor: isMine ? "primary.main" : "grey.300",
                      color: "black",
                      mb: 1,
                      maxWidth: "70%",
                      display: "flex",
                      flexDirection: isMine ? "row-reverse" : "row",
                      alignItems: "flex-end",
                    }}
                  >
                    <Typography
                      sx={{
                        flex: 1,
                        wordBreak: "break-word",
                        ...(isMine ? { ml: 1 } : { mr: 1 }),
                      }}
                    >
                      {msg.text}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ flexShrink: 0, color: "black" }}
                    >
                      {time}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          );
        })}
        <div ref={bottomRef} />
      </Paper>

      {/* Input */}
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        sx={{
          p: 2,
          bgcolor: "background.paper",
          boxShadow: 1,
          display: "flex",
          alignItems: "center",
        }}
      >
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          placeholder="Type your message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <IconButton onClick={handleSend} disabled={!text.trim()} sx={{ ml: 1 }}>
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
