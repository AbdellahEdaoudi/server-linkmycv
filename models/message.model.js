const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  from: {
    type: String,
    required: true,
    trim: true
  },
  fromimg: {
    type: String,
    required: true,
    trim: true
  },
  fromname: {
    type: String,
    required: true,
    trim: true
  },
  to: {
    type: String,
    required: true,
    trim: true
  },
  toimg: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    trim: true
  },
  updated: {
    type: String,
    trim: true
  },
  readorno: {
    type: Boolean,
    default: false
  },
}, { timestamps: true });

module.exports = mongoose.models.Message || mongoose.model('Message', MessageSchema);
