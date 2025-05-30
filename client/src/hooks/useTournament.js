import { useState, useEffect, useCallback } from "react";
import axios from "axios";

/**
 * Hook to fetch a single tournament and its matches by phase.
 */
const useTournament = (id) => {
  const [tournament, setTournament] = useState(null);
  const [matchesByPhase, setMatchesByPhase] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // 1) Fetch the tournament
      const { data: tourneyData } = await axios.get(`/api/tournaments/${id}`);
      setTournament(tourneyData);

      // 2) Fetch matches for each phase
      const matchPromises = tourneyData.phases.map((_, phaseIndex) =>
        axios.get("/api/matches", {
          params: { tournament: id, phase: phaseIndex },
        })
      );
      const responses = await Promise.all(matchPromises);
      // responses[i].data is the array of matches for phase i
      setMatchesByPhase(responses.map((res) => res.data));
    } catch (err) {
      // show either our API’s message or a generic axios/network error
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // allow manual refresh after e.g. a score update
  const refresh = () => fetchData();

  return { tournament, matchesByPhase, loading, error, refresh };
};

export default useTournament;
