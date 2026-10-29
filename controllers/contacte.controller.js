const Contacte = require('../models/contact.model');
const User = require('../models/user.model');
const sanitizeHtml = require('sanitize-html');
const cloudinary = require('../utils/cloudinary');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

exports.contactImageMiddleware = upload.single('image');

// Sanitize text input
const cleanText = (value) =>
  sanitizeHtml(String(value || '').trim(), {
    allowedTags: [],
    allowedAttributes: {},
  });

// Extract public_id directly from a Cloudinary URL
const getPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return null;
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/');
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx === -1) return null;
    const fileParts = parts.slice(uploadIdx + 1);
    const versionIdx = fileParts.findIndex((p) => /^v\d+$/.test(p));
    if (versionIdx !== -1) {
      return fileParts.slice(versionIdx + 1).join('/').replace(/\.[^/.]+$/, '');
    }
    return fileParts.join('/').replace(/\.[^/.]+$/, '');
  } catch {
    return null;
  }
};

// Direct buffer upload to Cloudinary
const uploadImageBuffer = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'MessagesImage',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

// 1. Get current user's contacts
exports.getMyContacts = async (req, res) => {
  try {
    const contacts = await Contacte.find({ user: req.user.id })
      .populate('user', 'fullname username email profileImage')
      .populate('messages.sender', 'fullname username email profileImage role')
      .sort({ updatedAt: -1 })
      .lean();

    return res.json(contacts);
  } catch (error) {
    console.error('[Get My Contacts Error]:', error);
    return res.status(500).json({
      message: 'Failed to load your messages',
    });
  }
};

// 2. Create a new contact inquiry
exports.createContact = async (req, res) => {
  let uploadedPublicId = null;

  try {
    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(403).json({
        message: 'Only registered users can send contact messages.',
      });
    }

    const subject = cleanText(req.body.subject);
    const message = cleanText(req.body.message);

    if (!subject || subject.length > 200) {
      return res.status(400).json({
        message: 'Subject is required and must not exceed 200 characters.',
      });
    }

    if (!message || message.length > 5000) {
      return res.status(400).json({
        message: 'Message is required and must not exceed 5000 characters.',
      });
    }

    let imageUrl = null;

    if (req.file) {
      const uploaded = await uploadImageBuffer(req.file.buffer);
      imageUrl = uploaded.secure_url;
      uploadedPublicId = uploaded.public_id;
    }

    const contact = await Contacte.create({
      user: user._id,
      subject,
      messages: [
        {
          sender: user._id,
          senderRole: 'user',
          message,
          ...(imageUrl && { imageUrl }),
        },
      ],
    });

    uploadedPublicId = null;

    await contact.populate([
      { path: 'user', select: 'fullname username email profileImage' },
      { path: 'messages.sender', select: 'fullname username email profileImage role' },
    ]);

    return res.status(201).json({
      message: 'Contact sent successfully',
      contact,
    });
  } catch (error) {
    if (uploadedPublicId) {
      try {
        await cloudinary.uploader.destroy(uploadedPublicId);
      } catch (cleanupError) {
        console.error('Image cleanup failed:', cleanupError);
      }
    }

    console.error('[Create Contact Error]:', error);
    return res.status(500).json({
      message: 'Failed to create contact',
    });
  }
};

// 3. Add reply to contact thread
exports.addReply = async (req, res) => {
  let uploadedPublicId = null;

  try {
    const contact = await Contacte.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        message: 'Contact not found',
      });
    }

    if (contact.user.toString() !== req.user?.id?.toString()) {
      return res.status(403).json({
        message: 'You can only reply to your own conversations.',
      });
    }

    const message = cleanText(req.body.message);

    if (!message || message.length > 5000) {
      return res.status(400).json({
        message: 'Message is required and must not exceed 5000 characters.',
      });
    }

    let imageUrl = null;

    if (req.file) {
      const uploaded = await uploadImageBuffer(req.file.buffer);
      imageUrl = uploaded.secure_url;
      uploadedPublicId = uploaded.public_id;
    }

    contact.messages.push({
      sender: req.user.id,
      senderRole: 'user',
      message,
      ...(imageUrl && { imageUrl }),
    });

    await contact.save();
    uploadedPublicId = null;

    await contact.populate([
      { path: 'user', select: 'fullname username email profileImage' },
      { path: 'messages.sender', select: 'fullname username email profileImage role' },
    ]);

    return res.json({
      message: 'Reply sent successfully',
      contact,
    });
  } catch (error) {
    if (uploadedPublicId) {
      try {
        await cloudinary.uploader.destroy(uploadedPublicId);
      } catch (cleanupError) {
        console.error('Image cleanup failed:', cleanupError);
      }
    }

    console.error('[Add Reply Error]:', error);
    return res.status(500).json({
      message: 'Failed to send reply',
    });
  }
};

