const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { loginLimiter, registerLimiter } = require('../Limiting/authLimiter');

// Auth Routes
router.post('/register', registerLimiter, authController.register);
router.post('/login',    loginLimiter,    authController.login);
router.post('/refresh',  authController.refresh);
router.post('/logout',   authController.logout);

module.exports = router;
