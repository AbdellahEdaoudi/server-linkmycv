const express = require("express");
const app = express();
const UserController = require("../controllers/user.controller");
const translateController = require("../controllers/translate.controller");
const isAuthenticated = require('../middlewares/isAuthenticated');
const {verifyJWT} = require('../middlewares/verifyJWT');
const {verifyRole} = require('../middlewares/verifyRole');
const upload = require('../middlewares/multer');

// User Routes
app.get('/', isAuthenticated, UserController.getUsers);
app.get('/:id', isAuthenticated, UserController.getUserById);
app.get('/email/:email', isAuthenticated, UserController.getUserByEmail);
app.get('/username/:username', isAuthenticated, UserController.getUserByUsername);
app.post('/', isAuthenticated, UserController.createUser);
app.put('/:id', isAuthenticated, upload.single('urlimage'), UserController.updateUserById);
app.delete('/:id', verifyJWT, verifyRole("admin"), UserController.deleteUserById);
// Translate Route
app.get("/:username/:lang", isAuthenticated, translateController.getUserByUsernameTranslated)


module.exports = app;
