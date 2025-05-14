import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Avatar,
  Box,
} from "@mui/material";
//import MenuIcon from "@mui/icons-material/Menu";
import React from "react";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  //const [dropdownOpen, setDropdownOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts
      .map((p) => p[0].toUpperCase())
      .slice(0, 2)
      .join("");
  };

  return (
    <AppBar position="sticky" color="primary">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          <Link to="/" style={{ color: "white", textDecoration: "none" }}>
            Challenger
          </Link>
        </Typography>
        {user && (
          <>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Link
                to="/dashboard"
                style={{ color: "white", margin: "0 10px" }}
              >
                Dashboard
              </Link>
              <Link to="/scrims" style={{ color: "white", margin: "0 10px" }}>
                Scrims
              </Link>
              <Link to="/teams" style={{ color: "white", margin: "0 10px" }}>
                Teams
              </Link>
              <IconButton color="inherit" onClick={handleMenu}>
                <Avatar>
                  {user.avatar ? (
                    <img src={user.avatar} alt="avatar" />
                  ) : (
                    getInitials(user.username)
                  )}
                </Avatar>
              </IconButton>
            </Box>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={() => navigate("/settings")}>
                Settings
              </MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </>
        )}
        {!user && (
          <Box sx={{ display: "flex", gap: 2 }}>
            <Link to="/login" style={{ color: "white" }}>
              Login
            </Link>
            <Link to="/signup" style={{ color: "white" }}>
              Signup
            </Link>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
