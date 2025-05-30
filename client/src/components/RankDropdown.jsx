import React from "react";
import { Button, Menu, MenuItem, Typography } from "@mui/material";

const RankDropdown = ({
  memberRank,
  rankOptions = [],
  currentUserRole,
  onRankChange,
}) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  // Only owners/managers can change ranks
  const actions = [];
  if (["owner", "manager"].includes(currentUserRole)) {
    rankOptions.forEach((r) => {
      if (r !== memberRank) {
        actions.push({ label: r, action: () => onRankChange(r) });
      }
    });
  }

  // If no allowed actions, just render plain text
  if (actions.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "white" }}>
        {memberRank}
      </Typography>
    );
  }

  return (
    <>
      <Button
        variant="outlined"
        color="warning" // Use theme.warning.main for yellow :contentReference[oaicite:0]{index=0}
        size="small"
        onClick={handleClick}
        sx={{
          textTransform: "none",
          "&:hover": {
            backgroundColor: "rgba(255,180,0,0.1)", // light tint of warning
          },
        }}
      >
        {memberRank || "Set Rank"}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            bgcolor: "primary.dark",
            "& .MuiMenuItem-root": {
              color: "white",
            },
            "& .MuiMenuItem-root:hover": {
              backgroundColor: "rgba(255,255,255,0.1)",
            },
          },
        }}
      >
        {actions.map((item, i) => (
          <MenuItem
            key={i}
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

export default RankDropdown;
