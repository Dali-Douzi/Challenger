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

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4444";

const Navbar = () => {
  const { user, logout, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  // Avatar menu state
  const [avatarAnchor, setAvatarAnchor] = useState(null);
  const openAvatarMenu = (e) => setAvatarAnchor(e.currentTarget);
  const closeAvatarMenu = () => setAvatarAnchor(null);

  // Notifications state
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/api/notifications`);
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("🔔 fetchNotifications error:", err);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  // On user change, reload notifications
  useEffect(() => {
    if (user) fetchNotifications();
    else setNotifications([]);
  }, [user, fetchNotifications]);

  // Open notifications menu (refetch to get newest)
  const openNotifMenu = (e) => {
    setNotifAnchor(e.currentTarget);
    fetchNotifications();
  };
  const closeNotifMenu = () => setNotifAnchor(null);

  // Handle clicking a notification:
  // 1) mark read on server
  // 2) remove from list (updates badge)
  // 3) navigate to its URL (or fallback path)
  const handleNotifClick = async (notif) => {
    try {
      await axios.put(`${API_BASE}/api/notifications/${notif._id}/read`);
      setNotifications((prev) => prev.filter((n) => n._id !== notif._id));
      closeNotifMenu();
      // navigate to the notification’s URL if provided, else default
      const target = notif.url || `/scrims/${notif.scrim}/requests`;
      navigate(target);
    } catch (err) {
      console.error("🔔 mark-as-read error:", err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0].toUpperCase())
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

        {!authLoading && user ? (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Link to="/dashboard" style={{ color: "white", margin: "0 10px" }}>
              Dashboard
            </Link>
            <Link to="/scrims" style={{ color: "white", margin: "0 10px" }}>
              Scrims
            </Link>
            <Link to="/teams" style={{ color: "white", margin: "0 10px" }}>
              Teams
            </Link>

            {/* Notification bell */}
            <IconButton
              color="inherit"
              onClick={openNotifMenu}
              disabled={notifLoading}
            >
              <Badge
                badgeContent={notifLoading ? 0 : notifications.length}
                color="error"
              >
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <Menu
              anchorEl={notifAnchor}
              open={Boolean(notifAnchor)}
              onClose={closeNotifMenu}
              PaperProps={{ style: { minWidth: 300 } }}
            >
              {notifLoading && (
                <MenuItem disabled>
                  <CircularProgress size={20} /> Loading…
                </MenuItem>
              )}
              {!notifLoading && notifications.length === 0 && (
                <MenuItem disabled>No new notifications</MenuItem>
              )}
              {!notifLoading &&
                notifications.map((n) => (
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

            {/* Avatar */}
            <IconButton color="inherit" onClick={openAvatarMenu} sx={{ ml: 1 }}>
              <Avatar>
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt="avatar"
                    width={32}
                    height={32}
                    style={{ borderRadius: "50%" }}
                  />
                ) : (
                  getInitials(user.username || user.email)
                )}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={avatarAnchor}
              open={Boolean(avatarAnchor)}
              onClose={closeAvatarMenu}
            >
              <MenuItem
                onClick={() => {
                  navigate("/settings");
                  closeAvatarMenu();
                }}
              >
                Settings
              </MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </Box>
        ) : (
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
