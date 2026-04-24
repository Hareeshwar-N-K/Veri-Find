import React from "react";
import { Link } from "react-router-dom";
import {
  FiTwitter,
  FiInstagram,
  FiGithub,
  FiMail,
  FiMapPin,
  FiPhone,
} from "react-icons/fi";
import { FaRocket, FaDiscord, FaLinkedin } from "react-icons/fa";

function Footer() {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { path: "/", label: "Home" },
    { path: "/report-lost", label: "Report Lost" },
    { path: "/report-found", label: "Report Found" },
    { path: "/dashboard", label: "Dashboard" },
    { path: "/admin", label: "Admin Panel" },
  ];

  const supportLinks = [
    { path: "/about#about", label: "About Us" },
    { path: "/about#features", label: "Features" },
    { path: "/about#contact", label: "Contact" },
    { path: "/about#privacy", label: "Privacy" },
  ];

  const socialLinks = [
    { icon: <FiTwitter className="w-5 h-5" />, href: "#", label: "Twitter" },
    {
      icon: <FiInstagram className="w-5 h-5" />,
      href: "#",
      label: "Instagram",
    },
    { icon: <FaDiscord className="w-5 h-5" />, href: "#", label: "Discord" },
    { icon: <FiGithub className="w-5 h-5" />, href: "#", label: "GitHub" },
    { icon: <FaLinkedin className="w-5 h-5" />, href: "#", label: "LinkedIn" },
  ];

  const contactInfo = [
    { icon: <FiMail className="w-5 h-5" />, text: "support@verifind.com" },
    { icon: <FiPhone className="w-5 h-5" />, text: "+1 (555) 123-4567" },
    {
      icon: <FiMapPin className="w-5 h-5" />,
      text: "Coimbatore Institute of Technology, Coimbatore",
    },
  ];

  return (
    <footer className="relative bg-gradient-to-b from-gray-900/95 to-gray-900 text-white border-t border-cyan-500/20">
      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-gradient-to-r from-cyan-400/30 to-purple-400/30 rounded-full animate-float"
            style={{
              left: `${5 + i * 8}%`,
              top: `${20 + Math.sin(i) * 60}%`,
              animationDelay: `${i * 0.2}s`,
              animationDuration: "8s",
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="group flex items-center space-x-3 mb-6">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <FaRocket className="w-7 h-7 text-white transform group-hover:rotate-12 transition-transform" />
                </div>
              </div>
              <div className="relative">
                <span className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                  VeriFind
                </span>
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
              </div>
            </div>
            <p className="text-gray-400 mb-8 max-w-md text-lg leading-relaxed">
              The smartest campus lost & found platform powered by AI to reunite
              you with your belongings in record time.
            </p>

            {/* Contact Info */}
            <div className="space-y-4">
              {contactInfo.map((info, index) => (
                <div key={index} className="flex items-center gap-3 group">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 group-hover:border-cyan-500/40 transition-colors">
                    {info.icon}
                  </div>
                  <span className="text-gray-300 group-hover:text-cyan-300 transition-colors">
                    {info.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links Column */}
          <div>
            <h3 className="text-xl font-bold mb-6">Quick Links</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="group flex items-center gap-2 text-gray-400 hover:text-cyan-300 transition-colors duration-300"
                  >
                    <span className="w-0 h-0.5 bg-cyan-500 rounded-full group-hover:w-3 transition-all duration-300"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <h3 className="text-xl font-bold mb-6">Support</h3>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="group flex items-center gap-2 text-gray-400 hover:text-purple-300 transition-colors duration-300"
                  >
                    <span className="w-0 h-0.5 bg-purple-500 rounded-full group-hover:w-3 transition-all duration-300"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="my-12 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="text-gray-500 text-sm">
              © {currentYear} VeriFind. All rights reserved.
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social, index) => (
              <a
                key={index}
                href={social.href}
                aria-label={social.label}
                className="group relative p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 text-cyan-300 hover:text-white hover:border-cyan-400 transition-all duration-300"
              >
                <div className="relative z-10">{social.icon}</div>
                <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </a>
            ))}
          </div>
        </div>

        {/* Back to Top */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="group fixed bottom-8 right-8 md:right-12 z-50"
        >
          <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center text-2xl shadow-2xl hover:scale-110 transition-transform duration-300 group">
            <span className="transform rotate-90 group-hover:-translate-y-1 transition-transform">
              ↥
            </span>
          </div>
        </button>
      </div>
    </footer>
  );
}

export default Footer;
