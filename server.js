const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

/* ================== CONFIG ================== */

const PORT = process.env.PORT || 3000;

mongoose.connect(
  "mongodb+srv://dariy:1Aa%40123888@cluster0.buqpj0z.mongodb.net/dariy_messenger?retryWrites=true&w=majority"
);

/* ================== APP ================== */

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

/* ================== STORAGE (avatars) ================== */

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

/* ================== SCHEMAS ================== */

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  avatar: String,
});

const ChatSchema = new mongoose.Schema({
  users: [String],
  isGroup: Boolean,
  name: String,
});

const MessageSchema = new mongoose.Schema({
  chatId: String,
  user: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", UserSchema);
const Chat = mongoose.model("Chat", ChatSchema);
const Message = mongoose.model("Message", MessageSchema);

/* ================== AUTH ================== */

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const exists = await User.findOne({ username });
  if (exists) return res.status(400).json({ error: "User exists" });

  const user = await User.create({ username, password });
  res.json(user);
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username, password });
  if (!user) return res.status(400).json({ error: "Invalid login" });

  res.json(user);
});

/* ================== AVATAR ================== */

app.post("/avatar/:username", upload.single("avatar"), async (req, res) => {
  await User.updateOne(
    { username: req.params.username },
    { avatar: `/uploads/${req.file.filename}` }
  );

  res.json({ ok: true });
});

/* ================== CHATS ================== */

app.get("/chats/:username", async (req, res) => {
  const chats = await Chat.find({ users: req.params.username });
  res.json(chats);
});

app.post("/group", async (req, res) => {
  const { name, users } = req.body;

  const chat = await Chat.create({
    name,
    users,
    isGroup: true,
  });

  res.json(chat);
});

/* ================== MESSAGES ================== */

app.get("/messages/:chatId", async (req, res) => {
  const msgs = await Message.find({ chatId: req.params.chatId }).sort("createdAt");
  res.json(msgs);
});

/* ================== SOCKET ================== */

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("join", (chatId) => {
    socket.join(chatId);
  });

  socket.on("send_message", async (msg) => {
    const saved = await Message.create(msg);
    io.to(msg.chatId).emit("new_message", saved);
  });
});

/* ================== START ================== */

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});