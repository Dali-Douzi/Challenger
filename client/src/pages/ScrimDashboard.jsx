import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
} from "@mui/material";

const ScrimDashboard = () => {
  const token = localStorage.getItem("token") || "";

  const parseJwt = (t) => {
    try {
      return JSON.parse(atob(t.split(".")[1]));
    } catch {
      return {};
    }
  };
  const { id: userId } = parseJwt(token);

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [games, setGames] = useState([]);
  const [formats, setFormats] = useState([]);
  const [format, setFormat] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [scrims, setScrims] = useState([]);
  const [requested, setRequested] = useState([]); // track which scrims we've requested
  const [loading, setLoading] = useState({
    teams: true,
    games: true,
    scrims: true,
    posting: false,
  });

  // 1) Fetch user's teams
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:4444/api/teams/my", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setTeams(data);
        if (data.length > 0) setSelectedTeam(data[0]._id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading((l) => ({ ...l, teams: false }));
      }
    })();
  }, [token]);

  // 2) Fetch all games (to derive formats)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:4444/api/games");
        const data = await res.json();
        setGames(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading((l) => ({ ...l, games: false }));
      }
    })();
  }, []);

  // 3) Update formats when team or games change
  useEffect(() => {
    if (!selectedTeam || !teams.length || !games.length) return;
    const team = teams.find((t) => t._id === selectedTeam);
    if (!team) return;
    const game = games.find((g) => g._id === team.game || g.name === team.game);
    const fmts = game?.formats || [];
    setFormats(fmts);
    if (fmts.length) setFormat(fmts[0]);
  }, [selectedTeam, teams, games]);

  // 4) Fetch all scrims
  const fetchScrims = async () => {
    try {
      const res = await fetch("http://localhost:4444/api/scrims", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setScrims(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading((l) => ({ ...l, scrims: false }));
    }
  };
  useEffect(() => {
    fetchScrims();
  }, [token]);

  // Helpers for day/time dropdowns
  const getDayOptions = () => {
    const opts = ["Today", "Tomorrow"];
    const today = new Date();
    for (let i = 2; i <= 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      opts.push(d.toISOString().split("T")[0]);
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

  // Post a new scrim
  const handlePostScrim = async (e) => {
    e.preventDefault();
    if (!selectedTeam || !selectedDay || !selectedTime || !format) {
      alert("Please fill in all fields.");
      return;
    }

    // build ISO string
    const [h, m] = selectedTime.split(":").map(Number);
    let dt = new Date();
    if (selectedDay === "Tomorrow") dt.setDate(dt.getDate() + 1);
    else if (selectedDay !== "Today") dt = new Date(selectedDay);
    dt.setHours(h, m, 0, 0);

    setLoading((l) => ({ ...l, posting: true }));
    try {
      const res = await fetch("http://localhost:4444/api/scrims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teamId: selectedTeam,
          format,
          scheduledTime: dt.toISOString(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to post scrim");
      }
      // reset form + reload
      setSelectedDay("");
      setSelectedTime("");
      await fetchScrims();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading((l) => ({ ...l, posting: false }));
    }
  };

  // Send a request to join a scrim (optimistic + error handling)
  const handleSendRequest = async (scrimId) => {
    // prevent double-click
    if (requested.includes(scrimId)) return;

    // optimistic update
    setRequested((prev) => [...prev, scrimId]);

    try {
      const res = await fetch(
        `http://localhost:4444/api/scrims/request/${scrimId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ teamId: selectedTeam }),
        }
      );
      if (!res.ok) {
        const errData = await res.json();
        // treat duplicate as success
        if (errData.message === "Scrim request already sent") {
          return;
        }
        console.error("💥 request-error payload:", errData);
        throw new Error(errData.message || "Failed to send request");
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
      // revert optimistic update on real error
      setRequested((prev) => prev.filter((id) => id !== scrimId));
    }
  };

  // Edit scrim flows you already had
  const handleEditScrim = (scrimId) => {
    localStorage.setItem("editingScrimId", scrimId);
    window.location.href = "/scrims/edit";
  };

  // loading screen
  if (loading.teams || loading.games || loading.scrims) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Scrim Dashboard
        </Typography>

        {/* Post New Scrim */}
        <Paper sx={{ p: 2, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Post New Scrim
          </Typography>
          <Box
            component="form"
            onSubmit={handlePostScrim}
            sx={{ display: "grid", gap: 2 }}
          >
            {/* Team */}
            <FormControl fullWidth>
              <InputLabel id="team-select-label">Team</InputLabel>
              <Select
                labelId="team-select-label"
                value={selectedTeam}
                label="Team"
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                {teams.map((t) => (
                  <MenuItem key={t._id} value={t._id}>
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Format */}
            <FormControl fullWidth>
              <InputLabel id="format-select-label">Format</InputLabel>
              <Select
                labelId="format-select-label"
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

            {/* Day */}
            <FormControl fullWidth>
              <InputLabel id="day-select-label">Day</InputLabel>
              <Select
                labelId="day-select-label"
                value={selectedDay}
                label="Day"
                onChange={(e) => setSelectedDay(e.target.value)}
              >
                {getDayOptions().map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Time */}
            <FormControl fullWidth>
              <InputLabel id="time-select-label">Time</InputLabel>
              <Select
                labelId="time-select-label"
                value={selectedTime}
                label="Time"
                onChange={(e) => setSelectedTime(e.target.value)}
              >
                {getTimeOptions().map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              type="submit"
              variant="contained"
              disabled={loading.posting}
            >
              {loading.posting ? "Posting..." : "Post Scrim"}
            </Button>
          </Box>
        </Paper>

        {/* All Scrims */}
        <Typography variant="h6" gutterBottom>
          All Scrims
        </Typography>
        {scrims.length === 0 ? (
          <Typography>No scrims found.</Typography>
        ) : (
          <List>
            {scrims.map((s) => {
              const isOwnTeam = s.teamA?._id === selectedTeam;
              const teamObj = teams.find((t) => t._id === s.teamA?._id);
              const member = teamObj?.members?.find(
                (m) => m.user._id === userId
              );
              const role = member?.role;
              const hasRequested = requested.includes(s._id);

              let btnText = "";
              let btnDisabled = false;
              let btnAction = null;

              if (s.status === "booked") {
                btnText = "Booked";
                btnDisabled = true;
              } else if (isOwnTeam) {
                if (role === "owner" || role === "manager") {
                  btnText = "Edit";
                  btnAction = () => handleEditScrim(s._id);
                } else {
                  btnText = "Posted";
                  btnDisabled = true;
                }
              } else if (hasRequested) {
                btnText = "Request Sent";
                btnDisabled = true;
              } else {
                btnText = "Send Request";
                btnAction = () => handleSendRequest(s._id);
              }

              return (
                <ListItem
                  key={s._id}
                  divider
                  secondaryAction={
                    <Button
                      variant="outlined"
                      onClick={btnAction}
                      disabled={!btnAction || btnDisabled}
                    >
                      {btnText}
                    </Button>
                  }
                >
                  <ListItemText
                    primary={`${s.teamA?.name || "Unknown"} vs ${
                      s.teamB?.name || "TBD"
                    }`}
                    secondary={`Format: ${s.format} | Time: ${new Date(
                      s.scheduledTime
                    ).toLocaleString()} | Status: ${s.status}`}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    </Container>
  );
};

export default ScrimDashboard;
