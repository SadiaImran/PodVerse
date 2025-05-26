import axios from "axios";

export const uploadToCloudinary = async (uploadedFiles, uploadPreset) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    throw new Error("Cloudinary cloud name is missing in environment variables.");
  }

  const api = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  const uploadedUrls = [];

  for (const fileObj of uploadedFiles) {
    if (!fileObj) {
      throw new Error("File to upload is missing or invalid.");
    }

    const data = new FormData();
    data.append("file", fileObj);
    data.append("upload_preset", uploadPreset);

    try {
      const res = await axios.post(api, data);
      const { secure_url } = res.data;
      uploadedUrls.push(secure_url);
    } catch (error) {
      console.error("Cloudinary upload failed:", error.response?.data || error.message);
      throw error;
    }
  }

  return uploadedUrls;
};
