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
  Card,
  CardContent,
  Chip,
  Grid,
  useTheme,
  alpha,
} from "@mui/material";
import { SportsEsports, AccessTime } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";

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
  const { token, makeAuthenticatedRequest } = useAuth();
  const theme = useTheme();

  const parseJwt = (t) => {
    try {
      return JSON.parse(atob(t.split(".")[1]));
    } catch {
      return {};
    }
  };
  // eslint-disable-next-line no-unused-vars
  const { userId } = parseJwt(token);

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
  const [error, setError] = useState(null);

  // Visual helper for time formatting - FIXED DATE ARITHMETIC
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0)
      return `Today, ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    if (diffDays === 1)
      return `Tomorrow, ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    if (diffDays > 1 && diffDays <= 7)
      return date.toLocaleDateString([], {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 1) Fetch user's teams
  useEffect(() => {
    (async () => {
      try {
        console.log("Fetching teams...");
        const res = await makeAuthenticatedRequest(
          "http://localhost:4444/api/teams/my"
        );
        console.log("Teams response:", res);
        if (res && res.ok) {
          const data = await res.json();
          console.log("Teams data:", data);
          const teamsArray = Array.isArray(data) ? data : [];
          setTeams(teamsArray);
          if (teamsArray.length > 0) setSelectedTeam(teamsArray[0]._id);
        } else {
          console.error("Failed to fetch teams, status:", res?.status);
          if (res) {
            const errorText = await res.text();
            console.error("Error response:", errorText);
          }
          setTeams([]);
        }
      } catch (err) {
        console.error("Error fetching teams:", err);
        setTeams([]);
      } finally {
        console.log("Setting teams loading to false");
        setLoading((l) => ({ ...l, teams: false }));
      }
    })();
  }, [makeAuthenticatedRequest]);

  // 2) Fetch all games
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:4444/api/teams/games");
        console.log("Games response status:", res.status);
        if (res.ok) {
          const data = await res.json();
          console.log("GAMES →", data);
          const gamesArray = Array.isArray(data) ? data : [];
          setGames(gamesArray);
        } else {
          console.error("Failed to fetch games, status:", res.status);
          const errorText = await res.text();
          console.error("Error response:", errorText);
          setGames([]);
        }
      } catch (err) {
        console.error("Error fetching games:", err);
        setGames([]);
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

  // 3) Auto-populate when team changes - FIXED LOGIC
  useEffect(() => {
    console.log(
      "Team/game effect - selectedTeam:",
      selectedTeam,
      "teams length:",
      teams.length,
      "games length:",
      games.length
    );
    if (!selectedTeam || !teams.length || !games.length) return;

    const team = teams.find((t) => t._id === selectedTeam);
    if (!team) {
      console.log("Team not found for selectedTeam:", selectedTeam);
      return;
    }

    console.log("Found team:", team);

    // Find the game object - team.game could be ObjectId or name
    let gameObj = null;

    // Try to find by ObjectId first
    if (team.game && team.game._id) {
      gameObj = games.find((g) => g._id === team.game._id);
    } else if (team.game) {
      // Try to find by ObjectId string or name
      gameObj = games.find((g) => g._id === team.game || g.name === team.game);
    }

    console.log("Found gameObj:", gameObj);

    if (!gameObj) {
      console.log("Game not found for team.game:", team.game);
      return;
    }

    // Set filters from team
    setSelectedGameFilter(gameObj.name);
    setServerOptions(gameObj.servers || []);
    setRankOptions(gameObj.ranks || []);
    setSelectedServerFilter(team.server || "");
    setSelectedRankFilter(team.rank || "");

    // Set formats - KEY FIX: Don't override existing format
    const fmts = gameObj.formats || [];
    console.log("Setting formats:", fmts);
    setFormats(fmts);
    if (fmts.length && !format) {
      console.log("Setting default format:", fmts[0]);
      setFormat(fmts[0]);
    }
  }, [selectedTeam, teams, games, format]); // Added format to dependencies

  // Fetch scrims
  const fetchScrims = async () => {
    console.log("fetchScrims called");
    setLoading((l) => ({ ...l, scrims: true }));
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedGameFilter) params.append("game", selectedGameFilter);
      if (selectedServerFilter) params.append("server", selectedServerFilter);
      if (selectedRankFilter) params.append("rank", selectedRankFilter);

      const url = `http://localhost:4444/api/scrims?${params.toString()}`;
      console.log("Fetching scrims from:", url);

      const res = await makeAuthenticatedRequest(url);
      console.log("Scrims response:", res);

      if (res && res.ok) {
        const responseData = await res.json();
        console.log("Scrims response data:", responseData);

        if (responseData.success && responseData.data) {
          console.log(
            "Using new format, data length:",
            responseData.data.length
          );
          setScrims(Array.isArray(responseData.data) ? responseData.data : []);
        } else if (Array.isArray(responseData)) {
          console.log("Using old format, length:", responseData.length);
          setScrims(responseData);
        } else {
          console.error("Unexpected scrims response format:", responseData);
          setScrims([]);
        }
      } else {
        console.error("Failed to fetch scrims, status:", res?.status);
        if (res) {
          const errorText = await res.text();
          console.error("Error response:", errorText);
        }
        setScrims([]);
        setError("Failed to load scrims");
      }
    } catch (err) {
      console.error("Error fetching scrims:", err);
      setScrims([]);
      setError("Error loading scrims");
    } finally {
      console.log("Setting scrims loading to false");
      setLoading((l) => ({ ...l, scrims: false }));
    }
  };

  useEffect(() => {
    console.log(
      "Effect triggered - token:",
      !!token,
      "games loaded:",
      !loading.games,
      "teams loaded:",
      !loading.teams
    );
    if (token && !loading.games && !loading.teams) {
      console.log("Calling fetchScrims");
      fetchScrims();
    }
  }, [
    token,
    selectedGameFilter,
    selectedServerFilter,
    selectedRankFilter,
    loading.games,
    loading.teams,
  ]);

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
      const res = await makeAuthenticatedRequest(
        "http://localhost:4444/api/scrims",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            teamId: selectedTeam,
            format,
            scheduledTime: dt.toISOString(),
          }),
        }
      );

      if (res && res.ok) {
        const responseData = await res.json();
        if (responseData.success) {
          setSelectedDay("");
          setSelectedTime("");
          await fetchScrims();
        } else {
          throw new Error(responseData.message || "Failed to post scrim");
        }
      } else {
        const err = await res.json();
        throw new Error(err.message || "Failed to post scrim");
      }
    } catch (err) {
      console.error("Error posting scrim:", err);
      alert(err.message);
    } finally {
      setLoading((l) => ({ ...l, posting: false }));
    }
  };

  const handleSendRequest = async (scrimId) => {
    if (!selectedRequestTeam || requested.includes(scrimId)) return;

    setRequested((prev) => [...prev, scrimId]);
    try {
      const res = await makeAuthenticatedRequest(
        `http://localhost:4444/api/scrims/request/${scrimId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ teamId: selectedRequestTeam }),
        }
      );

      if (res && res.ok) {
        const responseData = await res.json();
        if (!responseData.success) {
          throw new Error(responseData.message || "Failed to send request");
        }
      } else {
        const errData = await res.json();
        if (errData.message === "Scrim request already sent") return;
        throw new Error(errData.message || "Failed to send request");
      }
    } catch (err) {
      console.error("Error sending request:", err);
      alert(err.message);
      setRequested((prev) => prev.filter((id) => id !== scrimId));
    }
  };

  const handleEditScrim = (scrimId) => {
    sessionStorage.setItem("editingScrimId", scrimId);
    window.location.href = "/scrims/edit";
  };

  // Game filter change - FIXED TO UPDATE FORMATS
  const handleGameChange = (gameName) => {
    console.log("Game changed to:", gameName);
    setSelectedGameFilter(gameName);
    const game = games.find((g) => g.name === gameName) || {};
    console.log("Found game for filter:", game);
    setServerOptions(game.servers || []);
    setRankOptions(game.ranks || []);
    setSelectedServerFilter("");
    setSelectedRankFilter("");

    // Also update formats when game changes - KEY FIX
    const fmts = game.formats || [];
    console.log("Setting formats for game:", fmts);
    setFormats(fmts);
    if (fmts.length) {
      setFormat(fmts[0]);
      console.log("Set default format:", fmts[0]);
    } else {
      setFormat("");
    }
  };

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

  if (loading.teams || loading.games) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>
          Loading {loading.teams ? "teams" : ""} {loading.games ? "games" : ""}
          ...
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
          Teams: {loading.teams ? "Loading..." : "✓"}
          <br />
          Games: {loading.games ? "Loading..." : "✓"}
          <br />
          Scrims: {loading.scrims ? "Loading..." : "✓"}
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="error">
            {error}
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
            sx={{ mt: 2 }}
          >
            Retry
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ p: 4, color: "white" }}>
        {/* Enhanced Header */}
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <SportsEsports
              sx={{ fontSize: 40, color: theme.palette.primary.main }}
            />
            <Typography variant="h4" fontWeight="bold">
              Scrim Dashboard
            </Typography>
            <Chip
              label={`${scrims.length} Available`}
              color="primary"
              variant="outlined"
              size="small"
            />
          </Stack>
          <Typography variant="body1" color="text.secondary">
            Create and join competitive scrimmages with teams around the world
          </Typography>
        </Box>

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
              {Array.isArray(games) &&
                games.map((g) => (
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
              {Array.isArray(serverOptions) &&
                serverOptions.map((srv) => (
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
              {Array.isArray(rankOptions) &&
                rankOptions.map((rk) => (
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
            {Array.isArray(teams) &&
              teams.map((t) => (
                <MenuItem key={t._id} value={t._id}>
                  {t.name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        {!Array.isArray(scrims) || scrims.length === 0 ? (
          <Typography>No scrims found.</Typography>
        ) : (
          <Box>
            {Array.isArray(scrims) &&
              scrims.map((s) => {
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
                  <Paper
                    key={s._id}
                    sx={{
                      p: 2,
                      mb: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      {/* Team logos and names */}
                      <Box sx={{ mb: 1 }}>
                        {s.teamB ? (
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={2}
                          >
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
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        <Chip
                          label={s.format}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip label={s.status} size="small" />
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <AccessTime sx={{ fontSize: 16 }} />
                          <Typography variant="body2" color="text.secondary">
                            {formatTime(s.scheduledTime)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Button
                      variant="outlined"
                      onClick={btnAction}
                      disabled={btnDisabled}
                      sx={{ ml: 2 }}
                    >
                      {btnText}
                    </Button>
                  </Paper>
                );
              })}
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default ScrimDashboard;
