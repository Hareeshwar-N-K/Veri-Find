import React, { useState } from "react";
import { 
  FiTrendingUp, 
  FiTrendingDown, 
  FiActivity,
  FiZap,
  FiTarget,
  FiBarChart2
} from "react-icons/fi";
import { 
  FaRocket,
  FaChartLine,
  FaBullseye,
  FaLightbulb,
  FaShieldAlt,
  FaNetworkWired
} from "react-icons/fa";

const StatsCard = ({
  title,
  value,
  change,
  icon,
  color = "cyan",
  trend = "up",
  description,
  loading = false,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const colorClasses = {
    cyan: {
      bg: "from-cyan-500/20 to-blue-500/20",
      icon: "from-cyan-500 to-blue-500",
      text: "text-cyan-400",
      border: "border-cyan-500/30",
      glow: "from-cyan-500/30 via-blue-500/30 to-cyan-500/30",
    },
    purple: {
      bg: "from-purple-500/20 to-pink-500/20",
      icon: "from-purple-500 to-pink-500",
      text: "text-purple-400",
      border: "border-purple-500/30",
      glow: "from-purple-500/30 via-pink-500/30 to-purple-500/30",
    },
    green: {
      bg: "from-emerald-500/20 to-teal-500/20",
      icon: "from-emerald-500 to-teal-500",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
      glow: "from-emerald-500/30 via-teal-500/30 to-emerald-500/30",
    },
    orange: {
      bg: "from-orange-500/20 to-yellow-500/20",
      icon: "from-orange-500 to-yellow-500",
      text: "text-orange-400",
      border: "border-orange-500/30",
      glow: "from-orange-500/30 via-yellow-500/30 to-orange-500/30",
    },
    red: {
      bg: "from-red-500/20 to-pink-500/20",
      icon: "from-red-500 to-pink-500",
      text: "text-red-400",
      border: "border-red-500/30",
      glow: "from-red-500/30 via-pink-500/30 to-red-500/30",
    },
    indigo: {
      bg: "from-indigo-500/20 to-violet-500/20",
      icon: "from-indigo-500 to-violet-500",
      text: "text-indigo-400",
      border: "border-indigo-500/30",
      glow: "from-indigo-500/30 via-violet-500/30 to-indigo-500/30",
    },
  };

  const colors = colorClasses[color] || colorClasses.cyan;

  const trendIcons = {
    up: <FiTrendingUp className="w-4 h-4" />,
    down: <FiTrendingDown className="w-4 h-4" />,
    neutral: <FiActivity className="w-4 h-4" />,
  };

  const trendColors = {
    up: "text-emerald-400",
    down: "text-red-400",
    neutral: "text-cyan-400",
  };

  const trendText = {
    up: "Increase",
    down: "Decrease",
    neutral: "Stable",
  };

  if (loading) {
    return (
      <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="h-4 bg-white/10 rounded w-24"></div>
            <div className="h-10 bg-white/10 rounded w-16"></div>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group relative transition-all duration-500 ${isHovered ? 'transform scale-[1.02]' : ''} ${onClick ? 'cursor-pointer' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Animated Glow Background */}
      <div className={`absolute -inset-1 bg-gradient-to-r ${colors.glow} rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500`}></div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '25px 25px',
        }}
      ></div>

      <div className={`relative bg-gradient-to-br ${colors.bg} backdrop-blur-sm rounded-2xl border ${colors.border} p-6 transition-all duration-300 ${
        onClick ? 'hover:border-cyan-500/50' : ''
      }`}>
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-300">{title}</p>
          
          {/* Trend Indicator */}
          {change && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10 ${trendColors[trend]}`}>
              {trendIcons[trend]}
              <span className="text-xs font-medium">{trendText[trend]}</span>
            </div>
          )}
        </div>

        {/* Main Value */}
        <div className="mb-4">
          <p className="text-3xl font-bold text-white">
            {value}
            {change && (
              <span className={`ml-2 text-sm font-medium ${trendColors[trend]}`}>
                {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{change}
              </span>
            )}
          </p>
          
          {/* Description */}
          {description && (
            <p className="text-sm text-gray-400 mt-2">{description}</p>
          )}
        </div>

        {/* Icon and Progress */}
        <div className="flex items-center justify-between mt-6">
          {/* Icon Container */}
          <div className="relative">
            <div className={`absolute -inset-3 bg-gradient-to-r ${colors.icon} rounded-xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-300`}></div>
            <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-r ${colors.icon} flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
              {icon || <FaChartLine className="w-6 h-6" />}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex-1 max-w-32">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progress</span>
              <span>{change || '100%'}</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full bg-gradient-to-r ${colors.icon} transition-all duration-1000`}
                style={{ 
                  width: change 
                    ? `${Math.min(parseInt(change), 100)}%` 
                    : '100%' 
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Hover Effect Lines */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-full group-hover:-translate-x-full transition-transform duration-700"></div>
        </div>

        {/* Floating Particles */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-float"
              style={{
                left: `${20 + i * 40}%`,
                top: '30%',
                animationDelay: `${i * 0.3}s`,
                animationDuration: '3s',
              }}
            />
          ))}
        </div>
      </div>

      {/* Sparkle Effect */}
      {isHovered && (
        <div className="absolute -top-2 -right-2 w-4 h-4">
          <div className="absolute inset-0 bg-cyan-400 rounded-full animate-ping opacity-75"></div>
          <div className="absolute inset-0 bg-cyan-400 rounded-full"></div>
        </div>
      )}
    </div>
  );
};

// Example Usage Component
export const StatsGrid = () => {
  const stats = [
    {
      title: "Total Matches",
      value: "1,248",
      change: "+12.5%",
      icon: <FaRocket className="w-6 h-6" />,
      color: "cyan",
      trend: "up",
      description: "AI-powered matches found",
    },
    {
      title: "Recovery Rate",
      value: "89.2%",
      change: "+3.2%",
      icon: <FaBullseye className="w-6 h-6" />,
      color: "green",
      trend: "up",
      description: "Successful item returns",
    },
    {
      title: "Active Users",
      value: "4,892",
      change: "+24.7%",
      icon: <FaNetworkWired className="w-6 h-6" />,
      color: "purple",
      trend: "up",
      description: "Currently searching",
    },
    {
      title: "Avg. Response",
      value: "2.4h",
      change: "-0.8h",
      icon: <FaLightbulb className="w-6 h-6" />,
      color: "orange",
      trend: "down",
      description: "Time to first match",
    },
    {
      title: "System Accuracy",
      value: "96.7%",
      change: "+1.3%",
      icon: <FaShieldAlt className="w-6 h-6" />,
      color: "indigo",
      trend: "up",
      description: "AI matching precision",
    },
    {
      title: "Issues Resolved",
      value: "98%",
      change: "±0.0%",
      icon: <FiZap className="w-6 h-6" />,
      color: "red",
      trend: "neutral",
      description: "Customer support success",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stats.map((stat, index) => (
        <StatsCard
          key={index}
          title={stat.title}
          value={stat.value}
          change={stat.change}
          icon={stat.icon}
          color={stat.color}
          trend={stat.trend}
          description={stat.description}
        />
      ))}
    </div>
  );
};

export default StatsCard;