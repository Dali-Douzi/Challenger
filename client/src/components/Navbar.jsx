import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  Notifications,
  Message,
  Groups,
  SportsEsports,
  EmojiEvents,
  Logout,
  Person,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleLogoClick = () => {
    navigate("/dashboard");
  };

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileMenuClick = () => {
    handleMenuClose();
    navigate("/profile");
  };

  const handleTeamsClick = () => {
    handleMenuClose();
    navigate("/teams");
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate("/login");
  };

  const navItems = [
    {
      label: "Teams",
      path: "/teams",
      icon: <Groups sx={{ mr: 1 }} />,
    },
    {
      label: "Scrims",
      path: "/scrims",
      icon: <SportsEsports sx={{ mr: 1 }} />,
    },
    {
      label: "Tournaments",
      path: "/tournaments",
      icon: <EmojiEvents sx={{ mr: 1 }} />,
    },
  ];

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  return (
    <AppBar position="sticky" elevation={2}>
      <Toolbar sx={{ justifyContent: "space-between" }}>
        {/* Left Section - Logo */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography
            variant="h5"
            component="div"
            sx={{
              fontWeight: "bold",
              cursor: "pointer",
              color: "inherit",
              textDecoration: "none",
              "&:hover": {
                opacity: 0.8,
              },
            }}
            onClick={handleLogoClick}
          >
            Challenger
          </Typography>
        </Box>

        {/* Center Section - Navigation Items */}
        <Box sx={{ display: "flex", gap: 1 }}>
          {navItems.map((item) => (
            <Button
              key={item.label}
              color="inherit"
              onClick={() => navigate(item.path)}
              startIcon={item.icon}
              sx={{
                fontWeight: isActivePath(item.path) ? "bold" : "normal",
                backgroundColor: isActivePath(item.path)
                  ? "rgba(255, 255, 255, 0.1)"
                  : "transparent",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                },
                borderRadius: 2,
                px: 2,
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {/* Right Section - Icons and Profile */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Notifications */}
          <IconButton
            color="inherit"
            aria-label="notifications"
            sx={{
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <Badge badgeContent={3} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          {/* Messages */}
          <IconButton
            color="inherit"
            aria-label="messages"
            sx={{
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <Badge badgeContent={5} color="error">
              <Message />
            </Badge>
          </IconButton>

          {/* Profile */}
          <IconButton
            onClick={handleProfileClick}
            sx={{
              ml: 1,
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              },
            }}
            aria-label="profile"
            aria-controls={open ? "profile-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
          >
            <Avatar
              src={user?.avatar ? `/${user.avatar}` : undefined}
              sx={{
                width: 32,
                height: 32,
                fontSize: "0.9rem",
              }}
            >
              {user?.username?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>

          {/* Profile Dropdown Menu */}
          <Menu
            id="profile-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            MenuListProps={{
              "aria-labelledby": "profile-button",
            }}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            sx={{
              mt: 1,
              "& .MuiPaper-root": {
                minWidth: 180,
              },
            }}
          >
            <MenuItem onClick={handleProfileMenuClick}>
              <ListItemIcon>
                <Person fontSize="small" />
              </ListItemIcon>
              <ListItemText>Profile</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleTeamsClick}>
              <ListItemIcon>
                <Groups fontSize="small" />
              </ListItemIcon>
              <ListItemText>Teams</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
