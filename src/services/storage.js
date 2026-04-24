/**
 * VeriFind - Image Storage Service (Base64 Version)
 *
 * Stores images as Base64 strings directly in Firestore
 * No Firebase Storage required - works 100% on free tier!
 *
 * How it works:
 * - Images are compressed and converted to Base64 strings
 * - These strings are stored in Firestore document fields
 * - <img src={base64String} /> works automatically in browsers
 */

import { auth } from "../firebase/config";

// Storage paths (kept for API compatibility)
export const STORAGE_PATHS = {
  FOUND_ITEMS: "found_items",
  LOST_ITEMS: "lost_items",
  PROFILES: "profiles",
};

// Allowed image types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Max file size before compression (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Validate image file
 */
function validateImage(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Allowed: JPEG, PNG, WebP, GIF");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File too large. Maximum size: 5MB");
  }

  return true;
}

/**
 * Generate unique ID for the image
 */
function generateImageId(prefix = "") {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}_${randomStr}`;
}

/**
 * Compress and convert image to Base64
 * @param {File} file - The image file to convert
 * @param {number} maxWidth - Maximum width (default 800px to keep size small)
 * @param {number} quality - JPEG quality 0-1 (default 0.7)
 * @returns {Promise<string>} Base64 data URL string
 */
async function convertToBase64(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        // Create canvas for compression
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to Base64 (JPEG for smaller size)
        const base64String = canvas.toDataURL("image/jpeg", quality);
        console.log(
          `✅ Image compressed: ${(base64String.length / 1024).toFixed(1)}KB`
        );
        resolve(base64String);
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = event.target.result;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a single image (converts to Base64)
 * @param {File} file - The file to upload
 * @param {string} path - Storage path (for compatibility, not used)
 * @param {string} itemId - The item ID (for path generation)
 * @param {function} onProgress - Optional progress callback
 * @returns {Promise<{url: string, path: string}>}
 */
export async function uploadImage(file, path, itemId, onProgress = null) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  // Validate
  validateImage(file);

  // Simulate progress
  if (onProgress) {
    onProgress(10);
  }

  console.log("🔄 Compressing image for Firestore...");

  // Convert to Base64
  const base64String = await convertToBase64(file);

  if (onProgress) {
    onProgress(90);
  }

  // Generate a virtual path for compatibility
  const imageId = generateImageId();
  const virtualPath = `${path}/${currentUser.uid}/${itemId}/${imageId}`;

  if (onProgress) {
    onProgress(100);
  }

  console.log("✅ Image ready for Firestore storage!");

  // Return Base64 string as the URL (browsers handle this natively)
  return {
    url: base64String,
    path: virtualPath,
  };
}

/**
 * Upload multiple images
 * @param {File[]} files - Array of files to upload
 * @param {string} path - Storage path
 * @param {string} itemId - The item ID
 * @param {function} onProgress - Optional progress callback
 * @returns {Promise<Array<{url: string, path: string}>>}
 */
export async function uploadMultipleImages(
  files,
  path,
  itemId,
  onProgress = null
) {
  const totalFiles = files.length;
  let completedFiles = 0;

  const results = [];

  for (const file of files) {
    const result = await uploadImage(file, path, itemId, (fileProgress) => {
      if (onProgress) {
        const overallProgress =
          ((completedFiles + fileProgress / 100) / totalFiles) * 100;
        onProgress(overallProgress);
      }
    });
    completedFiles++;
    results.push(result);
  }

  return results;
}

/**
 * Delete an image (no-op for Base64 - just remove from Firestore doc)
 * @param {string} imagePath - The virtual path (not used)
 */
export async function deleteImage(imagePath) {
  // For Base64 storage, deletion is handled when updating the Firestore document
  // This function exists for API compatibility
  console.log("📝 Note: Base64 images are deleted with document updates");
  return true;
}

/**
 * Delete multiple images
 * @param {string[]} imagePaths - Array of virtual paths
 */
export async function deleteMultipleImages(imagePaths) {
  // No-op for Base64 storage
  console.log("📝 Note: Base64 images are deleted with document updates");
  return true;
}

/**
 * Compress image (returns Base64 for consistency)
 * @param {File} file - Original file
 * @param {number} maxWidth - Maximum width
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<File>}
 */
export async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload image with automatic compression (main function used by pages)
 * @param {File} file - The file to upload
 * @param {string} path - Storage path
 * @param {string} itemId - The item ID
 * @param {function} onProgress - Optional progress callback
 * @returns {Promise<{url: string, path: string}>}
 */
export async function uploadCompressedImage(
  file,
  path,
  itemId,
  onProgress = null
) {
  // For Base64, compression is built into the conversion
  // We use smaller dimensions for Firestore storage efficiency
  return uploadImage(file, path, itemId, onProgress);
}

/**
 * Check if a URL is a Base64 data URL
 * @param {string} url - The URL to check
 * @returns {boolean}
 */
export function isBase64Image(url) {
  return url && url.startsWith("data:image/");
}

/**
 * Get approximate size of Base64 string in KB
 * @param {string} base64String - The Base64 data URL
 * @returns {number} Size in KB
 */
export function getBase64Size(base64String) {
  if (!base64String) return 0;
  // Base64 is ~33% larger than binary
  const base64Data = base64String.split(",")[1] || base64String;
  return Math.round((base64Data.length * 0.75) / 1024);
}

export default {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  compressImage,
  uploadCompressedImage,
  isBase64Image,
  getBase64Size,
  STORAGE_PATHS,
};
