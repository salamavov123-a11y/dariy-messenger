const STORAGE_KEY = "dariyMessengerDB";
const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1614283233556-f35b0c801ef1?auto=format&fit=crop&w=200&q=80";

const state = {
  mode: "login",
  currentUserId: null,
  currentChatId: null,
};

const db = loadDB();
seedDB();

const authScreen = document.getElementById("authScreen");
const chatApp = document.getElementById("chatApp");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const authForm = document.getElementById("authForm");
const authSubmit = document.getElementById("authSubmit");
const authHint = document.getElementById("authHint");
const authUsername = document.getElementById("authUsername");
const authPassword = document.getElementById("authPassword");

const profileName = document.getElementById("profileName");
const profileCard = document.getElementById("profileCard");
const avatarImage = document.getElementById("avatarImage");
const avatarFrame = document.getElementById("avatarFrame");

const chatsBtn = document.getElementById("chatsBtn");
const createChatBtn = document.getElementById("createChatBtn");
const settingsBtn = document.getElementById("settingsBtn");
const logoutBtn = document.getElementById("logoutBtn");
const chatListPanel = document.getElementById("chatListPanel");
const createChatPanel = document.getElementById("createChatPanel");
const chatList = document.getElementById("chatList");
const createChatHint = document.getElementById("createChatHint");

const createChatForm = document.getElementById("createChatPanel");
const newChatName = document.getElementById("newChatName");
const newChatUsers = document.getElementById("newChatUsers");

const chatTitle = document.getElementById("chatTitle");
const messages = document.getElementById("messages");
const composer = document.getElementById("composer");
const messageInput = document.getElementById("messageInput");

const settingsDialog = document.getElementById("settingsDialog");
const settingsForm = document.getElementById("settingsForm");
const avatarUrlInput = document.getElementById("avatarUrlInput");
const profileBgInput = document.getElementById("profileBgInput");
const avatarBorderInput = document.getElementById("avatarBorderInput");

loginTab.addEventListener("click", () => switchMode("login"));
registerTab.addEventListener("click", () => switchMode("register"));
authForm.addEventListener("submit", handleAuth);

chatsBtn.addEventListener("click", () => switchSidebarPanel("chats"));
createChatBtn.addEventListener("click", () => switchSidebarPanel("create"));
settingsBtn.addEventListener("click", openSettings);
logoutBtn.addEventListener("click", logout);
createChatForm.addEventListener("submit", handleCreateChat);
composer.addEventListener("submit", handleMessageSend);
settingsForm.addEventListener("submit", saveSettings);

hydrateSession();
render();

function loadDB() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { users: [], chats: [], sessionUserId: null };
  } catch {
    return { users: [], chats: [], sessionUserId: null };
  }
}

function persistDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function seedDB() {
  if (db.users.length > 0) return;

  const alice = makeUser("neonadmin", "1234", {
    avatarUrl: DEFAULT_AVATAR,
    avatarBorder: "#c77dff",
    profileBg:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80",
  });
  const bob = makeUser("cyberguest", "1234", { avatarUrl: DEFAULT_AVATAR });
  db.users.push(alice, bob);

  const chat = {
    id: crypto.randomUUID(),
    name: "Общий неоновый чат",
    memberIds: [alice.id, bob.id],
    messages: [
      {
        id: crypto.randomUUID(),
        userId: bob.id,
        text: "Привет! Зарегистрируйся или войди, чтобы писать в чаты.",
        createdAt: Date.now(),
      },
    ],
  };
  db.chats.push(chat);
  persistDB();
}

function makeUser(username, password, profile = {}) {
  return {
    id: crypto.randomUUID(),
    username,
    password,
    profile: {
      avatarUrl: profile.avatarUrl || DEFAULT_AVATAR,
      profileBg: profile.profileBg || "",
      avatarBorder: profile.avatarBorder || "#c77dff",
    },
  };
}

function switchMode(mode) {
  state.mode = mode;
  loginTab.classList.toggle("active", mode === "login");
  registerTab.classList.toggle("active", mode === "register");
  authSubmit.textContent = mode === "login" ? "Войти" : "Создать аккаунт";
  authHint.textContent = "";
}

function handleAuth(event) {
  event.preventDefault();
  const username = authUsername.value.trim().toLowerCase();
  const password = authPassword.value;
  if (!username || !password) return;

  const existing = db.users.find((user) => user.username === username);

  if (state.mode === "register") {
    if (existing) {
      authHint.textContent = "Такой логин уже существует.";
      return;
    }
    const user = makeUser(username, password);
    db.users.push(user);
    db.sessionUserId = user.id;
    persistDB();
    state.currentUserId = user.id;
    authForm.reset();
    render();
    return;
  }

  if (!existing || existing.password !== password) {
    authHint.textContent = "Неверный логин или пароль.";
    return;
  }

  db.sessionUserId = existing.id;
  persistDB();
  state.currentUserId = existing.id;
  authForm.reset();
  render();
}

function hydrateSession() {
  if (!db.sessionUserId) return;
  const user = db.users.find((entry) => entry.id === db.sessionUserId);
  if (!user) return;
  state.currentUserId = user.id;
}

function getCurrentUser() {
  return db.users.find((user) => user.id === state.currentUserId) || null;
}

function logout() {
  db.sessionUserId = null;
  persistDB();
  state.currentUserId = null;
  state.currentChatId = null;
  render();
}

