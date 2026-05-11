const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// База данных
const users = new Map(); // username -> { password, friends }
const privateMessages = new Map(); // `user1|user2` -> []
let onlineUsers = new Set();

app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Skebob Messenger</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial; background: #1e1f22; height: 100vh; display: flex; justify-content: center; align-items: center; }
        
        .login-box { background: #2b2d31; padding: 30px; border-radius: 16px; width: 350px; text-align: center; }
        .login-box h2 { color: white; margin-bottom: 20px; }
        .login-box input { width: 100%; padding: 12px; margin: 8px 0; background: #1e1f22; border: none; color: white; border-radius: 8px; }
        .login-box button { width: 100%; padding: 12px; margin: 8px 0; border: none; border-radius: 8px; cursor: pointer; background: #5865f2; color: white; font-size: 16px; }
        .register-btn { background: #23a55a !important; }
        
        .app { display: none; width: 1200px; max-width: 95%; height: 80vh; background: #2b2d31; border-radius: 16px; overflow: hidden; display: flex; }
        .sidebar { width: 260px; background: #1e1f22; padding: 16px; overflow-y: auto; }
        .sidebar h3 { color: #949ba4; font-size: 12px; margin-bottom: 12px; }
        .friend-item { padding: 8px; border-radius: 8px; cursor: pointer; color: #dbdee1; margin-bottom: 4px; }
        .friend-item:hover, .friend-item.active { background: #3a3c43; }
        .add-friend { display: flex; gap: 8px; margin-top: 16px; }
        .add-friend input { flex: 1; padding: 8px; background: #2b2d31; border: none; color: white; border-radius: 8px; }
        .add-friend button { padding: 8px 12px; background: #23a55a; border: none; color: white; border-radius: 8px; cursor: pointer; }
        
        .chat-area { flex: 1; display: flex; flex-direction: column; }
        .chat-header { padding: 16px; background: #2b2d31; border-bottom: 1px solid #1e1f22; color: white; }
        .messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .message { max-width: 70%; padding: 8px 12px; border-radius: 16px; }
        .message-mine { background: #5865f2; color: white; align-self: flex-end; }
        .message-other { background: #3a3c43; color: white; align-self: flex-start; }
        .message-name { font-size: 11px; opacity: 0.8; margin-bottom: 4px; }
        .message-img { max-width: 200px; border-radius: 8px; margin-top: 5px; }
        
        .input-area { display: flex; padding: 16px; background: #2b2d31; gap: 8px; border-top: 1px solid #1e1f22; }
        .input-area input { flex: 1; padding: 10px; background: #1e1f22; border: none; color: white; border-radius: 20px; }
        .input-area button { padding: 8px 16px; background: #5865f2; border: none; color: white; border-radius: 20px; cursor: pointer; }
        .fun-btn { background: #e67e22 !important; }
        .ai-btn { background: #9b59b6 !important; }
        
        .gif-panel { display: none; position: fixed; bottom: 100px; right: 20px; background: #2b2d31; padding: 12px; border-radius: 12px; width: 280px; flex-wrap: wrap; gap: 8px; max-height: 300px; overflow-y: auto; }
        .gif-panel img { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; cursor: pointer; }
    </style>
</head>
<body>

<div id="loginContainer" class="login-box">
    <h2>Skebob Messenger</h2>
    <input type="text" id="loginUsername" placeholder="Имя">
    <input type="password" id="loginPassword" placeholder="Пароль">
    <button id="doLogin">Войти</button>
    <button id="doRegister" class="register-btn">Регистрация</button>
</div>

<div id="app" class="app" style="display: none;">
    <div class="sidebar">
        <h3>ДРУЗЬЯ</h3>
        <div id="friendsList"></div>
        <div class="add-friend">
            <input type="text" id="friendName" placeholder="Имя друга">
            <button id="addFriendBtn">➕</button>
        </div>
    </div>
    <div class="chat-area">
        <div class="chat-header">
            <span id="chatTitle">Выберите друга</span>
        </div>
        <div id="messagesArea" class="messages"></div>
        <div class="input-area">
            <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
            <button id="gifBtn" class="fun-btn">🎬</button>
            <button id="aiBtn" class="ai-btn">🤖</button>
            <button id="fileBtn">📎</button>
            <button onclick="sendMessage()">💬</button>
        </div>
    </div>
</div>

<div id="gifPanel" class="gif-panel"></div>
<input type="file" id="imageFile" style="display:none">

<script src="/socket.io/socket.io.js"></script>
<script>
    let socket;
    let currentUser = '';
    let currentFriend = '';
    let friends = [];
    
    // Регистрация
    document.getElementById('doRegister').onclick = async () => {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const res = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        alert(data.message);
        if (data.success) {
            document.getElementById('loginUsername').value = '';
            document.getElementById('loginPassword').value = '';
        }
    };
    
    // Логин
    document.getElementById('doLogin').onclick = async () => {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            currentUser = username;
            friends = data.friends || [];
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('app').style.display = 'flex';
            
            socket = io();
            socket.emit('user online', currentUser);
            
            socket.on('private message', (msg) => {
                if ((msg.from === currentFriend && msg.to === currentUser) || (msg.from === currentUser && msg.to === currentFriend)) {
                    addMessage(msg);
                }
            });
            
            renderFriends();
            document.getElementById('chatTitle').innerText = 'Выберите друга';
        } else {
            alert('Ошибка входа');
        }
    };
    
    function renderFriends() {
        const container = document.getElementById('friendsList');
        container.innerHTML = '';
        friends.forEach(f => {
            const div = document.createElement('div');
            div.className = 'friend-item' + (currentFriend === f ? ' active' : '');
            div.innerText = f;
            div.onclick = () => openChat(f);
            container.appendChild(div);
        });
    }
    
    async function openChat(friend) {
        currentFriend = friend;
        document.getElementById('chatTitle').innerText = friend;
        renderFriends();
        
        const res = await fetch('/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user1: currentUser, user2: friend })
        });
        const messages = await res.json();
        const area = document.getElementById('messagesArea');
        area.innerHTML = '';
        messages.forEach(m => addMessage(m));
    }
    
    function addMessage(msg) {
        const area = document.getElementById('messagesArea');
        const div = document.createElement('div');
        div.className = 'message ' + (msg.from === currentUser ? 'message-mine' : 'message-other');
        const time = new Date(msg.time).toLocaleTimeString();
        div.innerHTML = '<div class="message-name">' + msg.from + ' · ' + time + '</div>' +
                       '<div>' + escapeHtml(msg.text) + '</div>' +
                       (msg.gif ? '<img class="message-img" src="' + msg.gif + '">' : '') +
                       (msg.image ? '<img class="message-img" src="' + msg.image + '">' : '');
        area.appendChild(div);
        div.scrollIntoView({ behavior: 'smooth' });
    }
    
    function sendMessage() {
        const input = document.getElementById('messageInput');
        if (!input.value.trim() || !currentFriend) return;
        const text = input.value;
        socket.emit('private message', { from: currentUser, to: currentFriend, text: text });
        input.value = '';
    }
    
    // Добавление друга
    document.getElementById('addFriendBtn').onclick = async () => {
        const friend = document.getElementById('friendName').value;
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
            document.getElementById('friendName').value = '';
        } else {
            alert(data.message);
        }
    };
    
    // GIF
    document.getElementById('gifBtn').onclick = async () => {
        const panel = document.getElementById('gifPanel');
        if (panel.style.display === 'flex') { panel.style.display = 'none'; return; }
        panel.style.display = 'flex';
        try {
            const res = await fetch('https://tenor.googleapis.com/v2/search?q=funny&key=AIzaSyC-9oUqY5G1m-Sxulx8QJqzvqQm3XqXJpE&limit=12');
            const data = await res.json();
            panel.innerHTML = '';
            data.results.forEach(gif => {
                const img = document.createElement('img');
                img.src = gif.media_formats.gif.url;
                img.onclick = () => {
                    socket.emit('private message', { from: currentUser, to: currentFriend, text: '🎬 GIF', gif: img.src });
                    panel.style.display = 'none';
                };
                panel.appendChild(img);
            });
        } catch(e) { panel.innerHTML = 'Ошибка'; }
    };
    
    // ИИ
    document.getElementById('aiBtn').onclick = async () => {
        const q = prompt('🤖 Спроси у ИИ:');
        if (!q) return;
        const res = await fetch('/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: q })
        });
        const data = await res.json();
        addMessage({ from: '🤖 ИИ', text: data.answer, time: new Date() });
    };
    
    // Картинки
    document.getElementById('fileBtn').onclick = () => document.getElementById('imageFile').click();
    document.getElementById('imageFile').onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            socket.emit('private message', { from: currentUser, to: currentFriend, text: '📷 Изображение', image: ev.target.result });
        };
        reader.readAsDataURL(file);
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
  res.json({ success: true, message: 'Регистрация успешна!' });
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
  const u = users.get(user);
  if (!u.friends.includes(friend)) u.friends.push(friend);
  res.json({ success: true });
});

app.post('/messages', (req, res) => {
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
      body: JSON.stringify({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: question }], max_tokens: 150 })
    });
    const data = await response.json();
    res.json({ answer: data.choices?.[0]?.message?.content || 'Ошибка' });
  } catch(e) { res.json({ answer: 'ИИ временно недоступен' }); }
});

// Socket.IO
io.on('connection', (socket) => {
  let currentUser = '';
  socket.on('user online', (user) => { currentUser = user; });
  
  socket.on('private message', (msg) => {
    const key = [msg.from, msg.to].sort().join('|');
    if (!privateMessages.has(key)) privateMessages.set(key, []);
    const message = { from: msg.from, to: msg.to, text: msg.text, gif: msg.gif, image: msg.image, time: new Date() };
    privateMessages.get(key).push(message);
    io.emit('private message', message);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('✅ Skebob Messenger работает на порту ' + PORT));
