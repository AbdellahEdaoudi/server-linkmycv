const User = require('../models/User');
const Message = require('../models/Messages');
const Contacte = require('../models/Contacte');
const FriendRequest = require('../models/FriendRequest');
const Links = require('../models/Links');
const cloudinary = require("../utils/cloudinary");
const sanitizeHtml = require('sanitize-html');


const capitalizeWords = (str) => {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\s+/g, ' ');
};
// Get all users
const getUsers = async (req, res) => {
  try {
    const users = await User.find().collation({ locale: 'en', strength: 1 }).sort({ fullname: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const createUser = async (req, res) => {
  const userData = req.body;
  for (const key in userData) {
    if (typeof userData[key] === 'string') {
      userData[key] = sanitizeHtml(userData[key]);
    }
  }
  if (userData.fullname) {
    const words = userData.fullname.trim().split(/\s+/);
    if (words.length > 2) {
      userData.fullname = words.slice(0,2).join(' ');
    } else {
      userData.fullname = words.join(' ');
    }
    if (userData.fullname.length > 20) {
      userData.fullname = userData.fullname.substring(0, 20);
    }
    userData.fullname = capitalizeWords(userData.fullname);
  }
  if (userData.fullname) {
    userData.fullname = capitalizeWords(userData.fullname);
  }
  if (userData.username) {
    if (userData.username.length > 20) {
      userData.username = userData.username.substring(0, 20);
    }
    userData.username = userData.username.replace(/\s/g, '').toLowerCase();
  }

  try {
    const existingUser = await User.findOne({ username: userData.username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const newUser = await User.create(userData);
    res.json(newUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update user by ID
  const updateUserByEmail = async (req, res) => {
    const { email } = req.params;
    const reqemail = req.user?.email;
    if (email !== reqemail) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const userData = req.body;
    if ('email' in userData) {
      delete userData.email;
    }
    for (const key in userData) {
      if (typeof userData[key] === 'string') {
        userData[key] = sanitizeHtml(userData[key]);
      }
    }
    if (userData.fullname) {
      const words = userData.fullname.trim().split(/\s+/);
      if (words.length > 2) {
        userData.fullname = words.slice(0,2).join(' ');
      } else {
        userData.fullname = words.join(' ');
      }
      if (userData.fullname.length > 20) {
        userData.fullname = userData.fullname.substring(0, 20);
      }
      userData.fullname = capitalizeWords(userData.fullname);
    }
    if (userData.username) {
      if (userData.username.length > 20) {
        userData.username = userData.username.substring(0, 20);
      }
      userData.username = userData.username.replace(/\s/g, '').toLowerCase();
    }

    try {
      if (userData.username) {
        const existingUser = await User.findOne({ username: userData.username });
        if (existingUser && existingUser.email !== email) {
          return res.status(400).json({ error: 'Username already exists' });
        }
      }
      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path);
        userData.urlimage = result.secure_url;
      }
      const updatedUser = await User.findOneAndUpdate({email}, userData, { new: true });
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };

// Delete user by ID
const deleteUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userEmail = deletedUser.email;
    await Contacte.deleteMany({ iduser: id });
    await FriendRequest.deleteMany({ $or: [{ from: userEmail }, { to: userEmail }] });
    await Links.deleteMany({ useremail: userEmail });
    await Message.deleteMany({ $or: [{ from: userEmail }, { to: userEmail }] });
    res.json({ message: 'User and all associated data deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getUserByEmail = async (req, res) => {
  const { email } = req.params;
  const reqEmail = req.user.email;
  if (email !== reqEmail) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  try {
    const user = await User.findOne({ email }).select('-aboni -blocked -updatedAt -createdAt -__v').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get user by fullname
const getUserByUsername = async (req, res) => {
  const { username } = req.params;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const links = await Links.find({ useremail: user.email });

    res.status(200).json({
      user,
      links
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


module.exports = {
  getUsers,
  createUser,
  updateUserByEmail,
  deleteUserById,
  getUserByUsername,
  getUserByEmail,
};
