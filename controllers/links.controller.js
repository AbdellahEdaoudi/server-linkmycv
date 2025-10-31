const Links = require('../models/Links');



// Get a single link by ID
const getLinkByEmail = async (req, res) => {
  const {email} = req.params;
  const reqemail = req.user?.email;
  if (email !== reqemail) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  try {
    const link = await Links.finfOne({ userEmail: email });
    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }
    res.json(link); // Default status code is 200
  } catch (error) {
    res.status(500).json({ message: 'Error fetching link', error: error.message });
  }
};

// Create a new link
const createLink = async (req, res) => {
  const reqemail = req.user?.email;
  if (req.body.useremail !== reqemail) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  try {
    const newLink = new Links(req.body);
    await newLink.save();
    res.status(201).json({ message: 'Link created successfully', data: newLink });
  } catch (error) {
    res.status(500).json({ message: 'Error creating link', error: error.message });
  }
};

// Update a link by ID
const updateLink = async (req, res) => {
  const reqemail = req.user?.email;
  if (req.body.useremail !== reqemail) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  try {
    const updatedLink = await Links.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedLink) {
      return res.status(404).json({ message: 'Link not found' });
    }
    res.json({ message: 'Link updated successfully', data: updatedLink }); // Default status code is 200
  } catch (error) {
    res.status(500).json({ message: 'Error updating link', error: error.message });
  }
};

// Delete a link by ID
const deleteLink = async (req, res) => {
  const reqemail = req.user?.email;
  const linkToDelete = await Links.findById(req.params.id);
  if (linkToDelete.useremail !== reqemail) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  try {
    const deletedLink = await Links.findByIdAndDelete(req.params.id);
    if (!deletedLink) {
      return res.status(404).json({ message: 'Link not found' });
    }
    res.json({ message: 'Link deleted successfully' }); // Default status code is 200
  } catch (error) {
    res.status(500).json({ message: 'Error deleting link', error: error.message });
  }
};

// Export functions
module.exports = {
  createLink,
  getLinkByEmail,
  updateLink,
  deleteLink
};
