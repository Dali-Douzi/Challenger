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

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate("/dashboard");
    } else {
      alert("Login failed");
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper sx={{ padding: 4, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Login
        </Typography>

        <Box
          component="form"
          onSubmit={handleSubmit}
          display="flex"
          flexDirection="column"
          gap={2}
        >
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            fullWidth
            variant="filled"
            required
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            fullWidth
            variant="filled"
            required
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
          >
            Login
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;
