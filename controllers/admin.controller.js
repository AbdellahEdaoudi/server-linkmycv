const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Register Function
exports.registerAdmin = async (req, res) => {
  const {email, password, fullname } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const foundUser = await User.findOne({ email }).exec();
    if (foundUser) {
      return res.status(401).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      fullname: fullname || email.split('@')[0],
      email,
      password: hashedPassword,
      role: "admin",
    });

    await user.save();
    const accessToken = jwt.sign(
      { UserInfo: { id: user._id, role: user.role } },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "30m" }
    );
    const refreshToken = jwt.sign(
      { UserInfo: { id: user._id, role: user.role } },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: true,  // true for https 
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({
      accessToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login Function
exports.loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const foundUser = await User.findOne({ email }).select('+password').exec();
    if (!foundUser) {
      return res.status(401).json({ message: "User does not exist" });
    }

    if (foundUser.role !== 'admin') {
      return res.status(403).json({ message: "Access forbidden: Not an admin" });
    }

    const match = await bcrypt.compare(password, foundUser.password);
    if (!match) return res.status(401).json({ message: "Wrong Password" });

    const accessToken = jwt.sign(
      { UserInfo: { id: foundUser._id, role: foundUser.role } },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: 15 }
    );
    const refreshToken = jwt.sign(
      { UserInfo: { id: foundUser._id, role: foundUser.role } },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: true,  // true for https
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({accessToken});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.refresh = (req, res) => {
  const cookies = req.cookies;
  console.log("Cookies:", cookies); 
  if (!cookies?.jwt) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const refreshToken = cookies.jwt;
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const foundUser = await User.findById(user.UserInfo.id).exec();
    if (!foundUser || foundUser.role !== 'admin') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const accessToken = jwt.sign(
      { UserInfo: { id: foundUser._id, role: foundUser.role } },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: 60 * 10}
    );
    
    return res.json({ accessToken });
  });
};

exports.logout = (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(204); //No content
  res.clearCookie('jwt', {
    httpOnly: true,
    sameSite: 'None',
    secure: true,
  });
  res.json({ message: 'Cookie cleared' });
};


exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).exec();
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.deleteAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await User.findByIdAndUpdate(id, { role: 'user' }).exec();

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({ message: "Admin role revoked successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
