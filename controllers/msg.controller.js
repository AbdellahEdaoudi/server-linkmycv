const FriendRequest = require('../models/FriendRequest');
const Messages = require('../models/Messages');

// Get all messages
exports.getMessages = async (req, res) => {
  try {
    const messages = await Messages.find();
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
// getMyMessages
exports.getMyMessages = async (req, res) => {
  try {
    const { email } = req.params;
    const messages = await Messages.find({
      $or: [{ from: email }, { to: email }]
    }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get message by ID
exports.getMessageById = async (req, res) => {
  const { id } = req.params;
  try {
    const message = await Messages.findById({_id:id});
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new message
exports.createMessage = async (req, res) => {
  const messageData = req.body;
  const { from, to } = messageData;

  try {
    if (from === to) {
      const newMessage = await Messages.create(messageData);
      return res.status(201).json(newMessage);
    }
    const friendshipStatus = await FriendRequest.findOne({
      $or: [
        { from, to }, 
        { from: to, to: from }
      ]
    });
    if (!friendshipStatus || friendshipStatus.status !== 'accept') {
      return res.status(400).json({ error: 'Cannot send message unless the friend request is accepted.' });
    }
    const newMessage = await Messages.create(messageData);
    res.status(201).json(newMessage);

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


// Update message by ID
exports.updateMessageById = async (req, res) => {
  const { id } = req.params;
  const messageData = req.body;
  try {
    const updatedMessage = await Messages.findByIdAndUpdate({_id:id}, messageData, { new: true });
    if (!updatedMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }
    res.status(200).json(updatedMessage);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete message by ID
exports.deleteMessageById = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedMessage = await Messages.findByIdAndDelete({_id:id});
    if (!deletedMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }
    res.json(deletedMessage);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
  

exports.updateReadOrNoForMessages = async (req, res) => {
  const { fromEmail, toEmail } = req.body;
  const reqemail = req.user?.email;
  if (toEmail !== reqemail) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  try {
     await Messages.updateMany(
      { from: fromEmail, to: toEmail, readorno: false },
      { readorno: true },
      { new: true, runValidators: true }
    );
    res.status(200).json({ message: 'Messages updated successfully'});
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};