const STORAGE_KEY = "dariyMessengerDB";
const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1614283233556-f35b0c801ef1?auto=format&fit=crop&w=200&q=80";
const DEFAULT_PROFILE_BG_RGB = { r: 47, g: 22, b: 85 };

const state = {
  mode: "login",
  currentUserId: null,
  currentChatId: null,
  pendingVoiceDataUrl: null,
  mediaRecorder: null,
  mediaChunks: [],
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
const exitAppBtn = document.getElementById("exitAppBtn");
const chatListPanel = document.getElementById("chatListPanel");
const createChatPanel = document.getElementById("createChatPanel");
const chatList = document.getElementById("chatList");
const peopleList = document.getElementById("peopleList");
const createChatHint = document.getElementById("createChatHint");

const createChatForm = document.getElementById("createChatPanel");
const newChatName = document.getElementById("newChatName");
const newChatUserList = document.getElementById("newChatUserList");

const chatTitle = document.getElementById("chatTitle");
const messages = document.getElementById("messages");
const composer = document.getElementById("composer");
const messageInput = document.getElementById("messageInput");
const mediaInput = document.getElementById("mediaInput");
const composerHint = document.getElementById("composerHint");
const recordVoiceBtn = document.getElementById("recordVoiceBtn");

const settingsDialog = document.getElementById("settingsDialog");
const settingsForm = document.getElementById("settingsForm");
const avatarFileInput = document.getElementById("avatarFileInput");
const avatarUrlInput = document.getElementById("avatarUrlInput");
const bgRedInput = document.getElementById("bgRedInput");
const bgGreenInput = document.getElementById("bgGreenInput");
const bgBlueInput = document.getElementById("bgBlueInput");
const profileBgPreview = document.getElementById("profileBgPreview");
const avatarBorderInput = document.getElementById("avatarBorderInput");

const profileViewDialog = document.getElementById("profileViewDialog");
const profileViewCard = document.getElementById("profileViewCard");
const profileViewMeta = document.getElementById("profileViewMeta");
const closeProfileViewBtn = document.getElementById("closeProfileViewBtn");

loginTab.addEventListener("click", () => switchMode("login"));
registerTab.addEventListener("click", () => switchMode("register"));
authForm.addEventListener("submit", handleAuth);

chatsBtn.addEventListener("click", () => switchSidebarPanel("chats"));
createChatBtn.addEventListener("click", () => switchSidebarPanel("create"));
settingsBtn.addEventListener("click", openSettings);
logoutBtn.addEventListener("click", logout);
exitAppBtn.addEventListener("click", () => window.close());
createChatForm.addEventListener("submit", handleCreateChat);
composer.addEventListener("submit", handleMessageSend);
settingsForm.addEventListener("submit", saveSettings);
recordVoiceBtn.addEventListener("click", handleVoiceRecordToggle);
closeProfileViewBtn.addEventListener("click", () => profileViewDialog.close());

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
    user.profile.profileBgRgb = user.profile.profileBgRgb || { ...DEFAULT_PROFILE_BG_RGB };
  }

  for (const chat of db.chats) {
    chat.isDirect = Boolean(chat.isDirect);
    chat.messages = Array.isArray(chat.messages) ? chat.messages : [];
    for (const msg of chat.messages) {
      msg.type = msg.type || "text";
    }
  }
}

