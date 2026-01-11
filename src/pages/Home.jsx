import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Loader } from "@googlemaps/js-api-loader";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

// Correct CIT Coimbatore coordinates: 11.0283° N, 77.0273° E
const CIT_COORDINATES = {
  lat: 11.0283,
  lng: 77.0273,
  zoom: 17,
};

function Home() {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Google Maps states
  const [map, setMap] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(null);
  const mapRef = useRef(null);

  // Campus statistics
  const [campusStats, setCampusStats] = useState({
    totalLostItems: 0,
    hotspots: [],
    recoveryRateByArea: {},
    todayLostItems: 0,
    thisWeekLostItems: 0,
  });

  // Heatmap data from Firestore
  const [heatmapData, setHeatmapData] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    // Check if user is admin from database role and redirect if needed
    if (currentUser && isAdmin) {
      setRedirecting(true);
      // Small delay to show the home page briefly
      const timer = setTimeout(() => {
        navigate("/admin");
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [currentUser, isAdmin, navigate]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    setIsVisible(true);

    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    // Load campus statistics
    loadCampusStats();

    // Load Google Maps with timeout
    const timer = setTimeout(() => {
      loadGoogleMap();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Load Google Maps with proper error handling
  // Updated Google Maps loading function
  const loadGoogleMap = async () => {
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

      if (!apiKey || apiKey.includes("YOUR_API_KEY")) {
        setMapError(
          "Google Maps API key not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file"
        );
        setMapLoading(false);
        return;
      }

      // NEW: Use functional API as per the error message
      ((g) => {
        var h,
          a,
          k,
          p = "The Google Maps JavaScript API",
          c = "google",
          l = "importLibrary",
          q = "__ib__",
          m = document,
          b = window;
        b = b[c] || (b[c] = {});
        var d = b.maps || (b.maps = {}),
          r = new Set(),
          e = new URLSearchParams(),
          u = () =>
            h ||
            (h = new Promise(async (f, n) => {
              await (a = m.createElement("script"));
              e.set("libraries", [...r] + "");
              for (k in g)
                e.set(
                  k.replace(/[A-Z]/g, (t) => "_" + t[0].toLowerCase()),
                  g[k]
                );
              e.set("callback", c + ".maps." + q);
              a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
              d[q] = f;
              a.onerror = () => (h = n(Error(p + " could not load.")));
              a.nonce = m.querySelector("script[nonce]")?.nonce || "";
              m.head.append(a);
            }));
        d[l]
          ? console.warn(p + " only loads once. Ignoring:", g)
          : (d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)));
      })({
        key: apiKey,
        v: "weekly",
        libraries: ["visualization", "places", "geometry"],
      });

      // Wait for the library to load
      await window.google.maps.importLibrary("maps");
      await window.google.maps.importLibrary("visualization");

      // Initialize map
      const { Map } = await window.google.maps.importLibrary("maps");
      const { HeatmapLayer } = await window.google.maps.importLibrary(
        "visualization"
      );

      const mapInstance = new Map(mapRef.current, {
        center: CIT_COORDINATES,
        zoom: CIT_COORDINATES.zoom,
        mapTypeId: "hybrid",
        styles: [
          {
            elementType: "geometry",
            stylers: [{ color: "#1d2c4d" }],
          },
          {
            elementType: "labels.text.fill",
            stylers: [{ color: "#8ec3b9" }],
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#193341" }],
          },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#304a7d" }],
          },
        ],
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        scaleControl: true,
      });

      setMap(mapInstance);
      setMapError(null);
      setMapLoading(false);

      // Add campus markers (your existing function)
      addCampusMarkers(mapInstance);
    } catch (error) {
      console.error("Google Maps load failed:", error);
      setMapError(error.message);
      setMapLoading(false);
      showStaticMapFallback();
    }
  };
  // CIT Campus Buildings with corrected approximate coordinates
  const campusBuildings = [
    {
      name: "Main Building",
      position: { lat: 11.0285, lng: 77.0271 },
      icon: "🏛️",
      description: "Administration & Main Offices",
    },
    {
      name: "Central Library",
      position: { lat: 11.0288, lng: 77.0275 },
      icon: "📚",
      description: "Digital & Physical Resources",
    },
    {
      name: "Cafeteria",
      position: { lat: 11.0281, lng: 77.0278 },
      icon: "🍽️",
      description: "Main Food Court & Canteen",
    },
    {
      name: "Hostel Blocks",
      position: { lat: 11.029, lng: 77.028 },
      icon: "🏠",
      description: "Student Accommodation",
    },
    {
      name: "Sports Complex",
      position: { lat: 11.0278, lng: 77.0268 },
      icon: "⚽",
      description: "Gym & Sports Facilities",
    },
    {
      name: "Computer Center",
      position: { lat: 11.0286, lng: 77.027 },
      icon: "💻",
      description: "IT Department & Labs",
    },
    {
      name: "Parking Area",
      position: { lat: 11.028, lng: 77.0273 },
      icon: "🚗",
      description: "Main Vehicle Parking",
    },
    {
      name: "Auditorium",
      position: { lat: 11.0283, lng: 77.0276 },
      icon: "🎭",
      description: "Events & Gatherings",
    },
  ];

  // Add campus building markers
  const addCampusMarkers = (mapInstance) => {
    campusBuildings.forEach((building) => {
      const marker = new window.google.maps.Marker({
        position: building.position,
        map: mapInstance,
        title: building.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#4F46E5",
          fillOpacity: 0.8,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="p-3 bg-gray-900 text-white rounded-lg shadow-lg max-w-xs">
            <div class="flex items-center gap-2">
              <span class="text-xl">${building.icon}</span>
              <div class="font-bold text-lg">${building.name}</div>
            </div>
            <div class="text-sm text-gray-300 mt-1">${
              building.description
            }</div>
            <div class="text-xs text-gray-400 mt-2">
              📍 ${building.position.lat.toFixed(
                5
              )}, ${building.position.lng.toFixed(5)}
            </div>
          </div>
        `,
      });

      marker.addListener("mouseover", () => {
        infoWindow.open(mapInstance, marker);
      });

      marker.addListener("mouseout", () => {
        infoWindow.close();
      });

      marker.addListener("click", () => {
        mapInstance.setCenter(building.position);
        mapInstance.setZoom(19);
      });
    });
  };

  // Static map fallback
  const showStaticMapFallback = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${CIT_COORDINATES.lat},${CIT_COORDINATES.lng}&zoom=16&size=800x600&maptype=satellite&markers=color:red%7C${CIT_COORDINATES.lat},${CIT_COORDINATES.lng}&key=${apiKey}`;

    if (mapRef.current) {
      mapRef.current.innerHTML = `
        <div class="w-full h-full flex flex-col items-center justify-center bg-gray-900">
          <div class="text-center p-6">
            <div class="text-4xl mb-4">🗺️</div>
            <h3 class="text-xl font-bold text-white mb-2">CIT Campus Map</h3>
            <p class="text-gray-400 mb-4">Interactive map unavailable. Showing static view.</p>
            <img src="${staticMapUrl}" alt="CIT Campus Map" class="rounded-lg shadow-2xl border-2 border-cyan-500/30" />
            <div class="mt-4 text-sm text-gray-500">
              Coimbatore Institute of Technology • 11.0283° N, 77.0273° E
            </div>
          </div>
        </div>
      `;
    }
  };

  // Load campus statistics from Firestore
  const loadCampusStats = async () => {
    try {
      setLoadingStats(true);

      // Get all lost items
      const lostItemsQuery = query(
        collection(db, "lost_items"),
        where("status", "in", ["searching", "pending"])
      );

      const lostItemsSnapshot = await getDocs(lostItemsQuery);
      const allLostItems = lostItemsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Process heatmap data from actual Firestore data
      const processedHeatmapData = processHeatmapData(allLostItems);
      setHeatmapData(processedHeatmapData);

      // Calculate statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const todayLost = allLostItems.filter((item) => {
        const itemDate = item.dateLost?.toDate();
        return itemDate && itemDate >= today;
      }).length;

      const weekLost = allLostItems.filter((item) => {
        const itemDate = item.dateLost?.toDate();
        return itemDate && itemDate >= oneWeekAgo;
      }).length;

      // Calculate hotspots
      const hotspots = calculateHotspots(allLostItems);

      setCampusStats({
        totalLostItems: allLostItems.length,
        todayLostItems: todayLost,
        thisWeekLostItems: weekLost,
        hotspots: hotspots.slice(0, 5),
        recoveryRateByArea: calculateRecoveryRates(allLostItems),
      });

      // Update heatmap when data is loaded
      if (map && window.google) {
        updateHeatmapLayer(processedHeatmapData);
      }

      setLoadingStats(false);
    } catch (error) {
      console.error("Error loading campus stats:", error);
      setLoadingStats(false);
    }
  };

  // Process Firestore data into heatmap format
  const processHeatmapData = (lostItems) => {
    const locationCounts = {};

    // Mock data for demo - replace with actual coordinates from Firestore
    const mockLocations = [
      { lat: 11.0285, lng: 77.0271, count: 8 }, // Main Building
      { lat: 11.0288, lng: 77.0275, count: 12 }, // Library
      { lat: 11.0281, lng: 77.0278, count: 15 }, // Cafeteria
      { lat: 11.029, lng: 77.028, count: 6 }, // Hostel
      { lat: 11.0278, lng: 77.0268, count: 4 }, // Sports
      { lat: 11.0286, lng: 77.027, count: 9 }, // Computer Center
      { lat: 11.028, lng: 77.0273, count: 11 }, // Parking
      { lat: 11.0283, lng: 77.0276, count: 7 }, // Auditorium
    ];

    // In production, use actual coordinates from lostItems
    mockLocations.forEach((loc) => {
      const key = `${loc.lat},${loc.lng}`;
      locationCounts[key] = loc.count;
    });

    // Convert to Google Maps heatmap data format
    return Object.entries(locationCounts).map(([coord, weight]) => {
      const [lat, lng] = coord.split(",").map(Number);
      return {
        location: new window.google.maps.LatLng(lat, lng),
        weight: Math.min(weight, 10),
      };
    });
  };

  // Calculate hotspots
  const calculateHotspots = (lostItems) => {
    return campusBuildings
      .map((building) => ({
        name: building.name,
        count: Math.floor(Math.random() * 20) + 5, // Mock data
        coordinates: building.position,
      }))
      .sort((a, b) => b.count - a.count);
  };

  // Calculate recovery rates
  const calculateRecoveryRates = (lostItems) => {
    const rates = {};
    campusBuildings.forEach((building) => {
      rates[building.name] = `${Math.floor(Math.random() * 30) + 65}%`;
    });
    return rates;
  };

  // Update heatmap layer
  const updateHeatmapLayer = (data) => {
    if (!map || !window.google || data.length === 0) return;

    if (heatmap) {
      heatmap.setMap(null);
    }

    const newHeatmap = new window.google.maps.visualization.HeatmapLayer({
      data: data,
      map: map,
      radius: 40,
      opacity: 0.8,
      gradient: [
        "rgba(0, 255, 255, 0)",
        "rgba(0, 255, 255, 0.4)",
        "rgba(0, 191, 255, 0.6)",
        "rgba(0, 127, 255, 0.8)",
        "rgba(0, 63, 255, 0.9)",
        "rgba(0, 0, 255, 1)",
        "rgba(0, 0, 191, 1)",
        "rgba(0, 0, 127, 1)",
      ],
    });

    setHeatmap(newHeatmap);
  };

  // Refresh data
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      loadCampusStats();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  const features = [
    {
      icon: "🔍",
      title: "AI-Powered Search",
      description:
        "Our intelligent matching algorithm finds lost items with 95% accuracy.",
      gradient: "from-cyan-500 to-blue-500",
    },
    {
      icon: "🛡️",
      title: "Secure Verification",
      description:
        "Multi-step verification ensures items go to the right owner.",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: "⚡",
      title: "Instant Notifications",
      description: "Get real-time alerts when your item is found.",
      gradient: "from-orange-500 to-yellow-500",
    },
    {
      icon: "📱",
      title: "Mobile Friendly",
      description: "Access from any device, anywhere on campus.",
      gradient: "from-green-500 to-emerald-500",
    },
  ];

  const stats = [
    { value: "2,500+", label: "Items Found" },
    { value: "10K+", label: "Active Users" },
    { value: "98%", label: "Success Rate" },
    { value: "<2h", label: "Avg. Recovery" },
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

        {/* Mouse Following Light */}
        <div
          className="absolute w-[800px] h-[800px] bg-gradient-to-r from-cyan-500/5 to-purple-500/5 rounded-full blur-3xl transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${mousePosition.x - 400}px, ${
              mousePosition.y - 400
            }px)`,
          }}
        ></div>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 py-20 px-6 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div
            className={`text-center transition-all duration-1000 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            }`}
          >
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
              Official Lost & Found System for Coimbatore Institute of
              Technology
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
                    isVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Campus Heatmap Section */}
      <section className="relative z-10 py-20 px-6 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              CIT Campus{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Live Heatmap
              </span>
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
              Real-time visualization of lost items across Coimbatore Institute
              of Technology
            </p>

            {/* Heatmap Legend */}
            <div className="flex flex-wrap justify-center gap-6 mb-12">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span className="text-sm text-slate-300">Low Activity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-cyan-500"></div>
                <span className="text-sm text-slate-300">Medium Activity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-600"></div>
                <span className="text-sm text-slate-300">High Activity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm text-slate-300">
                  Very High Activity
                </span>
              </div>
            </div>
          </div>

          <div
            className={`relative transition-all duration-1000 ${
              isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          >
            {/* Google Maps Container */}
            <div className="relative h-[500px] lg:h-[600px] rounded-3xl border-2 border-cyan-500/30 overflow-hidden shadow-2xl">
              <div ref={mapRef} className="w-full h-full">
                {/* Google Maps will render here */}
              </div>

              {/* Loading Overlay */}
              {mapLoading && (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 to-slate-800/90 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-20 h-20 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-6"></div>
                    <p className="text-slate-300 text-xl font-semibold mb-2">
                      Loading Campus Map...
                    </p>
                    <p className="text-slate-400">
                      Coimbatore Institute of Technology
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                      11.0283° N, 77.0273° E
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {mapError && (
                <div className="absolute inset-0 bg-gradient-to-br from-red-900/90 to-purple-900/90 flex items-center justify-center p-6">
                  <div className="text-center max-w-md">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h3 className="text-xl font-bold text-white mb-3">
                      Map Loading Error
                    </h3>
                    <p className="text-gray-300 mb-4">{mapError}</p>
                    <div className="bg-black/50 p-4 rounded-lg text-sm text-left">
                      <p className="font-semibold mb-2">Fix this by:</p>
                      <ol className="list-decimal list-inside space-y-1 text-gray-400">
                        <li>
                          Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to .env file
                        </li>
                        <li>Enable Maps JavaScript API in Google Cloud</li>
                        <li>
                          Add <code>http://localhost:*</code> to API
                          restrictions
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {/* Map Controls Overlay */}
              <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm rounded-xl p-4 border border-white/10 max-w-xs">
                <div className="text-sm font-semibold text-cyan-300 mb-1">
                  🗺️ CIT Campus Map
                </div>
                <div className="text-xs text-slate-300">
                  Interactive heatmap of lost items
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  Click buildings for details
                </div>
              </div>

              {/* Live Stats Overlay */}
              <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm rounded-xl p-4 border border-cyan-500/30 max-w-xs">
                <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  📊 Live Campus Stats
                </div>
                {loadingStats ? (
                  <div className="text-xs text-slate-400">
                    Loading statistics...
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">Total Lost:</span>
                      <span className="font-bold text-cyan-300">
                        {campusStats.totalLostItems}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">Today:</span>
                      <span className="font-bold text-yellow-300">
                        {campusStats.todayLostItems}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">This Week:</span>
                      <span className="font-bold text-orange-300">
                        {campusStats.thisWeekLostItems}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-2 text-center">
                      Updates every 30s
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Campus Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-3xl font-bold text-cyan-300">
                    {campusStats.totalLostItems}
                  </div>
                  <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <span className="text-2xl">📦</span>
                  </div>
                </div>
                <div className="text-slate-300 font-medium">
                  Total Items Lost
                </div>
                <div className="text-sm text-slate-400 mt-1">
                  Across CIT Campus
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-3xl font-bold text-purple-300">
                    {campusStats.todayLostItems}
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <span className="text-2xl">📅</span>
                  </div>
                </div>
                <div className="text-slate-300 font-medium">Lost Today</div>
                <div className="text-sm text-slate-400 mt-1">
                  Items reported today
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-3xl font-bold text-orange-300">
                    {campusStats.hotspots[0]?.count || 0}
                  </div>
                  <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <span className="text-2xl">🔥</span>
                  </div>
                </div>
                <div className="text-slate-300 font-medium">#1 Hotspot</div>
                <div className="text-sm text-slate-400 mt-1 truncate">
                  {campusStats.hotspots[0]?.name || "Cafeteria"}
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/20 hover:border-green-500/40 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-3xl font-bold text-green-300">
                    {campusStats.recoveryRateByArea["Sports Complex"] || "90%"}
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-2xl">🏆</span>
                  </div>
                </div>
                <div className="text-slate-300 font-medium">Best Recovery</div>
                <div className="text-sm text-slate-400 mt-1">
                  Sports Complex
                </div>
              </div>
            </div>

            {/* Top Hotspots List */}
            {campusStats.hotspots.length > 0 && (
              <div className="mt-12 p-8 rounded-2xl bg-slate-900/40 backdrop-blur-sm border border-white/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                  <div>
                    <h3 className="text-2xl font-bold">
                      🏆 Top Loss Hotspots at CIT
                    </h3>
                    <p className="text-slate-400 mt-2">
                      Most frequent locations where items are lost
                    </p>
                  </div>
                  <button
                    onClick={loadCampusStats}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 hover:border-cyan-500/50 transition-all duration-300 flex items-center gap-2"
                  >
                    <span>🔄</span>
                    Refresh Data
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {campusStats.hotspots.map((hotspot, index) => {
                    const building = campusBuildings.find(
                      (b) => b.name === hotspot.name
                    );
                    return (
                      <div
                        key={index}
                        className="group p-5 rounded-xl bg-gradient-to-br from-white/5 to-white/10 hover:from-white/10 hover:to-white/15 border border-white/10 hover:border-cyan-500/30 transition-all duration-300 cursor-pointer"
                        onClick={() => {
                          if (map && building) {
                            map.setCenter(building.position);
                            map.setZoom(19);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                              index === 0
                                ? "bg-gradient-to-br from-red-500 to-pink-600"
                                : index === 1
                                ? "bg-gradient-to-br from-orange-500 to-red-500"
                                : index === 2
                                ? "bg-gradient-to-br from-yellow-500 to-orange-500"
                                : "bg-gradient-to-br from-cyan-500 to-blue-500"
                            }`}
                          >
                            #{index + 1}
                          </div>
                          <div className="text-2xl opacity-70 group-hover:opacity-100">
                            {building?.icon || "📍"}
                          </div>
                        </div>
                        <div className="font-bold text-lg truncate">
                          {hotspot.name}
                        </div>
                        <div className="text-sm text-slate-400 mt-2 flex items-center justify-between">
                          <span>{hotspot.count} items lost</span>
                          <span className="text-cyan-300">
                            {campusStats.recoveryRateByArea[hotspot.name] ||
                              "70%"}{" "}
                            recovered
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-3 group-hover:text-slate-400">
                          Click to view on map →
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-center mt-8 pt-6 border-t border-white/10">
                  <p className="text-sm text-slate-400">
                    Data is dynamically updated from campus lost item reports
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-6 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Why{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                VeriFind CIT
              </span>{" "}
              Works
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Official platform for Coimbatore Institute of Technology's lost &
              found system
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 hover:border-cyan-500/30 transition-all duration-500 ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-3xl`}
                ></div>

                <div className="relative z-10">
                  <div
                    className={`w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-3xl`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 py-20 px-6 lg:px-20">
        <div className="max-w-4xl mx-auto text-center">
          <div
            className={`relative p-12 rounded-3xl overflow-hidden transition-all duration-1000 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]"></div>

            <div className="relative z-10">
              <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                CIT's Official Lost & Found
              </h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                Join thousands of CIT students who trust our platform for item
                recovery
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link
                  to="/report-lost"
                  className="group relative px-10 py-5 rounded-2xl text-lg font-bold overflow-hidden transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 group-hover:scale-105 transition-transform duration-300"></div>
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    Report Lost Item
                    <span className="text-xl group-hover:translate-x-2 transition-transform duration-300">
                      🚀
                    </span>
                  </span>
                </Link>

                <Link
                  to="/browse"
                  className="px-10 py-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-lg font-semibold transition-all duration-300"
                >
                  Browse Found Items
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
                <span className="text-2xl">🏛️</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">VeriFind CIT</h3>
                <p className="text-sm text-slate-400">
                  Coimbatore Institute of Technology
                </p>
              </div>
            </div>

            <div className="text-center md:text-right">
              <p className="text-slate-400 mb-2">
                Official Campus Lost & Found System
              </p>
              <p className="text-sm text-slate-500">
                © 2024 VeriFind - CIT Coimbatore • 11.0283° N, 77.0273° E
              </p>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
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

export default Home;
