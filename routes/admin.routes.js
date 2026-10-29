const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { contactImageMiddleware } = require('../controllers/contacte.controller');
const { verifyJWT } = require('../middlewares/verifyJWT');
const { verifyRole } = require('../middlewares/verifyRole');

// Admin Guard: All routes in this router require a valid JWT token AND role === 'admin'
router.use(verifyJWT, verifyRole('admin'));

// System & Dashboard Stats
router.get('/stats', adminController.getDashboardStats);

// User Management
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

// Contacts / Replies Management
router.get('/contacts', adminController.getAllContacts);
router.post('/contacts/:id/replies', contactImageMiddleware, adminController.replyToContact);
router.put('/contacts/:id/replies/:messageId', contactImageMiddleware, adminController.updateReply);
router.delete('/contacts/:id/replies/:messageId', adminController.deleteReply);
router.delete('/contacts/:id', adminController.deleteContact);

module.exports = router;
