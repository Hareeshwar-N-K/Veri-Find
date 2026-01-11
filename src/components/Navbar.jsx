import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  FiHome,
  FiSearch,
  FiPlusCircle,
  FiUser,
  FiLogOut,
  FiSettings,
  FiBell,
  FiChevronDown,
  FiMenu,
  FiX,
  FiGrid,
  FiStar,
  FiZap,
  FiTrendingUp,
} from "react-icons/fi";
import {
  FaRocket,
  FaChartLine,
  FaGem,
  FaRegCompass,
  FaTrophy,
} from "react-icons/fa";
import { getUserRank } from "../services/firestore";
import { formatRankDisplay, getRankTier } from "../utils/helpers";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userRank, setUserRank] = useState({
    rank: null,
    totalUsers: 0,
    reputationPoints: 0,
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);

  // Fetch user rank
  useEffect(() => {
    if (currentUser?.uid) {
      getUserRank(currentUser.uid).then(setUserRank);
    }
  }, [currentUser]);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    setIsProfileOpen(false);
    navigate("/");
  };

  const navLinks = [
    { path: "/", label: "Home", icon: FiHome },
    { path: "/report-lost", label: "Report Lost", icon: FiSearch },
    { path: "/report-found", label: "Report Found", icon: FiPlusCircle },
    { path: "/dashboard", label: "Dashboard", icon: FiGrid },
  ];

  // Mock notifications
  const notifications = [
    {
      id: 1,
      text: "New match found for your lost wallet",
      time: "2 min ago",
      read: false,
    },
    {
      id: 2,
      text: "Your found item was verified",
      time: "1 hour ago",
      read: true,
    },
    { id: 3, text: "System update completed", time: "3 hours ago", read: true },
  ];

  return (
    <>
      {/* Top Glow Line */}
      <div className="fixed inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 animate-slide z-60 shadow-lg shadow-cyan-500/20"></div>

      {/* Navbar Container */}
      <nav
        className={`fixed w-full z-50 transition-all duration-500 ${
          scrolled
            ? "bg-gradient-to-b from-gray-900/95 via-gray-900/90 to-gray-900/95 backdrop-blur-xl shadow-2xl border-b border-cyan-900/30"
            : "bg-gradient-to-b from-gray-900 via-gray-900/95 to-gray-900/90 backdrop-blur-lg"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="group flex items-center space-x-3 relative">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                  <FaRocket className="w-5 h-5 md:w-6 md:h-6 text-white transform group-hover:rotate-12 transition-transform" />
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl blur opacity-30 animate-pulse"></div>
                </div>
              </div>
              <div className="relative">
                <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
                  VeriFind
                </span>
                <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`group relative px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                    isActive(link.path)
                      ? "text-white bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 shadow-lg shadow-cyan-500/10"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <link.icon
                      className={`w-4 h-4 ${
                        isActive(link.path)
                          ? "text-cyan-300"
                          : "text-gray-400 group-hover:text-cyan-300"
                      }`}
                    />
                    {link.label}
                  </div>

                  {/* Active Indicator */}
                  {isActive(link.path) && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full"></div>
                  )}

                  {/* Hover Glow */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                </Link>
              ))}
            </div>

            {/* Right Side - Auth/User Profile */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Notifications */}
              {currentUser && (
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="relative p-2.5 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 text-cyan-300 hover:border-cyan-400 hover:text-cyan-200 transition-all duration-300 group hover:scale-105"
                  >
                    <FiBell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    {/* Unread Indicator */}
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping opacity-75"></div>
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-gray-900"></div>
                  </button>

                  {/* Notifications Dropdown */}
                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-gradient-to-b from-gray-900 to-gray-800 backdrop-blur-xl rounded-2xl shadow-2xl border border-cyan-500/30 py-3 z-50">
                      <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
                        <h3 className="text-lg font-bold text-white">
                          Notifications
                        </h3>
                        <p className="text-sm text-cyan-300">Recent alerts</p>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`px-4 py-3 hover:bg-white/5 transition-colors ${
                              !notif.read
                                ? "border-l-2 border-cyan-500 bg-cyan-500/5"
                                : ""
                            }`}
                          >
                            <p className="text-sm text-gray-200">
                              {notif.text}
                            </p>
                            <p className="text-xs text-cyan-400 mt-1">
                              {notif.time}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="px-4 pt-3 border-t border-white/10">
                        <Link
                          to="/notifications"
                          onClick={() => setIsNotificationsOpen(false)}
                          className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors flex items-center gap-1"
                        >
                          View all{" "}
                          <FiChevronDown className="w-4 h-4 rotate-90" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* User Profile */}
              {currentUser ? (
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="group flex items-center space-x-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 backdrop-blur-sm border border-cyan-500/20 hover:border-cyan-400 transition-all duration-300 hover:scale-105"
                  >
                    <div className="relative">
                      <img
                        src={
                          currentUser.photoURL ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            currentUser.displayName || "User"
                          )}&background=0A0F29&color=fff&bold=true`
                        }
                        alt={currentUser.displayName}
                        className="w-8 h-8 rounded-full border-2 border-cyan-500 group-hover:border-purple-500 transition-colors"
                      />
                      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-gray-900"></div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">
                        {currentUser.displayName?.split(" ")[0] || "User"}
                      </p>
                      <div className="flex items-center gap-1">
                        <FiTrendingUp className="w-3 h-3 text-yellow-400" />
                        <p className="text-xs text-cyan-300">
                          {formatRankDisplay(
                            userRank.rank,
                            userRank.totalUsers
                          )}
                        </p>
                      </div>
                    </div>
                    <FiChevronDown
                      className={`w-4 h-4 text-cyan-400 transition-transform duration-300 ${
                        isProfileOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Profile Dropdown */}
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-gradient-to-b from-gray-900 to-gray-800 backdrop-blur-xl rounded-2xl shadow-2xl border border-cyan-500/30 py-3 z-50">
                      <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              currentUser.photoURL ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                currentUser.displayName || "User"
                              )}&background=0A0F29&color=fff&bold=true`
                            }
                            alt={currentUser.displayName}
                            className="w-12 h-12 rounded-full border-2 border-cyan-500"
                          />
                          <div>
                            <p className="font-bold text-white">
                              {currentUser.displayName}
                            </p>
                            <p className="text-xs text-cyan-300 truncate">
                              {currentUser.email}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <FaTrophy className="w-3 h-3 text-yellow-400" />
                              <span
                                className={`text-xs font-medium bg-gradient-to-r ${
                                  getRankTier(userRank.reputationPoints).color
                                } bg-clip-text text-transparent`}
                              >
                                {getRankTier(userRank.reputationPoints).tier} •{" "}
                                {formatRankDisplay(
                                  userRank.rank,
                                  userRank.totalUsers
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="py-2 space-y-1">
                        <Link
                          to="/dashboard"
                          onClick={() => setIsProfileOpen(false)}
                          className="group flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all rounded-lg mx-2"
                        >
                          <FiGrid className="w-4 h-4 text-gray-400 group-hover:text-cyan-400" />
                          <span>Dashboard</span>
                          <FiZap className="w-3 h-3 ml-auto text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setIsProfileOpen(false)}
                          className="group flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all rounded-lg mx-2"
                        >
                          <FiUser className="w-4 h-4 text-gray-400 group-hover:text-purple-400" />
                          <span>My Profile</span>
                        </Link>
                        <Link
                          to="/settings"
                          onClick={() => setIsProfileOpen(false)}
                          className="group flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all rounded-lg mx-2"
                        >
                          <FiSettings className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
                          <span>Settings</span>
                        </Link>
                        {currentUser.role === "admin" && (
                          <Link
                            to="/admin"
                            onClick={() => setIsProfileOpen(false)}
                            className="group flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all rounded-lg mx-2"
                          >
                            <FaChartLine className="w-4 h-4 text-gray-400 group-hover:text-emerald-400" />
                            <span>Admin Panel</span>
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-white/10 pt-2 mx-2">
                        <button
                          onClick={handleLogout}
                          className="group w-full flex items-center justify-center gap-3 px-4 py-2.5 text-sm text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-all rounded-lg"
                        >
                          <FiLogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                          <span className="font-medium">Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="group px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white transition-colors relative"
                  >
                    <span className="relative">
                      Sign In
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 group-hover:w-full transition-all duration-300"></span>
                    </span>
                  </Link>
                  <Link
                    to="/register"
                    className="group relative px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-xl hover:from-cyan-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <span className="relative flex items-center gap-2">
                      <FaRocket className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                      Get Started
                    </span>
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-300 -z-10"></div>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2.5 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 text-cyan-300 hover:border-cyan-400 hover:text-cyan-200 transition-all duration-300 hover:scale-105"
            >
              {isMenuOpen ? (
                <FiX className="w-5 h-5" />
              ) : (
                <FiMenu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-gradient-to-b from-gray-900 to-gray-800 backdrop-blur-xl border-t border-cyan-500/30 shadow-2xl">
            <div className="px-4 py-6 space-y-4">
              {/* Navigation Links */}
              <div className="space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive(link.path)
                        ? "text-white bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <link.icon
                      className={`w-5 h-5 ${
                        isActive(link.path)
                          ? "text-cyan-300"
                          : "text-gray-400 group-hover:text-cyan-300"
                      }`}
                    />
                    {link.label}
                    {isActive(link.path) && (
                      <div className="ml-auto w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                    )}
                  </Link>
                ))}
              </div>

              <hr className="border-white/10" />

              {/* User Section */}
              {currentUser ? (
                <>
                  <div className="px-4 py-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-500/20">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          currentUser.photoURL ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            currentUser.displayName || "User"
                          )}&background=0A0F29&color=fff&bold=true`
                        }
                        alt={currentUser.displayName}
                        className="w-12 h-12 rounded-full border-2 border-cyan-500"
                      />
                      <div>
                        <p className="font-bold text-white">
                          {currentUser.displayName}
                        </p>
                        <p className="text-xs text-cyan-300">
                          {currentUser.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <FaTrophy className="w-3 h-3 text-yellow-400" />
                          <span
                            className={`text-xs font-medium bg-gradient-to-r ${
                              getRankTier(userRank.reputationPoints).color
                            } bg-clip-text text-transparent`}
                          >
                            {getRankTier(userRank.reputationPoints).tier} •{" "}
                            {formatRankDisplay(
                              userRank.rank,
                              userRank.totalUsers
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Link
                      to="/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                    >
                      <FiGrid className="w-5 h-5 text-gray-400" />
                      Dashboard
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                    >
                      <FiUser className="w-5 h-5 text-gray-400" />
                      My Profile
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                    >
                      <FiSettings className="w-5 h-5 text-gray-400" />
                      Settings
                    </Link>
                    {currentUser.role === "admin" && (
                      <Link
                        to="/admin"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                      >
                        <FaChartLine className="w-5 h-5 text-gray-400" />
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      <FiLogOut className="w-5 h-5" />
                      Sign Out
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <Link
                      to="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-4 py-3 text-center text-sm font-medium text-cyan-300 border border-cyan-500/30 rounded-xl hover:border-cyan-400 hover:text-cyan-200 transition-all"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-4 py-3 text-center text-sm font-medium text-white bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-xl hover:from-cyan-600 hover:via-purple-600 hover:to-pink-600 transition-all shadow-md"
                    >
                      Get Started
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Animated Particles */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-gradient-to-r from-cyan-400/50 to-purple-400/50 rounded-full animate-float"
            style={{
              top: `${5 + i * 12}%`,
              left: `${10 + i * 10}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${8 + i}s`,
            }}
          />
        ))}
      </div>

      {/* Spacer for fixed nav */}
      <div className="h-16 md:h-20"></div>
    </>
  );
}

export default Navbar;
