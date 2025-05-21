require("dotenv").config();
const express = require("express");
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const cookieParser = require("cookie-parser");

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors({
    origin: "http://localhost:5173", 
    credentials: true               
  }));

app.use(cookieParser());
  

app.use("/api/auth", authRoutes);

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log(`Server running on port ${process.env.PORT}`);
            mongoose.connection.once('open', () => {
                console.log(`🟢 Connected to MongoDB: ${mongoose.connection.name}`);
              });
              
        });
    })
    .catch((err) => console.log(err));
