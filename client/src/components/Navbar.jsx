import React, { useContext, useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Badge,
  Menu,
  MenuItem,
  CircularProgress,
  Avatar,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ChatIcon from "@mui/icons-material/Chat";
import PersonIcon from "@mui/icons-material/Person"; // ← fallback icon

const API_BASE = "http://localhost:4444";

// Helper to take up to 2 initials from a display name
const getInitials = (str) => {
  if (typeof str !== "string" || !str.trim()) return ""; // ← no more “?”
  return str
    .trim()
    .split(/\s+/)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");
};

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [notifAnchor, setNotifAnchor] = useState(null);
  const [avatarAnchor, setAvatarAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const openNotifMenu = (e) => setNotifAnchor(e.currentTarget);
  const closeNotifMenu = () => setNotifAnchor(null);
  const openAvatarMenu = (e) => setAvatarAnchor(e.currentTarget);
  const closeAvatarMenu = () => setAvatarAnchor(null);

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  const nonChatNotifications = notifications.filter(
    (n) => n.type !== "message"
  );
  const unreadNotifCount = nonChatNotifications.filter((n) => !n.read).length;
  const chatNotifications = notifications.filter((n) => n.type === "message");
  const unreadChatCount = chatNotifications.filter((n) => !n.read).length;

  const handleNotifClick = async (notif) => {
    try {
      await axios.put(
        `${API_BASE}/api/notifications/${notif._id}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      closeNotifMenu();
      if (notif.link) navigate(notif.link);
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  // ← clear all “message” notifications when opening chats :contentReference[oaicite:0]{index=0}
  const handleChatClick = async () => {
    const toMark = chatNotifications.filter((n) => !n.read);
    try {
      await Promise.all(
        toMark.map((n) =>
          axios.put(
            `${API_BASE}/api/notifications/${n._id}/read`,
            {},
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          )
        )
      );
      setNotifications((prev) =>
        prev.map((n) => (n.type === "message" ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Error marking chat notifications read:", err);
    }
    navigate("/chats");
  };

  // Derive initials (or show person icon)
  const displayName = (
    user?.username ||
    user?.email ||
    user?.name ||
    ""
  ).trim();
  const initials = getInitials(displayName);

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography
          variant="h6"
          sx={{ flexGrow: 1, cursor: "pointer" }}
          onClick={() => navigate("/")}
        >
          Challenger
        </Typography>

        {user ? (
          <>
            {/* Non-chat notifications */}
            <IconButton color="inherit" onClick={openNotifMenu}>
              <Badge badgeContent={unreadNotifCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <Menu
              anchorEl={notifAnchor}
              open={Boolean(notifAnchor)}
              onClose={closeNotifMenu}
            >
              {notifLoading ? (
                <MenuItem disabled>
                  <CircularProgress size={20} /> Loading…
                </MenuItem>
              ) : nonChatNotifications.length === 0 ? (
                <MenuItem disabled>No notifications</MenuItem>
              ) : (
                nonChatNotifications.map((n) => (
                  <MenuItem key={n._id} onClick={() => handleNotifClick(n)}>
                    {n.message}
                  </MenuItem>
                ))
              )}
            </Menu>

            {/* Chat notifications */}
            <IconButton color="inherit" onClick={handleChatClick}>
              <Badge badgeContent={unreadChatCount} color="error">
                <ChatIcon />
              </Badge>
            </IconButton>

            {/* Nav links */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, ml: 2 }}>
              <Link
                to="/scrims"
                style={{ color: "white", textDecoration: "none" }}
              >
                Scrims
              </Link>
              <Link
                to="/teams"
                style={{ color: "white", textDecoration: "none" }}
              >
                Teams
              </Link>
              <Link
                to="/chats"
                style={{ color: "white", textDecoration: "none" }}
              >
                Chats
              </Link>
            </Box>

            {/* Avatar with initials/Icon fallback */}
            <IconButton color="inherit" onClick={openAvatarMenu}>
              <Avatar {...(user.avatar ? { src: user.avatar } : {})}>
                {initials || <PersonIcon fontSize="small" />}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={avatarAnchor}
              open={Boolean(avatarAnchor)}
              onClose={closeAvatarMenu}
            >
              <MenuItem
                onClick={() => {
                  closeAvatarMenu();
                  navigate("/profile");
                }}
              >
                Profile
              </MenuItem>
              <MenuItem
                onClick={() => {
                  closeAvatarMenu();
                  logout();
                  navigate("/login");
                }}
              >
                Logout
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Box sx={{ display: "flex", gap: 2 }}>
            <Link
              to="/login"
              style={{ color: "white", textDecoration: "none" }}
            >
              Login
            </Link>
            <Link
              to="/signup"
              style={{ color: "white", textDecoration: "none" }}
            >
              Signup
            </Link>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
