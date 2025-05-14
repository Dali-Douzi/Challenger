import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, TextField, Button, Typography, Paper } from "@mui/material";
import React from "react";

const ScrimChat = () => {
  const { id } = useParams();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchChat = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`http://localhost:4444/api/scrims/${id}/chat`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error("Failed to load chat:", err);
      }
    };

    fetchChat();
  }, [id]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:4444/api/scrims/${id}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });

      if (res.ok) {
        const newMessage = await res.json();
        setMessages((prev) => [...prev, newMessage]);
        setMessage("");
      }
    } catch (err) {
      console.error("Message send error:", err);
    }
  };

  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h5" gutterBottom>
        Scrim Chat
      </Typography>

      <Paper sx={{ padding: 2, maxHeight: "400px", overflowY: "auto" }}>
        {messages.length === 0 ? (
          <Typography>No messages yet.</Typography>
        ) : (
          messages.map((msg, i) => (
            <Box key={i} sx={{ marginBottom: 2 }}>
              <Typography variant="body1">
                <strong>{msg.sender?.username || "User"}:</strong> {msg.message}
              </Typography>
            </Box>
          ))
        )}
      </Paper>

      <Box
        component="form"
        onSubmit={sendMessage}
        sx={{ display: "flex", gap: 2, marginTop: 2 }}
      >
        <TextField
          variant="filled"
          label="Type your message..."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          fullWidth
        />
        <Button type="submit" variant="contained" color="primary">
          Send
        </Button>
      </Box>
    </Box>
  );
};

export default ScrimChat;
