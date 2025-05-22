const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const Speaker = require('../models/Speaker');
const Transcript = require('../models/Transcript');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const transcriptRes = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
    });

    fs.unlinkSync(filePath);

    const speakerId = req.body.speakerId;
    const speaker = await Speaker.findById(speakerId);

    const newTranscript = new Transcript({
      speakerId,
      speakerName: speaker?.name || "Unknown",
      text: transcriptRes.text,
      timestamp: Date.now()
    });

    await newTranscript.save();

    req.io.emit("new-transcript-entry", newTranscript);

    res.status(200).json({ success: true, transcription: transcriptRes.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Transcription failed." });
  }
});

router.get('/speakers', async (req, res) => {
  const speakers = await Speaker.find();
  res.json(speakers);
});

router.get('/transcripts', async (req, res) => {
  const transcripts = await Transcript.find();
  res.json(transcripts);
});

module.exports = router;
