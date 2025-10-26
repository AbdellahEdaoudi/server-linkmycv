const express = require("express");
const app = express();
const AdmineController = require("../controllers/admin.controller");
const {verifyJWT} = require('../middlewares/verifyJWT');
const {verifyRole} = require('../middlewares/verifyRole');

// Message Routes
app.post('/register',AdmineController.registerAdmin);
app.post('/login',AdmineController.loginAdmin);
app.post('/refresh',AdmineController.refresh);
app.post('/logout',AdmineController.logout);
app.get('/admin',verifyJWT,verifyRole("admin"), AdmineController.getAllAdmins);
app.delete('/admin/:id',verifyJWT,verifyRole("admin"),AdmineController.deleteAdminById);

module.exports = app;
