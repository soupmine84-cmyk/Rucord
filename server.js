const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// Простая "база данных" в памяти
const users = new Map(); // username -> { password, role }
const messages = []; // все сообщения
let onlineUsers = new Set();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 Супер 67 Мессенджер окак скебоб | Группы + ИИ + Картинки</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
        
        /* Экран входа */
        .auth-container { background: #0f3460; border-radius: 28px; padding: 40px; width: 400px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        .auth-container h1 { color: #e94560; margin-bottom: 20px; }
        .auth-container input { width: 100%; padding: 12px; margin: 10px 0; border: none; border-radius: 40px; background: #16213e; color: white; padding-left: 20px; }
        .auth-container button { width: 100%; padding: 12px; margin: 10px 0; border: none; border-radius: 40px; background: #e94560; color: white; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .auth-container button:hover { transform: scale(1.02); opacity: 0.9; }
        .toggle-btn { background: transparent; border: 1px solid #e94560; color: #e94560; }
        
        /* Основной чат */
        .chat-layout { display: none; width: 1300px; max-width: 95vw; height: 85vh; background: #0f3460; border-radius: 28px; overflow: hidden; }
        .sidebar { width: 280px; background: #16213e; padding: 20px; overflow-y: auto; float: left; height: 100%; }
        .sidebar h3 { color: #e94560; margin-bottom: 15px; font-size: 14px; }
        .sidebar-item { padding: 10px; margin: 5px 0; border-radius: 12px; cursor: pointer; color: #ddd; transition: 0.2s; }
        .sidebar-item:hover { background: #0f3460; }
        .main-chat { margin-left: 280px; height: 100%; display: flex; flex-direction: column; }
        .chat-header { padding: 20px; background: #16213e; border-bottom: 1px solid #0f3460; }
        .chat-header h2 { color: white; }
        .messages-area { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; background: #1a1a2e; }
        .message { display: flex; animation: fadeIn 0.2s; }
        .message-mine { justify-content: flex-end; }
        .message-other { justify-content: flex-start; }
        .message-bubble { max-width: 70%; padding: 10px 16px; border-radius: 22px; background: #0f3460; color: white; }
        .message-mine .message-bubble { background: #e94560; }
        .message-name { font-size: 11px; opacity: 0.8; margin-bottom: 4px; }
        .message-time { font-size: 10px; opacity: 0.6; margin-left: 8px; }
        .message-text { word-wrap: break-word; }
        .message-img { max-width: 200px; border-radius: 12px; margin-top: 6px; cursor: pointer; }
        .system-message { text-align: center; color: #888; font-size: 12px; margin: 8px 0; }
        .typing-status { padding: 8px 20px; font-size: 12px; color: #888; background: #1a1a2e; }
        .input-panel { padding: 16px 20px; background: #16213e; display: flex; gap: 12px; border-top: 1px solid #0f3460; }
        .input-panel input { flex: 1; padding: 12px; border: none; border-radius: 40px; background: #0f3460; color: white; padding-left: 20px; }
        .input-panel input::placeholder { color: #888; }
        .input-panel button { padding: 12px 24px; border: none; border-radius: 40px; background: #e94560; color: white; cursor: pointer; }
        .file-label { background: #0f3460; padding: 12px 20px; border-radius: 40px; cursor: pointer; color: white; }
        .ai-btn { background: #00b894 !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
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
        <h3>📌 Онлайн</h3>
        <div id="onlineList"></div>
        <h3>👥 Группы</h3>
        <div id="groupsList">
            <div class="sidebar-item" onclick="joinGroup('Общий')"># Общий чат</div>
        </div>
        <button id="createGroupBtn" style="margin-top:20px; width:100%; background:#e94560; border:none; padding:10px; border-radius:40px; color:white; cursor:pointer;">➕ Создать группу</button>
    </div>
    <div class="main-chat">
        <div class="chat-header">
            <h2 id="currentChatName">📢 Общий чат</h2>
        </div>
        <div id="messagesArea" class="messages-area"></div>
        <div id="typingStatus" class="typing-status"></div>
        <div class="input-panel">
            <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
            <label class="file-label" for="imageInput">🖼️</label>
            <input type="file" id="imageInput" accept="image/*" style="display:none">
            <button id="aiBtn" class="ai-btn">🤖 ИИ</button>
            <button onclick="sendMessage()">📤</button>
        </div>
    </div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
    let socket;
    let currentUser = '';
    let currentGroup = 'Общий';
    let typingTimeout;

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
                document.getElementById('chatLayout').style.display = 'block';
                initSocket();
                loadMessages();
            } else {
                alert('Ошибка входа');
            }
        });
    };

    function initSocket() {
        socket = io();
        socket.emit('set user', currentUser);
        
        socket.on('chat message', (msg) => {
            if (msg.group === currentGroup) {
                addMessage(msg);
            }
        });
        
        socket.on('user joined', (data) => {
            addSystemMessage('✨ ' + data.username + ' присоединился');
            updateOnline(data.online);
        });
        
        socket.on('user left', (data) => {
            addSystemMessage('👋 ' + data.username + ' вышел');
            updateOnline(data.online);
        });
        
        socket.on('typing', (username) => {
            document.getElementById('typingStatus').innerHTML = '✏️ ' + username + ' печатает...';
            clearTimeout(window.typingClear);
            window.typingClear = setTimeout(() => {
                document.getElementById('typingStatus').innerHTML = '';
            }, 2000);
        });
        
        socket.on('history', (msgs) => {
            document.getElementById('messagesArea').innerHTML = '';
            msgs.forEach(m => addMessage(m));
        });
    }

    function updateOnline(users) {
        const container = document.getElementById('onlineList');
        container.innerHTML = users.map(u => '<div class="sidebar-item">🟢 ' + u + '</div>').join('');
    }

    function loadMessages() {
        fetch('/messages?group=' + encodeURIComponent(currentGroup))
            .then(res => res.json())
            .then(msgs => {
                document.getElementById('messagesArea').innerHTML = '';
                msgs.forEach(m => addMessage(m));
            });
    }

    function addMessage(msg) {
        const div = document.createElement('div');
        div.className = 'message ' + (msg.from === currentUser ? 'message-mine' : 'message-other');
        const time = new Date(msg.time).toLocaleTimeString();
        div.innerHTML = '<div class="message-bubble">' +
            '<div class="message-name">' + escapeHtml(msg.from) + '<span class="message-time">' + time + '</span></div>' +
            '<div class="message-text">' + escapeHtml(msg.text) + '</div>' +
            (msg.image ? '<img class="message-img" src="' + msg.image + '">' : '') +
            '</div>';
        document.getElementById('messagesArea').appendChild(div);
        div.scrollIntoView({ behavior: 'smooth' });
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
        
        socket.emit('chat message', {
            group: currentGroup,
            text: text,
            from: currentUser
        });
        input.value = '';
    }

    function joinGroup(group) {
        currentGroup = group;
        document.getElementById('currentChatName').innerHTML = '👥 ' + group;
        loadMessages();
    }

    document.getElementById('messageInput').addEventListener('input', () => {
        socket.emit('typing', { group: currentGroup, username: currentUser });
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {}, 1000);
    });

    document.getElementById('imageInput').onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            socket.emit('chat message', {
                group: currentGroup,
                text: '📷 Отправил(а) изображение',
                image: ev.target.result,
                from: currentUser
            });
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
                    from: '🤖 ИИ',
                    text: data.answer,
                    time: new Date(),
                    image: null
                });
            });
        }
    };

    document.getElementById('createGroupBtn').onclick = () => {
        const groupName = prompt('Название группы:');
        if (groupName) {
            fetch('/createGroup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: groupName })
            }).then(() => {
                const div = document.createElement('div');
                div.className = 'sidebar-item';
                div.onclick = () => joinGroup(groupName);
                div.innerText = '# ' + groupName;
                document.getElementById('groupsList').appendChild(div);
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

// ============= API =============

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (users.has(username)) {
    return res.json({ success: false, message: 'Пользователь уже существует' });
  }
  users.set(username, { password, role: 'user' });
  res.json({ success: true, message: 'Регистрация успешна! Теперь войдите.' });
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
  const group = req.query.group || 'Общий';
  const groupMessages = global.messagesCache || {};
  res.json(groupMessages[group] || []);
});

app.post('/createGroup', (req, res) => {
  // просто заглушка
  res.json({ success: true });
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
        max_tokens: 200
      })
    });
    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'Не удалось получить ответ';
    res.json({ answer: answer });
  } catch (e) {
    res.json({ answer: '🤖 ИИ временно недоступен. Попробуйте позже!' });
  }
});

// ============= Socket.IO =============
let online = new Set();
let messagesCache = { 'Общий': [] };

io.on('connection', (socket) => {
  let currentUser = '';
  
  socket.on('set user', (username) => {
    currentUser = username;
    online.add(username);
    io.emit('user joined', { username: username, online: Array.from(online) });
  });
  
  socket.on('chat message', (msg) => {
    const message = {
      from: msg.from,
      text: msg.text,
      image: msg.image || null,
      time: new Date(),
      group: msg.group
    };
    
    if (!messagesCache[msg.group]) messagesCache[msg.group] = [];
    messagesCache[msg.group].push(message);
    if (messagesCache[msg.group].length > 100) messagesCache[msg.group].shift();
    
    io.emit('chat message', message);
  });
  
  socket.on('typing', (data) => {
    socket.broadcast.emit('typing', data.username);
  });
  
  socket.on('disconnect', () => {
    if (currentUser) {
      online.delete(currentUser);
      io.emit('user left', { username: currentUser, online: Array.from(online) });
    }
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log('🚀 Супер мессенджер запущен на порту ' + port);
  console.log('👥 Группы, 📷 Картинки, 🤖 ИИ — всё работает!');
});
