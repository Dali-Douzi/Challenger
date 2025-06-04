import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Avatar,
  Stack,
  IconButton,
} from "@mui/material";

const API_BASE = "http://localhost:4444";

// Helper to get team name initials
const getTeamInitials = (teamName) => {
  if (typeof teamName !== "string" || !teamName.trim()) return "";
  return teamName
    .trim()
    .split(/\s+/)
    .map((word) => word[0].toUpperCase())
    .slice(0, 2)
    .join("");
};

const ScrimDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";

  const parseJwt = (t) => {
    try {
      return JSON.parse(atob(t.split(".")[1]));
    } catch {
      return {};
    }
  };
  // eslint-disable-next-line no-unused-vars
  const { id: userId } = parseJwt(token);

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedRequestTeam, setSelectedRequestTeam] = useState("");
  const [games, setGames] = useState([]);
  const [formats, setFormats] = useState([]);
  const [format, setFormat] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [scrims, setScrims] = useState([]);
  const [requested, setRequested] = useState([]);
  const [selectedGameFilter, setSelectedGameFilter] = useState("");
  const [serverOptions, setServerOptions] = useState([]);
  const [rankOptions, setRankOptions] = useState([]);
  const [selectedServerFilter, setSelectedServerFilter] = useState("");
  const [selectedRankFilter, setSelectedRankFilter] = useState("");
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
        console.log("GAMES →", data);
        setGames(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading((l) => ({ ...l, games: false }));
      }
    })();
  }, []);

  // Initialize filters from first game
  useEffect(() => {
    if (!loading.games && games.length) {
      const first = games[0];
      setSelectedGameFilter(first.name);
      setRankOptions(first.ranks || []);
      setServerOptions(first.servers || []);
    }
  }, [loading.games, games]);

  // 3) Auto-populate when team changes
  useEffect(() => {
    if (!selectedTeam || !teams.length || !games.length) return;
    const team = teams.find((t) => t._id === selectedTeam);
    if (!team) return;

    const gameObj = games.find(
      (g) => g._id === team.game || g.name === team.game
    );
    if (!gameObj) return;

    // Set filters from team
    setSelectedGameFilter(gameObj.name);
    setServerOptions(gameObj.servers || []);
    setRankOptions(gameObj.ranks || []);
    setSelectedServerFilter(team.server);
    setSelectedRankFilter(team.rank);

    // Set formats
    const fmts = gameObj.formats || [];
    setFormats(fmts);
    if (fmts.length) setFormat(fmts[0]);
  }, [selectedTeam, teams, games]);

  // Fetch scrims
  const fetchScrims = async () => {
    setLoading((l) => ({ ...l, scrims: true }));
    try {
      const params = new URLSearchParams();
      if (selectedGameFilter) params.append("game", selectedGameFilter);
      if (selectedServerFilter) params.append("server", selectedServerFilter);
      if (selectedRankFilter) params.append("rank", selectedRankFilter);
      const res = await fetch(`/api/scrims?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setScrims(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading((l) => ({ ...l, scrims: false }));
    }
  };

  // Re-fetch whenever filters change
  useEffect(() => {
    fetchScrims();
  }, [token, selectedGameFilter, selectedServerFilter, selectedRankFilter]);

  // Persist "Request Sent"
  useEffect(() => {
    if (!selectedTeam) return;
    const persisted = scrims
      .filter((s) =>
        s.requests?.some((r) =>
          typeof r === "string" ? r === selectedTeam : r._id === selectedTeam
        )
      )
      .map((s) => s._id);
    setRequested(persisted);
  }, [scrims, selectedTeam]);

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

  // Send a request to join a scrim
  const handleSendRequest = async (scrimId) => {
    if (!selectedRequestTeam || requested.includes(scrimId)) return;
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
          body: JSON.stringify({ teamId: selectedRequestTeam }),
        }
      );
      if (!res.ok) {
        const errData = await res.json();
        if (errData.message === "Scrim request already sent") return;
        throw new Error(errData.message || "Failed to send request");
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
      setRequested((prev) => prev.filter((id) => id !== scrimId));
    }
  };

  // Edit scrim handler
  const handleEditScrim = (scrimId) => {
    localStorage.setItem("editingScrimId", scrimId);
    window.location.href = "/scrims/edit";
  };

  // Game filter change
  const handleGameChange = (gameName) => {
    setSelectedGameFilter(gameName);
    const game = games.find((g) => g.name === gameName) || {};
    setServerOptions(game.servers || []);
    setRankOptions(game.ranks || []);
    setSelectedServerFilter("");
    setSelectedRankFilter("");
  };

  // Helper to render team with logo
  const renderTeamWithLogo = (team) => {
    if (!team) return "Unknown";

    const teamLogo = team.logo
      ? `http://localhost:4444/${team.logo}?t=${Date.now()}`
      : null;

    const teamInitials = getTeamInitials(team.name);

    const handleTeamClick = () => {
      navigate(`/teams/${team._id}`);
    };

    return (
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton
          onClick={handleTeamClick}
          sx={{
            p: 0,
            "&:hover": {
              transform: "scale(1.05)",
              transition: "transform 0.2s ease-in-out",
            },
          }}
        >
          <Avatar
            src={teamLogo}
            sx={{
              width: 32,
              height: 32,
              fontSize: "0.75rem",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {!teamLogo && teamInitials}
          </Avatar>
        </IconButton>
        <Typography
          variant="body2"
          component="span"
          onClick={handleTeamClick}
          sx={{
            cursor: "pointer",
            "&:hover": {
              textDecoration: "underline",
            },
          }}
        >
          {team.name}
        </Typography>
      </Stack>
    );
  };

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
              variant="contained"
              type="submit"
              disabled={loading.posting}
            >
              {loading.posting ? "Posting..." : "Post Scrim"}
            </Button>
          </Box>
        </Paper>

        {/* Filters */}
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel id="game-filter-label">Game</InputLabel>
            <Select
              labelId="game-filter-label"
              value={selectedGameFilter}
              onChange={(e) => handleGameChange(e.target.value)}
              label="Game"
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {games.map((g) => (
                <MenuItem key={g._id} value={g.name}>
                  {g.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel id="server-filter-label">Server</InputLabel>
            <Select
              labelId="server-filter-label"
              value={selectedServerFilter}
              onChange={(e) => setSelectedServerFilter(e.target.value)}
              label="Server"
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {serverOptions.map((srv) => (
                <MenuItem key={srv} value={srv}>
                  {srv}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel id="rank-filter-label">Rank</InputLabel>
            <Select
              labelId="rank-filter-label"
              value={selectedRankFilter}
              onChange={(e) => setSelectedRankFilter(e.target.value)}
              label="Rank"
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {rankOptions.map((rk) => (
                <MenuItem key={rk} value={rk}>
                  {rk}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* All Scrims */}
        <Typography variant="h6" gutterBottom>
          All Scrims
        </Typography>

        {/* Requesting team selector */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="requesting-team-label">Requesting As</InputLabel>
          <Select
            labelId="requesting-team-label"
            value={selectedRequestTeam}
            label="Requesting As"
            onChange={(e) => setSelectedRequestTeam(e.target.value)}
          >
            <MenuItem value="">
              <em>Choose a team</em>
            </MenuItem>
            {teams.map((t) => (
              <MenuItem key={t._id} value={t._id}>
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {!Array.isArray(scrims) || scrims.length === 0 ? (
          <Typography>No scrims found.</Typography>
        ) : (
          <List>
            {scrims.map((s) => {
              const isOwnTeam = s.teamA?._id === selectedTeam;
              const hasRequested = requested.includes(s._id);

              let btnText = "";
              let btnDisabled = false;
              let btnAction = null;

              if (s.status === "booked") {
                btnText = "Booked";
                btnDisabled = true;
              } else if (isOwnTeam) {
                btnText = "Edit";
                btnAction = () => handleEditScrim(s._id);
              } else if (hasRequested) {
                btnText = "Request Sent";
                btnDisabled = true;
              } else {
                btnText = "Send Request";
                btnDisabled = !selectedRequestTeam;
                btnAction = () => handleSendRequest(s._id);
              }

              return (
                <ListItem
                  key={s._id}
                  divider
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    {/* Team logos and names */}
                    <Box sx={{ mb: 1 }}>
                      {s.teamB ? (
                        <Stack direction="row" alignItems="center" spacing={2}>
                          {renderTeamWithLogo(s.teamA)}
                          <Typography variant="body2" sx={{ mx: 1 }}>
                            vs
                          </Typography>
                          {renderTeamWithLogo(s.teamB)}
                        </Stack>
                      ) : (
                        renderTeamWithLogo(s.teamA)
                      )}
                    </Box>

                    {/* Scrim details */}
                    <Typography variant="body2" color="text.secondary">
                      Format: {s.format} | Time:{" "}
                      {new Date(s.scheduledTime).toLocaleString()} | Status:{" "}
                      {s.status}
                    </Typography>
                  </Box>

                  <Button
                    variant="outlined"
                    onClick={btnAction}
                    disabled={btnDisabled}
                    sx={{ ml: 2 }}
                  >
                    {btnText}
                  </Button>
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
