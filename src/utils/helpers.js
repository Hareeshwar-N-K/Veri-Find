// Format date to readable string
export const formatDate = (date) => {
  if (!date) return "N/A";

  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Format date with time
export const formatDateTime = (date) => {
  if (!date) return "N/A";

  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Get relative time (e.g., "2 hours ago")
export const getRelativeTime = (date) => {
  if (!date) return "N/A";

  const d = date.toDate ? date.toDate() : new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now - d) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return formatDate(date);
};

// Truncate text
export const truncateText = (text, maxLength = 100) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

// Get status color class
export const getStatusColor = (status) => {
  const colors = {
    lost: "bg-red-100 text-red-800",
    found: "bg-green-100 text-green-800",
    matched: "bg-blue-100 text-blue-800",
    returned: "bg-purple-100 text-purple-800",
    expired: "bg-gray-100 text-gray-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

// Get category label
export const getCategoryLabel = (value, categories) => {
  const category = categories.find((c) => c.value === value);
  return category ? category.label : value;
};

// Get location label
export const getLocationLabel = (value, locations) => {
  const location = locations.find((l) => l.value === value);
  return location ? location.label : value;
};

// Validate email
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Validate phone
export const isValidPhone = (phone) => {
  const re = /^[\d\s\-\+\(\)]{10,}$/;
  return re.test(phone);
};

// Generate unique ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Capitalize first letter
export const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Get user rank tier based on reputation points
export const getRankTier = (reputationPoints = 0) => {
  if (reputationPoints >= 1000)
    return {
      tier: "Legend",
      icon: "👑",
      color: "from-yellow-400 to-orange-500",
    };
  if (reputationPoints >= 500)
    return { tier: "Master", icon: "💎", color: "from-purple-400 to-pink-500" };
  if (reputationPoints >= 250)
    return { tier: "Expert", icon: "⭐", color: "from-blue-400 to-cyan-500" };
  if (reputationPoints >= 100)
    return { tier: "Pro", icon: "🔥", color: "from-green-400 to-emerald-500" };
  if (reputationPoints >= 50)
    return { tier: "Rising", icon: "📈", color: "from-cyan-400 to-blue-400" };
  return { tier: "Beginner", icon: "🌱", color: "from-gray-400 to-slate-500" };
};

// Format rank display (e.g., "#5" or "Top 10%")
export const formatRankDisplay = (rank, totalUsers) => {
  if (!rank || !totalUsers) return "Unranked";

  const percentage = Math.ceil((rank / totalUsers) * 100);

  if (rank === 1) return "🏆 #1";
  if (rank <= 3) return `🥈 #${rank}`;
  if (rank <= 10) return `🌟 Top 10`;
  if (percentage <= 5) return `⭐ Top 5%`;
  if (percentage <= 10) return `💫 Top 10%`;
  if (percentage <= 25) return `✨ Top 25%`;

  return `#${rank}`;
};

// Generate a 4-word random phrase for the Physical Handshake
export const generateHandshakePhrase = () => {
  const words = [
    "Neon", "Quantum", "Tiger", "Cobalt", "Falcon", "Phantom", "Echo",
    "Crimson", "Velocity", "Delta", "Omega", "Silver", "Midnight",
    "Cyber", "Matrix", "Dragon", "Phoenix", "Titan", "Vortex", "Apex",
    "Nova", "Cosmic", "Shadow", "Ghost", "Stellar", "Aurora", "Zenith",
    "Crystal", "Onyx", "Pulse", "Nebula", "Vector", "Horizon"
  ];
  
  // Get 4 distinct random words
  const phrase = [];
  const wordsCopy = [...words];
  
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * wordsCopy.length);
    phrase.push(wordsCopy[randomIndex]);
    wordsCopy.splice(randomIndex, 1);
  }
  
  return phrase;
};
