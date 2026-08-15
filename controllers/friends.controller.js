const FriendRequest = require('../models/friend-request.model'); 
const User = require('../models/user.model');

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
    const senderUser = await User.findOne({ email: from });
    if (!senderUser) {
      return res.status(404).json({ success: false, error: 'Sender user not found' });
    }

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderUser._id, receiver: finduser._id },
        { sender: finduser._id, receiver: senderUser._id }
      ]
    });

    if (existingRequest) {
      return res.status(400).json({ success: false, error: 'Friend request already exists' });
    }

    const newRequest = new FriendRequest({ 
      sender: senderUser._id,
      receiver: finduser._id,
      status: "pending" 
    });
    await newRequest.save();
    await newRequest.populate('sender receiver', 'fullname username email urlimage');
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
    
    const currentUser = await User.findOne({ email: EmailUser });
    if (!currentUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const friendRequests = await FriendRequest.find({
      $or: [
        { sender: currentUser._id },
        { receiver: currentUser._id }
      ]
    }).populate('sender receiver', 'fullname username email urlimage');

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
    const friendRequest = await FriendRequest.findById(id).populate('receiver sender');
    if (!friendRequest) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }
    if (reqemail !== friendRequest.receiver.email) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const updatedRequest = await FriendRequest.findByIdAndUpdate(id, {status:"accept"}, { new: true })
      .populate('sender receiver', 'fullname username email urlimage');
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
    const deletedRequest = await FriendRequest.findByIdAndDelete(id)
      .populate('sender receiver', 'fullname username email');
    if (!deletedRequest) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }
    res.status(200).json({ 
      success: true, 
      message: 'Friend request deleted successfully',
      requestTo: deletedRequest.receiver?.email,
      requestFrom: deletedRequest.sender?.email
   });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
