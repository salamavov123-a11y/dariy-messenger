const STORAGE_KEY = "dariyMessengerDB";
const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1614283233556-f35b0c801ef1?auto=format&fit=crop&w=200&q=80";
const DEFAULT_PROFILE_BG_RGB = { r: 47, g: 22, b: 85 };

const state = {
  mode: "login",
  currentUserId: null,
  currentChatId: null,
};

const db = loadDB();
normalizeDB();
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
const profileStatus = document.getElementById("profileStatus");
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
const newChatUserList = document.getElementById("newChatUserList");

const chatTitle = document.getElementById("chatTitle");
const messages = document.getElementById("messages");
const composer = document.getElementById("composer");
const messageInput = document.getElementById("messageInput");

const settingsDialog = document.getElementById("settingsDialog");
const settingsForm = document.getElementById("settingsForm");
const avatarFileInput = document.getElementById("avatarFileInput");
const avatarUrlInput = document.getElementById("avatarUrlInput");
const bgRedInput = document.getElementById("bgRedInput");
const bgGreenInput = document.getElementById("bgGreenInput");
const bgBlueInput = document.getElementById("bgBlueInput");
const profileBgPreview = document.getElementById("profileBgPreview");
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

[bgRedInput, bgGreenInput, bgBlueInput].forEach((input) => {
  input.addEventListener("input", updateRgbPreview);
});

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

function normalizeDB() {
  db.users = Array.isArray(db.users) ? db.users : [];
  db.chats = Array.isArray(db.chats) ? db.chats : [];

  for (const user of db.users) {
    user.status = user.status || {};
    user.status.isOnline = Boolean(user.status.isOnline);
    user.status.lastSeenAt = user.status.lastSeenAt || Date.now();

    user.profile = user.profile || {};
    user.profile.avatarUrl = user.profile.avatarUrl || DEFAULT_AVATAR;
    user.profile.avatarBorder = user.profile.avatarBorder || "#c77dff";
    if (!user.profile.profileBgRgb) {
      user.profile.profileBgRgb = { ...DEFAULT_PROFILE_BG_RGB };
    }
  }
}

function seedDB() {
  if (db.users.length > 0) return;

  const alice = makeUser("neonadmin", "1234", {
    avatarUrl: DEFAULT_AVATAR,
    avatarBorder: "#c77dff",
    profileBgRgb: { r: 47, g: 22, b: 85 },
  });
  const bob = makeUser("cyberguest", "1234", {
    avatarUrl: DEFAULT_AVATAR,
    profileBgRgb: { r: 28, g: 14, b: 48 },
  });
  bob.status.isOnline = true;

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
    status: {
      isOnline: false,
      lastSeenAt: Date.now(),
    },
    profile: {
      avatarUrl: profile.avatarUrl || DEFAULT_AVATAR,
      avatarBorder: profile.avatarBorder || "#c77dff",
      profileBgRgb: profile.profileBgRgb || { ...DEFAULT_PROFILE_BG_RGB },
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
    setCurrentSession(user.id);
    authForm.reset();
    render();
    return;
  }

  if (!existing || existing.password !== password) {
    authHint.textContent = "Неверный логин или пароль.";
    return;
  }

  setCurrentSession(existing.id);
  authForm.reset();
  render();
}

function setCurrentSession(userId) {
  for (const user of db.users) {
    user.status.isOnline = user.id === userId;
    if (!user.status.isOnline) {
      user.status.lastSeenAt = Date.now();
    }
  }

  const current = db.users.find((user) => user.id === userId);
  if (current) {
    current.status.isOnline = true;
  }

  db.sessionUserId = userId;
  state.currentUserId = userId;
  persistDB();
}

function hydrateSession() {
  if (!db.sessionUserId) return;
  const user = db.users.find((entry) => entry.id === db.sessionUserId);
  if (!user) return;

  setCurrentSession(user.id);
}

function getCurrentUser() {
  return db.users.find((user) => user.id === state.currentUserId) || null;
}

function logout() {
  const user = getCurrentUser();
  if (user) {
    user.status.isOnline = false;
    user.status.lastSeenAt = Date.now();
  }

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

  if (!showChats) {
    renderCreateChatUserList();
  }
}

