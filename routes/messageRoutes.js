const express = require("express");
const app = express();
const MessageController = require("../controllers/msg.controller");
const isAuthenticated = require('../middlewares/isAuthenticated');
const { messageLimiter } = require('../Limiting/messageLimiter');

// Message Routes
app.get('/', isAuthenticated, MessageController.getMessages);
app.get('/email/:email', isAuthenticated, MessageController.getMyMessages);
app.get('/:id', isAuthenticated, MessageController.getMessageById);
app.post('/',isAuthenticated,messageLimiter,MessageController.createMessage);
app.put('/:id', isAuthenticated,messageLimiter,MessageController.updateMessageById);
app.put('/readorno', isAuthenticated, MessageController.updateReadOrNoForMessages);
app.delete('/:id', isAuthenticated, MessageController.deleteMessageById);
app.delete('/messages/dlmbusers', isAuthenticated, MessageController.deleteMessagesBetweenUsers);

module.exports = app;
