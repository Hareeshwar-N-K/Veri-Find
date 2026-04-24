import React, { useState, useEffect } from "react";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiEdit2,
  FiSave,
  FiPackage,
  FiSearch,
  FiCheckCircle,
  FiAlertCircle,
  FiBell,
  FiClock,
  FiArrowRight,
  FiLock,
  FiSettings,
  FiShield,
  FiHelpCircle,
  FiChevronRight,
  FiStar,
  FiTrendingUp,
  FiRefreshCw,
} from "react-icons/fi";
import { FaTrophy, FaMedal, FaAward } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  getMyLostItems,
  getMyFoundItems,
  getMyMatches,
  getUserRank,
} from "../services/firestore";
import { formatRankDisplay, getRankTier } from "../utils/helpers";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    studentId: "",
  });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const [activeTab, setActiveTab] = useState("lost");
  const [itemsLoading, setItemsLoading] = useState(true);
  const [myLostItems, setMyLostItems] = useState([]);
  const [myFoundItems, setMyFoundItems] = useState([]);
  const [myMatches, setMyMatches] = useState([]);
  const [userRank, setUserRank] = useState({
    rank: null,
    totalUsers: 0,
    reputationPoints: 0,
  });
  const [stats, setStats] = useState({
    lost: 0,
    found: 0,
    matches: 0,
    recovered: 0,
  });

  useEffect(() => {
    fetchProfile();
    fetchUserItems();
    if (user?.uid) {
      getUserRank(user.uid).then(setUserRank);
    }

    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfile(userData);
        setFormData({
          name: userData.name || "",
          phone: userData.phone || "",
          studentId: userData.studentId || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserItems = async () => {
    if (!user) return;

    try {
      setItemsLoading(true);
      const [lostItems, foundItems, matches] = await Promise.all([
        getMyLostItems(),
        getMyFoundItems(),
        getMyMatches(),
      ]);
      setMyLostItems(lostItems);
      setMyFoundItems(foundItems);
      setMyMatches(matches);

      // Calculate stats
      const recoveredCount = matches.filter(
        (m) => m.status === "recovered"
      ).length;
      const pendingMatches = matches.filter(
        (m) =>
          m.status === "pending_verification" ||
          m.status === "verification_in_progress"
      ).length;

      setStats({
        lost: lostItems.length,
        found: foundItems.length,
        matches: matches.length,
        recovered: recoveredCount,
        pending: pendingMatches,
      });
    } catch (error) {
      console.error("Error fetching user items:", error);
    } finally {
      setItemsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await updateDoc(doc(db, "users", user.uid), {
        ...formData,
        updatedAt: new Date(),
      });

      setProfile((prev) => ({ ...prev, ...formData }));
      setEditing(false);
      toast.success("Profile updated successfully!", {
        style: {
          background: "#1e293b",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.1)",
        },
        iconTheme: {
          primary: "#22d3ee",
          secondary: "#fff",
        },
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile", {
        style: {
          background: "#1e293b",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.1)",
        },
      });
    }
  };

  const statsCards = [
    {
      value: stats.lost,
      label: "Items Lost",
      icon: "🔍",
      color: "red",
      gradient: "from-red-500/20 to-red-600/20",
      border: "border-red-500/30",
    },
    {
      value: stats.found,
      label: "Items Found",
      icon: "🎯",
      color: "green",
      gradient: "from-green-500/20 to-green-600/20",
      border: "border-green-500/30",
    },
    {
      value: stats.matches,
      label: "Matches",
      icon: "✨",
      color: "yellow",
      gradient: "from-yellow-500/20 to-yellow-600/20",
      border: "border-yellow-500/30",
      badge: stats.pending > 0 ? stats.pending : null,
    },
    {
      value: stats.recovered,
      label: "Returned",
      icon: "🔄",
      color: "purple",
      gradient: "from-purple-500/20 to-purple-600/20",
      border: "border-purple-500/30",
    },
  ];

  if (loading) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-[#0A0F29] via-[#111827] to-[#1E1B4B]">
        <AnimatedBackground mousePosition={mousePosition} scrollY={scrollY} />
        <div className="relative z-10 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 animate-pulse"></div>
            </div>
            <p className="text-lg text-slate-400 animate-pulse">
              Loading your profile...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#0A0F29] via-[#111827] to-[#1E1B4B] text-white">
      <AnimatedBackground mousePosition={mousePosition} scrollY={scrollY} />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header with animated background */}
        <div className="relative mb-12 p-8 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 animate-gradient-x"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                  Welcome back,{" "}
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
                    {profile?.name?.split(" ")[0] || "User"}
                  </span>
                </h1>
                <p className="text-lg text-slate-400">
                  Manage your account and track your items
                </p>
              </div>
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center text-2xl font-bold shadow-2xl">
                  {profile?.name?.charAt(0) || "U"}
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-[#0A0F29] animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Card & Items */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Card */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-cyan-500/30 transition-all duration-300">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">
                      Personal Information
                    </h2>
                    <p className="text-slate-400">
                      Update your profile details
                    </p>
                  </div>
                  <button
                    onClick={() => setEditing(!editing)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 hover:border-cyan-400 transition-all duration-300 group/edit"
                  >
                    {editing ? (
                      <>
                        <FiSave className="w-4 h-4 group-hover/edit:rotate-12 transition-transform" />
                        <span>Save Changes</span>
                      </>
                    ) : (
                      <>
                        <FiEdit2 className="w-4 h-4 group-hover/edit:rotate-12 transition-transform" />
                        <span>Edit Profile</span>
                      </>
                    )}
                  </button>
                </div>

                {editing ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all duration-300"
                          placeholder="John Doe"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all duration-300"
                          placeholder="+1 (123) 456-7890"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">
                          Student ID
                        </label>
                        <input
                          type="text"
                          value={formData.studentId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              studentId: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all duration-300"
                          placeholder="S12345678"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={user?.email || ""}
                          className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-slate-400"
                          readOnly
                        />
                        <p className="text-sm text-slate-500">
                          Email cannot be changed
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="px-6 py-3 border border-white/20 text-slate-300 rounded-xl hover:bg-white/5 transition-all duration-300 hover:scale-105"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-medium hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 group"
                      >
                        <span className="flex items-center gap-2">
                          Save Changes
                          <FiChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InfoCard
                        icon={<FiUser className="w-6 h-6" />}
                        label="Full Name"
                        value={profile?.name || "Not set"}
                        gradient="from-cyan-500/20 to-blue-500/20"
                        border="border-cyan-500/30"
                      />
                      <InfoCard
                        icon={<FiMail className="w-6 h-6" />}
                        label="Email Address"
                        value={user?.email}
                        gradient="from-purple-500/20 to-pink-500/20"
                        border="border-purple-500/30"
                      />
                      <InfoCard
                        icon={<FiPhone className="w-6 h-6" />}
                        label="Phone Number"
                        value={profile?.phone || "Not set"}
                        gradient="from-green-500/20 to-emerald-500/20"
                        border="border-green-500/30"
                      />
                      <InfoCard
                        icon={<FiCalendar className="w-6 h-6" />}
                        label="Student ID"
                        value={profile?.studentId || "Not set"}
                        gradient="from-orange-500/20 to-yellow-500/20"
                        border="border-orange-500/30"
                      />
                    </div>

                    <div className="pt-6 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-300">
                            Account Created
                          </p>
                          <p className="text-sm text-slate-400">
                            {profile?.createdAt
                              ?.toDate()
                              .toLocaleDateString() || "Unknown"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-slate-300">Role</p>
                          <p className="text-sm text-slate-400 capitalize">
                            {profile?.role || "Student"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statsCards.map((stat, index) => (
                <div
                  key={index}
                  className="relative group"
                  style={{
                    transform: `translateY(${
                      Math.sin(scrollY * 0.003 + index) * 5
                    }px)`,
                  }}
                >
                  <div
                    className={`p-6 rounded-2xl bg-gradient-to-br ${stat.gradient} border ${stat.border} backdrop-blur-sm transition-all duration-300 group-hover:scale-105`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-2xl">{stat.icon}</div>
                      {stat.badge && (
                        <div className="relative">
                          <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-ping"></span>
                          <span className="relative z-10 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            {stat.badge}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-sm text-slate-300 mt-1">
                      {stat.label}
                    </div>
                    <div className="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500 mt-2 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* My Items Card */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/10 to-pink-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
              <div className="relative p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-yellow-500/30 transition-all duration-300">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">My Items</h2>
                    <p className="text-slate-400">
                      Track your lost and found items
                    </p>
                  </div>
                  <Link
                    to="/report-lost"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 hover:border-yellow-400 transition-all duration-300 group"
                  >
                    <span>Report Item</span>
                    <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-8 p-1 bg-white/5 rounded-2xl">
                  {[
                    {
                      id: "lost",
                      label: "Lost",
                      icon: <FiSearch />,
                      count: myLostItems.length,
                      color: "red",
                    },
                    {
                      id: "found",
                      label: "Found",
                      icon: <FiPackage />,
                      count: myFoundItems.length,
                      color: "green",
                    },
                    {
                      id: "matches",
                      label: "Matches",
                      icon: <FiBell />,
                      count: myMatches.length,
                      color: "yellow",
                      badge:
                        stats.pending > 0 && stats.pending < myMatches.length
                          ? stats.pending
                          : null,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 relative ${
                        activeTab === tab.id
                          ? `bg-gradient-to-r from-${tab.color}-500/20 to-${tab.color}-600/20 border border-${tab.color}-500/30 shadow-lg`
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {tab.icon}
                      {tab.label} ({tab.count})
                      {tab.badge && (
                        <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Items List */}
                {itemsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 animate-spin border-t-2 border-cyan-500"></div>
                      <p className="text-slate-400 mt-4">Loading items...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {activeTab === "lost" && (
                      <ItemsList
                        items={myLostItems}
                        emptyMessage="No lost items reported yet"
                        emptyLink="/report-lost"
                        emptyLinkText="Report a lost item"
                        type="lost"
                      />
                    )}
                    {activeTab === "found" && (
                      <ItemsList
                        items={myFoundItems}
                        emptyMessage="No found items reported yet"
                        emptyLink="/report-found"
                        emptyLinkText="Report a found item"
                        type="found"
                      />
                    )}
                    {activeTab === "matches" && (
                      <MatchesList matches={myMatches} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Settings */}
          <div className="space-y-8">
            {/* Reputation & Ranking Card */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-3xl blur-xl group-hover:opacity-100 opacity-50 transition-opacity duration-300"></div>
              <div className="relative p-8 rounded-3xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-sm border border-yellow-500/30">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <FaTrophy className="text-yellow-400" />
                    Reputation & Rank
                  </h2>
                </div>

                {/* Rank Display */}
                <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-yellow-500/20">
                  <div className="text-center">
                    <div className="text-5xl mb-2">
                      {getRankTier(userRank.reputationPoints).icon}
                    </div>
                    <div
                      className={`text-2xl font-bold mb-1 bg-gradient-to-r ${
                        getRankTier(userRank.reputationPoints).color
                      } bg-clip-text text-transparent`}
                    >
                      {getRankTier(userRank.reputationPoints).tier}
                    </div>
                    <div className="text-lg text-yellow-300 font-semibold">
                      {formatRankDisplay(userRank.rank, userRank.totalUsers)}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                      out of {userRank.totalUsers} users
                    </div>
                  </div>
                </div>

                {/* Reputation Points */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-300 font-medium">
                      Reputation Points
                    </span>
                    <span className="text-2xl font-bold text-yellow-400">
                      {userRank.reputationPoints || 0}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.min(
                          (userRank.reputationPoints / 1000) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>0</span>
                    <span>Legend (1000)</span>
                  </div>
                </div>

                {/* Points Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <div className="flex items-center gap-2">
                      <FaMedal className="text-green-400" />
                      <span className="text-sm text-slate-300">
                        Items Returned
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-green-400">
                      +50 pts each
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <div className="flex items-center gap-2">
                      <FaAward className="text-blue-400" />
                      <span className="text-sm text-slate-300">
                        Items Recovered
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-blue-400">
                      +10 pts each
                    </span>
                  </div>
                </div>

                {/* Next Tier */}
                {userRank.reputationPoints < 1000 && (
                  <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-300">Next Tier</p>
                        <p className="font-bold text-purple-400">
                          {userRank.reputationPoints >= 500
                            ? "Legend 👑"
                            : userRank.reputationPoints >= 250
                            ? "Master 💎"
                            : userRank.reputationPoints >= 100
                            ? "Expert ⭐"
                            : userRank.reputationPoints >= 50
                            ? "Pro 🔥"
                            : "Rising 📈"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-400">
                          {userRank.reputationPoints >= 500
                            ? 1000 - userRank.reputationPoints
                            : userRank.reputationPoints >= 250
                            ? 500 - userRank.reputationPoints
                            : userRank.reputationPoints >= 100
                            ? 250 - userRank.reputationPoints
                            : userRank.reputationPoints >= 50
                            ? 100 - userRank.reputationPoints
                            : 50 - userRank.reputationPoints}
                        </p>
                        <p className="text-xs text-slate-400">points to go</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Account Settings */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
              <div className="relative p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-blue-500/30 transition-all duration-300">
                <h2 className="text-2xl font-bold mb-6">Account Settings</h2>
                <div className="space-y-3">
                  <SettingsButton
                    icon={<FiLock />}
                    title="Change Password"
                    description="Update your account password"
                  />
                  <SettingsButton
                    icon={<FiSettings />}
                    title="Notification Settings"
                    description="Manage email and push notifications"
                  />
                  <SettingsButton
                    icon={<FiShield />}
                    title="Privacy Settings"
                    description="Control your privacy and data"
                  />
                </div>
              </div>
            </div>

            {/* Verification Status */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
              <div className="relative p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-500/30 transition-all duration-300">
                <h2 className="text-2xl font-bold mb-6">Verification Status</h2>
                <div className="space-y-4">
                  <VerificationItem
                    label="Email Verification"
                    verified={true}
                    color="green"
                  />
                  <VerificationItem
                    label="Student ID Verification"
                    verified={!!profile?.studentId}
                    pending={!!profile?.studentId}
                    color="yellow"
                  />
                  <VerificationItem
                    label="Phone Verification"
                    verified={!!profile?.phone}
                    pending={!!profile?.phone}
                    color="yellow"
                  />
                </div>
              </div>
            </div>

            {/* Help & Support */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
              <div className="relative p-8 rounded-3xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm border border-blue-500/30">
                <h2 className="text-2xl font-bold mb-6 text-blue-400">
                  Need Help?
                </h2>
                <div className="space-y-3">
                  <HelpButton
                    title="FAQs & Help Center"
                    description="Find answers to common questions"
                  />
                  <HelpButton
                    title="Contact Support"
                    description="Get help from our support team"
                  />
                  <HelpButton
                    title="Report an Issue"
                    description="Report bugs or problems"
                  />
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
              <div className="relative p-8 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-green-500/30 transition-all duration-300">
                <h2 className="text-2xl font-bold mb-6">Quick Stats</h2>
                <div className="space-y-4">
                  <QuickStatItem
                    label="Success Rate"
                    value="98%"
                    icon={<FiTrendingUp />}
                    color="green"
                  />
                  <QuickStatItem
                    label="Avg. Response Time"
                    value="< 2 hours"
                    icon={<FiClock />}
                    color="blue"
                  />
                  <QuickStatItem
                    label="User Rating"
                    value="4.9/5"
                    icon={<FiStar />}
                    color="yellow"
                  />
                  <QuickStatItem
                    label="Last Active"
                    value="Just now"
                    icon={<FiRefreshCw />}
                    color="purple"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50 group">
        <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full blur-xl animate-ping-slow opacity-0 group-hover:opacity-100"></div>
        <Link
          to="/report-lost"
          className="relative w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center text-2xl shadow-2xl hover:scale-110 transition-transform duration-300 group/button"
        >
          <span className="group-hover/button:rotate-180 transition-transform duration-500">
            +
          </span>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs animate-pulse">
            !
          </div>
        </Link>
      </div>
    </div>
  );
};

// Helper Components
const AnimatedBackground = ({ mousePosition, scrollY }) => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <div
      className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-float"
      style={{
        transform: `translateY(${Math.sin(scrollY * 0.003) * 20}px) rotate(${
          scrollY * 0.005
        }deg)`,
      }}
    ></div>
    <div
      className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl animate-float-reverse"
      style={{
        animationDelay: "1s",
        transform: `translateY(${Math.cos(scrollY * 0.002) * 20}px) rotate(${
          -scrollY * 0.005
        }deg)`,
      }}
    ></div>

    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                       linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
        backgroundSize: "50px 50px",
        transform: `translate(${scrollY * 0.02}px, ${scrollY * 0.01}px)`,
      }}
    ></div>

    <div
      className="absolute w-[800px] h-[800px] bg-gradient-to-r from-cyan-500/5 to-purple-500/5 rounded-full blur-3xl transition-all duration-300 ease-out"
      style={{
        transform: `translate(${mousePosition.x - 400}px, ${
          mousePosition.y - 400
        }px) scale(${1 + Math.sin(Date.now() * 0.001) * 0.1})`,
      }}
    ></div>
  </div>
);

const InfoCard = ({ icon, label, value, gradient, border }) => (
  <div
    className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} border ${border} backdrop-blur-sm transition-all duration-300 hover:scale-105 group`}
  >
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-white/10 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-400">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  </div>
);

const SettingsButton = ({ icon, title, description }) => (
  <button className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 group/setting">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 group-hover/setting:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
      <FiChevronRight className="w-5 h-5 text-slate-400 group-hover/setting:translate-x-1 transition-transform" />
    </div>
  </button>
);

const VerificationItem = ({ label, verified, pending, color }) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
    <span>{label}</span>
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium ${
        verified
          ? "bg-green-500/20 text-green-400 border border-green-500/30"
          : pending
          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
          : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
      }`}
    >
      {verified ? "Verified" : pending ? "Pending" : "Not Set"}
    </span>
  </div>
);

const HelpButton = ({ title, description }) => (
  <button className="w-full text-left p-4 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 transition-all duration-300 group/help">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-blue-500/20 group-hover/help:scale-110 transition-transform duration-300">
        <FiHelpCircle className="w-5 h-5 text-blue-400" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-blue-400">{title}</p>
        <p className="text-sm text-blue-400/70">{description}</p>
      </div>
      <FiChevronRight className="w-5 h-5 text-blue-400 group-hover/help:translate-x-1 transition-transform" />
    </div>
  </button>
);

const QuickStatItem = ({ label, value, icon, color }) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-${color}-500/20`}>{icon}</div>
      <span className="text-slate-300">{label}</span>
    </div>
    <span
      className={`text-lg font-bold bg-gradient-to-r from-${color}-400 to-${color}-600 bg-clip-text text-transparent`}
    >
      {value}
    </span>
  </div>
);

const ItemsList = ({ items, emptyMessage, emptyLink, emptyLinkText, type }) => (
  <>
    {items.length === 0 ? (
      <div className="text-center py-12">
        <div className="text-4xl mb-4 opacity-50">
          {type === "lost" ? "🔍" : type === "found" ? "🎯" : "✨"}
        </div>
        <p className="text-slate-400 mb-4">{emptyMessage}</p>
        <Link
          to={emptyLink}
          className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors group"
        >
          <span>{emptyLinkText}</span>
          <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    ) : (
      items.map((item) => (
        <div
          key={item.id}
          className="group/item p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all duration-300 hover:scale-[1.02]"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium group-hover/item:text-cyan-300 transition-colors">
                  {item.title}
                </h3>
                {item.status === "recovered" || item.status === "claimed" ? (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                    ✓ Recovered
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30 animate-pulse">
                    ⚡ Active
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mb-2">{item.category}</p>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <FiClock className="w-3 h-3" />
                  {item.dateLost?.toDate?.()?.toLocaleDateString() ||
                    item.dateFound?.toDate?.()?.toLocaleDateString()}
                </span>
                <span>
                  {item.locationLost?.name || item.locationFound?.name}
                </span>
              </div>
            </div>
            <Link
              to={`/item/${item.id}`}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors group/link"
            >
              <FiArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      ))
    )}
  </>
);

const MatchesList = ({ matches }) => (
  <>
    {matches.length === 0 ? (
      <div className="text-center py-12">
        <div className="text-4xl mb-4 opacity-50">✨</div>
        <p className="text-slate-400 mb-2">No matches yet</p>
        <p className="text-sm text-slate-500">
          When your items are matched, they'll appear here
        </p>
      </div>
    ) : (
      matches.map((match) => (
        <div
          key={match.id}
          className={`p-4 rounded-xl backdrop-blur-sm border transition-all duration-300 hover:scale-[1.02] ${
            match.status === "pending_verification" ||
            match.status === "verification_in_progress"
              ? "bg-yellow-500/10 border-yellow-500/30"
              : match.status === "recovered"
              ? "bg-green-500/10 border-green-500/30"
              : "bg-white/5 border-white/10"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`px-2 py-1 text-xs rounded-full font-medium ${
                    match.role === "owner"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-green-500/20 text-green-400 border border-green-500/30"
                  }`}
                >
                  {match.role === "owner" ? "Your Lost Item" : "You Found This"}
                </span>
                {(match.status === "pending_verification" ||
                  match.status === "verification_in_progress") && (
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30 animate-pulse">
                    ⚡ Action Needed
                  </span>
                )}
              </div>
              <p className="font-medium mb-1">
                Match Score:{" "}
                <span className="text-cyan-400">
                  {Math.round((match.aiScore || 0) * 100)}%
                </span>
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <FiClock className="w-3 h-3" />
                  {match.createdAt?.toDate?.()?.toLocaleDateString() ||
                    "Unknown date"}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className={`px-2 py-1 text-xs rounded-full font-medium ${
                  match.status === "pending_verification"
                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    : match.status === "verification_in_progress"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : match.status === "recovered"
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                }`}
              >
                {match.status
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </span>
              <Link
                to={`/match/${match.id}`}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 group/link"
              >
                View
                <FiArrowRight className="w-3 h-3 group-hover/link:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      ))
    )}
  </>
);

export default Profile;
