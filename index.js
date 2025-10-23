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
const emailController = require('./controller/emailController');
const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app);
const cors = require('cors');
const { connectDB } = require('./config/dbConnect');
const { corsOption } = require(path.join(__dirname, 'config', 'corsOptions'));
const upload = require('./middleware/multer');
const isAuthenticated = require('./middleware/isAuthenticated');
const {verifyJWT} = require('./middleware/verifyJWT');
const {verifyRole} = require('./middleware/verifyRole');
const { messageLimiter } = require('./Limiting/messageLimiter');
const { contactLimiter } = require('./Limiting/contactLimiter');
const { linksLimiter } = require('./Limiting/linksLimiter');
const { requestsLimiter } = require('./Limiting/requestsLimiter');
const cookiesParser = require("cookie-parser");
const User = require('./models/User');


const CLIENT_URL = process.env.Server_Url;

// app.use(cors());
app.use(cors({
  origin: ["https://linkerfolio.vercel.app","http://localhost:3000"],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}));

const io = socketIo(server, {
  cors: {
    origin: ["https://linkerfolio.vercel.app","http://localhost:3000"],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  }
});

// Socket.io
io.on('connection', (socket) => {
  // console.log(`A user connected with id: ${socket.id}.`);

  socket.on('userConnected', async (email) => {
    if (email) {
      socket.email = email;
      try {
        await User.findOneAndUpdate({ email }, { isOnline: true });
        console.log(`User with email ${email} is online.`);
      } catch (error) {
        console.error(`Error updating user status: ${error.message}`);
      }
    } else {
      console.error('Email is undefined, cannot update user status.');
    }
  });

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
  socket.on('updateReadOrNo', (data) => {
    io.emit('receiveReadOrNoUpdate', data);
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

  socket.on('disconnect', async () => {
    if (socket.email) {
      try {
        await User.findOneAndUpdate({ email: socket.email }, { isOnline: false });
        console.log(`User with email ${socket.email} is offline.`);
      } catch (error) {
        console.error(`Error updating user status: ${error.message}`);
      }
    }
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
app.post('/chat-users', isAuthenticated, UserController.getUsersWithLastMessage);
app.get('/users/:id', isAuthenticated, UserController.getUserById);
app.get('/usersE/:email', isAuthenticated, UserController.getUserByEmail);
app.get('/user/:username', isAuthenticated, UserController.getUserByFullname);
app.post('/users', isAuthenticated, UserController.createUser);
app.put('/users/:id', isAuthenticated, upload.single('urlimage'), UserController.updateUserById);
app.put('/usersE/:email', isAuthenticated, UserController.updateUserByEmail);
app.delete('/users/:id',verifyJWT,verifyRole("admin"), UserController.deleteUserById);

// Message routes
app.get('/messages', isAuthenticated, MessageController.getMessages);
app.get('/messages/:email', isAuthenticated, MessageController.getMyMessages);
app.get('/messages/:id', isAuthenticated, MessageController.getMessageById);
app.post('/messages',isAuthenticated,messageLimiter,MessageController.createMessage);
app.put('/messages/:id', isAuthenticated,messageLimiter,MessageController.updateMessageById);
app.put('/readorno', isAuthenticated, MessageController.updateReadOrNoForMessages);
app.delete('/messages/:id', isAuthenticated, MessageController.deleteMessageById);
app.delete('/messages_B_U', isAuthenticated, MessageController.deleteMessagesBetweenUsers);

// Links route 
app.get('/links', isAuthenticated, LinksController.getAllLinks);
app.get('/links/:id', isAuthenticated, LinksController.getLinkById);
app.post('/links', isAuthenticated,linksLimiter,LinksController.createLink);
app.put('/links/:id', isAuthenticated,linksLimiter, LinksController.updateLink);
app.delete('/links/:id', isAuthenticated, LinksController.deleteLink);

// Contact Routes
app.get('/contacts',verifyJWT,verifyRole("admin"), ContacteController.getContacts);
app.get('/contacts/:id', isAuthenticated, ContacteController.getContactById);
app.post('/contacts', isAuthenticated,contactLimiter,ContacteController.createContact);
app.put('/contacts/:id', isAuthenticated, ContacteController.updateContactById);
app.delete('/contacts/:id',verifyJWT,verifyRole("admin"), ContacteController.deleteContactById);

// Admin Routes
app.post('/register',AdmineController.registerAdmin);
app.post('/login',AdmineController.loginAdmin);
app.post('/refresh',AdmineController.refresh);
app.post('/logout',AdmineController.logout);
app.get('/admin',verifyJWT,verifyRole("admin"), AdmineController.getAllAdmins);
app.delete('/admin/:id',verifyJWT,verifyRole("admin"),AdmineController.deleteAdminById);

// Friends requests Routes
app.post('/friend', isAuthenticated, friendRequestController.createFriendRequest);
app.get('/friend/:email', isAuthenticated, friendRequestController.getAllFriendRequests);
app.get('/friend/:id', isAuthenticated, friendRequestController.getFriendRequestById);
app.put('/friend/:id', isAuthenticated, friendRequestController.updateFriendRequest);
app.delete('/friend/:id', isAuthenticated, friendRequestController.deleteFriendRequest);
app.post('/friends', isAuthenticated,requestsLimiter,friendRequestController.addFriendRequests);

// Deletes Routes
app.delete("/dl",isAuthenticated,deletesController.deleteLinks)
app.delete("/dc",isAuthenticated,deletesController.deleteContacts)
app.delete("/dm",isAuthenticated,deletesController.deleteMessages)
app.delete("/df",isAuthenticated,deletesController.deleteFriendReq)
// Translate Route
app.post("/translate", isAuthenticated, translateController.translateCV)
// SEND EMAIL
app.post('/SendEmail', emailController.sendEmail);
app.post('/SendEmailAll', emailController.sendEmailAll);



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