// 4. Update specific reply (with text & Cloudinary image replace/remove directly in operation)
exports.updateReply = async (req, res) => {
  let uploadedPublicId = null;

  try {
    const { id, messageId } = req.params;
    const contact = await Contacte.findById(id);

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    if (contact.user.toString() !== req.user?.id?.toString()) {
      return res.status(403).json({ message: 'You can only edit your own conversations.' });
    }

    const msg = contact.messages.id(messageId);
    if (!msg) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (msg.senderRole !== 'user' || msg.sender.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own messages.' });
    }

    if (msg.isDeleted) {
      return res.status(400).json({ message: 'Cannot edit a deleted message.' });
    }

    // Message text
    if (req.body.message !== undefined) {
      const text = cleanText(req.body.message);
      if (!text || text.length > 5000) {
        return res.status(400).json({ message: 'Message text is required (max 5000 characters).' });
      }
      msg.message = text;
    }

    // Direct Cloudinary image handling in this operation:
    // Case A: User uploaded a new image to replace the old one
    if (req.file) {
      // Delete old image from Cloudinary directly
      if (msg.imageUrl) {
        const oldPublicId = getPublicIdFromUrl(msg.imageUrl);
        if (oldPublicId) {
          try {
            await cloudinary.uploader.destroy(oldPublicId);
          } catch (delErr) {
            console.error('Failed to destroy old Cloudinary image:', delErr?.message || delErr);
          }
        }
      }

      // Upload new image
      const uploaded = await uploadImageBuffer(req.file.buffer);
      uploadedPublicId = uploaded.public_id;
      msg.imageUrl = uploaded.secure_url;
      uploadedPublicId = null;
    }
    // Case B: User requested removing existing image without replacement
    else if (req.body.removeImage === 'true' || req.body.removeImage === true) {
      if (msg.imageUrl) {
        const oldPublicId = getPublicIdFromUrl(msg.imageUrl);
        if (oldPublicId) {
          try {
            await cloudinary.uploader.destroy(oldPublicId);
          } catch (delErr) {
            console.error('Failed to destroy Cloudinary image on removal:', delErr?.message || delErr);
          }
        }
        msg.imageUrl = null;
      }
    }

    msg.isEdited = true;
    msg.editedAt = new Date();

    await contact.save();

    await contact.populate([
      { path: 'user', select: 'fullname username email profileImage' },
      { path: 'messages.sender', select: 'fullname username email profileImage role' },
    ]);

    return res.json({
      message: 'Message updated successfully',
      contact,
    });
  } catch (error) {
    if (uploadedPublicId) {
      try {
        await cloudinary.uploader.destroy(uploadedPublicId);
      } catch (cleanupError) {
        console.error('Image cleanup failed:', cleanupError);
      }
    }
    console.error('[Update Message Error]:', error);
    return res.status(500).json({ message: 'Failed to update message' });
  }
};

// 5. Delete specific reply (WhatsApp style soft-delete + direct Cloudinary image deletion)
exports.deleteReply = async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const contact = await Contacte.findById(id);

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    if (contact.user.toString() !== req.user?.id?.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages.' });
    }

    const msg = contact.messages.id(messageId);
    if (!msg) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (msg.senderRole !== 'user' || msg.sender.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages.' });
    }

    if (msg.isDeleted) {
      return res.status(400).json({ message: 'Message is already deleted.' });
    }

    // Delete image directly from Cloudinary if one was attached to this message
    if (msg.imageUrl) {
      const publicId = getPublicIdFromUrl(msg.imageUrl);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (delErr) {
          console.error('Failed to destroy Cloudinary image for deleted message:', delErr?.message || delErr);
        }
      }
      msg.imageUrl = null;
    }

    // Mark as deleted WhatsApp-style
    msg.isDeleted = true;
    msg.deletedAt = new Date();
    msg.message = 'This message was deleted';

    await contact.save();

    await contact.populate([
      { path: 'user', select: 'fullname username email profileImage' },
      { path: 'messages.sender', select: 'fullname username email profileImage role' },
    ]);

    return res.json({
      message: 'Message deleted successfully',
      contact,
    });
  } catch (error) {
    console.error('[Delete Message Error]:', error);
    return res.status(500).json({ message: 'Failed to delete message' });
  }
};

// 6. Update contact subject (and fallback for legacy update)
exports.updateContactById = async (req, res) => {
  try {
    const contact = await Contacte.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    if (contact.user.toString() !== req.user?.id?.toString()) {
      return res.status(403).json({ message: 'You can only edit your own conversations.' });
    }

    // If updating subject
    if (req.body.subject !== undefined) {
      const subject = cleanText(req.body.subject);
      if (!subject || subject.length > 200) {
        return res.status(400).json({
          message: 'Subject is required and must not exceed 200 characters.',
        });
      }
      contact.subject = subject;
    }

    // If messageId was passed in body or params, delegate
    const targetMessageId = req.params.messageId || req.body.messageId;
    if (targetMessageId && req.body.message !== undefined) {
      req.params.messageId = targetMessageId;
      return exports.updateMessage(req, res);
    }

    await contact.save();
    await contact.populate([
      { path: 'user', select: 'fullname username email profileImage' },
      { path: 'messages.sender', select: 'fullname username email profileImage role' },
    ]);

    return res.json({
      message: 'Contact updated successfully',
      contact,
    });
  } catch (error) {
    console.error('[Update Contact Error]:', error);
    return res.status(500).json({ message: 'Failed to update contact' });
  }
};

// 7. Delete entire contact inquiry & review all messages to delete any attached images directly in this operation
exports.deleteContactById = async (req, res) => {
  try {
    const contact = await Contacte.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    if (contact.user.toString() !== req.user?.id?.toString()) {
      return res.status(403).json({ message: 'You can only delete your own conversations.' });
    }

    // Review all messages in this contact for attached images and delete them directly from Cloudinary
    const imageUrls = (contact.messages || [])
      .map((msg) => msg.imageUrl)
      .filter(Boolean);

    for (const url of imageUrls) {
      const publicId = getPublicIdFromUrl(url);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error('Failed to destroy Cloudinary image during contact delete:', err?.message || err);
        }
      }
    }

    // Delete contact document
    await Contacte.findByIdAndDelete(contact._id);

    return res.json({
      message: 'Conversation and all associated attachments deleted successfully',
      id: contact._id,
    });
  } catch (error) {
    console.error('[Delete Contact Error]:', error);
    return res.status(500).json({ message: 'Failed to delete contact' });
  }
};
