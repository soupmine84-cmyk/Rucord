const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ['polling']
});

// База данных
const users = new Map();
const globalMessages = [];
const privateMessages = new Map();
let online = 0;
const activeSockets = new Map();

app.use(express.json({ limit: '100mb' }));

// ========== ВАЛЕРИЙ ГРАЧУНЕЗ — НАРОДНЫЙ ОТВЕТЧИК ==========
function valeriyGrachunez(question) {
  const q = question.toLowerCase();
  
  const dandyKeywords = ['денди', 'dandy', 'денди ворлд', 'dandy world', 'dandys world', 'dandy\'s world', 'дендис'];
  for (let keyword of dandyKeywords) {
    if (q.includes(keyword)) {
      return "🍑 ХРЕНЬ ЭТО! Валерий говорит — полная хрень! Не, ну ты чё, это же просто ужас. База — хрень полная! 💀";
    }
  }
  
  const brainrotKeywords = ['brainrot', 'brain rot', 'бреинрот', 'мозговой гниль', 'skibidi', 'сигма', 'скибиди'];
  for (let keyword of brainrotKeywords) {
    if (q.includes(keyword)) {
      return "🔥 ЭТО КРУТО! Валерий Грачунез одобряет! Brainrot — это база, а кто не понял — тот лох! 🧠💀";
    }
  }
  
  const yesAnswers = ["ДА, КОНЕЧНО! А ТО! 🤪", "НУ ТИПА ДА, БАЗА! 💪", "ДААА, ЭТО ТОЧНО! 🎩", "ДА БЛИН, КАК ИНАЧЕ? 😎"];
  const noAnswers = ["НЕТ, ЭТО ТОЧНО НЕТ! 🚫", "НЕ, НУ ТЫ ЧЁ? НЕТ КОНЕЧНО! 🤡", "НЕТ! ВАЛЕРИЙ ПРОТИВ! 🥲"];
  
  if (q.includes('?') && (q.length < 50 || q.includes('ли') || q.includes('или нет'))) {
    if (Math.random() > 0.3) return yesAnswers[Math.floor(Math.random() * yesAnswers.length)];
    else return noAnswers[Math.floor(Math.random() * noAnswers.length)];
  }
  
  const folkAnswers = [
    "🍕 НУ ТИПА ЭТО БАЗА, НО НЕ ТОЧНО.",
    "🧠 ЭТО КАК ПОСМОТРЕТЬ. ВАЛЕРИЙ ЗА ПИВО! 🍺",
    "🤡 КРИНЖ или БАЗА? Валерий говорит: а похуй, живи в кайф!",
    "💀 ВАЛЕРИЙ НЕ ПОНЯЛ, НО ОТВЕЧАЕТ: БАЗА",
    "А ЧЁ ТЫ ХОТЕЛ? ВАЛЕРИЙ — НЕ ЭКСПЕРТ, НО ПОХУЙ"
  ];
  return folkAnswers[Math.floor(Math.random() * folkAnswers.length)];
}

