const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // Basic Info
  fullname: { 
    type: String, 
    required: [true, 'Full name is required'], 
    trim: true,
    maxlength: [50, 'Full name cannot exceed 50 characters']
  },
  email: { 
    type: String, 
    trim: true, 
    lowercase: true,
    maxlength: [100, 'Email cannot exceed 100 characters'],
    default: ""
  },
  username: { 
    type: String, 
    trim: true, 
    unique: true,
    sparse: true,
    lowercase: true,
    index: true,
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  phoneNumber: { 
    type: String, 
    trim: true,
    maxlength: [25, 'Phone number cannot exceed 25 characters']
  },
  country: { 
    type: String, 
    trim: true,
    maxlength: [60, 'Location cannot exceed 60 characters']
  },
  profileImage: { 
    type: String, 
    trim: true,
    default: ""
  },
  cloudinaryPublicId: {
    type: String,
    trim: true,
    default: ""
  },
  isOnline: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  summary: { 
    type: String, 
    trim: true,
    maxlength: [1000, 'Summary cannot exceed 1000 characters']
  },
  specialization: { 
    type: String, 
    trim: true,
    maxlength: [100, 'Specialization cannot exceed 100 characters']
  },
  bgcolor: { 
    type: String, 
    trim: true,
    default: "#ffffff"
  },

  // Professional Profile Details (Structured Sub-schemas)
  educations: [{
    institution: { 
      type: String, 
      trim: true,
      maxlength: [100, 'Institution cannot exceed 100 characters']
    },
    degree: { 
      type: String, 
      trim: true,
      maxlength: [100, 'Degree cannot exceed 100 characters']
    },
    fieldOfStudy: { 
      type: String, 
      trim: true,
      maxlength: [100, 'Field of study cannot exceed 100 characters']
    },
    startDate: { type: Date },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
    description: { 
      type: String, 
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    }
  }],

  experiences: [{
    company: { 
      type: String, 
      trim: true,
      maxlength: [100, 'Company cannot exceed 100 characters']
    },
    position: { 
      type: String, 
      trim: true,
      maxlength: [100, 'Position cannot exceed 100 characters']
    },
    location: { 
      type: String, 
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters']
    },
    startDate: { type: Date },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
    description: { 
      type: String, 
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    }
  }],

  skillsList: [{
    name: { 
      type: String, 
      trim: true,
      maxlength: [100, 'Skill name cannot exceed 100 characters']
    }
  }],

  languagesList: [{
    language: { 
      type: String, 
      trim: true,
      maxlength: [100, 'Language name cannot exceed 100 characters']
    }
  }],

  // Professional Social & Portfolio Links
  socials: {
    github: { 
      type: String, 
      trim: true, 
      default: "",
      maxlength: [200, 'GitHub URL cannot exceed 200 characters']
    },
    linkedin: { 
      type: String, 
      trim: true, 
      default: "",
      maxlength: [200, 'LinkedIn URL cannot exceed 200 characters']
    }
  },

  // Account Status & Permissions
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
    index: true
  },
  password: {
    type: String,
    trim: true,
    select: false // Excluded from public queries by default for security
  },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for high performance searching
UserSchema.index({ fullname: "text", username: "text", email: "text" });

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
