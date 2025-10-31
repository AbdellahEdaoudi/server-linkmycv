const FriendRequest = require('../models/FriendRequest'); 
const User = require('../models/User');

// Create a new friend request
exports.createFriendRequest = async (req, res) => {
  const reqemail = req.user?.email;
  if (reqemail !== req.body.from) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  try {
    const { from, to } = req.body;
    const finduser = await User.findOne({ email: to });
    if (!finduser) {
      return res.status(404).json({ success: false, error: 'Recipient user not found' });
    }
    if (!from || !to) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { from, to },
        { from: to, to: from }
      ]
    });

    if (existingRequest) {
      return res.status(400).json({ success: false, error: 'Friend request already exists' });
    }
    const newRequest = new FriendRequest({ from, to, status: "pending" });
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
    const reqemail = req.user?.email;
    if (reqemail !== EmailUser) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
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


// Update a friend request
exports.updateFriendRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const reqemail = req.user?.email;
    const friendRequest = await FriendRequest.findById(id);
    if (!friendRequest) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }
    if (reqemail !== friendRequest.to) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const updatedRequest = await FriendRequest.findByIdAndUpdate(id, {status:"accept"}, { new: true });
    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }
    res.status(200).json({ success: true, data: updatedRequest });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
    res.status(200).json({ 
      success: true, 
      message: 'Friend request deleted successfully',
      requestTo:deletedRequest.to,
      requestFrom: deletedRequest.from
   });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
