import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from "@mui/material";
import {
  Google,
  Link as LinkIcon,
  LinkOff,
  Warning,
} from "@mui/icons-material";

// Custom Discord Icon Component
const DiscordIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0188 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9554 2.4189-2.1568 2.4189Z" />
  </svg>
);

// Custom Twitch Icon Component
const TwitchIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M2.149 0L.537 4.119v15.581h5.4V24h3.131l3.134-4.3h4.65L24 12.615V0H2.149zm19.164 11.646l-3.131 3.135h-5.4L9.65 17.919v-3.138H3.737V2.687h17.576v8.959zM20.388 8.959h-2.149v5.4h2.149v-5.4zm-5.4 0h-2.149v5.4h2.149v-5.4z" />
  </svg>
);

const LinkedAccounts = () => {
  const [linkedAccounts, setLinkedAccounts] = useState({
    google: false,
    discord: false,
    twitch: false,
    primary: "local",
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    provider: "",
    action: "",
  });

  const providers = [
    {
      id: "google",
      name: "Google",
      icon: <Google />,
      color: "#DB4437",
    },
    {
      id: "discord",
      name: "Discord",
      icon: <DiscordIcon />,
      color: "#5865F2",
    },
    {
      id: "twitch",
      name: "Twitch",
      icon: <TwitchIcon />,
      color: "#9146FF",
    },
  ];

  useEffect(() => {
    fetchLinkedAccounts();
  }, []);

  const fetchLinkedAccounts = async () => {
    try {
      const response = await fetch(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:4444"
        }/api/auth/linked-accounts`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (data.success) {
        setLinkedAccounts(data.data);
      } else {
        setMessage("Failed to load linked accounts");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Error fetching linked accounts:", error);
      setMessage("Error loading account information");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkAccount = (provider) => {
    // Redirect to OAuth provider
    window.location.href = `${
      process.env.REACT_APP_API_URL || "http://localhost:4444"
    }/api/auth/${provider}`;
  };

  const handleUnlinkAccount = async (provider) => {
    setActionLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:4444"
        }/api/auth/unlink/${provider}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (data.success) {
        setMessage(`${provider} account unlinked successfully`);
        setMessageType("success");
        await fetchLinkedAccounts(); // Refresh the linked accounts
      } else {
        setMessage(data.message || "Failed to unlink account");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Error unlinking account:", error);
      setMessage("Error unlinking account");
      setMessageType("error");
    } finally {
      setActionLoading(false);
      setConfirmDialog({ open: false, provider: "", action: "" });
    }
  };

  const openConfirmDialog = (provider, action) => {
    setConfirmDialog({ open: true, provider, action });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, provider: "", action: "" });
  };

  const getLinkedCount = () => {
    return (
      Object.values(linkedAccounts).filter((value) => value === true).length +
      (linkedAccounts.primary === "local" ? 1 : 0)
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Linked Accounts
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Connect your social accounts for quick sign-in options. You can link
          multiple accounts to your profile.
        </Typography>
      </Box>

      {message && (
        <Alert
          severity={messageType === "success" ? "success" : "error"}
          sx={{ mb: 3 }}
          onClose={() => setMessage("")}
        >
          {message}
        </Alert>
      )}

      <List>
        {providers.map((provider) => {
          const isLinked = linkedAccounts[provider.id];
          const isPrimary = linkedAccounts.primary === provider.id;

          return (
            <React.Fragment key={provider.id}>
              <ListItem>
                <ListItemIcon sx={{ color: provider.color }}>
                  {provider.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {provider.name}
                      {isPrimary && (
                        <Chip
                          label="Primary"
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    isLinked
                      ? "Connected - You can sign in with this account"
                      : "Not connected"
                  }
                />
                <ListItemSecondaryAction>
                  {isLinked ? (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<LinkOff />}
                      onClick={() => openConfirmDialog(provider.id, "unlink")}
                      disabled={actionLoading || getLinkedCount() <= 1}
                    >
                      Unlink
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      startIcon={<LinkIcon />}
                      onClick={() => handleLinkAccount(provider.id)}
                      disabled={actionLoading}
                    >
                      Link
                    </Button>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
            </React.Fragment>
          );
        })}
      </List>

      {getLinkedCount() <= 1 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Warning />
            You must have at least one authentication method. Link another
            account before unlinking your current one.
          </Box>
        </Alert>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={closeConfirmDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Account Unlinking</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to unlink your {confirmDialog.provider}{" "}
            account? You won't be able to sign in using {confirmDialog.provider}{" "}
            until you link it again.
          </Typography>
          {getLinkedCount() <= 1 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              This action is not allowed because you must have at least one
              authentication method.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog}>Cancel</Button>
          <Button
            onClick={() => handleUnlinkAccount(confirmDialog.provider)}
            color="error"
            variant="contained"
            disabled={actionLoading || getLinkedCount() <= 1}
          >
            {actionLoading ? <CircularProgress size={20} /> : "Unlink"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default LinkedAccounts;
