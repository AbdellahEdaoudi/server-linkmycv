const Contacte = require('../models/Contacte');
const Links = require('../models/Links');
const Messages = require('../models/Messages');

exports.deleteLinks = async (req, res) => {
  try {
    const result = await Links.deleteMany({ useremail: { $ne: "a" } });
    res.status(200).json({ message: "Links  have been deleted.", result });
  } catch (error) {
    res.status(500).json({ message: "An error occurred while deleting links.", error });
  }
};

exports.deleteContacts = async (req, res) => {
  try {
    const result = await Contacte.deleteMany({ iduser: { $ne: "1" } });
    res.status(200).json({ message: "Contacts  have been deleted.", result });
  } catch (error) {
    res.status(500).json({ message: "An error occurred while deleting contacts.", error });
  }
};

exports.deleteMessages = async (req, res) => {
  try {
    const result = await Messages.deleteMany({ toimg: { $ne: "toimg" } });
    res.status(200).json({ message: "Messages have been deleted.", result });
  } catch (error) {
    res.status(500).json({ message: "An error occurred while deleting messages.", error });
  }
};