function seedDB() {
  if (db.users.length > 0) return;

  const admin = makeUser("neonadmin", "1234", {
    avatarUrl: DEFAULT_AVATAR,
    avatarBorder: "#c77dff",
    profileBgRgb: { r: 47, g: 22, b: 85 },
  });
  const guest = makeUser("cyberguest", "1234", {
    avatarUrl: "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=200&q=80",
    profileBgRgb: { r: 28, g: 14, b: 48 },
  });
  guest.status.isOnline = true;

  db.users.push(admin, guest);
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

  if (!showChats) renderCreateChatUserList();
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
    renderPeople();
    renderMessages();
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      user.profile.avatarUrl = typeof reader.result === "string" ? reader.result : DEFAULT_AVATAR;
      if (directUrl) user.profile.avatarUrl = directUrl;
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
    label.innerHTML = `
      <input type="checkbox" name="chatUser" value="${escapeHtml(user.id)}" />
      <span>${escapeHtml(user.username)}</span>
      <span class="status-dot ${user.status.isOnline ? "online" : "offline"}"></span>
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
    isDirect: false,
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

function getOrCreateDirectChat(withUserId) {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  let chat = db.chats.find((entry) => {
    if (!entry.isDirect) return false;
    const ids = [...entry.memberIds].sort();
    const need = [currentUser.id, withUserId].sort();
    return ids.length === 2 && ids[0] === need[0] && ids[1] === need[1];
  });

  if (!chat) {
    const peer = db.users.find((user) => user.id === withUserId);
    if (!peer) return null;
    chat = {
      id: crypto.randomUUID(),
      name: `ЛС: ${peer.username}`,
      memberIds: [currentUser.id, withUserId],
      isDirect: true,
      messages: [],
    };
    db.chats.push(chat);
    persistDB();
  }

  return chat;
}

function renderPeople() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  peopleList.innerHTML = "";
  const users = db.users.filter((user) => user.id !== currentUser.id);

  if (users.length === 0) {
    peopleList.innerHTML = '<p class="muted">Пока нет других пользователей.</p>';
    return;
  }

  for (const user of users) {
    const card = document.createElement("div");
    card.className = "person-card";
    card.innerHTML = `
      <div>
        <strong>${escapeHtml(user.username)}</strong>
        <p class="muted"><span class="status-dot ${user.status.isOnline ? "online" : "offline"}"></span>${
      user.status.isOnline ? "В сети" : "Не в сети"
    }</p>
      </div>
      <div class="person-actions">
        <button type="button" class="ghost">Профиль</button>
        <button type="button" class="primary">Написать</button>
      </div>
    `;

    const [profileBtn, writeBtn] = card.querySelectorAll("button");
    profileBtn.addEventListener("click", () => openProfileView(user.id));
    writeBtn.addEventListener("click", () => {
      const chat = getOrCreateDirectChat(user.id);
      if (!chat) return;
      state.currentChatId = chat.id;
      renderChats();
      renderMessages();
    });

    peopleList.appendChild(card);
  }
}

function openProfileView(userId) {
  const user = db.users.find((item) => item.id === userId);
  if (!user) return;

  const rgb = user.profile.profileBgRgb || { ...DEFAULT_PROFILE_BG_RGB };
  profileViewCard.innerHTML = `
    <div class="avatar-frame" style="--avatar-border:${escapeHtml(user.profile.avatarBorder)}">
      <img src="${escapeHtml(user.profile.avatarUrl || DEFAULT_AVATAR)}" alt="avatar" />
    </div>
    <div>
      <p class="muted">Пользователь</p>
      <h2>${escapeHtml(user.username)}</h2>
      <p class="user-status"><span class="status-dot ${user.status.isOnline ? "online" : "offline"}"></span>${
    user.status.isOnline ? "В сети" : "Не в сети"
  }</p>
    </div>
  `;
  profileViewCard.style.setProperty("--profile-bg", `linear-gradient(120deg, rgb(${rgb.r}, ${rgb.g}, ${rgb.b}), #10091d)`);
  profileViewMeta.textContent = user.status.isOnline
    ? "Пользователь сейчас онлайн"
    : `Последний онлайн: ${formatLastSeen(user.status.lastSeenAt)}`;

  profileViewDialog.showModal();
}

async function handleVoiceRecordToggle() {
  if (state.mediaRecorder && state.mediaRecorder.state === "recording") {
    state.mediaRecorder.stop();
    recordVoiceBtn.textContent = "🎙️ Голос";
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    composerHint.textContent = "Запись голоса не поддерживается в этом окружении.";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    state.mediaChunks = [];
    state.mediaRecorder = recorder;

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) state.mediaChunks.push(event.data);
    });

    recorder.addEventListener("stop", () => {
      const blob = new Blob(state.mediaChunks, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onload = () => {
        state.pendingVoiceDataUrl = typeof reader.result === "string" ? reader.result : null;
        composerHint.textContent = state.pendingVoiceDataUrl
          ? "Голосовое сообщение готово к отправке."
          : "Не удалось обработать голосовое сообщение.";
      };
      reader.readAsDataURL(blob);
      stream.getTracks().forEach((track) => track.stop());
    });

    recorder.start();
    recordVoiceBtn.textContent = "⏹ Остановить";
    composerHint.textContent = "Идёт запись...";
  } catch {
    composerHint.textContent = "Не удалось получить доступ к микрофону.";
  }
}

