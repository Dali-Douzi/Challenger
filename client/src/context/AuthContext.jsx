import { createContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // ✅ define inside the component

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser({ token });
    }

    setLoading(false); // ✅ only set to false after checking token
  }, []);

  const login = async (email, password) => {
    console.log("🔐 Login function called:", email);
    try {
      const res = await axios.post("http://localhost:4444/api/auth/login", {
        email,
        password,
      });

      console.log("✅ Login response:", res.data);

      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
        setUser({
          token: res.data.token,
          username: res.data.username,
          email: res.data.email,
        });
        return true;
      } else {
        throw new Error("No token received");
      }
    } catch (error) {
      console.error("❌ Login failed:", error.response?.data || error.message);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
