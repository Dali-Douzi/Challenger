// @ts-nocheck
import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext(null);

// Custom hook for accessing auth context
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize authentication on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      try {
        const { data: profileData } = await axios.get("/api/auth/profile");
        console.log("Profile data on init:", profileData);
        setUser({ ...profileData, token });
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  // Login
  const login = async (email, password) => {
    try {
      const res = await axios.post("/api/auth/login", { email, password });
      const { token } = res.data;
      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      const { data: profileData } = await axios.get("/api/auth/profile");
      setUser({ ...profileData, token });
      return true;
    } catch (err) {
      console.error("Login failed:", err.response?.data || err.message);
      return false;
    }
  };

  // Logout
  const logout = () => {
    delete axios.defaults.headers.common["Authorization"];
    localStorage.removeItem("token");
    setUser(null);
  };

  // Update username
  const updateUsername = async (newUsername, currentPassword) => {
    const res = await axios.patch(`/api/users/${user.id}/username`, {
      username: newUsername,
      currentPassword,
    });
    setUser((prev) => ({ ...prev, username: res.data.username }));
  };

  // Update email
  const updateEmail = async (newEmail, currentPassword) => {
    const res = await axios.patch(`/api/users/${user.id}/email`, {
      email: newEmail,
      currentPassword,
    });
    setUser((prev) => ({ ...prev, email: res.data.email }));
  };

  // Update password
  const updatePassword = async (oldPassword, newPassword) => {
    await axios.patch(`/api/users/${user.id}/password`, {
      oldPassword,
      newPassword,
    });
  };

  // Update avatar via auth route, then re-fetch profile
  const updateAvatar = async (file) => {
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      await axios.put("/api/auth/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { data: profileData } = await axios.get("/api/auth/profile");
      console.log("Profile data after avatar update:", profileData);
      setUser({ ...profileData, token: user.token });
    } catch (err) {
      console.error("Avatar update error:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUsername,
        updateEmail,
        updatePassword,
        updateAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
