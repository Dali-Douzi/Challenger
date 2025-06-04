import { useState, useEffect, useCallback } from "react";
import api from "../utils/api"; // ✅ Use authenticated API instance

const useTournament = (id) => {
  const [tournament, setTournament] = useState(null);
  const [matchesByPhase, setMatchesByPhase] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setError("No tournament ID provided.");
      setMatchesByPhase([]);
      setTournament(null);
      return;
    }

    setLoading(true);
    setError(null);
    setMatchesByPhase([]); // Reset on new fetch

    try {
      const { data: tourneyData } = await api.get(`/tournaments/${id}`); // ✅ Using api instead of axios

      if (
        !tourneyData ||
        !tourneyData.phases ||
        !Array.isArray(tourneyData.phases)
      ) {
        console.error(
          "useTournament.js - tourneyData.phases is missing or not an array!"
        );
        setError("Tournament data is missing phase information.");
        setTournament(tourneyData); // Still set tournament data if available
        setLoading(false);
        return;
      }
      setTournament(tourneyData);

      if (tourneyData.phases.length === 0) {
        console.log(
          "useTournament.js - Tournament has no phases. No matches to fetch."
        );
        setLoading(false);
        return;
      }

      const matchPromises = tourneyData.phases.map((phase, phaseIndex) => {
        const apiUrl = `/matches?tournament=${id}&phase=${phaseIndex}`; // ✅ Removed /api prefix
        console.log(`useTournament.js - Creating promise for: ${apiUrl}`);
        return api.get(apiUrl); // ✅ Using api instead of axios
      });

      const responses = await Promise.allSettled(matchPromises);

      const newMatchesByPhaseData = responses.map((response, index) => {
        if (response.status === "fulfilled") {
          // Ensure response.value.data is an array before mapping
          if (response.value && Array.isArray(response.value.data)) {
            // Transform slot to matchNumber
            return response.value.data.map((match) => {
              if (!match || typeof match.slot === "undefined") {
                console.warn(
                  `useTournament.js - Match object is invalid or missing slot for phase ${index}:`,
                  match
                );
                return { ...match, matchNumber: undefined }; // Handle problematic match data
              }
              return {
                ...match,
                matchNumber: match.slot,
              };
            });
          } else {
            console.warn(
              `useTournament.js - Fetched data for phase index ${index}, but response.value.data is not an array or missing:`,
              response.value
                ? response.value.data
                : "response.value is undefined"
            );
            return []; // Return empty array if data is not in expected array format
          }
        } else {
          console.error(
            `useTournament.js - Failed to fetch matches for phase index ${index}:`,
            response.reason
          );
          return []; // Return empty array for this phase if fetching failed
        }
      });

      setMatchesByPhase(newMatchesByPhaseData);
    } catch (err) {
      console.error("useTournament.js - Critical error in fetchData:", err);
      if (err.response) {
        console.error(
          "useTournament.js - Error response data:",
          err.response.data
        );
        console.error(
          "useTournament.js - Error response status:",
          err.response.status
        );
      }
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch tournament data"
      );
      setTournament(null); // Clear tournament data on critical error
    } finally {
      setLoading(false);
    }
  }, [id]); // Added id to useCallback dependency array

  useEffect(() => {
    fetchData();
  }, [fetchData]); // fetchData is now memoized by useCallback

  return { tournament, matchesByPhase, loading, error, refresh: fetchData }; // Added refresh
};

export default useTournament;
