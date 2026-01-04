import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiUsers,
  FiPackage,
  FiCheckCircle,
  FiAlertCircle,
  FiSearch,
  FiFilter,
  FiBarChart2,
  FiEye,
  FiTrash2,
  FiRefreshCw,
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("lost"); // 'lost', 'found', 'matches'

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
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
      if (userDoc.exists() && userDoc.data().role === "admin") {
        setIsAdmin(true);
        fetchDashboardData();
      } else {
        toast.error("Access denied. Admin privileges required.");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/dashboard");
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

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
      setLoading(false);
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
        data: Object.values(categoryStats),
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (loading) {
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
            <p className="text-gray-600">VeriFind system management</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            icon={FiAlertCircle}
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
                  className={`px-4 py-2 rounded-lg font-medium ${
                    activeTab === "lost"
                      ? "bg-red-100 text-red-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Lost Items ({lostItems.length})
                </button>
                <button
                  onClick={() => setActiveTab("found")}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    activeTab === "found"
                      ? "bg-green-100 text-green-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Found Items ({foundItems.length})
                </button>
                <button
                  onClick={() => setActiveTab("matches")}
                  className={`px-4 py-2 rounded-lg font-medium ${
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
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded"
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
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
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
                  Client-Side
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cloud Functions</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                  Free Tier
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
