const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Contact = require('../models/contact.model');

// Register
exports.register = async (req, res) => {
    try {
        const { username, password, fullname } = req.body;
        if (!username || !password || !fullname ) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Sanitize username by removing any character not allowed
        const cleanUsername = String(username)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9._-]/g, '');

        if (!cleanUsername) {
            return res.status(400).json({ message: 'Valid username is required' });
        }

        const existingUser = await User.findOne({ username: cleanUsername });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({
            username: cleanUsername,
            fullname,
            password: hashedPassword,
            role: "user"
        });

        await newUser.save();
        res.status(201).json({
            message: 'User registered successfully',
        });

    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        const user = await User.findOne({ username }).select('+password');
        if (!user || !user.password) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const accessToken = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1d' }
        );
        const refreshToken = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
        });

        const contact = await Contact.find({ user: user._id });

        res.status(200).json({
            message: 'Login successful',
            user,
            contact,
            accessToken
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Server error during login' });
    }
};


// Refresh Access Token
exports.refresh = (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ message: 'No refresh token provided' });
    }
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({
                    message: "Refresh token expired"
                });
            }
            return res.status(401).json({
                message: "Invalid refresh token"
            });
        }
        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1d' }
        );
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
        });
        res.json({ accessToken });
    });
};  

// Logout
exports.logout = (req, res) => {
    res.clearCookie('accessToken', { httpOnly: true, secure: true, sameSite: 'None' });
    res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'None' });
    res.json({ message: 'Cookie cleared' });
};
