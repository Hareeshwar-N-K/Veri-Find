import React, { useState, useEffect } from "react";
import { auth, provider } from "../firebase/config";
import { signInWithPopup } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";

function Register() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  // Home page animations state
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll);
    setIsVisible(true);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("Secure Sign Up Success:", user.displayName);
      
      // Show success animation before redirect
      setTimeout(() => {
        navigate("/");
      }, 1000);
      
    } catch (err) {
      console.error("Sign Up Failed:", err);
      setError("Sign up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#0A0F29] via-[#111827] to-[#1E1B4B] text-white min-h-screen">
      {/* Animated Background Elements - Same as Home */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-float"
          style={{
            transform: `translateY(${Math.sin(scrollY * 0.003) * 20}px) rotate(${scrollY * 0.005}deg)`
          }}
        ></div>
        <div 
          className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl animate-float-reverse"
          style={{
            animationDelay: '1s',
            transform: `translateY(${Math.cos(scrollY * 0.002) * 20}px) rotate(${-scrollY * 0.005}deg)`
          }}
        ></div>
        
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          transform: `translate(${scrollY * 0.02}px, ${scrollY * 0.01}px)`
        }}></div>
        
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full animate-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
        
        <div 
          className="absolute w-[800px] h-[800px] bg-gradient-to-r from-cyan-500/5 to-purple-500/5 rounded-full blur-3xl transition-all duration-300 ease-out"
          style={{
            transform: `translate(${mousePosition.x - 400}px, ${mousePosition.y - 400}px)`,
          }}
        ></div>
        
        <svg className="absolute inset-0 w-full h-full" style={{opacity: 0.1}}>
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor: '#22d3ee', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: '#a855f7', stopOpacity: 1}} />
            </linearGradient>
          </defs>
          {[...Array(5)].map((_, i) => (
            <path
              key={i}
              d={`M ${Math.random() * 100}% ${Math.random() * 100}% 
                  C ${Math.random() * 100}% ${Math.random() * 100}%, 
                    ${Math.random() * 100}% ${Math.random() * 100}%, 
                    ${Math.random() * 100}% ${Math.random() * 100}%`}
              stroke="url(#gradient)"
              strokeWidth="1"
              fill="none"
              className="animate-draw"
              style={{strokeDasharray: 1000, strokeDashoffset: 1000, animationDelay: `${i * 0.5}s`}}
            />
          ))}
        </svg>
      </div>


      {/* Main Content */}
      <div className="relative z-10 pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          {/* Animated Header */}
          <div className={`text-center mb-10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="relative inline-block mb-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 flex items-center justify-center shadow-lg animate-float mx-auto">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full blur-xl opacity-30 animate-ping"></div>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                Join VeriFind
              </span>
            </h1>
            <p className="text-lg text-slate-300">
              Start finding lost items in minutes
            </p>
          </div>

          {/* Registration Card */}
          <div className={`bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{animationDelay: '0.2s'}}>
            {/* Benefits Section */}
            <div className="mb-8">
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-emerald-400 font-bold text-sm">✓</span>
                  </div>
                  <p className="text-slate-300 text-sm">AI-powered item matching with 95% accuracy</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-cyan-400 font-bold text-sm">✓</span>
                  </div>
                  <p className="text-slate-300 text-sm">Secure verification to protect your items</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-purple-400 font-bold text-sm">✓</span>
                  </div>
                  <p className="text-slate-300 text-sm">Instant notifications when items are found</p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-gradient-to-r from-red-500/10 to-red-600/10 backdrop-blur-sm border border-red-500/30 rounded-xl animate-shake">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            )}

            {/* Google Sign Up Button */}
            <div className="relative group">
              <button
                onClick={handleGoogleSignUp}
                disabled={isLoading}
                className="relative w-full flex items-center justify-center px-8 py-5 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border-2 border-white/20 rounded-xl font-semibold text-white hover:border-emerald-500/50 hover:from-emerald-500/10 hover:to-green-500/10 focus:ring-4 focus:ring-emerald-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
              >
                {/* Background gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Shine effect */}
                <div className="absolute -inset-x-24 -inset-y-8 bg-gradient-to-r from-transparent via-white/10 to-transparent -rotate-45 group-hover:translate-x-96 transition-transform duration-1000"></div>
                
                {/* Button Content */}
                <div className="relative z-10 flex items-center">
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      <span className="text-lg">Creating account...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 mr-4 bg-white rounded-lg flex items-center justify-center p-1.5">
                        <svg viewBox="0 0 24 24" className="w-full h-full">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-semibold">Sign up with Google</div>
                        <div className="text-xs text-slate-400">Fast, secure, and free</div>
                      </div>
                    </>
                  )}
                </div>
              </button>
              
              {/* Border animation on hover */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300 pointer-events-none"></div>
            </div>

            {/* Security Info */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center justify-center space-x-4">
                <div className="flex items-center text-slate-400">
                  <svg className="w-4 h-4 mr-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-sm">Military-grade Security</span>
                </div>
                <div className="flex items-center text-slate-400">
                  <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm">Lightning Fast</span>
                </div>
              </div>
              <p className="mt-4 text-center text-sm text-slate-400">
                Powered by Firebase Authentication
              </p>
            </div>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm text-slate-400">Already have an account?</span>
              </div>
            </div>

            {/* Login Link */}
            <div className="text-center">
              <Link 
                to="/login" 
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-white/20 hover:border-cyan-500/50 hover:from-cyan-500/10 hover:to-blue-500/10 text-white font-medium transition-all duration-300 group"
              >
                <span>Sign In Instead</span>
                <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Stats Preview */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border border-white/10 animate-stat-pop">
              <div className="text-xl font-bold text-white">95%</div>
              <div className="text-xs text-slate-400">Success Rate</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 backdrop-blur-sm border border-white/10 animate-stat-pop" style={{animationDelay: '0.1s'}}>
              <div className="text-xl font-bold text-white">10K+</div>
              <div className="text-xs text-slate-400">Users</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-white/10 animate-stat-pop" style={{animationDelay: '0.2s'}}>
              <div className="text-xl font-bold text-white">2.5K+</div>
              <div className="text-xs text-slate-400">Items Found</div>
            </div>
          </div>

          {/* Footer Text */}
          <p className="mt-8 text-center text-slate-400 text-sm">
            By signing up, you agree to our{" "}
            <Link to="/terms" className="text-emerald-400 hover:text-emerald-300 transition-colors">Terms of Service</Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-emerald-400 hover:text-emerald-300 transition-colors">Privacy Policy</Link>
          </p>

          {/* Loading Overlay */}
          {isLoading && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-8 max-w-md text-center animate-pop border border-white/20">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 flex items-center justify-center mx-auto mb-6 animate-bounce">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Creating Your Account</h3>
                <p className="text-slate-300 mb-6">Setting up your secure VeriFind profile...</p>
                <div className="w-full bg-white/10 backdrop-blur-sm rounded-full h-2">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Chat Button with pulse */}
      <div className="fixed bottom-8 right-8 z-50 group">
        <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full blur-xl animate-ping-slow opacity-0 group-hover:opacity-100"></div>
        <button className="relative w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center text-2xl shadow-2xl hover:scale-110 transition-transform duration-300 group">
          <span className="group-hover:rotate-12 transition-transform">💬</span>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
        </button>
      </div>

      {/* Add custom CSS for animations */}
      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(-20px); }
          50% { transform: translateY(0px); }
        }
        @keyframes particle {
          0% { transform: translateY(0px) translateX(0px); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
        }
        @keyframes draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes pop {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          70% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        @keyframes stat-pop {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .animate-gradient { 
          background-size: 200% 200%;
          animation: gradient 3s ease infinite; 
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse 8s ease-in-out infinite; }
        .animate-particle { animation: particle linear infinite; }
        .animate-draw { animation: draw 3s linear forwards; }
        .animate-ping-slow { animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .animate-pop { animation: pop 0.4s ease-out; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animate-stat-pop { animation: stat-pop 0.5s ease-out; }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 10px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 5px;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #22d3ee, #a855f7);
          border-radius: 5px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #0ea5e9, #9333ea);
        }
        
        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}

// Navigation Link Component
function NavLink({ to, text }) {
  return (
    <Link
      to={to}
      className="relative px-3 py-2 text-sm text-slate-300 hover:text-white transition-colors duration-300 group whitespace-nowrap"
    >
      {text}
      <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 group-hover:w-4/5 transition-all duration-300 rounded-full"></span>
    </Link>
  );
}

// Mobile Navigation Link Component
function MobileNavLink({ to, text, icon }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center p-2 text-xs text-slate-300 hover:text-white transition-colors duration-300"
    >
      <span className="text-lg mb-1">{icon}</span>
      <span>{text}</span>
    </Link>
  );
}

export default Register;