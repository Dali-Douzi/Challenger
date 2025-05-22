import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Paper,
} from "@mui/material";

const EditScrim = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const scrimId = localStorage.getItem("editingScrimId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formats, setFormats] = useState([]);
  const [format, setFormat] = useState("");

  const [date, setDate] = useState(""); // e.g. "2025-05-20"
  const [time, setTime] = useState(""); // e.g. "18:00"

  const [dateOptions, setDateOptions] = useState([]);
  const [timeOptions, setTimeOptions] = useState([]);

  // helpers to generate dropdown options
  const getDayOptions = () => {
    const opts = ["Today", "Tomorrow"];
    const today = new Date();
    for (let i = 2; i <= 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      opts.push(d.toISOString().slice(0, 10));
    }
    return opts;
  };

  const getTimeOptions = () => {
    const times = [];
    for (let h = 0; h < 24; h++) {
      const hh = h.toString().padStart(2, "0");
      ["00", "30"].forEach((mm) => times.push(`${hh}:${mm}`));
    }
    return times;
  };

  useEffect(() => {
    if (!scrimId) {
      navigate("/scrims");
      return;
    }
    (async () => {
      try {
        // 1. Load scrim
        const res = await fetch(`http://localhost:4444/api/scrims/${scrimId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load scrim");
        const scrim = await res.json();

        // parse date & time from scheduledTime
        const dt = new Date(scrim.scheduledTime);
        const isoDate = dt.toISOString().slice(0, 10);
        const isoTime = dt.toTimeString().slice(0, 5);

        setDate(isoDate);
        setTime(isoTime);

        // build dropdown options including current values
        const days = getDayOptions();
        if (!days.includes(isoDate)) days.unshift(isoDate);
        setDateOptions(days);

        const times = getTimeOptions();
        if (!times.includes(isoTime)) times.unshift(isoTime);
        setTimeOptions(times);

        // 2. Load team to get its game
        const teamRes = await fetch(
          `http://localhost:4444/api/teams/${scrim.teamA._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!teamRes.ok) throw new Error("Failed to load team");
        const team = await teamRes.json();

        // 3. Load all games to derive formats
        const gamesRes = await fetch("http://localhost:4444/api/games");
        if (!gamesRes.ok) throw new Error("Failed to load games");
        const games = await gamesRes.json();

        const gameDoc = games.find(
          (g) => g._id === team.game || g.name === team.game
        );
        const fetchedFormats = gameDoc?.formats || [];

        // include current format in options
        const uniqueFormats = fetchedFormats.includes(scrim.format)
          ? fetchedFormats
          : [scrim.format, ...fetchedFormats];
        setFormats(uniqueFormats);
        setFormat(scrim.format);
      } catch (err) {
        console.error(err);
        alert(err.message);
        navigate("/scrims");
      } finally {
        setLoading(false);
      }
    })();
  }, [scrimId, token, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // translate "Today"/"Tomorrow"/"YYYY-MM-DD" into ISO
      let dt = new Date();
      if (date === "Tomorrow") dt.setDate(dt.getDate() + 1);
      else if (date !== "Today") dt = new Date(date);

      const [h, m] = time.split(":").map(Number);
      dt.setHours(h, m, 0, 0);

      const res = await fetch(`http://localhost:4444/api/scrims/${scrimId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          format,
          scheduledTime: dt.toISOString(),
        }),
      });
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.message || "Save failed");
      }
      navigate("/scrims");
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ maxWidth: 600, mx: "auto", p: 4 }}>
      <Typography variant="h5" gutterBottom>
        Edit Scrim
      </Typography>

      {/* Format dropdown */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="format-label">Format</InputLabel>
        <Select
          labelId="format-label"
          id="format-select"
          value={format}
          label="Format"
          onChange={(e) => setFormat(e.target.value)}
        >
          {formats.map((f) => (
            <MenuItem key={f} value={f}>
              {f}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Date dropdown */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="date-label">Date</InputLabel>
        <Select
          labelId="date-label"
          id="date-select"
          value={date}
          label="Date"
          onChange={(e) => setDate(e.target.value)}
        >
          {dateOptions.map((d) => (
            <MenuItem key={d} value={d}>
              {d}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Time dropdown */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="time-label">Time</InputLabel>
        <Select
          labelId="time-label"
          id="time-select"
          value={time}
          label="Time"
          onChange={(e) => setTime(e.target.value)}
        >
          {timeOptions.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button variant="contained" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save Changes"}
      </Button>
    </Paper>
  );
};

export default EditScrim;
