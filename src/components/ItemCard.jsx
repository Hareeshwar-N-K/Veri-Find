import React, { useState } from "react";
import { Link } from "react-router-dom";
import { formatDate, getStatusColor, truncateText } from "../utils/helpers";
import { FiMapPin, FiCalendar, FiTag, FiEye, FiArrowRight } from "react-icons/fi";
import { FaSatellite, FaCrosshairs, FaChartLine } from "react-icons/fa";

const ItemCard = ({ item, showActions = true }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const statusColors = {
    lost: "from-red-500/20 to-pink-500/20 text-red-300 border-red-500/30",
    found: "from-green-500/20 to-emerald-500/20 text-green-300 border-green-500/30",
    matched: "from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/30",
    pending_verification: "from-purple-500/20 to-violet-500/20 text-purple-300 border-purple-500/30",
    recovered: "from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30",
    claimed: "from-teal-500/20 to-cyan-500/20 text-teal-300 border-teal-500/30",
    searching: "from-yellow-500/20 to-orange-500/20 text-yellow-300 border-yellow-500/30",
    pending: "from-gray-500/20 to-blue-500/20 text-gray-300 border-gray-500/30",
  };

  const getStatusText = (status) => {
    const statusMap = {
      lost: "Lost",
      found: "Found",
      matched: "Matched",
      pending_verification: "Verifying",
      recovered: "Recovered",
      claimed: "Claimed",
      searching: "Searching",
      pending: "Pending",
    };
    return statusMap[status] || status;
  };

  const getCategoryIcon = (category) => {
    const categoryIcons = {
      electronics: "💻",
      wallet: "👛",
      keys: "🔑",
      phone: "📱",
      documents: "📄",
      jewelry: "💎",
      bag: "👜",
      clothing: "👕",
      other: "📦",
    };
    return categoryIcons[category] || "📦";
  };

  return (
    <div 
      className={`relative group transition-all duration-500 ${isHovered ? 'transform scale-[1.02]' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated Background Glow */}
      <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Grid Background Pattern */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
        }}
      ></div>

      <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden transition-all duration-300 group-hover:border-cyan-500/30">
        {/* Image/Thumbnail Section */}
        <div className="relative h-48 overflow-hidden">
          {item.imageUrl || item.images?.[0] ? (
            <div className="relative w-full h-full">
              <img
                src={item.imageUrl || item.images[0]?.url}
                alt={item.title || item.name}
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0A0F29]/80 to-[#1E1B4B]/80">
              <div className="text-4xl mb-3 animate-float">
                {getCategoryIcon(item.category)}
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-400">No Image</p>
                <p className="text-xs text-gray-500 mt-1">{item.category}</p>
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-3 right-3 z-10">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm border bg-gradient-to-r ${
                statusColors[item.status] || "from-gray-500/20 to-gray-700/20 text-gray-300 border-gray-500/30"
              }`}
            >
              {getStatusText(item.status)}
            </span>
          </div>

          {/* Category Badge */}
          <div className="absolute top-3 left-3 z-10">
            <div className="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30">
              {item.category?.toUpperCase() || "ITEM"}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6">
          {/* Title */}
          <h3 className="font-bold text-lg text-white mb-2 group-hover:text-cyan-300 transition-colors duration-300">
            {item.title || item.name}
            {item.reward && (
              <span className="ml-2 text-xs px-2 py-0.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 rounded border border-yellow-500/30">
                ${item.reward} Reward
              </span>
            )}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-300 mb-4 leading-relaxed">
            {truncateText(item.description, 100)}
          </p>

          {/* Details Grid */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                <FiMapPin className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">Location</p>
                <p className="text-sm text-white">
                  {item.locationLost?.name || item.locationFound?.name || item.location || "Unknown"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                <FiCalendar className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">
                  {item.dateLost ? "Date Lost" : item.dateFound ? "Date Found" : "Date"}
                </p>
                <p className="text-sm text-white">
                  {formatDate(item.dateLost || item.dateFound || item.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                <FiTag className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">Category</p>
                <p className="text-sm text-white capitalize">
                  {item.category || "Uncategorized"}
                </p>
              </div>
            </div>
          </div>

          {/* Confidence Score (for matches) */}
          {(item.confidenceScore > 0 || item.aiScore > 0) && (
            <div className="mb-4 p-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FaChartLine className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-medium text-cyan-300">Match Confidence</span>
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  {Math.round((item.confidenceScore || item.aiScore || 0) * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    (item.confidenceScore || item.aiScore) >= 0.8
                      ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                      : (item.confidenceScore || item.aiScore) >= 0.6
                      ? "bg-gradient-to-r from-yellow-400 to-orange-400"
                      : "bg-gradient-to-r from-red-400 to-pink-400"
                  }`}
                  style={{ 
                    width: `${Math.round((item.confidenceScore || item.aiScore || 0) * 100)}%` 
                  }}
                />
              </div>
            </div>
          )}

          {/* Value/Reward Info */}
          {(item.estimatedValue || item.reward) && (
            <div className="mb-4 p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20">
              <div className="flex items-center justify-between">
                {item.estimatedValue && (
                  <div>
                    <p className="text-xs text-yellow-300">Estimated Value</p>
                    <p className="text-lg font-bold text-white">${item.estimatedValue}</p>
                  </div>
                )}
                {item.reward && (
                  <div className="text-right">
                    <p className="text-xs text-emerald-300">Reward Offered</p>
                    <p className="text-lg font-bold text-emerald-400">${item.reward}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="pt-4 border-t border-white/10">
              <Link
                to={`/item/${item.id}`}
                className="group relative w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-sm border border-cyan-500/30 text-cyan-300 rounded-xl hover:border-cyan-400 hover:text-cyan-200 transition-all duration-300"
              >
                <span className="flex items-center gap-2">
                  <FiEye className="group-hover:scale-110 transition-transform" />
                  View Details
                </span>
                <FiArrowRight className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </div>
          )}

          {/* ID Badge */}
          <div className="mt-3 text-center">
            <span className="text-xs text-gray-500">ID: {item.id?.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>

        {/* Hover Effect Lines */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent transform translate-x-full group-hover:-translate-x-full transition-transform duration-1000"></div>
        </div>
      </div>

      {/* Floating Particles Effect */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-float"
            style={{
              left: `${20 + i * 30}%`,
              top: '10%',
              animationDelay: `${i * 0.5}s`,
              animationDuration: '3s',
            }}
          />
        ))}
        {[...Array(2)].map((_, i) => (
          <div
            key={i + 3}
            className="absolute w-1 h-1 bg-purple-400 rounded-full animate-float"
            style={{
              right: `${20 + i * 25}%`,
              bottom: '15%',
              animationDelay: `${0.3 + i * 0.4}s`,
              animationDuration: '4s',
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ItemCard;