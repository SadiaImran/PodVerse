const mongoose = require('mongoose');

const TranscriptSchema = new mongoose.Schema({
  speakerId: String,
  speakerName: String,
  text: String,
  timestamp: Number,
});

module.exports = mongoose.model('Transcript', TranscriptSchema);
