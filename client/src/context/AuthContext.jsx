// @ts-nocheck
import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext(null);

// Simple JWT payload decoder (no external lib)
function decodeJWT(token) {
  try {
    // Grab the middle "payload" slice
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    // Decode base64 to JSON string
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join("")
    );
    return JSON.parse(json);
  } catch (err) {
    console.error("Failed to decode JWT:", err);
    return {};
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: read token, set header, decode payload
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      const decoded = decodeJWT(token);
      if (decoded && decoded.id) {
        setUser({
          id: decoded.id || decoded._id || decoded.userId,
          username: decoded.username,
          avatar: decoded.avatar,
          token,
        });
      } else {
        // invalid token
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  }, []);

  // Call to log in
  const login = async (email, password) => {
    try {
      const res = await axios.post("/api/auth/login", { email, password });
      const { token } = res.data;
      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      const decoded = decodeJWT(token);
      setUser({
        id: decoded.id || decoded._id || decoded.userId,
        username: decoded.username,
        avatar: decoded.avatar,
        token,
      });
      return true;
    } catch (err) {
      console.error("Login failed:", err.response?.data || err.message);
      return false;
    }
  };

  // Call to log out
  const logout = () => {
    delete axios.defaults.headers.common["Authorization"];
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
