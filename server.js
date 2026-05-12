const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// База данных
const users = new Map();
const globalMessages = [];
const privateMessages = new Map();
let online = 0;

app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

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
        body { font-family: Arial, sans-serif; background: #1e1f22; height: 100vh; overflow: hidden; }
        
        .login-screen { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .login-box { background: #2b2d31; padding: 30px; border-radius: 20px; width: 90%; max-width: 400px; text-align: center; }
        .login-box input { width: 100%; padding: 12px; margin: 10px 0; background: #1e1f22; border: none; color: white; border-radius: 8px; }
        .login-box button { width: 100%; padding: 12px; margin: 10px 0; border: none; border-radius: 8px; cursor: pointer; background: #5865f2; color: white; font-size: 16px; }
        .register { background: #23a55a !important; }
        
        .app { display: none; height: 100vh; }
        .sidebar { position: fixed; left: -280px; top: 0; bottom: 0; width: 280px; background: #2b2d31; transition: 0.3s; z-index: 100; padding: 20px; }
        .sidebar.open { left: 0; }
        .chat-area { margin-left: 0; height: 100vh; display: flex; flex-direction: column; background: #313338; }
        .chat-header { padding: 15px; background: #2b2d31; border-bottom: 1px solid #1e1f22; display: flex; justify-content: space-between; }
        .messages-area { flex: 1; overflow-y: auto; padding: 20px; }
        .message { margin-bottom: 15px; display: flex; gap: 10px; }
        .message-mine { flex-direction: row-reverse; }
        .message-text { background: #2b2d31; padding: 8px 12px; border-radius: 15px; max-width: 70%; word-wrap: break-word; }
        .message-mine .message-text { background: #5865f2; }
        .input-panel { padding: 15px; background: #2b2d31; display: flex; gap: 10px; }
        .input-panel input { flex: 1; padding: 10px; background: #1e1f22; border: none; color: white; border-radius: 20px; }
        .input-panel button { padding: 10px 20px; background: #5865f2; border: none; color: white; border-radius: 20px; cursor: pointer; }
        
        .menu-toggle { position: fixed; bottom: 20px; left: 20px; background: #5865f2; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; z-index: 200; border: none; font-size: 24px; }
        
        @media (min-width: 768px) {
            .sidebar { position: relative; left: 0; width: 280px; }
            .menu-toggle { display: none; }
            .app { display: flex !important; flex-direction: row; }
            .chat-area { flex: 1; }
        }
        
        .friend { padding: 10px; margin: 5px 0; background: #1e1f22; border-radius: 8px; cursor: pointer; color: white; }
        .friend:hover { background: #5865f2; }
    </style>
</head>
<body>

<div class="login-screen" id="loginScreen">
    <div class="login-box">
        <h1 style="color: white;">Skebob Messenger</h1>
        <input type="text" id="username" placeholder="Имя пользователя">
        <input type="password" id="password" placeholder="Пароль">
        <button id="loginBtn">Войти</button>
        <button id="registerBtn" class="register">Зарегистрироваться</button>
    </div>
</div>

<div class="app" id="app">
    <div class="sidebar" id="sidebar">
        <h3 style="color: white; margin-bottom: 20px;">Друзья</h3>
        <div id="friendsList"></div>
        <div style="margin-top: 20px;">
            <input type="text" id="friendName" placeholder="Имя друга" style="width: 100%; padding: 8px; margin-bottom: 10px;">
            <button id="addFriendBtn" style="width: 100%; padding: 8px;">Добавить</button>
        </div>
    </div>
    
    <div class="chat-area">
        <div class="chat-header">
            <h2 id="chatTitle" style="color: white;">Общий чат</h2>
            <div>
                <button id="gifBtn" style="background: #e67e22; padding: 5px 10px; margin: 0 5px; border: none; border-radius: 5px; color: white; cursor: pointer;">GIF</button>
                <button id="aiBtn" style="background: #9b59b6; padding: 5px 10px; margin: 0 5px; border: none; border-radius: 5px; color: white; cursor: pointer;">ИИ</button>
            </div>
        </div>
        <div class="messages-area" id="messagesArea"></div>
        <div class="input-panel">
            <input type="text" id="messageInput" placeholder="Введите сообщение...">
            <button id="sendBtn">Отправить</button>
        </div>
    </div>
</div>

<button class="menu-toggle" id="menuToggle">☰</button>

<script src="/socket.io/socket.io.js"></script>
<script>
    let socket = null;
    let currentUser = '';
    let currentChat = 'global';
    let friends = [];
    
    // Функция показа уведомлений
    function showToast(msg) {
        let toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = '#2b2d31';
        toast.style.color = 'white';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '20px';
        toast.style.zIndex = '9999';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
    // Регистрация
    document.getElementById('registerBtn').onclick = async () => {
        let username = document.getElementById('username').value;
        let password = document.getElementById('password').value;
        
        if (!username || !password) {
            showToast('Заполните все поля!');
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
        } catch(e) {
            showToast('Ошибка соединения');
        }
    };
    
    // Вход
    document.getElementById('loginBtn').onclick = async () => {
        let username = document.getElementById('username').value;
        let password = document.getElementById('password').value;
        
        if (!username || !password) {
            showToast('Заполните все поля!');
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
                
                // Подключаем сокет
                socket = io();
                
                socket.on('connect', () => {
                    socket.emit('user online', currentUser);
                });
                
                socket.on('global message', (msg) => {
                    if (currentChat === 'global') {
                        addMessage(msg);
                    }
                });
                
                socket.on('private message', (msg) => {
                    if (currentChat === msg.from) {
                        addMessage(msg);
                    }
                });
                
                socket.on('online count', (count) => {
                    console.log('Онлайн:', count);
                });
                
                // Загружаем историю
                loadGlobalMessages();
                renderFriends();
                showToast('Добро пожаловать, ' + username);
            } else {
                showToast('Неверный логин или пароль');
            }
        } catch(e) {
            showToast('Ошибка соединения');
        }
    };
    
    // Отправка сообщения
    document.getElementById('sendBtn').onclick = () => sendMessage();
    document.getElementById('messageInput').onkeypress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };
    
    function sendMessage() {
        let input = document.getElementById('messageInput');
        let text = input.value.trim();
        
        if (!text) return;
        
        if (currentChat === 'global') {
            socket.emit('global message', { from: currentUser, text: text });
        } else {
            socket.emit('private message', { from: currentUser, to: currentChat, text: text });
        }
        
        input.value = '';
    }
    
    function addMessage(msg) {
        let area = document.getElementById('messagesArea');
        let div = document.createElement('div');
        div.className = 'message ' + (msg.from === currentUser ? 'message-mine' : '');
        div.innerHTML = '<div><strong>' + msg.from + '</strong><br><div class="message-text">' + msg.text + '</div><small>' + new Date(msg.time).toLocaleTimeString() + '</small></div>';
        area.appendChild(div);
        div.scrollIntoView({ behavior: 'smooth' });
    }
    
    async function loadGlobalMessages() {
        try {
            let res = await fetch('/globalMessages');
            let messages = await res.json();
            let area = document.getElementById('messagesArea');
            area.innerHTML = '';
            messages.forEach(m => addMessage(m));
        } catch(e) {
            console.error('Ошибка загрузки сообщений');
        }
    }
    
    function renderFriends() {
        let container = document.getElementById('friendsList');
        container.innerHTML = '<div class="friend" onclick="openGlobalChat()">🌍 Общий чат</div>';
        
        friends.forEach(friend => {
            let div = document.createElement('div');
            div.className = 'friend';
            div.textContent = '👤 ' + friend;
            div.onclick = () => openPrivateChat(friend);
            container.appendChild(div);
        });
    }
    
    window.openGlobalChat = function() {
        currentChat = 'global';
        document.getElementById('chatTitle').innerHTML = 'Общий чат';
        loadGlobalMessages();
        if (window.innerWidth < 768) {
            document.getElementById('sidebar').classList.remove('open');
        }
    };
    
    window.openPrivateChat = async function(friend) {
        currentChat = friend;
        document.getElementById('chatTitle').innerHTML = 'Чат с ' + friend;
        
        try {
            let res = await fetch('/privateMessages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user1: currentUser, user2: friend })
            });
            let messages = await res.json();
            let area = document.getElementById('messagesArea');
            area.innerHTML = '';
            messages.forEach(m => addMessage(m));
        } catch(e) {
            console.error('Ошибка загрузки ЛС');
        }
        
        if (window.innerWidth < 768) {
            document.getElementById('sidebar').classList.remove('open');
        }
    };
    
    // Добавление друга
    document.getElementById('addFriendBtn').onclick = async () => {
        let friend = document.getElementById('friendName').value;
        if (!friend) return;
        
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
            showToast('Ошибка');
        }
    };
    
    // GIF
    document.getElementById('gifBtn').onclick = async () => {
        let gifUrl = prompt('Введите URL GIF (или выбери из популярных):\nhttps://media.giphy.com/media/...');
        if (gifUrl) {
            if (currentChat === 'global') {
                socket.emit('global message', { from: currentUser, text: '🎬 GIF', gif: gifUrl });
            } else {
                socket.emit('private message', { from: currentUser, to: currentChat, text: '🎬 GIF', gif: gifUrl });
            }
        }
    };
    
    // ИИ
    document.getElementById('aiBtn').onclick = () => {
        let question = prompt('🤖 Спроси у ИИ:');
        if (question) {
            setTimeout(() => {
                let answers = [
                    '42 — ответ на любой вопрос!',
                    'Я еще маленький ИИ, не знаю 😢',
                    'Спроси что-нибудь попроще',
                    'Похоже на баг, надо перезагрузить',
                    'Ты очень умный!'
                ];
                let answer = answers[Math.floor(Math.random() * answers.length)];
                addMessage({ from: '🤖 ИИ', text: answer, time: new Date() });
            }, 500);
        }
    };
    
    // Меню на мобилках
    document.getElementById('menuToggle').onclick = () => {
        document.getElementById('sidebar').classList.toggle('open');
    };
</script>
</body>
</html>
  `);
});

// API обработчики
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  
  if (users.has(username)) {
    return res.json({ success: false, message: 'Пользователь уже существует' });
  }
  
  users.set(username, { password, friends: [] });
  console.log('Зарегистрирован:', username);
  res.json({ success: true, message: 'Регистрация успешна!' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  
  if (user && user.password === password) {
    res.json({ success: true, friends: user.friends });
  } else {
    res.json({ success: false });
  }
});

app.post('/addFriend', (req, res) => {
  const { user, friend } = req.body;
  
  if (!users.has(friend)) {
    return res.json({ success: false, message: 'Пользователь не найден' });
  }
  
  const userData = users.get(user);
  if (userData.friends.includes(friend)) {
    return res.json({ success: false, message: 'Уже в друзьях' });
  }
  
  userData.friends.push(friend);
  users.set(user, userData);
  res.json({ success: true, message: 'Друг добавлен' });
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

// Socket.IO
io.on('connection', (socket) => {
  let currentUser = null;
  
  socket.on('user online', (username) => {
    currentUser = username;
    online++;
    io.emit('online count', online);
    console.log(`${username} онлайн, всего: ${online}`);
  });
  
  socket.on('global message', (msg) => {
    const message = { ...msg, time: new Date() };
    globalMessages.push(message);
    if (globalMessages.length > 100) globalMessages.shift();
    io.emit('global message', message);
    console.log('Глобал:', msg.from, msg.text);
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
    console.log('ЛС от', msg.from, 'к', msg.to);
  });
  
  socket.on('disconnect', () => {
    if (currentUser) {
      online--;
      io.emit('online count', online);
      console.log(`${currentUser} отключился, всего: ${online}`);
    }
  });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n✅ Сервер запущен!`);
  console.log(`📱 Открой браузер: http://localhost:${PORT}`);
  console.log(`👥 Чтобы зайти - зарегистрируйся и войди\n`);
});
