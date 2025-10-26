const express = require("express");
const app = express();
const LinksController = require("../controllers/links.controller");
const isAuthenticated = require('../middlewares/isAuthenticated');
const { linksLimiter } = require('../Limiting/linksLimiter');

// Links Request Routes
app.get('/', isAuthenticated, LinksController.getAllLinks);
app.get('/:id', isAuthenticated, LinksController.getLinkById);
app.post('/', isAuthenticated,linksLimiter,LinksController.createLink);
app.put('/:id', isAuthenticated,linksLimiter, LinksController.updateLink);
app.delete('/:id', isAuthenticated, LinksController.deleteLink);

module.exports = app;
