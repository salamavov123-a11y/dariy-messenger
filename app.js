const STORAGE_KEY = "dariyMessengerDB";
const DEFAULT_AVATAR = "https://zastavok.net/main/graphics/1451310565.jpg";
const DEFAULT_PROFILE_BG_RGB = { r: 47, g: 22, b: 85 };

const state = {
  mode: "login",
  currentUserId: null,
  currentChatId: null,
  searchQuery: "",
  pendingVoiceDataUrl: null,
  replyToMessageId: null,
  mediaRecorder: null,
  mediaChunks: [],
  isAtBottom: true,
};

const db = loadDB();
normalizeDB();
seedDB();

const $ = (id) => document.getElementById(id);
const authScreen = $("authScreen");
const chatApp = $("chatApp");
const loginTab = $("loginTab");
const registerTab = $("registerTab");
const authForm = $("authForm");
const authSubmit = $("authSubmit");
const authHint = $("authHint");
const authUsername = $("authUsername");
const authPassword = $("authPassword");

const profileName = $("profileName");
const profileStatus = $("profileStatus");
const profileCard = $("profileCard");
const avatarImage = $("avatarImage");
const avatarFrame = $("avatarFrame");

const chatsBtn = $("chatsBtn");
const createChatBtn = $("createChatBtn");
const settingsBtn = $("settingsBtn");
const logoutBtn = $("logoutBtn");
const exitAppBtn = $("exitAppBtn");
const chatListPanel = $("chatListPanel");
const createChatPanel = $("createChatPanel");
const chatSearchInput = $("chatSearchInput");
const chatList = $("chatList");
const peopleList = $("peopleList");
const createChatHint = $("createChatHint");

const createChatForm = $("createChatPanel");
const newChatName = $("newChatName");
const newChatUserList = $("newChatUserList");

const chatTitle = $("chatTitle");
const messages = $("messages");
const composer = $("composer");
const messageInput = $("messageInput");
const mediaInput = $("mediaInput");
const composerHint = $("composerHint");
const recordVoiceBtn = $("recordVoiceBtn");
const replyPreview = $("replyPreview");
const scrollToBottomBtn = $("scrollToBottomBtn");

const settingsDialog = $("settingsDialog");
const settingsForm = $("settingsForm");
const avatarFileInput = $("avatarFileInput");
const avatarUrlInput = $("avatarUrlInput");
const bgRedInput = $("bgRedInput");
const bgGreenInput = $("bgGreenInput");
const bgBlueInput = $("bgBlueInput");
const profileBgPreview = $("profileBgPreview");
const avatarBorderInput = $("avatarBorderInput");

const profileViewDialog = $("profileViewDialog");
const profileViewCard = $("profileViewCard");
const profileViewMeta = $("profileViewMeta");
const closeProfileViewBtn = $("closeProfileViewBtn");

loginTab.addEventListener("click", () => switchMode("login"));
registerTab.addEventListener("click", () => switchMode("register"));
authForm.addEventListener("submit", handleAuth);

chatsBtn.addEventListener("click", () => switchSidebarPanel("chats"));
createChatBtn.addEventListener("click", () => switchSidebarPanel("create"));
settingsBtn.addEventListener("click", openSettings);
logoutBtn.addEventListener("click", logout);
exitAppBtn.addEventListener("click", () => window.close());
chatSearchInput.addEventListener("input", () => {
  state.searchQuery = chatSearchInput.value.trim().toLowerCase();
  renderChats();
  renderPeople();
});

createChatForm.addEventListener("submit", handleCreateChat);
composer.addEventListener("submit", handleMessageSend);
settingsForm.addEventListener("submit", saveSettings);
recordVoiceBtn.addEventListener("click", handleVoiceRecordToggle);
closeProfileViewBtn.addEventListener("click", () => profileViewDialog.close());
messages.addEventListener("scroll", updateScrollToBottomButton);
scrollToBottomBtn.addEventListener("click", scrollToBottom);

