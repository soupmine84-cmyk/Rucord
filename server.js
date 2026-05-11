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
    <title>Мессенджер</title>
    <style>
        body { font-family: Arial; margin: 0; padding: 20px; background: #1a1a2e; }
        .chat { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
        .messages { height: 400px; overflow-y: auto; padding: 15px; background: #f0f0f0; }
        .message { margin-bottom: 10px; padding: 8px 12px; border-radius: 8px; background: white; }
        .name { font-weight: bold; color: #0f3460; }
        .time { font-size: 11px; color: #888; margin-left: 10px; }
        .input-area { display: flex; padding: 15px; background: white; gap: 10px; }
        input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        button { padding: 10px 20px; background: #0f3460; color: white; border: none; border-radius: 5px; cursor: pointer; }
        button:hover { background: #16213e; }
        .login-area { padding: 20px; text-align: center; background: white; }
        h3 { margin: 0 0 10px 0; color: #0f3460; }
    </style>
</head>
<body>
    <div class="chat">
        <div id="login" class="login-area">
            <h3>Введите ваше имя</h3>
            <input type="text" id="username" placeholder="Ваше имя">
            <button onclick="login()">Войти в чат</button>
        </div>
        <div id="chat" style="display: none;">
            <div id="messages" class="messages"></div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="Введите сообщение...">
                <button onclick="sendMessage()">Отправить</button>
            </div>
        </div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        let socket;
        let userName = '';

        function login() {
            userName = document.getElementById('username').value.trim();
            if (userName === '') {
                alert('Введите имя!');
                return;
            }
            
            socket = io();
            socket.emit('user join', userName);
            
            document.getElementById('login').style.display = 'none';
            document.getElementById('chat').style.display = 'block';
            
            socket.on('chat message', (msg) => {
                const messagesDiv = document.getElementById('messages');
                const messageElement = document.createElement('div');
                messageElement.className = 'message';
                messageElement.innerHTML = '<span class="name">' + msg.name + '</span><span class="time">' + msg.time + '</span><br>' + msg.text;
                messagesDiv.appendChild(messageElement);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            });
            
            socket.on('user joined', (name) => {
                const messagesDiv = document.getElementById('messages');
                const messageElement = document.createElement('div');
                messageElement.style.color = '#666';
                messageElement.style.fontStyle = 'italic';
                messageElement.innerHTML = '✨ ' + name + ' присоединился к чату';
                messagesDiv.appendChild(messageElement);
            });
        }
        
        function sendMessage() {
            const input = document.getElementById('messageInput');
            const text = input.value.trim();
            if (text === '') return;
            
            socket.emit('chat message', { name: userName, text: text });
            input.value = '';
        }
        
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    </script>
</body>
</html>
  `);
});

io.on('connection', (socket) => {
  let userName = '';
  
  socket.on('user join', (name) => {
    userName = name;
    socket.broadcast.emit('user joined', name);
  });
  
  socket.on('chat message', (msg) => {
    const time = new Date().toLocaleTimeString();
    io.emit('chat message', { name: msg.name, text: msg.text, time: time });
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log('Чат работает на порту ' + port);
});