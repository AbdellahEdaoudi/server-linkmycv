const FriendRequest = require('../models/FriendRequest'); 
const User = require('../models/User');

// Create a new friend request
exports.createFriendRequest = async (req, res) => {
  try {
    const { from, to, status } = req.body;
    const finduser = await User.findOne({ email: to });
    if (!finduser) {
      return res.status(404).json({ success: false, error: 'Recipient user not found' });
    }
    if (!from || !to || !status) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    const newRequest = new FriendRequest({ from, to, status });
    await newRequest.save();
    res.status(201).json({ success: true, data: newRequest });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all friend requests
exports.getAllFriendRequests = async (req, res) => {
  try {
    const EmailUser = req.params.email;
    if (!EmailUser) {
      return res.status(400).json({ success: false, error: 'Email parameter is required' });
    }
    const friendRequests = await FriendRequest.find({
      $or: [
        { from: EmailUser },
        { to: EmailUser }
      ]
    });

    res.status(200).json({ success: true, data: friendRequests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get a specific friend request by ID
exports.getFriendRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const friendRequest = await FriendRequest.findById(id);
    if (!friendRequest) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }
    res.status(200).json({ success: true, data: friendRequest });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update a friend request
exports.updateFriendRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to, status } = req.body;
    const updatedRequest = await FriendRequest.findByIdAndUpdate(id, { from, to, status }, { new: true });
    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }
    res.status(200).json({ success: true, data: updatedRequest });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.addFriendRequests = async (req, res) => {
  const friendRequests = req.body;
  if (!Array.isArray(friendRequests) || friendRequests.some(req => !req.from || !req.to || !req.status)) {
    return res.status(400).json({ error: 'Invalid input data' });
  }
  try {
    const result = await FriendRequest.insertMany(friendRequests);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error adding friend requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete a friend request
exports.deleteFriendRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRequest = await FriendRequest.findByIdAndDelete(id);
    if (!deletedRequest) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }
    res.status(200).json({ success: true, message: 'Friend request deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