[bgRedInput, bgGreenInput, bgBlueInput].forEach((input) => input.addEventListener("input", updateRgbPreview));

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

  const blockedUsernames = new Set(["cyberguest", "neonadmin", "neoadmin"]);
  const removedIds = new Set(
    db.users.filter((u) => blockedUsernames.has((u.username || "").toLowerCase())).map((u) => u.id),
  );
  db.users = db.users.filter((u) => !removedIds.has(u.id));
  db.chats = db.chats
    .map((chat) => ({ ...chat, memberIds: (chat.memberIds || []).filter((id) => !removedIds.has(id)) }))
    .filter((chat) => chat.memberIds && chat.memberIds.length >= 2);
  if (removedIds.has(db.sessionUserId)) {
    db.sessionUserId = null;
  }

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
      msg.seenBy = Array.isArray(msg.seenBy) ? msg.seenBy : [msg.userId];
    }
  }
}

function seedDB() {
  if (!Array.isArray(db.users)) {
    db.users = [];
  }
  persistDB();
}

function makeUser(username, password, profile = {}) {
  return {
    id: crypto.randomUUID(),
    username,
    password,
    status: { isOnline: false, lastSeenAt: Date.now() },
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
    if (existing) return (authHint.textContent = "Такой логин уже существует.");
    const user = makeUser(username, password);
    db.users.push(user);
    setCurrentSession(user.id);
    authForm.reset();
    return render();
  }

  if (!existing || existing.password !== password) return (authHint.textContent = "Неверный логин или пароль.");
  setCurrentSession(existing.id);
  authForm.reset();
  render();
}

function setCurrentSession(userId) {
  for (const user of db.users) {
    user.status.isOnline = user.id === userId;
    if (!user.status.isOnline) user.status.lastSeenAt = Date.now();
  }
  db.sessionUserId = userId;
  state.currentUserId = userId;
  persistDB();
}
function hydrateSession() {
  const user = db.users.find((u) => u.id === db.sessionUserId);
  if (user) setCurrentSession(user.id);
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
  state.replyToMessageId = null;
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

  const apply = () => {
    user.profile.avatarBorder = avatarBorderInput.value || "#c77dff";
    user.profile.profileBgRgb = { r: Number(bgRedInput.value), g: Number(bgGreenInput.value), b: Number(bgBlueInput.value) };
    persistDB();
    settingsDialog.close();
    renderProfile();
    renderPeople();
    renderMessages();
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      user.profile.avatarUrl = typeof reader.result === "string" ? reader.result : DEFAULT_AVATAR;
      if (directUrl) user.profile.avatarUrl = directUrl;
      apply();
    };
    return reader.readAsDataURL(file);
  }

  user.profile.avatarUrl = directUrl || user.profile.avatarUrl || DEFAULT_AVATAR;
  apply();
}

function updateRgbPreview() {
  const value = `rgb(${bgRedInput.value}, ${bgGreenInput.value}, ${bgBlueInput.value})`;
  profileBgPreview.textContent = value;
  profileBgPreview.style.background = value;
}

function renderCreateChatUserList() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  newChatUserList.innerHTML = "";
  for (const user of db.users.filter((u) => u.id !== currentUser.id)) {
    const label = document.createElement("label");
    label.className = "user-select-item";
    label.innerHTML = `<input type="checkbox" name="chatUser" value="${user.id}" /><span>${escapeHtml(user.username)}</span><span class="status-dot ${
      user.status.isOnline ? "online" : "offline"
    }"></span>`;
    newChatUserList.appendChild(label);
  }
}

