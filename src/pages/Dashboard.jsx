import React, { useState, useEffect } from "react";
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

  const fetchDashboardData = async () => {
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

      // Find potential matches for lost items still searching
      const matchPromises = lostItems
        .filter((item) => item.status === "searching")
        .map(async (item) => {
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
  };

  // Calculate stats from live data
  const stats = [
    {
      title: "Lost Items",
      value: myLostItems.length,
      subtitle: `${
        myLostItems.filter((i) => i.status === "searching").length
      } searching`,
      icon: <FaExclamationTriangle />,
      color: "red",
      bgColor: "bg-red-500",
    },
    {
      title: "Found Items",
      value: myFoundItems.length,
      subtitle: `${
        myFoundItems.filter((i) => i.status === "pending").length
      } pending`,
      icon: <FaSearch />,
      color: "green",
      bgColor: "bg-green-500",
    },
    {
      title: "Matches",
      value: myMatches.length,
      subtitle: `${
        myMatches.filter((i) => i.status === "pending_verification").length
      } pending`,
      icon: <FaCheckCircle />,
      color: "blue",
      bgColor: "bg-blue-500",
    },
    {
      title: "Recovered",
      value: myMatches.filter((m) => m.status === "recovered").length,
      subtitle: `$${recoveryStats.totalValueRecovered || 0} value`,
      icon: <FaClock />,
      color: "purple",
      bgColor: "bg-purple-500",
    },
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      searching: { color: "bg-yellow-100 text-yellow-800", label: "Searching" },
      pending: { color: "bg-blue-100 text-blue-800", label: "Pending" },
      matched: { color: "bg-purple-100 text-purple-800", label: "Matched" },
      pending_verification: {
        color: "bg-orange-100 text-orange-800",
        label: "Verifying",
      },
      verified: { color: "bg-green-100 text-green-800", label: "Verified" },
      recovered: { color: "bg-green-100 text-green-800", label: "Recovered" },
      claimed: { color: "bg-green-100 text-green-800", label: "Claimed" },
    };

    const config = statusConfig[status] || {
      color: "bg-gray-100 text-gray-800",
      label: status,
    };

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Combine items for display
  const displayItems =
    activeTab === "lost"
      ? myLostItems.map((item) => ({ ...item, type: "lost" }))
      : myFoundItems.map((item) => ({ ...item, type: "found" }));

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {user?.displayName?.split(" ")[0]}! Here's your
          overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 transform transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}
              >
                <div className="text-white text-xl">{stat.icon}</div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.subtitle}</p>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {stat.title}
            </h3>
          </div>
        ))}
      </div>

      {/* Quick Actions and Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Potential Matches Alert */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FaBell className="text-yellow-500" />
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
                    className="p-4 bg-yellow-50 rounded-xl border border-yellow-200"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {item.title}
                        </p>
                        <p className="text-sm text-gray-600">
                          {potentialMatches[item.id].length} potential match(es)
                          found!
                        </p>
                      </div>
                      <Link
                        to={`/item/${item.id}`}
                        className="btn-primary text-sm px-4 py-2"
                      >
                        View Matches
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FaSearch className="text-4xl mx-auto mb-3 opacity-50" />
              <p>No potential matches found yet</p>
              <p className="text-sm">
                We'll notify you when we find something!
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Quick Actions
          </h3>
          <div className="space-y-4">
            <Link
              to="/report-lost"
              className="flex items-center justify-between p-4 rounded-xl bg-red-50 hover:bg-red-100 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <FaExclamationTriangle className="text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    Report Lost Item
                  </p>
                  <p className="text-sm text-gray-600">Can't find something?</p>
                </div>
              </div>
              <FaArrowRight className="text-gray-400 group-hover:text-red-600" />
            </Link>

            <Link
              to="/report-found"
              className="flex items-center justify-between p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FaSearch className="text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    Report Found Item
                  </p>
                  <p className="text-sm text-gray-600">Found something?</p>
                </div>
              </div>
              <FaArrowRight className="text-gray-400 group-hover:text-green-600" />
            </Link>

            <Link
              to="/browse"
              className="flex items-center justify-between p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FaBox className="text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    Browse Lost Items
                  </p>
                  <p className="text-sm text-gray-600">Help find owners</p>
                </div>
              </div>
              <FaArrowRight className="text-gray-400 group-hover:text-blue-600" />
            </Link>
          </div>
        </div>
      </div>

      {/* My Items */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">My Items</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab("lost")}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === "lost"
                    ? "bg-red-100 text-red-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Lost ({myLostItems.length})
              </button>
              <button
                onClick={() => setActiveTab("found")}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === "found"
                    ? "bg-green-100 text-green-600"
                    : "text-gray-600 hover:bg-gray-100"
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
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matches
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.title}
                        </p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          {item.description}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700 capitalize">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <FaCalendar className="text-gray-400" />
                        <span className="text-gray-700">
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
                        <FaMapMarkerAlt className="text-gray-400" />
                        <span className="text-gray-700">
                          {item.type === "lost"
                            ? item.locationLost?.name
                            : item.locationFound?.name || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.type === "lost" &&
                      potentialMatches[item.id]?.length > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {potentialMatches[item.id].length} found
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/item/${item.id}`}
                        className="text-primary-600 hover:text-primary-700 font-medium"
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
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaBox className="text-gray-400 text-2xl" />
            </div>
            <p className="text-gray-500">No {activeTab} items yet</p>
            <Link
              to={activeTab === "lost" ? "/report-lost" : "/report-found"}
              className="text-primary-600 hover:underline text-sm"
            >
              Report your first {activeTab} item
            </Link>
          </div>
        )}
      </div>

      {/* My Matches Section */}
      {myMatches.length > 0 && (
        <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">My Matches</h3>
          </div>
          <div className="p-6 space-y-4">
            {myMatches.slice(0, 5).map((match) => (
              <div
                key={match.id}
                className={`p-4 rounded-xl border ${
                  match.status === "pending_verification"
                    ? "border-yellow-300 bg-yellow-50"
                    : match.status === "recovered"
                    ? "border-green-300 bg-green-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {match.itemTitle}
                    </p>
                    <p className="text-sm text-gray-600">
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
                      className="text-primary-600 hover:text-primary-700 font-medium text-sm"
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
    </div>
  );
};

export default Dashboard;
