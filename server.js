const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

/* ===== MongoDB ===== */
mongoose.connect("mongodb://127.0.0.1:27017/dariy_messenger");

/* ===== SCHEMAS ===== */

const User = mongoose.model(
  "User",
  new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    avatar: String,
  })
);

const Chat = mongoose.model(
  "Chat",
  new mongoose.Schema({
    name: String,
    users: [String],
    isGroup: Boolean,
  })
);

const Message = mongoose.model(
  "Message",
  new mongoose.Schema({
    chatId: String,
    user: String,
    text: String,
    createdAt: { type: Date, default: Date.now },
  })
);

/* ===== FILE UPLOAD ===== */

const upload = multer({ dest: "uploads/" });

app.post("/avatar/:username", upload.single("avatar"), async (req, res) => {
  const user = await User.findOneAndUpdate(
    { username: req.params.username },
    { avatar: req.file.filename },
    { new: true }
  );
  res.json(user);
});

/* ===== AUTH ===== */

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (await User.findOne({ username }))
    return res.status(400).json({ error: "User exists" });

  res.json(await User.create({ username, password }));
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username, password });
  if (!user) return res.status(400).json({ error: "Invalid credentials" });

  res.json(user);
});

/* ===== USERS ===== */

app.get("/users", async (req, res) => {
  res.json(await User.find({}, { password: 0 }));
});

/* ===== PRIVATE CHAT ===== */

app.post("/chat", async (req, res) => {
  const { user1, user2 } = req.body;

  let chat = await Chat.findOne({
    isGroup: false,
    users: { $all: [user1, user2], $size: 2 },
  });

  if (!chat)
    chat = await Chat.create({ users: [user1, user2], isGroup: false });

  res.json(chat);
});

/* ===== CREATE GROUP ===== */

app.post("/group", async (req, res) => {
  const { name, users } = req.body;
  res.json(await Chat.create({ name, users, isGroup: true }));
});

/* ===== USER CHATS ===== */

app.get("/chats/:username", async (req, res) => {
  res.json(await Chat.find({ users: req.params.username }));
});

/* ===== MESSAGES ===== */

app.get("/messages/:chatId", async (req, res) => {
  res.json(await Message.find({ chatId: req.params.chatId }));
});

/* ===== SOCKET ===== */

io.on("connection", (socket) => {
  socket.on("join", (chatId) => socket.join(chatId));

  socket.on("send_message", async (data) => {
    const msg = await Message.create(data);
    io.to(data.chatId).emit("new_message", msg);
  });
});

/* ===== START ===== */

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});