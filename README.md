# Veri-Find

A Lost & Found application built with React, Vite, and Firebase.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd veri-find
```

2. Install dependencies:

```bash
npm install
```

## Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)

2. Enable Firebase Authentication:

   - Go to **Build** > **Authentication** > **Get Started**
   - Click on **Sign-in method** tab
   - Enable **Google** as a sign-in provider
   - Add your authorized domain (localhost is added by default)

3. (Optional) Enable Firestore Database:

   - Go to **Build** > **Firestore Database** > **Create Database**
   - Choose production mode or test mode
   - Select your preferred location

4. Get your Firebase configuration:

   - Go to **Project Settings** > **General**
   - Scroll down to **Your apps** section
   - Click the web icon (`</>`) to create a web app
   - Register your app and copy the configuration object

5. Update the Firebase configuration in [src/firebase/config.js](src/firebase/config.js):

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

**Security Note:** These API keys are safe to expose in frontend code (they are identifiers, not secrets). However, you should configure Firebase Security Rules and enable **App Check** for production to prevent unauthorized access.

## Running the Application

### Development Mode

Start the development server:

```bash
npm run dev
```

The application will open at `http://localhost:5173`

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
