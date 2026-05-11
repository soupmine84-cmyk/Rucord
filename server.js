const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// База данных
const users = new Map(); // username -> { password, friends }
const privateMessages = new Map(); // 'user1|user2' -> []
let onlineUsers = new Set();

app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Skebob Messenger</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1e1f22; height: 100vh; overflow: hidden; }
        
        /* Экран входа */
        .login-screen { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #1e1f22; display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .login-box { background: #2b2d31; padding: 40px; border-radius: 16px; width: 350px; text-align: center; }
        .login-box h1 { color: white; margin-bottom: 20px; }
        .login-box input { width: 100%; padding: 12px; margin: 8px 0; background: #1e1f22; border: none; color: white; border-radius: 8px; }
        .login-box button { width: 100%; padding: 12px; margin: 8px 0; border: none; border-radius: 8px; cursor: pointer; background: #5865f2; color: white; font-size: 16px; }
        .login-box .register { background: #23a55a; }
        
        /* Основной чат */
        .app { display: none; height: 100vh; display: flex; }
        
        /* Боковая панель */
        .sidebar { width: 280px; background: #2b2d31; display: flex; flex-direction: column; }
        .sidebar-header { padding: 20px; border-bottom: 1px solid #1e1f22; }
        .sidebar-header h3 { color: white; }
        .online-count { font-size: 12px; color: #949ba4; margin-top: 5px; }
        .friends-list { flex: 1; overflow-y: auto; padding: 10px; }
        .friend { padding: 12px; border-radius: 8px; cursor: pointer; color: #dbdee1; display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
        .friend:hover { background: #3a3c43; }
        .friend.active { background: #3a3c43; }
        .friend-avatar { width: 40px; height: 40px; background: #5865f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .friend-info { flex: 1; }
        .friend-name { font-weight: 500; }
        .friend-status { font-size: 11px; color: #949ba4; }
        
        .add-friend { padding: 16px; border-top: 1px solid #1e1f22; display: flex; gap: 8px; }
        .add-friend input { flex: 1; padding: 10px; background: #1e1f22; border: none; color: white; border-radius: 8px; }
        .add-friend button { padding: 10px 16px; background: #23a55a; border: none; border-radius: 8px; color: white; cursor: pointer; }
        
        /* Область чата */
        .chat-area { flex: 1; display: flex; flex-direction: column; background: #313338; }
        .chat-header { padding: 16px 20px; background: #2b2d31; border-bottom: 1px solid #1e1f22; display: flex; justify-content: space-between; align-items: center; }
        .chat-header h2 { color: white; font-size: 16px; }
        .action-buttons { display: flex; gap: 8px; }
        .action-btn { padding: 6px 12px; border-radius: 8px; border: none; cursor: pointer; color: white; }
        .gif-btn { background: #e67e22; }
        .ai-btn { background: #9b59b6; }
        .call-btn { background: #2ecc71; }
        
        .messages-area { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 16px; }
        .message { display: flex; gap: 12px; }
        .message-mine { flex-direction: row-reverse; }
        .message-avatar { width: 40px; height: 40px; background: #5865f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .message-content { max-width: 70%; }
        .message-header { display: flex; gap: 8px; align-items: baseline; margin-bottom: 4px; }
        .message-name { color: white; font-size: 14px; font-weight: 500; }
        .message-time { color: #949ba4; font-size: 11px; }
        .message-text { background: #2b2d31; padding: 8px 12px; border-radius: 16px; color: white; word-wrap: break-word; }
        .message-mine .message-text { background: #5865f2; }
        .message-img { max-width: 200px; border-radius: 12px; margin-top: 6px; }
        
        .input-panel { padding: 16px; background: #2b2d31; display: flex; gap: 12px; border-top: 1px solid #1e1f22; }
        .input-panel input { flex: 1; padding: 12px; background: #1e1f22; border: none; border-radius: 24px; color: white; }
        .input-panel button { padding: 8px 20px; background: #5865f2; border: none; border-radius: 24px; color: white; cursor: pointer; }
        
        .gif-modal { display: none; position: fixed; bottom: 100px; right: 20px; background: #2b2d31; padding: 12px; border-radius: 12px; width: 300px; flex-wrap: wrap; gap: 8px; max-height: 350px; overflow-y: auto; z-index: 1000; }
        .gif-modal img { width: 85px; height: 85px; object-fit: cover; border-radius: 8px; cursor: pointer; }
        
        @media (max-width: 768px) {
            .sidebar { position: fixed; left: -280px; top: 0; bottom: 0; z-index: 100; transition: 0.3s; }
            .sidebar.open { left: 0; }
            .menu-toggle { display: block; position: fixed; bottom: 20px; left: 20px; z-index: 101; background: #5865f2; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; border: none; }
        }
        @media (min-width: 769px) { .menu-toggle { display: none; } }
        
        .menu-toggle { position: fixed; bottom: 20px; left: 20px; z-index: 101; background: #5865f2; width: 50px; height: 50px; border-radius: 50%; display: none; align-items: center; justify-content: center; color: white; cursor: pointer; border: none; font-size: 24px; }
    </style>
</head>
<body>

<button class="menu-toggle" id="menuToggle">☰</button>

<div id="loginScreen" class="login-screen">
    <div class="login-box">
        <h1>💬 Skebob Messenger</h1>
        <input type="text" id="loginName" placeholder="Имя пользователя">
        <input type="password" id="loginPass" placeholder="Пароль">
        <button id="loginBtn">Войти</button>
        <button id="registerBtn" class="register">Регистрация</button>
    </div>
</div>

<div id="app" class="app">
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <h3>Skebob</h3>
            <div class="online-count" id="onlineCount">👥 Онлайн: 0</div>
        </div>
        <div class="friends-list" id="friendsList"></div>
        <div class="add-friend">
            <input type="text" id="newFriend" placeholder="Имя друга">
            <button id="addFriendBtn">➕ Добавить</button>
        </div>
    </div>
    
    <div class="chat-area">
        <div class="chat-header">
            <h2 id="chatTitle"># Общий чат</h2>
            <div class="action-buttons">
                <button id="gifBtn" class="action-btn gif-btn">🎬 GIF</button>
                <button id="callBtn" class="action-btn call-btn">📞 Звонок</button>
                <button id="aiBtn" class="action-btn ai-btn">🤖 ИИ</button>
            </div>
        </div>
        <div id="messagesArea" class="messages-area"></div>
        <div class="input-panel">
            <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
            <button id="fileBtn">📎</button>
            <button onclick="sendMessage()">💬</button>
        </div>
    </div>
</div>

<div id="gifModal" class="gif-modal"></div>
<input type="file" id="imageInput" style="display:none">

<script src="/socket.io/socket.io.js"></script>
<script>
    let socket;
    let currentUser = '';
    let currentChat = { type: 'global', name: 'Общий чат' };
    let friends = [];
    
    // Регистрация
    document.getElementById('registerBtn').onclick = async () => {
        const username = document.getElementById('loginName').value;
        const password = document.getElementById('loginPass').value;
        if (!username || !password) { alert('Заполните поля'); return; }
        const res = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        alert(data.message);
    };
    
    // Вход
    document.getElementById('loginBtn').onclick = async () => {
        const username = document.getElementById('loginName').value;
        const password = document.getElementById('loginPass').value;
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            currentUser = username;
            friends = data.friends || [];
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('app').style.display = 'flex';
            
            socket = io();
            socket.emit('user online', currentUser);
            
            socket.on('online count', (count) => {
                document.getElementById('onlineCount').innerHTML = '👥 Онлайн: ' + count;
            });
            
            socket.on('global message', (msg) => {
                if (currentChat.type === 'global') addMessage(msg);
            });
            
            socket.on('private message', (msg) => {
                if (currentChat.type === 'private' && currentChat.name === msg.from) {
                    addMessage(msg);
                }
            });
            
            renderFriends();
            loadGlobalMessages();
        } else {
            alert('Ошибка входа');
        }
    };
    
    function renderFriends() {
        const container = document.getElementById('friendsList');
        container.innerHTML = '<div class="friend ' + (currentChat.type === 'global' ? 'active' : '') + '" onclick="openGlobalChat()"><div class="friend-avatar">🌍</div><div class="friend-info"><div class="friend-name">Общий чат</div><div class="friend-status">Все пользователи</div></div></div>';
        friends.forEach(f => {
            const div = document.createElement('div');
            div.className = 'friend ' + (currentChat.type === 'private' && currentChat.name === f ? 'active' : '');
            div.innerHTML = '<div class="friend-avatar">👤</div><div class="friend-info"><div class="friend-name">' + f + '</div><div class="friend-status">Онлайн</div></div>';
            div.onclick = () => openPrivateChat(f);
            container.appendChild(div);
        });
    }
    
    function openGlobalChat() {
        currentChat = { type: 'global', name: 'Общий чат' };
        document.getElementById('chatTitle').innerHTML = '# Общий чат';
        renderFriends();
        loadGlobalMessages();
        if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
    }
    
    async function openPrivateChat(friend) {
        currentChat = { type: 'private', name: friend };
        document.getElementById('chatTitle').innerHTML = '@' + friend;
        renderFriends();
        
        const res = await fetch('/privateMessages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user1: currentUser, user2: friend })
        });
        const messages = await res.json();
        const area = document.getElementById('messagesArea');
        area.innerHTML = '';
        messages.forEach(m => addMessage(m));
        if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
    }
    
    async function loadGlobalMessages() {
        const res = await fetch('/globalMessages');
        const messages = await res.json();
        const area = document.getElementById('messagesArea');
        area.innerHTML = '';
        messages.forEach(m => addMessage(m));
    }
    
    function addMessage(msg) {
        const area = document.getElementById('messagesArea');
        const div = document.createElement('div');
        div.className = 'message ' + (msg.from === currentUser ? 'message-mine' : '');
        const time = new Date(msg.time).toLocaleTimeString();
        div.innerHTML = '<div class="message-avatar">' + (msg.from[0] || '?') + '</div>' +
            '<div class="message-content">' +
            '<div class="message-header">' +
            '<span class="message-name">' + escapeHtml(msg.from) + '</span>' +
            '<span class="message-time">' + time + '</span>' +
            '</div>' +
            '<div class="message-text">' + escapeHtml(msg.text) + '</div>' +
            (msg.gif ? '<img class="message-img" src="' + msg.gif + '">' : '') +
            (msg.image ? '<img class="message-img" src="' + msg.image + '">' : '') +
            '</div>';
        area.appendChild(div);
        div.scrollIntoView({ behavior: 'smooth' });
    }
    
    function sendMessage() {
        const input = document.getElementById('messageInput');
        if (!input.value.trim()) return;
        
        if (currentChat.type === 'global') {
            socket.emit('global message', { from: currentUser, text: input.value });
        } else {
            socket.emit('private message', { from: currentUser, to: currentChat.name, text: input.value });
        }
        input.value = '';
    }
    
    // Добавление друга
    document.getElementById('addFriendBtn').onclick = async () => {
        const friend = document.getElementById('newFriend').value;
        if (!friend) return;
        const res = await fetch('/addFriend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: currentUser, friend: friend })
        });
        const data = await res.json();
        if (data.success) {
            friends.push(friend);
            renderFriends();
            document.getElementById('newFriend').value = '';
        } else {
            alert(data.message);
        }
    };
    
    // GIF
    document.getElementById('gifBtn').onclick = async () => {
        const modal = document.getElementById('gifModal');
        if (modal.style.display === 'flex') { modal.style.display = 'none'; return; }
        modal.style.display = 'flex';
        try {
            const res = await fetch('https://tenor.googleapis.com/v2/search?q=funny&key=AIzaSyC-9oUqY5G1m-Sxulx8QJqzvqQm3XqXJpE&limit=12');
            const data = await res.json();
            modal.innerHTML = '';
            (data.results || []).forEach(gif => {
                const img = document.createElement('img');
                img.src = gif.media_formats.gif.url;
                img.onclick = () => {
                    if (currentChat.type === 'global') {
                        socket.emit('global message', { from: currentUser, text: '🎬 GIF', gif: img.src });
                    } else {
                        socket.emit('private message', { from: currentUser, to: currentChat.name, text: '🎬 GIF', gif: img.src });
                    }
                    modal.style.display = 'none';
                };
                modal.appendChild(img);
            });
        } catch(e) { modal.innerHTML = 'Ошибка загрузки GIF'; }
    };
    
    // ИИ
    document.getElementById('aiBtn').onclick = async () => {
        const question = prompt('🤖 Спроси у ИИ-помощника:');
        if (!question) return;
        const res = await fetch('/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: question })
        });
        const data = await res.json();
        addMessage({ from: '🤖 ИИ', text: data.answer, time: new Date() });
    };
    
    // Звонок (демо)
    document.getElementById('callBtn').onclick = () => {
        alert('📞 Звонок!\\nФункция голосовых звонков в разработке');
    };
    
    // Картинки
    document.getElementById('fileBtn').onclick = () => document.getElementById('imageInput').click();
    document.getElementById('imageInput').onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (currentChat.type === 'global') {
                socket.emit('global message', { from: currentUser, text: '📷 Изображение', image: ev.target.result });
            } else {
                socket.emit('private message', { from: currentUser, to: currentChat.name, text: '📷 Изображение', image: ev.target.result });
            }
        };
        reader.readAsDataURL(file);
    };
    
    document.getElementById('menuToggle').onclick = () => {
        document.getElementById('sidebar').classList.toggle('open');
    };
    
    function escapeHtml(str) {
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
</script>
</body>
</html>`);
});

// API
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (users.has(username)) return res.json({ success: false, message: 'Пользователь существует' });
  users.set(username, { password, friends: [] });
  res.json({ success: true, message: 'Регистрация успешна! Теперь войдите.' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  if (!user || user.password !== password) return res.json({ success: false });
  res.json({ success: true, friends: user.friends || [] });
});

app.post('/addFriend', (req, res) => {
  const { user, friend } = req.body;
  if (!users.has(friend)) return res.json({ success: false, message: 'Пользователь не найден' });
  const currentUser = users.get(user);
  if (!currentUser.friends.includes(friend)) currentUser.friends.push(friend);
  res.json({ success: true });
});

app.get('/globalMessages', (req, res) => {
  res.json(globalMessages || []);
});

app.post('/privateMessages', (req, res) => {
  const { user1, user2 } = req.body;
  const key = [user1, user2].sort().join('|');
  res.json(privateMessages.get(key) || []);
});

app.post('/ai', async (req, res) => {
  const { question } = req.body;
  try {
    const response = await fetch('https://api.ambr.chat/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: question }],
        max_tokens: 150
      })
    });
    const data = await response.json();
    res.json({ answer: data.choices?.[0]?.message?.content || 'Не могу ответить' });
  } catch(e) {
    res.json({ answer: '🤖 ИИ временно недоступен. Попробуйте позже.' });
  }
});

// Хранилища сообщений
let globalMessages = [];
let privateMessages = new Map();
let online = 0;

io.on('connection', (socket) => {
  let currentUser = '';
  
  socket.on('user online', (user) => {
    currentUser = user;
    online++;
    io.emit('online count', online);
  });
  
  socket.on('global message', (msg) => {
    const message = { from: msg.from, text: msg.text, gif: msg.gif, image: msg.image, time: new Date() };
    globalMessages.push(message);
    if (globalMessages.length > 100) globalMessages.shift();
    io.emit('global message', message);
  });
  
  socket.on('private message', (msg) => {
    const { from, to, text, gif, image } = msg;
    const key = [from, to].sort().join('|');
    if (!privateMessages.has(key)) privateMessages.set(key, []);
    const message = { from, to, text, gif, image, time: new Date() };
    privateMessages.get(key).push(message);
    io.emit('private message', message);
  });
  
  socket.on('disconnect', () => {
    if (currentUser) {
      online--;
      io.emit('online count', online);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('✅ Skebob Messenger работает на порту ' + PORT);
});
