import { useState, useEffect } from "react";
import axios from "axios";

/**
 * Hook to fetch and paginate the list of tournaments.
 * @returns {{
 *   tournaments: Array,
 *   loading: boolean,
 *   error: string
 * }}
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
        // Add auth header manually for now
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const { data } = await axios.get("/api/tournaments", { headers });
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
