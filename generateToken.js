require('dotenv').config();
const jwt = require('jsonwebtoken');
const payload = { app: "Linkerfolio" };
const secret = process.env.JWT_SECRET;
const token = jwt.sign(payload, secret, { expiresIn: '8760h' });
console.log("Generated Token:", token);
