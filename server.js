const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>🎉 Супер Мессенджер | Звонки + GIF</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
        
        /* Контейнер чата */
        .chat-container { max-width: 800px; width: 100%; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        
        /* Шапка */
        .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
        .header h2 { font-size: 20px; }
        .online-count { background: rgba(255,255,255,0.2); padding: 5px 12px; border-radius: 20px; font-size: 14px; }
        
        /* Область сообщений */
        .messages { height: 400px; overflow-y: auto; padding: 15px; background: #f8f9fa; }
        
        /* Сообщение */
        .message { margin-bottom: 15px; animation: fadeIn 0.3s; }
        .message-bubble { display: inline-block; max-width: 70%; padding: 10px 14px; border-radius: 18px; position: relative; }
        .message-mine { text-align: right; }
        .message-mine .message-bubble { background: #667eea; color: white; }
        .message-other .message-bubble { background: white; color: #333; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .message-name { font-size: 12px; font-weight: bold; margin-bottom: 4px; display: block; }
        .message-mine .message-name { color: rgba(255,255,255,0.9); }
        .message-time { font-size: 10px; opacity: 0.7; margin-left: 8px; }
        .message-text { word-wrap: break-word; }
        
        /* GIF стиль */
        .message-gif { max-width: 200px; border-radius: 12px; cursor: pointer; margin-top: 5px; }
        
        /* Системное сообщение */
        .system-message { text-align: center; font-size: 12px; color: #999; margin: 10px 0; font-style: italic; }
        
        /* Печатает... */
        .typing-indicator { padding: 10px 15px; color: #999; font-size: 12px; font-style: italic; background: #f8f9fa; border-top: 1px solid #eee; }
        
        /* Панель ввода */
        .input-area { padding: 15px; background: white; border-top: 1px solid #ddd; }
        .input-row { display: flex; gap: 10px; margin-bottom: 10px; }
        .input-row input { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 25px; outline: none; font-size: 14px; }
        .input-row input:focus { border-color: #667eea; }
        .input-row button { padding: 12px 20px; background: #667eea; color: white; border: none; border-radius: 25px; cursor: pointer; font-size: 14px; transition: all 0.3s; }
        .input-row button:hover { background: #764ba2; transform: scale(1.02); }
        
        /* Кнопки приколов */
        .fun-buttons { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
        .fun-btn { background: #f0f0f0; border: none; padding: 8px 15px; border-radius: 20px; cursor: pointer; font-size: 14px; transition: 0.2s; }
        .fun-btn:hover { background: #667eea; color: white; transform: scale(1.05); }
        
        /* Звонок */
        .call-btn { background: #e74c3c; color: white; }
        .call-btn:hover { background: #c0392b; }
        
        /* Модальное окно звонка */
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; justify-content: center; align-items: center; }
        .modal-content { background: white; border-radius: 20px; padding: 20px; text-align: center; max-width: 300px; }
        .modal button { margin: 10px; padding: 10px 20px; border: none; border-radius: 10px; cursor: pointer; }
        .answer-btn { background: #2ecc71; color: white; }
        .reject-btn { background: #e74c3c; color: white; }
        
        /* Логин панель */
        .login-area { padding: 40px; text-align: center; }
        .login-area input { padding: 15px; width: 80%; border: 2px solid #ddd; border-radius: 30px; margin-bottom: 15px; font-size: 16px; text-align: center; }
        .login-area button { padding: 12px 30px; background: #667eea; color: white; border: none; border-radius: 30px; font-size: 16px; cursor: pointer; }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .gif-panel { display: none; position: absolute; background: white; border: 1px solid #ddd; border-radius: 10px; padding: 10px; max-width: 300px; flex-wrap: wrap; gap: 5px; z-index: 100; }
        .gif-panel img { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; cursor: pointer; transition: 0.2s; }
        .gif-panel img:hover { transform: scale(1.05); }
    </style>
</head>
<body>

<div id="loginArea" class="login-area" style="background: white; border-radius: 20px; max-width: 400px; margin: auto;">
    <h2>🎉 Супер Мессенджер</h2>
    <p>🌟 Стикеры | GIF | Звонки | Звуки</p>
    <input type="text" id="username" placeholder="Введите ваше имя">
    <button onclick="login()">🚀 Войти в чат</button>
</div>

<div id="chatArea" style="display: none;">
    <div class="chat-container">
        <div class="header">
            <h2>💬 Супер Чат</h2>
            <div class="online-count">👥 <span id="onlineCount">0</span> онлайн</div>
        </div>
        <div id="messages" class="messages"></div>
        <div id="typing" class="typing-indicator"></div>
        <div class="input-area">
            <div class="input-row">
                <input type="text" id="messageInput" placeholder="Сообщение..." onkeypress="checkEnter(event)">
                <button onclick="sendMessage()">📤 Отправить</button>
            </div>
            <div class="fun-buttons">
                <button class="fun-btn" onclick="showGifPanel()">🎬 GIF</button>
                <button class="fun-btn" onclick="sendSticker('😀')">😀</button>
                <button class="fun-btn" onclick="sendSticker('😂')">😂</button>
                <button class="fun-btn" onclick="sendSticker('❤️')">❤️</button>
                <button class="fun-btn" onclick="sendSticker('🎉')">🎉</button>
                <button class="fun-btn call-btn" onclick="makeCall()">📞 Позвонить всем</button>
            </div>
            <div id="gifPanel" class="gif-panel"></div>
        </div>
    </div>
</div>

<div id="callModal" class="modal">
    <div class="modal-content">
        <h3>📞 Входящий звонок!</h3>
        <p id="callerName"></p>
        <button class="answer-btn" onclick="answerCall()">✅ Ответить</button>
        <button class="reject-btn" onclick="rejectCall()">❌ Отклонить</button>
    </div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
    let socket;
    let userName = '';
    let currentCall = null;
    const playSound = () => { try { new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3').play(); } catch(e) {} };
    
    // Тенор GIF API (бесплатный публичный прокси)
    async function searchGif(query) {
        const res = await fetch(https://tenor.googleapis.com/v2/search?q=funny&key=AIzaSyC-9oUqY5G1m-Sxulx8QJqzvqQm3XqXJpE&limit=8`);
        const data = await res.json();
        return data.results || [];
    }
    
    async function showGifPanel() {
        const panel = document.getElementById('gifPanel');
        if (panel.style.display === 'flex') {
            panel.style.display = 'none';
            return;
        }
        panel.style.display = 'flex';
        panel.innerHTML = 'Загрузка GIF...';
        const gifs = await searchGif('funny');
        panel.innerHTML = '';
        gifs.forEach(gif => {
            const img = document.createElement('img');
            img.src = gif.media_formats.gif.url;
            img.onclick = () => sendGif(img.src);
            panel.appendChild(img);
        });
    }
    
    function sendGif(url) {
        socket.emit('chat message', { name: userName, text: '', gif: url });
        document.getElementById('gifPanel').style.display = 'none';
        playSound();
    }
    
    function sendSticker(emoji) {
        socket.emit('chat message', { name: userName, text: emoji, sticker: true });
        playSound();
    }
    
    function makeCall() {
        socket.emit('call', { from: userName });
        alert('📞 Звонок всем пользователям!');
    }
    
    function login() {
        userName = document.getElementById('username').value.trim();
        if (!userName) { alert('Введите имя!'); return; }
        socket = io();
        socket.emit('user join', userName);
        document.getElementById('loginArea').style.display = 'none';
        document.getElementById('chatArea').style.display = 'block';
        
        socket.on('chat message', (msg) => addMessage(msg));
        socket.on('user joined', (name) => addSystemMessage(✨ ${name} присоединился к чату✨));
        socket.on('user left', (name) => addSystemMessage(👋 ${name} покинул чат));
        socket.on('typing', (name) => showTyping(name));
        socket.on('online count', (count) => document.getElementById('onlineCount').innerText = count);
        socket.on('incoming call', (data) => {
            document.getElementById('callerName').innerText = data.from;
            document.getElementById('callModal').style.display = 'flex';
            playSound();
            currentCall = data;
        });
        
        document.getElementById('messageInput').addEventListener('input', () => socket.emit('typing', userName));
    }
    
    function addMessage(msg) {
        const messagesDiv = document.getElementById('messages');
        const div = document.createElement('div');
        div.className = msg.name === userName ? 'message message-mine' : 'message message-other';
        const time = new Date().toLocaleTimeString();
        div.innerHTML = \`
            <div class="message-bubble">
                <span class="message-name">\${msg.name} \${msg.time ? '<span class="message-time">' + msg.time + '</span>' : ''}</span>
                <div class="message-text">\${msg.text ? msg.text.replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</div>
                \${msg.gif ? <img class="message-gif" src="\${msg.gif}" /> : ''}
            </div>
        \`;
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        if (msg.name !== userName) playSound();
    }
    
    function addSystemMessage(text) {
        const messagesDiv = document.getElementById('messages');
        const div = document.createElement('div');
        div.className = 'system-message';
        div.innerText = text;
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    function showTyping(name) {
        document.getElementById('typing').innerText =  ${name} печатает...;
        setTimeout(() => document.getElementById('typing').innerText = '', 1500);
    }
    
    function sendMessage() {
        const input = document.getElementById('messageInput');
        if (input.value.trim()) {
            socket.emit('chat message', { name: userName, text: input.value });
            input.value = '';
            playSound();
        }
    }
    
    function checkEnter(e) { if (e.key === 'Enter') sendMessage(); }
    function answerCall() { alert('Звонок принят! (WebRTC пока в демо)'); document.getElementById('callModal').style.display = 'none'; }
    function rejectCall() { document.getElementById('callModal').style.display = 'none'; }
</script>
</body>
</html>
  `);
});

io.on('connection', (socket) => {
  let userName = '';
  let users = new Set();
  
  socket.on('user join', (name) => {
    userName = name;
    users.add(name);
    io.emit('online count', users.size);
    socket.broadcast.emit('user joined', name);
  });
  
  socket.on('chat message', (msg) => {
    io.emit('chat message', { ...msg, time: new Date().toLocaleTimeString() });
  });
  
  socket.on('typing', (name) => {
    socket.broadcast.emit('typing', name);
  });
  
  socket.on('call', (data) => {
    socket.broadcast.emit('incoming call', { from: data.from });
  });
  
  socket.on('disconnect', () => {
    if (userName) {
      users.delete(userName);
      io.emit('online count', users.size);
      socket.broadcast.emit('user left', userName);
    }
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log('🎉 Супер мессенджер работает на порту ' + port);
});
