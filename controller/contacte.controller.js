const Contacte = require("../models/Contacte");
const sanitizeHtml = require('sanitize-html');

exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contacte.find();
    res.json(contacts); // Default status code is 200
  } catch (error) {
    res.status(500).json({ message: "An error occurred while fetching contacts", error });
  }
};

exports.getContactById = async (req, res) => {
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