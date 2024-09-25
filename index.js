require('dotenv').config();
const mongoose = require("mongoose");
const express = require("express");
const app = express();
app.use(express.json());
const PORT = 9999;
const path = require("path")
const UserController = require("./controller/user.controller")
const MessageController = require("./controller/msg.controller")
const LinksController = require("./controller/links.controller")
const ContacteController = require("./controller/contacte.controller")
const AdmineController = require("./controller/admin.controller")
const friendRequestController = require("./controller/friends.controller")
const http = require('http');
const socketIo = require('socket.io');
const User = require('./models/User');
const server = http.createServer(app);
const cors = require('cors');
const { connectDB } = require('./config/dbConnect');
const { corsOption } = require('./config/corsoptions');
const { allowedOrigins } = require('./config/allowedOrigins');
const upload = require('./middleware/multer');
const Links = require('./models/Links');
const Contact = require('./models/Contacte');
const Messages = require('./models/Messages');
const translate = require('translate-google');
const isAuthenticated = require('./middleware/isAuthenticated');



// app.use(cors());
// app.use(cors({
//   origin: CLIENT_URL,
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
//   credentials: true
// }));

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
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
// User Routes
app.get('/users',isAuthenticated,UserController.getUsers);
app.get('/users/:id',isAuthenticated,UserController.getUserById);
app.get('/usersE/:email',isAuthenticated,UserController.getUserByEmail);
app.get('/user/:username',isAuthenticated,UserController.getUserByFullname);
app.post('/users',isAuthenticated,UserController.createUser);
app.put('/users/:id',isAuthenticated, upload.single('urlimage'),UserController.updateUserById);
app.put('/usersE/:email',isAuthenticated,UserController.updateUserByEmail);
app.delete('/users/:id',isAuthenticated,UserController.deleteUserById);

// Message routes
app.get('/messages',isAuthenticated,MessageController.getMessages);
app.get('/messages/:id',isAuthenticated,MessageController.getMessageById);
app.post('/messages',isAuthenticated,MessageController.createMessage);
app.put('/messages/:id',isAuthenticated,MessageController.updateMessageById);
app.put('/readorno',isAuthenticated,MessageController.updateReadOrNoForMessages);
app.delete('/messages/:id',isAuthenticated,MessageController.deleteMessageById);
app.delete('/messages',isAuthenticated,MessageController.deleteAllMessages);
app.delete('/messages_B_U',isAuthenticated,MessageController.deleteMessagesBetweenUsers);

// Links route 
app.get('/links',isAuthenticated,LinksController.getAllLinks);
app.get('/links/:id',isAuthenticated,LinksController.getLinkById);
app.post('/links',isAuthenticated,LinksController.createLink);
app.put('/links/:id',isAuthenticated,LinksController.updateLink);
app.delete('/links/:id',isAuthenticated,LinksController.deleteLink);

// Contact Routes
app.get('/contacts',isAuthenticated,ContacteController.getContacts);
app.get('/contacts/:id',isAuthenticated,ContacteController.getContactById);
app.post('/contacts',isAuthenticated,ContacteController.createContact);
app.put('/contacts/:id',isAuthenticated,ContacteController.updateContactById);
app.delete('/contacts/:id',isAuthenticated,ContacteController.deleteContactById);

// Admin Routes
app.post('/register',isAuthenticated,AdmineController.registerAdmin);
app.post('/login',isAuthenticated,AdmineController.loginAdmin);
app.get('/admin',isAuthenticated,AdmineController.getAllAdmins);
app.delete('/admin/:id',isAuthenticated,AdmineController.deleteAdminById);

// Friends Routes
app.post('/friend',isAuthenticated,friendRequestController.createFriendRequest);
app.get('/friend',isAuthenticated,friendRequestController.getAllFriendRequests);
app.get('/friend/:id',isAuthenticated,friendRequestController.getFriendRequestById);
app.put('/friend/:id',isAuthenticated,friendRequestController.updateFriendRequest);
app.delete('/friend/:id',isAuthenticated,friendRequestController.deleteFriendRequest);
app.post('/friends',isAuthenticated,friendRequestController.addFriendRequests);
app.delete('/friends',isAuthenticated,friendRequestController.deleteAllFriendRequests);

app.delete("/dl",isAuthenticated, async (req, res) => {
  try {
    const result = await Links.deleteMany({});
    res.status(200).json({ message: "All links have been deleted.", result });
  } catch (error) {
    res.status(500).json({ message: "An error occurred while deleting links.", error });
  }
});

app.delete("/dc",isAuthenticated,async (req, res) => {
  try {
    const result = await Contact.deleteMany({});
    res.status(200).json({ message: "All Contact have been deleted.", result });
  } catch (error) {
    res.status(500).json({ message: "An error occurred while deleting links.", error });
  }
});

app.delete("/dm",isAuthenticated,async (req, res) => {
  try {
    const result = await Messages.deleteMany({});
    res.status(200).json({ message: "All Messages have been deleted.", result });
  } catch (error) {
    res.status(500).json({ message: "An error occurred while deleting links.", error });
  }
});

app.post('/translate',isAuthenticated,async (req, res) => {
  try {
    const { textObject, to } = req.body;

    if (!textObject || !to) {
      return res.status(400).json({ error: 'Text object and target language are required' });
    }
    if (typeof textObject !== 'object') {
      return res.status(400).json({ error: 'Text object must be an object' });
    }

    const translations = {};
    for (const [key, value] of Object.entries(textObject)) {
      if (typeof value === 'string') {
        // Skip translation for fields that look like CSS classes or color codes
        if (/^bg-[a-zA-Z0-9-]+$/.test(value) || /^#[0-9A-Fa-f]{6}$/.test(value)) {
          translations[key] = value;
        } else {
          try {
            const translatedText = await translate(value, { to });
            translations[key] = translatedText;
          } catch (error) {
            console.error(`Error translating ${key}:`, error.message);
            translations[key] = value; // Fallback to original text
          }
        }
      } else {
        // Skip translation for non-string values
        translations[key] = value;
      }
    }

    res.status(200).json({ translations });
  } catch (error) {
    console.error('Server error:', error.message);
    res.status(500).json({ error: 'Failed to translate text object' });
  }
});


app.use("/",express.static(path.join(__dirname,"public")));
app.get('/',(req,res)=>{
  res.sendFile(path.join(__dirname,"./Views/index.html"))
})
app.all("*", (req, res) => {
  res.status(404);
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "views", "404.html"));
  } else if (req.accepts("json")) {
    res.json({ message: "404 Not Found" });
  } else {
    res.type("txt").send("404 Not Found");
  }
});