function handleCreateChat(event) {
  event.preventDefault();
  const user = getCurrentUser();
  if (!user) return;
  const title = newChatName.value.trim();
  if (!title) return (createChatHint.textContent = "Введите название чата.");

  const selectedIds = Array.from(newChatUserList.querySelectorAll('input[name="chatUser"]:checked')).map((i) => i.value);
  if (!selectedIds.length) return (createChatHint.textContent = "Выберите хотя бы одного пользователя.");

  const chat = { id: crypto.randomUUID(), name: title, memberIds: [user.id, ...selectedIds], isDirect: false, messages: [] };
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
  let chat = db.chats.find((c) => c.isDirect && c.memberIds.includes(currentUser.id) && c.memberIds.includes(withUserId) && c.memberIds.length === 2);
  if (!chat) {
    const peer = db.users.find((u) => u.id === withUserId);
    if (!peer) return null;
    chat = { id: crypto.randomUUID(), name: `ЛС: ${peer.username}`, memberIds: [currentUser.id, withUserId], isDirect: true, messages: [] };
    db.chats.push(chat);
    persistDB();
  }
  return chat;
}

function renderPeople() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  const query = state.searchQuery;
  const users = db.users.filter((u) => u.id !== currentUser.id && u.username.toLowerCase().includes(query));
  peopleList.innerHTML = users.length ? "" : '<p class="muted">Пользователи не найдены.</p>';

  for (const user of users) {
    const card = document.createElement("div");
    card.className = "person-card";
    card.innerHTML = `<div><strong>${escapeHtml(user.username)}</strong><p class="muted"><span class="status-dot ${
      user.status.isOnline ? "online" : "offline"
    }"></span>${user.status.isOnline ? "В сети" : "Не в сети"}</p></div><div class="person-actions"><button type="button" class="ghost">Профиль</button><button type="button" class="primary">Написать</button></div>`;

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
  const user = db.users.find((u) => u.id === userId);
  if (!user) return;
  const rgb = user.profile.profileBgRgb || { ...DEFAULT_PROFILE_BG_RGB };
  profileViewCard.innerHTML = `<div class="avatar-frame" style="--avatar-border:${escapeHtml(user.profile.avatarBorder)}"><img src="${escapeHtml(
    user.profile.avatarUrl || DEFAULT_AVATAR,
  )}" alt="avatar" /></div><div><p class="muted">Пользователь</p><h2>${escapeHtml(user.username)}</h2><p class="user-status"><span class="status-dot ${
    user.status.isOnline ? "online" : "offline"
  }"></span>${user.status.isOnline ? "В сети" : "Не в сети"}</p></div>`;
  profileViewCard.style.setProperty("--profile-bg", `linear-gradient(120deg, rgb(${rgb.r}, ${rgb.g}, ${rgb.b}), #10091d)`);
  profileViewMeta.textContent = user.status.isOnline ? "Пользователь сейчас онлайн" : `Последний онлайн: ${formatLastSeen(user.status.lastSeenAt)}`;
  profileViewDialog.showModal();
}

function setReply(messageId) {
  state.replyToMessageId = messageId;
  const msg = getCurrentChat()?.messages.find((m) => m.id === messageId);
  if (!msg) return clearReply();
  replyPreview.classList.remove("hidden");
  replyPreview.innerHTML = `Ответ: ${escapeHtml(msg.text || msg.fileName || "медиа")}
    <button type="button" class="ghost" id="cancelReplyBtn">Отмена</button>`;
  document.getElementById("cancelReplyBtn").addEventListener("click", clearReply);
}
function clearReply() {
  state.replyToMessageId = null;
  replyPreview.classList.add("hidden");
  replyPreview.innerHTML = "";
}