function openSettings() {
  const user = getCurrentUser();
  if (!user) return;

  avatarUrlInput.value = user.profile.avatarUrl || "";
  avatarFileInput.value = "";
  avatarBorderInput.value = user.profile.avatarBorder || "#c77dff";

  const rgb = user.profile.profileBgRgb || { ...DEFAULT_PROFILE_BG_RGB };
  bgRedInput.value = rgb.r;
  bgGreenInput.value = rgb.g;
  bgBlueInput.value = rgb.b;
  updateRgbPreview();

  settingsDialog.showModal();
}

function saveSettings(event) {
  event.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  const directUrl = avatarUrlInput.value.trim();
  const file = avatarFileInput.files?.[0];

  const applyAndClose = () => {
    user.profile.avatarBorder = avatarBorderInput.value || "#c77dff";
    user.profile.profileBgRgb = {
      r: Number(bgRedInput.value),
      g: Number(bgGreenInput.value),
      b: Number(bgBlueInput.value),
    };

    persistDB();
    settingsDialog.close();
    renderProfile();
    renderChats();
    renderMessages();
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      user.profile.avatarUrl = typeof reader.result === "string" ? reader.result : DEFAULT_AVATAR;
      if (directUrl) {
        user.profile.avatarUrl = directUrl;
      }
      applyAndClose();
    };
    reader.readAsDataURL(file);
    return;
  }

  user.profile.avatarUrl = directUrl || user.profile.avatarUrl || DEFAULT_AVATAR;
  applyAndClose();
}

function updateRgbPreview() {
  const value = `rgb(${bgRedInput.value}, ${bgGreenInput.value}, ${bgBlueInput.value})`;
  profileBgPreview.textContent = value;
  profileBgPreview.style.background = value;
}

function renderCreateChatUserList() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const options = db.users.filter((user) => user.id !== currentUser.id);
  newChatUserList.innerHTML = "";

  if (options.length === 0) {
    newChatUserList.innerHTML = '<p class="muted">Нет доступных пользователей.</p>';
    return;
  }

  for (const user of options) {
    const label = document.createElement("label");
    label.className = "user-select-item";
    const statusClass = user.status.isOnline ? "online" : "offline";

    label.innerHTML = `
      <input type="checkbox" name="chatUser" value="${escapeHtml(user.id)}" />
      <span>${escapeHtml(user.username)}</span>
      <span class="status-dot ${statusClass}"></span>
    `;

    newChatUserList.appendChild(label);
  }
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

  const selectedIds = Array.from(newChatUserList.querySelectorAll('input[name="chatUser"]:checked')).map(
    (entry) => entry.value,
  );

  if (selectedIds.length === 0) {
    createChatHint.textContent = "Выберите хотя бы одного пользователя.";
    return;
  }

  const memberIds = [user.id, ...selectedIds.filter((id) => db.users.some((entry) => entry.id === id))];

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
  renderCreateChatUserList();
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

  user.status.isOnline = true;
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
  profileStatus.innerHTML = `<span class="status-dot online"></span>В сети`;
  avatarImage.src = user.profile.avatarUrl || DEFAULT_AVATAR;
  avatarFrame.style.setProperty("--avatar-border", user.profile.avatarBorder || "#c77dff");

  const rgb = user.profile.profileBgRgb || { ...DEFAULT_PROFILE_BG_RGB };
  profileCard.style.setProperty("--profile-bg", `linear-gradient(120deg, rgb(${rgb.r}, ${rgb.g}, ${rgb.b}), #10091d)`);
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

    const participants = chat.memberIds
      .map((id) => db.users.find((u) => u.id === id))
      .filter(Boolean)
      .map((member) => {
        const dot = `<span class="status-dot ${member.status.isOnline ? "online" : "offline"}"></span>`;
        return `${dot}${escapeHtml(member.username)}`;
      })
      .join(" ");

    button.innerHTML = `<strong>${escapeHtml(chat.name)}</strong><br><small class="chat-participants">${participants}</small>`;
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

    const statusText = author?.status?.isOnline ? "в сети" : `не в сети • ${formatLastSeen(author?.status?.lastSeenAt)}`;
    bubble.innerHTML = `
      <small>${escapeHtml(author?.username || "unknown")} · ${statusText}</small>
      <p>${escapeHtml(msg.text)}</p>
      <time>${formatMessageDate(msg.createdAt)}</time>
    `;
    messages.appendChild(bubble);
  }

  messages.scrollTop = messages.scrollHeight;
}

function formatMessageDate(value) {
  const date = new Date(value);
  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLastSeen(value) {
  if (!value) return "давно";
  const date = new Date(value);
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value) {
  return value
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
