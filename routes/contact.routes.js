const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contacte.controller');
const { contactLimiter } = require('../Limiting/contactLimiter');
const { verifyJWT } = require('../middlewares/verifyJWT');

router.use(verifyJWT, contactLimiter);

router.get('/', contactController.getMyContacts);
router.post('/', contactController.contactImageMiddleware, contactController.createContact);
router.post('/:id/replies', contactController.contactImageMiddleware, contactController.addReply);

// Reply-level update and soft-delete
router.put('/:id/replies/:messageId', contactController.contactImageMiddleware, contactController.updateReply);
router.delete('/:id/replies/:messageId', contactController.deleteReply);

// Conversation-level update and delete
router.put('/:id', contactController.contactImageMiddleware, contactController.updateContactById);
router.delete('/:id', contactController.deleteContactById);

module.exports = router;
