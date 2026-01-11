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

  // Admin emails list - update with your admin emails
  const adminEmails = [
    "kavinvk26@gmail.com",
    "aishwaryaa5432@gmail.com",
    "admin@example.com",
    "superuser@gmail.com",
    "admin@gmail.com",
    "verifindadmin@gmail.com",
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          // Check if user is admin
          const isUserAdmin = adminEmails.includes(user.email);
          setIsAdmin(isUserAdmin);
          
          // Store admin status in localStorage for quick access
          if (isUserAdmin) {
            localStorage.setItem('isAdmin', 'true');
          } else {
            localStorage.removeItem('isAdmin');
          }

          // Create or update user in Firestore
          await createOrUpdateUser(user);
          // Get full user profile
          const profile = await getUser(user.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error("Error syncing user profile:", error);
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
        localStorage.removeItem('isAdmin');
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
      localStorage.removeItem('isAdmin');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      const profile = await getUser(currentUser.uid);
      setUserProfile(profile);
    }
  };

  // Helper function to check if current user is admin
  const checkIsAdmin = (email) => {
    return adminEmails.includes(email);
  };

  const value = {
    currentUser,
    user: currentUser, // Alias for compatibility with new pages
    userProfile, // Full Firestore profile with stats, badges, etc.
    isAdmin,
    loading,
    logout,
    refreshProfile,
    checkIsAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};