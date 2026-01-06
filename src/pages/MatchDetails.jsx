import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiArrowLeft,
  FiMessageCircle,
  FiStar,
  FiAlertTriangle,
  FiPackage,
  FiUser,
  FiCalendar,
  FiMapPin,
  FiShield,
} from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";
import { getMatch, getLostItem, getFoundItem } from "../services/firestore";
import {
  verifyMatch,
  markAsRecovered,
  createRecoveryEntry,
  createChatChannel,
} from "../services/matching";
import { verifyAllQuizAnswers } from "../utils/ai";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";

const MatchDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [match, setMatch] = useState(null);
  const [lostItem, setLostItem] = useState(null);
  const [foundItem, setFoundItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [recovering, setRecovering] = useState(false);

  // 3 MCQ verification state - track selected answer for each question
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchMatchData();
  }, [id, user]);

  const fetchMatchData = async () => {
    try {
      setLoading(true);
      const matchData = await getMatch(id);

      if (!matchData) {
        toast.error("Match not found");
        navigate("/dashboard");
        return;
      }

      // Check if user is a participant
      if (matchData.ownerId !== user.uid && matchData.finderId !== user.uid) {
        toast.error("You do not have access to this match");
        navigate("/dashboard");
        return;
      }

      setMatch(matchData);

      // Fetch related items
      const [lost, found] = await Promise.all([
        getLostItem(matchData.lostItemId),
        getFoundItem(matchData.foundItemId),
      ]);

      setLostItem(lost);
      setFoundItem(found);
    } catch (error) {
      console.error("Error fetching match:", error);
      toast.error("Failed to load match details");
    } finally {
      setLoading(false);
    }
  };

  const isOwner = user?.uid === match?.ownerId;
  const isFinder = user?.uid === match?.finderId;

  // Get questions array from quiz
  const questions = match?.verificationQuiz?.questions || [];
  const hasMultipleQuestions = questions.length > 1;

  // Check if all questions are answered
  const allQuestionsAnswered =
    questions.length > 0 &&
    Object.keys(selectedAnswers).length === questions.length;

  const handleSelectAnswer = (questionIndex, optionIndex) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();

    // Validate all questions are answered
    if (!allQuestionsAnswered) {
      toast.error(`Please answer all ${questions.length} questions`);
      return;
    }

    try {
      setVerifying(true);

      // Convert selectedAnswers object to array
      const answersArray = questions.map((_, idx) => selectedAnswers[idx]);

      // Verify all answers
      const result = verifyAllQuizAnswers(questions, answersArray);

      await verifyMatch(id, answersArray, result);

      if (result.passed) {
        toast.success(
          `🎉 Verification successful! You got ${result.correctCount}/${result.total} correct.`
        );
      } else {
        toast.error(
          `Verification failed. You got ${result.correctCount}/${result.total} correct. Need at least 2 correct answers.`
        );
      }

      // Refresh data
      await fetchMatchData();
    } catch (error) {
      console.error("Error verifying:", error);
      toast.error("Failed to submit verification");
    } finally {
      setVerifying(false);
    }
  };

  // Simple similarity check
  const calculateSimilarity = (str1, str2) => {
    const words1 = new Set(str1.split(/\s+/).filter((w) => w.length > 2));
    const words2 = new Set(str2.split(/\s+/).filter((w) => w.length > 2));
    if (words1.size === 0 || words2.size === 0) return 0;
    const intersection = [...words1].filter((x) => words2.has(x)).length;
    return intersection / Math.max(words1.size, words2.size);
  };

  const handleMarkRecovered = async () => {
    if (!window.confirm("Confirm that you have received your item?")) return;

    try {
      setRecovering(true);

      await markAsRecovered(id, match.lostItemId, match.foundItemId);

      // Create recovery entry for public ledger
      try {
        await createRecoveryEntry(match, lostItem, foundItem);
      } catch (err) {
        console.warn("Could not create recovery entry:", err);
      }

      toast.success(
        "🎉 Congratulations! Your item has been marked as recovered!"
      );
      await fetchMatchData();
    } catch (error) {
      console.error("Error marking as recovered:", error);
      toast.error("Failed to mark as recovered");
    } finally {
      setRecovering(false);
    }
  };

  const handleStartChat = async () => {
    try {
      const channel = await createChatChannel(match);
      toast.success("Chat channel created!");
      // In a full implementation, you'd navigate to the chat page
      // navigate(`/chat/${channel.id}`);
    } catch (error) {
      console.error("Error creating chat:", error);
      toast.error("Failed to start chat");
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending_verification: {
        color: "bg-yellow-100 text-yellow-800 border-yellow-300",
        icon: FiClock,
        text: "Pending Verification",
      },
      verified: {
        color: "bg-green-100 text-green-800 border-green-300",
        icon: FiCheckCircle,
        text: "Verified",
      },
      verification_failed: {
        color: "bg-red-100 text-red-800 border-red-300",
        icon: FiXCircle,
        text: "Verification Failed",
      },
      recovered: {
        color: "bg-purple-100 text-purple-800 border-purple-300",
        icon: FiStar,
        text: "Recovered!",
      },
    };
    return statusMap[status] || statusMap.pending_verification;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Match not found</h2>
        <Link
          to="/dashboard"
          className="text-primary-600 hover:underline mt-4 inline-block"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const statusInfo = getStatusBadge(match.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <Link
        to="/dashboard"
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <FiArrowLeft className="w-5 h-5 mr-2" />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Match Details</h1>
            <p className="text-gray-600 mt-1">
              Match Score:{" "}
              <span className="font-semibold text-primary-600">
                {Math.round((match.aiScore || 0) * 100)}%
              </span>
            </p>
          </div>
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full border ${statusInfo.color}`}
          >
            <StatusIcon className="w-5 h-5" />
            <span className="font-medium">{statusInfo.text}</span>
          </div>
        </div>
      </div>

      {/* Items Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Lost Item */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <FiAlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold">Lost Item</h2>
            {isOwner && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                Your Item
              </span>
            )}
          </div>

          {lostItem ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">{lostItem.title}</h3>
              <p className="text-sm text-gray-600">{lostItem.description}</p>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FiMapPin className="w-4 h-4" />
                <span>{lostItem.locationLost?.name || "Unknown"}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FiCalendar className="w-4 h-4" />
                <span>Lost: {formatDate(lostItem.dateLost)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FiUser className="w-4 h-4" />
                <span>Owner: {lostItem.ownerName || "Anonymous"}</span>
              </div>

              {lostItem.images?.[0] && (
                <img
                  src={
                    typeof lostItem.images[0] === "string"
                      ? lostItem.images[0]
                      : lostItem.images[0]?.url
                  }
                  alt={lostItem.title}
                  className="w-full h-40 object-cover rounded-lg mt-3"
                />
              )}
            </div>
          ) : (
            <p className="text-gray-500">Item details unavailable</p>
          )}
        </div>

        {/* Found Item */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiPackage className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold">Found Item</h2>
            {isFinder && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                You Found
              </span>
            )}
          </div>

          {foundItem ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">{foundItem.title}</h3>
              {/* Hide description from owner since it's used for verification questions */}
              {isFinder ? (
                <p className="text-sm text-gray-600">{foundItem.description}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  🔒 Description hidden for verification security
                </p>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FiMapPin className="w-4 h-4" />
                <span>{foundItem.locationFound?.name || "Unknown"}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FiCalendar className="w-4 h-4" />
                <span>Found: {formatDate(foundItem.dateFound)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FiUser className="w-4 h-4" />
                <span>Finder: {foundItem.finderName || "Anonymous"}</span>
              </div>

              {foundItem.images?.[0] && (
                <img
                  src={
                    typeof foundItem.images[0] === "string"
                      ? foundItem.images[0]
                      : foundItem.images[0]?.url
                  }
                  alt={foundItem.title}
                  className="w-full h-40 object-cover rounded-lg mt-3"
                />
              )}
            </div>
          ) : (
            <p className="text-gray-500">Item details unavailable</p>
          )}
        </div>
      </div>

      {/* Verification Section - Only for Owner */}
      {isOwner && match.status === "pending_verification" && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg border border-blue-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <FiShield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Verify Your Ownership
              </h2>
              <p className="text-gray-600">
                Answer {questions.length} verification question
                {questions.length > 1 ? "s" : ""} to prove this is your item.
                {hasMultipleQuestions &&
                  " You need at least 2 correct answers to pass."}
              </p>
              {match.verificationQuiz?.generatedByAI && (
                <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full mt-1">
                  ✨ AI-Generated Questions
                </span>
              )}
            </div>
          </div>

          {/* Hint if available */}
          {match.verificationQuiz?.hint && (
            <p className="text-sm text-blue-600 italic mb-4 bg-blue-50 p-3 rounded-lg">
              💡 Hint: {match.verificationQuiz.hint}
            </p>
          )}

          {/* Progress indicator */}
          {hasMultipleQuestions && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-600">Progress:</span>
              <div className="flex gap-1">
                {questions.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-8 h-2 rounded-full transition-colors ${
                      selectedAnswers[idx] !== undefined
                        ? "bg-blue-500"
                        : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                {Object.keys(selectedAnswers).length}/{questions.length}{" "}
                answered
              </span>
            </div>
          )}

          <form onSubmit={handleVerifySubmit} className="space-y-6">
            {questions.map((q, qIdx) => (
              <div
                key={qIdx}
                className="bg-white rounded-lg p-4 border border-blue-200"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      q.difficulty === "easy"
                        ? "bg-green-100 text-green-700"
                        : q.difficulty === "hard"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {q.difficulty === "easy"
                      ? "🟢 Easy"
                      : q.difficulty === "hard"
                      ? "🔴 Hard"
                      : "🟡 Medium"}
                  </span>
                  <span className="text-sm text-gray-500">
                    Question {qIdx + 1} of {questions.length}
                  </span>
                </div>

                <p className="text-lg font-medium text-gray-900 mb-4">
                  {q.question}
                </p>

                <div className="space-y-2">
                  {q.options.map((option, optIdx) => (
                    <label
                      key={optIdx}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedAnswers[qIdx] === optIdx
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${qIdx}`}
                        value={optIdx}
                        checked={selectedAnswers[qIdx] === optIdx}
                        onChange={() => handleSelectAnswer(qIdx, optIdx)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="font-medium text-gray-700 w-6">
                        {String.fromCharCode(65 + optIdx)}.
                      </span>
                      <span className="text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="submit"
              disabled={verifying || !allQuestionsAnswered}
              className="w-full btn-primary py-3 disabled:opacity-50"
            >
              {verifying
                ? "Verifying..."
                : allQuestionsAnswered
                ? "Submit All Answers"
                : `Answer all ${questions.length} questions to continue`}
            </button>
          </form>
        </div>
      )}

      {/* Verification Failed */}
      {match.status === "verification_failed" && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6 mb-6">
          <div className="flex items-center gap-3">
            <FiXCircle className="w-8 h-8 text-red-600" />
            <div>
              <h2 className="text-lg font-semibold text-red-800">
                Verification Failed
              </h2>
              <p className="text-red-600">
                {match.verificationQuiz?.correctCount !== undefined
                  ? `You got ${match.verificationQuiz.correctCount}/${match.verificationQuiz.totalQuestions} correct. You needed at least 2 correct answers.`
                  : "Your answers did not match the expected verification."}{" "}
                If you believe this is an error, please contact support.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Verified - Actions Available */}
      {match.status === "verified" && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FiCheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <h2 className="text-lg font-semibold text-green-800">
                Ownership Verified!
              </h2>
              <p className="text-green-600">
                {match.verificationQuiz?.correctCount !== undefined
                  ? `You got ${match.verificationQuiz.correctCount}/${match.verificationQuiz.totalQuestions} correct! `
                  : ""}
                You can now coordinate with the {isOwner ? "finder" : "owner"}{" "}
                to retrieve the item.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {isOwner && (
              <button
                onClick={handleMarkRecovered}
                disabled={recovering}
                className="btn-primary py-2 px-6 disabled:opacity-50"
              >
                {recovering ? "Processing..." : "✅ I Got My Item Back!"}
              </button>
            )}

            <button
              onClick={handleStartChat}
              className="btn-secondary py-2 px-6 flex items-center gap-2"
            >
              <FiMessageCircle className="w-5 h-5" />
              Contact {isOwner ? "Finder" : "Owner"}
            </button>
          </div>

          {/* Contact Info */}
          <div className="mt-6 p-4 bg-white rounded-lg border border-green-200">
            <h3 className="font-medium text-gray-900 mb-2">
              Contact Information
            </h3>
            <p className="text-gray-600">
              {isOwner ? (
                <>
                  Finder:{" "}
                  <span className="font-medium">{match.finderName}</span>
                </>
              ) : (
                <>
                  Owner: <span className="font-medium">{match.ownerName}</span>
                </>
              )}
            </p>
            {foundItem?.currentStorageLocation && (
              <p className="text-gray-600 mt-1">
                Item location:{" "}
                <span className="font-medium">
                  {foundItem.currentStorageLocation}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recovered - Success! */}
      {match.status === "recovered" && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6 mb-6 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-purple-800 mb-2">
            Item Recovered!
          </h2>
          <p className="text-purple-600 mb-4">
            Congratulations! This item has been successfully returned to its
            owner.
          </p>
          <p className="text-sm text-gray-500">
            Recovered on: {formatDate(match.recoveredAt)}
          </p>
        </div>
      )}

      {/* Finder Waiting Message */}
      {isFinder && match.status === "pending_verification" && (
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6 mb-6">
          <div className="flex items-center gap-3">
            <FiClock className="w-8 h-8 text-yellow-600" />
            <div>
              <h2 className="text-lg font-semibold text-yellow-800">
                Waiting for Owner Verification
              </h2>
              <p className="text-yellow-600">
                The owner needs to verify their ownership before you can
                proceed. You'll be notified once they complete verification.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-4">Match Timeline</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5"></div>
            <div>
              <p className="font-medium">Match Created</p>
              <p className="text-sm text-gray-500">
                {formatDate(match.createdAt)}
              </p>
            </div>
          </div>

          {match.verificationQuiz?.submittedAt && (
            <div className="flex items-start gap-4">
              <div
                className={`w-3 h-3 rounded-full mt-1.5 ${
                  match.status === "verification_failed"
                    ? "bg-red-500"
                    : "bg-green-500"
                }`}
              ></div>
              <div>
                <p className="font-medium">
                  Verification{" "}
                  {match.status === "verification_failed"
                    ? "Failed"
                    : "Submitted"}
                </p>
                <p className="text-sm text-gray-500">
                  {formatDate(match.verificationQuiz.submittedAt)}
                </p>
              </div>
            </div>
          )}

          {match.status === "recovered" && match.recoveredAt && (
            <div className="flex items-start gap-4">
              <div className="w-3 h-3 bg-purple-500 rounded-full mt-1.5"></div>
              <div>
                <p className="font-medium">Item Recovered!</p>
                <p className="text-sm text-gray-500">
                  {formatDate(match.recoveredAt)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchDetails;
