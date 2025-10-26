const express = require("express");
const app = express();
const ContacteController = require("../controllers/contacte.controller");
const isAuthenticated = require('../middlewares/isAuthenticated');
const { contactLimiter } = require('../Limiting/contactLimiter');
const {verifyJWT} = require('../middlewares/verifyJWT');
const {verifyRole} = require('../middlewares/verifyRole');

// Contacts Request Routes
app.get('/',verifyJWT,verifyRole("admin"), ContacteController.getContacts);
app.get('/:id', isAuthenticated, ContacteController.getContactById);
app.post('/', isAuthenticated,contactLimiter,ContacteController.createContact);
app.put('/:id', isAuthenticated, ContacteController.updateContactById);
app.delete('/:id',verifyJWT,verifyRole("admin"), ContacteController.deleteContactById);

module.exports = app;
