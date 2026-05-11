const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// Простая база данных в памяти
const users = new Map();     // username -> { password, friends }
const messages = new Map();  // 'user1|user2' -> [{from, text, time, gif, image}]
let onlineUsers = new Set();

app.use(express.json({ limit: '50mb' }));

// ==================== HTML СТРАНИЦА ====================
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
        body { font-family: Arial, sans-serif; background: #1a1a2e; height: 100vh; display: flex; justify-content: center; align-items: center; }
        
        /* Экран входа */
        .login-screen { background: #16213e; padding: 40px; border-radius: 20px; width: 350px; text-align: center; }
        .login-screen h2 { color: white; margin-bottom: 20px; }
        .login-screen input { width: 100%; padding: 12px; margin: 10px 0; border-radius: 10px; border: none; background: #0f3460; color: white; }
        .login-screen button { width: 100%; padding: 12px; margin: 5px 0; border-radius: 10px; border: none; cursor: pointer; background: #e94560; color: white; font-size: 16px; }
        .login-screen .register { background: #2ecc71; }
        
        /* Основной чат */
        .chat-container { display: none; width: 1000px; max-width: 95%; height: 80vh; background: #16213e; border-radius: 20px; overflow: hidden; display: flex; }
        .sidebar { width: 250px; background: #0f3460; padding: 20px; overflow-y: auto; }
        .sidebar h3 { color: #e94560; margin-bottom: 15px; }
        .friend { padding: 10px; background: #16213e; margin: 5px 0; border-radius: 10px; cursor: pointer; color: white; }
        .friend.active { background: #e94560; }
        .friend:hover { background: #e94560; }
        .add-friend { margin-top: 20px; display: flex; gap: 8px; }
        .add-friend input { flex: 1; padding: 8px; border-radius: 10px; border: none; }
        .add-friend button { padding: 8px 12px; background: #2ecc71; border: none; border-radius: 10px; cursor: pointer; color: white; }
        
        .chat-main { flex: 1; display: flex; flex-direction: column; }
        .chat-header { padding: 15px; background: #0f3460; color: white; border-bottom: 1px solid #16213e; }
        .messages-area { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
        .message { max-width: 70%; padding: 8px 12px; border-radius: 15px; }
        .message-mine { background: #e94560; color: white; align-self: flex-end; }
        .message-other { background: #0f3460; color: white; align-self: flex-start; }
        .message-name { font-size: 11px; opacity: 0.8; margin-bottom: 4px; }
        .message-img { max-width: 200px; border-radius: 10px; margin-top: 5px; }
        
        .input-panel { display: flex; padding: 15px; background: #0f3460; gap: 8px; }
        .input-panel input { flex: 1; padding: 10px; border-radius: 20px; border: none; background: #16213e; color: white; }
        .input-panel button { padding: 8px 15px; border-radius: 20px; border: none; cursor: pointer; background: #e94560; color: white; }
        .fun-btn { background: #f39c12 !important; }
        .ai-btn { background: #9b59b6 !important; }
        .call-btn { background: #2ecc71 !important; }
        
        .gif-modal { display: none; position: fixed; bottom: 100px; right: 20px; background: #0f3460; padding: 10px; border-radius: 12px; width: 280px; flex-wrap: wrap; gap: 5px; max-height: 300px; overflow-y: auto; z-index: 100; }
        .gif-modal img { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; cursor: pointer; }
    </style>
</head>
<body>

<!-- Экран входа -->
<div id="loginScreen" class="login-screen">
    <h2>📱 Skebob Messenger</h2>
    <input type="text" id="loginName" placeholder="Имя пользователя">
    <input type="password" id="loginPass" placeholder="Пароль">
    <button id="loginBtn">Войти</button>
    <button id="registerBtn" class="register">Регистрация</button>
</div>

<!-- Чат -->
<div id="chatContainer" class="chat-container">
    <div class="sidebar">
        <h3>👥 Друзья</h3>
        <div id="friendsList"></div>
        <div class="add-friend">
            <input type="text" id="newFriend" placeholder="Имя друга">
            <button id="addFriendBtn">➕</button>
        </div>
    </div>
    <div class="chat-main">
        <div class="chat-header">
            <span id="chatTitle">Выберите друга</span>
        </div>
        <div id="messagesArea" class="messages-area"></div>
        <div class="input-panel">
            <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
            <button id="gifBtn" class="fun-btn">🎬</button>
            <button id="callBtn" class="call-btn">📞</button>
            <button id="aiBtn" class="ai-btn">🤖</button>
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
    let currentFriend = '';
    let friends = [];
    
    // ============= РЕГИСТРАЦИЯ =============
    document.getElementById('registerBtn').onclick = async () => {
        const username = document.getElementById('loginName').value;
        const password = document.getElementById('loginPass').value;
        if (!username || !password) { alert('Заполните все поля'); return; }
        const res = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        alert(data.message);
    };
    
    // ============= ВХОД =============
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
            document.getElementById('chatContainer').style.display = 'flex';
            
            // Подключаем сокет
            socket = io();
            socket.emit('user online', currentUser);
            
            // Принимаем сообщения
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
    
    // ============= ОТРИСОВКА ДРУЗЕЙ =============
    function renderFriends() {
        const container = document.getElementById('friendsList');
        container.innerHTML = '';
        friends.forEach(f => {
            const div = document.createElement('div');
            div.className = 'friend' + (currentFriend === f ? ' active' : '');
            div.innerText = f;
            div.onclick = () => openChat(f);
            container.appendChild(div);
        });
    }
    
    // ============= ОТКРЫТЬ ЧАТ С ДРУГОМ =============
    async function openChat(friend) {
        currentFriend = friend;
        document.getElementById('chatTitle').innerText = friend;
        renderFriends();
        
        const res = await fetch('/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user1: currentUser, user2: friend })
        });
        const msgs = await res.json();
        const area = document.getElementById('messagesArea');
        area.innerHTML = '';
        msgs.forEach(m => addMessage(m));
    }
    
    // ============= ДОБАВИТЬ СООБЩЕНИЕ В ЧАТ =============
    function addMessage(msg) {
        const area = document.getElementById('messagesArea');
        const div = document.createElement('div');
        div.className = 'message ' + (msg.from === currentUser ? 'message-mine' : 'message-other');
        const time = new Date(msg.time).toLocaleTimeString();
        let content = '<div class="message-name">' + msg.from + ' · ' + time + '</div>';
        content += '<div>' + escapeHtml(msg.text) + '</div>';
        if (msg.gif) content += '<img class="message-img" src="' + msg.gif + '">';
        if (msg.image) content += '<img class="message-img" src="' + msg.image + '">';
        div.innerHTML = content;
        area.appendChild(div);
        div.scrollIntoView({ behavior: 'smooth' });
    }
    
    // ============= ОТПРАВИТЬ СООБЩЕНИЕ =============
    function sendMessage() {
        const input = document.getElementById('messageInput');
        if (!input.value.trim() || !currentFriend) {
            if (!currentFriend) alert('Сначала выберите друга');
            return;
        }
        socket.emit('private message', {
            from: currentUser,
            to: currentFriend,
            text: input.value
        });
        input.value = '';
    }
    
    // ============= ДОБАВИТЬ ДРУГА =============
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
    
    // ============= GIF (РАБОТАЕТ) =============
    document.getElementById('gifBtn').onclick = async () => {
        const modal = document.getElementById('gifModal');
        if (modal.style.display === 'flex') { modal.style.display = 'none'; return; }
        modal.style.display = 'flex';
        try {
            const res = await fetch('https://tenor.googleapis.com/v2/search?q=funny&key=AIzaSyC-9oUqY5G1m-Sxulx8QJqzvqQm3XqXJpE&limit=12');
            const data = await res.json();
            modal.innerHTML = '';
            data.results.forEach(gif => {
                const img = document.createElement('img');
                img.src = gif.media_formats.gif.url;
                img.onclick = () => {
                    socket.emit('private message', { from: currentUser, to: currentFriend, text: '🎬 GIF', gif: img.src });
                    modal.style.display = 'none';
                };
                modal.appendChild(img);
            });
        } catch(e) { modal.innerHTML = 'Ошибка загрузки GIF'; }
    };
    
    // ============= ИИ-ПОМОЩНИК (РАБОТАЕТ) =============
    document.getElementById('aiBtn').onclick = async () => {
        const question = prompt('🤖 Спроси у ИИ-помощника:');
        if (!question) return;
        const res = await fetch('/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: question })
        });
        const data = await res.json();
        // Показываем ответ ИИ в чате как сообщение от бота
        addMessage({ from: '🤖 ИИ', to: currentUser, text: data.answer, time: new Date() });
    };
    
    // ============= ЗВОНОК (ДЕМО, НО КНОПКА РАБОТАЕТ) =============
    document.getElementById('callBtn').onclick = () => {
        if (!currentFriend) {
            alert('Сначала выберите друга для звонка');
            return;
        }
        alert('📞 Звонок пользователю ' + currentFriend + '!\\n(Функция звонков в разработке)');
    };
    
    // ============= ОТПРАВКА КАРТИНОК =============
    document.getElementById('fileBtn').onclick = () => document.getElementById('imageInput').click();
    document.getElementById('imageInput').onchange = (e) => {
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
</html>
  `);
});

// ==================== API ====================
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (users.has(username)) {
    return res.json({ success: false, message: 'Пользователь уже существует' });
  }
  users.set(username, { password, friends: [] });
  res.json({ success: true, message: 'Регистрация успешна! Теперь войдите.' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  if (!user || user.password !== password) {
    return res.json({ success: false });
  }
  res.json({ success: true, friends: user.friends || [] });
});

app.post('/addFriend', (req, res) => {
  const { user, friend } = req.body;
  if (!users.has(friend)) {
    return res.json({ success: false, message: 'Пользователь не найден' });
  }
  const currentUser = users.get(user);
  if (!currentUser.friends.includes(friend)) {
    currentUser.friends.push(friend);
  }
  res.json({ success: true });
});

app.post('/messages', (req, res) => {
  const { user1, user2 } = req.body;
  const key = [user1, user2].sort().join('|');
  res.json(messages.get(key) || []);
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
    const answer = data.choices?.[0]?.message?.content || 'Извините, не могу ответить на этот вопрос.';
    res.json({ answer: answer });
  } catch (error) {
    res.json({ answer: '🤖 ИИ-помощник временно недоступен. Попробуйте позже.' });
  }
});

// ==================== SOCKET.IO ====================
io.on('connection', (socket) => {
  let currentUser = '';
  
  socket.on('user online', (username) => {
    currentUser = username;
    onlineUsers.add(username);
  });
  
  socket.on('private message', (data) => {
    const { from, to, text, gif, image } = data;
    const key = [from, to].sort().join('|');
    
    if (!messages.has(key)) {
      messages.set(key, []);
    }
    
    const message = {
      from: from,
      to: to,
      text: text,
      gif: gif || null,
      image: image || null,
      time: new Date()
    };
    
    messages.get(key).push(message);
    io.emit('private message', message);
  });
  
  socket.on('disconnect', () => {
    if (currentUser) {
      onlineUsers.delete(currentUser);
    }
  });
});

// ==================== ЗАПУСК ====================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('✅ Skebob Messenger работает на порту ' + PORT);
  console.log('📱 Открывай https://rucord-p7rb.onrender.com');
});
