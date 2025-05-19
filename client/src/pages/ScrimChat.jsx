import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, TextField, Button, Typography, Paper } from "@mui/material";

const ScrimChat = () => {
  const { id } = useParams(); // this is your scrimId
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchChat = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:4444/api/scrims/chat/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch chat");
        const data = await res.json();
        // backend returns { messages: [...] }
        setMessages(data.messages || []);
      } catch (err) {
        console.error("Failed to load chat:", err);
      }
    };

    fetchChat();
  }, [id]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:4444/api/scrims/chat/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: message }),
      });
      if (!res.ok) throw new Error("Send failed");
      const data = await res.json();
      // backend returns { message: "Message sent", msg: {...} }
      setMessages((prev) => [...prev, data.msg]);
      setMessage("");
    } catch (err) {
      console.error("Message send error:", err);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 600, margin: "0 auto" }}>
      <Typography variant="h5" gutterBottom>
        Scrim Chat
      </Typography>

      <Paper sx={{ p: 2, maxHeight: 400, overflowY: "auto" }}>
        {messages.length === 0 ? (
          <Typography>No messages yet.</Typography>
        ) : (
          messages.map((msg, i) => (
            <Box key={i} sx={{ mb: 2 }}>
              <Typography variant="body1">
                <strong>{msg.sender}</strong>: {msg.text}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {new Date(msg.timestamp).toLocaleString()}
              </Typography>
            </Box>
          ))
        )}
      </Paper>

      <Box
        component="form"
        onSubmit={sendMessage}
        sx={{ display: "flex", gap: 2, mt: 2 }}
      >
        <TextField
          variant="filled"
          label="Type your message…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          fullWidth
        />
        <Button type="submit" variant="contained">
          Send
        </Button>
      </Box>
    </Box>
  );
};

export default ScrimChat;
