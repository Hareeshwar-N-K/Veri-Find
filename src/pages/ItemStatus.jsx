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

  useEffect(() => {
    fetchItemData();
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

    try {
      setCreatingMatch(true);

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

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      searching: {
        color: "bg-yellow-100 text-yellow-800",
        icon: FiClock,
        text: "Searching",
        description:
          "We are actively looking for matches. You will be notified when we find something.",
      },
      pending: {
        color: "bg-blue-100 text-blue-800",
        icon: FiClock,
        text: "Pending",
        description: "Item is waiting to be matched with its owner.",
      },
      matched: {
        color: "bg-purple-100 text-purple-800",
        icon: FiCheckCircle,
        text: "Matched",
        description:
          "A potential match has been found! Check the matches below.",
      },
      pending_verification: {
        color: "bg-orange-100 text-orange-800",
        icon: FiAlertCircle,
        text: "Verifying",
        description: "Ownership verification is in progress.",
      },
      recovered: {
        color: "bg-green-100 text-green-800",
        icon: FiCheckCircle,
        text: "Recovered",
        description: "Congratulations! Your item has been recovered.",
      },
      claimed: {
        color: "bg-green-100 text-green-800",
        icon: FiCheckCircle,
        text: "Claimed",
        description: "This item has been claimed by its owner.",
      },
    };
    return statusMap[status] || statusMap.pending;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <FiAlertCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Item Not Found
        </h1>
        <p className="text-gray-600 mb-6">
          This item doesn't exist or has been removed.
        </p>
        <Link to="/dashboard" className="btn-primary">
          Go to Dashboard
        </Link>
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
        >
          <FiArrowLeft className="mr-2" />
          Back to Dashboard
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  itemType === "lost"
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {itemType === "lost" ? "LOST ITEM" : "FOUND ITEM"}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{item.title}</h1>
            <p className="text-gray-600 capitalize">{item.category}</p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-4 py-2 rounded-full font-medium flex items-center gap-2 ${statusInfo.color}`}
            >
              <StatusIcon className="w-4 h-4" />
              {statusInfo.text}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-xl font-semibold mb-4">Status</h2>
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-lg ${statusInfo.color.split(" ")[0]}`}
              >
                <StatusIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-700">{statusInfo.description}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Created: {formatDate(item.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Item Details */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-xl font-semibold mb-4">Item Details</h2>

            {item.images && item.images.length > 0 && (
              <div className="mb-6">
                <img
                  src={
                    typeof item.images[0] === "string"
                      ? item.images[0]
                      : item.images[0]?.url
                  }
                  alt={item.title}
                  className="w-full max-w-md h-auto rounded-lg shadow-md"
                />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-1">Description</h3>
                <p className="text-gray-900">{item.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <FiMapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-medium">
                      {itemType === "lost"
                        ? item.locationLost?.name
                        : item.locationFound?.name || "Unknown"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FiCalendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">
                      {itemType === "lost" ? "Date Lost" : "Date Found"}
                    </p>
                    <p className="font-medium">
                      {formatDate(
                        itemType === "lost" ? item.dateLost : item.dateFound
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FiTag className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="font-medium capitalize">{item.category}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FiUser className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Reported By</p>
                    <p className="font-medium">
                      {itemType === "lost"
                        ? item.ownerName
                        : item.finderName || "Anonymous"}
                    </p>
                  </div>
                </div>
              </div>

              {item.estimatedValue && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">Estimated Value</p>
                  <p className="font-medium text-lg">${item.estimatedValue}</p>
                </div>
              )}

              {item.reward && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="font-medium text-yellow-800">
                    💰 Reward Offered: ${item.reward}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Potential Matches */}
          {isOwner && potentialMatches.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
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
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium">{matchedItem.title}</h3>
                          <p className="text-sm text-gray-600 capitalize">
                            {matchedItem.category}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {Math.round(match.score * 100)}% Match
                        </span>
                      </div>

                      <p className="text-gray-700 text-sm mb-3 line-clamp-2">
                        {matchedItem.description}
                      </p>

                      {/* Match Score Breakdown */}
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-600 mb-2">
                          Match Score Breakdown:
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Title:</span>{" "}
                            <span className="font-medium">
                              {Math.round(match.breakdown.title * 100)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Description:</span>{" "}
                            <span className="font-medium">
                              {Math.round(match.breakdown.description * 100)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Location:</span>{" "}
                            <span className="font-medium">
                              {Math.round(match.breakdown.location * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <FiMapPin className="w-4 h-4 mr-1" />
                            {itemType === "lost"
                              ? matchedItem.locationFound?.name
                              : matchedItem.locationLost?.name || "Unknown"}
                          </div>
                          <div className="flex items-center">
                            <FiCalendar className="w-4 h-4 mr-1" />
                            {formatDate(
                              itemType === "lost"
                                ? matchedItem.dateFound
                                : matchedItem.dateLost
                            )}
                          </div>
                        </div>

                        {itemType === "lost" && (
                          <button
                            onClick={() => handleCreateMatch(match)}
                            disabled={creatingMatch}
                            className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
                          >
                            {creatingMatch ? "Creating..." : "This is mine!"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Existing Matches */}
          {existingMatches.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <h2 className="text-xl font-semibold mb-4">Your Matches</h2>
              <div className="space-y-4">
                {existingMatches.map((match) => (
                  <div
                    key={match.id}
                    className={`p-4 rounded-lg border ${
                      match.status === "pending_verification"
                        ? "border-yellow-300 bg-yellow-50"
                        : match.status === "recovered"
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          Match Score: {Math.round((match.aiScore || 0) * 100)}%
                        </p>
                        <p className="text-sm text-gray-600">
                          Status: {match.status.replace("_", " ")}
                        </p>
                      </div>
                      <Link
                        to={`/match/${match.id}`}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        View Match →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Matches Yet */}
          {isOwner && matchingLoading && (
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 text-center">
              <LoadingSpinner size="md" />
              <p className="text-gray-600 mt-4">
                Searching for potential matches...
              </p>
            </div>
          )}

          {isOwner &&
            !matchingLoading &&
            potentialMatches.length === 0 &&
            existingMatches.length === 0 && (
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 text-center">
                <FiAlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Matches Yet
                </h3>
                <p className="text-gray-600">
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
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <h2 className="text-xl font-semibold mb-4">Actions</h2>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg transition">
                  <FiEdit className="w-4 h-4" />
                  Edit Item
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-700 hover:bg-red-50 font-medium py-2 px-4 rounded-lg transition"
                >
                  <FiTrash2 className="w-4 h-4" />
                  Delete Item
                </button>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-xl font-semibold mb-4">Timeline</h2>
            <div className="space-y-4">
              <div className="flex">
                <div className="flex flex-col items-center mr-4">
                  <div className="w-3 h-3 bg-primary-600 rounded-full"></div>
                  <div className="w-0.5 h-full bg-gray-300 mt-1"></div>
                </div>
                <div>
                  <p className="font-medium">Item Reported</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              </div>

              {(item.status === "matched" || existingMatches.length > 0) && (
                <div className="flex">
                  <div className="flex flex-col items-center mr-4">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <div className="w-0.5 h-full bg-gray-300 mt-1"></div>
                  </div>
                  <div>
                    <p className="font-medium">Match Found</p>
                    <p className="text-sm text-gray-600">
                      Pending verification
                    </p>
                  </div>
                </div>
              )}

              <div className="flex">
                <div className="flex flex-col items-center mr-4">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      item.status === "recovered" || item.status === "claimed"
                        ? "bg-green-600"
                        : "bg-gray-300"
                    }`}
                  ></div>
                </div>
                <div>
                  <p className="font-medium">
                    {itemType === "lost" ? "Item Recovered" : "Item Claimed"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {item.status === "recovered" || item.status === "claimed"
                      ? formatDate(item.updatedAt)
                      : "Pending"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Help */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <h2 className="text-xl font-semibold mb-4 text-blue-800">
              Need Help?
            </h2>
            <p className="text-sm text-blue-700 mb-4">
              If you have questions about your item or the matching process,
              contact our support team.
            </p>
            <button className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-lg transition">
              <FiMessageCircle className="w-4 h-4" />
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemStatus;
