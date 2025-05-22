const mongoose = require('mongoose');

const SpeakerSchema = new mongoose.Schema({
  name: String,
  type: String,
  color: String
});

module.exports = mongoose.model('Speaker', SpeakerSchema);
