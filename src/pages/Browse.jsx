import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FiSearch,
  FiFilter,
  FiMapPin,
  FiCalendar,
  FiClock,
  FiAlertCircle,
  FiX,
} from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";
import { getAllLostItems } from "../services/firestore";
import { findMatchesForFoundItem } from "../services/matching";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";
import { itemCategories, locations } from "../utils/constants";

const Browse = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchLostItems();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [items, searchTerm, selectedCategory, selectedLocation]);

  const fetchLostItems = async () => {
    try {
      setLoading(true);
      const lostItems = await getAllLostItems({}, 100);
      setItems(lostItems);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...items];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title?.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search) ||
          item.category?.toLowerCase().includes(search)
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    // Location filter
    if (selectedLocation) {
      filtered = filtered.filter((item) =>
        item.locationLost?.name
          ?.toLowerCase()
          .includes(selectedLocation.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedLocation("");
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Browse Lost Items</h1>
        <p className="text-gray-600">
          Help reunite lost items with their owners. If you found something,
          check if someone is looking for it.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, description, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 border rounded-lg transition ${
              showFilters || selectedCategory || selectedLocation
                ? "bg-primary-50 border-primary-300 text-primary-700"
                : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            <FiFilter className="w-5 h-5" />
            Filters
            {(selectedCategory || selectedLocation) && (
              <span className="w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                {(selectedCategory ? 1 : 0) + (selectedLocation ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="">All Categories</option>
                  {itemCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="">All Locations</option>
                  {locations.map((loc) => (
                    <option key={loc.value} value={loc.value}>
                      {loc.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  <FiX className="w-4 h-4" />
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">
          Showing <span className="font-semibold">{filteredItems.length}</span>{" "}
          lost items
        </p>

        {user && (
          <Link to="/report-found" className="btn-primary text-sm px-4 py-2">
            Found Something? Report It
          </Link>
        )}
      </div>

      {/* Items Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow"
            >
              {/* Item Image */}
              {item.images && item.images.length > 0 ? (
                <div className="h-48 bg-gray-100">
                  <img
                    src={
                      typeof item.images[0] === "string"
                        ? item.images[0]
                        : item.images[0]?.url
                    }
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
                  <FiAlertCircle className="w-16 h-16 text-red-300" />
                </div>
              )}

              {/* Item Details */}
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">
                    {item.title}
                  </h3>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                    {getTimeAgo(item.createdAt)}
                  </span>
                </div>

                <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 capitalize mb-3">
                  {item.category}
                </span>

                <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                  {item.description}
                </p>

                <div className="space-y-2 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-2">
                    <FiMapPin className="w-4 h-4" />
                    <span className="line-clamp-1">
                      {item.locationLost?.name || "Unknown location"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiCalendar className="w-4 h-4" />
                    <span>Lost on {formatDate(item.dateLost)}</span>
                  </div>
                </div>

                {/* Reward Badge */}
                {item.reward && (
                  <div className="mb-4">
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      💰 ₹{item.reward} Reward
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    to={`/item/${item.id}`}
                    className="flex-1 text-center py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm font-medium"
                  >
                    View Details
                  </Link>
                  {user && (
                    <Link
                      to={`/report-found?matchItem=${item.id}`}
                      className="flex-1 text-center py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                    >
                      I Found This!
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl shadow-lg border border-gray-100">
          <FiSearch className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Items Found
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || selectedCategory || selectedLocation
              ? "Try adjusting your filters or search terms"
              : "No lost items have been reported yet"}
          </p>
          {(searchTerm || selectedCategory || selectedLocation) && (
            <button onClick={clearFilters} className="btn-primary">
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* CTA for non-logged in users */}
      {!user && (
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Found Something?</h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Help reunite lost items with their owners. Sign in to report found
            items and get notified when there's a match.
          </p>
          <Link
            to="/login"
            className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition"
          >
            Sign In to Report Found Items
          </Link>
        </div>
      )}
    </div>
  );
};

export default Browse;
