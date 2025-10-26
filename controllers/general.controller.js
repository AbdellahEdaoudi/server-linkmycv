// controller/general.controller.js
const User = require("../models/User");
const Messages = require("../models/Messages");
const FriendRequest = require("../models/FriendRequest");
const Links = require("../models/Links");

exports.getAllData = async (req, res) => {
  try {
        const { email } = req.params;
        const findemail = User.findOne({ email: email });
        if (!email || !findemail) {
          return res.status(400).json({ success: false, message: "Email is required" });
        }
        const [users, messages, friendRequests , links] = await Promise.all([
          User.find().collation({ locale: "en", strength: 1 }).sort({ fullname: 1 }),
          Messages.find({
            $or: [{ from: email }, { to: email }],
          }).sort({ createdAt: 1 }),
          FriendRequest.find({
            $or: [{ from: email }, { to: email }],
          }),
          Links.find({ userEmail: email }),
        ]);
        res.status(200).json({
          success: true,
          users,
          messages,
          friends: friendRequests,
          links,
        });
        } catch (error) {
          res.status(500).json({ success: false, error: error.message });
        }
  };
