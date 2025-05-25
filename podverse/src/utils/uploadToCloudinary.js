import axios from "axios";

/**
 * Uploads one or more files to Cloudinary.
 * Supports audio, video, image, or any file type (auto-detects type).
 * 
 * @param {File[]} files - Array of File objects to upload
 * @param {String} preset - The upload preset name in Cloudinary
 * @returns {Promise<String[]>} - Array of secure URLs of uploaded files
 */
export const uploadToCloudinary = async (uploadedFiles, uploadPreset) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const api = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  const uploadedUrls = [];

  for (const fileObj of uploadedFiles) {
    const data = new FormData();
    data.append("file", fileObj.file); // Attach the file
    data.append("upload_preset", uploadPreset); // Attach the upload preset

    try {
      const res = await axios.post(api, data);
      const { secure_url } = res.data; // Get the uploaded file's URL
      console.log("✅ Uploaded:", secure_url);
      uploadedUrls.push(secure_url);
    } catch (error) {
      console.error("❌ Cloudinary upload failed:", error);
      throw error; // Re-throw the error to handle it in the calling function
    }
  }

  return uploadedUrls;
};