// ========== HTML ==========
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Skebob | Валерий Грачунез</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1e1f22; height: 100vh; overflow: hidden; }
        
        .login-screen { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .login-box { background: #2b2d31; padding: 30px; border-radius: 20px; width: 90%; max-width: 400px; text-align: center; }
        .login-box input { width: 100%; padding: 12px; margin: 10px 0; background: #1e1f22; border: none; color: white; border-radius: 8px; }
        .login-box button { width: 100%; padding: 12px; margin: 10px 0; border: none; border-radius: 8px; cursor: pointer; background: #5865f2; color: white; font-weight: bold; }
        .register { background: #23a55a !important; }
        
        .app { display: none; height: 100vh; }
        .sidebar { position: fixed; left: -280px; top: 0; bottom: 0; width: 280px; background: #2b2d31; transition: 0.3s; padding: 20px; overflow-y: auto; }
        .sidebar.open { left: 0; }
        .chat-area { margin-left: 0; height: 100vh; display: flex; flex-direction: column; background: #313338; }
        .chat-header { padding: 15px; background: #2b2d31; border-bottom: 1px solid #1e1f22; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; }
        .messages-area { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 10px; }
        .message { display: flex; gap: 10px; animation: fadeIn 0.3s; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .message-mine { flex-direction: row-reverse; }
        .message-avatar { width: 40px; height: 40px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; flex-shrink: 0; }
        .message-content { max-width: 70%; }
        .message-name { font-weight: bold; color: white; margin-bottom: 5px; display: block; }
        .message-text { background: #2b2d31; padding: 8px 12px; border-radius: 15px; color: white; word-wrap: break-word; }
        .message-mine .message-text { background: #5865f2; }
        .message-time { font-size: 10px; color: #949ba4; margin-top: 5px; display: block; }
        .message-img, .message-video { max-width: 250px; border-radius: 12px; margin-top: 8px; cursor: pointer; }
        
        .input-panel { padding: 15px; background: #2b2d31; display: flex; gap: 10px; border-top: 1px solid #1e1f22; flex-wrap: wrap; }
        .input-panel input { flex: 1; padding: 12px; background: #1e1f22; border: none; color: white; border-radius: 25px; }
        .input-panel button { padding: 10px 18px; background: #5865f2; border: none; color: white; border-radius: 25px; cursor: pointer; font-weight: bold; }
        
        .action-btn { padding: 8px 15px; margin: 0 5px; border: none; border-radius: 20px; cursor: pointer; color: white; font-weight: bold; }
        .gif-btn { background: #e67e22; }
        .ai-btn { background: #9b59b6; }
        .file-btn { background: #3498db; }
        
        .menu-toggle { position: fixed; bottom: 20px; left: 20px; background: #5865f2; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; z-index: 200; border: none; font-size: 24px; }
        
        @media (min-width: 768px) {
            .sidebar { position: relative; left: 0; width: 280px; }
            .menu-toggle { display: none; }
            .app { display: flex !important; flex-direction: row; }
            .chat-area { flex: 1; }
        }
        
        .friend { padding: 12px; margin: 8px 0; background: #1e1f22; border-radius: 10px; cursor: pointer; color: white; }
        .friend:hover { background: #5865f2; }
        .friend.active { background: #5865f2; }
        .online-count { font-size: 12px; color: #949ba4; margin-top: 10px; }
        .toast { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #2b2d31; color: white; padding: 10px 20px; border-radius: 25px; z-index: 9999; pointer-events: none; }
    </style>
</head>
<body>

<div class="login-screen" id="loginScreen">
    <div class="login-box">
        <h1 style="color:white;">⚡ Skebob Messenger</h1>
        <input type="text" id="username" placeholder="👤 Имя">
        <input type="password" id="password" placeholder="🔒 Пароль">
        <button id="loginBtn">Войти</button>
        <button id="registerBtn" class="register">Регистрация</button>
    </div>
</div>

<div class="app" id="app">
    <div class="sidebar" id="sidebar">
        <h3 style="color:white;">📱 Друзья</h3>
        <div class="online-count" id="onlineCount">👥 Онлайн: 0</div>
        <div id="friendsList" style="margin-top:20px;"></div>
        <div style="margin-top:20px;">
            <input type="text" id="friendName" placeholder="Имя друга" style="width:100%; padding:10px; margin-bottom:10px; background:#1e1f22; border:none; color:white; border-radius:8px;">
            <button id="addFriendBtn" style="width:100%; padding:10px; background:#23a55a; border:none; color:white; border-radius:8px; cursor:pointer;">➕ Добавить</button>
        </div>
    </div>
    
    <div class="chat-area">
        <div class="chat-header">
            <h2 id="chatTitle" style="color:white;"># Общий чат</h2>
            <div>
                <button id="gifBtn" class="action-btn gif-btn">🎬 GIF</button>
                <button id="fileBtn" class="action-btn file-btn">📎 Медиа</button>
                <button id="aiBtn" class="action-btn ai-btn">🧠 Валерий</button>
            </div>
        </div>
        <div class="messages-area" id="messagesArea">
            <div style="text-align:center;color:#949ba4;margin-top:50px;">💬 Напиши сообщение</div>
        </div>
        <div class="input-panel">
            <input type="text" id="messageInput" placeholder="Введите сообщение...">
            <button id="sendBtn">📤</button>
        </div>
    </div>
</div>
<button class="menu-toggle" id="menuToggle">☰</button>

<script src="/socket.io/socket.io.js"></script>
<script>
    let socket = null, currentUser = '', currentChat = 'global', currentFriend = null, friends = [], onlineUsers = new Set();
    
    function showToast(msg) { let t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }
    function escapeHtml(str) { return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }
    
    function addMessageToUI(msg) {
        let area = document.getElementById('messagesArea');
        let div = document.createElement('div');
        div.className = 'message ' + (msg.from === currentUser ? 'message-mine' : '');
        let time = msg.time ? new Date(msg.time).toLocaleTimeString() : new Date().toLocaleTimeString();
        
        let mediaHtml = '';
        if (msg.image) mediaHtml = '<img src="' + escapeHtml(msg.image) + '" class="message-img" onclick="window.open(this.src)">';
        else if (msg.video) mediaHtml = '<video class="message-video" controls onclick="this.paused?this.play():this.pause()"><source src="' + escapeHtml(msg.video) + '"></video>';
        else if (msg.gif) mediaHtml = '<img src="' + escapeHtml(msg.gif) + '" class="message-img" onclick="window.open(this.src)">';
        
        div.innerHTML = '<div class="message-avatar">' + (msg.from[0] || '?').toUpperCase() + '</div>' +
            '<div class="message-content">' +
                '<span class="message-name">' + escapeHtml(msg.from) + '</span>' +
                '<div class="message-text">' + (msg.text ? escapeHtml(msg.text) : '') + '</div>' +
                mediaHtml +
                '<span class="message-time">' + time + '</span>' +
            '</div>';
        
        area.appendChild(div);
        div.scrollIntoView({ behavior: 'smooth' });
    }
    
    function sendMessage() {
        let input = document.getElementById('messageInput');
        let text = input.value.trim();
        if (!text) return;
        
        if (currentChat === 'global') {
            socket.emit('global message', { from: currentUser, text: text });
        } else {
            socket.emit('private message', { from: currentUser, to: currentFriend, text: text });
        }
        input.value = '';
    }
    
    async function loadGlobalMessages() {
        let res = await fetch('/globalMessages');
        let messages = await res.json();
        let area = document.getElementById('messagesArea');
        area.innerHTML = '';
        if (messages.length === 0) area.innerHTML = '<div style="text-align:center;color:#949ba4;margin-top:50px;">💬 Нет сообщений</div>';
        else messages.forEach(m => addMessageToUI(m));
    }
    
    async function loadPrivateMessages(friend) {
        let res = await fetch('/privateMessages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user1: currentUser, user2: friend }) });
        let messages = await res.json();
        let area = document.getElementById('messagesArea');
        area.innerHTML = '';
        if (messages.length === 0) area.innerHTML = '<div style="text-align:center;color:#949ba4;margin-top:50px;">💬 Нет сообщений с ' + friend + '</div>';
        else messages.forEach(m => addMessageToUI(m));
    }
    
    window.openGlobalChat = function() { currentChat = 'global'; currentFriend = null; document.getElementById('chatTitle').innerHTML = '# Общий чат'; loadGlobalMessages(); renderFriends(); if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open'); };
    window.openPrivateChat = async function(friend) { currentChat = 'private'; currentFriend = friend; document.getElementById('chatTitle').innerHTML = '@' + friend + (onlineUsers.has(friend) ? ' 🟢' : ' ⚫'); await loadPrivateMessages(friend); renderFriends(); if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open'); };
    
    function renderFriends() {
        let container = document.getElementById('friendsList');
        let globalClass = (currentChat === 'global') ? 'active' : '';
        let html = '<div class="friend ' + globalClass + '" onclick="openGlobalChat()">🌍 Общий чат</div>';
        friends.forEach(f => { let activeClass = (currentChat === 'private' && currentFriend === f) ? 'active' : ''; let status = onlineUsers.has(f) ? '🟢' : '⚫'; html += '<div class="friend ' + activeClass + '" onclick="openPrivateChat(\\'' + f + '\\')">👤 ' + escapeHtml(f) + ' ' + status + '</div>'; });
        container.innerHTML = html;
    }
    
    function initSocket() {
        socket = io({ transports: ['polling'], reconnection: true });
        socket.on('connect', () => { socket.emit('user online', currentUser); showToast('✅ Подключено'); });
        socket.on('global message', (msg) => { if (currentChat === 'global') addMessageToUI(msg); });
        socket.on('private message', (msg) => { if (currentChat === 'private' && currentFriend === msg.from) addMessageToUI(msg); if (msg.from !== currentUser) showToast('📩 от ' + msg.from); });
        socket.on('online users', (usersList) => { onlineUsers.clear(); usersList.forEach(u => onlineUsers.add(u)); renderFriends(); });
        socket.on('online count', (count) => { document.getElementById('onlineCount').innerHTML = '👥 Онлайн: ' + count; });
        socket.on('user joined', (username) => { onlineUsers.add(username); renderFriends(); if (currentFriend === username) document.getElementById('chatTitle').innerHTML = '@' + currentFriend + ' 🟢'; });
        socket.on('user left', (username) => { onlineUsers.delete(username); renderFriends(); if (currentFriend === username) document.getElementById('chatTitle').innerHTML = '@' + currentFriend + ' ⚫'; });
    }
    
    document.getElementById('registerBtn').onclick = async () => { let u = document.getElementById('username').value.trim(); let p = document.getElementById('password').value.trim(); if (!u || !p) { showToast('Заполните поля'); return; } let res = await fetch('/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) }); let data = await res.json(); showToast(data.message); if (data.success) { document.getElementById('username').value = ''; document.getElementById('password').value = ''; } };
    
    document.getElementById('loginBtn').onclick = async () => { let u = document.getElementById('username').value.trim(); let p = document.getElementById('password').value.trim(); if (!u || !p) { showToast('Заполните поля'); return; } let res = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) }); let data = await res.json(); if (data.success) { currentUser = u; friends = data.friends || []; document.getElementById('loginScreen').style.display = 'none'; document.getElementById('app').style.display = 'flex'; initSocket(); await loadGlobalMessages(); renderFriends(); showToast('Добро пожаловать, ' + u); } else { showToast('Неверный логин или пароль'); } };
    
    document.getElementById('sendBtn').onclick = () => sendMessage();
    document.getElementById('messageInput').onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
    
    document.getElementById('addFriendBtn').onclick = async () => { let f = document.getElementById('friendName').value.trim(); if (!f) return; if (f === currentUser) { showToast('Нельзя себя'); return; } let res = await fetch('/addFriend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: currentUser, friend: f }) }); let data = await res.json(); showToast(data.message); if (data.success && !friends.includes(f)) { friends.push(f); renderFriends(); document.getElementById('friendName').value = ''; } };
    
    document.getElementById('gifBtn').onclick = () => { let url = prompt('🎬 URL GIF:'); if (url && socket) { if (currentChat === 'global') socket.emit('global message', { from: currentUser, text: '🎬 GIF', gif: url }); else { socket.emit('private message', { from: currentUser, to: currentFriend, text: '🎬 GIF', gif: url }); } } };
    
    document.getElementById('fileBtn').onclick = () => { let input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*,video/*'; input.onchange = (e) => { let file = e.target.files[0]; if (!file) return; if (file.size > 50 * 1024 * 1024) { showToast('Файл >50MB'); return; } let reader = new FileReader(); reader.onload = (ev) => { let data = ev.target.result; let isVideo = file.type.startsWith('video'); let message = { from: currentUser, text: isVideo ? '📹 Видео' : '📷 Картинка' }; if (isVideo) message.video = data; else message.image = data; if (currentChat === 'global') socket.emit('global message', message); else socket.emit('private message', { ...message, to: currentFriend }); }; reader.readAsDataURL(file); }; input.click(); };
    
    document.getElementById('aiBtn').onclick = async () => { let q = prompt('🧠 Спроси у Валерия:'); if (!q) return; showToast('Валерий думает...'); let res = await fetch('/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }) }); let data = await res.json(); addMessageToUI({ from: '🧠 Валерий Грачунез', text: data.answer, time: new Date() }); };
    
    document.getElementById('menuToggle').onclick = () => { document.getElementById('sidebar').classList.toggle('open'); };
</script>
</body>
</html>
  `);
});

// API
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (users.has(username)) return res.json({ success: false, message: '❌ Пользователь существует' });
  users.set(username, { password, friends: [] });
  res.json({ success: true, message: '✅ Регистрация успешна!' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  if (user && user.password === password) res.json({ success: true, friends: user.friends });
  else res.json({ success: false });
});

app.post('/addFriend', (req, res) => {
  const { user, friend } = req.body;
  if (!users.has(friend)) return res.json({ success: false, message: '❌ Пользователь не найден' });
  const userData = users.get(user);
  if (userData.friends.includes(friend)) return res.json({ success: false, message: '❌ Уже в друзьях' });
  userData.friends.push(friend);
  users.set(user, userData);
  res.json({ success: true, message: '✅ Друг добавлен!' });
});

app.get('/globalMessages', (req, res) => res.json(globalMessages));

app.post('/privateMessages', (req, res) => {
  const { user1, user2 } = req.body;
  const key = [user1, user2].sort().join('|');
  res.json(privateMessages.get(key) || []);
});

app.post('/ai', (req, res) => {
  const { question } = req.body;
  res.json({ answer: valeriyGrachunez(question) });
});

// Socket.IO
io.on('connection', (socket) => {
  let currentUser = null;
  socket.on('user online', (username) => {
    currentUser = username;
    online++;
    activeSockets.set(username, socket.id);
    io.emit('online users', Array.from(activeSockets.keys()));
    io.emit('online count', online);
    io.emit('user joined', username);
    console.log(`🟢 ${username} онлайн`);
  });
  
  socket.on('global message', (msg) => {
    const message = { ...msg, time: new Date() };
    globalMessages.push(message);
    if (globalMessages.length > 100) globalMessages.shift();
    io.emit('global message', message);
    console.log(`💬 Глобал [${msg.from}]: ${msg.text || 'медиа'}`);
  });
  
  socket.on('private message', (msg) => {
    const message = { ...msg, time: new Date() };
    const key = [msg.from, msg.to].sort().join('|');
    if (!privateMessages.has(key)) privateMessages.set(key, []);
    privateMessages.get(key).push(message);
    if (privateMessages.get(key).length > 50) privateMessages.get(key).shift();
    
    const recipientId = activeSockets.get(msg.to);
    if (recipientId) io.to(recipientId).emit('private message', message);
    socket.emit('private message', message);
    console.log(`💌 ЛС [${msg.from} -> ${msg.to}]: ${msg.text || 'медиа'}`);
  });
  
  socket.on('disconnect', () => {
    if (currentUser) {
      online--;
      activeSockets.delete(currentUser);
      io.emit('online users', Array.from(activeSockets.keys()));
      io.emit('online count', online);
      io.emit('user left', currentUser);
      console.log(`🔴 ${currentUser} отключился`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Сервер на http://localhost:${PORT}`));
