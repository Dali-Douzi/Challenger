import React, {
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
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
  Divider,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ChatIcon from "@mui/icons-material/Chat";
import PersonIcon from "@mui/icons-material/Person";

const API_BASE = "http://localhost:4444";

const getInitials = (str) => {
  if (typeof str !== "string" || !str.trim()) return "";
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

  const token = localStorage.getItem("token");
  const socketRef = useRef(null);

  const [notifAnchor, setNotifAnchor] = useState(null);
  const [avatarAnchor, setAvatarAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [userTeams, setUserTeams] = useState([]);

  const openNotifMenu = (e) => setNotifAnchor(e.currentTarget);
  const closeNotifMenu = () => setNotifAnchor(null);
  const openAvatarMenu = (e) => setAvatarAnchor(e.currentTarget);
  const closeAvatarMenu = () => setAvatarAnchor(null);

  // Fetch notifications (initial load)
  const fetchNotifications = useCallback(async () => {
    if (!token) return;

    setNotifLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(Array.isArray(res.data) ? res.data : []);
      console.log("🔔 Fetched notifications:", res.data?.length || 0);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setNotifLoading(false);
    }
  }, [token]);

  // Fetch user's teams
  const fetchUserTeams = useCallback(async () => {
    if (!token) return;

    try {
      const res = await axios.get(`${API_BASE}/api/teams/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserTeams(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load user teams:", err);
    }
  }, [token]);

  // Socket.IO connection for real-time notifications
  useEffect(() => {
    if (!user || !token) return;

    console.log("🔌 Connecting to Socket.IO for notifications...");

    // Connect to Socket.IO
    socketRef.current = io(API_BASE, {
      auth: { token },
    });

    // Listen for new notifications with proper team filtering
    socketRef.current.on("newNotification", (data) => {
      console.log("🔔 New notification received:", data);
      console.log("🔔 Notification for teamId:", data.teamId);
      console.log("🔔 Current user teamId:", user.teamId);

      // Only add notifications that are for the current user's team
      if (
        user.teamId &&
        data.teamId &&
        data.teamId.toString() === user.teamId.toString()
      ) {
        console.log("🔔 Adding notification - it's for my team!");
        setNotifications((prev) => {
          // Check if notification already exists to prevent duplicates
          const exists = prev.some((n) => n._id === data.notification._id);
          if (exists) {
            console.log("🔔 Notification already exists, skipping");
            return prev;
          }
          return [data.notification, ...prev];
        });
      } else {
        console.log("🔔 Ignoring notification - not for my team");
      }
    });

    // Handle connection events
    socketRef.current.on("connect", () => {
      console.log("🔌 Navbar connected to Socket.IO");
    });

    socketRef.current.on("disconnect", () => {
      console.log("🔌 Navbar disconnected from Socket.IO");
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("🔌 Navbar Socket.IO connection error:", error);
    });

    // Cleanup on unmount or user change
    return () => {
      if (socketRef.current) {
        console.log("🔌 Disconnecting Navbar Socket.IO...");
        socketRef.current.disconnect();
      }
    };
  }, [user, token]);

  // Initial fetch when user logs in
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUserTeams();
    }
  }, [user, fetchNotifications, fetchUserTeams]);

  // Filter notifications and calculate counts
  const nonChatNotifications = notifications.filter(
    (n) => n.type !== "message" && !n.read
  );
  const chatNotifications = notifications.filter(
    (n) => n.type === "message" && !n.read
  );
  const unreadNotifCount = nonChatNotifications.length;
  const unreadChatCount = chatNotifications.length;

  // All non-chat notifications for display (including read ones)
  const allNonChatNotifications = notifications.filter(
    (n) => n.type !== "message"
  );

  const handleNotifClick = async (notif) => {
    // Don't process clicks for notifications without URLs
    if (!notif.url) {
      console.log("🔔 Notification has no URL - only marking as read");
      // Still mark as read, but don't navigate
      try {
        await axios.put(
          `${API_BASE}/api/notifications/${notif._id}/read`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
        );

        console.log("🔔 Notification marked as read (no navigation)");
      } catch (err) {
        console.error("Error marking notification read:", err);
      }
      return;
    }

    // Handle notifications with URLs
    try {
      console.log("🔔 Clicking notification:", notif._id);

      // Mark as read on server
      await axios.put(
        `${API_BASE}/api/notifications/${notif._id}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update local state immediately
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
      );

      console.log("🔔 Notification marked as read");

      // Close menu first, then navigate
      closeNotifMenu();

      // Small delay to ensure state updates
      setTimeout(() => {
        console.log("🔔 Navigating to:", notif.url);
        navigate(notif.url);
      }, 100);
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  // Clear all message notifications when opening chats
  const handleChatClick = async () => {
    const toMark = chatNotifications;
    if (toMark.length === 0) {
      navigate("/chats");
      return;
    }

    try {
      await Promise.all(
        toMark.map((n) =>
          axios.put(
            `${API_BASE}/api/notifications/${n._id}/read`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
        )
      );

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.type === "message" ? { ...n, read: true } : n))
      );

      console.log("🔔 Marked all chat notifications as read");
    } catch (err) {
      console.error("Error marking chat notifications read:", err);
    }

    navigate("/chats");
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    const unreadNotifs = notifications.filter((n) => !n.read);
    if (unreadNotifs.length === 0) return;

    try {
      await Promise.all(
        unreadNotifs.map((n) =>
          axios.put(
            `${API_BASE}/api/notifications/${n._id}/read`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          )
        )
      );

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

      console.log("🔔 Marked all notifications as read");
    } catch (err) {
      console.error("Error marking all notifications read:", err);
    }
  };

  // Derive initials (or show person icon)
  const displayName = (
    user?.username ||
    user?.email ||
    user?.name ||
    ""
  ).trim();
  const initials = getInitials(displayName);

  // Avatar source with proper URL construction
  const avatarSrc = user?.avatar
    ? `${API_BASE}${user.avatar}?t=${Date.now()}`
    : null;

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
              PaperProps={{
                style: {
                  maxHeight: 400,
                  width: "350px",
                },
              }}
            >
              {notifLoading ? (
                <MenuItem disabled>
                  <CircularProgress size={20} /> Loading…
                </MenuItem>
              ) : allNonChatNotifications.length === 0 ? (
                <MenuItem disabled>No notifications</MenuItem>
              ) : (
                <>
                  {/* Header with mark all read option */}
                  {unreadNotifCount > 0 && (
                    <>
                      <MenuItem
                        onClick={handleMarkAllRead}
                        sx={{ fontWeight: "bold" }}
                      >
                        Mark all as read ({unreadNotifCount})
                      </MenuItem>
                      <Divider />
                    </>
                  )}

                  {/* Notification list */}
                  {allNonChatNotifications.map((n) => (
                    <MenuItem
                      key={n._id}
                      onClick={() => handleNotifClick(n)}
                      disabled={!n.url} // Disable click if no URL
                      sx={{
                        opacity: n.read ? 0.6 : 1,
                        backgroundColor: n.read
                          ? "transparent"
                          : "rgba(25, 118, 210, 0.08)",
                        whiteSpace: "normal",
                        wordWrap: "break-word",
                        cursor: n.url ? "pointer" : "default", // Change cursor based on clickability
                        "&:hover": {
                          backgroundColor: n.url
                            ? "rgba(0, 0, 0, 0.04)"
                            : "transparent",
                        },
                      }}
                    >
                      <Box>
                        <Typography variant="body2">
                          {n.message}
                          {!n.url && (
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{
                                ml: 1,
                                fontStyle: "italic",
                                color: "text.secondary",
                              }}
                            >
                              (info only)
                            </Typography>
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(n.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}

                  {allNonChatNotifications.length === 0 && (
                    <MenuItem disabled>No notifications</MenuItem>
                  )}
                </>
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
                to="/tournaments"
                style={{ color: "white", textDecoration: "none" }}
              >
                Tournaments
              </Link>
            </Box>

            {/* Avatar with initials/Icon fallback */}
            <IconButton color="inherit" onClick={openAvatarMenu}>
              <Avatar src={avatarSrc}>
                {!avatarSrc && (initials || <PersonIcon fontSize="small" />)}
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

              {/* User's Teams */}
              {userTeams.length > 0 && [
                <Divider key="teams-divider" />,
                ...userTeams.map((team) => (
                  <MenuItem
                    key={team._id}
                    onClick={() => {
                      closeAvatarMenu();
                      navigate(`/teams/${team._id}`);
                    }}
                    sx={{ pl: 2 }}
                  >
                    {team.name}
                  </MenuItem>
                )),
              ]}

              <Divider />
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
