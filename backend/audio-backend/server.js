const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let speakers = [
  { id: 'host', name: 'AI Host', type: 'ai', color: 'purple' },
  { id: 'guest1', name: 'You (Human Guest)', type: 'human', color: 'blue' },
  { id: 'guest2', name: 'AI Expert', type: 'ai', color: 'green' },
];

let transcripts = []; // In-memory. Use DB like Mongo/PostgreSQL for persistence

// -----------------------
// Endpoint: Upload Audio
// -----------------------
app.post('/api/upload', upload.single('audio'), async (req, res) => {
  try {
    const filePath = req.file.path;

    // Use Whisper to transcribe audio
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      response_format: 'json',
    });

    const result = {
      text: transcription.text,
      speakerId: req.body.speakerId || 'guest1',
      timestamp: Date.now(),
    };

    transcripts.push(result);

    // Delete temp file
    fs.unlinkSync(filePath);

    res.status(200).json({ success: true, transcription: transcription.text });
  } catch (error) {
    console.error("Upload/Transcription error:", error);
    res.status(500).json({ success: false, message: "Transcription failed." });
  }
});

// -----------------------
// Endpoint: Get Speakers
// -----------------------
app.get('/api/speakers', (req, res) => {
  res.json(speakers);
});

// -----------------------
// Endpoint: Get Transcripts
// -----------------------
app.get('/api/transcripts', (req, res) => {
  res.json(transcripts);
});

// -----------------------
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
