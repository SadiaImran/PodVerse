import axios from "axios";

export const uploadToCloudinary = async (uploadedFiles, uploadPreset) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const api = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
  const uploadedUrls = [];
  
  for (const fileObj of uploadedFiles) {
    const data = new FormData();
    console.log("Attempting upload for file:", fileObj);
    data.append("file", fileObj);
    data.append("upload_preset", uploadPreset);

    try {
      const res = await axios.post(api, data);
      console.log("✅ Cloudinary response:", res.data);
      uploadedUrls.push(res.data.secure_url);
    } catch (error) {
      console.error("❌ Cloudinary upload failed:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
  return uploadedUrls;
};
