import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Paper,
} from "@mui/material";

const ScrimChat = () => {
  const { chatId } = useParams();
  const { user } = useContext(AuthContext);

  const [messages, setMessages] = useState([]);
  const [scrim, setScrim] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  // Socket.IO connection
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!chatId) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setError("No authentication token found");
      return;
    }

    console.log("🔌 Connecting to Socket.IO for chat...");

    // Connect to your server
    socketRef.current = io("http://localhost:4444", {
      auth: { token },
    });

    // Join the chat room
    socketRef.current.emit("joinRoom", chatId);

    // Listen for new messages
    socketRef.current.on("newMessage", (messageData) => {
      console.log("📨 New message received:", messageData);
      setMessages((prev) => [...prev, messageData]);
    });

    // Handle connection events
    socketRef.current.on("connect", () => {
      console.log("🔌 ScrimChat connected to Socket.IO");
    });

    socketRef.current.on("disconnect", () => {
      console.log("🔌 ScrimChat disconnected from Socket.IO");
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("🔌 Socket connection error:", error);
      setError("Failed to connect to real-time chat");
    });

    // Handle custom errors from server
    socketRef.current.on("error", (error) => {
      console.error("🔌 Socket error:", error);
      setError(error);
    });

    // Cleanup on unmount
    return () => {
      console.log("🔌 Disconnecting ScrimChat Socket.IO...");
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [chatId]);

  // Fetch initial chat data
  useEffect(() => {
    if (!chatId) {
      setError("No chat ID provided");
      setLoading(false);
      return;
    }

    fetchChatData();
  }, [chatId]);

  const fetchChatData = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authentication token found");
        return;
      }

      console.log("🐛 Fetching chat data for chatId:", chatId);
      console.log("🐛 API URL:", `/api/scrims/chats/${chatId}`);

      const response = await axios.get(`/api/scrims/chats/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("🐛 Chat data received:", response.data);

      setMessages(response.data.messages || []);
      setScrim(response.data.scrim);
    } catch (err) {
      console.error("🐛 Error fetching chat:", err);
      console.error("🐛 Error response:", err.response);
      console.error("🐛 Error status:", err.response?.status);
      console.error("🐛 Error data:", err.response?.data);
      setError(
        err.response?.data?.message || `Failed to load chat: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Send message via HTTP (reliable method)
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setSending(true);

      const token = localStorage.getItem("token");
      const response = await axios.post(
        `/api/scrims/chats/${chatId}`,
        { text: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("📤 Message sent:", response.data);

      // Clear input - Socket.IO will handle adding the message to the UI
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100%"
      >
        <CircularProgress />
        <Typography sx={{ ml: 2, color: "white" }}>Loading chat...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!chatId) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100%"
      >
        <Typography color="white">No chat selected</Typography>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100%"
      sx={{ color: "white" }}
    >
      {/* Chat header */}
      {scrim && (
        <Box
          p={2}
          borderBottom={1}
          borderColor="divider"
          sx={{ bgcolor: "rgba(255,255,255,0.05)" }}
        >
          <Typography variant="h6" color="white">
            Chat: {scrim.teamA?.name} vs {scrim.teamB?.name || "TBD"}
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
            {scrim.format} • {new Date(scrim.scheduledTime).toLocaleString()}
          </Typography>
          {/* Connection status */}
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
            {socketRef.current?.connected ? "🟢 Connected" : "🔴 Disconnected"}
          </Typography>
        </Box>
      )}

      {/* Messages list */}
      <Box flex={1} overflow="auto" p={1}>
        {messages.length === 0 ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100%"
          >
            <Typography color="rgba(255,255,255,0.7)">
              No messages yet. Start the conversation!
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {messages.map((message, index) => {
              // Clean message positioning logic
              const isMyMessage = message.sender?.username === user?.username;

              return (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    justifyContent: isMyMessage ? "flex-end" : "flex-start",
                    width: "100%",
                    mb: 1,
                  }}
                >
                  <Paper
                    elevation={2}
                    sx={{
                      p: 1.5,
                      maxWidth: "70%",
                      minWidth: "120px",
                      bgcolor: isMyMessage
                        ? "rgba(25, 118, 210, 0.3)" // Your messages - blue
                        : "rgba(255,255,255,0.15)", // Their messages - lighter
                      color: "white",
                      borderRadius: 2,
                      position: "relative",
                      // Chat bubble tail effect
                      "&::before": isMyMessage
                        ? {
                            content: '""',
                            position: "absolute",
                            top: "12px",
                            right: "-6px",
                            width: 0,
                            height: 0,
                            border: "6px solid transparent",
                            borderLeftColor: "rgba(25, 118, 210, 0.3)",
                          }
                        : {
                            content: '""',
                            position: "absolute",
                            top: "12px",
                            left: "-6px",
                            width: 0,
                            height: 0,
                            border: "6px solid transparent",
                            borderRightColor: "rgba(255,255,255,0.15)",
                          },
                    }}
                  >
                    {/* Message text */}
                    <Typography
                      variant="body1"
                      sx={{ mb: 0.5, wordBreak: "break-word" }}
                    >
                      {message.text}
                    </Typography>

                    {/* Message metadata */}
                    <Typography
                      variant="caption"
                      sx={{
                        color: "rgba(255,255,255,0.6)",
                        display: "block",
                        textAlign: isMyMessage ? "right" : "left",
                        fontSize: "0.7rem",
                      }}
                    >
                      {!isMyMessage &&
                        `${message.sender?.username || "Unknown"} • `}
                      {new Date(message.timestamp).toLocaleString()}
                    </Typography>
                  </Paper>
                </Box>
              );
            })}
          </Box>
        )}
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </Box>

      {/* Message input */}
      <Box
        p={2}
        borderTop={1}
        borderColor="divider"
        sx={{ bgcolor: "rgba(255,255,255,0.05)" }}
      >
        <Box display="flex" gap={1}>
          <TextField
            fullWidth
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={sending}
            variant="outlined"
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "white",
                "& fieldset": {
                  borderColor: "rgba(255, 255, 255, 0.23)",
                },
                "&:hover fieldset": {
                  borderColor: "rgba(255, 255, 255, 0.5)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "primary.main",
                },
              },
              "& .MuiInputLabel-root": {
                color: "rgba(255, 255, 255, 0.7)",
              },
            }}
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            size="small"
          >
            {sending ? "Sending..." : "Send"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ScrimChat;