function switchSidebarPanel(panel) {
  const showChats = panel === "chats";
  chatsBtn.classList.toggle("active", showChats);
  createChatBtn.classList.toggle("active", !showChats);
  chatListPanel.classList.toggle("hidden", !showChats);
  createChatPanel.classList.toggle("hidden", showChats);
  createChatHint.textContent = "";
}

function openSettings() {
  const user = getCurrentUser();
  if (!user) return;
  avatarUrlInput.value = user.profile.avatarUrl || "";
  profileBgInput.value = user.profile.profileBg || "";
  avatarBorderInput.value = user.profile.avatarBorder || "#c77dff";
  settingsDialog.showModal();
}

function saveSettings(event) {
  event.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  user.profile.avatarUrl = avatarUrlInput.value.trim() || DEFAULT_AVATAR;
  user.profile.profileBg = profileBgInput.value.trim();
  user.profile.avatarBorder = avatarBorderInput.value || "#c77dff";

  persistDB();
  settingsDialog.close();
  renderProfile();
}

function handleCreateChat(event) {
  event.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  const title = newChatName.value.trim();
  if (!title) {
    createChatHint.textContent = "Введите название чата.";
    return;
  }

  const usernames = newChatUsers.value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const memberIds = [user.id];
  for (const username of usernames) {
    const found = db.users.find((entry) => entry.username === username);
    if (found && !memberIds.includes(found.id)) {
      memberIds.push(found.id);
    }
  }

  if (memberIds.length < 2) {
    createChatHint.textContent = "Добавьте хотя бы одного существующего пользователя.";
    return;
  }

  const chat = {
    id: crypto.randomUUID(),
    name: title,
    memberIds,
    messages: [],
  };

  db.chats.push(chat);
  persistDB();

  state.currentChatId = chat.id;
  createChatForm.reset();
  switchSidebarPanel("chats");
  renderChats();
  renderMessages();
}

function handleMessageSend(event) {
  event.preventDefault();
  const user = getCurrentUser();
  if (!user || !state.currentChatId) return;

  const chat = db.chats.find((entry) => entry.id === state.currentChatId);
  if (!chat) return;

  const text = messageInput.value.trim();
  if (!text) return;

  chat.messages.push({
    id: crypto.randomUUID(),
    userId: user.id,
    text,
    createdAt: Date.now(),
  });

  persistDB();
  composer.reset();
  renderMessages();
}

function render() {
  const user = getCurrentUser();
  const isAuthed = Boolean(user);
  authScreen.classList.toggle("hidden", isAuthed);
  chatApp.classList.toggle("hidden", !isAuthed);

  if (!isAuthed) return;

  renderProfile();
  switchSidebarPanel("chats");
  renderChats();
  renderMessages();
}

function renderProfile() {
  const user = getCurrentUser();
  if (!user) return;

  profileName.textContent = user.username;
  avatarImage.src = user.profile.avatarUrl || DEFAULT_AVATAR;
  avatarFrame.style.setProperty("--avatar-border", user.profile.avatarBorder || "#c77dff");

  if (user.profile.profileBg) {
    profileCard.style.setProperty("--profile-bg", `url('${user.profile.profileBg}')`);
  } else {
    profileCard.style.setProperty("--profile-bg", "linear-gradient(120deg, #2f1655, #10091d)");
  }
}

function getCurrentUserChats() {
  const user = getCurrentUser();
  if (!user) return [];
  return db.chats.filter((chat) => chat.memberIds.includes(user.id));
}

function renderChats() {
  const userChats = getCurrentUserChats();
  chatList.innerHTML = "";

  if (!state.currentChatId && userChats[0]) {
    state.currentChatId = userChats[0].id;
  }

  if (userChats.length === 0) {
    chatList.innerHTML = '<p class="muted">У вас пока нет чатов.</p>';
    chatTitle.textContent = "Нет активного чата";
    messages.innerHTML = '<p class="muted">Создайте чат и добавьте участников.</p>';
    return;
  }

  for (const chat of userChats) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chat-item";
    button.classList.toggle("active", chat.id === state.currentChatId);

    const participantNames = chat.memberIds
      .map((id) => db.users.find((u) => u.id === id)?.username)
      .filter(Boolean)
      .join(", ");

    button.innerHTML = `<strong>${escapeHtml(chat.name)}</strong><br><small>${escapeHtml(participantNames)}</small>`;
    button.addEventListener("click", () => {
      state.currentChatId = chat.id;
      renderChats();
      renderMessages();
    });
    chatList.appendChild(button);
  }
}

function renderMessages() {
  const chat = db.chats.find((entry) => entry.id === state.currentChatId);
  messages.innerHTML = "";

  if (!chat) {
    chatTitle.textContent = "Выберите чат";
    messages.innerHTML = '<p class="muted">Чат не выбран.</p>';
    return;
  }

  chatTitle.textContent = chat.name;

  if (chat.messages.length === 0) {
    messages.innerHTML = '<p class="muted">Пока нет сообщений.</p>';
    return;
  }

  for (const msg of chat.messages) {
    const author = db.users.find((user) => user.id === msg.userId);
    const bubble = document.createElement("article");
    bubble.className = "bubble";
    bubble.classList.toggle("outgoing", msg.userId === state.currentUserId);
    bubble.classList.toggle("incoming", msg.userId !== state.currentUserId);
    bubble.innerHTML = `<small>${escapeHtml(author?.username || "unknown")}</small>${escapeHtml(msg.text)}`;
    messages.appendChild(bubble);
  }

  messages.scrollTop = messages.scrollHeight;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
