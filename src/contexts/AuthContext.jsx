import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../firebase/config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { createOrUpdateUser, getUser } from "../services/firestore";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          // Create or update user in Firestore
          await createOrUpdateUser(user);

          // Get full user profile from database
          const profile = await getUser(user.uid);
          setUserProfile(profile);

          // Check if user is admin from database role
          const isUserAdmin = profile?.role === "admin";
          setIsAdmin(isUserAdmin);

          // Store admin status in localStorage for quick access
          if (isUserAdmin) {
            localStorage.setItem("isAdmin", "true");
          } else {
            localStorage.removeItem("isAdmin");
          }
        } catch (error) {
          console.error("Error syncing user profile:", error);
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
        localStorage.removeItem("isAdmin");
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      setIsAdmin(false);
      localStorage.removeItem("isAdmin");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      const profile = await getUser(currentUser.uid);
      setUserProfile(profile);

      // Update admin status from refreshed profile
      const isUserAdmin = profile?.role === "admin";
      setIsAdmin(isUserAdmin);

      if (isUserAdmin) {
        localStorage.setItem("isAdmin", "true");
      } else {
        localStorage.removeItem("isAdmin");
      }
    }
  };

  const value = {
    currentUser,
    user: currentUser, // Alias for compatibility with new pages
    userProfile, // Full Firestore profile with stats, badges, etc.
    isAdmin,
    loading,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
