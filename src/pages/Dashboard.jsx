import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FaBox,
  FaSearch,
  FaCheckCircle,
  FaClock,
  FaArrowRight,
  FaBell,
  FaCalendar,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import ItemCard from "../components/ItemCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("lost");

  const stats = [
    {
      title: "Lost Items",
      value: "12",
      change: "+2 this week",
      icon: <FaBox />,
      color: "blue",
      trend: "up",
    },
    {
      title: "Found Items",
      value: "8",
      change: "+3 this week",
      icon: <FaSearch />,
      color: "green",
      trend: "up",
    },
    {
      title: "Matches",
      value: "5",
      change: "+1 this week",
      icon: <FaCheckCircle />,
      color: "purple",
      trend: "up",
    },
    {
      title: "Pending",
      value: "3",
      change: "No change",
      icon: <FaClock />,
      color: "orange",
      trend: "neutral",
    },
  ];

  const chartData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Lost Items",
        data: [12, 19, 3, 5, 2, 3],
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Found Items",
        data: [8, 15, 5, 10, 6, 8],
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Activity Overview",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const recentItems = [
    {
      id: 1,
      name: 'MacBook Pro 16"',
      type: "lost",
      status: "matched",
      date: "2024-01-15",
      location: "Library",
      confidence: 85,
    },
    {
      id: 2,
      name: "iPhone 15 Pro",
      type: "found",
      status: "unclaimed",
      date: "2024-01-14",
      location: "Cafeteria",
      confidence: 92,
    },
    {
      id: 3,
      name: "Calculus Textbook",
      type: "lost",
      status: "pending",
      date: "2024-01-13",
      location: "Math Building",
      confidence: 45,
    },
    {
      id: 4,
      name: "AirPods Pro",
      type: "found",
      status: "claimed",
      date: "2024-01-12",
      location: "Gym",
      confidence: 78,
    },
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        color: "bg-yellow-100 text-yellow-800",
        icon: <FaClock className="w-4 h-4" />,
      },
      matched: {
        color: "bg-blue-100 text-blue-800",
        icon: <FaCheckCircle className="w-4 h-4" />,
      },
      claimed: {
        color: "bg-green-100 text-green-800",
        icon: <FaCheckCircle className="w-4 h-4" />,
      },
      unclaimed: {
        color: "bg-gray-100 text-gray-800",
        icon: <FaBox className="w-4 h-4" />,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span
        className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}
      >
        {config.icon}
        <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's your overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 transform transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${stat.color}-500 to-${stat.color}-600 flex items-center justify-center`}
              >
                <div className="text-white text-xl">{stat.icon}</div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p
                  className={`text-sm ${
                    stat.trend === "up"
                      ? "text-green-600"
                      : stat.trend === "down"
                      ? "text-red-600"
                      : "text-gray-500"
                  }`}
                >
                  {stat.change}
                </p>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {stat.title}
            </h3>
          </div>
        ))}
      </div>

      {/* Chart and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <Line data={chartData} options={chartOptions} />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Quick Actions
          </h3>
          <div className="space-y-4">
            <Link
              to="/report-lost"
              className="flex items-center justify-between p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FaBox className="text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    Report Lost Item
                  </p>
                  <p className="text-sm text-gray-600">Can't find something?</p>
                </div>
              </div>
              <FaArrowRight className="text-gray-400 group-hover:text-blue-600" />
            </Link>

            <Link
              to="/report-found"
              className="flex items-center justify-between p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FaSearch className="text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    Report Found Item
                  </p>
                  <p className="text-sm text-gray-600">Found something?</p>
                </div>
              </div>
              <FaArrowRight className="text-gray-400 group-hover:text-green-600" />
            </Link>

            <Link
              to="/dashboard"
              className="flex items-center justify-between p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FaBell className="text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Notifications</p>
                  <p className="text-sm text-gray-600">
                    3 unread notifications
                  </p>
                </div>
              </div>
              <FaArrowRight className="text-gray-400 group-hover:text-purple-600" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Items */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">Recent Items</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab("lost")}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === "lost"
                    ? "bg-primary-100 text-primary-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Lost Items
              </button>
              <button
                onClick={() => setActiveTab("found")}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === "found"
                    ? "bg-primary-100 text-primary-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Found Items
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentItems
                .filter(
                  (item) => activeTab === "all" || item.type === activeTab
                )
                .map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">
                          ID: #{item.id.toString().padStart(4, "0")}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <FaCalendar className="text-gray-400" />
                        <span className="text-gray-700">{item.date}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <FaMapMarkerAlt className="text-gray-400" />
                        <span className="text-gray-700">{item.location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full"
                            style={{ width: `${item.confidence}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm font-medium text-gray-700">
                          {item.confidence}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/status/${item.id}`}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {recentItems.filter(
          (item) => activeTab === "all" || item.type === activeTab
        ).length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaBox className="text-gray-400 text-2xl" />
            </div>
            <p className="text-gray-500">No {activeTab} items found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
