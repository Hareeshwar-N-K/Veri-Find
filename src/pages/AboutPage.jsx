// AboutPage.jsx
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  FiArrowLeft, 
  FiCheck, 
  FiMail, 
  FiShield,
  FiMessageSquare,
  FiUsers,
  FiTarget,
  FiBarChart2,
  FiClock,
  FiGlobe
} from "react-icons/fi";
import { 
  FaRocket, 
  FaBrain, 
  FaShieldAlt, 
  FaMobileAlt,
  FaRegLightbulb,
  FaDatabase,
  FaHandshake
} from "react-icons/fa";

const AboutPage = () => {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState("about");
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Get section from URL hash
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash && ['about', 'features', 'contact', 'privacy'].includes(hash)) {
      setActiveSection(hash);
    }
    setIsVisible(true);
  }, [location]);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navigationItems = [
    { id: "about", label: "About Us", icon: FaRocket },
    { id: "features", label: "Features", icon: FaBrain },
    { id: "contact", label: "Contact", icon: FiMail },
    { id: "privacy", label: "Privacy", icon: FiShield }
  ];

  const features = [
    {
      icon: <FaBrain className="w-8 h-8" />,
      title: "AI-Powered Matching",
      description: "Advanced machine learning algorithms match lost items with found ones using image and description analysis.",
      gradient: "from-cyan-500 to-blue-500"
    },
    {
      icon: <FiTarget className="w-8 h-8" />,
      title: "Real-time Tracking",
      description: "Track the status of your lost items in real-time with instant notifications.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: <FaShieldAlt className="w-8 h-8" />,
      title: "Secure Verification",
      description: "Multi-step verification process ensures items are returned to their rightful owners.",
      gradient: "from-orange-500 to-yellow-500"
    },
    {
      icon: <FaMobileAlt className="w-8 h-8" />,
      title: "Mobile First",
      description: "Responsive design that works perfectly on all devices from mobile to desktop.",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: <FiBarChart2 className="w-8 h-8" />,
      title: "Smart Analytics",
      description: "Detailed analytics and insights to help improve campus security and item recovery.",
      gradient: "from-indigo-500 to-violet-500"
    },
    {
      icon: <FaDatabase className="w-8 h-8" />,
      title: "Data Protection",
      description: "End-to-end encryption ensures your personal information remains secure.",
      gradient: "from-red-500 to-pink-500"
    }
  ];

  const teamMembers = [
    {
      name: "Alex Johnson",
      role: "Lead Developer",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
      bio: "AI/ML specialist with 5+ years experience"
    },
    {
      name: "Maria Garcia",
      role: "UI/UX Designer",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
      bio: "Creating beautiful and intuitive interfaces"
    },
    {
      name: "David Chen",
      role: "Security Expert",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
      bio: "Ensuring platform security and privacy"
    }
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#0A0F29] via-[#111827] to-[#1E1B4B] text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl animate-float-reverse"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          transform: `translateY(${scrollY * 0.2}px)`
        }}></div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        {/* Header */}
        <div className={`mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <Link
            to="/"
            className="group inline-flex items-center text-cyan-300 hover:text-cyan-400 mb-6 transition-colors"
          >
            <FiArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>

          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
              About VeriFind
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              The smartest campus lost & found platform powered by AI technology
            </p>
          </div>

          {/* Navigation */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    window.location.hash = item.id;
                  }}
                  className={`group relative px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                    activeSection === item.id
                      ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white border border-cyan-500/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${
                      activeSection === item.id ? 'text-cyan-400' : 'group-hover:text-cyan-300'
                    }`} />
                    {item.label}
                  </div>
                  {activeSection === item.id && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          
          {/* About Section */}
          {activeSection === "about" && (
            <div className="space-y-12">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
                  <p className="text-gray-300 mb-6 text-lg leading-relaxed">
                    At VeriFind, we believe that losing personal items should never cause stress or inconvenience. 
                    Our mission is to create a seamless, intelligent platform that connects lost items with their 
                    owners using cutting-edge AI technology.
                  </p>
                  <p className="text-gray-300 mb-6 text-lg leading-relaxed">
                    Founded in 2023, we've helped thousands of students recover their belongings with a 
                    <span className="text-cyan-400 font-bold"> 98% success rate</span> and average recovery time of under 2 hours.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                      <div className="text-3xl font-bold text-cyan-400">10K+</div>
                      <div className="text-sm text-gray-400">Users Helped</div>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                      <div className="text-3xl font-bold text-purple-400">2.5K+</div>
                      <div className="text-sm text-gray-400">Items Found</div>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                      <div className="text-3xl font-bold text-emerald-400">98%</div>
                      <div className="text-sm text-gray-400">Success Rate</div>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -ins-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-50"></div>
                  <div className="relative p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10">
                    <h3 className="text-2xl font-bold mb-6">Our Values</h3>
                    <div className="space-y-4">
                      {[
                        "Transparency in all operations",
                        "User privacy and data security",
                        "Continuous innovation",
                        "Community collaboration",
                        "Quick and efficient service"
                      ].map((value, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                            <FiCheck className="w-4 h-4 text-cyan-400" />
                          </div>
                          <span className="text-gray-300">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Section */}
              <div className="mt-16">
                <h2 className="text-3xl font-bold mb-8 text-center">Our Team</h2>
                <div className="grid md:grid-cols-3 gap-8">
                  {teamMembers.map((member, index) => (
                    <div 
                      key={index}
                      className="group p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 hover:border-cyan-500/30 transition-all duration-300 hover:scale-105"
                    >
                      <div className="flex flex-col items-center text-center">
                        <img
                          src={member.image}
                          alt={member.name}
                          className="w-24 h-24 rounded-full border-4 border-cyan-500/30 mb-4 group-hover:border-cyan-400 transition-colors"
                        />
                        <h4 className="text-xl font-bold mb-2">{member.name}</h4>
                        <p className="text-cyan-400 mb-3">{member.role}</p>
                        <p className="text-gray-400 text-sm">{member.bio}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Features Section */}
          {activeSection === "features" && (
            <div className="space-y-12">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Advanced Features</h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  Discover the powerful features that make VeriFind the most efficient lost & found platform
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="group p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 hover:border-cyan-500/30 transition-all duration-300 hover:scale-105"
                  >
                    <div className={`w-16 h-16 mb-4 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white transform group-hover:scale-110 transition-transform duration-300`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-gray-400">{feature.description}</p>
                  </div>
                ))}
              </div>

              {/* Additional Stats */}
              <div className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-cyan-500/20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-cyan-400">24/7</div>
                    <div className="text-sm text-gray-400">Service Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-purple-400">50+</div>
                    <div className="text-sm text-gray-400">Campuses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-emerald-400">99.9%</div>
                    <div className="text-sm text-gray-400">Uptime</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-orange-400">5⭐</div>
                    <div className="text-sm text-gray-400">User Rating</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contact Section */}
          {activeSection === "contact" && (
            <div className="space-y-12">
              <div className="grid lg:grid-cols-2 gap-12">
                <div>
                  <h2 className="text-3xl font-bold mb-6">Get in Touch</h2>
                  <p className="text-gray-300 mb-8">
                    Have questions or feedback? We'd love to hear from you. Our team is here to help.
                  </p>
                  
                  <div className="space-y-6">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                      <FiMail className="w-6 h-6 text-cyan-400 mt-1" />
                      <div>
                        <h4 className="font-bold mb-1">Email Support</h4>
                        <p className="text-gray-400">support@verifind.com</p>
                        <p className="text-sm text-gray-500">Response time: 2-4 hours</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                      <FiMessageSquare className="w-6 h-6 text-purple-400 mt-1" />
                      <div>
                        <h4 className="font-bold mb-1">Live Chat</h4>
                        <p className="text-gray-400">Available 9AM-6PM EST</p>
                        <p className="text-sm text-gray-500">Click the chat icon in bottom right</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                      <FiUsers className="w-6 h-6 text-emerald-400 mt-1" />
                      <div>
                        <h4 className="font-bold mb-1">Campus Support</h4>
                        <p className="text-gray-400">Contact your campus admin</p>
                        <p className="text-sm text-gray-500">For institution-specific queries</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-30"></div>
                  <div className="relative p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10">
                    <h3 className="text-2xl font-bold mb-6">Contact Form</h3>
                    <form className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Name</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:outline-none transition-colors"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Email</label>
                        <input
                          type="email"
                          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:outline-none transition-colors"
                          placeholder="you@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Message</label>
                        <textarea
                          rows={4}
                          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:outline-none transition-colors"
                          placeholder="Your message..."
                        ></textarea>
                      </div>
                      <button
                        type="submit"
                        className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-600 hover:to-blue-700 transition-all duration-300"
                      >
                        Send Message
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Section */}
          {activeSection === "privacy" && (
            <div className="space-y-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Privacy Policy</h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  We take your privacy seriously. Here's how we protect your information.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  {
                    title: "Data Collection",
                    content: "We only collect necessary information to provide our service, including item descriptions, images, and basic user information for contact purposes."
                  },
                  {
                    title: "Data Usage",
                    content: "Your data is used exclusively for matching lost and found items. We never sell or share your personal information with third parties."
                  },
                  {
                    title: "Security Measures",
                    content: "All data is encrypted in transit and at rest using industry-standard AES-256 encryption. Regular security audits ensure compliance."
                  },
                  {
                    title: "User Rights",
                    content: "You have the right to access, modify, or delete your data at any time through your account settings or by contacting support."
                  },
                  {
                    title: "Cookies",
                    content: "We use minimal cookies for essential functionality. No tracking cookies are used for advertising purposes."
                  },
                  {
                    title: "Compliance",
                    content: "VeriFind complies with GDPR, CCPA, and other major privacy regulations to ensure your rights are protected."
                  }
                ].map((section, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                        <FiShield className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">{section.title}</h3>
                        <p className="text-gray-400">{section.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-4">
                  <FaHandshake className="w-12 h-12 text-emerald-400" />
                  <div>
                    <h4 className="text-xl font-bold mb-2">Transparency Promise</h4>
                    <p className="text-gray-300">
                      We're committed to being transparent about our privacy practices. If you have any questions, 
                      please contact our privacy team at <span className="text-cyan-400">privacy@verifind.com</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 border-t border-white/10 mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center animate-spin-slow group-hover:animate-none">
                  <span className="text-2xl">🔍</span>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>
              </div>
              <div>
                <h3 className="text-xl font-bold group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-400 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                  VeriFind
                </h3>
                <p className="text-sm text-gray-400 group-hover:text-gray-300">Smart Campus Recovery</p>
              </div>
            </div>
            
            <div className="flex gap-8">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    window.location.hash = item.id;
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 relative group cursor-pointer"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-cyan-400 group-hover:w-full transition-all duration-300"></span>
                </button>
              ))}
            </div>
            
            <div className="text-sm text-gray-500 group hover:text-gray-300 transition-colors duration-300">
              © 2024 VeriFind. All rights reserved.
              <div className="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500 mt-1"></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;