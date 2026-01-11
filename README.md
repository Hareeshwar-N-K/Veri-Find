# VeriFind

A trust-based Lost & Found platform built with React, Vite, and Firebase. VeriFind uses a **privacy-first architecture** where found items remain private and are only revealed to owners after AI-verified matches.

## 🌟 Features

- **Privacy-First**: Found items are kept private; only matched owners can see them
- **AI-Powered Matching**: Automatic matching based on category, location, description, and timing
- **Verification Quiz**: Owners must answer verification questions to prove ownership
- **Real-time Chat**: Secure communication between verified owners and finders
- **Reputation System**: Badges and scores for trustworthy users
- **Admin Dashboard**: Manage matches, users, and review verifications

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase account (Blaze plan for Cloud Functions)
- Firebase CLI (`npm install -g firebase-tools`)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd veri-find
```

2. Install frontend dependencies:

```bash
npm install
npm install @react-google-maps/api

```

3. Install Cloud Functions dependencies:

```bash
cd functions
npm install
cd ..
```

## Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)

2. Enable Firebase Authentication:

   - Go to **Build** > **Authentication** > **Get Started**
   - Click on **Sign-in method** tab
   - Enable **Google** as a sign-in provider
   - Add your authorized domain (localhost is added by default)

3. Enable Firestore Database:

   - Go to **Build** > **Firestore Database** > **Create Database**
   - Choose **production mode**
   - Select your preferred location

4. Enable Storage:

   - Go to **Build** > **Storage** > **Get Started**
   - Choose production mode

5. Get your Firebase configuration:

   - Go to **Project Settings** > **General**
   - Scroll down to **Your apps** section
   - Click the web icon (`</>`) to create a web app
   - Register your app and copy the configuration object

6. Update the Firebase configuration in [src/firebase/config.js](src/firebase/config.js):

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id",
};
```

## Deploying Firebase Rules & Functions

1. Login to Firebase CLI:

```bash
firebase login
```

2. Initialize Firebase in your project:

```bash
firebase init
```

Select: Firestore, Functions, Storage, Emulators

3. Deploy Security Rules:

```bash
firebase deploy --only firestore:rules,storage:rules
```

4. Deploy Firestore Indexes:

```bash
firebase deploy --only firestore:indexes
```

5. Deploy Cloud Functions:

```bash
firebase deploy --only functions
```

## Running the Application

### Development Mode (with Emulators)

Start Firebase emulators and dev server:

```bash
# Terminal 1: Start emulators
firebase emulators:start

# Terminal 2: Start dev server
npm run dev
```

The application will open at `http://localhost:5173`
Firebase Emulator UI will be at `http://localhost:4000`

### Development Mode (without Emulators)

```bash
npm run dev
```

### Build for Production

Create a production build:

```bash
npm run build
```

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint for code quality
- `npm run preview` - Preview production build
- `firebase emulators:start` - Start Firebase local emulators
- `firebase deploy --only functions` - Deploy Cloud Functions
- `node helper/set-admin.js <email>` - Set a user as admin
- `node helper/list-users.js` - List all users and their roles

## Admin Setup

VeriFind uses **database-based admin authentication** instead of hardcoded emails. See [ADMIN_SETUP.md](ADMIN_SETUP.md) for detailed instructions.

### Quick Start

1. **First user logs in** (creates account in Firestore)
2. **Set user as admin** using helper script:
   ```bash
   node helper/set-admin.js your-email@gmail.com
   ```
3. **Access Admin Panel** at `/admin`

### Admin Features

- 👑 Full system access
- 📊 Analytics dashboard
- 👥 User management
- ✅ Match approvals
- ⚙️ Login access control
- 📈 System settings

## Architecture

### Firestore Collections

| Collection        | Description                                     |
| ----------------- | ----------------------------------------------- |
| `users`           | User profiles with reputation, badges, stats    |
| `found_items`     | **PRIVATE** - Only visible to finder and admins |
| `lost_items`      | Semi-public - Browsable by authenticated users  |
| `matches`         | AI-generated matches with verification status   |
| `recovery_ledger` | Public wall of fame for successful recoveries   |
| `audit_logs`      | Security audit trail (admin-only)               |
| `chat_channels`   | Post-verification communication                 |

### Cloud Functions

| Function               | Trigger           | Description                           |
| ---------------------- | ----------------- | ------------------------------------- |
| `onFoundItemCreate`    | Firestore Create  | Sanitize input, trigger matcher       |
| `onLostItemCreate`     | Firestore Create  | Sanitize input, trigger matcher       |
| `onMatchStatusChange`  | Firestore Update  | Handle verification flow, create chat |
| `cleanupOldItems`      | Scheduled (daily) | Archive expired items                 |
| `approveMatch`         | Callable          | Admin match approval                  |
| `sendVerificationQuiz` | Callable          | Send quiz to owner                    |

### Security Rules

- **found_items**: Only creator and admins can read
- **lost_items**: Authenticated users can read (ownership hints hidden)
- **matches**: Only participants can access
- **audit_logs**: Admin-only, immutable

## Project Structure

```
veri-find/
├── src/
│   ├── components/    # Reusable components
│   ├── pages/         # Page components
│   ├── firebase/      # Firebase configuration
│   ├── assets/        # Static assets
│   └── App.jsx        # Main App component
├── public/            # Public assets
└── package.json       # Project dependencies
```

## Tech Stack

- React 19
- Vite 7
- TailwindCSS 4
- React Router 7
- Firebase Authentication (Google OAuth)

## Features

- 🔐 Google OAuth authentication via Firebase
- 🎨 Modern UI with TailwindCSS
- ⚡ Fast development with Vite
- 🔄 Client-side routing with React Router
- 📱 Responsive design
