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
    required: [true, 'Email is required'], 
    unique: true, 
    trim: true, 
    lowercase: true,
    index: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
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
    trim: true 
  },
  country: { 
    type: String, 
    trim: true 
  },
  profileImage: { 
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
    institution: { type: String, trim: true },      // e.g. Harvard University
    degree: { type: String, trim: true },           // e.g. Bachelor of Science
    fieldOfStudy: { type: String, trim: true },     // e.g. Software Engineering
    startDate: { type: Date },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
    description: { type: String, trim: true }
  }],

  experiences: [{
    company: { type: String, trim: true },
    position: { type: String, trim: true },
    location: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
    description: { type: String, trim: true }
  }],

  skillsList: [{
    name: { type: String, trim: true },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'], default: 'Intermediate' }
  }],

  languagesList: [{
    language: { type: String, trim: true },
    proficiency: { type: String, enum: ['Basic', 'Conversational', 'Fluent', 'Native'], default: 'Fluent' }
  }],

  servicesList: [{
    title: { type: String, trim: true },
    description: { type: String, trim: true }
  }],

  // Professional Social & Portfolio Links
  socials: {
    github: { type: String, trim: true, default: "" }
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
