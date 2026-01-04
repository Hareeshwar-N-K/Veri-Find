import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiUpload, FiMapPin, FiTag, FiCalendar, FiLock } from "react-icons/fi";
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

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
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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

    setLoading(true);

    try {
      // Generate temporary ID for image upload path
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
        verificationQuestion: formData.verificationQuestion,
        verificationAnswer: formData.verificationAnswer,
        images,
      };

      const result = await createLostItem(itemData);

      toast.success(
        "Lost item reported successfully! We'll notify you of any matches."
      );
      navigate(`/item/${result.id}`);
    } catch (error) {
      console.error("Error reporting item:", error);
      toast.error("Failed to report item. Please try again.");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Report Lost Item</h1>
        <p className="text-gray-600">
          Fill in details about your lost item to help us find it
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-6">Item Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Black iPhone 13, Calculus Textbook"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="">Select Category</option>
                {itemCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="input-field min-h-[100px]"
                placeholder="Describe your item in detail (color, brand, model, unique features, contents if applicable)..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiMapPin className="inline w-4 h-4 mr-1" />
                Last Seen Location *
              </label>
              <select
                name="locationName"
                value={formData.locationName}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="">Select Location</option>
                {locations.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiCalendar className="inline w-4 h-4 mr-1" />
                Date Lost *
              </label>
              <input
                type="date"
                name="dateLost"
                value={formData.dateLost}
                onChange={handleChange}
                className="input-field"
                required
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Value ($)
              </label>
              <input
                type="number"
                name="estimatedValue"
                value={formData.estimatedValue}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., 500"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reward Offered ($)
              </label>
              <input
                type="number"
                name="reward"
                value={formData.reward}
                onChange={handleChange}
                className="input-field"
                placeholder="Optional reward for finder"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Image Upload */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-6">Item Image</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FiUpload className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
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

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-primary-600 h-2.5 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}

            <p className="text-sm text-gray-600">
              Upload a clear photo of the item. This helps in identification and
              AI matching.
            </p>
          </div>
        </div>

        {/* Ownership Verification */}
        <div className="card border-2 border-primary-200">
          <div className="flex items-center mb-4">
            <FiLock className="w-5 h-5 text-primary-600 mr-2" />
            <h2 className="text-xl font-semibold">Ownership Verification</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Create a secret question only the true owner would know. This
            protects against false claims.
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Question *
              </label>
              <select
                name="verificationQuestion"
                value={formData.verificationQuestion}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="">Select a question type...</option>
                <option value="What is a unique mark, scratch, or feature on this item?">
                  What is a unique mark, scratch, or feature on this item?
                </option>
                <option value="What was the last thing stored inside/on this item?">
                  What was the last thing stored inside/on this item?
                </option>
                <option value="What sticker, keychain, or accessory is attached?">
                  What sticker, keychain, or accessory is attached?
                </option>
                <option value="What is the lock code, password hint, or security feature?">
                  What is the lock code, password hint, or security feature?
                </option>
                <option value="custom">Custom question...</option>
              </select>
            </div>

            {formData.verificationQuestion === "custom" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Custom Question *
                </label>
                <input
                  type="text"
                  name="verificationQuestion"
                  value={
                    formData.verificationQuestion === "custom"
                      ? ""
                      : formData.verificationQuestion
                  }
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Ask something only the owner would know..."
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Answer (kept private) *
              </label>
              <input
                type="text"
                name="verificationAnswer"
                value={formData.verificationAnswer}
                onChange={handleChange}
                className="input-field"
                placeholder="The answer only you know..."
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                This answer will be used to verify ownership when a match is
                found.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary px-8 py-3 text-lg disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Reporting...
              </span>
            ) : (
              "Report Lost Item"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportLost;
