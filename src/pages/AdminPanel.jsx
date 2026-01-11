import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiUsers,
  FiPackage,
  FiCheckCircle,
  FiAlertCircle,
  FiSearch,
  FiBarChart2,
  FiEye,
  FiTrash2,
  FiRefreshCw,
  FiMail,
  FiGlobe,
  FiToggleLeft,
  FiToggleRight,
} from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";
import AdminSidebar from "../components/AdminSidebar";
import StatsCard from "../components/StatsCard";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { COLLECTIONS } from "../services/firestore";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AdminPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("lost");

  // Add new state for login mode
  const [loginMode, setLoginMode] = useState("any"); // 'any' or 'organization'
  const [organizationDomain, setOrganizationDomain] = useState("cit.edu.in");
  const [savingSettings, setSavingSettings] = useState(false);

  const [stats, setStats] = useState({
    lostItems: 0,
    foundItems: 0,
    totalMatches: 0,
    recoveredItems: 0,
    totalUsers: 0,
    pendingVerifications: 0,
  });

  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [matches, setMatches] = useState([]);
  const [categoryStats, setCategoryStats] = useState({});

  useEffect(() => {
    if (!authLoading) {
      checkAdminStatus();
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardData();
      fetchSystemSettings();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    setCheckingAdmin(true);

    if (!user) {
      toast.error("Please login to access admin panel");
      navigate("/login");
      return;
    }

    try {
      // Check user role from Firestore database
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));

      if (userDoc.exists() && userDoc.data().role === "admin") {
        setIsAdmin(true);
      } else {
        toast.error("Access denied. Admin privileges required.");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      toast.error("Error verifying admin access");
      navigate("/dashboard");
    } finally {
      setCheckingAdmin(false);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const settingsDoc = await getDoc(
        doc(db, COLLECTIONS.SYSTEM_SETTINGS, "loginMode")
      );
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setLoginMode(data.mode || "any");
        setOrganizationDomain(data.domain || "cit.edu.in");
      }
    } catch (error) {
      console.error("Error fetching system settings:", error);
    }
  };

  const saveLoginMode = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, COLLECTIONS.SYSTEM_SETTINGS, "loginMode"), {
        mode: loginMode,
        domain: organizationDomain,
        updatedAt: new Date(),
        updatedBy: user.uid,
      });
      toast.success("Login settings updated successfully!");
    } catch (error) {
      console.error("Error saving login settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleLoginMode = async () => {
    const newMode = loginMode === "any" ? "organization" : "any";
    setLoginMode(newMode);

    // Auto-save when toggling
    setSavingSettings(true);
    try {
      await setDoc(doc(db, COLLECTIONS.SYSTEM_SETTINGS, "loginMode"), {
        mode: newMode,
        domain: organizationDomain,
        updatedAt: new Date(),
        updatedBy: user.uid,
      });
      toast.success(
        `Login mode set to: ${
          newMode === "any" ? "Any Gmail" : "Organization Only"
        }`
      );
    } catch (error) {
      console.error("Error saving login settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setDashboardLoading(true);

      // Fetch lost items
      const lostSnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.LOST_ITEMS),
          orderBy("createdAt", "desc"),
          limit(50)
        )
      );
      const lostData = lostSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLostItems(lostData);

      // Fetch found items
      const foundSnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.FOUND_ITEMS),
          orderBy("createdAt", "desc"),
          limit(50)
        )
      );
      const foundData = foundSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFoundItems(foundData);

      // Fetch matches
      const matchSnapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.MATCHES),
          orderBy("createdAt", "desc"),
          limit(50)
        )
      );
      const matchData = matchSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMatches(matchData);

      // Fetch users count
      const usersSnapshot = await getDocs(collection(db, COLLECTIONS.USERS));

      // Calculate category stats
      const catStats = {};
      [...lostData, ...foundData].forEach((item) => {
        const cat = item.category || "other";
        catStats[cat] = (catStats[cat] || 0) + 1;
      });
      setCategoryStats(catStats);

      // Calculate stats
      setStats({
        lostItems: lostData.length,
        foundItems: foundData.length,
        totalMatches: matchData.length,
        recoveredItems: matchData.filter((m) => m.status === "recovered")
          .length,
        totalUsers: usersSnapshot.size,
        pendingVerifications: matchData.filter(
          (m) => m.status === "pending_verification" || m.status === "pending"
        ).length,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load admin data");
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleDelete = async (collectionName, itemId) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      await deleteDoc(doc(db, collectionName, itemId));
      toast.success("Item deleted successfully");
      fetchDashboardData();
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

  // Chart data
  const barChartData = {
    labels: ["Lost", "Found", "Matched", "Recovered"],
    datasets: [
      {
        label: "Items Count",
        data: [
          stats.lostItems,
          stats.foundItems,
          stats.totalMatches,
          stats.recoveredItems,
        ],
        backgroundColor: [
          "rgba(239, 68, 68, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(59, 130, 246, 0.8)",
          "rgba(156, 163, 175, 0.8)",
        ],
        borderColor: [
          "rgb(239, 68, 68)",
          "rgb(34, 197, 94)",
          "rgb(59, 130, 246)",
          "rgb(156, 163, 175)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const pieChartData = {
    labels: Object.keys(categoryStats),
    datasets: [
      {
        data: Object.values(categoryStats).map((val) => Number(val) || 0),
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(139, 92, 246, 0.8)",
          "rgba(236, 72, 153, 0.8)",
          "rgba(156, 163, 175, 0.8)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#e5e7eb",
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || "";
            const value = context.parsed || 0;
            return label + ": " + value;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#9ca3af",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
      y: {
        ticks: {
          color: "#9ca3af",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
    },
  };

  // Filter items based on search
  const getFilteredItems = () => {
    let items = [];
    if (activeTab === "lost") items = lostItems;
    else if (activeTab === "found") items = foundItems;
    else items = matches;

    if (!searchTerm) return items;

    return items.filter((item) => {
      const title = (item.title || item.itemTitle || "").toLowerCase();
      const category = (item.category || item.itemCategory || "").toLowerCase();
      const search = searchTerm.toLowerCase();
      return title.includes(search) || category.includes(search);
    });
  };

  // Show loading while checking admin status or auth loading
  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If not admin after checking, show access denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-6">Admin privileges required</p>
          <Link
            to="/dashboard"
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (dashboardLoading) {
    return (
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  const filteredItems = getFilteredItems();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />

      <div className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Welcome back, {user?.displayName || "Admin"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Admin
            </span>
            <button
              onClick={fetchDashboardData}
              className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* System Settings Card - NEW */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-3">
              <FiMail className="w-5 h-5 text-blue-600" />
              Login Access Control
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Control who can access the platform
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Login Mode Toggle */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">Login Mode</h3>
                    <p className="text-sm text-gray-600">
                      Set who can login to the platform
                    </p>
                  </div>
                  <button
                    onClick={toggleLoginMode}
                    disabled={savingSettings}
                    className="relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    <span className="sr-only">Toggle login mode</span>
                    <span
                      className={`${
                        loginMode === "organization"
                          ? "translate-x-6 bg-green-600"
                          : "translate-x-1 bg-gray-400"
                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                    <div className="absolute inset-0 rounded-full bg-gray-200"></div>
                  </button>
                </div>

                <div
                  className={`p-4 rounded-lg border ${
                    loginMode === "organization"
                      ? "border-green-200 bg-green-50"
                      : "border-blue-200 bg-blue-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {loginMode === "organization" ? (
                      <>
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <FiMail className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-green-800">
                            Organization Only
                          </h4>
                          <p className="text-sm text-green-700">
                            Only @{organizationDomain} emails can login
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <FiGlobe className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-800">
                            Any Gmail Account
                          </h4>
                          <p className="text-sm text-blue-700">
                            All Gmail accounts can login
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Organization Domain Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Domain
                  </label>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center px-3 py-2 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                      @
                    </span>
                    <input
                      type="text"
                      value={organizationDomain}
                      onChange={(e) => setOrganizationDomain(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="cit.edu.in"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Set the domain for organization emails (e.g., cit.edu.in)
                  </p>
                </div>

                <button
                  onClick={saveLoginMode}
                  disabled={savingSettings}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingSettings ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>Save Settings</>
                  )}
                </button>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Current Status
                  </span>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      loginMode === "organization"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {loginMode === "organization" ? "Restricted" : "Open"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {loginMode === "organization"
                    ? `Only @${organizationDomain} emails can access the platform`
                    : "All Gmail accounts can access the platform"}
                </p>
              </div>

              <div className="p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Impact
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                    {loginMode === "organization"
                      ? "Limited Access"
                      : "Wide Access"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {loginMode === "organization"
                    ? "Restricts platform to verified organizational members only"
                    : "Allows anyone with a Gmail account to use the platform"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            icon={<FiAlertCircle className="w-6 h-6" />}
            title="Lost Items"
            value={stats.lostItems}
            color="red"
          />
          <StatsCard
            icon={FiPackage}
            title="Found Items"
            value={stats.foundItems}
            color="green"
          />
          <StatsCard
            icon={FiCheckCircle}
            title="Matches"
            value={stats.totalMatches}
            subtitle={`${stats.pendingVerifications} pending`}
            color="blue"
          />
          <StatsCard
            icon={FiUsers}
            title="Total Users"
            value={stats.totalUsers}
            color="purple"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Items Status</h2>
              <FiBarChart2 className="w-6 h-6 text-gray-400" />
            </div>
            <div className="h-64">
              <Bar data={barChartData} options={chartOptions} />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Items by Category</h2>
              <FiBarChart2 className="w-6 h-6 text-gray-400" />
            </div>
            <div className="h-64">
              {Object.keys(categoryStats).length > 0 ? (
                <Pie data={pieChartData} options={chartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Tabs and Search */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("lost")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === "lost"
                      ? "bg-red-100 text-red-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Lost Items ({lostItems.length})
                </button>
                <button
                  onClick={() => setActiveTab("found")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === "found"
                      ? "bg-green-100 text-green-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Found Items ({foundItems.length})
                </button>
                <button
                  onClick={() => setActiveTab("matches")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === "matches"
                      ? "bg-blue-100 text-blue-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Matches ({matches.length})
                </button>
              </div>

              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none w-full md:w-64"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === "matches" ? "Match Details" : "Item"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === "matches" ? "Score" : "Location"}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.title ||
                              item.itemTitle ||
                              "Match #" + item.id.slice(0, 6)}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {item.description ||
                              `Owner: ${item.ownerName || "Unknown"}`}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 capitalize">
                          {item.category || item.itemCategory || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            item.status === "searching"
                              ? "bg-yellow-100 text-yellow-800"
                              : item.status === "pending"
                              ? "bg-blue-100 text-blue-800"
                              : item.status === "matched" ||
                                item.status === "pending_verification"
                              ? "bg-purple-100 text-purple-800"
                              : item.status === "recovered" ||
                                item.status === "claimed"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {item.status?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {activeTab === "matches"
                          ? `${Math.round((item.aiScore || 0) * 100)}%`
                          : item.locationLost?.name ||
                            item.locationFound?.name ||
                            "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            to={
                              activeTab === "matches"
                                ? `/match/${item.id}`
                                : `/item/${item.id}`
                            }
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          >
                            <FiEye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() =>
                              handleDelete(
                                activeTab === "lost"
                                  ? COLLECTIONS.LOST_ITEMS
                                  : activeTab === "found"
                                  ? COLLECTIONS.FOUND_ITEMS
                                  : COLLECTIONS.MATCHES,
                                item.id
                              )
                            }
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No {activeTab} items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <h3 className="font-semibold mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Firebase</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                  Connected
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Matching Engine</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                  Active
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">AI Matching</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                  95% Accuracy
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <h3 className="font-semibold mb-4">Pending Actions</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Verifications</span>
                <span className="font-medium text-orange-600">
                  {stats.pendingVerifications}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active Searches</span>
                <span className="font-medium">
                  {lostItems.filter((i) => i.status === "searching").length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pending Claims</span>
                <span className="font-medium">
                  {foundItems.filter((i) => i.status === "pending").length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <h3 className="font-semibold mb-4">Success Rate</h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">
                {stats.totalMatches > 0
                  ? Math.round(
                      (stats.recoveredItems / stats.totalMatches) * 100
                    )
                  : 0}
                %
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {stats.recoveredItems} of {stats.totalMatches} matches recovered
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
