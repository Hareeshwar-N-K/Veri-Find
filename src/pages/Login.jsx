import React, { useState, useEffect } from "react";
import { auth, provider } from "../firebase/config";
import { signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { validateEmailForLogin, getLoginMode } from "../services/loginSettings";
import { createOrUpdateUser, getUser } from "../services/firestore";

function Login() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginSettings, setLoginSettings] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLoginSettings();
  }, []);

  const fetchLoginSettings = async () => {
    const settings = await getLoginMode();
    setLoginSettings(settings);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      // 1. The Trigger
      const result = await signInWithPopup(auth, provider);

      // 2. The Success
      const user = result.user;
      console.log("Secure Login Success:", user.displayName);

      // Create or update user in Firestore
      await createOrUpdateUser(user);

      // Get user profile from database to check role
      const userProfile = await getUser(user.uid);
      const isAdmin = userProfile?.role === "admin";

      // Check if user is admin (admins bypass all restrictions)
      if (isAdmin) {
        toast.success("Welcome Admin! Redirecting to Admin Panel...", {
          duration: 3000,
          icon: "👑",
        });
        setTimeout(() => {
          navigate("/admin");
        }, 1500);
        return;
      }

      // Check login mode restrictions for non-admin users
      const validation = await validateEmailForLogin(user.email);

      if (!validation.valid) {
        await auth.signOut(); // Sign out if not valid
        setError(validation.reason);
        toast.error(validation.reason);
        setIsLoading(false);
        return;
      }

      // Valid user - proceed with normal flow
      toast.success("Login successful! Redirecting...", {
        duration: 3000,
        icon: "✅",
      });

      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err) {
      // 3. The Failure (Handle specific error codes for better UX)
      console.error("Login Failed:", err);
      let errorMessage = "Login failed. Please try again.";

      if (err.code === "auth/popup-closed-by-user") {
        errorMessage = "Login popup was closed. Please try again.";
      } else if (err.code === "auth/cancelled-popup-request") {
        errorMessage = "Login request was cancelled.";
      } else if (err.code === "auth/popup-blocked") {
        errorMessage =
          "Popup was blocked by your browser. Please allow popups for this site.";
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#0A0F29] via-[#111827] to-[#1E1B4B] text-white min-h-screen">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>

        {/* Grid Pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        ></div>
      </div>

      <div className="relative z-10 min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔍</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              VeriFind
            </h1>
            <h2 className="text-4xl font-bold text-white mt-2">Welcome Back</h2>

            {/* Login Mode Indicator */}
            {loginSettings && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                {loginSettings.mode === "organization" ? (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-sm">Organization Access Only</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className="text-sm">Open Access</span>
                  </>
                )}
              </div>
            )}

            <p className="mt-2 text-slate-300">
              {loginSettings?.mode === "organization"
                ? `Only @${loginSettings.domain} emails can login`
                : "All Gmail accounts can login"}
            </p>
          </div>

          {/* Google Auth Card */}
          <div className="rounded-3xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="group w-full flex items-center justify-center px-6 py-4 bg-white/10 border-2 border-white/20 rounded-xl font-semibold text-white hover:bg-white/20 hover:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/30 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                    <path
                      fill="#FFFFFF"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#FFFFFF"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FFFFFF"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#FFFFFF"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>

            {/* Login Mode Info */}
            {loginSettings && loginSettings.mode === "organization" && (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <FiMail className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-400">
                      Organization Access
                    </h4>
                    <p className="text-xs text-green-300">
                      Only @{loginSettings.domain} emails can login
                    </p>
                  </div>
                </div>
              </div>
            )}

            <p className="mt-6 text-center text-sm text-slate-400">
              Secure authentication powered by Firebase
            </p>
          </div>

          {/* Footer Text */}
          <p className="mt-8 text-center text-slate-500 text-sm">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>

      {/* Add custom CSS for animations */}
      <style jsx>{`
        @keyframes gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}

export default Login;
