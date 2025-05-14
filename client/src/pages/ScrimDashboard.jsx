import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  Button,
  Box,
  Typography,
  Container,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
} from "@mui/material";
import React from "react";

const ScrimDashboard = () => {
  const { token } = useContext(AuthContext);
  const [showForm, setShowForm] = useState(false);
  const [format, setFormat] = useState("Best of 3");
  const [selectedDay, setSelectedDay] = useState(""); // For selected day (today, tomorrow, etc.)
  const [selectedTime, setSelectedTime] = useState(""); // For selected time
  /* eslint-disable-next-line no-unused-vars */
  const [scheduledTime, setScheduledTime] = useState(null); // The final combined time

  // Function to generate date options (today, tomorrow, and 5 days from now)
  const getDayOptions = () => {
    const options = [];
    const today = new Date();
    options.push("Today");
    for (let i = 1; i <= 5; i++) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + i);
      options.push(tomorrow.toLocaleDateString()); // Format as desired (e.g., MM/DD/YYYY)
    }
    return options;
  };

  // Function to generate time options (00:00, 00:30, ..., 23:30)
  const getTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
      for (let minute = 0; minute < 2; minute++) {
        const minuteStr = minute === 0 ? "00" : "30";
        times.push(`${hourStr}:${minuteStr}`);
      }
    }
    return times;
  };

  const handlePostScrim = async (event) => {
    event.preventDefault();
    if (!selectedDay || !selectedTime) {
      return alert("Please select both day and time.");
    }

    try {
      // Combine the selected day and time into one Date object
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const date = new Date();
      if (selectedDay === "Today") {
        date.setHours(hours, minutes, 0, 0);
      } else if (selectedDay === "Tomorrow") {
        date.setDate(date.getDate() + 1);
        date.setHours(hours, minutes, 0, 0);
      } else {
        const selectedDate = new Date(selectedDay);
        date.setFullYear(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate()
        );
        date.setHours(hours, minutes, 0, 0);
      }

      setScheduledTime(date); // Set the final scheduled time

      console.log("Scheduled time:", date); // Debugging the scheduled time

      // Log the token for debugging
      console.log("Token:", token);

      // Ensure the token is correctly passed
      const res = await fetch("http://localhost:4444/api/scrims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Make sure token is passed
        },
        body: JSON.stringify({ format, scheduledTime: date }),
      });

      if (res.ok) {
        alert("Scrim posted!");
        setShowForm(false);
        setFormat("Best of 3");
        setSelectedDay("");
        setSelectedTime("");
        setScheduledTime(null);
      } else {
        const data = await res.json();
        alert(data.message || "Failed to post scrim");
      }
    } catch (err) {
      console.error("Error posting scrim:", err);
      alert("Server error");
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ padding: 4 }}>
        <Typography variant="h5" gutterBottom>
          Scrim Dashboard
        </Typography>

        {!showForm ? (
          <Button
            variant="contained"
            color="primary"
            onClick={() => setShowForm(true)}
          >
            Post Scrim
          </Button>
        ) : (
          <Box component="form" onSubmit={handlePostScrim} sx={{ mt: 4 }}>
            {/* Format Dropdown */}
            <FormControl fullWidth variant="filled" sx={{ mb: 2 }}>
              <InputLabel>Format</InputLabel>
              <Select
                value={format}
                onChange={(event) => setFormat(event.target.value)}
              >
                <MenuItem value="1 game">1 game</MenuItem>
                <MenuItem value="2 games">2 games</MenuItem>
                <MenuItem value="Best of 3">Best of 3</MenuItem>
                <MenuItem value="Best of 5">Best of 5</MenuItem>
                <MenuItem value="Best of 7">Best of 7</MenuItem>
                <MenuItem value="5 games">5 games</MenuItem>
                <MenuItem value="7 games">7 games</MenuItem>
              </Select>
            </FormControl>

            {/* Day Dropdown */}
            <FormControl fullWidth variant="filled" sx={{ mb: 2 }}>
              <InputLabel>Day</InputLabel>
              <Select
                value={selectedDay}
                onChange={(event) => setSelectedDay(event.target.value)}
              >
                {getDayOptions().map((day) => (
                  <MenuItem key={day} value={day}>
                    {" "}
                    {/* `day` as the key */}
                    {day}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Time Dropdown */}
            <FormControl fullWidth variant="filled" sx={{ mb: 2 }}>
              <InputLabel>Time</InputLabel>
              <Select
                value={selectedTime}
                onChange={(event) => setSelectedTime(event.target.value)}
              >
                {getTimeOptions().map((time) => (
                  <MenuItem key={time} value={time}>
                    {" "}
                    {/* `time` as the key */}
                    {time}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Button type="submit" variant="contained" color="primary">
                Submit
              </Button>
              <Button
                type="button"
                variant="outlined"
                color="secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default ScrimDashboard;
