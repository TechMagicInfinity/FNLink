const LOBBY = 'lobby';

// --- состояние ---
let serverHttp = null;   // http://host:port
let serverWs = null;     // ws://host:port
let token = null;
let myUsername = null;
let ws = null;
let currentChat = LOBBY;
let contacts = [];             // все зарегистрированные пользователи, кроме меня
let onlineUsers = new Set();
const messagesByChat = {};     // chat id (username или LOBBY) -> [сообщения]
const historyLoaded = new Set();

// --- элементы ---
const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');

const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const chatList = document.getElementById('chat-list');
const meUsername = document.getElementById('me-username');
const currentChatTitle = document.getElementById('current-chat-title');
const messagesEl = document.getElementById('messages');
const sendForm = document.getElementById('send-form');
const messageInput = document.getElementById('message-input');
const logoutBtn = document.getElementById('logout-btn');

// --- вкладки логин/регистрация ---
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const isLogin = tab.dataset.tab === 'login';
    loginForm.classList.toggle('hidden', !isLogin);
    registerForm.classList.toggle('hidden', isLogin);
  });
});

function normalizeServer(input) {
  let value = input.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//.test(value)) value = 'http://' + value;
  return value;
}

function toWs(httpUrl) {
  return httpUrl.replace(/^http/, 'ws');
}

// --- вход ---
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const server = normalizeServer(document.getElementById('login-server').value);
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch(server + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось войти');

    serverHttp = server;
    serverWs = toWs(server);
    token = data.token;
    myUsername = data.username;

    localStorage.setItem('mm_server', serverHttp);
    localStorage.setItem('mm_token', token);
    localStorage.setItem('mm_username', myUsername);

    await enterChat();
  } catch (err) {
    loginError.textContent = err.message;
  }
});

// --- регистрация ---
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerError.textContent = '';
  const server = normalizeServer(document.getElementById('register-server').value);
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value;
  const inviteCode = document.getElementById('register-invite').value.trim();

  try {
    const res = await fetch(server + '/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, inviteCode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось зарегистрироваться');

    // после успешной регистрации сразу переключаем на вкладку входа
    document.querySelector('.tab[data-tab="login"]').click();
    document.getElementById('login-server').value = document.getElementById('register-server').value;
    document.getElementById('login-username').value = username;
    loginError.textContent = 'Готово, теперь войди с этим паролем';
  } catch (err) {
    registerError.textContent = err.message;
  }
});

// --- автовход, если уже есть сохранённая сессия ---
async function tryAutoLogin() {
  const savedServer = localStorage.getItem('mm_server');
  const savedToken = localStorage.getItem('mm_token');
  const savedUsername = localStorage.getItem('mm_username');
  if (!savedServer || !savedToken || !savedUsername) return;

  serverHttp = savedServer;
  serverWs = toWs(savedServer);
  token = savedToken;
  myUsername = savedUsername;
  await enterChat();
}

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('mm_token');
  localStorage.removeItem('mm_username');
  if (ws) ws.close();
  location.reload();
});

// --- переход к экрану чата ---
async function enterChat() {
  authScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  meUsername.textContent = myUsername;

  await loadContacts();
  connectWs();
}

async function loadContacts() {
  try {
    const res = await fetch(serverHttp + '/api/contacts');
    const data = await res.json();
    contacts = (data.users || []).filter((u) => u !== myUsername);
    renderChatList();
  } catch (err) {
    console.error('Не удалось загрузить список пользователей', err);
  }
}

function renderChatList() {
  chatList.innerHTML = '';

  chatList.appendChild(makeChatItem(LOBBY, '# Общий чат', false));

  for (const username of contacts) {
    chatList.appendChild(makeChatItem(username, username, true));
  }
}

function makeChatItem(chatId, label, showPresence) {
  const btn = document.createElement('button');
  btn.className = 'chat-item' + (chatId === currentChat ? ' active' : '');
  btn.dataset.chat = chatId;

  if (showPresence) {
    const dot = document.createElement('span');
    dot.className = 'chat-item-dot' + (onlineUsers.has(chatId) ? ' online' : '');
    btn.appendChild(dot);
  }

  const name = document.createElement('span');
  name.className = 'chat-item-name';
  name.textContent = label;
  btn.appendChild(name);

  btn.addEventListener('click', () => switchChat(chatId, label));
  return btn;
}

function switchChat(chatId, label) {
  currentChat = chatId;
  currentChatTitle.textContent = label;
  renderChatList();
  renderMessages();

  if (!historyLoaded.has(chatId) && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'history', chat: chatId }));
  }
}

// --- WebSocket ---
function connectWs() {
  setStatus(false, 'Подключение...');
  ws = new WebSocket(`${serverWs}/ws?token=${encodeURIComponent(token)}`);

  ws.onopen = () => {
    setStatus(true, 'Онлайн');
    ws.send(JSON.stringify({ type: 'history', chat: currentChat }));
    historyLoaded.add(currentChat);
  };

  ws.onclose = () => {
    setStatus(false, 'Нет соединения, переподключение...');
    setTimeout(connectWs, 2000);
  };

  ws.onerror = () => {
    setStatus(false, 'Ошибка соединения');
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'presence') {
      onlineUsers = new Set(data.online.filter((u) => u !== myUsername));
      renderChatList();
      return;
    }

    if (data.type === 'history') {
      messagesByChat[data.chat] = data.messages;
      historyLoaded.add(data.chat);
      if (data.chat === currentChat) renderMessages();
      return;
    }

    if (data.type === 'message') {
      const chatId = data.chat;
      if (!messagesByChat[chatId]) messagesByChat[chatId] = [];
      messagesByChat[chatId].push(data.message);
      if (chatId === currentChat) renderMessages();
      return;
    }

    if (data.type === 'error') {
      console.error('Сервер:', data.message);
    }
  };
}

function setStatus(online, text) {
  statusDot.classList.toggle('online', online);
  statusText.textContent = text;
}

// --- отрисовка сообщений ---
function renderMessages() {
  messagesEl.innerHTML = '';
  const list = messagesByChat[currentChat] || [];

  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'msg-empty';
    empty.textContent = 'Сообщений пока нет';
    messagesEl.appendChild(empty);
    return;
  }

  for (const msg of list) {
    const el = document.createElement('div');
    el.className = 'msg' + (msg.from === myUsername ? ' own' : '');

    const meta = document.createElement('div');
    meta.className = 'msg-meta' + (msg.from === myUsername ? ' own' : '');
    const time = new Date(msg.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    meta.textContent = `${msg.from} · ${time}`;

    const text = document.createElement('div');
    text.className = 'msg-text';
    text.textContent = msg.text;

    el.appendChild(meta);
    el.appendChild(text);
    messagesEl.appendChild(el);
  }

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// --- отправка сообщений ---
sendForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;

  ws.send(JSON.stringify({ type: 'send', chat: currentChat, text }));
  messageInput.value = '';
});

tryAutoLogin();
