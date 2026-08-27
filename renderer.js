const LOBBY = 'lobby';

// --- фирменные эффекты ника ---
// У троих особых юзеров имя оформляется по-своему везде, где оно
// показывается другим: в списке чатов, в заголовке чата, под
// сообщениями. У всех остальных — обычный текст, без оформления.

const WAVE_USER = '_Defender13_';
const WAVE_LEFT_COLOR = '#f97316'; // оранжевый
const WAVE_RIGHT_COLOR = '#a855f7'; // фиолетовый

const GLACIO_USER = 'SKOkirill201';
const MERCURY_USER = 'CrazyPortaler';

function createWaveName(username) {
  if (username === WAVE_USER) {
    const span = document.createElement('span');
    span.className = 'wave-name';
    span.textContent = username;
    span.style.setProperty('--wave-left', WAVE_LEFT_COLOR);
    span.style.setProperty('--wave-right', WAVE_RIGHT_COLOR);
    return span;
  }

  if (username === GLACIO_USER) {
    const span = document.createElement('span');
    span.className = 'glacio-name';
    span.textContent = username;
    return span;
  }

  if (username === MERCURY_USER) {
    const span = document.createElement('span');
    span.className = 'mercury-name';
    span.textContent = username;
    return span;
  }

  return document.createTextNode(username);
}

// Иконка-кристалл для карточки "Гласио" в футере сайдбара
const GLACIO_ICON_SVG = `
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round">
    <line x1="12" y1="2" x2="12" y2="22"/>
    <line x1="4.2" y1="7" x2="19.8" y2="17"/>
    <line x1="4.2" y1="17" x2="19.8" y2="7"/>
    <circle cx="12" cy="12" r="2.2" fill="white" stroke="none"/>
  </svg>
`;

// Иконка блока магмы для карточки "Меркурий" (реальная текстура)
const MERCURY_ICON = { img: 'assets/magma-block.png' };

// Иконка "техномаг" для карточки _Defender13_ — гаечный ключ в стиле мода
// Create (тёмно-красная рукоять, серый механизм, золотистая ступенчатая
// голова) и волшебная палочка (фиолетовая, со светлым наконечником),
// скрещённые крест-накрест в пиксельном стиле.
const TECHNOMAGE_ICON_SVG = `
  <svg viewBox="0 0 32 32" width="30" height="30" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(-45 16 16)">
      <rect x="14" y="19" width="4" height="8" fill="#7a2020" stroke="#3d0f0f" stroke-width="0.4"/>
      <rect x="14" y="19" width="1.3" height="8" fill="#5c1414"/>
      <rect x="12.5" y="14.5" width="7" height="4.5" fill="#8a5a2e" stroke="#4a2e15" stroke-width="0.4"/>
      <rect x="14" y="11.5" width="4" height="3.5" fill="#6b6b6b" stroke="#333333" stroke-width="0.4"/>
      <rect x="14" y="11.5" width="1.5" height="3.5" fill="#8c8c8c"/>
      <rect x="11.5" y="8" width="9" height="4" fill="#b8860b" stroke="#6b4e08" stroke-width="0.4"/>
      <rect x="10" y="3.5" width="4.5" height="5" fill="#c9971a" stroke="#6b4e08" stroke-width="0.4"/>
      <rect x="17" y="3" width="4.5" height="5.5" fill="#d9a52a" stroke="#6b4e08" stroke-width="0.4"/>
      <rect x="18" y="3" width="1.3" height="5.5" fill="#f0c860"/>
    </g>
    <g transform="rotate(45 16 16)">
      <rect x="14.5" y="20.5" width="3" height="7" fill="#4a2a72" stroke="#2a1745" stroke-width="0.4"/>
      <rect x="14.1" y="17" width="3.6" height="3.6" fill="#6d3fa8" stroke="#3a2266" stroke-width="0.3"/>
      <rect x="14.9" y="13.5" width="3.6" height="3.6" fill="#8a5cc4" stroke="#4a2e80" stroke-width="0.3"/>
      <rect x="14.4" y="10.2" width="3.4" height="3.3" fill="#a97bd6" stroke="#5c3a94" stroke-width="0.3"/>
      <rect x="14.5" y="7" width="3.2" height="3.5" fill="#e6d9fb" stroke="#8a5cc4" stroke-width="0.3"/>
      <path d="M16 2.2 L16.9 3.8 L18.3 4.5 L16.9 5.2 L16 6.8 L15.1 5.2 L13.7 4.5 L15.1 3.8 Z" fill="#ffffff"/>
    </g>
  </svg>
`;

