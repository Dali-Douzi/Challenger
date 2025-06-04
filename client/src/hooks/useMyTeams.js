import { useState, useEffect } from "react";
import api from "../utils/api"; // ✅ Use authenticated API instance

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
        const { data } = await api.get("/teams", {
          // ✅ Using api instead of axios
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
