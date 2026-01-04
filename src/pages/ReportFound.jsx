import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiUpload, FiMapPin, FiTag } from "react-icons/fi";
import { useAuth } from "../contexts/AuthContext";
import { createFoundItem } from "../services/firestore";
import { uploadCompressedImage, STORAGE_PATHS } from "../services/storage";
import toast from "react-hot-toast";
import { itemCategories, locations } from "../utils/constants";

const ReportFound = () => {
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
    dateFound: new Date().toISOString().split("T")[0],
    storageLocation: "",
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
      toast.error("Please login to report a found item");
      navigate("/login");
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
          STORAGE_PATHS.FOUND_ITEMS,
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
        dateFound: formData.dateFound,
        storageLocation: formData.storageLocation,
        images,
      };

      const result = await createFoundItem(itemData);

      toast.success(
        "Found item reported successfully! Thank you for your honesty."
      );
      navigate(`/item/${result.id}`);
    } catch (error) {
      console.error("Error reporting found item:", error);
      toast.error("Failed to report item. Please try again.");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Report Found Item</h1>
        <p className="text-gray-600">Help return lost items to their owners</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Item Details */}
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
                placeholder="e.g., Blue Backpack, Silver Watch"
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
                placeholder="Describe the item in detail (color, brand, condition, contents if applicable)..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiMapPin className="inline w-4 h-4 mr-1" />
                Found Location *
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
                <FiTag className="inline w-4 h-4 mr-1" />
                Found Date *
              </label>
              <input
                type="date"
                name="dateFound"
                value={formData.dateFound}
                onChange={handleChange}
                className="input-field"
                required
                max={new Date().toISOString().split("T")[0]}
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
              A clear photo helps the owner identify their item quickly.
            </p>
          </div>
        </div>

        {/* Return Information */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-6">
            Current Storage Location
          </h2>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Where is the item currently stored? *
              </label>
              <input
                type="text"
                name="storageLocation"
                value={formData.storageLocation}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Library Front Desk, Dormitory Office, With me"
                required
              />
              <p className="text-sm text-gray-600 mt-1">
                Where can the verified owner collect the item?
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">
            🔒 Privacy Notice
          </h3>
          <p className="text-sm text-blue-700">
            Your found item report is <strong>private</strong>. It will only be
            shown to potential owners after our AI verifies a match, and they
            correctly answer a verification question. Your personal contact info
            is never shared directly.
          </p>
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
              "Report Found Item"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportFound;
