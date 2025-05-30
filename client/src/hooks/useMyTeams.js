import { useState, useEffect } from "react";
import axios from "axios";

/**
 * Hook to fetch teams belonging to the current user.
 * Expects backend endpoint: GET /teams?mine=true
 */
const useMyTeams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await axios.get("/api/teams", {
          params: { mine: true },
        });
        setTeams(data);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  return { teams, loading, error };
};

export default useMyTeams;
