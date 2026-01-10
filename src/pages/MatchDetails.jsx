import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiXCircle,
  FiMessageCircle,
  FiMapPin,
  FiCalendar,
  FiTag,
  FiUser,
  FiAlertCircle,
  FiShield,
  FiTarget,
} from "react-icons/fi";
import {
  FaRocket,
  FaHandshake,
  FaFingerprint,
  FaShieldAlt,
  FaSatelliteDish,
  FaChartLine,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import { getMatch, updateMatchStatus } from "../services/firestore";
import { verifyMatch } from "../services/matching";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";

const MatchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    fetchMatch();
  }, [id]);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener("scroll", handleScroll);
    setIsVisible(true);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const fetchMatch = async () => {
    try {
      setLoading(true);
      const matchData = await getMatch(id);
      setMatch(matchData);
    } catch (error) {
      console.error("Error fetching match:", error);
      toast.error("Failed to load match details");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (isValid) => {
    if (!user || !match) return;

    try {
      setVerifying(true);
      
      if (isValid) {
        await verifyMatch(match.id, user.uid);
        toast.success("Match verified successfully!");
      } else {
        await updateMatchStatus(match.id, "rejected");
        toast.info("Match rejected");
      }
      
      fetchMatch();
    } catch (error) {
      console.error("Error verifying match:", error);
      toast.error("Failed to verify match");
    } finally {
      setVerifying(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      pending_verification: {
        color: "from-orange-500/20 to-yellow-500/20 text-orange-300",
        icon: FiAlertCircle,
        text: "Verification Required",
      },
      verified: {
        color: "from-green-500/20 to-emerald-500/20 text-green-300",
        icon: FiCheckCircle,
        text: "Verified",
      },
      rejected: {
        color: "from-red-500/20 to-pink-500/20 text-red-300",
        icon: FiXCircle,
        text: "Rejected",
      },
      recovered: {
        color: "from-emerald-500/20 to-teal-500/20 text-emerald-300",
        icon: FiCheckCircle,
        text: "Recovered",
      },
    };
    return statusMap[status] || statusMap.pending_verification;
  };

  if (loading) {
    return (
      <div className="relative min-h-[80vh] bg-gradient-to-br from-[#0A0F29] via-[#111827] to-[#1E1B4B] flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute inset-0 animate-ping opacity-20">
              <div className="w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
          </div>
          <p className="text-cyan-200 mt-4 animate-pulse">Loading Match Details...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="container mx-auto px-4 py-8 text-center relative">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl"></div>
        </div>
        <FaHandshake className="w-24 h-24 mx-auto text-cyan-400/50 mb-6 animate-float" />
        <h1 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          Match Not Found
        </h1>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          This match doesn't exist or has been resolved
        </p>
        <Link 
          to="/dashboard" 
          className="group relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 backdrop-blur-sm border border-cyan-500/30 rounded-xl hover:border-cyan-400 transition-all duration-300"
        >
          <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const statusInfo = getStatusInfo(match.status);
  const StatusIcon = statusInfo.icon;
  const isOwner = user && match.ownerId === user.uid;
  const isFinder = user && match.finderId === user.uid;
  const canVerify = isOwner && match.status === "pending_verification";

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#0A0F29] via-[#111827] to-[#1E1B4B] text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 animate-slide"></div>
        <div className="absolute top-20 right-10 w-[200px] h-[200px] bg-cyan-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-[250px] h-[250px] bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          transform: `translateY(${scrollY * 0.2}px)`,
        }}></div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        {/* Header */}
        <div className={`mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <Link
            to="/dashboard"
            className="group inline-flex items-center text-cyan-300 hover:text-cyan-400 mb-6 transition-colors"
          >
            <div className="relative">
              <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
              <div className="absolute -inset-4 bg-cyan-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            Back to Dashboard
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-4 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r ${statusInfo.color} backdrop-blur-sm border flex items-center gap-2`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusInfo.text}
                </span>
                <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30">
                  MATCH #{id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Potential Match Found
              </h1>
              <p className="text-gray-400">
                AI Confidence Score: <span className="text-cyan-400 font-bold text-xl">{Math.round((match.aiScore || 0) * 100)}%</span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Match Score Card */}
            <div className={`bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <FaChartLine className="text-cyan-400" />
                Match Analysis
              </h2>
              
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Overall Confidence</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    {Math.round((match.aiScore || 0) * 100)}%
                  </span>
                </div>
                <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.round((match.aiScore || 0) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <FaFingerprint className="text-cyan-400" />
                    Title Similarity
                  </h3>
                  <div className="text-3xl font-bold text-cyan-400">
                    {Math.round((match.breakdown?.title || 0) * 100)}%
                  </div>
                </div>
                
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <FaSatelliteDish className="text-purple-400" />
                    Location Match
                  </h3>
                  <div className="text-3xl font-bold text-purple-400">
                    {Math.round((match.breakdown?.location || 0) * 100)}%
                  </div>
                </div>
                
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <FiTarget className="text-emerald-400" />
                    Description Match
                  </h3>
                  <div className="text-3xl font-bold text-emerald-400">
                    {Math.round((match.breakdown?.description || 0) * 100)}%
                  </div>
                </div>
                
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <FiCalendar className="text-orange-400" />
                    Time Match
                  </h3>
                  <div className="text-3xl font-bold text-orange-400">
                    {Math.round((match.breakdown?.temporal || 0) * 100)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Items Comparison */}
            <div className={`bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{animationDelay: '0.1s'}}>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <FaHandshake className="text-emerald-400" />
                Items Comparison
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Lost Item */}
                <div className="group relative p-6 rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent hover:scale-[1.02] transition-all duration-300">
                  <div className="absolute -inset-4 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500/30 flex items-center justify-center">
                        <FiAlertCircle className="w-6 h-6 text-red-400" />
                      </div>
                      <h3 className="text-xl font-bold">Lost Item</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-400">Title</p>
                        <p className="text-lg font-semibold">{match.lostItemTitle}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-400">Description</p>
                        <p className="text-gray-300">{match.lostItemDescription}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-400">Location</p>
                          <p className="font-medium">{match.lostLocation?.name || "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Date Lost</p>
                          <p className="font-medium">{formatDate(match.lostDate)}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-400">Reported By</p>
                        <p className="font-medium">{match.ownerName}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Found Item */}
                <div className="group relative p-6 rounded-xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent hover:scale-[1.02] transition-all duration-300">
                  <div className="absolute -inset-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                        <FiCheckCircle className="w-6 h-6 text-green-400" />
                      </div>
                      <h3 className="text-xl font-bold">Found Item</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-400">Title</p>
                        <p className="text-lg font-semibold">{match.foundItemTitle}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-400">Description</p>
                        <p className="text-gray-300">{match.foundItemDescription}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-400">Location Found</p>
                          <p className="font-medium">{match.foundLocation?.name || "Unknown"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Date Found</p>
                          <p className="font-medium">{formatDate(match.foundDate)}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-400">Found By</p>
                        <p className="font-medium">{match.finderName}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Verification Actions */}
            {canVerify && (
              <div className={`bg-gradient-to-br from-orange-500/10 to-yellow-500/10 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-orange-300">
                  <FaShieldAlt className="animate-pulse" />
                  Verify Match
                </h2>
                <p className="text-sm text-orange-200/80 mb-6">
                  Is this your lost item? Please verify to complete the recovery process.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => handleVerify(true)}
                    disabled={verifying}
                    className="group w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-sm border border-emerald-500/30 text-emerald-300 rounded-xl hover:border-emerald-400 hover:text-emerald-200 transition-all duration-300 disabled:opacity-50"
                  >
                    <FiCheckCircle className="group-hover:scale-110 transition-transform" />
                    {verifying ? "Verifying..." : "Yes, This Is Mine"}
                  </button>
                  <button
                    onClick={() => handleVerify(false)}
                    disabled={verifying}
                    className="group w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-sm border border-red-500/30 text-red-300 rounded-xl hover:border-red-400 hover:text-red-200 transition-all duration-300 disabled:opacity-50"
                  >
                    <FiXCircle className="group-hover:scale-110 transition-transform" />
                    {verifying ? "Processing..." : "Not My Item"}
                  </button>
                </div>
              </div>
            )}

            {/* Contact Information */}
            {(isOwner || isFinder) && (
              <div className={`bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                  <FiMessageCircle className="text-cyan-400" />
                  Contact Information
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-xl">
                    <p className="text-sm text-gray-400">Owner</p>
                    <p className="font-medium">{match.ownerName}</p>
                    <p className="text-xs text-gray-500 mt-1">Contact to arrange pickup</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <p className="text-sm text-gray-400">Finder</p>
                    <p className="font-medium">{match.finderName}</p>
                    <p className="text-xs text-gray-500 mt-1">Has possession of item</p>
                  </div>
                </div>
                <button className="group w-full mt-4 flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-sm border border-cyan-500/30 text-cyan-300 rounded-xl hover:border-cyan-400 transition-all duration-300">
                  <FiMessageCircle className="group-hover:scale-110 transition-transform" />
                  Send Message
                </button>
              </div>
            )}

            {/* Timeline */}
            <div className={`bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{animationDelay: '0.1s'}}>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                <FaRocket className="text-purple-400" />
                Match Timeline
              </h2>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex flex-col items-center mr-4">
                    <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                    <div className="w-0.5 h-12 bg-gradient-to-b from-cyan-500 to-purple-500 mt-2"></div>
                  </div>
                  <div>
                    <p className="font-bold text-white">Match Created</p>
                    <p className="text-sm text-gray-400">{formatDate(match.createdAt)}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex flex-col items-center mr-4">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <div className="w-0.5 h-12 bg-gradient-to-b from-purple-500 to-pink-500 mt-2"></div>
                  </div>
                  <div>
                    <p className="font-bold text-white">AI Analysis</p>
                    <p className="text-sm text-gray-400">
                      Score: {Math.round((match.aiScore || 0) * 100)}%
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex flex-col items-center mr-4">
                    <div className={`w-3 h-3 rounded-full ${
                      match.status === "verified" || match.status === "recovered"
                        ? "bg-gradient-to-r from-green-500 to-emerald-500"
                        : match.status === "rejected"
                        ? "bg-gradient-to-r from-red-500 to-pink-500"
                        : "bg-gradient-to-r from-orange-500 to-yellow-500"
                    }`}></div>
                  </div>
                  <div>
                    <p className="font-bold text-white">
                      {match.status === "pending_verification" ? "Verification Pending" :
                       match.status === "verified" ? "Verified" :
                       match.status === "rejected" ? "Rejected" : "Recovered"}
                    </p>
                    <p className="text-sm text-gray-400">
                      {match.updatedAt ? formatDate(match.updatedAt) : "Pending"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Info */}
            <div className={`bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-sm rounded-2xl p-6 border border-emerald-500/30 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{animationDelay: '0.2s'}}>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-emerald-300">
                <FiShield className="animate-pulse" />
                Security Verified
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <FiCheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm text-emerald-200">Identity Verified</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <FiCheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm text-emerald-200">AI Match Verified</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <FiCheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm text-emerald-200">Encrypted Communication</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Status Indicator */}
        <div className="fixed top-8 right-8 z-50">
          <div className={`px-4 py-2 rounded-full backdrop-blur-sm border flex items-center gap-2 bg-gradient-to-r ${statusInfo.color}`}>
            <StatusIcon className="w-4 h-4" />
            <span className="font-medium">{statusInfo.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchDetail;