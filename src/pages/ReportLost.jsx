import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FiUpload,
  FiMapPin,
  FiTag,
  FiCalendar,
  FiLock,
  FiDollarSign,
} from "react-icons/fi";
import { MdDescription, MdSecurity } from "react-icons/md";
import { useAuth } from "../contexts/AuthContext";
import { createLostItem } from "../services/firestore";
import { uploadCompressedImage, STORAGE_PATHS } from "../services/storage";
import toast from "react-hot-toast";
import {
  itemCategories,
  locations,
  verificationQuestions,
} from "../utils/constants";

const ReportLost = () => {
  const { user, currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [step, setStep] = useState(1);
  const [isImageHovered, setIsImageHovered] = useState(false);

  // Home page animations state
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    locationName: "",
    dateLost: "",
    estimatedValue: "",
    reward: "",
    verificationQuestion: "",
    verificationAnswer: "",
    customQuestion: "", // Add separate field for custom question
  });

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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to report a lost item");
      navigate("/login");
      return;
    }

    if (!formData.verificationQuestion || !formData.verificationAnswer) {
      toast.error("Please add a verification question and answer");
      return;
    }

    // Validate custom question
    if (
      formData.verificationQuestion === "custom" &&
      !formData.customQuestion.trim()
    ) {
      toast.error("Please enter your custom question");
      return;
    }

    setLoading(true);

    try {
      const tempId = Date.now().toString();
      let images = [];

      if (imageFile) {
        const result = await uploadCompressedImage(
          imageFile,
          STORAGE_PATHS.LOST_ITEMS,
          tempId,
          (progress) => setUploadProgress(progress)
        );
        images = [{ url: result.url, path: result.path }];
      }

      const itemData = {
        title: formData.title,
        category: formData.category,
        description: formData.description,
        locationName: formData.locationName,
        dateLost: formData.dateLost,
        estimatedValue: formData.estimatedValue
          ? parseFloat(formData.estimatedValue)
          : null,
        reward: formData.reward ? parseFloat(formData.reward) : null,
        verificationQuestion:
          formData.verificationQuestion === "custom"
            ? formData.customQuestion
            : formData.verificationQuestion,
        verificationAnswer: formData.verificationAnswer,
        images,
        reportedBy: user.uid,
        reportedAt: new Date().toISOString(),
        status: "lost",
      };

      const result = await createLostItem(itemData);

      toast.success(
        <div className="flex flex-col">
          <span className="font-semibold">
            🎉 Lost Item Reported Successfully!
          </span>
          <span className="text-sm">
            We'll notify you as soon as we find a match.
          </span>
        </div>,
        { duration: 5000 }
      );
      navigate(`/item/${result.id}`);
    } catch (error) {
      console.error("Error reporting item:", error);
      toast.error(
        <div className="flex flex-col">
          <span className="font-semibold">⚠️ Failed to Report Item</span>
          <span className="text-sm">
            {error.message || "Please try again."}
          </span>
        </div>
      );
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#0A0F29] via-[#111827] to-[#1E1B4B] text-white min-h-screen">
      {/* Animated Background Elements - Same as Home */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-float"
          style={{
            transform: `translateY(${
              Math.sin(scrollY * 0.003) * 20
            }px) rotate(${scrollY * 0.005}deg)`,
          }}
        ></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl animate-float-reverse"
          style={{
            animationDelay: "1s",
            transform: `translateY(${
              Math.cos(scrollY * 0.002) * 20
            }px) rotate(${-scrollY * 0.005}deg)`,
          }}
        ></div>

        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
            transform: `translate(${scrollY * 0.02}px, ${scrollY * 0.01}px)`,
          }}
        ></div>

        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full animate-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}

        <div
          className="absolute w-[800px] h-[800px] bg-gradient-to-r from-cyan-500/5 to-purple-500/5 rounded-full blur-3xl transition-all duration-300 ease-out"
          style={{
            transform: `translate(${mousePosition.x - 400}px, ${
              mousePosition.y - 400
            }px)`,
          }}
        ></div>

        <svg
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.1 }}
        >
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                style={{ stopColor: "#22d3ee", stopOpacity: 1 }}
              />
              <stop
                offset="100%"
                style={{ stopColor: "#a855f7", stopOpacity: 1 }}
              />
            </linearGradient>
          </defs>
          {[...Array(5)].map((_, i) => {
            const startX = Math.random() * 100;
            const startY = Math.random() * 100;
            const cp1X = Math.random() * 100;
            const cp1Y = Math.random() * 100;
            const cp2X = Math.random() * 100;
            const cp2Y = Math.random() * 100;
            const endX = Math.random() * 100;
            const endY = Math.random() * 100;
            return (
              <path
                key={i}
                d={`M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`}
                stroke="url(#gradient)"
                strokeWidth="1"
                fill="none"
                className="animate-draw"
                style={{
                  strokeDasharray: 1000,
                  strokeDashoffset: 1000,
                  animationDelay: `${i * 0.5}s`,
                }}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>

      {/* Main Content */}
      <div className="relative z-10 pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div
            className={`text-center mb-10 transition-all duration-1000 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            }`}
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 mb-6 shadow-lg animate-float">
              <FiLock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
                Report Lost Item
              </span>
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Fill in details about your lost item to help us find it
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-4 relative">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex flex-col items-center z-10">
                  <div
                    className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold
                    transition-all duration-300 transform hover:scale-110
                    ${
                      s <= step
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg"
                        : "bg-white/10 backdrop-blur-sm border border-white/20 text-slate-300"
                    }
                    ${
                      s === step
                        ? "ring-4 ring-cyan-500/30 ring-opacity-50"
                        : ""
                    }
                  `}
                  >
                    {s}
                  </div>
                  <span className="mt-2 text-sm font-medium text-slate-300">
                    {s === 1
                      ? "Item Details"
                      : s === 2
                      ? "Upload Photo"
                      : "Verification"}
                  </span>
                </div>
              ))}
              <div className="absolute left-1/4 right-1/4 h-1 bg-white/10 backdrop-blur-sm -translate-y-6 z-0">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500 rounded-full"
                  style={{ width: `${((step - 1) / 2) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Item Details */}
            {step === 1 && (
              <div className="animate-slide-right">
                <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/10">
                  <div className="bg-gradient-to-r from-cyan-500/20 to-blue-600/20 p-6 border-b border-white/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <MdDescription className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          Item Details
                        </h2>
                        <p className="text-cyan-200/80">
                          Tell us about what you lost
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Item Title */}
                      <div className="group">
                        <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center">
                          <span className="bg-gradient-to-r from-cyan-500 to-blue-500 w-2 h-6 rounded mr-2"></span>
                          Item Title *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="w-full px-4 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white transition-all duration-300 group-hover:shadow-lg placeholder-slate-400"
                            placeholder="e.g., Black iPhone 13, Calculus Textbook"
                            required
                          />
                          <div className="absolute inset-0 border-2 border-transparent group-hover:border-cyan-500/50 rounded-xl pointer-events-none transition-all duration-300"></div>
                        </div>
                      </div>

                      {/* Category */}
                      <div className="group">
                        <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center">
                          <span className="bg-gradient-to-r from-purple-500 to-pink-500 w-2 h-6 rounded mr-2"></span>
                          Category *
                        </label>
                        <div className="relative">
                          <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="w-full px-4 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white appearance-none transition-all duration-300 group-hover:shadow-lg"
                            required
                          >
                            <option value="" className="bg-[#0A0F29]">
                              Select Category
                            </option>
                            {itemCategories.map((cat) => (
                              <option
                                key={cat.value}
                                value={cat.value}
                                className="bg-[#0A0F29]"
                              >
                                {cat.icon} {cat.label}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <div className="w-2 h-2 border-2 border-slate-400 border-t-0 border-r-0 rotate-45"></div>
                          </div>
                          <div className="absolute inset-0 border-2 border-transparent group-hover:border-purple-500/50 rounded-xl pointer-events-none transition-all duration-300"></div>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="lg:col-span-2 group">
                        <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center">
                          <span className="bg-gradient-to-r from-green-500 to-emerald-500 w-2 h-6 rounded mr-2"></span>
                          Description *
                        </label>
                        <div className="relative">
                          <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full px-4 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white min-h-[120px] transition-all duration-300 group-hover:shadow-lg placeholder-slate-400"
                            placeholder="Describe your item in detail (color, brand, model, unique features, contents if applicable)..."
                            required
                          />
                          <div className="absolute inset-0 border-2 border-transparent group-hover:border-green-500/50 rounded-xl pointer-events-none transition-all duration-300"></div>
                        </div>
                        <div className="mt-3 flex items-center text-slate-400 text-sm">
                          <MdDescription className="w-4 h-4 mr-2" />
                          Be as detailed as possible to help with identification
                        </div>
                      </div>

                      {/* Last Seen Location */}
                      <div className="group">
                        <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center">
                          <FiMapPin className="w-4 h-4 mr-2 text-cyan-400" />
                          Last Seen Location *
                        </label>
                        <div className="relative">
                          <select
                            name="locationName"
                            value={formData.locationName}
                            onChange={handleChange}
                            className="w-full px-4 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white appearance-none transition-all duration-300 group-hover:shadow-lg"
                            required
                          >
                            <option value="" className="bg-[#0A0F29]">
                              Select Location
                            </option>
                            {locations.map((loc) => (
                              <option
                                key={loc.value}
                                value={loc.value}
                                className="bg-[#0A0F29]"
                              >
                                {loc.icon} {loc.label}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-0 border-2 border-transparent group-hover:border-cyan-500/50 rounded-xl pointer-events-none transition-all duration-300"></div>
                        </div>
                      </div>

                      {/* Date Lost */}
                      <div className="group">
                        <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center">
                          <FiCalendar className="w-4 h-4 mr-2 text-purple-400" />
                          Date Lost *
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            name="dateLost"
                            value={formData.dateLost}
                            onChange={handleChange}
                            className="w-full px-4 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white transition-all duration-300 group-hover:shadow-lg"
                            required
                            max={new Date().toISOString().split("T")[0]}
                          />
                          <div className="absolute inset-0 border-2 border-transparent group-hover:border-purple-500/50 rounded-xl pointer-events-none transition-all duration-300"></div>
                        </div>
                      </div>

                      {/* Estimated Value */}
                      <div className="group">
                        <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center">
                          <FiDollarSign className="w-4 h-4 mr-2 text-emerald-400" />
                          Estimated Value (₹)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            name="estimatedValue"
                            value={formData.estimatedValue}
                            onChange={handleChange}
                            className="w-full px-4 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white transition-all duration-300 group-hover:shadow-lg placeholder-slate-400"
                            placeholder="e.g., 500"
                            min="0"
                          />
                          <div className="absolute inset-0 border-2 border-transparent group-hover:border-emerald-500/50 rounded-xl pointer-events-none transition-all duration-300"></div>
                        </div>
                      </div>

                      {/* Reward */}
                      <div className="group">
                        <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center">
                          <FiTag className="w-4 h-4 mr-2 text-amber-400" />
                          Reward Offered (₹)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            name="reward"
                            value={formData.reward}
                            onChange={handleChange}
                            className="w-full px-4 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white transition-all duration-300 group-hover:shadow-lg placeholder-slate-400"
                            placeholder="Optional reward for finder"
                            min="0"
                          />
                          <div className="absolute inset-0 border-2 border-transparent group-hover:border-amber-500/50 rounded-xl pointer-events-none transition-all duration-300"></div>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">
                          Optional - encourages finders to report your item
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Next Button */}
                <div className="flex justify-end mt-8">
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={
                      !formData.title ||
                      !formData.category ||
                      !formData.description ||
                      !formData.locationName ||
                      !formData.dateLost
                    }
                    className="relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-3 shadow-lg group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative z-10">
                      Continue to Photo Upload
                    </span>
                    <svg
                      className="w-5 h-5 relative z-10"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Photo Upload */}
            {step === 2 && (
              <div className="animate-slide-right">
                <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/10">
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-600/20 p-6 border-b border-white/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <FiUpload className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          Upload Photo
                        </h2>
                        <p className="text-purple-200/80">
                          Help us identify your lost item
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8">
                    <div className="space-y-8">
                      {/* Image Upload Area */}
                      <div
                        className="group relative"
                        onMouseEnter={() => setIsImageHovered(true)}
                        onMouseLeave={() => setIsImageHovered(false)}
                      >
                        <label className="flex flex-col items-center justify-center w-full h-96 border-2 border-dashed border-white/20 rounded-2xl cursor-pointer bg-gradient-to-br from-white/5 to-cyan-500/5 hover:from-cyan-500/10 hover:to-blue-500/10 transition-all duration-500">
                          {imagePreview ? (
                            <div className="relative w-full h-full">
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-full h-full object-contain rounded-xl p-4"
                              />
                              <div
                                className={`absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-xl transition-opacity duration-300 ${
                                  isImageHovered ? "opacity-100" : "opacity-0"
                                }`}
                              ></div>
                              <div
                                className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full text-white font-medium transition-all duration-300 ${
                                  isImageHovered
                                    ? "opacity-100 translate-y-0"
                                    : "opacity-0 translate-y-4"
                                }`}
                              >
                                Click to change photo
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4">
                              <div className="relative mb-6">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center animate-pulse">
                                  <FiUpload className="w-12 h-12 text-white" />
                                </div>
                                <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full blur-xl opacity-30 animate-ping"></div>
                              </div>
                              <p className="mb-2 text-xl font-semibold text-white">
                                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                                  Click to upload
                                </span>
                              </p>
                              <p className="text-slate-300 mb-4">
                                or drag and drop
                              </p>
                              <p className="text-sm text-slate-400 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                                PNG, JPG, JPEG (MAX. 5MB)
                              </p>
                            </div>
                          )}
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageChange}
                          />
                        </label>
                      </div>

                      {/* Upload Progress */}
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="space-y-4 animate-slide-up">
                          <div className="flex justify-between text-sm font-medium text-slate-300">
                            <span>Uploading...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-white/10 backdrop-blur-sm rounded-full h-3 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            >
                              <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 animate-shimmer"></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tips */}
                      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/20">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold">💡</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-white mb-2">
                              Photo Tips
                            </h4>
                            <ul className="space-y-2 text-slate-300">
                              <li className="flex items-center">
                                <div className="w-2 h-2 bg-cyan-500 rounded-full mr-3"></div>
                                Upload the clearest photo you have of the item
                              </li>
                              <li className="flex items-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                Include photos showing any unique marks or
                                damage
                              </li>
                              <li className="flex items-center">
                                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                                Multiple angles help our AI match better
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="relative px-8 py-4 bg-white/10 backdrop-blur-sm text-slate-300 font-semibold rounded-xl border border-white/20 hover:border-white/30 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 flex items-center space-x-3 shadow group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                    <svg
                      className="w-5 h-5 relative z-10"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                      />
                    </svg>
                    <span className="relative z-10">Back to Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={nextStep}
                    className="relative px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 flex items-center space-x-3 shadow-lg group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative z-10">
                      Continue to Verification
                    </span>
                    <svg
                      className="w-5 h-5 relative z-10"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Verification */}
            {step === 3 && (
              <div className="animate-slide-right">
                <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/10">
                  <div className="bg-gradient-to-r from-emerald-500/20 to-green-600/20 p-6 border-b border-white/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <FiLock className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          Ownership Verification
                        </h2>
                        <p className="text-emerald-200/80">
                          Protect your item with a secret question
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8">
                    <div className="space-y-8">
                      {/* Verification Info */}
                      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 backdrop-blur-sm rounded-2xl p-8 border border-cyan-500/20">
                        <div className="flex items-start space-x-5">
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                              <MdSecurity className="w-8 h-8 text-white" />
                            </div>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-cyan-300 mb-3">
                              🔐 Secure Verification System
                            </h3>
                            <p className="text-slate-300 mb-4">
                              Create a secret question that only you, the true
                              owner, can answer. This prevents false claims and
                              ensures your item is returned to you.
                            </p>
                            <div className="space-y-3">
                              <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                                  <span className="text-cyan-400 font-bold text-sm">
                                    ✓
                                  </span>
                                </div>
                                <p className="text-cyan-200">
                                  <strong>Your answer is encrypted</strong> and
                                  never shown to anyone
                                </p>
                              </div>
                              <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                                  <span className="text-cyan-400 font-bold text-sm">
                                    ✓
                                  </span>
                                </div>
                                <p className="text-cyan-200">
                                  <strong>
                                    Only matches with correct answers
                                  </strong>{" "}
                                  can contact you
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Verification Question */}
                      <div className="group">
                        <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center">
                          <span className="bg-gradient-to-r from-emerald-500 to-green-500 w-2 h-6 rounded mr-2"></span>
                          Verification Question *
                        </label>
                        <div className="relative">
                          <select
                            name="verificationQuestion"
                            value={formData.verificationQuestion}
                            onChange={handleChange}
                            className="w-full px-4 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white appearance-none transition-all duration-300 group-hover:shadow-lg"
                            required
                          >
                            <option value="" className="bg-[#0A0F29]">
                              Select a question type...
                            </option>
                            <option
                              value="What is a unique mark, scratch, or feature on this item?"
                              className="bg-[#0A0F29]"
                            >
                              What is a unique mark, scratch, or feature on this
                              item?
                            </option>
                            <option
                              value="What was the last thing stored inside/on this item?"
                              className="bg-[#0A0F29]"
                            >
                              What was the last thing stored inside/on this
                              item?
                            </option>
                            <option
                              value="What sticker, keychain, or accessory is attached?"
                              className="bg-[#0A0F29]"
                            >
                              What sticker, keychain, or accessory is attached?
                            </option>
                            <option
                              value="What is the lock code, password hint, or security feature?"
                              className="bg-[#0A0F29]"
                            >
                              What is the lock code, password hint, or security
                              feature?
                            </option>
                            <option value="custom" className="bg-[#0A0F29]">
                              Custom question...
                            </option>
                          </select>
                          <div className="absolute inset-0 border-2 border-transparent group-hover:border-emerald-500/50 rounded-xl pointer-events-none transition-all duration-300"></div>
                        </div>
                      </div>

                      {formData.verificationQuestion === "custom" && (
                        <div className="group">
                          <label className="block text-sm font-semibold text-slate-300 mb-3">
                            Your Custom Question *
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              name="customQuestion"
                              value={formData.customQuestion}
                              onChange={handleChange}
                              className="w-full px-4 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white transition-all duration-300 group-hover:shadow-lg placeholder-slate-400"
                              placeholder="Ask something only the owner would know..."
                            />
                            <div className="absolute inset-0 border-2 border-transparent group-hover:border-emerald-500/50 rounded-xl pointer-events-none transition-all duration-300"></div>
                          </div>
                        </div>
                      )}

                      {/* Verification Answer */}
                      <div className="group">
                        <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center">
                          <span className="bg-gradient-to-r from-amber-500 to-yellow-500 w-2 h-6 rounded mr-2"></span>
                          Your Secret Answer *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            name="verificationAnswer"
                            value={formData.verificationAnswer}
                            onChange={handleChange}
                            className="w-full px-4 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white transition-all duration-300 group-hover:shadow-lg placeholder-slate-400"
                            placeholder="The answer only you know..."
                            required
                          />
                          <div className="absolute inset-0 border-2 border-transparent group-hover:border-amber-500/50 rounded-xl pointer-events-none transition-all duration-300"></div>
                        </div>
                        <p className="mt-3 text-sm text-slate-400 flex items-center">
                          <FiLock className="w-4 h-4 mr-2 text-amber-400" />
                          This answer will be used to verify ownership when a
                          match is found.
                        </p>
                      </div>

                      {/* Review Summary */}
                      <div className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                        <h4 className="font-bold text-white mb-4 text-lg">
                          📋 Review Summary
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Item:</span>
                              <span className="font-semibold text-white">
                                {formData.title || "Not specified"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Category:</span>
                              <span className="font-semibold text-white">
                                {itemCategories.find(
                                  (c) => c.value === formData.category
                                )?.label || "Not specified"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Last seen:</span>
                              <span className="font-semibold text-white">
                                {formData.locationName || "Not specified"}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Date lost:</span>
                              <span className="font-semibold text-white">
                                {formData.dateLost || "Not specified"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Photo:</span>
                              <span className="font-semibold text-white">
                                {imagePreview ? "Uploaded ✅" : "Not uploaded"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">
                                Verification:
                              </span>
                              <span className="font-semibold text-white">
                                {formData.verificationQuestion
                                  ? "Set ✅"
                                  : "Not set"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="relative px-8 py-4 bg-white/10 backdrop-blur-sm text-slate-300 font-semibold rounded-xl border border-white/20 hover:border-white/30 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 flex items-center space-x-3 shadow group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                    <svg
                      className="w-5 h-5 relative z-10"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                      />
                    </svg>
                    <span className="relative z-10">Back to Photo</span>
                  </button>

                  <div className="space-x-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-6 py-4 bg-white/10 backdrop-blur-sm text-slate-300 font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300"
                    >
                      Start Over
                    </button>

                    <button
                      type="submit"
                      disabled={
                        loading ||
                        !formData.verificationQuestion ||
                        (formData.verificationQuestion === "custom" &&
                          !formData.customQuestion.trim()) ||
                        !formData.verificationAnswer
                      }
                      className="relative px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-3 shadow-lg group overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      {loading ? (
                        <span className="flex items-center space-x-3 relative z-10">
                          <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                          <span>Reporting...</span>
                        </span>
                      ) : (
                        <>
                          <span className="relative z-10">
                            Report Lost Item
                          </span>
                          <svg
                            className="w-5 h-5 relative z-10"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Success Animation Placeholder */}
          {loading && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-8 max-w-md text-center animate-pop border border-white/20">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-6 animate-bounce">
                  <FiLock className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  Submitting Report
                </h3>
                <p className="text-slate-300 mb-6">
                  Your lost item report is being processed...
                </p>
                <div className="w-full bg-white/10 backdrop-blur-sm rounded-full h-2">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full animate-pulse"></div>
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
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        @keyframes float-reverse {
          0%,
          100% {
            transform: translateY(-20px);
          }
          50% {
            transform: translateY(0px);
          }
        }
        @keyframes slide-right {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes particle {
          0% {
            transform: translateY(0px) translateX(0px);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) translateX(20px);
            opacity: 0;
          }
        }
        @keyframes draw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes ping-slow {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-reverse {
          animation: float-reverse 8s ease-in-out infinite;
        }
        .animate-slide-right {
          animation: slide-right 0.5s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.5s ease-out;
        }
        .animate-pop {
          animation: pop 0.4s ease-out;
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
        .animate-particle {
          animation: particle linear infinite;
        }
        .animate-draw {
          animation: draw 3s linear forwards;
        }
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};

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

export default ReportLost;
