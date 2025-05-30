import { useState, useEffect } from "react";
import axios from "axios";

/**
 * Hook to fetch and paginate the list of tournaments.
 * Expects a backend GET /tournaments endpoint returning an array sorted newest-first.
 */
const useTournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await axios.get("/api/tournaments");
        setTournaments(data);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  return { tournaments, loading, error };
};

export default useTournaments;
