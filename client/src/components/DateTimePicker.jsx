import React from 'react';
import { TextField, Box, Typography } from '@mui/material';
import { CalendarToday, AccessTime } from '@mui/icons-material';

/**
 * Enhanced DateTime Picker component
 * Supports both date-only and datetime inputs
 */
const DateTimePicker = ({ 
  label, 
  value, 
  onChange, 
  error, 
  helperText, 
  required = false,
  minDateTime = null,
  disabled = false,
  fullWidth = true,
  dateOnly = false // New prop to toggle between date and datetime
}) => {
  // Format value for input
  const getInputValue = () => {
    if (!value) return '';
    
    const date = new Date(value);
    if (dateOnly) {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    } else {
      // For datetime-local input: YYYY-MM-DDTHH:mm
      return date.toISOString().slice(0, 16);
    }
  };

  // Get minimum date/datetime
  const getMinValue = () => {
    if (minDateTime) {
      const date = new Date(minDateTime);
      if (dateOnly) {
        return date.toISOString().split('T')[0];
      } else {
        return date.toISOString().slice(0, 16);
      }
    }
    
    const now = new Date();
    if (dateOnly) {
      return now.toISOString().split('T')[0];
    } else {
      return now.toISOString().slice(0, 16);
    }
  };

  // Handle input change
  const handleChange = (newValue) => {
    if (dateOnly) {
      // For date-only, just pass the date string
      onChange(newValue);
    } else {
      // For datetime, ensure we have the full ISO string
      if (newValue) {
        onChange(newValue); // The input already gives us YYYY-MM-DDTHH:mm format
      } else {
        onChange('');
      }
    }
  };

  // Get relative date description
  const getRelativeDescription = () => {
    if (!value) return '';
    
    const selectedDate = new Date(value);
    const today = new Date();
    
    if (dateOnly) {
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      
      const diffTime = selectedDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays === -1) return 'Yesterday';
      if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
      if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
      
      return selectedDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric',
        year: selectedDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    } else {
      // For datetime, show more detailed info
      const diffTime = selectedDate.getTime() - today.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      let description = selectedDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: selectedDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
      
      description += ` at ${selectedDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
      
      if (diffDays === 0 && Math.abs(diffHours) < 24) {
        if (diffHours === 0) {
          const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
          if (Math.abs(diffMinutes) < 60) {
            description += diffMinutes > 0 ? ` (in ${diffMinutes}min)` : ` (${Math.abs(diffMinutes)}min ago)`;
          }
        } else {
          description += diffHours > 0 ? ` (in ${diffHours}h)` : ` (${Math.abs(diffHours)}h ago)`;
        }
      } else if (diffDays === 1) {
        description = description.replace(/\w+,/, 'Tomorrow,');
      } else if (diffDays === -1) {
        description = description.replace(/\w+,/, 'Yesterday,');
      }
      
      return description;
    }
  };

  const inputType = dateOnly ? 'date' : 'datetime-local';
  const icon = dateOnly ? <CalendarToday sx={{ mr: 1, color: 'action.active' }} /> : 
                          <AccessTime sx={{ mr: 1, color: 'action.active' }} />;

  return (
    <Box sx={{ width: fullWidth ? '100%' : 'auto' }}>
      <TextField
        label={label}
        type={inputType}
        value={getInputValue()}
        onChange={(e) => handleChange(e.target.value)}
        InputLabelProps={{ shrink: true }}
        fullWidth={fullWidth}
        required={required}
        error={error}
        disabled={disabled}
        inputProps={{
          min: getMinValue()
        }}
        InputProps={{
          startAdornment: icon
        }}
        sx={{
          '& .MuiInputBase-root': {
            borderRadius: 2,
          },
          // Ensure datetime-local input shows properly on all browsers
          '& input[type="datetime-local"]': {
            colorScheme: 'dark'
          }
        }}
      />

      {/* Show relative date/time description */}
      {value && !error && (
        <Typography 
          variant="caption" 
          sx={{ 
            mt: 0.5, 
            display: 'block',
            color: 'text.secondary',
            fontStyle: 'italic'
          }}
        >
          {getRelativeDescription()}
        </Typography>
      )}

      {/* Helper text or error */}
      {helperText && (
        <Typography 
          variant="caption" 
          sx={{ 
            mt: helperText && value ? 0.5 : 1, 
            display: 'block',
            color: error ? 'error.main' : 'text.secondary' 
          }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

export default DateTimePicker;