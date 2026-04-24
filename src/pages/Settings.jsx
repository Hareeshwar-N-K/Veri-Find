import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  FiBell,
  FiMail,
  FiSave,
  FiSettings,
  FiShield,
  FiUser,
} from "react-icons/fi";
import { FaRocket } from "react-icons/fa";
import toast from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
  });
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    fetchSettings();

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setSettings({
          notificationsEnabled: userData.notificationsEnabled ?? true,
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (setting) => {
    setSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      await updateDoc(doc(db, "users", user.uid), {
        notificationsEnabled: settings.notificationsEnabled,
        updatedAt: new Date(),
      });
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0F29] via-[#111827] to-[#1E1B4B] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#0A0F29] via-[#111827] to-[#1E1B4B] text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-[200px] h-[200px] bg-cyan-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-[250px] h-[250px] bg-purple-500/5 rounded-full blur-3xl"></div>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
            transform: `translateY(${scrollY * 0.2}px)`,
          }}
        ></div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
              <FiSettings className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-gray-400">
                Manage your preferences and notifications
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Notifications Section */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                <FiBell className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Notification Settings</h2>
                <p className="text-sm text-gray-400">
                  Control how you receive updates
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* In-App Notifications Toggle */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
                    <FiBell className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      In-App Notifications
                    </p>
                    <p className="text-sm text-gray-400">
                      Show notifications in the navbar
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle("notificationsEnabled")}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                    settings.notificationsEnabled
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                      : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      settings.notificationsEnabled
                        ? "translate-x-8"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Email Notifications Toggle - Requires Blaze Plan */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 opacity-60">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                    <FiMail className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      Email Notifications
                    </p>
                    <p className="text-sm text-gray-400">
                      Requires Firebase Blaze Plan
                      <span className="ml-2 px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded-full border border-gray-500/30">
                        Not Available
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  disabled
                  className="relative inline-flex h-7 w-14 items-center rounded-full bg-gray-600 opacity-50 cursor-not-allowed"
                >
                  <span className="inline-block h-5 w-5 transform rounded-full bg-white translate-x-1" />
                </button>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
              <div className="flex items-start gap-3">
                <FiShield className="w-5 h-5 text-cyan-400 mt-0.5" />
                <div className="text-sm text-cyan-200">
                  <p className="font-semibold mb-1">Privacy Note</p>
                  <p className="text-cyan-300/80">
                    You'll receive notifications when:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-cyan-300/70">
                    <li>A potential match is found for your lost item</li>
                    <li>Someone claims your found item</li>
                    <li>A match is verified or rejected</li>
                    <li>Important system updates occur</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                <FiUser className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold">Account Information</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-gray-400">Email</span>
                <span className="text-white font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <span className="text-gray-400">Display Name</span>
                <span className="text-white font-medium">
                  {user?.displayName || "Not set"}
                </span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl hover:from-cyan-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FiSave className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span className="font-medium">Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
