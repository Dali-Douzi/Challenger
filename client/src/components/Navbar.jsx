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

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4444";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [avatarAnchor, setAvatarAnchor] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

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
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
      );
      setNotifAnchor(null);
      if (notif.type === "accept") {
        navigate("/chats", { state: { chatId: notif.chat._id } });
      } else {
        navigate(notif.url || `/scrims/${notif.scrim}/requests`);
      }
    } catch (err) {
      console.error("🔔 mark-as-read error:", err);
    }
  };

  // Mark chat notifications as read then navigate
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

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Challenger
        </Typography>

        {user ? (
          <>
            {/* Notifications Bell (non-chat) */}
            <IconButton
              color="inherit"
              onClick={(e) => setNotifAnchor(e.currentTarget)}
            >
              <Badge badgeContent={unreadNotifCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <Menu
              anchorEl={notifAnchor}
              open={Boolean(notifAnchor)}
              onClose={() => setNotifAnchor(null)}
              PaperProps={{ style: { minWidth: 300 } }}
            >
              {notifLoading && (
                <MenuItem disabled>
                  <CircularProgress size={20} /> Loading…
                </MenuItem>
              )}
              {!notifLoading && nonChatNotifications.length === 0 && (
                <MenuItem disabled>No new notifications</MenuItem>
              )}
              {!notifLoading &&
                nonChatNotifications.map((n) => (
                  <MenuItem
                    key={n._id}
                    onClick={() => handleNotifClick(n)}
                    sx={{ alignItems: "flex-start", whiteSpace: "normal" }}
                  >
                    <Box>
                      <Typography variant="body2">{n.message}</Typography>
                      {n.createdAt && (
                        <Typography variant="caption" color="textSecondary">
                          {new Date(n.createdAt).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
            </Menu>

            {/* Chat Icon Button (chat notifications only) */}
            <IconButton color="inherit" onClick={handleChatClick}>
              <Badge badgeContent={unreadChatCount} color="error">
                <ChatIcon />
              </Badge>
            </IconButton>

            {/* Navigation Links */}
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
                Team
              </Link>
            </Box>

            {/* User Avatar & Menu */}
            <IconButton color="inherit" onClick={openAvatarMenu}>
              <Avatar src={user.avatar}>
                {!user.avatar &&
                  (user.username || user.email || user.name)
                    .split(" ")
                    .map((w) => w[0].toUpperCase())
                    .slice(0, 2)
                    .join("")}
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
