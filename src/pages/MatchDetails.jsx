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
  FiFlag,
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
import {
  getMatch,
  updateMatchStatus,
  getLostItem,
  getFoundItem,
  submitQuizAnswers,
  validateAndSetQuizResult,
  revertItemStatuses,
  reportMatchIssue,
  awardReputationForRecovery,
  createRecoveryEntry,
} from "../services/firestore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";

const MatchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [match, setMatch] = useState(null);
  const [lostItem, setLostItem] = useState(null);
  const [foundItem, setFoundItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Quiz and recovery states
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [showRecoveryConfirm, setShowRecoveryConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [validatingQuiz, setValidatingQuiz] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [reportReason, setReportReason] = useState("");

  // Handshake verification state
  const [handshakeInput1, setHandshakeInput1] = useState("");
  const [handshakeInput2, setHandshakeInput2] = useState("");
  const [handshakeVerified, setHandshakeVerified] = useState(false);
  const [handshakeError, setHandshakeError] = useState(false);
  const [ownerContact, setOwnerContact] = useState(null);
  const [finderContact, setFinderContact] = useState(null);

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
      console.log("Fetched match data:", matchData);

      if (!matchData) {
        setMatch(null);
        return;
      }

      setMatch(matchData);

      // Fetch contact profiles
      try {
        if (matchData.ownerId && matchData.finderId) {
          const [ownerDoc, finderDoc] = await Promise.all([
            getDoc(doc(db, "users", matchData.ownerId)),
            getDoc(doc(db, "users", matchData.finderId))
          ]);
          if (ownerDoc.exists()) setOwnerContact(ownerDoc.data());
          if (finderDoc.exists()) setFinderContact(finderDoc.data());
        }
      } catch (err) {
        console.error("Error fetching contact info:", err);
      }

      // Fetch full item details if breakdown or locations are missing
      if (
        !matchData.breakdown ||
        !matchData.lostLocation ||
        !matchData.foundLocation
      ) {
        console.log("Fetching full item details...");

        // Fetch lost and found items
        // Note: getFoundItem may fail for the owner because found_items
        // is locked to finder+admin. That's OK — we have match doc data.
        const [lostItemData, foundItemData] = await Promise.all([
          getLostItem(matchData.lostItemId),
          getFoundItem(matchData.foundItemId).catch(() => null),
        ]);

        console.log("Lost item:", lostItemData);
        console.log("Found item:", foundItemData);

        setLostItem(lostItemData);
        setFoundItem(foundItemData);

        // Update match with missing data
        setMatch((prev) => ({
          ...prev,
          breakdown: prev.breakdown || {
            title: 0,
            description: 0,
            location: 0,
            date: 0,
            category: 0,
          },
          lostLocation: prev.lostLocation || lostItemData?.locationLost,
          foundLocation: prev.foundLocation || foundItemData?.locationFound,
          lostItemTitle: prev.lostItemTitle || lostItemData?.title,
          lostItemDescription:
            prev.lostItemDescription || lostItemData?.description,
          foundItemTitle: prev.foundItemTitle || foundItemData?.title,
          foundItemDescription:
            prev.foundItemDescription || foundItemData?.description,
          lostDate: prev.lostDate || lostItemData?.dateLost,
          foundDate: prev.foundDate || foundItemData?.dateFound,
        }));
      }
    } catch (error) {
      console.error("Error fetching match:", error);
      toast.error("Failed to load match details");
    } finally {
      setLoading(false);
    }
  };

  // SECURITY: Auto-validate quiz when finder views a "quiz_submitted" match
  useEffect(() => {
    if (!match || !user) return;
    const isFinder = user.uid === match.finderId;
    if (isFinder && match.status === "quiz_submitted" && !validatingQuiz) {
      handleFinderValidation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, user]);

  /**
   * Finder auto-validates quiz when they open a quiz_submitted match.
   * Reads the answer_key subcollection (only finder can read), compares
   * with the owner's submission, and updates match status.
   */
  const handleFinderValidation = async () => {
    if (validatingQuiz) return;
    setValidatingQuiz(true);
    try {
      const result = await validateAndSetQuizResult(match.id);
      if (result.passed) {
        toast.success(
          `✅ Owner passed verification! (${result.correctCount}/${result.total} correct)`
        );
      } else {
        toast.error(
          `❌ Owner failed verification. (${result.correctCount}/${result.total} correct)`
        );
      }
      fetchMatch();
    } catch (error) {
      console.error("Error validating quiz:", error);
      toast.error("Failed to validate quiz answers");
    } finally {
      setValidatingQuiz(false);
    }
  };

  const handleVerify = async (isValid) => {
    if (!user || !match) return;

    if (!isValid) {
      // User clicked "Not My Item" → reject and revert item statuses
      try {
        setVerifying(true);
        await updateMatchStatus(match.id, "rejected");
        // SECURITY FIX: Revert items back to searchable state
        await revertItemStatuses(match.lostItemId, match.foundItemId);
        toast("Match rejected — items returned to search pool", {
          icon: "ℹ️",
          style: {
            background: "#1e293b",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
          },
        });
        fetchMatch();
      } catch (error) {
        console.error("Error rejecting match:", error);
        toast.error("Failed to reject match");
      } finally {
        setVerifying(false);
      }
      return;
    }

    // User clicked "Yes, This Is Mine" - Show quiz
    if (
      match.verificationQuiz &&
      match.verificationQuiz.questions &&
      match.verificationQuiz.questions.length > 0
    ) {
      setQuizAnswers(
        new Array(match.verificationQuiz.questions.length).fill(null)
      );
      setShowQuiz(true);
    } else {
      // No quiz available — cannot verify without quiz (security requirement)
      toast.error("Verification quiz is not ready yet. Please try again later.");
    }
  };

  /**
   * SECURITY FIX: Owner submits quiz answers to Firestore.
   * The answers are stored in the match doc, and the status changes
   * to "quiz_submitted". The FINDER's client will validate the answers
   * by reading the answer_key subcollection (which the owner can't access).
   */
  const handleSubmitQuiz = async () => {
    if (!match || !match.verificationQuiz) return;

    // Check if all questions are answered
    const unanswered = quizAnswers.some((answer) => answer === null);
    if (unanswered) {
      toast.error("Please answer all questions before submitting");
      return;
    }

    try {
      setVerifying(true);

      // Submit answers to Firestore — status becomes "quiz_submitted"
      // The finder will validate these answers on their next visit
      await submitQuizAnswers(match.id, quizAnswers);

      toast.success(
        "✅ Answers submitted! The finder will verify your responses.",
        { duration: 5000 }
      );
      setShowQuiz(false);
      fetchMatch();
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast.error("Failed to submit verification answers");
    } finally {
      setVerifying(false);
    }
  };

  const handleRecoveryConfirm = async (recovered) => {
    if (!user || !match) return;

    try {
      setConfirming(true);

      if (recovered) {
        await updateMatchStatus(match.id, "recovered");

        // SECURITY: Award reputation to SELF only.
        // Owner gets +10 for recovering their item.
        try {
          await awardReputationForRecovery(match.id, "owner");
        } catch (e) {
          console.error("Failed to award owner reputation:", e);
        }

        // Create public recovery ledger entry
        try {
          await createRecoveryEntry(match);
        } catch (e) {
          console.error("Failed to create recovery entry:", e);
        }

        toast.success("🎉 Item marked as recovered! Congratulations!");
      } else {
        toast("Item recovery pending", {
          icon: "⏳",
          style: {
            background: "#1e293b",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
          },
        });
      }

      setShowRecoveryConfirm(false);
      fetchMatch();
    } catch (error) {
      console.error("Error updating recovery status:", error);
      toast.error("Failed to update recovery status");
    } finally {
      setConfirming(false);
    }
  };

  /**
   * Handle reporting an issue on a stale verified match (hostage prevention).
   */
  const handleReportIssue = async () => {
    if (!reportReason.trim()) {
      toast.error("Please describe the issue");
      return;
    }
    try {
      await reportMatchIssue(match.id, reportReason);
      toast.success("Issue reported. An admin will review this match.");
      setShowReportIssue(false);
      setReportReason("");
      fetchMatch();
    } catch (error) {
      console.error("Error reporting issue:", error);
      toast.error("Failed to report issue");
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
      quiz_submitted: {
        color: "from-blue-500/20 to-indigo-500/20 text-blue-300",
        icon: FiShield,
        text: "Quiz Submitted — Awaiting Finder Validation",
      },
      verified: {
        color: "from-green-500/20 to-emerald-500/20 text-green-300",
        icon: FiCheckCircle,
        text: "Verified",
      },
      verification_failed: {
        color: "from-red-500/20 to-orange-500/20 text-red-300",
        icon: FiXCircle,
        text: "Verification Failed",
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
      finder_withdrawn: {
        color: "from-gray-500/20 to-slate-500/20 text-gray-300",
        icon: FiXCircle,
        text: "Finder Withdrawn",
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
          <p className="text-cyan-200 mt-4 animate-pulse">
            Loading Match Details...
          </p>
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
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
            transform: `translateY(${scrollY * 0.2}px)`,
          }}
        ></div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        {/* Header */}
        <div
          className={`mb-8 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
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
                <span
                  className={`px-4 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r ${statusInfo.color} backdrop-blur-sm border flex items-center gap-2`}
                >
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
                AI Confidence Score:{" "}
                <span className="text-cyan-400 font-bold text-xl">
                  {Math.round((match.aiScore || 0) * 100)}%
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Match Score Card */}
            <div
              className={`bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 transition-all duration-1000 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
            >
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
                    style={{
                      width: `${Math.round((match.aiScore || 0) * 100)}%`,
                    }}
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
                    {Math.round((match.breakdown?.date || 0) * 100)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Items Comparison */}
            <div
              className={`bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 transition-all duration-1000 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
              style={{ animationDelay: "0.1s" }}
            >
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
                        <p className="text-lg font-semibold">
                          {match.lostItemTitle}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-400">Description</p>
                        <p className="text-gray-300">
                          {match.lostItemDescription}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-400">Location</p>
                          <p className="font-medium">
                            {match.lostLocation?.name ||
                              match.lostLocation?.address ||
                              match.lostLocation ||
                              "Unknown"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Date Lost</p>
                          <p className="font-medium">
                            {formatDate(match.lostDate)}
                          </p>
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
                        <p className="text-lg font-semibold">
                          {match.foundItemTitle}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-400">Description</p>
                        <p className="text-gray-300">
                          {match.foundItemDescription}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-400">
                            Location Found
                          </p>
                          <p className="font-medium">
                            {match.foundLocation?.name ||
                              match.foundLocation?.address ||
                              match.foundLocation ||
                              "Unknown"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Date Found</p>
                          <p className="font-medium">
                            {formatDate(match.foundDate)}
                          </p>
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

            {/* Zero-Trust Handshake (Physical Verification) */}
            {(match.status === "verified" || match.status === "recovered") && match.handshakePhrase && (
              <div
                className={`bg-[#0a0a1a]/80 backdrop-blur-md rounded-2xl p-8 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all duration-1000 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
                style={{ animationDelay: "0.2s" }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/50 flex items-center justify-center">
                    <FaShieldAlt className="text-cyan-400 text-2xl animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent tracking-wider">
                      ZERO-TRUST HANDSHAKE
                    </h2>
                    <p className="text-cyan-400/80 text-sm font-mono mt-1">
                      PHYSICAL VERIFICATION PROTOCOL
                    </p>
                  </div>
                </div>

                {handshakeVerified ? (
                  /* Success state */
                  <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                    <div className="text-5xl mb-4">✅</div>
                    <h3 className="text-xl font-bold text-emerald-300 mb-2">Handshake Verified!</h3>
                    <p className="text-emerald-200/70 text-sm">Both halves of the phrase have been confirmed. It is safe to proceed with the item exchange.</p>
                  </div>
                ) : (
                  /* Verification protocol */
                  <>
                    {/* Step 1: Your words — say these aloud */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-xs font-bold text-cyan-300">1</div>
                        <p className="text-sm font-semibold text-cyan-300 uppercase tracking-wider">Say your words aloud to the other person</p>
                      </div>
                      <div className="flex gap-3 justify-center p-4 bg-black/40 rounded-xl border border-white/5">
                        <div className={`px-6 py-3 rounded-lg font-mono text-xl font-bold tracking-widest shadow-lg ${
                          isOwner 
                            ? 'bg-gradient-to-b from-cyan-500/20 to-transparent border-t-2 border-cyan-400 text-cyan-300'
                            : 'bg-gradient-to-b from-purple-500/20 to-transparent border-t-2 border-purple-400 text-purple-300'
                        }`}>
                          {isOwner ? match.handshakePhrase[0].toUpperCase() : match.handshakePhrase[2].toUpperCase()}
                        </div>
                        <div className={`px-6 py-3 rounded-lg font-mono text-xl font-bold tracking-widest shadow-lg ${
                          isOwner 
                            ? 'bg-gradient-to-b from-cyan-500/20 to-transparent border-t-2 border-cyan-400 text-cyan-300'
                            : 'bg-gradient-to-b from-purple-500/20 to-transparent border-t-2 border-purple-400 text-purple-300'
                        }`}>
                          {isOwner ? match.handshakePhrase[1].toUpperCase() : match.handshakePhrase[3].toUpperCase()}
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Type what the other person says */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-xs font-bold text-purple-300">2</div>
                        <p className="text-sm font-semibold text-purple-300 uppercase tracking-wider">
                          Type what the {isOwner ? 'finder' : 'owner'} says to you
                        </p>
                      </div>
                      <div className="flex gap-3 justify-center p-4 bg-black/40 rounded-xl border border-white/5">
                        <input
                          type="text"
                          value={handshakeInput1}
                          onChange={(e) => { setHandshakeInput1(e.target.value); setHandshakeError(false); }}
                          placeholder="Word 1"
                          className={`w-36 px-4 py-3 bg-white/5 border rounded-lg font-mono text-lg text-center text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                            handshakeError ? 'border-red-500/50 focus:ring-red-500' : 'border-white/10 focus:ring-cyan-500'
                          }`}
                        />
                        <input
                          type="text"
                          value={handshakeInput2}
                          onChange={(e) => { setHandshakeInput2(e.target.value); setHandshakeError(false); }}
                          placeholder="Word 2"
                          className={`w-36 px-4 py-3 bg-white/5 border rounded-lg font-mono text-lg text-center text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                            handshakeError ? 'border-red-500/50 focus:ring-red-500' : 'border-white/10 focus:ring-cyan-500'
                          }`}
                        />
                      </div>
                      {handshakeError && (
                        <p className="text-red-400 text-sm text-center mt-3 font-mono animate-pulse">
                          ❌ Words do not match. Do NOT hand over the item!
                        </p>
                      )}
                    </div>

                    {/* Verify Button */}
                    <button
                      onClick={() => {
                        const expectedWords = isOwner
                          ? [match.handshakePhrase[2], match.handshakePhrase[3]]
                          : [match.handshakePhrase[0], match.handshakePhrase[1]];
                        const input1 = handshakeInput1.trim().toLowerCase();
                        const input2 = handshakeInput2.trim().toLowerCase();
                        if (
                          input1 === expectedWords[0].toLowerCase() &&
                          input2 === expectedWords[1].toLowerCase()
                        ) {
                          setHandshakeVerified(true);
                          setHandshakeError(false);
                          toast.success("Handshake verified! Safe to exchange.");
                        } else {
                          setHandshakeError(true);
                          toast.error("Handshake failed! Words do not match.");
                        }
                      }}
                      disabled={!handshakeInput1.trim() || !handshakeInput2.trim()}
                      className="w-full py-3 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 rounded-xl font-semibold text-cyan-300 hover:border-cyan-400 hover:text-cyan-200 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <FaShieldAlt />
                      Verify Handshake
                    </button>
                  </>
                )}
                
                <div className="mt-6 text-center text-xs text-gray-500 font-mono tracking-widest">
                  YOUR ROLE: <span className={isOwner ? "text-cyan-400" : "text-purple-400"}>{isOwner ? "OWNER (WORDS 1-2)" : "FINDER (WORDS 3-4)"}</span>
                </div>

                <div className="mt-4 p-3 bg-cyan-950/30 rounded-xl border border-cyan-900/50 text-xs text-cyan-200/50 font-mono">
                  <p className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">🔒</span>
                    Each person only sees their own half. You verify the other person by typing what they say. If the words don't match, do NOT exchange the item.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Verification Actions */}
            {canVerify && (
              <div
                className={`bg-gradient-to-br from-orange-500/10 to-yellow-500/10 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30 transition-all duration-1000 ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-10"
                }`}
              >
                <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-orange-300">
                  <FaShieldAlt className="animate-pulse" />
                  Verify Match
                </h2>
                <p className="text-sm text-orange-200/80 mb-6">
                  Is this your lost item? Please verify to complete the recovery
                  process.
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

            {/* Recovery Confirmation - Show after verification */}
            {isOwner && match.status === "verified" && (
              <div
                className={`bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-sm rounded-2xl p-6 border border-emerald-500/30 transition-all duration-1000 ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-10"
                }`}
              >
                <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-emerald-300">
                  <FiCheckCircle className="animate-pulse" />
                  Confirm Recovery
                </h2>
                {!handshakeVerified ? (
                  <p className="text-sm text-orange-300/90 mb-6 flex items-start gap-2">
                    <FiAlertCircle className="mt-0.5" />
                    Please complete the Zero-Trust Handshake verification first to unlock recovery confirmation.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-emerald-200/80 mb-6">
                      Have you successfully received your item from the finder?
                    </p>
                    <div className="space-y-3">
                  <button
                    onClick={() => handleRecoveryConfirm(true)}
                    disabled={confirming}
                    className="group w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-sm border border-emerald-500/30 text-emerald-300 rounded-xl hover:border-emerald-400 hover:text-emerald-200 transition-all duration-300 disabled:opacity-50"
                  >
                    <FiCheckCircle className="group-hover:scale-110 transition-transform" />
                    {confirming ? "Confirming..." : "Yes, I Got My Item!"}
                  </button>
                  <button
                    onClick={() => handleRecoveryConfirm(false)}
                    disabled={confirming}
                    className="group w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-500/20 to-gray-600/20 backdrop-blur-sm border border-gray-500/30 text-gray-300 rounded-xl hover:border-gray-400 hover:text-gray-200 transition-all duration-300 disabled:opacity-50"
                  >
                    <FiXCircle className="group-hover:scale-110 transition-transform" />
                    {confirming ? "Processing..." : "Not Yet"}
                  </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Report Issue - Hostage Prevention (show for verified matches) */}
            {isOwner && match.status === "verified" && !match.ownerReportedIssue && (
              <div
                className={`bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-sm rounded-2xl p-6 border border-amber-500/30 transition-all duration-1000 ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-10"
                }`}
              >
                <h2 className="text-lg font-bold mb-4 flex items-center gap-3 text-amber-300">
                  <FiFlag />
                  Having trouble getting your item?
                </h2>
                {!showReportIssue ? (
                  <button
                    onClick={() => setShowReportIssue(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl hover:border-amber-400 transition-all"
                  >
                    <FiFlag className="w-4 h-4" />
                    Report Issue
                  </button>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      placeholder="Describe the issue (e.g., finder not responding, refusing to return item...)"
                      className="w-full p-3 bg-white/5 border border-amber-500/30 rounded-xl text-white placeholder-gray-400 text-sm resize-none"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleReportIssue}
                        className="flex-1 px-4 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl hover:border-amber-400 transition-all text-sm"
                      >
                        Submit Report
                      </button>
                      <button
                        onClick={() => { setShowReportIssue(false); setReportReason(""); }}
                        className="px-4 py-2 bg-gray-500/20 border border-gray-500/30 text-gray-300 rounded-xl hover:border-gray-400 transition-all text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Issue Already Reported */}
            {match.ownerReportedIssue && (
              <div className="bg-amber-500/10 backdrop-blur-sm rounded-2xl p-4 border border-amber-500/30">
                <p className="text-amber-300 text-sm flex items-center gap-2">
                  <FiFlag className="w-4 h-4" />
                  Issue reported — admin will review this match.
                </p>
              </div>
            )}

            {/* Contact Information */}
            {(isOwner || isFinder) && (match.status === "verified" || match.status === "recovered") && (
              <div
                className={`bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 transition-all duration-1000 ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-10"
                }`}
              >
                <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                  <FiMessageCircle className="text-cyan-400" />
                  Contact Information
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-sm text-cyan-400 font-bold mb-1">Owner</p>
                    <p className="font-medium text-lg">{match.ownerName}</p>
                    {ownerContact?.phone ? (
                      <div className="mt-3 flex flex-col gap-2">
                        <a href={`tel:${ownerContact.phone}`} className="flex items-center gap-2 text-sm text-white bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 px-3 py-2 rounded-lg transition-colors">
                          📞 {ownerContact.phone}
                        </a>
                        <a href={`mailto:${ownerContact.email}`} className="flex items-center gap-2 text-sm text-white bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-2 rounded-lg transition-colors">
                          ✉️ {ownerContact.email}
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">Contact to arrange pickup</p>
                    )}
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-sm text-purple-400 font-bold mb-1">Finder</p>
                    <p className="font-medium text-lg">{match.finderName}</p>
                    {finderContact?.phone ? (
                      <div className="mt-3 flex flex-col gap-2">
                        <a href={`tel:${finderContact.phone}`} className="flex items-center gap-2 text-sm text-white bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 px-3 py-2 rounded-lg transition-colors">
                          📞 {finderContact.phone}
                        </a>
                        <a href={`mailto:${finderContact.email}`} className="flex items-center gap-2 text-sm text-white bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-2 rounded-lg transition-colors">
                          ✉️ {finderContact.email}
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">Has possession of item</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div
              className={`bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 transition-all duration-1000 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
              style={{ animationDelay: "0.1s" }}
            >
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
                    <p className="text-sm text-gray-400">
                      {formatDate(match.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex flex-col items-center mr-4">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <div className="w-0.5 h-12 bg-gradient-to-b from-purple-500 to-orange-500 mt-2"></div>
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
                    <div
                      className={`w-3 h-3 rounded-full ${
                        match.status === "verified" ||
                        match.status === "recovered"
                          ? "bg-gradient-to-r from-green-500 to-emerald-500"
                          : match.status === "rejected"
                          ? "bg-gradient-to-r from-red-500 to-pink-500"
                          : "bg-gradient-to-r from-orange-500 to-yellow-500 animate-pulse"
                      }`}
                    ></div>
                    {(match.status === "verified" ||
                      match.status === "recovered") && (
                      <div className="w-0.5 h-12 bg-gradient-to-b from-green-500 to-emerald-500 mt-2"></div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-white">
                      {match.status === "pending_verification"
                        ? "Verification Pending"
                        : match.status === "verified"
                        ? "Ownership Verified ✓"
                        : match.status === "rejected"
                        ? "Verification Failed"
                        : "Ownership Verified ✓"}
                    </p>
                    <p className="text-sm text-gray-400">
                      {match.status !== "pending_verification" &&
                      match.updatedAt
                        ? formatDate(match.updatedAt)
                        : "Awaiting verification"}
                    </p>
                  </div>
                </div>

                {/* Recovery Step - Only show if verified or recovered */}
                {(match.status === "verified" ||
                  match.status === "recovered") && (
                  <div className="flex items-start">
                    <div className="flex flex-col items-center mr-4">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          match.status === "recovered"
                            ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                            : "bg-gray-500/50 animate-pulse"
                        }`}
                      ></div>
                    </div>
                    <div>
                      <p className="font-bold text-white">
                        {match.status === "recovered"
                          ? "Item Recovered 🎉"
                          : "Recovery Pending"}
                      </p>
                      <p className="text-sm text-gray-400">
                        {match.status === "recovered" && match.recoveredAt
                          ? formatDate(match.recoveredAt)
                          : "Waiting for confirmation"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Security Info */}
            <div
              className={`bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-sm rounded-2xl p-6 border border-emerald-500/30 transition-all duration-1000 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-10"
              }`}
              style={{ animationDelay: "0.2s" }}
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-emerald-300">
                <FiShield className="animate-pulse" />
                Security Verified
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <FiCheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm text-emerald-200">
                    Identity Verified
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <FiCheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm text-emerald-200">
                    AI Match Verified
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <FiCheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm text-emerald-200">
                    Encrypted Communication
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Status Indicator */}
        <div className="fixed top-8 right-8 z-50">
          <div
            className={`px-4 py-2 rounded-full backdrop-blur-sm border flex items-center gap-2 bg-gradient-to-r ${statusInfo.color}`}
          >
            <StatusIcon className="w-4 h-4" />
            <span className="font-medium">{statusInfo.text}</span>
          </div>
        </div>
      </div>

      {/* Verification Quiz Modal */}
      {showQuiz && match.verificationQuiz && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#0A0F29] to-[#1E1B4B] border border-cyan-500/30 rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
                <FaShieldAlt className="text-cyan-400" />
                Ownership Verification
              </h2>
              <button
                onClick={() => setShowQuiz(false)}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
              <p className="text-orange-200 text-sm">
                <FiAlertCircle className="inline mr-2" />
                Please answer the following questions to verify ownership. You
                need at least{" "}
                <strong>
                  {Math.ceil((match.verificationQuiz.questions.length * 2) / 3)}{" "}
                  out of {match.verificationQuiz.questions.length}
                </strong>{" "}
                correct answers to proceed.
              </p>
            </div>

            <div className="space-y-6">
              {match.verificationQuiz.questions.map((question, qIndex) => (
                <div
                  key={qIndex}
                  className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all duration-300"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center font-bold flex-shrink-0">
                      {qIndex + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-white mb-4">
                        {question.question}
                      </p>
                      <div className="space-y-3">
                        {question.options.map((option, oIndex) => (
                          <button
                            key={oIndex}
                            onClick={() => {
                              const newAnswers = [...quizAnswers];
                              newAnswers[qIndex] = oIndex;
                              setQuizAnswers(newAnswers);
                            }}
                            className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
                              quizAnswers[qIndex] === oIndex
                                ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500/50 text-white"
                                : "bg-white/5 border-white/10 hover:border-white/30 text-gray-300"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  quizAnswers[qIndex] === oIndex
                                    ? "border-cyan-500 bg-cyan-500"
                                    : "border-gray-500"
                                }`}
                              >
                                {quizAnswers[qIndex] === oIndex && (
                                  <FiCheckCircle className="w-3 h-3 text-white" />
                                )}
                              </div>
                              <span>{option}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowQuiz(false)}
                className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitQuiz}
                disabled={verifying || quizAnswers.some((a) => a === null)}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold hover:opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifying ? "Verifying..." : "Submit Answers"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchDetail;
