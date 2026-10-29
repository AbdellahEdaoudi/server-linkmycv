const multer = require('multer');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Contacte = require('../models/contact.model');
const cloudinary = require('../utils/cloudinary');

// Multer memory storage configuration for avatar uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

exports.uploadAvatarMiddleware = upload.single('avatar');

// Helper to extract Cloudinary public_id from URL
const getPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return null;
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    let afterUpload = parts[1];
    // Strip version prefix if present: v123456789/
    if (afterUpload.startsWith('v') && afterUpload.indexOf('/') !== -1) {
      afterUpload = afterUpload.substring(afterUpload.indexOf('/') + 1);
    }
    // Strip file extension
    const lastDotIndex = afterUpload.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      return afterUpload.substring(0, lastDotIndex);
    }
    return afterUpload;
  } catch {
    return null;
  }
};

// Get user by username (Lightweight check: verify updatedAt first)
exports.getUserByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const clientUpdatedAt = req.query.lastUpdated || req.body?.lastUpdated;
    const cleanUsername = String(username).toLowerCase().trim();

    // 1. Lightweight query: fetch only updatedAt field to avoid loading the full document and contacts
    const userMeta = await User.findOne({ username: cleanUsername })
      .select('updatedAt')
      .lean();
    if (!userMeta) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 2. If client cache timestamp matches server updatedAt, return immediately without loading relations
    if (clientUpdatedAt && userMeta.updatedAt) {
      const clientTime = new Date(clientUpdatedAt).getTime();
      const serverTime = new Date(userMeta.updatedAt).getTime();
      if (Math.abs(serverTime - clientTime) < 1000) {
        return res.json({ updated: false, message: 'No updates' });
      }
    }

    // 3. Only fetch full user details and contacts if updated or first visit (using .lean() for max speed)
    const [user, contacts] = await Promise.all([
      User.findById(userMeta._id).lean(),
      Contacte.find({ user: userMeta._id }).lean(),
    ]);
    res.json({ updated: true, user, contacts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Basic Info (Profile details + Socials + Username + Email)
exports.updateBasicProfile = async (req, res) => {
  try {
    const {
      fullname,
      username,
      email,
      specialization,
      phoneNumber,
      country,
      summary,
      bgcolor,
      profileImage,
      socials,
      github,
      linkedin,
    } = req.body;

    const updateFields = {};

    // 1. Validate & sanitize Username if provided
    if (username !== undefined) {
      const cleanUsername = String(username)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9._-]/g, '');

      if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 30) {
        return res.status(400).json({
          message: 'Username must be between 3 and 30 characters (letters, numbers, ., -, _)'
        });
      }

      // Check reserved route paths
      const reservedUsernames = [
        'admin', 'api', 'auth', 'dashboard', 'contact', 'login',
        'register', 'settings', 'public', 'linkmycv',
        'null', 'undefined', 'user', 'users'
      ];
      if (reservedUsernames.includes(cleanUsername)) {
        return res.status(400).json({
          message: `Username "${cleanUsername}" is reserved. Please choose another.`
        });
      }

      // Check if username is already taken by another user
      const existingUser = await User.findOne({
        username: cleanUsername,
        _id: { $ne: req.user.id }
      });
      if (existingUser) {
        return res.status(400).json({
          message: 'This username is already taken. Please choose another.'
        });
      }

      updateFields.username = cleanUsername;
    }

    // 2. Email (Optional display email on CV/Portfolio)
    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (cleanEmail !== "") {
        if (cleanEmail.length > 100) {
          return res.status(400).json({
            message: 'Email cannot exceed 100 characters'
          });
        }
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(cleanEmail)) {
          return res.status(400).json({
            message: 'Please provide a valid email address or leave it empty'
          });
        }
        updateFields.email = cleanEmail;
      } else {
        updateFields.email = "";
      }
    }

    // 3. Validate phone number format if provided
    if (phoneNumber && phoneNumber.trim() !== '') {
      const phoneRegex = /^(\+?\d{1,4}[-.\s]?)?(\(?\d{2,5}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{3,5}$/;
      if (!phoneRegex.test(phoneNumber.trim()) || phoneNumber.trim().length < 6 || phoneNumber.trim().length > 25) {
        return res.status(400).json({
          message: 'Please provide a valid phone number (e.g. +212 609 085 357)'
        });
      }
      updateFields.phoneNumber = String(phoneNumber).trim();
    } else if (phoneNumber === '') {
      updateFields.phoneNumber = '';
    }

    if (fullname !== undefined) updateFields.fullname = String(fullname).trim().substring(0, 50);
    if (specialization !== undefined) updateFields.specialization = String(specialization).trim().substring(0, 100);
    if (country !== undefined) updateFields.country = String(country).trim().substring(0, 60);
    if (summary !== undefined) updateFields.summary = String(summary).trim().substring(0, 1000);
    if (bgcolor !== undefined) updateFields.bgcolor = bgcolor;
    if (profileImage !== undefined) updateFields.profileImage = profileImage;

    // Socials
    const currentGithub = socials?.github ?? github;
    const currentLinkedin = socials?.linkedin ?? linkedin;

    updateFields.socials = {
      github: currentGithub ? String(currentGithub).trim().substring(0, 200) : "",
      linkedin: currentLinkedin ? String(currentLinkedin).trim().substring(0, 200) : "",
    };
    updateFields.github = updateFields.socials.github;
    updateFields.Linkedin = updateFields.socials.linkedin;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { returnDocument: 'after', runValidators: true }
    ).lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ message: error.message || 'Server error while updating profile' });
  }
};

