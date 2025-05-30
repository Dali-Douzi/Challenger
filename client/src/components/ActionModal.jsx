import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";

/**
 * Generic modal for any action requiring a single text input
 *
 * Props:
 * - open: boolean
 * - title: string
 * - label: string
 * - placeholder: string
 * - onClose: () => void
 * - onConfirm: (value: string) => void
 */
const ActionModal = ({
  open,
  title,
  label,
  placeholder,
  onClose,
  onConfirm,
}) => {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) {
      setValue("");
    }
  }, [open]);

  const handleConfirm = () => {
    onConfirm(value.trim());
    setValue("");
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label={label}
          placeholder={placeholder}
          fullWidth
          variant="standard"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} disabled={!value.trim()}>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ActionModal;
