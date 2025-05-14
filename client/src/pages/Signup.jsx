import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  TextField,
  Button,
  Box,
  Typography,
  Container,
  Paper,
} from "@mui/material";
import React from "react";

const Signup = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async (event) => {
    event.preventDefault();

    const res = await fetch("http://localhost:4444/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    });

    if (res.ok) {
      const success = await login(email, password); // wait for login to succeed
      if (success) {
        navigate("/dashboard");
      } else {
        alert("Account created, but login failed.");
      }
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper sx={{ padding: 4, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Sign Up
        </Typography>

        <Box
          component="form"
          onSubmit={handleSignup}
          display="flex"
          flexDirection="column"
          gap={2}
        >
          <TextField
            label="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            fullWidth
            variant="filled"
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            fullWidth
            variant="filled"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            fullWidth
            variant="filled"
          />
          <Button type="submit" variant="contained" color="primary">
            Sign Up
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Signup;
