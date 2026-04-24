# Ranking System Implementation

## Overview

Implemented a comprehensive user ranking system based on reputation points earned through platform activities. The system replaces the hardcoded "Premium" badge with dynamic rank displays showing users' actual standing in the community.

## How the Credit/Reputation System Works

### Earning Points

Users earn reputation points through the following activities:

- **Returning Found Items**: +50 points (awarded when a match is verified and item is returned)
- **Recovering Lost Items**: +10 points (awarded to owners who successfully recover their items)

### Rank Tiers

Based on total reputation points:

- 🌱 **Beginner**: 0-49 points
- 📈 **Rising**: 50-99 points
- 🔥 **Pro**: 100-249 points
- ⭐ **Expert**: 250-499 points
- 💎 **Master**: 500-999 points
- 👑 **Legend**: 1000+ points

### Rank Display Formats

The system shows your rank in different ways:

- 🏆 **#1**: Top ranked user
- 🥈 **#2-3**: Top 3 users
- 🌟 **Top 10**: Ranks 4-10
- ⭐ **Top 5%**: Top 5% of all users
- 💫 **Top 10%**: Top 10% of all users
- ✨ **Top 25%**: Top 25% of all users
- **#N**: Your numerical rank beyond top 25%

## Implementation Details

### Files Modified

#### 1. `src/utils/helpers.js`

Added ranking utility functions:

```javascript
// Get user's tier based on reputation points
getRankTier(reputationPoints);
// Returns: { tier, icon, color }

// Format rank display text
formatRankDisplay(rank, totalUsers);
// Returns: "#1", "Top 10%", etc.
```

#### 2. `src/services/firestore.js`

Added `getUserRank()` function:

```javascript
// Fetches user's rank and reputation data
getUserRank(userId);
// Returns: { rank, totalUsers, reputationPoints }
```

How it works:

1. Fetches user's current reputation points
2. Counts users with higher reputation
3. Calculates rank position (1-based)
4. Returns total user count for percentage calculation

#### 3. `src/components/Navbar.jsx`

**Changes:**

- Replaced all "Premium" text with dynamic rank display
- Added `userRank` state
- Fetches rank on component mount
- Shows rank tier + position in both desktop and mobile views

**Desktop view:** "🏆 #5" or "📈 Rising • Top 10%"
**Mobile view:** Same format in hamburger menu

#### 4. `src/pages/Profile.jsx`

Added comprehensive **Reputation & Ranking Card**:

- Large tier badge with icon (🌱, 📈, 🔥, ⭐, 💎, 👑)
- Current rank position (e.g., "🏆 #1" or "Top 10%")
- Total users count
- Reputation points with progress bar
- Points breakdown (showing what actions earn points)
- Next tier indicator with points remaining

## Database Schema

### Users Collection

Each user document has:

```javascript
{
  reputationPoints: Number,  // Total points earned
  itemsReturned: Number,     // Count of items returned
  itemsRecovered: Number,    // Count of items recovered
  // ... other fields
}
```

## How to Check Your Rank

### 1. In Navigation Bar

Your rank appears next to your profile picture in the top-right corner:

- Desktop: Below your name
- Mobile: In the hamburger menu

### 2. In Profile Page

Visit `/profile` to see:

- Your tier badge and icon
- Exact rank position
- Reputation points with progress bar
- How many points until next tier
- What actions earn points

## Firestore Performance Notes

The `getUserRank()` function performs two queries:

1. Count users with higher reputation (for rank calculation)
2. Count total users (for percentage calculation)

**Optimization opportunity**: For better performance at scale, consider:

- Caching rank calculations
- Running rank updates via Cloud Functions on schedule
- Storing pre-calculated ranks in user documents

## Testing the System

### Test Scenarios

1. **New User (0 points)**

   - Should show: "Beginner 🌱" + rank position

2. **User with 75 points**

   - Should show: "Rising 📈" + rank position
   - Next tier: "Pro 🔥" (25 points to go)

3. **User with 300 points**
   - Should show: "Expert ⭐" + rank position
   - Next tier: "Master 💎" (200 points to go)

### Manual Testing

1. Log in to the app
2. Check Navbar - should show your rank instead of "Premium"
3. Visit Profile page - should see detailed ranking card
4. Complete a successful item return
5. Verify +50 points added to reputation
6. Check if rank/tier updated accordingly

## Future Enhancements

### Potential Features

- **Leaderboard Page**: Show top users across different categories
- **Badges System**: Special achievements beyond tiers
- **Weekly/Monthly Rankings**: Time-based competitions
- **Category-specific Rankings**: Best in specific item categories
- **Reputation History**: Track points earned over time
- **Bonus Points**: Special events or challenges
- **Decay System**: Reduce points for inactive users

### Performance Improvements

- Implement rank caching with Cloud Functions
- Use Firestore composite indexes for faster queries
- Add real-time rank updates via websockets
- Pre-calculate percentile rankings

## API Reference

### getUserRank(userId)

**Parameters:**

- `userId` (string): Firebase user ID

**Returns:**

```javascript
{
  rank: number,              // 1-based rank position
  totalUsers: number,        // Total users in system
  reputationPoints: number   // User's reputation points
}
```

### getRankTier(reputationPoints)

**Parameters:**

- `reputationPoints` (number): User's total points

**Returns:**

```javascript
{
  tier: string,    // "Beginner", "Rising", "Pro", etc.
  icon: string,    // "🌱", "📈", "🔥", etc.
  color: string    // Tailwind gradient class
}
```

### formatRankDisplay(rank, totalUsers)

**Parameters:**

- `rank` (number): User's rank position
- `totalUsers` (number): Total users

**Returns:**

- String: Formatted rank display (e.g., "🏆 #1", "Top 10%")

## Conclusion

The ranking system provides users with:
✅ Clear progression path
✅ Motivation to help others
✅ Recognition for contributions
✅ Transparent scoring system
✅ Fair competition mechanics

Users can now track their standing in the VeriFind community and earn recognition for their helpful contributions!
