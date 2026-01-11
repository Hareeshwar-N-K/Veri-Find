import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FaBox,
  FaSearch,
  FaCheckCircle,
  FaClock,
  FaArrowRight,
  FaBell,
  FaCalendar,
  FaMapMarkerAlt,
  FaExclamationTriangle,
  FaSync,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  getMyLostItems,
  getMyFoundItems,
  getMyMatches,
  getRecoveryStats,
} from "../services/firestore";
import { findMatchesForLostItem } from "../services/matching";
import toast from "react-hot-toast";

const Dashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("lost");
  const [loading, setLoading] = useState(true);

  // Live data from Firestore
  const [myLostItems, setMyLostItems] = useState([]);
  const [myFoundItems, setMyFoundItems] = useState([]);
  const [myMatches, setMyMatches] = useState([]);
  const [recoveryStats, setRecoveryStats] = useState({
    totalRecoveries: 0,
    totalValueRecovered: 0,
  });
  const [potentialMatches, setPotentialMatches] = useState({});

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const [lostItems, foundItems, matches, stats] = await Promise.all([
        getMyLostItems(),
        getMyFoundItems(),
        getMyMatches(),
        getRecoveryStats(),
      ]);

      setMyLostItems(lostItems);
      setMyFoundItems(foundItems);
      setMyMatches(matches);
      setRecoveryStats(stats);

      // Find potential matches for lost items still searching (limit to 3)
      const searchingItems = lostItems
        .filter((item) => item.status === "searching")
        .slice(0, 3);

      const matchPromises = searchingItems.map(async (item) => {
        try {
          const matches = await findMatchesForLostItem(item);
          return { itemId: item.id, matches };
        } catch (err) {
          console.error("Error finding matches:", err);
          return { itemId: item.id, matches: [] };
        }
      });

      const matchResults = await Promise.all(matchPromises);
      const matchesMap = {};
      matchResults.forEach((result) => {
        matchesMap[result.itemId] = result.matches;
      });
      setPotentialMatches(matchesMap);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate stats from live data
  const stats = useMemo(
    () => [
      {
        title: "Lost Items",
        value: myLostItems.length,
        subtitle: `${
          myLostItems.filter((i) => i.status === "searching").length
        } searching`,
        icon: <FaExclamationTriangle />,
        gradient: "from-red-500 to-pink-500",
        iconGradient: "from-red-500 to-pink-600",
      },
      {
        title: "Found Items",
        value: myFoundItems.length,
        subtitle: `${
          myFoundItems.filter((i) => i.status === "pending").length
        } pending`,
        icon: <FaSearch />,
        gradient: "from-green-500 to-emerald-500",
        iconGradient: "from-green-500 to-emerald-600",
      },
      {
        title: "Matches",
        value: myMatches.length,
        subtitle: `${
          myMatches.filter((i) => i.status === "pending_verification").length
        } pending`,
        icon: <FaCheckCircle />,
        gradient: "from-blue-500 to-cyan-500",
        iconGradient: "from-blue-500 to-cyan-600",
      },
      {
        title: "Recovered",
        value: myMatches.filter((m) => m.status === "recovered").length,
        subtitle: `$${recoveryStats.totalValueRecovered || 0} value`,
        icon: <FaClock />,
        gradient: "from-purple-500 to-violet-500",
        iconGradient: "from-purple-500 to-violet-600",
      },
    ],
    [myLostItems, myFoundItems, myMatches, recoveryStats]
  );

  const getStatusBadge = useCallback((status) => {
    const statusConfig = {
      searching: {
        gradient: "from-yellow-500 to-orange-500",
        text: "text-yellow-300",
        label: "Searching",
        icon: "🔍",
      },
      pending: {
        gradient: "from-blue-500 to-cyan-500",
        text: "text-blue-300",
        label: "Pending",
        icon: "⏳",
      },
      matched: {
        gradient: "from-purple-500 to-pink-500",
        text: "text-purple-300",
        label: "Matched",
        icon: "💫",
      },
      pending_verification: {
        gradient: "from-orange-500 to-red-500",
        text: "text-orange-300",
        label: "Verifying",
        icon: "🔐",
      },
      verified: {
        gradient: "from-green-500 to-emerald-500",
        text: "text-green-300",
        label: "Verified",
        icon: "✅",
      },
      recovered: {
        gradient: "from-emerald-500 to-teal-500",
        text: "text-emerald-300",
        label: "Recovered",
        icon: "🎉",
      },
      claimed: {
        gradient: "from-teal-500 to-cyan-500",
        text: "text-teal-300",
        label: "Claimed",
        icon: "🏆",
      },
    };

    const config = statusConfig[status] || {
      gradient: "from-gray-500 to-gray-700",
      text: "text-gray-300",
      label: status,
      icon: "📋",
    };

    return (
      <span
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${config.gradient} ${config.text} border border-white/10`}
      >
        <span className="text-xs">{config.icon}</span>
        <span>{config.label}</span>
      </span>
    );
  }, []);

  const formatDate = useCallback((timestamp) => {
    if (!timestamp) return "Unknown";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0F29] via-[#111827] to-[#1E1B4B] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cyan-200">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Combine items for display
  const displayItems =
    activeTab === "lost"
      ? myLostItems.map((item) => ({ ...item, type: "lost" }))
      : myFoundItems.map((item) => ({ ...item, type: "found" }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F29] via-[#111827] to-[#1E1B4B] text-white">
      {/* Simple Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center animate-pulse">
              <FaBox className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-gray-400">
                Welcome back, {user?.displayName?.split(" ")[0]}! Here's your
                overview.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.iconGradient} flex items-center justify-center`}
                >
                  <div className="text-white text-xl">{stat.icon}</div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-gray-300">{stat.subtitle}</p>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white">{stat.title}</h3>
            </div>
          ))}
        </div>

        {/* Quick Actions and Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Potential Matches Alert */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FaBell className="text-yellow-400 animate-pulse" />
              Potential Matches Found
            </h3>

            {Object.keys(potentialMatches).length > 0 &&
            Object.values(potentialMatches).some((m) => m.length > 0) ? (
              <div className="space-y-3">
                {myLostItems
                  .filter((item) => potentialMatches[item.id]?.length > 0)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-white">
                            {item.title}
                          </p>
                          <p className="text-sm text-yellow-200">
                            {potentialMatches[item.id].length} potential
                            match(es) found!
                          </p>
                        </div>
                        <Link
                          to={`/item/${item.id}`}
                          className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-yellow-500/20 transition-all"
                        >
                          View Matches
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <FaSearch className="text-4xl mx-auto mb-3 opacity-50" />
                <p>No potential matches found yet</p>
                <p className="text-sm">
                  We'll notify you when we find something!
                </p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-6">Quick Actions</h3>
            <div className="space-y-4">
              <Link
                to="/report-lost"
                className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 hover:border-red-400 transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                    <FaExclamationTriangle className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Report Lost Item</p>
                    <p className="text-sm text-gray-300">
                      Can't find something?
                    </p>
                  </div>
                </div>
                <FaArrowRight className="text-gray-400 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
              </Link>

              <Link
                to="/report-found"
                className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 hover:border-green-400 transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <FaSearch className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      Report Found Item
                    </p>
                    <p className="text-sm text-gray-300">Found something?</p>
                  </div>
                </div>
                <FaArrowRight className="text-gray-400 group-hover:text-green-400 group-hover:translate-x-1 transition-all" />
              </Link>

              <Link
                to="/browse"
                className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 hover:border-blue-400 transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    <FaBox className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      Browse Lost Items
                    </p>
                    <p className="text-sm text-gray-300">Help find owners</p>
                  </div>
                </div>
                <FaArrowRight className="text-gray-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          </div>
        </div>

        {/* My Items */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">My Items</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab("lost")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === "lost"
                      ? "bg-gradient-to-r from-red-500 to-pink-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  Lost ({myLostItems.length})
                </button>
                <button
                  onClick={() => setActiveTab("found")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === "found"
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  Found ({myFoundItems.length})
                </button>
              </div>
            </div>
          </div>

          {displayItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Matches
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {displayItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-white">{item.title}</p>
                          <p className="text-sm text-gray-400 truncate max-w-xs">
                            {item.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-300 capitalize">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <FaCalendar className="text-cyan-400" />
                          <span className="text-gray-300">
                            {formatDate(
                              item.type === "lost"
                                ? item.dateLost
                                : item.dateFound
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <FaMapMarkerAlt className="text-cyan-400" />
                          <span className="text-gray-300">
                            {item.type === "lost"
                              ? item.locationLost?.name
                              : item.locationFound?.name || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.type === "lost" &&
                        potentialMatches[item.id]?.length > 0 ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border border-yellow-500/30">
                            {potentialMatches[item.id].length} found
                          </span>
                        ) : (
                          <span className="text-gray-500 text-sm">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/item/${item.id}`}
                          className="text-cyan-400 hover:text-cyan-300 font-medium"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaBox className="text-gray-400 text-2xl" />
              </div>
              <p className="text-gray-400">No {activeTab} items yet</p>
              <Link
                to={activeTab === "lost" ? "/report-lost" : "/report-found"}
                className="text-cyan-400 hover:text-cyan-300 font-medium text-sm"
              >
                Report your first {activeTab} item
              </Link>
            </div>
          )}
        </div>

        {/* My Matches Section */}
        {myMatches.length > 0 && (
          <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h3 className="text-xl font-bold text-white">My Matches</h3>
            </div>
            <div className="p-6 space-y-4">
              {myMatches.slice(0, 5).map((match) => (
                <div
                  key={match.id}
                  className={`p-4 rounded-xl border backdrop-blur-sm ${
                    match.status === "pending_verification"
                      ? "bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30"
                      : match.status === "recovered"
                      ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30"
                      : "bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-white">
                        {match.itemTitle}
                      </p>
                      <p className="text-sm text-gray-300">
                        {match.role === "owner"
                          ? "Your lost item"
                          : "Item you found"}{" "}
                        • Score: {Math.round((match.aiScore || 0) * 100)}%
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(match.status)}
                      <Link
                        to={`/match/${match.id}`}
                        className="text-cyan-400 hover:text-cyan-300 font-medium text-sm"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Refresh Section */}
        <div className="mt-8 p-6 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl border border-cyan-500/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-white">
                Keep your dashboard updated
              </h3>
              <p className="text-gray-300">
                Refresh to see the latest matches and updates
              </p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center gap-2"
            >
              <FaSync className="animate-spin" />
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <Link
          to="/report-lost"
          className="relative w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center text-2xl shadow-2xl hover:scale-110 transition-transform duration-300"
        >
          <span className="text-2xl">+</span>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
        </Link>
      </div>

      {/* Add minimal CSS for animations */}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        .animate-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
