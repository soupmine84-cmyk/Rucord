const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// ============= БАЗА ДАННЫХ В ПАМЯТИ =============
const users = new Map(); // username -> { password, friends, avatar, status }
const servers = new Map(); // serverId -> { name, owner, channels, members }
const dms = new Map(); // dmId -> { participants, messages }
let onlineUsers = new Set();
let messagesCache = new Map(); // channelId/dmId -> messages

// Создаем тестовый сервер при запуске
servers.set('main', {
  id: 'main',
  name: 'Skebob Community',
  owner: 'system',
  channels: [
    { id: 'general', name: 'общий', type: 'text' },
    { id: 'games', name: 'игры', type: 'text' },
    { id: 'voice-general', name: 'Голосовой', type: 'voice' }
  ],
  members: []
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Skebob Messenger</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Whitney', 'Helvetica Neue', 'Segoe UI', sans-serif; background: #1e1f22; height: 100vh; overflow: hidden; }
        
        /* Discord-подобный интерфейс */
        .app { display: flex; height: 100vh; }
        
        /* Серверная панель (слева) */
        .servers-bar { width: 72px; background: #1e1f22; display: flex; flex-direction: column; align-items: center; padding: 12px 0; gap: 8px; overflow-y: auto; }
        .server-icon { width: 48px; height: 48px; background: #313338; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; color: white; font-weight: bold; }
        .server-icon:hover { border-radius: 16px; background: #5865f2; }
        .server-icon.active { border-radius: 16px; background: #5865f2; }
        .add-server { background: #2b2d31; color: #23a55a; font-size: 24px; }
        
        /* Канальная панель */
        .channels-bar { width: 240px; background: #2b2d31; display: flex; flex-direction: column; padding: 16px; }
        .server-name { color: white; font-weight: 600; padding-bottom: 16px; border-bottom: 1px solid #1e1f22; margin-bottom: 16px; }
        .channel-category { color: #949ba4; font-size: 12px; font-weight: 600; margin: 16px 0 8px 0; text-transform: uppercase; }
        .channel { padding: 6px 8px; border-radius: 4px; cursor: pointer; color: #949ba4; display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
        .channel:hover { background: #3a3c43; color: #dbdee1; }
        .channel.active { background: #3a3c43; color: white; }
        .voice-channel { color: #23a55a; }
        
        /* Друзья в боковой панели */
        .friends-section { margin-top: 20px; border-top: 1px solid #1e1f22; padding-top: 16px; }
        .friend { padding: 8px; border-radius: 4px; cursor: pointer; color: #949ba4; display: flex; align-items: center; gap: 8px; }
        .friend:hover { background: #3a3c43; color: white; }
        .friend-status { width: 10px; height: 10px; border-radius: 50%; background: #23a55a; }
        .friend-status.offline { background: #80848e; }
        
        /* Основной чат */
        .main-chat { flex: 1; display: flex; flex-direction: column; background: #313338; }
        .chat-header { padding: 16px 20px; background: #2b2d31; border-bottom: 1px solid #1e1f22; display: flex; justify-content: space-between; align-items: center; }
        .chat-header h2 { color: white; font-size: 16px; }
        .chat-header-actions { display: flex; gap: 8px; }
        .call-btn { background: #23a55a; border: none; padding: 6px 12px; border-radius: 4px; color: white; cursor: pointer; }
        .gif-btn { background: #5865f2; border: none; padding: 6px 12px; border-radius: 4px; color: white; cursor: pointer; }
        .ai-btn { background: #e67e22; border: none; padding: 6px 12px; border-radius: 4px; color: white; cursor: pointer; }
        
        .messages-area { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; }
        .message { display: flex; gap: 12px; animation: fadeIn 0.2s; }
        .message-mine { flex-direction: row-reverse; }
        .message-avatar { width: 40px; height: 40px; background: #5865f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; }
        .message-content { flex: 1; max-width: 70%; }
        .message-mine .message-content { align-items: flex-end; }
        .message-header { display: flex; gap: 8px; margin-bottom: 4px; }
        .message-name { color: white; font-weight: 500; font-size: 14px; }
        .message-time { color: #949ba4; font-size: 11px; }
        .message-text { background: #2b2d31; padding: 8px 12px; border-radius: 8px; color: #dbdee1; font-size: 14px; word-wrap: break-word; }
        .message-mine .message-text { background: #5865f2; color: white; }
        .message-gif { max-width: 250px; border-radius: 8px; margin-top: 6px; }
        .system-message { text-align: center; color: #949ba4; font-size: 12px; margin: 8px 0; }
        .typing-status { padding: 8px 20px; color: #949ba4; font-size: 12px; font-style: italic; background: #313338; }
        
        .input-panel { padding: 16px 20px; background: #2b2d31; display: flex; gap: 12px; border-top: 1px solid #1e1f22; }
        .input-panel input { flex: 1; padding: 12px; background: #1e1f22; border: none; border-radius: 8px; color: white; font-size: 14px; }
        .input-panel input:focus { outline: none; }
        .input-panel button { padding: 12px 20px; background: #5865f2; color: white; border: none; border-radius: 8px; cursor: pointer; }
        
        .gif-modal { display: none; position: fixed; bottom: 80px; right: 20px; background: #2b2d31; border-radius: 8px; padding: 12px; width: 300px; flex-wrap: wrap; gap: 8px; z-index: 1000; }
        .gif-modal img { width: 90px; height: 90px; object-fit: cover; border-radius: 4px; cursor: pointer; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        
        .add-friend-btn { background: #23a55a; border: none; padding: 4px 8px; border-radius: 4px; color: white; cursor: pointer; font-size: 11px; margin-left: 8px; }
    </style>
</head>
<body>
<div class="app" id="app" style="display: none;">
    <!-- Сервера -->
    <div class="servers-bar" id="serversBar"></div>
    
    <!-- Каналы и друзья -->
    <div class="channels-bar" id="channelsBar"></div>
    
    <!-- Основной чат -->
    <div class="main-chat">
        <div class="chat-header">
            <h2 id="chatTitle"># общий</h2>
            <div class="chat-header-actions">
                <button class="gif-btn" id="gifBtn">🎬 GIF</button>
                <button class="call-btn" id="callBtn">📞 Звонок</button>
                <button class="ai-btn" id="aiBtn">🤖 ИИ</button>
            </div>
        </div>
        <div id="messagesArea" class="messages-area"></div>
        <div id="typingStatus" class="typing-status"></div>
        <div class="input-panel">
            <input type="text" id="messageInput" placeholder="Введите сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
            <button id="fileBtn">📎</button>
            <button onclick="sendMessage()">💬</button>
        </div>
    </div>
</div>

<div id="gifModal" class="gif-modal"></div>
<input type="file" id="imageInput" accept="image/*" style="display:none">

<script src="/socket.io/socket.io.js"></script>
<script>
    let socket;
    let currentUser = '';
    let currentChat = { type: 'channel', serverId: 'main', channelId: 'general', name: 'общий' };
    let servers = {};
    let friendsList = [];
    let gifModalOpen = false;
    
    // Функции для работы с серверами
    async function loadData() {
        const res = await fetch('/api/data');
        const data = await res.json();
        servers = data.servers;
        friendsList = data.friends;
        renderServers();
        renderChannels();
    }
    
    function renderServers() {
        const container = document.getElementById('serversBar');
        container.innerHTML = '';
        for (const [id, server] of Object.entries(servers)) {
            const div = document.createElement('div');
            div.className = 'server-icon' + (currentChat.serverId === id ? ' active' : '');
            div.textContent = server.name[0].toUpperCase();
            div.onclick = () => switchServer(id);
            container.appendChild(div);
        }
        const addDiv = document.createElement('div');
        addDiv.className = 'server-icon add-server';
        addDiv.textContent = '+';
        addDiv.onclick = () => createServer();
        container.appendChild(addDiv);
    }
    
    function renderChannels() {
        const container = document.getElementById('channelsBar');
        const server = servers[currentChat.serverId];
        if (!server) return;
        
        container.innerHTML = '<div class="server-name">' + server.name + '</div>';
        container.innerHTML += '<div class="channel-category">ТЕКСТОВЫЕ КАНАЛЫ</div>';
        server.channels.filter(c => c.type === 'text').forEach(ch => {
            container.innerHTML += '<div class="channel ' + (currentChat.channelId === ch.id ? 'active' : '') + '" onclick="switchChannel(\'' + ch.id + '\', \'' + ch.name + '\')"># ' + ch.name + '</div>';
        });
        container.innerHTML += '<div class="channel-category">ГОЛОСОВЫЕ</div>';
        server.channels.filter(c => c.type === 'voice').forEach(ch => {
            container.innerHTML += '<div class="channel voice-channel" onclick="joinVoice(\'' + ch.id + '\')">🔊 ' + ch.name + '</div>';
        });
        container.innerHTML += '<div class="friends-section"><div class="channel-category">ДРУЗЬЯ</div>';
        friendsList.forEach(friend => {
            container.innerHTML += '<div class="friend" onclick="openDM(\'' + friend + '\')"><div class="friend-status"></div> ' + friend + '<button class="add-friend-btn" onclick="event.stopPropagation();removeFriend(\'' + friend + '\')">✖</button></div>';
        });
        container.innerHTML += '<div style="margin-top:10px"><input type="text" id="friendName" placeholder="Имя друга" style="width:100%; padding:6px; border-radius:4px; background:#1e1f22; color:white; border:none"><button onclick="addFriend()" style="margin-top:5px; width:100%">➕ Добавить друга</button></div></div>';
    }
    
    function switchServer(serverId) {
        currentChat = { type: 'channel', serverId: serverId, channelId: servers[serverId].channels[0].id, name: servers[serverId].channels[0].name };
        document.getElementById('chatTitle').innerHTML = '# ' + currentChat.name;
        loadMessages();
        renderServers();
        renderChannels();
    }
    
    function switchChannel(channelId, name) {
        currentChat = { type: 'channel', serverId: currentChat.serverId, channelId: channelId, name: name };
        document.getElementById('chatTitle').innerHTML = '# ' + name;
        loadMessages();
        renderChannels();
    }
    
    function openDM(username) {
        currentChat = { type: 'dm', user: username, name: username };
        document.getElementById('chatTitle').innerHTML = '@' + username;
        loadMessages();
        renderChannels();
    }
    
    async function loadMessages() {
        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentChat)
        });
        const messages = await res.json();
        document.getElementById('messagesArea').innerHTML = '';
        messages.forEach(m => addMessage(m));
    }
    
    function addMessage(msg) {
        const div = document.createElement('div');
        div.className = 'message ' + (msg.from === currentUser ? 'message-mine' : '');
        const time = new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        div.innerHTML = '<div class="message-avatar">' + (msg.from[0] || '?').toUpperCase() + '</div>' +
            '<div class="message-content"><div class="message-header"><span class="message-name">' + escapeHtml(msg.from) + '</span><span class="message-time">' + time + '</span></div>' +
            '<div class="message-text">' + escapeHtml(msg.text) + '</div>' +
            (msg.gif ? '<img class="message-gif" src="' + msg.gif + '">' : '') +
            (msg.image ? '<img class="message-gif" src="' + msg.image + '">' : '') + '</div>';
        document.getElementById('messagesArea').appendChild(div);
        div.scrollIntoView({ behavior: 'smooth' });
    }
    
    function sendMessage() {
        const input = document.getElementById('messageInput');
        if (!input.value.trim()) return;
        socket.emit('chat message', { chat: currentChat, text: input.value, from: currentUser });
        input.value = '';
    }
    
    async function addFriend() {
        const name = document.getElementById('friendName').value;
        if (!name) return;
        const res = await fetch('/api/addFriend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friend: name, user: currentUser })
        });
        const data = await res.json();
        if (data.success) {
            friendsList.push(name);
            renderChannels();
        } else alert(data.message);
    }
    
    async function removeFriend(name) {
        friendsList = friendsList.filter(f => f !== name);
        renderChannels();
    }
    
    async function createServer() {
        const name = prompt('Название сервера:');
        if (!name) return;
        const res = await fetch('/api/createServer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, owner: currentUser })
        });
        const data = await res.json();
        if (data.success) {
            servers[data.serverId] = { id: data.serverId, name: name, owner: currentUser, channels: [{ id: 'general', name: 'общий', type: 'text' }], members: [] };
            renderServers();
        }
    }
    
    // GIF поиск
    document.getElementById('gifBtn').onclick = async () => {
        const modal = document.getElementById('gifModal');
        if (gifModalOpen) { modal.style.display = 'none'; gifModalOpen = false; return; }
        modal.style.display = 'flex';
        gifModalOpen = true;
        const res = await fetch('https://tenor.googleapis.com/v2/search?q=funny&key=AIzaSyC-9oUqY5G1m-Sxulx8QJqzvqQm3XqXJpE&limit=12');
        const data = await res.json();
        modal.innerHTML = '';
        data.results?.forEach(gif => {
            const img = document.createElement('img');
            img.src = gif.media_formats.gif.url;
            img.onclick = () => {
                socket.emit('chat message', { chat: currentChat, text: '🎬 GIF', gif: img.src, from: currentUser });
                modal.style.display = 'none';
                gifModalOpen = false;
            };
            modal.appendChild(img);
        });
    };
    
    document.getElementById('callBtn').onclick = () => {
        alert('🔊 Звонок! (WebRTC в разработке, скоро будет полноценный звонок)');
    };
    
    document.getElementById('aiBtn').onclick = async () => {
        const q = prompt('🤖 Спроси у ИИ:');
        if (!q) return;
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: q })
        });
        const data = await res.json();
        addMessage({ from: '🤖 Skebob AI', text: data.answer, time: new Date() });
    };
    
    document.getElementById('fileBtn').onclick = () => document.getElementById('imageInput').click();
    document.getElementById('imageInput').onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            socket.emit('chat message', { chat: currentChat, text: '🖼️ Изображение', image: ev.target.result, from: currentUser });
        };
        reader.readAsDataURL(file);
    };
    
    function escapeHtml(str) { return str.replace(/[&<>]/g, function(m) { if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m; }); }
    
    // Инициализация после логина
    async function initApp(user) {
        currentUser = user;
        socket = io();
        socket.emit('set user', currentUser);
        socket.on('chat message', (msg) => {
            if ((currentChat.type === 'channel' && msg.chat.channelId === currentChat.channelId) ||
                (currentChat.type === 'dm' && msg.chat.user === currentChat.user)) {
                addMessage(msg);
            }
        });
        socket.on('typing', (user) => {
            document.getElementById('typingStatus').innerHTML = '✏️ ' + user + ' печатает...';
            setTimeout(() => document.getElementById('typingStatus').innerHTML = '', 2000);
        });
        document.getElementById('messageInput').addEventListener('input', () => socket.emit('typing', currentUser));
        await loadData();
        document.getElementById('app').style.display = 'flex';
    }
    
    // Логин и регистрация (форма входа)
    document.body.innerHTML += '<div id="loginContainer" style="position:fixed; top:0; left:0; right:0; bottom:0; background:#1e1f22; display:flex; align-items:center; justify-content:center; z-index:10000"><div style="background:#2b2d31; padding:32px; border-radius:8px; width:400px"><h1 style="color:white; margin-bottom:20px">Skebob Messenger</h1><input type="text" id="loginUser" placeholder="Имя" style="width:100%; padding:12px; margin:8px 0; background:#1e1f22; border:none; color:white; border-radius:4px"><input type="password" id="loginPass" placeholder="Пароль" style="width:100%; padding:12px; margin:8px 0; background:#1e1f22; border:none; color:white; border-radius:4px"><button id="doLogin" style="width:100%; padding:12px; background:#5865f2; color:white; border:none; border-radius:4px">Войти</button><button id="doRegister" style="width:100%; padding:12px; margin-top:8px; background:#23a55a; color:white; border:none; border-radius:4px">Регистрация</button></div></div>';
    
    document.getElementById('doLogin').onclick = async () => {
        const username = document.getElementById('loginUser').value;
        const password = document.getElementById('loginPass').value;
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('loginContainer').remove();
            initApp(username);
        } else alert('Ошибка входа');
    };
    
    document.getElementById('doRegister').onclick = async () => {
        const username = document.getElementById('loginUser').value;
        const password = document.getElementById('loginPass').value;
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) alert('Регистрация успешна! Теперь войдите');
        else alert(data.message);
    };
    
    function joinVoice(channelId) {
        alert('🔊 Голосовой канал! (WebRTC звонки будут добавлены в следующей версии)');
    }
</script>
</body>
</html>
  `);
});

// ============= API =============
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (users.has(username)) return res.json({ success: false, message: 'Пользователь существует' });
  users.set(username, { password, friends: [], avatar: null, status: 'online' });
  res.json({ success: true });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  if (!user || user.password !== password) return res.json({ success: false });
  res.json({ success: true });
});

app.get('/api/data', (req, res) => {
  res.json({ servers: Object.fromEntries(servers), friends: [] });
});

app.post('/api/addFriend', (req, res) => {
  const { friend, user } = req.body;
  if (!users.has(friend)) return res.json({ success: false, message: 'Пользователь не найден' });
  const u = users.get(user);
  if (!u.friends.includes(friend)) u.friends.push(friend);
  res.json({ success: true });
});

app.post('/api/createServer', (req, res) => {
  const { name, owner } = req.body;
  const id = Date.now().toString();
  servers.set(id, { id, name, owner, channels: [{ id: 'general', name: 'общий', type: 'text' }], members: [owner] });
  res.json({ success: true, serverId: id });
});

app.post('/api/messages', (req, res) => {
  const key = req.body.type === 'channel' ? `channel_${req.body.serverId}_${req.body.channelId}` : `dm_${req.body.user}`;
  res.json(messagesCache.get(key) || []);
});

app.post('/api/ai', async (req, res) => {
  const { question } = req.body;
  try {
    const response = await fetch('https://api.ambr.chat/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: question }], max_tokens: 150 })
    });
    const data = await response.json();
    res.json({ answer: data.choices?.[0]?.message?.content || 'Ошибка' });
  } catch(e) { res.json({ answer: '🤖 ИИ временно недоступен' }); }
});

// ============= SOCKET.IO =============
io.on('connection', (socket) => {
  let currentUser = '';
  socket.on('set user', (user) => { currentUser = user; onlineUsers.add(user); });
  socket.on('chat message', (msg) => {
    const key = msg.chat.type === 'channel' ? `channel_${msg.chat.serverId}_${msg.chat.channelId}` : `dm_${msg.chat.user}`;
    const message = { from: msg.from, text: msg.text, gif: msg.gif, image: msg.image, time: new Date() };
    if (!messagesCache.has(key)) messagesCache.set(key, []);
    messagesCache.get(key).push(message);
    io.emit('chat message', { ...message, chat: msg.chat });
  });
  socket.on('typing', (user) => socket.broadcast.emit('typing', user));
  socket.on('disconnect', () => { if (currentUser) onlineUsers.delete(currentUser); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('🚀 Skebob Messenger работает на порту ' + PORT));
