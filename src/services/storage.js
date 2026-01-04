/**
 * VeriFind - Image Upload Service
 *
 * Handles image uploads to Firebase Storage
 * with automatic compression and thumbnail generation
 */

import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage, auth } from "../firebase/config";

// Storage paths
export const STORAGE_PATHS = {
  FOUND_ITEMS: "found_items",
  LOST_ITEMS: "lost_items",
  PROFILES: "profiles",
};

// Allowed image types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Max file size (5MB)
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
 * Generate unique filename
 */
function generateFileName(file, prefix = "") {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = file.name.split(".").pop();
  return `${prefix}${timestamp}_${randomStr}.${extension}`;
}

/**
 * Upload a single image
 * @param {File} file - The file to upload
 * @param {string} path - Storage path (e.g., 'found_items')
 * @param {string} itemId - The item ID to organize files
 * @param {function} onProgress - Optional progress callback
 * @returns {Promise<{url: string, path: string}>}
 */
export async function uploadImage(file, path, itemId, onProgress = null) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  // Validate
  validateImage(file);

  // Generate path: found_items/{userId}/{itemId}/{filename}
  const fileName = generateFileName(file);
  const storagePath = `${path}/${currentUser.uid}/${itemId}/${fileName}`;
  const storageRef = ref(storage, storagePath);

  if (onProgress) {
    // Upload with progress tracking
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(progress);
        },
        (error) => {
          reject(error);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url, path: storagePath });
        }
      );
    });
  } else {
    // Simple upload
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return { url, path: storagePath };
  }
}

/**
 * Upload multiple images
 * @param {File[]} files - Array of files to upload
 * @param {string} path - Storage path
 * @param {string} itemId - The item ID
 * @param {function} onProgress - Optional progress callback (receives overall progress)
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

  const uploadPromises = files.map(async (file, index) => {
    const result = await uploadImage(file, path, itemId, (fileProgress) => {
      if (onProgress) {
        // Calculate overall progress
        const overallProgress =
          ((completedFiles + fileProgress / 100) / totalFiles) * 100;
        onProgress(overallProgress);
      }
    });
    completedFiles++;
    return result;
  });

  return Promise.all(uploadPromises);
}

/**
 * Delete an image from storage
 * @param {string} imagePath - The storage path of the image
 */
export async function deleteImage(imagePath) {
  const storageRef = ref(storage, imagePath);
  await deleteObject(storageRef);
}

/**
 * Delete multiple images
 * @param {string[]} imagePaths - Array of storage paths
 */
export async function deleteMultipleImages(imagePaths) {
  const deletePromises = imagePaths.map((path) => deleteImage(path));
  await Promise.all(deletePromises);
}

/**
 * Compress image before upload (client-side)
 * @param {File} file - Original file
 * @param {number} maxWidth - Maximum width
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<File>}
 */
export async function compressImage(file, maxWidth = 1200, quality = 0.8) {
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
 * Upload image with automatic compression
 */
export async function uploadCompressedImage(
  file,
  path,
  itemId,
  onProgress = null
) {
  // Only compress if file is large
  let fileToUpload = file;
  if (file.size > 1024 * 1024) {
    // > 1MB
    fileToUpload = await compressImage(file);
  }

  return uploadImage(fileToUpload, path, itemId, onProgress);
}

export default {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  compressImage,
  uploadCompressedImage,
  STORAGE_PATHS,
};
