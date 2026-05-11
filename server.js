const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// Простая база данных в памяти (для демо)
const users = new Map(); // username -> { password, role, avatar }
const groups = new Map(); // groupName -> { creator, members, messages, channels }
const channels = new Map(); // channelName -> { type, members, messages }
let sessions = new Map(); // socketId -> username

// Регистрация нового пользователя
function registerUser(username, password) {
  if (users.has(username)) return false;
  users.set(username, { password, role: 'user', avatar: null });
  return true;
}

// Проверка логина
function loginUser(username, password) {
  const user = users.get(username);
  if (!user || user.password !== password) return false;
  return true;
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Главная страница
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>🚀 Супер Мессенджер | Группы, Каналы, ИИ</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #1e1e2f, #2a2a3b); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
        
        /* Окно входа/регистрации */
        .auth-container { background: rgba(30,30,47,0.95); border-radius: 28px; padding: 40px; width: 400px; text-align: center; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        .auth-container h1 { background: linear-gradient(135deg, #a78bfa, #ec4899); -webkit-background-clip: text; background-clip: text; color: transparent; margin-bottom: 20px; }
        .auth-container input { width: 100%; padding: 12px; margin: 10px 0; border: none; border-radius: 40px; background: #2a2a3b; color: white; padding-left: 20px; }
        .auth-container button { width: 100%; padding: 12px; margin: 10px 0; border: none; border-radius: 40px; background: linear-gradient(135deg, #a78bfa, #ec4899); color: white; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .auth-container button:hover { transform: scale(1.02); opacity: 0.9; }
        .toggle-btn { background: transparent; border: 1px solid #a78bfa; color: #a78bfa; }
        
        /* Основной чат */
        .chat-layout { display: none; width: 1400px; max-width: 95vw; height: 85vh; background: #1e1e2f; border-radius: 28px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        .sidebar { width: 280px; background: #2a2a3b; padding: 20px; overflow-y: auto; border-right: 1px solid #3a3a4b; }
        .sidebar h3 { color: #a78bfa; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; }
        .sidebar-item { padding: 10px; margin: 5px 0; border-radius: 12px; cursor: pointer; transition: 0.2s; color: #ddd; }
        .sidebar-item:hover { background: #3a3a4b; }
        .active-chat { background: linear-gradient(135deg, #a78bfa, #ec4899); color: white; }
        .main-chat { flex: 1; display: flex; flex-direction: column; background: #1e1e2f; }
        .chat-header { padding: 20px; background: #2a2a3b; border-bottom: 1px solid #3a3a4b; display: flex; justify-content: space-between; align-items: center; }
        .chat-header h2 { color: white; }
        .messages-area { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .message { display: flex; animation: fadeIn 0.2s; }
        .message-mine { justify-content: flex-end; }
        .message-bubble { max-width: 70%; padding: 10px 16px; border-radius: 22px; background: #2a2a3b; color: white; }
        .message-mine .message-bubble { background: linear-gradient(135deg, #a78bfa, #ec4899); }
        .message-name { font-size: 12px; opacity: 0.8; margin-bottom: 4px; }
        .message-time { font-size: 10px; opacity: 0.6; margin-left: 8px; }
        .message-text { word-wrap: break-word; }
        .message-img { max-width: 200px; border-radius: 12px; margin-top: 6px; cursor: pointer; }
        .input-panel { padding: 20px; background: #2a2a3b; display: flex; gap: 12px; border-top: 1px solid #3a3a4b; }
        .input-panel input { flex: 1; padding: 12px; border: none; border-radius: 40px; background: #3a3a4b; color: white; padding-left: 20px; }
        .input-panel button { padding: 12px 24px; border: none; border-radius: 40px; background: linear-gradient(135deg, #a78bfa, #ec4899); color: white; cursor: pointer; }
        .file-input { background: #3a3a4b; padding: 8px; border-radius: 40px; cursor: pointer; }
        .ai-btn { background: #10b981; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .system-message { text-align: center; color: #888; font-size: 12px; margin: 8px 0; }
        .typing-status { padding: 8px 20px; font-size: 12px; color: #888; font-style: italic; }
    </style>
</head>
<body>

<div id="authContainer" class="auth-container">
    <h1>🚀 Супер Мессенджер</h1>
    <div id="authForm">
        <input type="text" id="authUsername" placeholder="Имя пользователя">
        <input type="password" id="authPassword" placeholder="Пароль">
        <button id="loginBtn">🔓 Войти</button>
        <button id="registerBtn" class="toggle-btn">📝 Регистрация</button>
    </div>
</div>

<div id="chatLayout" class="chat-layout">
    <div class="sidebar">
        <h3>📌 Личные сообщения</h3>
        <div id="privateChats"></div>
        <h3>👥 Группы</h3>
        <div id="groupsList"></div>
        <h3>📢 Каналы</h3>
        <div id="channelsList"></div>
        <button id="createGroupBtn" style="margin-top:20px; width:100%;">➕ Создать группу</button>
        <button id="createChannelBtn" style="margin-top:10px; width:100%;">📢 Создать канал</button>
    </div>
    <div class="main-chat">
        <div class="chat-header">
            <h2 id="currentChatName">Выберите чат</h2>
            <button id="aiHelpBtn" class="ai-btn">🤖 Спросить ИИ</button>
        </div>
        <div id="messagesArea" class="messages-area"></div>
        <div id="typingStatus" class="typing-status"></div>
        <div class="input-panel">
            <input type="text" id="messageInput" placeholder="Сообщение...">
            <input type="file" id="imageInput" accept="image/*" style="display:none">
            <button class="file-input" onclick="document.getElementById('imageInput').click()">🖼️</button>
            <button onclick="sendMessage()">📤 Отправить</button>
        </div>
    </div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
    let socket;
    let currentUser = '';
    let currentChat = { type: '', name: '' };
    let currentRole = 'user';
    let chats = { private: [], groups: [], channels: [] };

    // Регистрация
    document.getElementById('registerBtn').onclick = () => {
        const username = document.getElementById('authUsername').value;
        const password = document.getElementById('authPassword').value;
        fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(res => res.json()).then(data => {
            alert(data.message);
            if (data.success) document.getElementById('loginBtn').click();
        });
    };

    // Логин
    document.getElementById('loginBtn').onclick = () => {
        const username = document.getElementById('authUsername').value;
        const password = document.getElementById('authPassword').value;
        fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(res => res.json()).then(data => {
            if (data.success) {
                currentUser = username;
                document.getElementById('authContainer').style.display = 'none';
                document.getElementById('chatLayout').style.display = 'flex';
                initSocket();
                loadChats();
            } else alert('Ошибка входа');
        });
    };

    function initSocket() {
        socket = io();
        socket.emit('set user', currentUser);
        
        socket.on('chat message', (msg) => addMessage(msg));
        socket.on('user joined', (name) => addSystemMessage(✨ ${name} присоединился ✨));
        socket.on('user left', (name) => addSystemMessage(👋 ${name} вышел));
        socket.on('typing', (name) => showTyping(name));
    }

    function loadChats() {
        fetch('/getChats').then(res => res.json()).then(data => {
            chats = data;
            renderSidebar();
        });
    }

    function renderSidebar() {
        document.getElementById('privateChats').innerHTML = chats.private.map(u => 
            '<div class="sidebar-item" onclick="openChat(\'private\', \'' + u + '\')">💬 ' + u + '</div>'
        ).join('');
        document.getElementById('groupsList').innerHTML = chats.groups.map(g => 
            '<div class="sidebar-item" onclick="openChat(\'group\', \'' + g + '\')">👥 ' + g + '</div>'
        ).join('');
        document.getElementById('channelsList').innerHTML = chats.channels.map(c => 
            '<div class="sidebar-item" onclick="openChat(\'channel\', \'' + c + '\')">📢 ' + c + '</div>'
        ).join('');
    }

    function openChat(type, name) {
        currentChat = { type, name };
        document.getElementById('currentChatName').innerHTML = (type === 'private' ? '💬 ' : type === 'group' ? '👥 ' : '📢 ') + name;
        fetch('/getMessages?type=' + type + '&name=' + name).then(res => res.json()).then(messages => {
            document.getElementById('messagesArea').innerHTML = '';
            messages.forEach(m => addMessage(m));
        });
    }

    function addMessage(msg) {
        const div = document.createElement('div');
        div.className = 'message ' + (msg.from === currentUser ? 'message-mine' : '');
        div.innerHTML = '<div class="message-bubble"><div class="message-name">' + msg.from + '<span class="message-time">' + (msg.time || '') + '</span></div><div class="message-text">' + escapeHtml(msg.text) + '</div>' + (msg.image ? '<img class="message-img" src="' + msg.image + '">' : '') + '</div>';
        document.getElementById('messagesArea').appendChild(div);
        div.scrollIntoView();
    }

    function sendMessage() {
        const input = document.getElementById('messageInput');
        if (!input.value.trim()) return;
        socket.emit('chat message', { to: currentChat, text: input.value, from: currentUser });
        input.value = '';
    }

    document.getElementById('imageInput').onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            socket.emit('chat message', { to: currentChat, text: '📷 Изображение', image: ev.target.result, from: currentUser });
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('aiHelpBtn').onclick = () => {
        const question = prompt('🤖 Спроси у ИИ-помощника:');
        if (question) {
            fetch('/askAI', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            }).then(res => res.json()).then(data => {
                addMessage({ from: '🤖 ИИ-помощник', text: data.answer, time: new Date().toLocaleTimeString() });
            });
        }
    };

    function showTyping(name) {
        document.getElementById('typingStatus').innerText = ✏️ ${name} печатает...;
        setTimeout(() => document.getElementById('typingStatus').innerText = '', 2000);
    }

    function escapeHtml(str) { return str.replace(/[&<>]/g, function(m){if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }
</script>
</body>
</html>
  `);
});

// API для регистрации/логина
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (users.has(username)) return res.json({ success: false, message: 'Пользователь уже существует' });
  users.set(username, { password, role: 'user', avatar: null });
  res.json({ success: true, message: 'Регистрация успешна' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  if (!user || user.password !== password) return res.json({ success: false });
  res.json({ success: true });
});

app.get('/getChats', (req, res) => {
  const allUsers = Array.from(users.keys());
  res.json({ private: allUsers, groups: Array.from(groups.keys()), channels: Array.from(channels.keys()) });
});

// ИИ-помощник (бесплатный API)
app.post('/askAI', async (req, res) => {
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
    res.json({ answer: data.choices?.[0]?.message?.content || 'Ошибка ИИ' });
  } catch(e) {
    res.json({ answer: 'Извините, ИИ暂时 недоступен' });
  }
});

io.on('connection', (socket) => {
  let currentUser = '';
  socket.on('set user', (username) => {
    currentUser = username;
    sessions.set(socket.id, username);
    socket.broadcast.emit('user joined', username);
  });
  
  socket.on('chat message', (msg) => {
    io.emit('chat message', { from: msg.from, text: msg.text, image: msg.image, time: new Date().toLocaleTimeString() });
  });
  
  socket.on('disconnect', () => {
    const user = sessions.get(socket.id);
    if (user) {
      sessions.delete(socket.id);
      socket.broadcast.emit('user left', user);
    }
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log('Супер мессенджер работает на порту ' + port));
