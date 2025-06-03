// @ts-nocheck
import React, { createContext, useContext, useState, useEffect } from "react";
import api, { API_BASE } from "../utils/axios-config.js";

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

      try {
        // ✅ FIXED: Use configured axios instance
        const { data: profileData } = await api.get("/api/auth/profile");
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
      // ✅ FIXED: Use configured axios instance
      const res = await api.post("/api/auth/login", { email, password });
      const { token } = res.data;
      localStorage.setItem("token", token);

      const { data: profileData } = await api.get("/api/auth/profile");
      setUser({ ...profileData, token });
      return true;
    } catch (err) {
      console.error("Login failed:", err.response?.data || err.message);
      return false;
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  // Update username
  const updateUsername = async (newUsername, currentPassword) => {
    // ✅ FIXED: Use configured axios instance
    const res = await api.patch(`/api/users/${user.id}/username`, {
      username: newUsername,
      currentPassword,
    });
    setUser((prev) => ({ ...prev, username: res.data.username }));
  };

  // Update email
  const updateEmail = async (newEmail, currentPassword) => {
    // ✅ FIXED: Use configured axios instance
    const res = await api.patch(`/api/users/${user.id}/email`, {
      email: newEmail,
      currentPassword,
    });
    setUser((prev) => ({ ...prev, email: res.data.email }));
  };

  // Update password
  const updatePassword = async (oldPassword, newPassword) => {
    // ✅ FIXED: Use configured axios instance
    await api.patch(`/api/users/${user.id}/password`, {
      oldPassword,
      newPassword,
    });
  };

  // Update avatar via auth route, then re-fetch profile
  const updateAvatar = async (file) => {
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      // ✅ FIXED: Use configured axios instance
      await api.put("/api/auth/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { data: profileData } = await api.get("/api/auth/profile");
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
