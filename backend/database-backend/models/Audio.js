import mongoose  from "mongoose";

const audioSchema = new mongoose.Schema(
    {
        audioUrl : {
            type: String , 
            required : true ,
        }
    },
    {
        timestamps : true
    }
); 

export default mongoose.model("Audio" , audioSchema);