async function handleVoiceRecordToggle() {
  if (state.mediaRecorder?.state === "recording") {
    state.mediaRecorder.stop();
    recordVoiceBtn.textContent = "🎙️ Голос";
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) return (composerHint.textContent = "Запись голоса не поддерживается.");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    state.mediaChunks = [];
    state.mediaRecorder = rec;
    rec.addEventListener("dataavailable", (e) => e.data.size && state.mediaChunks.push(e.data));
    rec.addEventListener("stop", () => {
      const blob = new Blob(state.mediaChunks, { type: "audio/webm" });
      const fr = new FileReader();
      fr.onload = () => {
        state.pendingVoiceDataUrl = typeof fr.result === "string" ? fr.result : null;
        composerHint.textContent = state.pendingVoiceDataUrl ? "Голосовое готово к отправке" : "Ошибка голосового";
      };
      fr.readAsDataURL(blob);
      stream.getTracks().forEach((t) => t.stop());
    });
    rec.start();
    recordVoiceBtn.textContent = "⏹ Остановить";
    composerHint.textContent = "Идёт запись...";
  } catch {
    composerHint.textContent = "Нет доступа к микрофону.";
  }
}

function handleMessageSend(event) {
  event.preventDefault();
  const user = getCurrentUser();
  const chat = getCurrentChat();
  if (!user || !chat) return;

  const text = messageInput.value.trim();
  const file = mediaInput.files?.[0] || null;
  if (!text && !file && !state.pendingVoiceDataUrl) return (composerHint.textContent = "Добавьте текст/фото/голосовое");

  if (text) chat.messages.push(makeMessage(user.id, { type: "text", text, replyToId: state.replyToMessageId }));

  const finish = () => {
    markSelfOnline(user);
    persistDB();
    composer.reset();
    state.pendingVoiceDataUrl = null;
    composerHint.textContent = "";
    clearReply();
    renderMessages();
    renderChats();
  };

  if (file) {
    const fr = new FileReader();
    fr.onload = () => {
      const result = typeof fr.result === "string" ? fr.result : "";
      if (file.type.startsWith("image/")) chat.messages.push(makeMessage(user.id, { type: "image", fileDataUrl: result, fileName: file.name, replyToId: state.replyToMessageId }));
      else if (file.type.startsWith("audio/")) chat.messages.push(makeMessage(user.id, { type: "audio", fileDataUrl: result, fileName: file.name, replyToId: state.replyToMessageId }));
      if (state.pendingVoiceDataUrl) chat.messages.push(makeMessage(user.id, { type: "audio", fileDataUrl: state.pendingVoiceDataUrl, fileName: "voice.webm", replyToId: state.replyToMessageId }));
      finish();
    };
    return fr.readAsDataURL(file);
  }

  if (state.pendingVoiceDataUrl) chat.messages.push(makeMessage(user.id, { type: "audio", fileDataUrl: state.pendingVoiceDataUrl, fileName: "voice.webm", replyToId: state.replyToMessageId }));
  finish();
}

function makeMessage(userId, payload) {
  return {
    id: crypto.randomUUID(),
    userId,
    type: payload.type,
    text: payload.text || "",
    fileDataUrl: payload.fileDataUrl || "",
    fileName: payload.fileName || "",
    replyToId: payload.replyToId || null,
    createdAt: Date.now(),
    seenBy: [userId],
  };
}

function getCurrentChat() {
  return db.chats.find((c) => c.id === state.currentChatId) || null;
}

function markChatSeen(chat) {
  const me = getCurrentUser();
  if (!me || !chat) return;
  for (const msg of chat.messages) {
    if (!msg.seenBy.includes(me.id)) msg.seenBy.push(me.id);
  }
}

function markSelfOnline(user) {
  user.status.isOnline = true;
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
  const me = getCurrentUser();
  if (!me) return [];
  return db.chats.filter((chat) => chat.memberIds.includes(me.id));
}

