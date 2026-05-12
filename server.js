const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  // Важно для Render - увеличиваем таймауты
  pingTimeout: 60000,
  pingInterval: 25000
});

// База данных (хранится в памяти - при перезапуске сервера всё сотрётся)
const users = new Map();
const globalMessages = [];
const privateMessages = new Map();
let online = 0;

app.use(express.json({ limit: '50mb' }));

// Health check для Render (чтобы сервер не засыпал)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// HTML страница
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
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1e1f22; height: 100vh; overflow: hidden; }
        
        .login-screen { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .login-box { background: #2b2d31; padding: 30px; border-radius: 20px; width: 90%; max-width: 400px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        .login-box h1 { color: white; margin-bottom: 10px; }
        .login-box p { color: #949ba4; margin-bottom: 20px; font-size: 14px; }
        .login-box input { width: 100%; padding: 12px; margin: 10px 0; background: #1e1f22; border: none; color: white; border-radius: 8px; font-size: 16px; }
        .login-box input:focus { outline: none; border: 1px solid #5865f2; }
        .login-box button { width: 100%; padding: 12px; margin: 10px 0; border: none; border-radius: 8px; cursor: pointer; background: #5865f2; color: white; font-size: 16px; font-weight: bold; transition: 0.2s; }
        .login-box button:hover { opacity: 0.9; transform: scale(1.02); }
        .register { background: #23a55a !important; }
        
        .app { display: none; height: 100vh; }
        .sidebar { position: fixed; left: -280px; top: 0; bottom: 0; width: 280px; background: #2b2d31; transition: 0.3s; z-index: 100; padding: 20px; overflow-y: auto; }
        .sidebar.open { left: 0; }
        .chat-area { margin-left: 0; height: 100vh; display: flex; flex-direction: column; background: #313338; }
        .chat-header { padding: 15px; background: #2b2d31; border-bottom: 1px solid #1e1f22; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
        .chat-header h2 { color: white; font-size: 18px; }
        .messages-area { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 10px; }
        .message { display: flex; gap: 10px; animation: fadeIn 0.3s; }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .message-mine { flex-direction: row-reverse; }
        .message-avatar { width: 40px; height: 40px; background: #5865f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; flex-shrink: 0; }
        .message-content { max-width: 70%; }
        .message-name { font-weight: bold; color: white; margin-bottom: 5px; display: block; font-size: 14px; }
        .message-text { background: #2b2d31; padding: 8px 12px; border-radius: 15px; color: white; word-wrap: break-word; }
        .message-mine .message-text { background: #5865f2; }
        .message-time { font-size: 10px; color: #949ba4; margin-top: 5px; display: block; }
        .message-img { max-width: 200px; border-radius: 10px; margin-top: 5px; cursor: pointer; }
        
        .input-panel { padding: 15px; background: #2b2d31; display: flex; gap: 10px; border-top: 1px solid #1e1f22; }
        .input-panel input { flex: 1; padding: 12px; background: #1e1f22; border: none; color: white; border-radius: 25px; font-size: 14px; }
        .input-panel input:focus { outline: none; }
        .input-panel button { padding: 10px 20px; background: #5865f2; border: none; color: white; border-radius: 25px; cursor: pointer; font-weight: bold; }
        .input-panel button:hover { opacity: 0.9; }
        
        .action-btn { padding: 8px 15px; margin: 0 5px; border: none; border-radius: 20px; cursor: pointer; color: white; font-weight: bold; transition: 0.2s; }
        .action-btn:hover { transform: scale(1.05); }
        .gif-btn { background: #e67e22; }
        .ai-btn { background: #9b59b6; }
        
        .menu-toggle { position: fixed; bottom: 20px; left: 20px; background: #5865f2; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; z-index: 200; border: none; font-size: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
        
        @media (min-width: 768px) {
            .sidebar { position: relative; left: 0; width: 280px; }
            .menu-toggle { display: none; }
            .app { display: flex !important; flex-direction: row; }
            .chat-area { flex: 1; }
        }
        
        .friend { padding: 12px; margin: 8px 0; background: #1e1f22; border-radius: 10px; cursor: pointer; color: white; transition: 0.2s; }
        .friend:hover { background: #5865f2; transform: translateX(5px); }
        .friend.active { background: #5865f2; }
        
        .online-count { font-size: 12px; color: #949ba4; margin-top: 10px; }
        
        .toast { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #2b2d31; color: white; padding: 10px 20px; border-radius: 25px; z-index: 9999; animation: fadeIn 0.3s; pointer-events: none; white-space: nowrap; }
        
        .connection-status { position: fixed; top: 10px; right: 10px; padding: 5px 10px; border-radius: 20px; font-size: 12px; z-index: 1000; }
        .connected { background: #23a55a; color: white; }
        .disconnected { background: #e74c3c; color: white; }
    </style>
</head>
<body>

<div class="login-screen" id="loginScreen">
    <div class="login-box">
        <h1>⚡ Skebob Messenger</h1>
        <p>Работает на Render.com</p>
        <input type="text" id="username" placeholder="👤 Имя пользователя">
        <input type="password" id="password" placeholder="🔒 Пароль">
        <button id="loginBtn">🚀 Войти</button>
        <button id="registerBtn" class="register">✨ Зарегистрироваться</button>
    </div>
</div>

<div class="app" id="app">
    <div class="sidebar" id="sidebar">
        <h3 style="color: white; margin-bottom: 10px;">📱 Друзья</h3>
        <div class="online-count" id="onlineCount">👥 Онлайн: 0</div>
        <div id="friendsList" style="margin-top: 20px;"></div>
        <div style="margin-top: 20px;">
            <input type="text" id="friendName" placeholder="👤 Имя друга" style="width: 100%; padding: 10px; margin-bottom: 10px; background: #1e1f22; border: none; color: white; border-radius: 8px;">
            <button id="addFriendBtn" style="width: 100%; padding: 10px; background: #23a55a; border: none; color: white; border-radius: 8px; cursor: pointer; font-weight: bold;">➕ Добавить друга</button>
        </div>
    </div>
    
    <div class="chat-area">
        <div class="chat-header">
            <h2 id="chatTitle"># Общий чат</h2>
            <div>
                <button id="gifBtn" class="action-btn gif-btn">🎬 GIF</button>
                <button id="aiBtn" class="action-btn ai-btn">🤖 ИИ</button>
            </div>
        </div>
        <div class="messages-area" id="messagesArea">
            <div style="text-align: center; color: #949ba4; margin-top: 50px;">💬 Напишите первое сообщение!</div>
        </div>
        <div class="input-panel">
            <input type="text" id="messageInput" placeholder="Введите сообщение...">
            <button id="sendBtn">📤 Отправить</button>
        </div>
    </div>
</div>

<button class="menu-toggle" id="menuToggle">☰</button>
<div id="connectionStatus" class="connection-status disconnected">🔌 Подключение...</div>

<script src="/socket.io/socket.io.js"></script>
<script>
    // ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
    let socket = null;
    let currentUser = '';
    let currentChat = 'global';
    let currentFriend = null;
    let friends = [];
    let reconnectAttempts = 0;
    
    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
    function showToast(msg) {
        let toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    
    function updateConnectionStatus(connected) {
        let statusDiv = document.getElementById('connectionStatus');
        if (connected) {
            statusDiv.className = 'connection-status connected';
            statusDiv.innerHTML = '🟢 Подключено';
        } else {
            statusDiv.className = 'connection-status disconnected';
            statusDiv.innerHTML = '🔴 Отключено';
        }
    }
    
    function addMessageToUI(msg) {
        let area = document.getElementById('messagesArea');
        let div = document.createElement('div');
        div.className = 'message ' + (msg.from === currentUser ? 'message-mine' : '');
        let time = new Date(msg.time).toLocaleTimeString();
        
        div.innerHTML = 
            '<div class="message-avatar">' + (msg.from[0] || '?').toUpperCase() + '</div>' +
            '<div class="message-content">' +
                '<span class="message-name">' + escapeHtml(msg.from) + '</span>' +
                '<div class="message-text">' + (msg.text ? escapeHtml(msg.text) : '') + '</div>' +
                (msg.gif ? '<img class="message-img" src="' + escapeHtml(msg.gif) + '" onclick="window.open(this.src)">' : '') +
                '<span class="message-time">' + time + '</span>' +
            '</div>';
        
        area.appendChild(div);
        div.scrollIntoView({ behavior: 'smooth' });
    }
    
    // ========== ОСНОВНЫЕ ФУНКЦИИ ЧАТА ==========
    function sendMessage() {
        let input = document.getElementById('messageInput');
        let text = input.value.trim();
        
        if (!text) return;
        
        if (!socket || !socket.connected) {
            showToast('❌ Нет подключения к серверу!');
            return;
        }
        
        if (currentChat === 'global') {
            socket.emit('global message', { from: currentUser, text: text });
        } else {
            socket.emit('private message', { from: currentUser, to: currentFriend, text: text });
        }
        
        input.value = '';
    }
    
    async function loadGlobalMessages() {
        try {
            let res = await fetch('/globalMessages');
            let messages = await res.json();
            let area = document.getElementById('messagesArea');
            area.innerHTML = '';
            if (messages.length === 0) {
                area.innerHTML = '<div style="text-align: center; color: #949ba4; margin-top: 50px;">💬 Нет сообщений. Напишите первое!</div>';
            } else {
                messages.forEach(msg => addMessageToUI(msg));
            }
        } catch(e) {
            console.error('Ошибка загрузки сообщений:', e);
        }
    }
    
    async function loadPrivateMessages(friend) {
        try {
            let res = await fetch('/privateMessages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user1: currentUser, user2: friend })
            });
            let messages = await res.json();
            let area = document.getElementById('messagesArea');
            area.innerHTML = '';
            if (messages.length === 0) {
                area.innerHTML = '<div style="text-align: center; color: #949ba4; margin-top: 50px;">💬 Напишите первое сообщение ' + friend + '</div>';
            } else {
                messages.forEach(msg => addMessageToUI(msg));
            }
        } catch(e) {
            console.error('Ошибка загрузки ЛС:', e);
        }
    }
    
    // ========== ФУНКЦИИ НАВИГАЦИИ ==========
    window.openGlobalChat = function() {
        currentChat = 'global';
        currentFriend = null;
        document.getElementById('chatTitle').innerHTML = '# Общий чат';
        loadGlobalMessages();
        renderFriends();
        if (window.innerWidth < 768) {
            document.getElementById('sidebar').classList.remove('open');
        }
    };
    
    window.openPrivateChat = async function(friend) {
        currentChat = 'private';
        currentFriend = friend;
        document.getElementById('chatTitle').innerHTML = '@' + friend;
        await loadPrivateMessages(friend);
        renderFriends();
        if (window.innerWidth < 768) {
            document.getElementById('sidebar').classList.remove('open');
        }
    };
    
    // ========== ОТРИСОВКА СПИСКА ДРУЗЕЙ ==========
    function renderFriends() {
        let container = document.getElementById('friendsList');
        if (!container) return;
        
        let globalClass = (currentChat === 'global') ? 'active' : '';
        let html = '<div class="friend ' + globalClass + '" onclick="openGlobalChat()">🌍 Общий чат</div>';
        
        friends.forEach(friend => {
            let activeClass = (currentChat === 'private' && currentFriend === friend) ? 'active' : '';
            html += '<div class="friend ' + activeClass + '" onclick="openPrivateChat(\'' + friend + '\')">👤 ' + escapeHtml(friend) + '</div>';
        });
        
        container.innerHTML = html;
    }
    
    // ========== ОБНОВЛЕНИЕ ОНЛАЙНА ==========
    function updateOnlineCount(count) {
        let onlineSpan = document.getElementById('onlineCount');
        if (onlineSpan) onlineSpan.innerHTML = '👥 Онлайн: ' + count;
    }
    
    // ========== ИНИЦИАЛИЗАЦИЯ СОКЕТОВ (специально для Render) ==========
    function initSocket() {
        // Получаем текущий URL страницы
        const socketUrl = window.location.origin;
        
        socket = io(socketUrl, {
            transports: ['websocket', 'polling'], // Важно для Render
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        });
        
        socket.on('connect', () => {
            console.log('✅ Socket подключен');
            updateConnectionStatus(true);
            socket.emit('user online', currentUser);
            reconnectAttempts = 0;
        });
        
        socket.on('connect_error', (error) => {
            console.log('❌ Ошибка подключения:', error);
            updateConnectionStatus(false);
        });
        
        socket.on('disconnect', (reason) => {
            console.log('🔌 Socket отключен:', reason);
            updateConnectionStatus(false);
            showToast('⚠️ Потеряно соединение с сервером, переподключение...');
        });
        
        socket.on('reconnect', (attemptNumber) => {
            console.log('🔄 Переподключен после', attemptNumber, 'попыток');
            updateConnectionStatus(true);
            socket.emit('user online', currentUser);
            showToast('✅ Соединение восстановлено!');
        });
        
        socket.on('global message', (msg) => {
            if (currentChat === 'global') {
                addMessageToUI(msg);
            }
        });
        
        socket.on('private message', (msg) => {
            if (currentChat === 'private' && currentFriend === msg.from) {
                addMessageToUI(msg);
            }
            if (msg.from !== currentUser) {
                showToast('📩 Новое сообщение от ' + msg.from);
            }
        });
        
        socket.on('online count', (count) => {
            updateOnlineCount(count);
        });
    }
    
    // ========== ОБРАБОТЧИКИ КНОПОК ==========
    document.getElementById('registerBtn').onclick = async () => {
        let username = document.getElementById('username').value.trim();
        let password = document.getElementById('password').value.trim();
        
        if (!username || !password) {
            showToast('❌ Заполните все поля!');
            return;
        }
        
        if (username.length < 3) {
            showToast('❌ Имя должно быть минимум 3 символа');
            return;
        }
        
        try {
            let res = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            let data = await res.json();
            showToast(data.message);
            if (data.success) {
                document.getElementById('username').value = '';
                document.getElementById('password').value = '';
            }
        } catch(e) {
            showToast('❌ Ошибка соединения с сервером');
        }
    };
    
    document.getElementById('loginBtn').onclick = async () => {
        let username = document.getElementById('username').value.trim();
        let password = document.getElementById('password').value.trim();
        
        if (!username || !password) {
            showToast('❌ Заполните все поля!');
            return;
        }
        
        try {
            let res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            let data = await res.json();
            
            if (data.success) {
                currentUser = username;
                friends = data.friends || [];
                
                // Скрываем логин и показываем чат
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('app').style.display = 'flex';
                
                // Инициализируем сокет
                initSocket();
                
                // Загружаем историю и отрисовываем друзей
                await loadGlobalMessages();
                renderFriends();
                
                showToast('✅ Добро пожаловать, ' + username + '!');
            } else {
                showToast('❌ Неверный логин или пароль');
            }
        } catch(e) {
            showToast('❌ Ошибка соединения с сервером');
        }
    };
    
    document.getElementById('sendBtn').onclick = () => sendMessage();
    document.getElementById('messageInput').onkeypress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };
    
    document.getElementById('addFriendBtn').onclick = async () => {
        let friend = document.getElementById('friendName').value.trim();
        if (!friend) {
            showToast('❌ Введите имя друга');
            return;
        }
        if (friend === currentUser) {
            showToast('❌ Нельзя добавить самого себя!');
            return;
        }
        
        try {
            let res = await fetch('/addFriend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: currentUser, friend: friend })
            });
            let data = await res.json();
            showToast(data.message);
            
            if (data.success && !friends.includes(friend)) {
                friends.push(friend);
                renderFriends();
                document.getElementById('friendName').value = '';
            }
        } catch(e) {
            showToast('❌ Ошибка');
        }
    };
    
    document.getElementById('gifBtn').onclick = () => {
        let gifUrl = prompt('🎬 Введите URL GIF (можно найти на giphy.com):\nПример: https://media.giphy.com/media/...');
        if (gifUrl && gifUrl.trim()) {
            if (!socket || !socket.connected) {
                showToast('❌ Нет подключения к серверу!');
                return;
            }
            if (currentChat === 'global') {
                socket.emit('global message', { from: currentUser, text: '🎬 Отправил GIF', gif: gifUrl });
            } else {
                socket.emit('private message', { from: currentUser, to: currentFriend, text: '🎬 Отправил GIF', gif: gifUrl });
            }
        }
    };
    
    document.getElementById('aiBtn').onclick = () => {
        let question = prompt('🤖 Спроси у ИИ помощника:');
        if (question && question.trim()) {
            let answers = [
                '42 — ответ на любой вопрос! 🎯',
                'Я еще маленький ИИ, но учусь! 😊',
                'Спроси что-нибудь попроще 🧠',
                'Похоже на баг, перезагрузи мозги! 🔄',
                'Ты очень умный человек! 👍',
                'Хороший вопрос! Ответ: возможно 😄'
            ];
            let answer = answers[Math.floor(Math.random() * answers.length)];
            setTimeout(() => {
                addMessageToUI({ from: '🤖 ИИ', text: '❓ ' + question + '\n\n💡 ' + answer, time: new Date() });
            }, 300);
        }
    };
    
    document.getElementById('menuToggle').onclick = () => {
        document.getElementById('sidebar').classList.toggle('open');
    };
</script>
</body>
</html>
  `);
});

// ========== API ОБРАБОТЧИКИ ==========
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.json({ success: false, message: '❌ Заполните все поля' });
  }
  
  if (users.has(username)) {
    return res.json({ success: false, message: '❌ Пользователь уже существует' });
  }
  
  users.set(username, { password, friends: [] });
  console.log('✅ Зарегистрирован:', username);
  res.json({ success: true, message: '✅ Регистрация успешна!' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  
  if (user && user.password === password) {
    console.log('✅ Вход:', username);
    res.json({ success: true, friends: user.friends });
  } else {
    res.json({ success: false });
  }
});

app.post('/addFriend', (req, res) => {
  const { user, friend } = req.body;
  
  if (!users.has(friend)) {
    return res.json({ success: false, message: '❌ Пользователь не найден' });
  }
  
  const userData = users.get(user);
  if (userData.friends.includes(friend)) {
    return res.json({ success: false, message: '❌ Уже в друзьях' });
  }
  
  userData.friends.push(friend);
  users.set(user, userData);
  console.log('✅', user, 'добавил друга', friend);
  res.json({ success: true, message: '✅ Друг добавлен!' });
});

app.get('/globalMessages', (req, res) => {
  res.json(globalMessages);
});

app.post('/privateMessages', (req, res) => {
  const { user1, user2 } = req.body;
  const key = [user1, user2].sort().join('|');
  const messages = privateMessages.get(key) || [];
  res.json(messages);
});

// ========== SOCKET.IO ==========
io.on('connection', (socket) => {
  let currentUser = null;
  
  socket.on('user online', (username) => {
    currentUser = username;
    online++;
    io.emit('online count', online);
    console.log(`🟢 ${username} подключился | Онлайн: ${online}`);
  });
  
  socket.on('global message', (msg) => {
    const message = { ...msg, time: new Date() };
    globalMessages.push(message);
    if (globalMessages.length > 100) globalMessages.shift();
    io.emit('global message', message);
    console.log(`💬 Глобал [${msg.from}]: ${msg.text}`);
  });
  
  socket.on('private message', (msg) => {
    const message = { ...msg, time: new Date() };
    const key = [msg.from, msg.to].sort().join('|');
    
    if (!privateMessages.has(key)) {
      privateMessages.set(key, []);
    }
    
    privateMessages.get(key).push(message);
    if (privateMessages.get(key).length > 50) privateMessages.get(key).shift();
    
    // Отправляем получателю
    const clients = io.sockets.sockets;
    for (let [id, client] of clients) {
      if (client.currentUser === msg.to) {
        client.emit('private message', message);
        break;
      }
    }
    
    socket.emit('private message', message);
    console.log(`💌 ЛС [${msg.from} -> ${msg.to}]: ${msg.text}`);
  });
  
  socket.on('disconnect', () => {
    if (currentUser) {
      online--;
      io.emit('online count', online);
      console.log(`🔴 ${currentUser} отключился | Онлайн: ${online}`);
    }
  });
});

// ========== ЗАПУСК СЕРВЕРА ==========
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════╗`);
  console.log(`║     ✅ Skebob Messenger запущен     ║`);
  console.log(`║     🚀 Работает на Render.com       ║`);
  console.log(`╚════════════════════════════════════╝\n`);
});
