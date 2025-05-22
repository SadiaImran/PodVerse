import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import {connectDB} from "./config/db"

dotenv.config();

// Express App
const app = express();
const port = process.env.PORT || 5000 ; 

//Middlewares
app.use(cors());
app.use(express.json());

// ROutes
app.use("/api/audios" , audioRoutes);

app.listen(port , () =>{

    //connect to DB
    connectDB();
    console.log("Server started listening on port", port);
})