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
    <title>✨ Чат | Современный мессенджер</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        /* Экран входа */
        .login-screen {
            background: rgba(255, 255, 255, 0.98);
            border-radius: 32px;
            padding: 48px 40px;
            width: 440px;
            max-width: 90%;
            text-align: center;
            box-shadow: 0 25px 50px rgba(0,0,0,0.25);
            backdrop-filter: blur(10px);
            animation: fadeInUp 0.6s ease;
        }

        .login-screen h1 {
            font-size: 2.5rem;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            margin-bottom: 12px;
        }

        .login-screen p {
            color: #888;
            margin-bottom: 32px;
            font-size: 0.95rem;
        }

        .login-screen input {
            width: 100%;
            padding: 14px 20px;
            margin-bottom: 20px;
            border: 2px solid #e8e8e8;
            border-radius: 60px;
            font-size: 16px;
            transition: all 0.3s ease;
            text-align: center;
            background: #f8f9fa;
        }

        .login-screen input:focus {
            border-color: #667eea;
            outline: none;
            background: white;
            transform: scale(1.02);
        }

        .login-screen button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 60px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .login-screen button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102,126,234,0.4);
        }

        /* Контейнер чата */
        .chat-container {
            display: none;
            width: 550px;
            height: 750px;
            max-width: 95%;
            background: white;
            border-radius: 32px;
            overflow: hidden;
            box-shadow: 0 25px 50px rgba(0,0,0,0.25);
            flex-direction: column;
            animation: fadeInUp 0.5s ease;
        }

        /* Шапка */
        .chat-header {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px 24px;
            text-align: center;
        }

        .chat-header h2 {
            font-size: 1.4rem;
            margin-bottom: 6px;
        }

        .online-badge {
            background: rgba(255,255,255,0.2);
            border-radius: 30px;
            padding: 4px 14px;
            font-size: 0.75rem;
            display: inline-block;
        }

        /* Сообщения */
        .messages-area {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #f5f7fb;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .message {
            display: flex;
            animation: fadeInUp 0.25s ease;
        }

        .message-mine {
            justify-content: flex-end;
        }

        .message-other {
            justify-content: flex-start;
        }

        .message-bubble {
            max-width: 75%;
            padding: 10px 16px;
            border-radius: 22px;
            word-wrap: break-word;
        }

        .message-mine .message-bubble {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border-bottom-right-radius: 6px;
        }

        .message-other .message-bubble {
            background: white;
            color: #1a1a2e;
            border-bottom-left-radius: 6px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        .message-name {
            font-size: 0.7rem;
            font-weight: 600;
            margin-bottom: 4px;
            opacity: 0.8;
        }

        .message-time {
            font-size: 0.6rem;
            opacity: 0.6;
            margin-left: 8px;
        }

        .message-text {
            font-size: 0.9rem;
            line-height: 1.4;
        }

        /* Системные сообщения */
        .system-message {
            text-align: center;
            font-size: 0.7rem;
            color: #aaa;
            margin: 8px 0;
            font-style: italic;
        }

        /* Статус печатает */
        .typing-status {
            padding: 8px 20px;
            font-size: 0.7rem;
            color: #999;
            font-style: italic;
            background: #f5f7fb;
            border-top: 1px solid #eee;
        }

        /* Панель ввода */
        .input-panel {
            padding: 16px 20px;
            background: white;
            border-top: 1px solid #eee;
            display: flex;
            gap: 12px;
        }

        .input-panel input {
            flex: 1;
            padding: 12px 18px;
            border: 1.5px solid #e8e8e8;
            border-radius: 30px;
            font-size: 0.9rem;
            transition: 0.2s;
        }

        .input-panel input:focus {
            border-color: #667eea;
            outline: none;
        }

        .input-panel button {
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 30px;
            font-weight: 600;
            cursor: pointer;
            transition: 0.2s;
        }

        .input-panel button:hover {
            transform: scale(1.02);
            opacity: 0.95;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    </style>
</head>
<body>

<div id="loginScreen" class="login-screen">
    <h1>💬 Мессенджер</h1>
    <p>Введите имя, чтобы начать общение</p>
    <input type="text" id="usernameInput" placeholder="Ваше имя" maxlength="25">
    <button onclick="login()">🚀 Войти в чат</button>
</div>

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
            alert('Введите имя!');
            return;
        }
        
        currentUser = username;
        
        socket = io();
        socket.emit('user join', currentUser);
        
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'flex';
        
        socket.on('chat message', (data) => addMessage(data));
        socket.on('user joined', (name) => addSystemMessage('✨ ' + name + ' присоединился к чату ✨'));
        socket.on('user left', (name) => addSystemMessage('👋 ' + name + ' покинул чат 👋'));
        socket.on('online count', (count) => {
            document.getElementById('onlineCount').innerText = '👥 ' + count + ' онлайн';
        });
        socket.on('user typing', (name) => {
            document.getElementById('typingStatus').innerText = '✏️ ' + name + ' печатает...';
            setTimeout(() => {
                if (document.getElementById('typingStatus').innerText.includes(name)) {
                    document.getElementById('typingStatus').innerText = '';
                }
            }, 2000);
        });
        
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
            '<div class="message-bubble">' +
                '<div class="message-name">' + escapeHtml(data.name) + '<span class="message-time">' + time + '</span></div>' +
                '<div class="message-text">' + escapeHtml(data.text) + '</div>' +
            '</div>';
        
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        if (data.name !== currentUser) {
            try {
                new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3').play();
            } catch(e) {}
        }
    }
    
    function addSystemMessage(text) {
        const messagesDiv = document.getElementById('messagesArea');
        const div = document.createElement('div');
        div.className = 'system-message';
        div.innerText = text;
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    function sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        if (!text) return;
        
        socket.emit('chat message', { name: currentUser, text: text });
        input.value = '';
        socket.emit('stop typing', currentUser);
        document.getElementById('typingStatus').innerText = '';
    }
    
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
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

  socket.on('stop typing', () => {});

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
  console.log('✨ Чат работает на порту ' + port);
});