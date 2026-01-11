import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiHome, 
  FiSearch, 
  FiNavigation,
  FiArrowRight,
  FiGlobe,
  FiCompass
} from 'react-icons/fi';
import { 
  FaRocket, 
  FaSatelliteDish, 
  FaRegCompass,
  FaMapMarkerAlt,
  FaGhost
} from 'react-icons/fa';

const NotFound = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [floatElements, setFloatElements] = useState([]);

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
    
    // Generate floating elements
    const elements = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 20 + 10,
      delay: Math.random() * 5,
      duration: Math.random() * 4 + 3,
      icon: ['🔍', '📱', '💼', '🔑', '💻', '🎧', '📚', '⌚', '🕶️', '💳'][i % 10]
    }));
    setFloatElements(elements);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#0A0F29] via-[#111827] to-[#1E1B4B] text-white min-h-screen">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
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
        
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          transform: `translate(${scrollY * 0.02}px, ${scrollY * 0.01}px)`
        }}></div>
        
        {/* Floating Lost Items */}
        {floatElements.map((element) => (
          <div
            key={element.id}
            className="absolute animate-particle"
            style={{
              left: `${element.left}%`,
              top: `${element.top}%`,
              fontSize: `${element.size}px`,
              animationDelay: `${element.delay}s`,
              animationDuration: `${element.duration}s`
            }}
          >
            {element.icon}
          </div>
        ))}
        
        {/* Mouse Following Light */}
        <div 
          className="absolute w-[800px] h-[800px] bg-gradient-to-r from-cyan-500/5 to-purple-500/5 rounded-full blur-3xl transition-all duration-300 ease-out"
          style={{
            transform: `translate(${mousePosition.x - 400}px, ${mousePosition.y - 400}px) scale(${1 + Math.sin(Date.now() * 0.001) * 0.1})`,
          }}
        ></div>
        
        {/* Animated Connection Lines */}
        <svg className="absolute inset-0 w-full h-full" style={{opacity: 0.1}}>
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor: '#22d3ee', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: '#a855f7', stopOpacity: 1}} />
            </linearGradient>
          </defs>
          {[...Array(8)].map((_, i) => (
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
      <div className="relative z-10">
        <section className="relative pt-24 pb-20 px-6 lg:px-20 min-h-screen flex items-center">
          <div className="max-w-7xl mx-auto w-full">
            <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              {/* Animated Lost Ghost */}
              <div className="relative mb-8">
                <div className="w-48 h-48 mx-auto mb-6">
                  <div className="relative w-full h-full">
                    <FaGhost className="absolute inset-0 text-cyan-400/30 w-full h-full animate-pulse-slow" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-9xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
                        404
                      </span>
                    </div>
                    <div className="absolute -inset-8 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-3xl rounded-full animate-ping-slow"></div>
                  </div>
                </div>
                
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-cyan-500/30 animate-float-slow group">
                  <span className="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></span>
                  <span className="text-sm group-hover:text-cyan-300 transition-colors">🚀 Item Not Found in Database</span>
                  <div className="w-0 group-hover:w-4 h-[2px] bg-cyan-400 transition-all duration-300"></div>
                </div>
              </div>

              {/* Main Heading */}
              <h1 className="text-5xl lg:text-8xl font-bold mb-6 leading-tight">
                Lost in{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
                    Cyberspace
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-400 blur-2xl opacity-30 animate-pulse-slow"></span>
                </span>
                <br />
                <div 
                  className="inline-block mt-4"
                  style={{
                    transform: `translateY(${Math.sin(scrollY * 0.005) * 10}px)`
                  }}
                >
                  But We Can{" "}
                  <span className="relative inline-block">
                    <span className="relative z-10 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient-reverse">
                      Guide You
                    </span>
                    <span className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 blur-2xl opacity-30 animate-pulse-slow" style={{animationDelay: '0.5s'}}></span>
                  </span>
                  Back
                </div>
              </h1>

              {/* Subheading */}
              <p className="text-xl lg:text-2xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed animate-typewriter">
                This page seems to have wandered off, just like your lost items might have. 
                But don't worry - we're experts at finding things!
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-16">
                {[
                  { value: "99.9%", label: "Recovery Rate", icon: "📈", color: "cyan" },
                  { value: "2,500+", label: "Items Found", icon: "🎯", color: "purple" },
                  { value: "<2h", label: "Avg. Time", icon: "⚡", color: "green" },
                  { value: "10K+", label: "Happy Users", icon: "👥", color: "orange" }
                ].map((stat, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-cyan-500/50 transition-all duration-300 animate-stat-pop hover:scale-105 group`}
                    style={{
                      animationDelay: `${index * 0.1 + 0.4}s`,
                      transform: `translateY(${Math.sin(scrollY * 0.003 + index) * 5}px)`
                    }}
                  >
                    <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                      {stat.value}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-sm text-slate-400 group-hover:text-slate-300">{stat.label}</div>
                      <div className="text-lg animate-wiggle">{stat.icon}</div>
                    </div>
                    <div className="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500 mt-2 rounded-full"></div>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
                <Link
                  to="/"
                  className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-lg font-semibold overflow-hidden transition-all duration-300 animate-slide-up hover:scale-105"
                  style={{animationDelay: '0.2s'}}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 animate-gradient-slow"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    <FiHome className="text-xl group-hover:rotate-180 transition-transform duration-500" />
                    Navigate Home
                  </span>
                  <div className="absolute -inset-x-24 -inset-y-8 bg-gradient-to-r from-transparent via-white/20 to-transparent -rotate-45 group-hover:translate-x-96 transition-transform duration-1000"></div>
                </Link>

                <Link
                  to="/dashboard"
                  className="group relative px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-lg font-semibold hover:bg-white/20 transition-all duration-300 animate-slide-up hover:scale-105"
                  style={{animationDelay: '0.3s'}}
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    <FiCompass className="text-xl group-hover:bounce" />
                    Your Dashboard
                  </span>
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300"></div>
                </Link>

                <Link
                  to="/browse"
                  className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 text-lg font-semibold overflow-hidden transition-all duration-300 animate-slide-up hover:scale-105"
                  style={{animationDelay: '0.4s'}}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    <FiSearch className="text-xl group-hover:rotate-90 transition-transform" />
                    Browse Items
                    <FiArrowRight className="group-hover:translate-x-2 transition-transform" />
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div 
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce"
            style={{
              opacity: 1 - scrollY * 0.005
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-slate-400">Explore options below</span>
              <div className="w-6 h-10 border-2 border-cyan-500/30 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-gradient-to-b from-cyan-400 to-purple-400 rounded-full mt-2 animate-pulse"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Navigation Section */}
        <section className="relative py-20 px-6 lg:px-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold mb-6 animate-slide-up">
                Quick <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent animate-gradient">Navigation</span>
              </h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto animate-slide-up" style={{animationDelay: '0.1s'}}>
                Find your way to these popular destinations
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: <FaRocket className="text-3xl" />,
                  title: "Report Lost Item",
                  description: "Can't find something? Let our AI help",
                  gradient: "from-cyan-500 to-blue-500",
                  to: "/report-lost"
                },
                {
                  icon: <FaSatelliteDish className="text-3xl" />,
                  title: "Report Found Item",
                  description: "Found something? Help reunite it",
                  gradient: "from-green-500 to-emerald-500",
                  to: "/report-found"
                },
                {
                  icon: <FaRegCompass className="text-3xl" />,
                  title: "Your Dashboard",
                  description: "Track all your items in one place",
                  gradient: "from-purple-500 to-pink-500",
                  to: "/dashboard"
                },
                {
                  icon: <FaMapMarkerAlt className="text-3xl" />,
                  title: "Browse Items",
                  description: "Help others find their lost items",
                  gradient: "from-orange-500 to-yellow-500",
                  to: "/browse"
                }
              ].map((item, index) => (
                <Link
                  key={index}
                  to={item.to}
                  className={`group relative p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 hover:border-cyan-500/30 transition-all duration-500 animate-slide-up hover:scale-105`}
                  style={{animationDelay: `${index * 0.1 + 0.2}s`}}
                >
                  <div className={`relative z-10 w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-3xl transform group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300`}>
                    {item.icon}
                    <div className={`absolute -inset-2 bg-cyan-500/20 blur-lg rounded-2xl animate-ping opacity-0 group-hover:opacity-100`}></div>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3 relative z-10 group-hover:text-cyan-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-slate-400 relative z-10">{item.description}</p>
                  
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative py-20 px-6 lg:px-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className={`relative p-12 rounded-3xl overflow-hidden transition-all duration-1000 animate-slide-up ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 animate-gradient-x"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)] animate-pulse-slow"></div>
              
              <div className="relative z-10">
                <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                  Ready to Find What You're Looking For?
                </h2>
                <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto animate-typewriter" style={{animationDelay: '0.5s'}}>
                  Whether it's a lost item or just the right page, we're here to help
                </p>
                
                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                  <Link
                    to="/contact"
                    className="group relative px-10 py-5 rounded-2xl text-lg font-bold overflow-hidden transition-all duration-300 animate-pulse-slow hover:scale-105"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 animate-gradient-slow"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-blue-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      Need Help?
                      <span className="text-xl group-hover:translate-x-2 group-hover:rotate-12 transition-all duration-300">🚀</span>
                    </span>
                  </Link>
                  
                  <Link
                    to="/how-it-works"
                    className="group px-10 py-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-lg font-semibold transition-all duration-300 hover:scale-105"
                  >
                    <span className="flex items-center justify-center gap-3">
                      How It Works
                      <span className="group-hover:rotate-180 transition-transform duration-500">▶</span>
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Navigation */}
        <footer className="relative py-12 px-6 lg:px-20 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center animate-spin-slow group-hover:animate-none">
                    <FiNavigation className="text-white text-xl" />
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>
                </div>
                <div>
                  <h3 className="text-xl font-bold group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-400 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                    VeriFind
                  </h3>
                  <p className="text-sm text-slate-400 group-hover:text-slate-300">Smart Recovery System</p>
                </div>
              </div>
              
              <div className="flex gap-8">
                {["Home", "Dashboard", "Browse", "Help"].map((item, index) => (
                  <Link
                    key={item}
                    to={`/${item === 'Home' ? '' : item.toLowerCase()}`}
                    className="text-slate-400 hover:text-cyan-400 transition-colors duration-300 relative group"
                  >
                    {item}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-400 group-hover:w-full transition-all duration-300"></span>
                  </Link>
                ))}
              </div>
              
              <div className="text-sm text-slate-500 group hover:text-slate-300 transition-colors duration-300">
                © 2024 VeriFind. All rights reserved.
                <div className="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500 mt-1"></div>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Floating Navigation Button */}
      <div className="fixed bottom-8 right-8 z-50 group">
        <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full blur-xl animate-ping-slow opacity-0 group-hover:opacity-100"></div>
        <Link
          to="/"
          className="relative w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center text-2xl shadow-2xl hover:scale-110 transition-transform duration-300 group"
        >
          <FiHome className="group-hover:rotate-12 transition-transform" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
        </Link>
      </div>

      {/* Add custom CSS for animations */}
      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes gradient-reverse {
          0%, 100% { background-position: 100% 50%; }
          50% { background-position: 0% 50%; }
        }
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 100% 0%; }
        }
        @keyframes gradient-slow {
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
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes stat-pop {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes typewriter {
          from { width: 0; }
          to { width: 100%; }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        @keyframes particle {
          0% { transform: translateY(0px) translateX(0px); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
        }
        @keyframes draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-gradient { 
          background-size: 200% 200%;
          animation: gradient 3s ease infinite; 
        }
        .animate-gradient-reverse { 
          background-size: 200% 200%;
          animation: gradient-reverse 3s ease infinite; 
        }
        .animate-gradient-x { 
          background-size: 200% 100%;
          animation: gradient-x 4s ease infinite; 
        }
        .animate-gradient-slow { 
          background-size: 200% 200%;
          animation: gradient-slow 6s ease infinite; 
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse 8s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 4s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 2s ease-in-out infinite; }
        .animate-ping-slow { animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .animate-slide-up { animation: slide-up 0.6s ease-out; }
        .animate-stat-pop { animation: stat-pop 0.5s ease-out; }
        .animate-typewriter { 
          overflow: hidden;
          white-space: nowrap;
          animation: typewriter 2s steps(40, end);
        }
        .animate-wiggle { animation: wiggle 0.5s ease-in-out; }
        .animate-particle { animation: particle linear infinite; }
        .animate-draw { animation: draw 3s linear forwards; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-bounce { animation: bounce 2s ease-in-out infinite; }
        
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
};

export default NotFound;