function handleMessageSend(event) {
  event.preventDefault();
  const user = getCurrentUser();
  if (!user || !state.currentChatId) return;

  const chat = db.chats.find((entry) => entry.id === state.currentChatId);
  if (!chat) return;

  const text = messageInput.value.trim();
  const file = mediaInput.files?.[0] || null;

  if (!text && !file && !state.pendingVoiceDataUrl) {
    composerHint.textContent = "Добавьте текст, фото или голосовое сообщение.";
    return;
  }

  if (text) {
    chat.messages.push(makeMessage(user.id, { type: "text", text }));
  }

  const finishSending = () => {
    user.status.isOnline = true;
    persistDB();
    composer.reset();
    state.pendingVoiceDataUrl = null;
    composerHint.textContent = "";
    renderMessages();
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (file.type.startsWith("image/")) {
        chat.messages.push(makeMessage(user.id, { type: "image", fileDataUrl: result, fileName: file.name }));
      } else if (file.type.startsWith("audio/")) {
        chat.messages.push(makeMessage(user.id, { type: "audio", fileDataUrl: result, fileName: file.name }));
      }

      if (state.pendingVoiceDataUrl) {
        chat.messages.push(makeMessage(user.id, { type: "audio", fileDataUrl: state.pendingVoiceDataUrl, fileName: "voice.webm" }));
      }
      finishSending();
    };
    reader.readAsDataURL(file);
    return;
  }

  if (state.pendingVoiceDataUrl) {
    chat.messages.push(makeMessage(user.id, { type: "audio", fileDataUrl: state.pendingVoiceDataUrl, fileName: "voice.webm" }));
  }

  finishSending();
}

function makeMessage(userId, payload) {
  return {
    id: crypto.randomUUID(),
    userId,
    type: payload.type,
    text: payload.text || "",
    fileDataUrl: payload.fileDataUrl || "",
    fileName: payload.fileName || "",
    createdAt: Date.now(),
  };
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
  renderPeople();
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
    messages.innerHTML = '<p class="muted">Создайте чат или начните личное сообщение.</p>';
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
    bubble.innerHTML = `<small>${escapeHtml(author?.username || "unknown")} · ${statusText}</small>`;

    if (msg.type === "image" && msg.fileDataUrl) {
      const image = document.createElement("img");
      image.src = msg.fileDataUrl;
      image.alt = msg.fileName || "photo";
      image.className = "message-photo";
      bubble.appendChild(image);
    } else if (msg.type === "audio" && msg.fileDataUrl) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = msg.fileDataUrl;
      audio.className = "message-audio";
      bubble.appendChild(audio);
    }

    if (msg.text) {
      const text = document.createElement("p");
      text.textContent = msg.text;
      bubble.appendChild(text);
    }

    const time = document.createElement("time");
    time.textContent = formatMessageDate(msg.createdAt);
    bubble.appendChild(time);

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
