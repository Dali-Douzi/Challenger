import React from "react";
import { Button, Menu, MenuItem, Typography } from "@mui/material";

const RoleDropdown = ({
  memberRole,
  memberId,
  currentUserRole,
  currentUserId,
  onRoleChange,
  onKick,
  onLeave,
}) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  // Build the allowed actions based on viewer role
  const actions = [];

  if (currentUserRole === "owner") {
    // Owner can assign any non-owner role
    ["manager", "player", "substitute"].forEach((role) => {
      if (role !== memberRole) {
        const label =
          role === "player"
            ? "Demote to Player"
            : `Assign ${role.charAt(0).toUpperCase() + role.slice(1)}`;
        actions.push({ label, action: () => onRoleChange(role) });
      }
    });
    // And always allow kick (unless it's themselves)
    if (memberId !== currentUserId) {
      actions.push({ label: "Kick from Team", action: onKick });
    }
  } else if (currentUserRole === "manager") {
    // Manager can only switch between player ↔ substitute
    ["player", "substitute"].forEach((role) => {
      if (role !== memberRole) {
        const label = role === "player" ? "Assign Player" : "Assign Substitute";
        actions.push({ label, action: () => onRoleChange(role) });
      }
    });
  } else if (memberId === currentUserId) {
    // Player can leave
    actions.push({ label: "Leave Team", action: onLeave });
  }

  // If no actions for this viewer, just show static text
  if (actions.length === 0) {
    return <Typography variant="body2">{memberRole}</Typography>;
  }

  return (
    <>
      <Button variant="outlined" size="small" onClick={handleClick}>
        {memberRole}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {actions.map((item, idx) => (
          <MenuItem
            key={idx}
            onClick={() => {
              item.action();
              handleClose();
            }}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default RoleDropdown;
