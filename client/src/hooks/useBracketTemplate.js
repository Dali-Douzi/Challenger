import { useState, useEffect } from "react";
import axios from "axios";

/**
 * Hook to fetch an initial bracket skeleton for a given tournament phase.
 * Expects backend endpoint: GET /tournaments/:id/bracket-template/:phaseIndex
 *
 * @param {string} tournamentId - The ID of the tournament
 * @param {number} phaseIndex - Zero-based index of the phase
 * @returns {{ template: Array, loading: boolean, error: string }}
 */
const useBracketTemplate = (tournamentId, phaseIndex) => {
  const [template, setTemplate] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tournamentId || phaseIndex == null) return;

    const fetchTemplate = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await axios.get(
          `/api/tournaments/${tournamentId}/bracket-template/${phaseIndex}`
        );
        setTemplate(data);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [tournamentId, phaseIndex]);

  return { template, loading, error };
};

export default useBracketTemplate;
