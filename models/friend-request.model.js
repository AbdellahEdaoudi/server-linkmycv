const mongoose = require('mongoose');

const FriendRequestSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true 
  },
  receiver: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted'],
    default: 'pending',
    required: true 
  }
}, { timestamps: true });

// Prevent duplicate requests between same users
FriendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

module.exports = mongoose.models.FriendRequest || mongoose.model('FriendRequest', FriendRequestSchema);
