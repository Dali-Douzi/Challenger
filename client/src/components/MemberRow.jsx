import React, { useContext, useState } from "react";
import {
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  CircularProgress,
  Box,
} from "@mui/material";
import AuthContext from "../context/AuthContext";
import RoleDropdown from "./RoleDropdown";
import RankDropdown from "./RankDropdown";

const MemberRow = ({
  member,
  teamId,
  currentUserRole,
  availableRanks,
  onMemberChange,
}) => {
  const { user, makeAuthenticatedRequest } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const handleRankChange = async (newRank) => {
    setLoading(true);
    try {
      const res = await makeAuthenticatedRequest(
        `http://localhost:4444/api/teams/${teamId}/members/${member._id}/rank`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rank: newRank }),
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update rank");
      }
      onMemberChange();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (newRole) => {
    setLoading(true);
    try {
      const res = await makeAuthenticatedRequest(
        `http://localhost:4444/api/teams/${teamId}/members/${member._id}/role`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: newRole }),
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update role");
      }
      onMemberChange();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKick = async () => {
    if (
      !window.confirm(
        `Are you sure you want to remove ${member.user.username} from the team?`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await makeAuthenticatedRequest(
        `http://localhost:4444/api/teams/${teamId}/members/${member._id}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to remove member");
      }
      onMemberChange();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Are you sure you want to leave this team?")) {
      return;
    }

    setLoading(true);
    try {
      const res = await makeAuthenticatedRequest(
        `http://localhost:4444/api/teams/${teamId}/members/self`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to leave team");
      }
      onMemberChange();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Build the full avatar URL; member.user.avatar is stored as "/uploads/avatars/<filename>"
  const avatarUrl = member.user.avatar
    ? `http://localhost:4444${member.user.avatar}`
    : "";

  return (
    <ListItem divider sx={{ display: "flex", alignItems: "center" }}>
      <ListItemAvatar>
        <Avatar src={avatarUrl} alt={member.user.username}>
          {member.user.username[0].toUpperCase()}
        </Avatar>
      </ListItemAvatar>

      <ListItemText primary={member.user.username} />

      {loading ? (
        <CircularProgress size={20} sx={{ ml: "auto" }} />
      ) : (
        <Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
          <RankDropdown
            memberRank={member.rank}
            rankOptions={availableRanks}
            currentUserRole={currentUserRole}
            onRankChange={handleRankChange}
          />
          <RoleDropdown
            memberId={member.user._id}
            memberRole={member.role}
            currentUserRole={currentUserRole}
            currentUserId={user?.id || user?._id}
            onRoleChange={handleRoleChange}
            onKick={handleKick}
            onLeave={handleLeave}
          />
        </Box>
      )}
    </ListItem>
  );
};

export default MemberRow;