function renderChats() {
  const chats = getCurrentUserChats().filter((chat) => {
    const q = state.searchQuery;
    if (!q) return true;
    const names = chat.memberIds.map((id) => db.users.find((u) => u.id === id)?.username || "").join(" ").toLowerCase();
    return chat.name.toLowerCase().includes(q) || names.includes(q);
  });

  chatList.innerHTML = "";
  if (!state.currentChatId && chats[0]) state.currentChatId = chats[0].id;
  if (!chats.length) {
    chatList.innerHTML = '<p class="muted">Чаты не найдены.</p>';
    return;
  }

  for (const chat of chats) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chat-item";
    btn.classList.toggle("active", chat.id === state.currentChatId);
    const last = chat.messages.at(-1);
    const preview = last ? (last.text || (last.type === "image" ? "📷 Фото" : "🎵 Аудио")) : "Нет сообщений";
    btn.innerHTML = `<strong>${escapeHtml(chat.name)}</strong><br><small>${escapeHtml(preview)}</small>`;
    btn.addEventListener("click", () => {
      state.currentChatId = chat.id;
      renderChats();
      renderMessages();
    });
    chatList.appendChild(btn);
  }
}

function renderMessages() {
  const chat = getCurrentChat();
  messages.innerHTML = "";
  if (!chat) {
    chatTitle.textContent = "Выберите чат";
    messages.innerHTML = '<p class="muted">Чат не выбран.</p>';
    return;
  }

  chatTitle.textContent = chat.name;
  markChatSeen(chat);
  persistDB();

  if (!chat.messages.length) {
    messages.innerHTML = '<p class="muted">Пока нет сообщений.</p>';
    return;
  }

  for (const msg of chat.messages) {
    const author = db.users.find((u) => u.id === msg.userId);
    const bubble = document.createElement("article");
    bubble.className = `bubble ${msg.userId === state.currentUserId ? "outgoing" : "incoming"}`;

    const replied = msg.replyToId ? chat.messages.find((m) => m.id === msg.replyToId) : null;
    const replyHtml = replied ? `<div class="reply-quote">↪ ${escapeHtml(replied.text || replied.fileName || "медиа")}</div>` : "";

    bubble.innerHTML = `<small>${escapeHtml(author?.username || "unknown")} · ${author?.status?.isOnline ? "в сети" : `не в сети • ${formatLastSeen(author?.status?.lastSeenAt)}`}</small>${replyHtml}`;

    if (msg.type === "image" && msg.fileDataUrl) {
      const img = document.createElement("img");
      img.src = msg.fileDataUrl;
      img.className = "message-photo";
      bubble.appendChild(img);
    } else if (msg.type === "audio" && msg.fileDataUrl) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = msg.fileDataUrl;
      audio.className = "message-audio";
      bubble.appendChild(audio);
    }

    if (msg.text) {
      const p = document.createElement("p");
      p.textContent = msg.text;
      bubble.appendChild(p);
    }

    const me = getCurrentUser();
    const deliveredToAll = chat.memberIds.every((id) => msg.seenBy.includes(id));
    const time = document.createElement("time");
    time.textContent = `${formatMessageDate(msg.createdAt)} ${msg.userId === me?.id ? (deliveredToAll ? "✓✓" : "✓") : ""}`;

    const replyBtn = document.createElement("button");
    replyBtn.type = "button";
    replyBtn.className = "ghost inline-btn";
    replyBtn.textContent = "↩";
    replyBtn.addEventListener("click", () => setReply(msg.id));

    bubble.append(time, replyBtn);
    messages.appendChild(bubble);
  }

  if (state.isAtBottom) {
    messages.scrollTop = messages.scrollHeight;
  }
  updateScrollToBottomButton();
}

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
  state.isAtBottom = true;
  updateScrollToBottomButton();
}

function updateScrollToBottomButton() {
  const threshold = 40;
  const nearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < threshold;
  state.isAtBottom = nearBottom;
  scrollToBottomBtn.classList.toggle("hidden", nearBottom);
}

function formatMessageDate(value) {
  return new Date(value).toLocaleString("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function formatLastSeen(value) {
  if (!value) return "давно";
  return new Date(value).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function escapeHtml(value) {
  return value.toString().replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
