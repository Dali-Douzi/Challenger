import React, { createContext, useContext, useReducer, useEffect } from "react";

const AuthContext = createContext(null);

const authReducer = (state, action) => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_USER":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
      };
    case "SET_AUTH_DATA":
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
      };
    case "LOGOUT":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
      };
    case "UPDATE_USER":
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
};

// Initial state
const initialState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Check if user is authenticated on app start
    checkAuthStatus();
  }, []);

  // Utility functions
  const handleApiResponse = async (response) => {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  };

  // Make authenticated API calls with credentials (cookies)
  const makeAuthenticatedRequest = async (url, options = {}) => {
    try {
      const response = await fetch(url, {
        ...options,
        credentials: "include", // Include cookies
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      // Handle token refresh automatically
      if (response.status === 401) {
        const errorData = await response.json();

        // If it's a token expiry issue, try to refresh
        if (errorData.code === "TOKEN_EXPIRED") {
          const refreshResult = await refreshToken();
          if (refreshResult.success) {
            // Retry the original request
            return fetch(url, {
              ...options,
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                ...options.headers,
              },
            });
          }
        }

        // If refresh fails or other auth issues, logout
        logout();
        throw new Error("Authentication failed");
      }

      return response;
    } catch (error) {
      console.error("Authenticated request error:", error);
      throw error;
    }
  };

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          dispatch({
            type: "SET_AUTH_DATA",
            payload: { user: data.user },
          });
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Refresh access token
  const refreshToken = async () => {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      const data = await handleApiResponse(response);

      if (data.success) {
        dispatch({
          type: "SET_AUTH_DATA",
          payload: { user: data.user },
        });
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      console.error("Token refresh error:", error);
      return { success: false };
    }
  };

  // Login function
  const login = async (identifier, password, rememberMe = false) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, password, rememberMe }),
      });

      const data = await handleApiResponse(response);

      if (data.success) {
        dispatch({
          type: "SET_AUTH_DATA",
          payload: { user: data.user },
        });
      }

      return data;
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: error.message || "Network error. Please try again.",
      };
    }
  };

  // Signup function
  const signup = async (formData) => {
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        body: formData, // FormData for file upload
      });

      const data = await handleApiResponse(response);

      if (data.success) {
        dispatch({
          type: "SET_AUTH_DATA",
          payload: { user: data.user },
        });
      }

      return data;
    } catch (error) {
      console.error("Signup error:", error);
      return {
        success: false,
        message: error.message || "Network error. Please try again.",
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      dispatch({ type: "LOGOUT" });
    }
  };

  const updateUser = (updatedUser) => {
    dispatch({ type: "UPDATE_USER", payload: updatedUser });
  };

  const updateUsername = async (newUsername, currentPassword) => {
    try {
      const response = await makeAuthenticatedRequest(
        "/api/auth/change-username",
        {
          method: "PUT",
          body: JSON.stringify({ newUsername, currentPassword }),
        }
      );

      const data = await handleApiResponse(response);

      if (data.success) {
        updateUser(data.user);
      }

      return data;
    } catch (error) {
      console.error("Username update error:", error);
      return {
        success: false,
        message: error.message || "Network error. Please try again.",
      };
    }
  };

  const updateEmail = async (newEmail, currentPassword) => {
    try {
      const response = await makeAuthenticatedRequest(
        "/api/auth/change-email",
        {
          method: "PUT",
          body: JSON.stringify({ newEmail, currentPassword }),
        }
      );

      const data = await handleApiResponse(response);

      if (data.success) {
        updateUser(data.user);
      }

      return data;
    } catch (error) {
      console.error("Email update error:", error);
      return {
        success: false,
        message: error.message || "Network error. Please try again.",
      };
    }
  };

  const updatePassword = async (currentPassword, newPassword) => {
    try {
      const response = await makeAuthenticatedRequest(
        "/api/auth/change-password",
        {
          method: "PUT",
          body: JSON.stringify({ currentPassword, newPassword }),
        }
      );

      const data = await handleApiResponse(response);
      return data;
    } catch (error) {
      console.error("Password update error:", error);
      return {
        success: false,
        message: error.message || "Network error. Please try again.",
      };
    }
  };

  const updateAvatar = async (avatarFile) => {
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);

      // Use fetch directly instead of makeAuthenticatedRequest for FormData
      const response = await fetch("/api/auth/change-avatar", {
        method: "PUT",
        credentials: "include", // Include cookies for authentication
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary
      });

      const data = await handleApiResponse(response);

      if (data.success) {
        updateUser(data.user);
      }

      return data;
    } catch (error) {
      console.error("Avatar update error:", error);
      return {
        success: false,
        message: error.message || "Network error. Please try again.",
      };
    }
  };

  const deleteAvatar = async () => {
    try {
      const response = await makeAuthenticatedRequest(
        "/api/auth/delete-avatar",
        {
          method: "DELETE",
        }
      );

      const data = await handleApiResponse(response);

      if (data.success) {
        updateUser(data.user);
      }

      return data;
    } catch (error) {
      console.error("Avatar delete error:", error);
      return {
        success: false,
        message: error.message || "Network error. Please try again.",
      };
    }
  };

  // Check if user has specific permissions (extend as needed)
  const hasPermission = (permission) => {
    // Basic implementation - extend based on your user model
    return state.isAuthenticated && state.user;
  };

  const value = {
    // State
    user: state.user,
    loading: state.isLoading, // Added alias for compatibility
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,

    // Actions
    login,
    signup,
    logout,
    updateUser,
    updateUsername,
    updateEmail,
    updatePassword,
    updateAvatar,
    deleteAvatar,
    refreshToken,
    checkAuthStatus,

    // Utilities
    makeAuthenticatedRequest,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
