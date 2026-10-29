const User = require('../models/user.model');
const Contact = require('../models/contact.model');
const sanitizeHtml = require('sanitize-html');
const cloudinary = require('../utils/cloudinary');

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

const destroyCloudinaryAsset = async (publicIdOrUrl) => {
  if (!publicIdOrUrl) return;
  const publicId =
    typeof publicIdOrUrl === 'string' && publicIdOrUrl.includes('cloudinary.com')
      ? getPublicIdFromUrl(publicIdOrUrl)
      : publicIdOrUrl;
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary destroy failed:', err?.message || err);
  }
};

const collectContactImageIds = (contactDoc) => {
  const ids = [];
  if (contactDoc?.imageUrl) {
    const pid = getPublicIdFromUrl(contactDoc.imageUrl);
    if (pid) ids.push(pid);
  }
  (contactDoc?.messages || []).forEach((m) => {
    if (m.imageUrl) {
      const pid = getPublicIdFromUrl(m.imageUrl);
      if (pid) ids.push(pid);
    }
  });
  return [...new Set(ids.filter(Boolean))];
};

const uploadImageBuffer = (buffer, folder = 'MessagesImage') =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
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
exports.getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalAdmins, totalContacts, recentUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      Contact.countDocuments(),
      User.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .select('fullname username email role profileImage createdAt isOnline specialization')
    ]);

    res.json({
      totalUsers,
      totalAdmins,
      totalContacts,
      recentUsers
    });
  } catch (error) {
    console.error('[Admin Stats Error]:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { search, role } = req.query;
    const filter = {};

    if (role && role !== 'all') {
      filter.role = role;
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { fullname: { $regex: term, $options: 'i' } },
        { username: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .select('fullname username email role profileImage createdAt updatedAt isOnline country specialization phoneNumber');

    res.json(users);
  } catch (error) {
    console.error('[Admin Get Users Error]:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Allowed values: user, admin.' });
    }

    if (req.user?.id === id && role !== 'admin') {
      return res.status(400).json({ message: 'You cannot revoke your own admin rights.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select('fullname username email role profileImage');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: `User role updated to ${role} successfully`,
      user: updatedUser
    });
  } catch (error) {
    console.error('[Admin Update Role Error]:', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user?.id === id) {
      return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userContacts = await Contact.find({ user: id }).lean();
    const imageDeletes = [];

    const avatarPublicId =
      targetUser.cloudinaryPublicId || getPublicIdFromUrl(targetUser.profileImage);
    if (avatarPublicId) {
      imageDeletes.push(destroyCloudinaryAsset(avatarPublicId));
    }

    userContacts.forEach((c) => {
      collectContactImageIds(c).forEach((pid) => {
        imageDeletes.push(destroyCloudinaryAsset(pid));
      });
    });

    await Promise.all([
      User.findByIdAndDelete(id),
      Contact.deleteMany({ user: id }),
      ...imageDeletes,
    ]);

    res.json({ message: `User "${targetUser.username || targetUser.fullname}" deleted successfully` });
  } catch (error) {
    console.error('[Admin Delete User Error]:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

// ==========================================
// CONTACTS / MESSAGES MANAGEMENT
// ==========================================

// 1. Get all contacts with populated sender info
exports.getAllContacts = async (req, res) => {
  try {
    const contacts = await Contact.find()
      .populate('user', 'fullname username email profileImage role phoneNumber country isOnline')
      .populate('messages.sender', 'fullname username profileImage role phoneNumber')
      .sort({ updatedAt: -1 });

    res.json(contacts);
  } catch (error) {
    console.error('[Admin Get Contacts Error]:', error);
    res.status(500).json({ message: 'Failed to fetch contact inquiries' });
  }
};

// 2. Admin replies to a contact thread
exports.replyToContact = async (req, res) => {
  let uploadedPublicId = null;

  try {
    const { id } = req.params;
    const contact = await Contact.findById(id);
    if (!contact) {
      return res.status(404).json({ message: 'Contact message not found' });
    }

    const message = sanitizeHtml(String(req.body.message || '').trim(), {
      allowedTags: [],
      allowedAttributes: {},
    });

    if (!message || message.length > 5000) {
      return res.status(400).json({ message: 'Reply message is required (max 5000 characters).' });
    }

    let imageUrl = null;
    if (req.file) {
      const uploaded = await uploadImageBuffer(req.file.buffer, 'MessagesImage');
      imageUrl = uploaded.secure_url;
      uploadedPublicId = uploaded.public_id;
    }

    contact.messages.push({
      senderRole: 'admin',
      sender: req.user.id,
      message,
      ...(imageUrl && { imageUrl }),
    });

    await contact.save();
    uploadedPublicId = null;

    await contact.populate([
      { path: 'user', select: 'fullname username email profileImage role phoneNumber country isOnline' },
      { path: 'messages.sender', select: 'fullname username profileImage role phoneNumber' },
    ]);

    res.json({ message: 'Reply sent successfully', contact });
  } catch (error) {
    if (uploadedPublicId) {
      try {
        await destroyCloudinaryAsset(uploadedPublicId);
      } catch (cleanErr) {
        console.error('Image cleanup failed:', cleanErr);
      }
    }
    console.error('[Admin Reply Contact Error]:', error);
    res.status(500).json({ message: 'Failed to send reply' });
  }
};

// 3. Admin edits a reply in a contact thread (with inline Cloudinary image update/removal)
exports.updateReply = async (req, res) => {
  let uploadedPublicId = null;

  try {
    const { id, messageId } = req.params;
    const contact = await Contact.findById(id);

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    const msg = contact.messages.id(messageId);
    if (!msg) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    if (msg.isDeleted) {
      return res.status(400).json({ message: 'Cannot edit a deleted reply.' });
    }

    // Update message text if provided
    if (req.body.message !== undefined) {
      const text = sanitizeHtml(String(req.body.message || '').trim(), {
        allowedTags: [],
        allowedAttributes: {},
      });
      if (!text || text.length > 5000) {
        return res.status(400).json({ message: 'Reply text is required (max 5000 characters).' });
      }
      msg.message = text;
    }

    // Image handling inline:
    // Case A: New image uploaded to replace existing image
    if (req.file) {
      if (msg.imageUrl) {
        const oldPublicId = getPublicIdFromUrl(msg.imageUrl);
        if (oldPublicId) {
          try {
            await destroyCloudinaryAsset(oldPublicId);
          } catch (delErr) {
            console.error('Failed to destroy old Cloudinary image:', delErr?.message || delErr);
          }
        }
      }

      const uploaded = await uploadImageBuffer(req.file.buffer, 'MessagesImage');
      uploadedPublicId = uploaded.public_id;
      msg.imageUrl = uploaded.secure_url;
      uploadedPublicId = null;
    }
    // Case B: Remove image requested without replacement
    else if (req.body.removeImage === 'true' || req.body.removeImage === true) {
      if (msg.imageUrl) {
        const oldPublicId = getPublicIdFromUrl(msg.imageUrl);
        if (oldPublicId) {
          try {
            await destroyCloudinaryAsset(oldPublicId);
          } catch (delErr) {
            console.error('Failed to destroy Cloudinary image:', delErr?.message || delErr);
          }
        }
        msg.imageUrl = null;
      }
    }

    msg.isEdited = true;
    msg.editedAt = new Date();

    await contact.save();

    await contact.populate([
      { path: 'user', select: 'fullname username email profileImage role phoneNumber country isOnline' },
      { path: 'messages.sender', select: 'fullname username profileImage role phoneNumber' },
    ]);

    res.json({ message: 'Reply updated successfully', contact });
  } catch (error) {
    if (uploadedPublicId) {
      try {
        await destroyCloudinaryAsset(uploadedPublicId);
      } catch (cleanErr) {
        console.error('Image cleanup failed:', cleanErr);
      }
    }
    console.error('[Admin Update Reply Error]:', error);
    res.status(500).json({ message: 'Failed to update reply' });
  }
};

// 4. Admin deletes a specific reply (WhatsApp style soft-delete + inline Cloudinary image deletion)
exports.deleteReply = async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const contact = await Contact.findById(id);

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    const msg = contact.messages.id(messageId);
    if (!msg) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    if (msg.isDeleted) {
      return res.status(400).json({ message: 'Reply is already deleted.' });
    }

    // Delete image from Cloudinary directly inline if attached
    if (msg.imageUrl) {
      const publicId = getPublicIdFromUrl(msg.imageUrl);
      if (publicId) {
        try {
          await destroyCloudinaryAsset(publicId);
        } catch (delErr) {
          console.error('Failed to destroy Cloudinary image for deleted reply:', delErr?.message || delErr);
        }
      }
      msg.imageUrl = null;
    }

    // Mark as deleted WhatsApp style
    msg.isDeleted = true;
    msg.deletedAt = new Date();
    msg.message = 'This message was deleted';

    await contact.save();

    await contact.populate([
      { path: 'user', select: 'fullname username email profileImage role phoneNumber country isOnline' },
      { path: 'messages.sender', select: 'fullname username profileImage role phoneNumber' },
    ]);

    res.json({ message: 'Reply deleted successfully', contact });
  } catch (error) {
    console.error('[Admin Delete Reply Error]:', error);
    res.status(500).json({ message: 'Failed to delete reply' });
  }
};

// 5. Admin deletes entire contact thread (review all messages and delete all attached images from Cloudinary)
exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Contact.findById(id);

    if (!existing) {
      return res.status(404).json({ message: 'Contact message not found' });
    }

    // Review all messages in this contact for attached images and delete them directly from Cloudinary
    const imageUrls = (existing.messages || [])
      .map((msg) => msg.imageUrl)
      .filter(Boolean);

    for (const url of imageUrls) {
      const publicId = getPublicIdFromUrl(url);
      if (publicId) {
        try {
          await destroyCloudinaryAsset(publicId);
        } catch (err) {
          console.error('Failed to destroy Cloudinary image during admin contact delete:', err?.message || err);
        }
      }
    }

    await Contact.findByIdAndDelete(id);

    res.json({ message: 'Contact conversation and all attachments deleted successfully' });
  } catch (error) {
    console.error('[Admin Delete Contact Error]:', error);
    res.status(500).json({ message: 'Failed to delete contact message' });
  }
};
