const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// База данных пользователей
const users = new Map();
let onlineUsers = new Set();
let messagesCache = { 'Общий': [] };

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Skebob Messenger</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Whitney', 'Helvetica Neue', 'Segoe UI', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
            background: #1e1f22;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Контейнер авторизации в стиле Discord */
        .auth-container {
            background: #2b2d31;
            border-radius: 8px;
            width: 480px;
            max-width: 90%;
            padding: 32px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
        }

        .auth-header {
            text-align: center;
            margin-bottom: 32px;
        }

        .auth-header h1 {
            font-size: 24px;
            font-weight: 600;
            color: white;
            margin-bottom: 8px;
        }

        .auth-header p {
            color: #949ba4;
            font-size: 14px;
        }

        .logo {
            font-size: 48px;
            margin-bottom: 12px;
        }

        .input-group {
            margin-bottom: 20px;
        }

        .input-group label {
            display: block;
            color: #b5bac1;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 8px;
            text-transform: uppercase;
        }

        .input-group input {
            width: 100%;
            padding: 12px;
            background: #1e1f22;
            border: none;
            border-radius: 4px;
            color: white;
            font-size: 16px;
            transition: 0.1s;
        }

        .input-group input:focus {
            outline: none;
            border: 1px solid #5865f2;
            background: #1e1f22;
        }

        .input-group input::placeholder {
            color: #4e5058;
        }

        .auth-btn {
            width: 100%;
            padding: 12px;
            background: #5865f2;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            margin-top: 8px;
            transition: 0.2s;
        }

        .auth-btn:hover {
            background: #4752c4;
        }

        .toggle-link {
            text-align: center;
            margin-top: 16px;
            color: #949ba4;
            font-size: 14px;
        }

        .toggle-link button {
            background: none;
            border: none;
            color: #00a8fc;
            cursor: pointer;
            font-size: 14px;
        }

        .toggle-link button:hover {
            text-decoration: underline;
        }

        .error-message {
            background: #e83c3c;
            color: white;
            padding: 10px;
            border-radius: 4px;
            font-size: 14px;
            text-align: center;
            margin-bottom: 16px;
            display: none;
        }

        /* Чат интерфейс */
        .chat-container {
            display: none;
            width: 100%;
            height: 100vh;
            background: #313338;
            flex-direction: column;
        }

        .chat-header {
            background: #2b2d31;
            padding: 16px 20px;
            border-bottom: 1px solid #1e1f22;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .chat-header h2 {
            color: white;
            font-size: 16px;
            font-weight: 600;
        }

        .online-count {
            color: #949ba4;
            font-size: 14px;
        }

        .messages-area {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .message {
            display: flex;
            gap: 12px;
            animation: fadeIn 0.2s;
        }

        .message-mine {
            flex-direction: row-reverse;
        }

        .message-avatar {
            width: 40px;
            height: 40px;
            background: #5865f2;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
        }

        .message-content {
            flex: 1;
            max-width: 70%;
        }

        .message-mine .message-content {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }

        .message-header {
            display: flex;
            gap: 8px;
            align-items: baseline;
            margin-bottom: 4px;
        }

        .message-name {
            color: white;
            font-weight: 500;
            font-size: 14px;
        }

        .message-time {
            color: #949ba4;
            font-size: 11px;
        }

        .message-text {
            background: #2b2d31;
            padding: 8px 12px;
            border-radius: 8px;
            color: #dbdee1;
            font-size: 14px;
            word-wrap: break-word;
        }

        .message-mine .message-text {
            background: #5865f2;
            color: white;
        }

        .message-img {
            max-width: 250px;
            border-radius: 8px;
            margin-top: 6px;
        }

        .system-message {
            text-align: center;
            color: #949ba4;
            font-size: 12px;
            margin: 8px 0;
        }

        .typing-status {
            padding: 8px 20px;
            color: #949ba4;
            font-size: 12px;
            font-style: italic;
        }

        .input-panel {
            padding: 16px 20px;
            background: #2b2d31;
            display: flex;
            gap: 12px;
            border-top: 1px solid #1e1f22;
        }

        .input-panel input {
            flex: 1;
            padding: 12px;
            background: #1e1f22;
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 14px;
        }

        .input-panel input:focus {
            outline: none;
        }

        .input-panel button {
            padding: 12px 20px;
            background: #5865f2;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
        }

        .file-btn {
            background: #4e5058;
        }

        .ai-btn {
            background: #23a55a;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>

<!-- Экран авторизации в стиле Discord -->
<div id="authContainer" class="auth-container">
    <div class="auth-header">
        <div class="logo">💬</div>
        <h1>Skebob Messenger</h1>
        <p>Чат, где всегда весело</p>
    </div>
    
    <div id="errorMsg" class="error-message"></div>
    
    <div id="loginForm">
        <div class="input-group">
            <label>ЭЛЕКТРОННАЯ ПОЧТА ИЛИ ТЕЛЕФОН</label>
            <input type="text" id="loginUsername" placeholder="Имя пользователя">
        </div>
        <div class="input-group">
            <label>ПАРОЛЬ</label>
            <input type="password" id="loginPassword" placeholder="••••••••">
        </div>
        <button class="auth-btn" id="loginBtn">Войти</button>
        <div class="toggle-link">
            Нужен аккаунт? <button id="showRegisterBtn">Зарегистрироваться</button>
        </div>
    </div>
    
    <div id="registerForm" style="display: none;">
        <div class="input-group">
            <label>ИМЯ ПОЛЬЗОВАТЕЛЯ</label>
            <input type="text" id="regUsername" placeholder="Введите имя">
        </div>
        <div class="input-group">
            <label>ПАРОЛЬ</label>
            <input type="password" id="regPassword" placeholder="••••••••">
        </div>
        <div class="input-group">
            <label>ПОДТВЕРДИТЕ ПАРОЛЬ</label>
            <input type="password" id="regConfirmPassword" placeholder="••••••••">
        </div>
        <button class="auth-btn" id="registerBtn">Зарегистрироваться</button>
        <div class="toggle-link">
            Уже есть аккаунт? <button id="showLoginBtn">Войти</button>
        </div>
    </div>
</div>

<!-- Чат -->
<div id="chatContainer" class="chat-container">
    <div class="chat-header">
        <h2># общий-чат</h2>
        <span class="online-count" id="onlineCount">🌟 0 онлайн</span>
    </div>
    <div id="messagesArea" class="messages-area"></div>
    <div id="typingStatus" class="typing-status"></div>
    <div class="input-panel">
        <input type="text" id="messageInput" placeholder="Введите сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
        <button class="file-btn" id="fileBtn">📎</button>
        <button class="ai-btn" id="aiBtn">🤖</button>
        <button onclick="sendMessage()">💬</button>
    </div>
    <input type="file" id="imageInput" accept="image/*" style="display: none;">
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
    let socket;
    let currentUser = '';
    
    // Переключение между формами
    document.getElementById('showRegisterBtn').onclick = () => {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    };
    document.getElementById('showLoginBtn').onclick = () => {
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
    };
    
    function showError(msg) {
        const errDiv = document.getElementById('errorMsg');
        errDiv.textContent = msg;
        errDiv.style.display = 'block';
        setTimeout(() => errDiv.style.display = 'none', 3000);
    }
    
    // Регистрация
    document.getElementById('registerBtn').onclick = () => {
        const username = document.getElementById('regUsername').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regConfirmPassword').value;
        
        if (!username || !password) {
            showError('Заполните все поля');
            return;
        }
        if (password !== confirm) {
            showError('Пароли не совпадают');
            return;
        }
        
        fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(res => res.json()).then(data => {
            if (data.success) {
                showError('✅ Регистрация успешна! Теперь войдите.');
                document.getElementById('showLoginBtn').click();
            } else {
                showError(data.message);
            }
        });
    };
    
    // Логин
    document.getElementById('loginBtn').onclick = () => {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        if (!username || !password) {
            showError('Введите имя и пароль');
            return;
        }
        
        fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(res => res.json()).then(data => {
            if (data.success) {
                currentUser = username;
                document.getElementById('authContainer').style.display = 'none';
                document.getElementById('chatContainer').style.display = 'flex';
                initSocket();
                loadMessages();
            } else {
                showError('Неверное имя или пароль');
            }
        });
    };
    
    function initSocket() {
        socket = io();
        socket.emit('set user', currentUser);
        
        socket.on('chat message', (msg) => {
            addMessage(msg);
        });
        
        socket.on('user joined', (data) => {
            addSystemMessage('✨ ' + data.username + ' присоединился ✨');
            document.getElementById('onlineCount').innerHTML = '🌟 ' + data.onlineCount + ' онлайн';
        });
        
        socket.on('user left', (data) => {
            addSystemMessage('👋 ' + data.username + ' покинул чат');
            document.getElementById('onlineCount').innerHTML = '🌟 ' + data.onlineCount + ' онлайн';
        });
        
        socket.on('typing', (username) => {
            document.getElementById('typingStatus').innerHTML = '✏️ ' + username + ' печатает...';
            setTimeout(() => {
                if (document.getElementById('typingStatus').innerHTML.includes(username)) {
                    document.getElementById('typingStatus').innerHTML = '';
                }
            }, 2000);
        });
        
        socket.on('history', (messages) => {
            document.getElementById('messagesArea').innerHTML = '';
            messages.forEach(m => addMessage(m));
        });
    }
    
    function loadMessages() {
        fetch('/messages').then(res => res.json()).then(messages => {
            document.getElementById('messagesArea').innerHTML = '';
            messages.forEach(m => addMessage(m));
        });
    }
    
    function addMessage(msg) {
        const messagesDiv = document.getElementById('messagesArea');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ' + (msg.from === currentUser ? 'message-mine' : '');
        
        const time = new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const avatarLetter = (msg.from[0] || '?').toUpperCase();
        
        messageDiv.innerHTML = 
            '<div class="message-avatar">' + avatarLetter + '</div>' +
            '<div class="message-content">' +
                '<div class="message-header">' +
                    '<span class="message-name">' + escapeHtml(msg.from) + '</span>' +
                    '<span class="message-time">' + time + '</span>' +
                '</div>' +
                '<div class="message-text">' + escapeHtml(msg.text) + '</div>' +
                (msg.image ? '<img class="message-img" src="' + msg.image + '">' : '') +
            '</div>';
        
        messagesDiv.appendChild(messageDiv);
        messageDiv.scrollIntoView({ behavior: 'smooth' });
        
        if (msg.from !== currentUser) {
            try {
                new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3').play();
            } catch(e) {}
        }
    }
    
    function addSystemMessage(text) {
        const div = document.createElement('div');
        div.className = 'system-message';
        div.innerText = text;
        document.getElementById('messagesArea').appendChild(div);
        div.scrollIntoView({ behavior: 'smooth' });
    }
    
    function sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        if (!text) return;
        
        socket.emit('chat message', { text: text, from: currentUser });
        input.value = '';
    }
    
    document.getElementById('messageInput').addEventListener('input', () => {
        socket.emit('typing', currentUser);
    });
    
    document.getElementById('fileBtn').onclick = () => {
        document.getElementById('imageInput').click();
    };
    
    document.getElementById('imageInput').onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            socket.emit('chat message', { text: '📷 Изображение', image: ev.target.result, from: currentUser });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };
    
    document.getElementById('aiBtn').onclick = () => {
        const question = prompt('🤖 Спроси у ИИ-помощника:');
        if (question) {
            fetch('/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question })
            }).then(res => res.json()).then(data => {
                addMessage({
                    from: '🤖 Skebob AI',
                    text: data.answer,
                    time: new Date(),
                    image: null
                });
            });
        }
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
</html>
  `);
});

// API
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (users.has(username)) {
    return res.json({ success: false, message: 'Пользователь уже существует' });
  }
  users.set(username, { password, role: 'user' });
  res.json({ success: true, message: 'OK' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  if (!user || user.password !== password) {
    return res.json({ success: false });
  }
  res.json({ success: true });
});

app.get('/messages', (req, res) => {
  res.json(messagesCache['Общий'] || []);
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
    const answer = data.choices?.[0]?.message?.content || 'Не могу ответить';
    res.json({ answer: answer });
  } catch(e) {
    res.json({ answer: '🤖 ИИ пока недоступен' });
  }
});

// Socket.IO
let online = new Set();

io.on('connection', (socket) => {
  let currentUser = '';
  
  socket.on('set user', (username) => {
    currentUser = username;
    online.add(username);
    io.emit('user joined', { username: username, onlineCount: online.size });
  });
  
  socket.on('chat message', (msg) => {
    const message = {
      from: msg.from,
      text: msg.text,
      image: msg.image || null,
      time: new Date()
    };
    messagesCache['Общий'].push(message);
    if (messagesCache['Общий'].length > 100) messagesCache['Общий'].shift();
    io.emit('chat message', message);
  });
  
  socket.on('typing', (username) => {
    socket.broadcast.emit('typing', username);
  });
  
  socket.on('disconnect', () => {
    if (currentUser) {
      online.delete(currentUser);
      io.emit('user left', { username: currentUser, onlineCount: online.size });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('💬 Skebob Messenger работает на порту ' + PORT);
});