// Применяет тематическую карточку (иконка + подсвеченное имя) в футере
// сайдбара вместо обычного текста ника. iconContent — либо строка с
// готовым SVG-разметкой, либо { img: 'путь/к/файлу.png' } для картинки.
function applyFooterTheme(themeClass, iconContent, username, nameNode) {
  sidebarFooter.classList.add(themeClass);

  const icon = document.createElement('span');
  icon.className = `${themeClass}-icon`;
  if (typeof iconContent === 'string') {
    icon.innerHTML = iconContent;
  } else if (iconContent && iconContent.img) {
    const imgEl = document.createElement('img');
    imgEl.src = iconContent.img;
    imgEl.alt = '';
    icon.appendChild(imgEl);
  }

  const nameSpan = document.createElement('span');
  nameSpan.className = `${themeClass}-name`;
  nameSpan.appendChild(nameNode || document.createTextNode(username));

  meUsername.appendChild(icon);
  meUsername.appendChild(nameSpan);
}

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
const sidebarFooter = document.getElementById('sidebar-footer');
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
  meUsername.innerHTML = '';

  if (myUsername === GLACIO_USER) {
    applyFooterTheme('footer-glacio', GLACIO_ICON_SVG, myUsername);
  } else if (myUsername === MERCURY_USER) {
    applyFooterTheme('footer-mercury', MERCURY_ICON, myUsername);
  } else if (myUsername === WAVE_USER) {
    applyFooterTheme('footer-technomage', TECHNOMAGE_ICON_SVG, myUsername, createWaveName(myUsername));
  } else {
    meUsername.appendChild(createWaveName(myUsername));
  }

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

  const badge = showPresence ? createChatItemBadge(chatId) : null;

  if (badge) {
    btn.appendChild(badge);
  } else {
    if (showPresence) {
      const dot = document.createElement('span');
      dot.className = 'chat-item-dot' + (onlineUsers.has(chatId) ? ' online' : '');
      btn.appendChild(dot);
    }

    const name = document.createElement('span');
    name.className = 'chat-item-name';
    if (showPresence) {
      name.appendChild(createWaveName(label));
    } else {
      name.textContent = label;
    }
    btn.appendChild(name);
  }

  btn.addEventListener('click', () => switchChat(chatId, label));
  return btn;
}

// Компактный бейдж (иконка + имя) для списка чатов — мини-версия карточки
// из футера, но не на всю строку. Возвращает null для обычных юзеров.
// У кастомных юзеров нет кружка статуса — вместо этого их иконка тускнеет,
// когда они не в сети.
function createChatItemBadge(username) {
  let themeClass = null;
  let iconContent = null;
  let plainWhiteName = false; // Гласио/Меркурий: имя белым, т.к. фон бейджа уже цветной

  if (username === WAVE_USER) {
    themeClass = 'badge-technomage';
    iconContent = TECHNOMAGE_ICON_SVG;
  } else if (username === GLACIO_USER) {
    themeClass = 'badge-glacio';
    iconContent = GLACIO_ICON_SVG;
    plainWhiteName = true;
  } else if (username === MERCURY_USER) {
    themeClass = 'badge-mercury';
    iconContent = MERCURY_ICON;
    plainWhiteName = true;
  }

  if (!themeClass) return null;

  const online = onlineUsers.has(username);

  const badge = document.createElement('span');
  badge.className = `chat-item-badge ${themeClass}`;

  const icon = document.createElement('span');
  icon.className = `${themeClass}-icon` + (online ? '' : ' badge-icon-offline');
  if (typeof iconContent === 'string') {
    icon.innerHTML = iconContent;
  } else if (iconContent && iconContent.img) {
    const imgEl = document.createElement('img');
    imgEl.src = iconContent.img;
    imgEl.alt = '';
    icon.appendChild(imgEl);
  }

  const nameSpan = document.createElement('span');
  nameSpan.className = `${themeClass}-name`;
  if (plainWhiteName) {
    nameSpan.textContent = username;
  } else {
    nameSpan.appendChild(createWaveName(username));
  }

  badge.appendChild(icon);
  badge.appendChild(nameSpan);
  return badge;
}

