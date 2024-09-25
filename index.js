require('dotenv').config();
const express = require("express");
const app = express();
const PORT = 9999;
const path = require("path")
const UserController = require("./controller/user.controller")
const MessageController = require("./controller/msg.controller")
const LinksController = require("./controller/links.controller")
const ContacteController = require("./controller/contacte.controller")
const AdmineController = require("./controller/admin.controller")
const friendRequestController = require("./controller/friends.controller")
const deletesController = require("./controller/deletes.controller")
const translateController = require("./controller/translate.controller")
const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app);
const cors = require('cors');
const { connectDB } = require('./config/dbConnect');
const { corsOption } = require(path.join(__dirname, 'config', 'corsOptions'));
const upload = require('./middleware/multer');
const isAuthenticated = require('./middleware/isAuthenticated');
const { messageLimiter } = require('./Limiting/messageLimiter');
const { contactLimiter } = require('./Limiting/contactLimiter');
const { linksLimiter } = require('./Limiting/linksLimiter');
const { requestsLimiter } = require('./Limiting/requestsLimiter');
const cookiesParser = require("cookie-parser");

// const Server_Url = "http://localhost:3000"
const Server_Url = "https://linkerfolio.vercel.app"


// app.use(cors());
// app.use(cors({
//   origin: CLIENT_URL,
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
//   credentials: true
// }));

const io = socketIo(server, {
  cors: {
    origin: Server_Url,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

// Socket.io
io.on('connection', (socket) => {
  console.log(`A user connected with id: ${socket.id}.`);

  // Messages
  socket.on('sendMessage', (data) => {
    io.emit('receiveMessage', data);
  });
  socket.on('updateMessage', (data) => {
    io.emit('receiveUpdatedMessage', data);
  });
  socket.on('deleteMessage', (id) => {
    io.emit('receiveDeletedMessage', id);
  });

  // friendRequest
  socket.on('sendFriendRequest', (data) => {
    io.emit('receiveFriendRequest', data);
  });
  socket.on('updateFriendRequest', (data) => {
    io.emit('receiveUpdatedFriendRequest', data);
  });
  socket.on('deleteFriendRequest', (id) => {
    io.emit('receiveDeletedFriendRequest', id);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });

});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

connectDB()
app.use(cors(corsOption));
app.use(cookiesParser())
app.use(express.json());
// User Routes
app.get('/users', isAuthenticated, UserController.getUsers);
app.get('/users/:id', isAuthenticated, UserController.getUserById);
app.get('/usersE/:email', isAuthenticated, UserController.getUserByEmail);
app.get('/user/:username', isAuthenticated, UserController.getUserByFullname);
app.post('/users', isAuthenticated, UserController.createUser);
app.put('/users/:id', isAuthenticated, upload.single('urlimage'), UserController.updateUserById);
app.put('/usersE/:email', isAuthenticated, UserController.updateUserByEmail);
app.delete('/users/:id', isAuthenticated, UserController.deleteUserById);

// Message routes
app.get('/messages', isAuthenticated, MessageController.getMessages);
app.get('/messages/:id', isAuthenticated, MessageController.getMessageById);
app.post('/messages',isAuthenticated,messageLimiter,MessageController.createMessage);
app.put('/messages/:id', isAuthenticated, MessageController.updateMessageById);
app.put('/readorno', isAuthenticated, MessageController.updateReadOrNoForMessages);
app.delete('/messages/:id', isAuthenticated, MessageController.deleteMessageById);
app.delete('/messages', isAuthenticated, MessageController.deleteAllMessages);
app.delete('/messages_B_U', isAuthenticated, MessageController.deleteMessagesBetweenUsers);

// Links route 
app.get('/links', isAuthenticated, LinksController.getAllLinks);
app.get('/links/:id', isAuthenticated, LinksController.getLinkById);
app.post('/links', isAuthenticated,linksLimiter,LinksController.createLink);
app.put('/links/:id', isAuthenticated,linksLimiter, LinksController.updateLink);
app.delete('/links/:id', isAuthenticated, LinksController.deleteLink);

// Contact Routes
app.get('/contacts', isAuthenticated, ContacteController.getContacts);
app.get('/contacts/:id', isAuthenticated, ContacteController.getContactById);
app.post('/contacts', isAuthenticated,contactLimiter,ContacteController.createContact);
app.put('/contacts/:id', isAuthenticated, ContacteController.updateContactById);
app.delete('/contacts/:id', isAuthenticated, ContacteController.deleteContactById);

// Admin Routes
app.post('/register', isAuthenticated, AdmineController.registerAdmin);
app.post('/login', isAuthenticated, AdmineController.loginAdmin);
app.get('/admin', isAuthenticated, AdmineController.getAllAdmins);
app.delete('/admin/:id', isAuthenticated, AdmineController.deleteAdminById);

// Friends requests Routes
app.post('/friend', isAuthenticated, friendRequestController.createFriendRequest);
app.get('/friend', isAuthenticated, friendRequestController.getAllFriendRequests);
app.get('/friend/:id', isAuthenticated, friendRequestController.getFriendRequestById);
app.put('/friend/:id', isAuthenticated, friendRequestController.updateFriendRequest);
app.delete('/friend/:id', isAuthenticated, friendRequestController.deleteFriendRequest);
app.post('/friends', isAuthenticated,requestsLimiter,friendRequestController.addFriendRequests);
app.delete('/friends', isAuthenticated, friendRequestController.deleteAllFriendRequests);

// Deletes Routes
app.delete("/dl", isAuthenticated, deletesController.deleteLinks)
app.delete("/dc", isAuthenticated, deletesController.deleteContacts)
app.delete("/dm", deletesController.deleteMessages)
// Translate Route
app.post("/translate", isAuthenticated, translateController.translateCV)



app.use("/", express.static(path.join(__dirname, "public")));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "./Views/index.html"))
})
app.all("*", (req, res) => {
  res.status(404);
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "Views", "404.html"));
  } else if (req.accepts("json")) {
    res.json({ message: "404 Not Found" });
  } else {
    res.type("txt").send("404 Not Found");
  }
});