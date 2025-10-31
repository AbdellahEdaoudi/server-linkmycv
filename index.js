require('dotenv').config();
const express = require("express");
const app = express();
const PORT = 9999;
const path = require("path")
const generalController = require("./controllers/general.controller");
const emailController = require('./controllers/emailController');
const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app);
const cors = require('cors');
const { connectDB } = require('./config/dbConnect');
const { corsOption } = require(path.join(__dirname, 'config', 'corsOptions'));
const cookiesParser = require("cookie-parser");
const { socketHandler } = require('./sockets/socket');
const isAuthenticated = require('./middlewares/isAuthenticated');
const CLIENT_URL = process.env.Server_Url;


// Enable CORS
app.use(cors({
  origin: ["https://linkerfolio.vercel.app","http://localhost:3000"],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}));
// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: ["https://linkerfolio.vercel.app","http://localhost:3000"],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  }
});
// Handle socket connections
socketHandler(io);

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// Connect to Database
connectDB()
app.use(cors(corsOption));
app.use(cookiesParser())
app.use(express.json());

// General Route
app.get("/alldata/:email",isAuthenticated,generalController.getAllData);
app.use('/users', require('./routes/userRoutes'));
app.use('/messages', require('./routes/messageRoutes'));
app.use('/friends', require('./routes/friendsRoutes'));
app.use('/links', require('./routes/linksRoutes'));
app.use('/contacts', require('./routes/contactsRoutes'));
app.use('/', require('./routes/adminRoutes'));
// SEND EMAIL
app.post('/SendEmail', emailController.sendEmail);
app.post('/SendEmailAll', emailController.sendEmailAll);

// Serve Static Files and Handle 404
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