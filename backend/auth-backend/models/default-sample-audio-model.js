import mongoose from "mongoose";

const defaultSampleSchema = new mongoose.Schema(
    {
       
        name: {
            type: String,
            required: true
        },
        category: [{
            type: String,
            required: true
        }],
        audioSrc: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        }
    }
);

export default mongoose.model("DefaultVoices", defaultSampleSchema , "default_voices"); 