// controller/general.controller.js
const User = require("../models/User");
const Messages = require("../models/Messages");
const FriendRequest = require("../models/FriendRequest");
const Links = require("../models/Links");

exports.getAllData = async (req, res) => {
  try {
        const { email } = req.params;
        const reqemail = req.user?.email;
        if (email !== reqemail) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
        const findemail = await User.findOne({ email: email });
        if (!email || !findemail) {
          return res.status(400).json({ success: false, message: "Email is required" });
        }
        const [users, messages, friendRequests , links] = await Promise.all([
          User.find().collation({ locale: "en", strength: 1 }).sort({ fullname: 1 })
          .select(" _id fullname email username phoneNumber urlimage category createdAt").lean(),
          Messages.find({
            $or: [{ from: email }, { to: email }],
          }).sort({ createdAt: 1 }).select("-__v").lean(),
          FriendRequest.find({
            $or: [{ from: email }, { to: email }],
          }).select("-createdAt -updatedAt -__v").lean(),
          Links.find({ userEmail: email }).select("-createdAt -updatedAt -__v").lean(),
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