function switchChat(chatId, label) {
  currentChat = chatId;
  currentChatTitle.innerHTML = '';
  if (chatId === LOBBY) {
    currentChatTitle.textContent = label;
  } else {
    currentChatTitle.appendChild(createWaveName(label));
  }
  renderChatList();
  renderMessages();

  if (!historyLoaded.has(chatId) && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'history', chat: chatId }));
  }
}

// --- WebSocket ---
function connectWs() {
  setStatus(false, 'подключение...');
  ws = new WebSocket(`${serverWs}/ws?token=${encodeURIComponent(token)}`);

  ws.onopen = () => {
    setStatus(true, 'онлайн');
    ws.send(JSON.stringify({ type: 'history', chat: currentChat }));
    historyLoaded.add(currentChat);
  };

  ws.onclose = () => {
    setStatus(false, 'нет соединения, переподключение...');
    setTimeout(connectWs, 2000);
  };

  ws.onerror = () => {
    setStatus(false, 'ошибка соединения');
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
// Заголовок сообщения. У кастомных юзеров — полоска сверху (как бейдж
// в списке ЛС: иконка + имя + время). У обычных — прежний плоский текст.
function buildMessageHeader(username, ts) {
  const time = new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  let themeClass = null;
  let iconContent = null;
  let plainWhiteName = false;

  if (username === WAVE_USER) {
    themeClass = 'badge-technomage';
    iconContent = TECHNOMAGE_ICON_SVG;
  } else if (username === GLACIO_USER) {
    themeClass = 'badge-glacio';
    iconContent = GLACIO_ICON_SVG;
    plainWhiteName = true;
  } else if (username === MERCURY_USER) {
    themeClass = 'badge-mercury';
    iconContent = MERCURY_ICON;
    plainWhiteName = true;
  }

  if (!themeClass) {
    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    meta.appendChild(createWaveName(username));
    meta.appendChild(document.createTextNode(` · ${time}`));
    return meta;
  }

  const strip = document.createElement('div');
  strip.className = `msg-strip ${themeClass}`;

  const icon = document.createElement('span');
  icon.className = `${themeClass}-icon`;
  if (typeof iconContent === 'string') {
    icon.innerHTML = iconContent;
  } else if (iconContent && iconContent.img) {
    const imgEl = document.createElement('img');
    imgEl.src = iconContent.img;
    imgEl.alt = '';
    icon.appendChild(imgEl);
  }

  const nameSpan = document.createElement('span');
  nameSpan.className = `${themeClass}-name`;
  if (plainWhiteName) {
    nameSpan.textContent = username;
  } else {
    nameSpan.appendChild(createWaveName(username));
  }

  const timeSpan = document.createElement('span');
  timeSpan.className = 'msg-strip-time';
  timeSpan.textContent = time;

  strip.appendChild(icon);
  strip.appendChild(nameSpan);
  strip.appendChild(timeSpan);
  return strip;
}

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

  list.forEach((msg) => {
    const el = document.createElement('div');
    el.className = 'msg' + (msg.from === myUsername ? ' own' : '');

    el.appendChild(buildMessageHeader(msg.from, msg.ts));

    const body = document.createElement('div');
    body.className = 'msg-body';
    const text = document.createElement('div');
    text.className = 'msg-text';
    text.textContent = msg.text;
    body.appendChild(text);
    el.appendChild(body);

    messagesEl.appendChild(el);
  });

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
