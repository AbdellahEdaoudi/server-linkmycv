const Contacte = require("../models/contact.model");
const User = require("../models/user.model");
const sanitizeHtml = require('sanitize-html');

exports.getContacts = async (req, res) => {
  const reqemail = req.user?.email;
  if (reqemail !== "abdellahedaoudi80@gmail.com"){
    return  res.status(403).json({ message: 'Forbidden' });
  }
  try {
    const contacts = await Contacte.find()
      .populate('user', 'fullname username email urlimage')
      .sort({ createdAt: -1 });
    res.json(contacts); // Default status code is 200
  } catch (error) {
    res.status(500).json({ message: "An error occurred while fetching contacts", error });
  }
};

exports.getContactById = async (req, res) => {
  const reqemail = req.user?.email;
  if (reqemail !== "abdellahedaoudi80@gmail.com"){
    return  res.status(403).json({ message: 'Forbidden' });
  }
  try {
    const contact = await Contacte.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ message: "Contact not found" });
    }
    res.json(contact); // Default status code is 200
  } catch (error) {
    res.status(500).json({ message: "An error occurred while fetching the contact", error });
  }
};

exports.createContact = async (req, res) => {
  const ContactData = req.body;
  if (ContactData.email !== req.user?.email) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  // التأكد من أن المستخدم متواجد ومسجل في النظام
  const existingUser = await User.findOne({ email: ContactData.email });
  if (!existingUser) {
    return res.status(403).json({ success: false, message: "Only registered users can send contact messages." });
  }

  ContactData.user = existingUser._id;

  for (const key in ContactData) {
    if (typeof ContactData[key] === 'string') {
      ContactData[key] = sanitizeHtml(ContactData[key]);
    }
  }
  try {
    const newContact = new Contacte(ContactData);
    const savedContact = await newContact.save();
    res.json(savedContact); // Status code 201 for resource creation
  } catch (error) {
    res.status(500).json({ message: "An error occurred while creating the contact", error });
  }
};

exports.updateContactById = async (req, res) => {
  try {
    const updatedContact = await Contacte.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedContact) {
      return res.status(404).json({ message: "Contact not found" });
    }
    res.json(updatedContact); // Default status code is 200
  } catch (error) {
    res.status(500).json({ message: "An error occurred while updating the contact", error });
  }
};

exports.deleteContactById = async (req, res) => {
  const reqemail = req.user?.email;
  if (reqemail !== "abdellahedaoudi80@gmail.com"){
    return  res.status(403).json({ message: 'Forbidden' });
  }
  try {
    const deletedContact = await Contacte.findByIdAndDelete(req.params.id);
    if (!deletedContact) {
      return res.status(404).json({ message: "Contact not found" });
    }
    res.json({ message: "Contact deleted successfully", deletedContact }); // Default status code is 200
  } catch (error) {
    res.status(500).json({ message: "An error occurred while deleting the contact", error });
  }
};