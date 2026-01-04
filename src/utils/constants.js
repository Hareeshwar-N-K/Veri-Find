// Item Categories
export const itemCategories = [
  { value: "electronics", label: "Electronics", icon: "💻" },
  { value: "clothing", label: "Clothing", icon: "👕" },
  { value: "accessories", label: "Accessories", icon: "👜" },
  { value: "documents", label: "Documents", icon: "📄" },
  { value: "keys", label: "Keys", icon: "🔑" },
  { value: "wallet", label: "Wallet/Cards", icon: "💳" },
  { value: "phone", label: "Phone", icon: "📱" },
  { value: "jewelry", label: "Jewelry", icon: "💍" },
  { value: "bags", label: "Bags", icon: "🎒" },
  { value: "books", label: "Books", icon: "📚" },
  { value: "sports", label: "Sports Equipment", icon: "⚽" },
  { value: "other", label: "Other", icon: "📦" },
];

// Campus Locations
export const locations = [
  { value: "library", label: "Library" },
  { value: "cafeteria", label: "Cafeteria" },
  { value: "gym", label: "Gym" },
  { value: "main-building", label: "Main Building" },
  { value: "science-block", label: "Science Block" },
  { value: "arts-block", label: "Arts Block" },
  { value: "computer-lab", label: "Computer Lab" },
  { value: "parking-lot", label: "Parking Lot" },
  { value: "sports-ground", label: "Sports Ground" },
  { value: "hostel", label: "Hostel" },
  { value: "auditorium", label: "Auditorium" },
  { value: "canteen", label: "Canteen" },
  { value: "other", label: "Other" },
];

// Verification Questions for claiming items
export const verificationQuestions = [
  "What is a unique identifying feature of this item?",
  "Approximately when did you lose this item?",
  "Where exactly did you last see this item?",
];

// Item Status Types
export const itemStatuses = {
  lost: { label: "Lost", color: "red", description: "Item is missing" },
  found: { label: "Found", color: "green", description: "Item was found" },
  matched: {
    label: "Matched",
    color: "blue",
    description: "Potential match found",
  },
  returned: {
    label: "Returned",
    color: "purple",
    description: "Item returned to owner",
  },
  expired: {
    label: "Expired",
    color: "gray",
    description: "Listing has expired",
  },
};

// Date Ranges for filtering
export const dateRanges = [
  { value: "today", label: "Today" },
  { value: "week", label: "Past Week" },
  { value: "month", label: "Past Month" },
  { value: "all", label: "All Time" },
];