// ── Experience CRUD (Granular) ──
exports.addExperience = async (req, res) => {
  try {
    const { company, position, location, startDate, endDate, current, description } = req.body;
    if (!company || !position) {
      return res.status(400).json({ message: 'Company and Position are required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $push: {
          experiences: {
            company,
            position,
            location: location || "",
            startDate: startDate ? new Date(startDate) : null,
            endDate: current ? null : (endDate ? new Date(endDate) : null),
            current: Boolean(current),
            description: description || "",
          },
        },
      },
      { returnDocument: 'after' }
    ).select('experiences').lean();

    res.json({ message: 'Experience added successfully', experiences: user.experiences });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const { company, position, location, startDate, endDate, current, description } = req.body;

    const user = await User.findOneAndUpdate(
      { _id: req.user.id, 'experiences._id': id },
      {
        $set: {
          'experiences.$.company': company,
          'experiences.$.position': position,
          'experiences.$.location': location || "",
          'experiences.$.startDate': startDate ? new Date(startDate) : null,
          'experiences.$.endDate': current ? null : (endDate ? new Date(endDate) : null),
          'experiences.$.current': Boolean(current),
          'experiences.$.description': description || "",
        },
      },
      { returnDocument: 'after' }
    ).select('experiences').lean();

    if (!user) {
      return res.status(404).json({ message: 'Experience not found' });
    }

    res.json({ message: 'Experience updated successfully', experiences: user.experiences });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { experiences: { _id: id } } },
      { returnDocument: 'after' }
    ).select('experiences').lean();

    res.json({ message: 'Experience deleted successfully', experiences: user.experiences });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Education CRUD (Granular) ──
exports.addEducation = async (req, res) => {
  try {
    const { institution, degree, fieldOfStudy, startDate, endDate, current, description } = req.body;
    if (!institution || !degree) {
      return res.status(400).json({ message: 'Institution and Degree are required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $push: {
          educations: {
            institution,
            degree,
            fieldOfStudy: fieldOfStudy || "",
            startDate: startDate ? new Date(startDate) : null,
            endDate: current ? null : (endDate ? new Date(endDate) : null),
            current: Boolean(current),
            description: description || "",
          },
        },
      },
      { returnDocument: 'after' }
    ).select('educations').lean();

    res.json({ message: 'Education added successfully', educations: user.educations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateEducation = async (req, res) => {
  try {
    const { id } = req.params;
    const { institution, degree, fieldOfStudy, startDate, endDate, current, description } = req.body;

    const user = await User.findOneAndUpdate(
      { _id: req.user.id, 'educations._id': id },
      {
        $set: {
          'educations.$.institution': institution,
          'educations.$.degree': degree,
          'educations.$.fieldOfStudy': fieldOfStudy || "",
          'educations.$.startDate': startDate ? new Date(startDate) : null,
          'educations.$.endDate': current ? null : (endDate ? new Date(endDate) : null),
          'educations.$.current': Boolean(current),
          'educations.$.description': description || "",
        },
      },
      { returnDocument: 'after' }
    ).select('educations').lean();

    if (!user) {
      return res.status(404).json({ message: 'Education not found' });
    }

    res.json({ message: 'Education updated successfully', educations: user.educations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteEducation = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { educations: { _id: id } } },
      { returnDocument: 'after' }
    ).select('educations').lean();

    res.json({ message: 'Education deleted successfully', educations: user.educations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Skills CRUD (Granular) ──
exports.addSkill = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Skill name is required' });
    }

    const cleanName = name.trim();
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $push: { skillsList: { name: cleanName } } },
      { returnDocument: 'after' }
    ).select('skillsList').lean();

    res.json({ message: 'Skill added successfully', skillsList: user.skillsList });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { skillsList: { _id: id } } },
      { returnDocument: 'after' }
    ).select('skillsList').lean();

    res.json({ message: 'Skill removed successfully', skillsList: user.skillsList });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Languages CRUD (Granular) ──
exports.addLanguage = async (req, res) => {
  try {
    const { language } = req.body;
    if (!language || !language.trim()) {
      return res.status(400).json({ message: 'Language is required' });
    }

    const cleanLang = language.trim();
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $push: { languagesList: { language: cleanLang } } },
      { returnDocument: 'after' }
    ).select('languagesList').lean();

    res.json({ message: 'Language added successfully', languagesList: user.languagesList });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteLanguage = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { languagesList: { _id: id } } },
      { returnDocument: 'after' }
    ).select('languagesList').lean();

    res.json({ message: 'Language removed successfully', languagesList: user.languagesList });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Profile Avatar Upload & Old Cloudinary Image Deletion ──
exports.updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldPublicId = user.cloudinaryPublicId || getPublicIdFromUrl(user.profileImage);

    // 1. Upload new image buffer to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'linkmycv_avatars',
          transformation: [
            { width: 500, height: 500, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    // 2. Update user profile image and public ID in database
    user.profileImage = uploadResult.secure_url;
    user.urlimage = uploadResult.secure_url;
    user.cloudinaryPublicId = uploadResult.public_id;
    await user.save();

    // 3. Delete old image from Cloudinary if it existed
    if (oldPublicId && oldPublicId !== uploadResult.public_id) {
      try {
        await cloudinary.uploader.destroy(oldPublicId);
        console.log(`Deleted old Cloudinary avatar: ${oldPublicId}`);
      } catch (delErr) {
        console.error('Failed to delete old Cloudinary image:', delErr?.message || delErr);
      }
    }

    res.json({
      message: 'Profile picture updated successfully',
      profileImage: user.profileImage,
      user,
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ message: error.message || 'Error updating avatar' });
  }
};

