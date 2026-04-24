import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FiCheckCircle,
  FiCalendar,
  FiMapPin,
  FiTag,
  FiTrendingUp,
  FiAward,
  FiRefreshCw,
} from "react-icons/fi";
import { FaTrophy, FaMedal } from "react-icons/fa";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { COLLECTIONS } from "../services/firestore";
import LoadingSpinner from "../components/LoadingSpinner";

const CACHE_KEY = "global_history_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const GlobalHistory = () => {
  const [recoveredItems, setRecoveredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [stats, setStats] = useState({
    totalRecovered: 0,
    thisMonth: 0,
    thisWeek: 0,
  });

  useEffect(() => {
    // Try to load from cache first
    const cachedData = loadFromCache();
    if (cachedData) {
      setRecoveredItems(cachedData.items);
      setStats(cachedData.stats);
      setLastUpdated(cachedData.timestamp);
      setLoading(false);
    }

    // Set up real-time listener for changes
    const unsubscribe = setupRealtimeListener();

    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    setIsVisible(true);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const data = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid
      if (now - data.timestamp < CACHE_DURATION) {
        return data;
      }

      // Cache expired, remove it
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch (error) {
      console.error("Error loading cache:", error);
      return null;
    }
  };

  const saveToCache = (items, stats) => {
    try {
      const data = {
        items,
        stats,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      setLastUpdated(data.timestamp);
    } catch (error) {
      console.error("Error saving to cache:", error);
    }
  };

  const setupRealtimeListener = () => {
    const matchesQuery = query(
      collection(db, COLLECTIONS.MATCHES),
      where("status", "==", "recovered"),
      orderBy("recoveredAt", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      matchesQuery,
      (snapshot) => {
        // When data changes, fetch fresh data
        fetchRecoveredItems(false);
      },
      (error) => {
        console.error("Error in real-time listener:", error);
      }
    );

    // Initial fetch
    fetchRecoveredItems(true);

    return unsubscribe;
  };

  const fetchRecoveredItems = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      // Fetch recovered matches
      const matchesQuery = query(
        collection(db, COLLECTIONS.MATCHES),
        where("status", "==", "recovered"),
        orderBy("recoveredAt", "desc"),
        limit(100)
      );

      const matchesSnapshot = await getDocs(matchesQuery);
      const matches = [];

      for (const matchDoc of matchesSnapshot.docs) {
        const matchData = matchDoc.data();

        // Fetch lost item details
        const lostItemDoc = await getDocs(
          query(
            collection(db, COLLECTIONS.LOST_ITEMS),
            where("__name__", "==", matchData.lostItemId)
          )
        );

        const lostItem = lostItemDoc.docs[0]?.data();

        // Fetch finder and owner names
        const finderDoc = await getDocs(
          query(
            collection(db, COLLECTIONS.USERS),
            where("__name__", "==", matchData.finderId)
          )
        );

        const ownerDoc = await getDocs(
          query(
            collection(db, COLLECTIONS.USERS),
            where("__name__", "==", matchData.ownerId)
          )
        );

        const finderName = finderDoc.docs[0]?.data()?.name || "Anonymous";
        const ownerName = ownerDoc.docs[0]?.data()?.name || "Anonymous";

        matches.push({
          id: matchDoc.id,
          ...matchData,
          lostItem,
          finderName,
          ownerName,
        });
      }

      // Calculate stats
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const thisWeek = matches.filter((m) => {
        const recoveredAt = m.recoveredAt?.toDate
          ? m.recoveredAt.toDate()
          : new Date(m.recoveredAt);
        return recoveredAt >= oneWeekAgo;
      }).length;

      const thisMonth = matches.filter((m) => {
        const recoveredAt = m.recoveredAt?.toDate
          ? m.recoveredAt.toDate()
          : new Date(m.recoveredAt);
        return recoveredAt >= oneMonthAgo;
      }).length;

      const calculatedStats = {
        totalRecovered: matches.length,
        thisMonth,
        thisWeek,
      };

      setRecoveredItems(matches);
      setStats(calculatedStats);

      // Save to cache
      saveToCache(matches, calculatedStats);
    } catch (error) {
      console.error("Error fetching recovered items:", error);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRecoveredItems(false);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 2592000)
      return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
    return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0F29] via-[#111827] to-[#1E1B4B] flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#0A0F29] via-[#111827] to-[#1E1B4B] text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 animate-slide"></div>
        <div
          className="absolute w-[800px] h-[800px] bg-gradient-to-r from-cyan-500/5 to-purple-500/5 rounded-full blur-3xl transition-all duration-300 ease-out"
          style={{
            transform: `translate(${mousePosition.x - 400}px, ${
              mousePosition.y - 400
            }px)`,
          }}
        ></div>
        <div className="absolute top-20 right-10 w-[200px] h-[200px] bg-cyan-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-[250px] h-[250px] bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        {/* Header */}
        <div
          className={`mb-8 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 mb-6 shadow-lg animate-float">
              <FaTrophy className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Global Recovery History
            </h1>
            <p className="text-gray-400 text-lg">
              Celebrating successful reunions on VeriFind
            </p>
            {lastUpdated && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <p className="text-xs text-gray-500">
                  Last updated: {new Date(lastUpdated).toLocaleTimeString()}
                </p>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 transition-all duration-300 disabled:opacity-50"
                  title="Refresh data"
                >
                  <FiRefreshCw
                    className={`w-4 h-4 text-cyan-400 ${
                      refreshing ? "animate-spin" : ""
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/30 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <FiCheckCircle className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Recovered</p>
                  <p className="text-3xl font-bold text-emerald-400">
                    {stats.totalRecovered}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <FiTrendingUp className="w-7 h-7 text-cyan-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">This Month</p>
                  <p className="text-3xl font-bold text-cyan-400">
                    {stats.thisMonth}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                  <FiAward className="w-7 h-7 text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">This Week</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {stats.thisWeek}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recovered Items List */}
        {recoveredItems.length === 0 ? (
          <div className="text-center py-20">
            <FaMedal className="w-24 h-24 mx-auto text-gray-600 mb-6" />
            <h3 className="text-2xl font-bold text-gray-400 mb-3">
              No Recovered Items Yet
            </h3>
            <p className="text-gray-500">
              Be the first to reunite lost items with their owners!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recoveredItems.map((item, index) => (
              <div
                key={item.id}
                className={`group p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 hover:border-emerald-500/30 transition-all duration-500 ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-10"
                }`}
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 flex items-center justify-center">
                        <FiCheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {item.lostItem?.title || "Item"}
                        </h3>
                        <p className="text-sm text-gray-400">
                          Recovered {getTimeAgo(item.recoveredAt)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-13">
                      <div className="flex items-center gap-2 text-gray-300">
                        <FiTag className="w-4 h-4 text-cyan-400" />
                        <span className="capitalize">
                          {item.lostItem?.category || "Unknown"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-300">
                        <FiMapPin className="w-4 h-4 text-purple-400" />
                        <span>
                          {item.lostItem?.locationName || "Unknown Location"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-300">
                        <FiCalendar className="w-4 h-4 text-emerald-400" />
                        <span>{formatDate(item.recoveredAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 mt-4 ml-13">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                          <span className="text-xs">👤</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Found by</p>
                          <p className="text-sm font-medium text-cyan-400">
                            {item.finderName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                          <span className="text-xs">🎯</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Returned to</p>
                          <p className="text-sm font-medium text-purple-400">
                            {item.ownerName}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30">
                      <span className="text-sm font-medium text-emerald-300">
                        ✨ Recovered
                      </span>
                    </div>
                    {item.aiScore && (
                      <div className="text-sm text-gray-400">
                        Match:{" "}
                        <span className="text-cyan-400 font-medium">
                          {Math.round(item.aiScore * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalHistory;
