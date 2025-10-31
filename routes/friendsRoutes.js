const express = require("express");
const app = express();
const friendRequestController = require("../controllers/friends.controller");
const isAuthenticated = require('../middlewares/isAuthenticated');

// Friend Request Routes
app.post('/', isAuthenticated, friendRequestController.createFriendRequest);
app.get('/email/:email', isAuthenticated, friendRequestController.getAllFriendRequests);
app.put('/:id', isAuthenticated, friendRequestController.updateFriendRequest);
app.delete('/:id', isAuthenticated, friendRequestController.deleteFriendRequest);

module.exports = app;
