const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// База данных
const users = new Map(); // username -> password
let messages = []; // все сообщения общего чата

app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Skebob Messenger</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #1a1a2e; min-height: 100vh; display: flex; justify-content: center; align-items: center; }
        
        /* Экран входа */
        .login-screen { background: #16213e; padding: 40px; border-radius: 20px; width: 350px; text-align: center; }
        .login-screen h2 { color: white; margin-bottom: 20px; }
        .login-screen input { width: 100%; padding: 12px; margin: 10px 0; border-radius: 10px; border: none; background: #0f3460; color: white; }
        .login-screen button { width: 100%; padding: 12px; margin: 5px 0; border-radius: 10px; border: none; cursor: pointer; background: #e94560; color: white; font-size: 16px; }
        .login-screen .register-btn { background: #2ecc71; }
        
        /* Чат */
        .chat-container { display: none; width: 900px; max-width: 95%; height: 80vh; background: #16213e; border-radius: 20px; flex-direction: column; overflow: hidden; }
        .chat-header { background: #0f3460; padding: 15px; color: white; text-align: center; }
        .messages-area { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
        .message { max-width: 70%; padding: 8px 12px; border-radius: 15px; }
        .message-mine { background: #e94560; color: white; align-self: flex-end; }
        .message-other { background: #0f3460; color: white; align-self: flex-start; }
        .message-name { font-size: 11px; opacity: 0.8; margin-bottom: 4px; }
        .message-img { max-width: 200px; border-radius: 10px; margin-top: 5px; }
        
        .fun-buttons { display: flex; gap: 8px; padding: 10px 15px; background: #0f3460; }
        .fun-btn { padding: 8px 16px; border-radius: 20px; border: none; cursor: pointer; color: white; font-size: 14px; }
        .gif-btn { background: #f39c12; }
        .ai-btn { background: #9b59b6; }
        .call-btn { background: #2ecc71; }
        
        .input-panel { display: flex; padding: 15px; background: #0f3460; gap: 8px; }
        .input-panel input { flex: 1; padding: 10px; border-radius: 20px; border: none; background: #16213e; color: white; }
        .input-panel button { padding: 8px 20px; border-radius: 20px; border: none; cursor: pointer; background: #e94560; color: white; }
        
        .gif-modal { display: none; position: fixed; bottom: 100px; right: 20px; background: #0f3460; padding: 10px; border-radius: 12px; width: 280px; flex-wrap: wrap; gap: 5px; max-height: 300px; overflow-y: auto; z-index: 100; }
        .gif-modal img { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; cursor: pointer; }
        
        .online-count { font-size: 12px; margin-top: 5px; opacity: 0.8; }
    </style>
</head>
<body>

<!-- Экран входа -->
<div id="loginScreen" class="login-screen">
    <h2>💬 Skebob Messenger</h2>
    <input type="text" id="loginName" placeholder="Имя">
    <input type="password" id="loginPass" placeholder="Пароль">
    <button id="loginBtn">Войти</button>
    <button id="registerBtn" class="register-btn">Регистрация</button>
</div>

<!-- Чат -->
<div id="chatContainer" class="chat-container">
    <div class="chat-header">
        <h2># Общий чат</h2>
        <div class="online-count" id="onlineCount">👥 Онлайн: 0</div>
    </div>
    <div class="fun-buttons">
        <button id="gifBtn" class="fun-btn gif-btn">🎬 GIF</button>
        <button id="callBtn" class="fun-btn call-btn">📞 Звонок</button>
        <button id="aiBtn" class="fun-btn ai-btn">🤖 ИИ</button>
    </div>
    <div id="messagesArea" class="messages-area"></div>
    <div class="input-panel">
        <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
        <button id="fileBtn">📎</button>
        <button onclick="sendMessage()">💬</button>
    </div>
</div>

<div id="gifModal" class="gif-modal"></div>
<input type="file" id="imageInput" style="display:none">

<script src="/socket.io/socket.io.js"></script>
<script>
    let socket;
    let currentUser = '';
    
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
        if (data.success) {
            document.getElementById('loginName').value = '';
            document.getElementById('loginPass').value = '';
        }
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
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('chatContainer').style.display = 'flex';
            
            // Подключаем сокет
            socket = io();
            socket.emit('user join', currentUser);
            
            // Принимаем сообщения
            socket.on('chat message', (msg) => {
                addMessage(msg);
            });
            
            socket.on('online count', (count) => {
                document.getElementById('onlineCount').innerHTML = '👥 Онлайн: ' + count;
            });
            
            // Загружаем историю
            const historyRes = await fetch('/messages');
            const history = await historyRes.json();
            const area = document.getElementById('messagesArea');
            area.innerHTML = '';
            history.forEach(m => addMessage(m));
        } else {
            alert('Ошибка входа');
        }
    };
    
    // Добавить сообщение в чат
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
    
    // Отправить сообщение
    function sendMessage() {
        const input = document.getElementById('messageInput');
        if (!input.value.trim()) return;
        socket.emit('chat message', { from: currentUser, text: input.value });
        input.value = '';
    }
    
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
                    socket.emit('chat message', { from: currentUser, text: '🎬 GIF', gif: img.src });
                    modal.style.display = 'none';
                };
                modal.appendChild(img);
            });
        } catch(e) { modal.innerHTML = 'Ошибка загрузки GIF'; }
    };
    
    // ИИ
    document.getElementById('aiBtn').onclick = async () => {
        const question = prompt('🤖 Спроси у ИИ:');
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
        alert('📞 Звонок всем пользователям! (Функция в разработке)');
    };
    
    // Картинки
    document.getElementById('fileBtn').onclick = () => document.getElementById('imageInput').click();
    document.getElementById('imageInput').onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            socket.emit('chat message', { from: currentUser, text: '📷 Изображение', image: ev.target.result });
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
  if (users.has(username)) {
    return res.json({ success: false, message: 'Пользователь уже существует' });
  }
  users.set(username, password);
  res.json({ success: true, message: 'Регистрация успешна! Теперь войдите.' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!users.has(username) || users.get(username) !== password) {
    return res.json({ success: false });
  }
  res.json({ success: true });
});

app.get('/messages', (req, res) => {
  res.json(messages);
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
    res.json({ answer: '🤖 ИИ временно недоступен. Попробуйте позже.' });
  }
});

// Socket.IO
let online = 0;
io.on('connection', (socket) => {
  let userName = '';
  
  socket.on('user join', (name) => {
    userName = name;
    online++;
    io.emit('online count', online);
  });
  
  socket.on('chat message', (msg) => {
    const message = {
      from: msg.from,
      text: msg.text,
      gif: msg.gif || null,
      image: msg.image || null,
      time: new Date()
    };
    messages.push(message);
    if (messages.length > 100) messages.shift();
    io.emit('chat message', message);
  });
  
  socket.on('disconnect', () => {
    if (userName) {
      online--;
      io.emit('online count', online);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('✅ Skebob Messenger работает на порту ' + PORT);
});
