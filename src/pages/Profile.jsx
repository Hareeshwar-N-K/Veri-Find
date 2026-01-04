import React, { useState, useEffect } from "react";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiEdit2,
  FiSave,
  FiPackage,
  FiSearch,
  FiCheckCircle,
  FiAlertCircle,
  FiBell,
  FiClock,
  FiArrowRight,
} from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  getMyLostItems,
  getMyFoundItems,
  getMyMatches,
} from "../services/firestore";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    studentId: "",
  });

  // Items state
  const [myLostItems, setMyLostItems] = useState([]);
  const [myFoundItems, setMyFoundItems] = useState([]);
  const [myMatches, setMyMatches] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("lost"); // "lost" | "found" | "matches"

  useEffect(() => {
    fetchProfile();
    fetchUserItems();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfile(userData);
        setFormData({
          name: userData.name || "",
          phone: userData.phone || "",
          studentId: userData.studentId || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserItems = async () => {
    if (!user) return;

    try {
      setItemsLoading(true);
      const [lostItems, foundItems, matches] = await Promise.all([
        getMyLostItems(),
        getMyFoundItems(),
        getMyMatches(),
      ]);
      setMyLostItems(lostItems);
      setMyFoundItems(foundItems);
      setMyMatches(matches);
    } catch (error) {
      console.error("Error fetching user items:", error);
    } finally {
      setItemsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await updateDoc(doc(db, "users", user.uid), {
        ...formData,
        updatedAt: new Date(),
      });

      setProfile((prev) => ({ ...prev, ...formData }));
      setEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600">
          Manage your account information and settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-semibold">Personal Information</h2>
              <button
                onClick={() => setEditing(!editing)}
                className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
              >
                {editing ? (
                  <>
                    <FiSave className="w-4 h-4" />
                    <span>Save</span>
                  </>
                ) : (
                  <>
                    <FiEdit2 className="w-4 h-4" />
                    <span>Edit</span>
                  </>
                )}
              </button>
            </div>

            {editing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="input-field"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="input-field"
                      placeholder="+1 (123) 456-7890"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Student ID
                    </label>
                    <input
                      type="text"
                      value={formData.studentId}
                      onChange={(e) =>
                        setFormData({ ...formData, studentId: e.target.value })
                      }
                      className="input-field"
                      placeholder="S12345678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={user?.email || ""}
                      className="input-field bg-gray-50"
                      readOnly
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Email cannot be changed
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary px-6 py-2">
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                      <FiUser className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Full Name</p>
                      <p className="font-medium">
                        {profile?.name || "Not set"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                      <FiMail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email Address</p>
                      <p className="font-medium">{user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                      <FiPhone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone Number</p>
                      <p className="font-medium">
                        {profile?.phone || "Not set"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                      <FiCalendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Student ID</p>
                      <p className="font-medium">
                        {profile?.studentId || "Not set"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Account Created</p>
                      <p className="text-sm text-gray-600">
                        {profile?.createdAt?.toDate().toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Role</p>
                      <p className="text-sm text-gray-600 capitalize">
                        {profile?.role || "Student"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats Card - Live Data */}
          <div className="card mt-6">
            <h2 className="text-xl font-semibold mb-6">Your Activity</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-100">
                <p className="text-2xl font-bold text-red-600">
                  {myLostItems.length}
                </p>
                <p className="text-sm text-gray-600">Items Lost</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                <p className="text-2xl font-bold text-green-600">
                  {myFoundItems.length}
                </p>
                <p className="text-sm text-gray-600">Items Found</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-100 relative">
                {myMatches.filter(
                  (m) =>
                    m.status === "pending_verification" ||
                    m.status === "verification_in_progress"
                ).length > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                    {
                      myMatches.filter(
                        (m) =>
                          m.status === "pending_verification" ||
                          m.status === "verification_in_progress"
                      ).length
                    }
                  </span>
                )}
                <p className="text-2xl font-bold text-yellow-600">
                  {myMatches.length}
                </p>
                <p className="text-sm text-gray-600">Matches</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-100">
                <p className="text-2xl font-bold text-purple-600">
                  {myMatches.filter((m) => m.status === "recovered").length}
                </p>
                <p className="text-sm text-gray-600">Returned</p>
              </div>
            </div>
          </div>

          {/* My Items Card */}
          <div className="card mt-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">My Items</h2>
              <div className="flex gap-2">
                <Link
                  to="/report-lost"
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  Report Lost <FiArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("lost")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === "lost"
                    ? "bg-white text-red-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <FiSearch className="w-4 h-4" />
                Lost ({myLostItems.length})
              </button>
              <button
                onClick={() => setActiveTab("found")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === "found"
                    ? "bg-white text-green-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <FiPackage className="w-4 h-4" />
                Found ({myFoundItems.length})
              </button>
              <button
                onClick={() => setActiveTab("matches")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 relative ${
                  activeTab === "matches"
                    ? "bg-white text-yellow-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <FiBell className="w-4 h-4" />
                Matches ({myMatches.length})
                {myMatches.filter((m) => m.status === "pending_verification")
                  .length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    !
                  </span>
                )}
              </button>
            </div>

            {/* Items List */}
            {itemsLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activeTab === "lost" && (
                  <>
                    {myLostItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FiSearch className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No lost items reported yet</p>
                        <Link
                          to="/report-lost"
                          className="text-primary-600 text-sm hover:underline"
                        >
                          Report a lost item
                        </Link>
                      </div>
                    ) : (
                      myLostItems.map((item) => {
                        const hasMatch = myMatches.some(
                          (m) => m.lostItemId === item.id
                        );
                        const isRecovered = item.status === "recovered";
                        return (
                          <div
                            key={item.id}
                            className={`p-4 rounded-lg border transition-all ${
                              hasMatch && !isRecovered
                                ? "border-yellow-300 bg-yellow-50 ring-2 ring-yellow-200"
                                : isRecovered
                                ? "border-green-300 bg-green-50"
                                : "border-gray-200 bg-gray-50 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium text-gray-900">
                                    {item.title}
                                  </h3>
                                  {hasMatch && !isRecovered && (
                                    <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded-full flex items-center gap-1 animate-pulse">
                                      <FiBell className="w-3 h-3" /> Match
                                      Found!
                                    </span>
                                  )}
                                  {isRecovered && (
                                    <span className="px-2 py-0.5 bg-green-200 text-green-800 text-xs rounded-full flex items-center gap-1">
                                      <FiCheckCircle className="w-3 h-3" />{" "}
                                      Recovered
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {item.category}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <FiClock className="w-3 h-3" />
                                    {item.dateLost
                                      ?.toDate?.()
                                      ?.toLocaleDateString() || "Unknown date"}
                                  </span>
                                  <span>
                                    {item.locationLost?.name ||
                                      "Unknown location"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span
                                  className={`px-2 py-1 text-xs rounded-full font-medium ${
                                    item.status === "searching"
                                      ? "bg-blue-100 text-blue-700"
                                      : item.status === "matched"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-green-100 text-green-700"
                                  }`}
                                >
                                  {item.status === "searching"
                                    ? "Searching"
                                    : item.status === "matched"
                                    ? "Matched"
                                    : "Recovered"}
                                </span>
                                <Link
                                  to={`/item/${item.id}`}
                                  className="text-primary-600 text-sm hover:underline"
                                >
                                  View Details
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}

                {activeTab === "found" && (
                  <>
                    {myFoundItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FiPackage className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No found items reported yet</p>
                        <Link
                          to="/report-found"
                          className="text-primary-600 text-sm hover:underline"
                        >
                          Report a found item
                        </Link>
                      </div>
                    ) : (
                      myFoundItems.map((item) => {
                        const hasMatch = myMatches.some(
                          (m) => m.foundItemId === item.id
                        );
                        const isRecovered = item.status === "claimed";
                        return (
                          <div
                            key={item.id}
                            className={`p-4 rounded-lg border transition-all ${
                              hasMatch && !isRecovered
                                ? "border-yellow-300 bg-yellow-50 ring-2 ring-yellow-200"
                                : isRecovered
                                ? "border-green-300 bg-green-50"
                                : "border-gray-200 bg-gray-50 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium text-gray-900">
                                    {item.title}
                                  </h3>
                                  {hasMatch && !isRecovered && (
                                    <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded-full flex items-center gap-1 animate-pulse">
                                      <FiBell className="w-3 h-3" /> Owner
                                      Found!
                                    </span>
                                  )}
                                  {isRecovered && (
                                    <span className="px-2 py-0.5 bg-green-200 text-green-800 text-xs rounded-full flex items-center gap-1">
                                      <FiCheckCircle className="w-3 h-3" />{" "}
                                      Claimed
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {item.category}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <FiClock className="w-3 h-3" />
                                    {item.dateFound
                                      ?.toDate?.()
                                      ?.toLocaleDateString() || "Unknown date"}
                                  </span>
                                  <span>
                                    {item.locationFound?.name ||
                                      "Unknown location"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span
                                  className={`px-2 py-1 text-xs rounded-full font-medium ${
                                    item.status === "pending"
                                      ? "bg-blue-100 text-blue-700"
                                      : item.status === "matched"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-green-100 text-green-700"
                                  }`}
                                >
                                  {item.status === "pending"
                                    ? "Pending"
                                    : item.status === "matched"
                                    ? "Matched"
                                    : "Claimed"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}

                {activeTab === "matches" && (
                  <>
                    {myMatches.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FiAlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No matches yet</p>
                        <p className="text-sm">
                          When your items are matched, they'll appear here
                        </p>
                      </div>
                    ) : (
                      myMatches.map((match) => {
                        const isPending =
                          match.status === "pending_verification";
                        const isVerifying =
                          match.status === "verification_in_progress";
                        const isRecovered = match.status === "recovered";
                        return (
                          <div
                            key={match.id}
                            className={`p-4 rounded-lg border transition-all ${
                              isPending || isVerifying
                                ? "border-yellow-300 bg-yellow-50 ring-2 ring-yellow-200"
                                : isRecovered
                                ? "border-green-300 bg-green-50"
                                : "border-gray-200 bg-gray-50"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                      match.role === "owner"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-green-100 text-green-700"
                                    }`}
                                  >
                                    {match.role === "owner"
                                      ? "Your Lost Item"
                                      : "You Found This"}
                                  </span>
                                  {(isPending || isVerifying) && (
                                    <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded-full flex items-center gap-1 animate-pulse">
                                      <FiBell className="w-3 h-3" /> Action
                                      Needed
                                    </span>
                                  )}
                                </div>
                                <p className="font-medium text-gray-900 mt-2">
                                  Match Score:{" "}
                                  {Math.round((match.aiScore || 0) * 100)}%
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <FiClock className="w-3 h-3" />
                                    {match.createdAt
                                      ?.toDate?.()
                                      ?.toLocaleDateString() || "Unknown date"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span
                                  className={`px-2 py-1 text-xs rounded-full font-medium ${
                                    isPending
                                      ? "bg-yellow-100 text-yellow-700"
                                      : isVerifying
                                      ? "bg-blue-100 text-blue-700"
                                      : isRecovered
                                      ? "bg-green-100 text-green-700"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {isPending
                                    ? "Pending Verification"
                                    : isVerifying
                                    ? "Verifying"
                                    : isRecovered
                                    ? "Recovered"
                                    : match.status}
                                </span>
                                <Link
                                  to={`/match/${match.id}`}
                                  className="text-primary-600 text-sm hover:underline"
                                >
                                  View Match
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Settings */}
        <div className="space-y-6">
          {/* Account Settings */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
            <div className="space-y-3">
              <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <p className="font-medium">Change Password</p>
                <p className="text-sm text-gray-600">
                  Update your account password
                </p>
              </button>

              <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <p className="font-medium">Notification Settings</p>
                <p className="text-sm text-gray-600">
                  Manage email and push notifications
                </p>
              </button>

              <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <p className="font-medium">Privacy Settings</p>
                <p className="text-sm text-gray-600">
                  Control your privacy and data
                </p>
              </button>
            </div>
          </div>

          {/* Verification Status */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Verification Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Email Verification</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                  Verified
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Student ID Verification</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    profile?.studentId
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {profile?.studentId ? "Pending" : "Not Set"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Phone Verification</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    profile?.phone
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {profile?.phone ? "Pending" : "Not Set"}
                </span>
              </div>
            </div>
          </div>

          {/* Help & Support */}
          <div className="card bg-blue-50 border-blue-200">
            <h2 className="text-xl font-semibold mb-4 text-blue-800">
              Need Help?
            </h2>
            <div className="space-y-3">
              <button className="w-full text-left p-3 hover:bg-blue-100 rounded-lg transition-colors">
                <p className="font-medium text-blue-800">FAQs & Help Center</p>
              </button>

              <button className="w-full text-left p-3 hover:bg-blue-100 rounded-lg transition-colors">
                <p className="font-medium text-blue-800">Contact Support</p>
              </button>

              <button className="w-full text-left p-3 hover:bg-blue-100 rounded-lg transition-colors">
                <p className="font-medium text-blue-800">Report an Issue</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
