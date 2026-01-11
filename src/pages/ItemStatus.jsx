import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  FiMapPin,
  FiCalendar,
  FiTag,
  FiUser,
  FiArrowLeft,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiMessageCircle,
  FiEdit,
  FiTrash2,
} from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";
import {
  getLostItem,
  getFoundItem,
  deleteLostItem,
  getMyMatches,
  updateLostItem,
  updateFoundItem,
} from "../services/firestore";
import {
  findMatchesForLostItem,
  findMatchesForFoundItem,
  createMatch,
} from "../services/matching";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";

const ItemStatus = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [itemType, setItemType] = useState(null); // 'lost' or 'found'
  const [loading, setLoading] = useState(true);
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [existingMatches, setExistingMatches] = useState([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [creatingMatchId, setCreatingMatchId] = useState(null); // Track which match is being created
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    locationName: "",
  });

  useEffect(() => {
    fetchItemData();
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    setIsVisible(true);

    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [id]);

  const fetchItemData = async () => {
    try {
      setLoading(true);

      // Try to find in lost_items first
      let itemData = await getLostItem(id);
      if (itemData) {
        setItem(itemData);
        setItemType("lost");

        // If it's the owner's item, find potential matches
        if (
          user &&
          itemData.ownerId === user.uid &&
          itemData.status === "searching"
        ) {
          setMatchingLoading(true);
          try {
            const matches = await findMatchesForLostItem(itemData);
            setPotentialMatches(matches);
          } catch (err) {
            console.error("Error finding matches:", err);
          }
          setMatchingLoading(false);
        }

        // Get existing matches for this item
        if (user) {
          const myMatches = await getMyMatches();
          const itemMatches = myMatches.filter((m) => m.lostItemId === id);
          setExistingMatches(itemMatches);
        }
      } else {
        // Try found_items
        itemData = await getFoundItem(id);
        if (itemData) {
          setItem(itemData);
          setItemType("found");

          // If it's the finder's item, find potential matches
          if (
            user &&
            itemData.finderId === user.uid &&
            itemData.status === "pending"
          ) {
            setMatchingLoading(true);
            try {
              const matches = await findMatchesForFoundItem(itemData);
              setPotentialMatches(matches);
            } catch (err) {
              console.error("Error finding matches:", err);
            }
            setMatchingLoading(false);
          }

          // Get existing matches for this item
          if (user) {
            const myMatches = await getMyMatches();
            const itemMatches = myMatches.filter((m) => m.foundItemId === id);
            setExistingMatches(itemMatches);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching item:", error);
      toast.error("Failed to load item");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatch = async (matchData) => {
    if (!user) {
      toast.error("Please login to create a match");
      return;
    }

    // Prevent multiple simultaneous clicks
    if (creatingMatch) {
      return;
    }

    try {
      setCreatingMatch(true);
      setCreatingMatchId(
        matchData.id || matchData.foundItem?.id || matchData.lostItem?.id
      );

      if (itemType === "lost") {
        // Creating match from lost item perspective
        await createMatch(item, matchData.foundItem, matchData.score);
        toast.success("Match created! Waiting for verification.");
      } else {
        // Creating match from found item perspective
        await createMatch(matchData.lostItem, item, matchData.score);
        toast.success("Match created! Owner will be notified.");
      }

      // Refresh data
      await fetchItemData();
    } catch (error) {
      console.error("Error creating match:", error);
      toast.error("Failed to create match");
    } finally {
      setCreatingMatch(false);
      setCreatingMatchId(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      await deleteLostItem(id);
      toast.success("Item deleted successfully");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    }
  };

  const handleEdit = () => {
    setEditFormData({
      title: item.title || "",
      description: item.description || "",
      locationName:
        item.locationName ||
        item.locationFound?.name ||
        item.locationLost?.name ||
        "",
    });
    setIsEditing(true);
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();

    try {
      const updateData = {
        title: editFormData.title,
        description: editFormData.description,
        locationName: editFormData.locationName,
      };

      if (itemType === "lost") {
        await updateLostItem(id, updateData);
      } else {
        await updateFoundItem(id, updateData);
      }

      toast.success("Item updated successfully!");
      setIsEditing(false);
      await fetchItemData(); // Refresh item data
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Failed to update item");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      searching: {
        color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
        icon: FiClock,
        text: "Searching",
        description:
          "We are actively looking for matches. You will be notified when we find something.",
      },
      pending: {
        color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        icon: FiClock,
        text: "Pending",
        description: "Item is waiting to be matched with its owner.",
      },
      matched: {
        color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        icon: FiCheckCircle,
        text: "Matched",
        description:
          "A potential match has been found! Check the matches below.",
      },
      pending_verification: {
        color: "bg-orange-500/20 text-orange-300 border-orange-500/30",
        icon: FiAlertCircle,
        text: "Verifying",
        description: "Ownership verification is in progress.",
      },
      recovered: {
        color: "bg-green-500/20 text-green-300 border-green-500/30",
        icon: FiCheckCircle,
        text: "Recovered",
        description: "Congratulations! Your item has been recovered.",
      },
      claimed: {
        color: "bg-green-500/20 text-green-300 border-green-500/30",
        icon: FiCheckCircle,
        text: "Claimed",
        description: "This item has been claimed by its owner.",
      },
    };
    return statusMap[status] || statusMap.pending;
  };

  if (loading) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-[#0A0F29] via-[#111827] to-[#1E1B4B] text-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>
        <div className="relative z-10 min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-300">Loading item details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-[#0A0F29] via-[#111827] to-[#1E1B4B] text-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>
        <div className="relative z-10 container mx-auto px-6 py-20 text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
            <FiAlertCircle className="w-12 h-12 text-cyan-400" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Item Not Found</h1>
          <p className="text-xl text-slate-300 mb-8 max-w-md mx-auto">
            This item doesn't exist or has been removed.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-lg font-semibold hover:opacity-90 transition-all duration-300"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(item.status);
  const StatusIcon = statusInfo.icon;
  const isOwner =
    user &&
    (itemType === "lost"
      ? item.ownerId === user.uid
      : item.finderId === user.uid);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#0A0F29] via-[#111827] to-[#1E1B4B] text-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>

        {/* Grid Pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        ></div>

        {/* Mouse Following Light */}
        <div
          className="absolute w-[800px] h-[800px] bg-gradient-to-r from-cyan-500/5 to-purple-500/5 rounded-full blur-3xl transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${mousePosition.x - 400}px, ${
              mousePosition.y - 400
            }px)`,
          }}
        ></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-6 transition-colors duration-300"
          >
            <FiArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div
              className={`transition-all duration-1000 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`px-4 py-2 rounded-full font-medium border ${
                    itemType === "lost"
                      ? "bg-red-500/20 text-red-300 border-red-500/30"
                      : "bg-green-500/20 text-green-300 border-green-500/30"
                  }`}
                >
                  {itemType === "lost" ? "LOST ITEM" : "FOUND ITEM"}
                </span>
                <span
                  className={`px-4 py-2 rounded-full font-medium flex items-center gap-2 border ${statusInfo.color}`}
                >
                  <StatusIcon className="w-4 h-4" />
                  {statusInfo.text}
                </span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-3 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                {item.title}
              </h1>
              <p className="text-xl text-slate-300 capitalize">
                {item.category}
              </p>
            </div>
          </div>
        </div>

        <div
          className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <div className="group relative rounded-3xl p-8 backdrop-blur-sm border border-white/10 hover:border-cyan-500/30 transition-all duration-500 bg-gradient-to-br from-white/5 to-white/10">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-6">Status</h2>
                <div className="flex items-start gap-6">
                  <div
                    className={`p-4 rounded-2xl border ${
                      statusInfo.color.split(" ")[0]
                    } bg-opacity-20`}
                  >
                    <StatusIcon className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg text-slate-300 mb-4">
                      {statusInfo.description}
                    </p>
                    <p className="text-sm text-slate-500">
                      Created: {formatDate(item.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Item Details */}
            <div className="group relative rounded-3xl p-8 backdrop-blur-sm border border-white/10 hover:border-cyan-500/30 transition-all duration-500 bg-gradient-to-br from-white/5 to-white/10">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-6">Item Details</h2>

                {item.images && item.images.length > 0 && (
                  <div className="mb-8">
                    <img
                      src={
                        typeof item.images[0] === "string"
                          ? item.images[0]
                          : item.images[0]?.url
                      }
                      alt={item.title}
                      className="w-full max-w-lg h-auto rounded-2xl shadow-2xl border border-white/10"
                    />
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-slate-300 mb-3">
                      Description
                    </h3>
                    <p className="text-lg text-white leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                        <FiMapPin className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Location</p>
                        <p className="font-medium text-lg">
                          {itemType === "lost"
                            ? item.locationLost?.name
                            : item.locationFound?.name || "Unknown"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                        <FiCalendar className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">
                          {itemType === "lost" ? "Date Lost" : "Date Found"}
                        </p>
                        <p className="font-medium text-lg">
                          {formatDate(
                            itemType === "lost" ? item.dateLost : item.dateFound
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30 flex items-center justify-center">
                        <FiTag className="w-6 h-6 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Category</p>
                        <p className="font-medium text-lg capitalize">
                          {item.category}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                        <FiUser className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Reported By</p>
                        <p className="font-medium text-lg">
                          {itemType === "lost"
                            ? item.ownerName
                            : item.finderName || "Anonymous"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {item.estimatedValue && (
                    <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30">
                      <p className="text-sm text-slate-400 mb-2">
                        Estimated Value
                      </p>
                      <p className="text-3xl font-bold text-cyan-400">
                        ₹{item.estimatedValue}
                      </p>
                    </div>
                  )}

                  {item.reward && (
                    <div className="p-6 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">💰</span>
                        <div>
                          <p className="font-semibold text-lg text-yellow-300">
                            Reward Offered
                          </p>
                          <p className="text-3xl font-bold text-yellow-400">
                            ₹{item.reward}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Potential Matches */}
            {isOwner && potentialMatches.length > 0 && (
              <div className="group relative rounded-3xl p-8 backdrop-blur-sm border border-white/10 hover:border-cyan-500/30 transition-all duration-500 bg-gradient-to-br from-white/5 to-white/10">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></span>
                    Potential Matches ({potentialMatches.length})
                  </h2>

                  <div className="space-y-4">
                    {potentialMatches.map((match, idx) => {
                      const matchedItem =
                        itemType === "lost" ? match.foundItem : match.lostItem;
                      return (
                        <div
                          key={matchedItem.id}
                          className="group/match relative rounded-2xl p-6 backdrop-blur-sm border border-white/10 hover:border-cyan-500/30 transition-all duration-300 bg-gradient-to-br from-white/5 to-white/10"
                        >
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-xl mb-2">
                                {matchedItem.title}
                              </h3>
                              <p className="text-slate-400 capitalize mb-3">
                                {matchedItem.category}
                              </p>
                              <p className="text-slate-300 line-clamp-2">
                                {matchedItem.description}
                              </p>
                            </div>
                            <span className="px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 font-medium">
                              {Math.round(match.score * 100)}% Match
                            </span>
                          </div>

                          {/* Match Score Breakdown */}
                          <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-sm font-medium text-slate-400 mb-3">
                              Match Score Breakdown:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                                <p className="text-xs text-slate-400">Title</p>
                                <p className="font-semibold text-cyan-400">
                                  {Math.round(match.breakdown.title * 100)}%
                                </p>
                              </div>
                              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                <p className="text-xs text-slate-400">
                                  Description
                                </p>
                                <p className="font-semibold text-purple-400">
                                  {Math.round(
                                    match.breakdown.description * 100
                                  )}
                                  %
                                </p>
                              </div>
                              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                <p className="text-xs text-slate-400">
                                  Location
                                </p>
                                <p className="font-semibold text-green-400">
                                  {Math.round(match.breakdown.location * 100)}%
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                              <div className="flex items-center gap-2">
                                <FiMapPin className="w-4 h-4" />
                                {itemType === "lost"
                                  ? matchedItem.locationFound?.name
                                  : matchedItem.locationLost?.name || "Unknown"}
                              </div>
                              <div className="flex items-center gap-2">
                                <FiCalendar className="w-4 h-4" />
                                {formatDate(
                                  itemType === "lost"
                                    ? matchedItem.dateFound
                                    : matchedItem.dateLost
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleCreateMatch(match)}
                              disabled={creatingMatch}
                              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold hover:opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {creatingMatch &&
                              creatingMatchId === (match.id || matchedItem.id)
                                ? "Creating Match..."
                                : "This is mine!"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Existing Matches */}
            {existingMatches.length > 0 && (
              <div className="group relative rounded-3xl p-8 backdrop-blur-sm border border-white/10 hover:border-cyan-500/30 transition-all duration-500 bg-gradient-to-br from-white/5 to-white/10">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-6">Your Matches</h2>
                  <div className="space-y-4">
                    {existingMatches.map((match) => (
                      <div
                        key={match.id}
                        className={`p-6 rounded-2xl backdrop-blur-sm border transition-all duration-300 ${
                          match.status === "pending_verification"
                            ? "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30 hover:border-yellow-500/50"
                            : match.status === "recovered"
                            ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 hover:border-green-500/50"
                            : "bg-gradient-to-br from-white/5 to-white/10 border-white/10 hover:border-cyan-500/30"
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-lg">
                              Match Score:{" "}
                              <span className="text-cyan-400">
                                {Math.round((match.aiScore || 0) * 100)}%
                              </span>
                            </p>
                            <p className="text-slate-400 capitalize">
                              Status: {match.status.replace("_", " ")}
                            </p>
                          </div>
                          <Link
                            to={`/match/${match.id}`}
                            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors duration-300"
                          >
                            View Match
                            <span className="text-xl">→</span>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Loading State for Matches */}
            {isOwner && matchingLoading && (
              <div className="group relative rounded-3xl p-12 backdrop-blur-sm border border-white/10 hover:border-cyan-500/30 transition-all duration-500 bg-gradient-to-br from-white/5 to-white/10 text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-xl text-slate-300">
                  Searching for potential matches...
                </p>
              </div>
            )}

            {/* No Matches Yet */}
            {isOwner &&
              !matchingLoading &&
              potentialMatches.length === 0 &&
              existingMatches.length === 0 && (
                <div className="group relative rounded-3xl p-12 backdrop-blur-sm border border-white/10 hover:border-cyan-500/30 transition-all duration-500 bg-gradient-to-br from-white/5 to-white/10 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
                    <FiAlertCircle className="w-10 h-10 text-cyan-400" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">No Matches Yet</h3>
                  <p className="text-lg text-slate-300 max-w-md mx-auto">
                    We haven't found any matching items yet. Check back later or
                    try updating your item description.
                  </p>
                </div>
              )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            {isOwner && (
              <div className="group relative rounded-3xl p-8 backdrop-blur-sm border border-white/10 hover:border-cyan-500/30 transition-all duration-500 bg-gradient-to-br from-white/5 to-white/10">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-6">Actions</h2>
                  <div className="space-y-4">
                    <button
                      onClick={handleEdit}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-lg font-semibold transition-all duration-300"
                    >
                      <FiEdit className="w-5 h-5" />
                      Edit Item
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 hover:border-red-500/50 text-red-300 hover:text-red-200 text-lg font-semibold transition-all duration-300"
                    >
                      <FiTrash2 className="w-5 h-5" />
                      Delete Item
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="group relative rounded-3xl p-8 backdrop-blur-sm border border-white/10 hover:border-cyan-500/30 transition-all duration-500 bg-gradient-to-br from-white/5 to-white/10">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-6">Timeline</h2>
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="flex flex-col items-center mr-4">
                      <div className="w-4 h-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"></div>
                      <div className="w-0.5 h-8 bg-gradient-to-b from-cyan-500/50 to-transparent mt-2"></div>
                    </div>
                    <div>
                      <p className="font-semibold text-lg">Item Reported</p>
                      <p className="text-sm text-slate-400">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                  </div>

                  {(item.status === "matched" ||
                    existingMatches.length > 0) && (
                    <div className="flex items-start">
                      <div className="flex flex-col items-center mr-4">
                        <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
                        <div className="w-0.5 h-8 bg-gradient-to-b from-blue-500/50 to-transparent mt-2"></div>
                      </div>
                      <div>
                        <p className="font-semibold text-lg">Match Found</p>
                        <p className="text-sm text-slate-400">
                          Pending verification
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start">
                    <div className="flex flex-col items-center mr-4">
                      <div
                        className={`w-4 h-4 rounded-full ${
                          item.status === "recovered" ||
                          item.status === "claimed"
                            ? "bg-gradient-to-r from-green-500 to-emerald-600"
                            : "bg-gray-500/50"
                        }`}
                      ></div>
                    </div>
                    <div>
                      <p className="font-semibold text-lg">
                        {itemType === "lost"
                          ? "Item Recovered"
                          : "Item Claimed"}
                      </p>
                      <p className="text-sm text-slate-400">
                        {item.status === "recovered" ||
                        item.status === "claimed"
                          ? formatDate(item.updatedAt)
                          : "Pending"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Help Card */}
            <div className="group relative rounded-3xl p-8 backdrop-blur-sm border border-cyan-500/30 hover:border-cyan-500/50 transition-all duration-500 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-4 text-cyan-300">
                  Need Help?
                </h2>
                <p className="text-lg text-slate-300 mb-6">
                  If you have questions about your item or the matching process,
                  contact our support team.
                </p>
                <button className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold hover:opacity-90 transition-all duration-300">
                  <FiMessageCircle className="w-5 h-5" />
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#0A0F29] to-[#1E1B4B] border border-white/10 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Edit Item Details
              </h2>
              <button
                onClick={() => setIsEditing(false)}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateItem} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">
                  Title *
                </label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, title: e.target.value })
                  }
                  className="w-full px-4 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white transition-all duration-300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">
                  Description *
                </label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      description: e.target.value,
                    })
                  }
                  rows={4}
                  className="w-full px-4 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white transition-all duration-300 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">
                  Location Name *
                </label>
                <input
                  type="text"
                  value={editFormData.locationName}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      locationName: e.target.value,
                    })
                  }
                  className="w-full px-4 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white transition-all duration-300"
                  required
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold hover:opacity-90 transition-all duration-300"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add custom CSS for animations */}
      <style jsx>{`
        @keyframes gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default ItemStatus;
