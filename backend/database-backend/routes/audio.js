import express from "express";
import {createAudio} from "../controllers/audio.js"

const router = express.Router();

router.post("/" , createAudio);

export default router ; 