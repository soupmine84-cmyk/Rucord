const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>✨ Чат | Красивый мессенджер</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        /* Экран входа */
        .login-screen {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 30px;
            padding: 50px;
            width: 400px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
        }

        .login-screen h1 {
            font-size: 2.5em;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 20px;
        }

        .login-screen input {
            width: 100%;
            padding: 15px;
            margin: 15px 0;
            border: 2px solid #e0e0e0;
            border-radius: 50px;
            font-size: 16px;
            transition: 0.3s;
            text-align: center;
        }

        .login-screen input:focus {
            border-color: #667eea;
            outline: none;
            transform: scale(1.02);
        }

        .login-screen button {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 50px;
            font-size: 18px;
            cursor: pointer;
            transition: 0.3s;
        }

        .login-screen button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102,126,234,0.4);
        }

        /* Чат интерфейс */
        .chat-container {
            display: none;
            width: 500px;
            height: 700px;
            background: white;
            border-radius: 30px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            flex-direction: column;
        }

        /* Шапка чата */
        .chat-header {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px;
            text-align: center;
        }

        .chat-header h2 {
            font-size: 1.5em;
            margin-bottom: 5px;
        }

        .online-badge {
            background: rgba(255,255,255,0.2);
            border-radius: 20px;
            padding: 5px 12px;
            font-size: 12px;
            display: inline-block;
        }

        /* Область сообщений */
        .messages-area {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #f8f9fa;
        }

        .message {
            margin-bottom: 15px;
            display: flex;
        }

        .message-mine {
            justify-content: flex-end;
        }

        .message-other {
            justify-content: flex-start;
        }

        .message-bubble {
            max-width: 70%;
            padding: 10px 15px;
            border-radius: 20px;
            position: relative;
        }

        .message-mine .message-bubble {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border-bottom-right-radius: 5px;
        }

        .message-other .message-bubble {
            background: white;
            color: #333;
            border-bottom-left-radius: 5px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .message-name {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .message-mine .message-name {
            color: rgba(255,255,255,0.9);
        }

        .message-time {
            font-size: 10px;
            opacity: 0.7;
            margin-left: 10px;
        }

        .message-text {
            word-wrap: break-word;
        }

        /* Системные сообщения */
        .system-message {
            text-align: center;
            font-size: 12px;
            color: #999;
            margin: 10px 0;
            font-style: italic;
        }

        /* Панель ввода */
        .input-panel {
            padding: 20px;
            background: white;
            border-top: 1px solid #e0e0e0;
            display: flex;
            gap: 10px;
        }

        .input-panel input {
            flex: 1;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 25px;
            font-size: 14px;
            transition: 0.3s;
        }

        .input-panel input:focus {
            border-color: #667eea;
            outline: none;
        }

        .input-panel button {
            padding: 12px 25px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            transition: 0.3s;
        }

        .input-panel button:hover {
            transform: scale(1.05);
        }

        /* Статус печатает */
        .typing-status {
            padding: 5px 20px;
            font-size: 12px;
            color: #999;
            font-style: italic;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .message {
            animation: fadeIn 0.3s ease;
        }
    </style>
</head>
<body>

<!-- Экран входа -->
<div id="loginScreen" class="login-screen">
    <h1>✨ Мессенджер</h1>
    <p style="color: #666; margin-bottom: 20px;">Введите ваше имя чтобы начать общение</p>
    <input type="text" id="usernameInput" placeholder="Например: Алексей" maxlength="20">
    <button onclick="login()">🚀 Войти в чат</button>
</div>

<!-- Чат -->
<div id="chatContainer" class="chat-container">
    <div class="chat-header">
        <h2>💬 Общий чат</h2>
        <span class="online-badge" id="onlineCount">👥 0 онлайн</span>
    </div>
    <div id="messagesArea" class="messages-area"></div>
    <div id="typingStatus" class="typing-status"></div>
    <div class="input-panel">
        <input type="text" id="messageInput" placeholder="Введите сообщение..." onkeypress="if(event.key==='Enter') sendMessage()">
        <button onclick="sendMessage()">📤 Отправить</button>
    </div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
    let socket;
    let currentUser = '';

    function login() {
        const username = document.getElementById('usernameInput').value.trim();
        if (!username) {
            alert('Пожалуйста, введите ваше имя');
            return;
        }
        
        currentUser = username;
        
        socket = io();
        socket.emit('user join', currentUser);
        
        // Скрыть экран входа, показать чат
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'flex';
        
        // Обработчики событий
        socket.on('chat message', (data) => addMessage(data));
        socket.on('user joined', (name) => addSystemMessage(✨ ${name} присоединился к чату ✨));
        socket.on('user left', (name) => addSystemMessage(👋 ${name} покинул чат 👋));
        socket.on('online count', (count) => {
            document.getElementById('onlineCount').innerHTML = 👥 ${count} онлайн;
        });
        socket.on('user typing', (name) => {
            document.getElementById('typingStatus').innerHTML = ✏️ ${name} печатает...;
            setTimeout(() => {
                if (document.getElementById('typingStatus').innerHTML.includes(name)) {
                    document.getElementById('typingStatus').innerHTML = '';
                }
            }, 2000);
        });
        
        // Отслеживание печатания
        const input = document.getElementById('messageInput');
        let typingTimer;
        input.addEventListener('input', () => {
            socket.emit('typing', currentUser);
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => {
                socket.emit('stop typing', currentUser);
            }, 1000);
        });
    }
    
    function addMessage(data) {
        const messagesDiv = document.getElementById('messagesArea');
        const messageDiv = document.createElement('div');
        messageDiv.className = data.name === currentUser ? 'message message-mine' : 'message message-other';
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = 
            <div class="message-bubble">
                <div class="message-name">
                    ${data.name}
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text">${escapeHtml(data.text)}</div>
            </div>
        ;
        
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        // Звук уведомления (если сообщение не от себя)
        if (data.name !== currentUser) {
            try {
                new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3').play();
            } catch(e) {}
        }
    }
    
    function addSystemMessage(text) {
        const messagesDiv = document.getElementById('messagesArea');
        const systemDiv = document.createElement('div');
        systemDiv.className = 'system-message';
        systemDiv.innerHTML = text;
        messagesDiv.appendChild(systemDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    function sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        if (!text) return;
        
        socket.emit('chat message', { name: currentUser, text: text });
        input.value = '';
        socket.emit('stop typing', currentUser);
        document.getElementById('typingStatus').innerHTML = '';
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
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
    io.emit('chat message', { name: msg.name, text: msg.text });
  });
  
  socket.on('typing', (name) => {
    socket.broadcast.emit('user typing', name);
  });
  
  socket.on('stop typing', () => {
    // очистка
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
  console.log('✨ Красивый чат работает на порту ' + port);
});
