import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";


function Home() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Check if user is admin and redirect if needed
    if (currentUser) {
      const adminEmails = [
        "kavinvk26@gmail.com",
        "aishwaryaa5432@gmail.com",
        "admin@example.com",
        "superuser@gmail.com",
        "admin@gmail.com",
        "verifindadmin@gmail.com",
      ];
      
      if (adminEmails.includes(currentUser.email)) {
        setRedirecting(true);
        // Small delay to show the home page briefly
        const timer = setTimeout(() => {
          navigate("/admin");
        }, 1500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    setIsVisible(true);
    
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const features = [
    {
      icon: "🔍",
      title: "AI-Powered Search",
      description: "Our intelligent matching algorithm finds lost items with 95% accuracy.",
      gradient: "from-cyan-500 to-blue-500"
    },
    {
      icon: "🛡️",
      title: "Secure Verification",
      description: "Multi-step verification ensures items go to the right owner.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: "⚡",
      title: "Instant Notifications",
      description: "Get real-time alerts when your item is found.",
      gradient: "from-orange-500 to-yellow-500"
    },
    {
      icon: "📱",
      title: "Mobile Friendly",
      description: "Access from any device, anywhere on campus.",
      gradient: "from-green-500 to-emerald-500"
    }
  ];

  const testimonials = [
    {
      name: "Alex Johnson",
      role: "Computer Science Student",
      text: "Found my lost laptop in 2 hours! This platform is a lifesaver.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
    },
    {
      name: "Maria Garcia",
      role: "Engineering Student",
      text: "Recovered my textbook before finals. Thank you Veri-Find!",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria"
    },
    {
      name: "David Chen",
      role: "Campus Security",
      text: "Makes our job easier. Highly recommended for all students.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David"
    }
  ];

  // Stats for the preview
  const stats = [
    { value: "2,500+", label: "Items Found" },
    { value: "10K+", label: "Active Users" },
    { value: "98%", label: "Success Rate" },
    { value: "<2h", label: "Avg. Recovery" }
  ];

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#0A0F29] via-[#111827] to-[#1E1B4B] text-white min-h-screen">
      {/* Admin Redirect Overlay */}
      {redirecting && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="text-center p-8 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 max-w-md mx-4">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
              <span className="text-3xl">👑</span>
            </div>
            <h3 className="text-2xl font-bold mb-3">Welcome Admin!</h3>
            <p className="text-slate-300 mb-6">
              Redirecting you to the Admin Panel...
            </p>
            <div className="w-48 h-2 bg-white/20 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}></div>
        
        {/* Mouse Following Light */}
        <div 
          className="absolute w-[800px] h-[800px] bg-gradient-to-r from-cyan-500/5 to-purple-500/5 rounded-full blur-3xl transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${mousePosition.x - 400}px, ${mousePosition.y - 400}px)`
          }}
        ></div>
      </div>



      {/* Hero Section */}
      <section className="relative z-10 py-20 px-6 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-cyan-500/30 mb-8">
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></span>
              <span className="text-sm">Trusted by 10,000+ Students</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl lg:text-8xl font-bold mb-6 leading-tight">
              Lost{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
                  Something?
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-400 blur-xl opacity-30"></span>
              </span>
              <br />
              We'll{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
                  Find It
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 blur-xl opacity-30"></span>
              </span>
              .
            </h1>

            {/* Subheading */}
            <p className="text-xl lg:text-2xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
              The smartest campus lost & found platform powered by AI to reunite you with your belongings
              in record time.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Link
                to="/report-lost"
                className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-lg font-semibold overflow-hidden transition-all duration-300"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  <span className="text-xl">🔍</span>
                  Report Lost Item
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>

              <Link
                to="/report-found"
                className="group px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-lg font-semibold hover:bg-white/20 transition-all duration-300"
              >
                <span className="flex items-center justify-center gap-3">
                  <span className="text-xl">🎯</span>
                  Report Found Item
                </span>
              </Link>
            </div>

            {/* Stats Preview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {stats.map((stat, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-cyan-500/30 transition-all duration-300 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{transitionDelay: `${index * 100}ms`}}
                >
                  <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-6 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Why <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">VeriFind</span> Works
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Advanced technology meets user-friendly design for the best recovery experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 hover:border-cyan-500/30 transition-all duration-500 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{transitionDelay: `${index * 100}ms`}}
              >
                {/* Background Glow */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-3xl`}></div>
                
                <div className="relative z-10">
                  <div className={`w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-3xl`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-slate-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 py-20 px-6 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Trusted by <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Campus Heroes</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`group p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 hover:border-cyan-500/30 transition-all duration-500 ${
                  isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
                style={{transitionDelay: `${index * 200}ms`}}
              >
                <div className="flex items-center gap-4 mb-6">
                  <img
                    src={testimonial.avatar}
                    className="w-14 h-14 rounded-full border-2 border-cyan-500/50"
                    alt={testimonial.name}
                  />
                  <div>
                    <h4 className="font-semibold">{testimonial.name}</h4>
                    <p className="text-sm text-slate-400">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-slate-300 italic">"{testimonial.text}"</p>
                <div className="flex gap-1 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-yellow-400">⭐</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 py-20 px-6 lg:px-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className={`relative p-12 rounded-3xl overflow-hidden transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]"></div>
            
            <div className="relative z-10">
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                Ready to Find Your Lost Items?
              </h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                Join thousands of students who have successfully recovered their belongings
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link
                  to="/register"
                  className="group relative px-10 py-5 rounded-2xl text-lg font-bold overflow-hidden transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 group-hover:scale-105 transition-transform duration-300"></div>
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    Start Free Today
                    <span className="text-xl group-hover:translate-x-2 transition-transform duration-300">🚀</span>
                  </span>
                </Link>
                
                <Link
                  to="/how-it-works"
                  className="px-10 py-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-lg font-semibold transition-all duration-300"
                >
                  See How It Works
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 lg:px-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔍</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">VeriFind</h3>
                <p className="text-sm text-slate-400">Smart Campus Recovery</p>
              </div>
            </div>
            
            <div className="flex gap-8">
              {["About", "Features", "Contact", "Privacy"].map((item) => (
                <Link
                  key={item}
                  to={`/${item.toLowerCase()}`}
                  className="text-slate-400 hover:text-cyan-400 transition-colors duration-300"
                >
                  {item}
                </Link>
              ))}
            </div>
            
            <div className="text-sm text-slate-500">
              © 2024 VeriFind. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Chat Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <button className="w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center text-2xl shadow-2xl hover:scale-110 transition-transform duration-300">
          💬
        </button>
      </div>

      {/* Add custom CSS for animations */}
      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}

export default Home;