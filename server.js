const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// База данных
const users = new Map(); // username -> { password, friends, device, avatar, bio, coins }
const globalMessages = [];
const privateMessages = new Map(); // 'user1|user2' -> []
let online = 0;

// Прикольные ответы ИИ
const funnyResponses = [
    "Я бы ответил, но мне лень... Ладно: ",
    "По статистике, 99% людей не дочитывают ответы ИИ до конца. Ты исключение? ",
    "Обработка запроса... *звуки печенья* Готово! ",
    "Секунду, звоню Китаю... ",
    "Твой вопрос слишком сложный. Вот тебе мем: 🐸",
    "Я бы помог, но меня взломали котики. Мяу! "
];

const insults = [
    "Ты серьезно? 😏", "Ой, всё!", "Ну ты и придумал...", "Баян!", "Так себе идея 💀"
];

app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no">
    <title>⚡ Skebob Messenger | Чат с приколами</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1e1f22; height: 100vh; overflow: hidden; transition: all 0.3s; }
        
        /* Анимации */
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        @keyframes rainbow {
            0% { filter: hue-rotate(0deg); }
            100% { filter: hue-rotate(360deg); }
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        
        .shake { animation: shake 0.3s ease-in-out; }
        .rainbow-text { animation: rainbow 2s linear infinite; }
        
        /* Экран входа */
        .login-screen { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .login-box { background: rgba(43, 45, 49, 0.95); backdrop-filter: blur(10px); padding: 30px; border-radius: 24px; width: 100%; max-width: 380px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        .login-box h1 { color: white; margin-bottom: 20px; font-size: 28px; }
        .login-box input { width: 100%; padding: 14px; margin: 8px 0; background: #1e1f22; border: none; color: white; border-radius: 12px; font-size: 16px; transition: 0.2s; }
        .login-box input:focus { outline: none; transform: scale(1.02); box-shadow: 0 0 10px #5865f2; }
        .login-box button { width: 100%; padding: 14px; margin: 8px 0; border: none; border-radius: 12px; cursor: pointer; background: #5865f2; color: white; font-size: 16px; font-weight: 600; transition: 0.2s; }
        .login-box button:hover { transform: scale(1.02); filter: brightness(1.1); }
        .login-box .register { background: linear-gradient(45deg, #23a55a, #1e7e43); }
        
        /* Выбор устройства */
        .device-select { margin: 15px 0; display: flex; gap: 10px; flex-wrap: wrap; }
        .device-btn { flex: 1; padding: 10px; background: #1e1f22; border: 2px solid #3a3c43; border-radius: 12px; cursor: pointer; color: white; font-size: 14px; transition: 0.2s; }
        .device-btn.selected { border-color: #5865f2; background: #5865f2; transform: scale(1.05); }
        
        /* Основной чат */
        .app { display: none; height: 100vh; display: flex; flex-direction: column; }
        
        /* Боковая панель */
        .sidebar { position: fixed; top: 0; left: -280px; bottom: 0; width: 280px; background: #2b2d31; z-index: 200; transition: 0.3s; display: flex; flex-direction: column; }
        .sidebar.open { left: 0; }
        .sidebar-header { padding: 20px; border-bottom: 1px solid #1e1f22; background: linear-gradient(135deg, #5865f2, #4752c4); }
        .sidebar-header h3 { color: white; font-size: 20px; }
        .online-count { font-size: 12px; color: #fff; margin-top: 5px; opacity: 0.9; }
        .friends-list { flex: 1; overflow-y: auto; padding: 10px; }
        .friend { padding: 12px; border-radius: 12px; cursor: pointer; color: #dbdee1; display: flex; align-items: center; gap: 12px; margin-bottom: 4px; transition: 0.2s; }
        .friend:hover { background: #3a3c43; transform: translateX(5px); }
        .friend.active { background: #5865f2; }
        .friend-avatar { width: 44px; height: 44px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .friend-info { flex: 1; }
        .friend-name { font-weight: 500; }
        .friend-status { font-size: 11px; color: #949ba4; }
        
        .add-friend { padding: 16px; border-top: 1px solid #1e1f22; display: flex; gap: 8px; }
        .add-friend input { flex: 1; padding: 12px; background: #1e1f22; border: none; color: white; border-radius: 12px; }
        .add-friend button { padding: 12px 16px; background: #23a55a; border: none; border-radius: 12px; color: white; cursor: pointer; transition: 0.2s; }
        .add-friend button:hover { transform: scale(1.05); }
        
        /* Область чата */
        .chat-area { flex: 1; display: flex; flex-direction: column; background: #313338; }
        .chat-header { padding: 12px 16px; background: #2b2d31; border-bottom: 1px solid #1e1f22; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
        .chat-header h2 { color: white; font-size: 18px; }
        .action-buttons { display: flex; gap: 6px; flex-wrap: wrap; }
        .action-btn { padding: 6px 12px; border-radius: 20px; border: none; cursor: pointer; color: white; font-size: 13px; transition: 0.2s; }
        .action-btn:hover { transform: scale(1.05); }
        .gif-btn { background: #e67e22; }
        .ai-btn { background: #9b59b6; }
        .call-btn { background: #2ecc71; }
        .sticker-btn { background: #f1c40f; }
        .slash-btn { background: #e74c3c; }
        
        .messages-area { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .message { display: flex; gap: 10px; animation: fadeIn 0.3s; }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .message-mine { flex-direction: row-reverse; }
        .message-avatar { width: 36px; height: 36px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; cursor: pointer; transition: 0.2s; }
        .message-avatar:hover { transform: scale(1.1); }
        .message-content { max-width: 75%; }
        .message-header { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
        .message-name { color: white; font-size: 13px; font-weight: 500; cursor: pointer; }
        .message-name:hover { text-decoration: underline; }
        .message-time { color: #949ba4; font-size: 10px; }
        .message-text { background: #2b2d31; padding: 8px 12px; border-radius: 18px; color: white; word-wrap: break-word; font-size: 14px; }
        .message-mine .message-text { background: #5865f2; }
        .message-img { max-width: 180px; border-radius: 12px; margin-top: 6px; cursor: pointer; transition: 0.2s; }
        .message-img:hover { transform: scale(1.05); }
        
        .input-panel { padding: 12px; background: #2b2d31; display: flex; gap: 8px; border-top: 1px solid #1e1f22; }
        .input-panel input { flex: 1; padding: 12px; background: #1e1f22; border: none; border-radius: 28px; color: white; font-size: 15px; transition: 0.2s; }
        .input-panel input:focus { outline: none; transform: scale(1.02); }
        .input-panel button { padding: 8px 16px; background: #5865f2; border: none; border-radius: 28px; color: white; cursor: pointer; font-size: 14px; transition: 0.2s; }
        .input-panel button:hover { transform: scale(1.05); filter: brightness(1.1); }
        
        .gif-modal { display: none; position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #2b2d31; padding: 12px; border-radius: 20px; width: 90%; max-width: 320px; flex-wrap: wrap; gap: 8px; max-height: 300px; overflow-y: auto; z-index: 1000; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
        .gif-modal img { width: calc(33% - 6px); aspect-ratio: 1/1; object-fit: cover; border-radius: 10px; cursor: pointer; transition: 0.2s; }
        .gif-modal img:hover { transform: scale(1.05); }
        
        .sticker-modal { display: none; position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #2b2d31; padding: 12px; border-radius: 20px; width: 90%; max-width: 400px; flex-wrap: wrap; gap: 8px; max-height: 300px; overflow-y: auto; z-index: 1000; }
        .sticker { font-size: 48px; cursor: pointer; padding: 8px; transition: 0.2s; background: #1e1f22; border-radius: 12px; text-align: center; }
        .sticker:hover { transform: scale(1.2); background: #5865f2; }
        
        .menu-toggle { position: fixed; bottom: 20px; left: 20px; z-index: 150; background: linear-gradient(135deg, #5865f2, #4752c4); width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; border: none; font-size: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.3); transition: 0.2s; }
        .menu-toggle:hover { transform: scale(1.1); }
        
        .toast { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #2b2d31; color: white; padding: 12px 24px; border-radius: 28px; z-index: 1000; animation: fadeInUp 0.3s, fadeOut 0.3s 2.7s; pointer-events: none; }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateX(-50%) translateY(20px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes fadeOut {
            to { opacity: 0; }
        }
        
        @media (min-width: 769px) {
            .sidebar { position: relative; left: 0; width: 280px; }
            .menu-toggle { display: none; }
            .app { flex-direction: row; }
        }
        
        /* Темы для разных устройств */
        body.android .message-mine .message-text { background: linear-gradient(135deg, #e91e63, #c2185b); }
        body.iphone .message-mine .message-text { background: linear-gradient(135deg, #007aff, #0051d5); }
        body.web .message-mine .message-text { background: linear-gradient(135deg, #5865f2, #4752c4); }
        
        /* Режим пьяного чата */
        body.drunk-mode .messages-area { animation: shake 0.1s infinite; }
        body.drunk-mode .message-text { filter: blur(1px); }
        
        /* Режим радуги */
        body.rainbow-mode .message-mine .message-text { animation: rainbow 1s linear infinite; }
    </style>
</head>
<body>

<button class="menu-toggle" id="menuToggle">☰</button>

<div id="loginScreen" class="login-screen">
    <div class="login-box">
        <h1>⚡ Skebob Messenger</h1>
        <p style="color:#949ba4; margin-bottom:15px;">Чат с приколами и мемасиками</p>
        <input type="text" id="loginName" placeholder="Имя пользователя">
        <input type="password" id="loginPass" placeholder="Пароль">
        <div class="device-select">
            <button class="device-btn" data-device="android">🤖 Android</button>
            <button class="device-btn" data-device="iphone">📱 iPhone</button>
            <button class="device-btn" data-device="web">💻 Web</button>
        </div>
        <button id="loginBtn">🚀 Войти</button>
        <button id="registerBtn" class="register">✨ Регистрация</button>
    </div>
</div>

<div id="app" class="app">
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <h3>⚡ Skebob</h3>
            <div class="online-count" id="onlineCount">👥 Онлайн: 0</div>
            <div style="margin-top: 8px;">
                <button id="drunkModeBtn" style="background:#e74c3c; border:none; padding:4px 8px; border-radius:8px; color:white; cursor:pointer;">🍺 Пьяный чат</button>
                <button id="rainbowModeBtn" style="background:#f1c40f; border:none; padding:4px 8px; border-radius:8px; color:white; cursor:pointer;">🌈 Радуга</button>
            </div>
        </div>
        <div class="friends-list" id="friendsList"></div>
        <div class="add-friend">
            <input type="text" id="newFriend" placeholder="Имя друга">
            <button id="addFriendBtn">➕ Добавить</button>
        </div>
    </div>
    
    <div class="chat-area">
        <div class="chat-header">
            <h2 id="chatTitle"># Общий чат</h2>
            <div class="action-buttons">
                <button id="gifBtn" class="action-btn gif-btn">🎬 GIF</button>
                <button id="stickerBtn" class="action-btn sticker-btn">😊 Стикер</button>
                <button id="callBtn" class="action-btn call-btn">📞 Звонок</button>
                <button id="aiBtn" class="action-btn ai-btn">🤖 ИИ</button>
                <button id="slashBtn" class="action-btn slash-btn">💀 Слэш</button>
            </div>
        </div>
        <div id="messagesArea" class="messages-area"></div>
        <div class="input-panel">
            <input type="text" id="messageInput" placeholder="Сообщение... (/help для команд)" onkeypress="if(event.key==='Enter') sendMessage()">
            <button id="fileBtn">📎</button>
            <button onclick="sendMessage()">💬</button>
        </div>
    </div>
</div>

<div id="gifModal" class="gif-modal"></div>
<div id="stickerModal" class="sticker-modal"></div>
<input type="file" id="imageInput" style="display:none">

<script src="/socket.io/socket.io.js"></script>
<script>
    let socket;
    let currentUser = '';
    let currentChat = { type: 'global', name: 'Общий чат' };
    let friends = [];
    let selectedDevice = 'web';
    let drunkMode = false;
    let rainbowMode = false;
    
    // Стикеры
    const stickers = ['😀', '😂', '🥲', '😎', '🤪', '🥳', '😈', '👻', '🎃', '🤖', '🐱', '🐶', '🐼', '🍕', '🍺', '💀', '🎉', '❤️', '🔥', '⭐'];
    
    // Команды слэша
    const slashCommands = {
        '/help': 'Доступные команды: /help, /joke, /insult, /time, /coinflip, /dice, /8ball [вопрос], /rainbow, /drunk, /normal',
        '/joke': () => {
            const jokes = [
                'Почему программисты не любят природу? Слишком много багов! 🐛',
                'Что говорит один бит другому? "Держи бит!" 💾',
                'Встречаются два бага. Один говорит: "Что-то не так!" Второй: "Всё нормально, это фича!" 🐞',
                'Сколько программистов нужно, чтобы заменить лампочку? Ни одного, это hardware problem! 💡'
            ];
            return jokes[Math.floor(Math.random() * jokes.length)];
        },
        '/insult': () => {
            const insults = ['Ты тупой, как крякозябра! 🤪', 'У тебя лицо, как у моего кота, когда он видит огурец! 🥒', 'Ты гений... обратного действия! 😂'];
            return insults[Math.floor(Math.random() * insults.length)];
        },
        '/time': () => new Date().toLocaleString(),
        '/coinflip': () => Math.random() > 0.5 ? 'Орёл! 🦅' : 'Решка! 💰',
        '/dice': () => '🎲 Выпало: ' + (Math.floor(Math.random() * 6) + 1),
        '/8ball': (question) => {
            const answers = ['Да', 'Нет', 'Возможно', 'Спроси позже', '100%', 'Шансы высоки', 'Лучше не надо'];
            return question ? answers[Math.floor(Math.random() * answers.length)] : 'Задай вопрос, например /8ball Я крутой?';
        }
    };
    
    // Выбор устройства
    document.querySelectorAll('.device-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedDevice = btn.dataset.device;
            document.body.className = selectedDevice;
        };
    });
    document.querySelector('.device-btn[data-device="web"]').classList.add('selected');
    
    // Регистрация
    document.getElementById('registerBtn').onclick = async () => {
        const username = document.getElementById('loginName').value;
        const password = document.getElementById('loginPass').value;
        if (!username || !password) { showToast('Заполните поля!'); return; }
        const res = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, device: selectedDevice })
        });
        const data = await res.json();
        showToast(data.message);
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
            friends = data.friends || [];
            if (data.device) document.body.className = data.device;
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('app').style.display = 'flex';
            
            socket = io();
            socket.emit('user online', currentUser);
            
            socket.on('online count', (count) => {
                document.getElementById('onlineCount').innerHTML = '👥 Онлайн: ' + count;
            });
            
            socket.on('global message', (msg) => {
                if (currentChat.type === 'global') addMessage(msg);
            });
            
            socket.on('private message', (msg) => {
                if (currentChat.type === 'private' && currentChat.name === msg.from) {
                    addMessage(msg);
                }
                if (msg.from !== currentUser && !friends.includes(msg.from)) {
                    showToast('📩 Новое сообщение от ' + msg.from);
                }
            });
            
            renderFriends();
            loadGlobalMessages();
            showToast('✨ Добро пожаловать, ' + username + '!');
        } else {
            showToast('Ошибка входа!');
        }
    };
    
    function renderFriends() {
        const container = document.getElementById('friendsList');
        container.innerHTML = '<div class="friend ' + (currentChat.type === 'global' ? 'active' : '') + '" onclick="openGlobalChat()"><div class="friend-avatar">🌍</div><div class="friend-info"><div class="friend-name">Общий чат</div><div class="friend-status">Все пользователи</div></div></div>';
        friends.forEach(f => {
            const div = document.createElement('div');
            div.className = 'friend ' + (currentChat.type === 'private' && currentChat.name === f ? 'active' : '');
            div.innerHTML = '<div class="friend-avatar">👤</div><div class="friend-info"><div class="friend-name">' + escapeHtml(f) + '</div><div class="friend-status">Нажми для чата</div></div>';
            div.onclick = () => openPrivateChat(f);
            container.appendChild(div);
        });
    }
    
    function openGlobalChat() {
        currentChat = { type: 'global', name: 'Общий чат' };
        document.getElementById('chatTitle').innerHTML = '# Общий чат';
        renderFriends();
        loadGlobalMessages();
        if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
    }
    
    async function openPrivateChat(friend) {
        currentChat = { type: 'private', name: friend };
        document.getElementById('chatTitle').innerHTML = '@' + friend;
        renderFriends();
        
        const res = await fetch('/privateMessages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user1: currentUser, user2: friend })
        });
        const messages = await res.json();
        const area = document.getElementById('messagesArea');
        area.innerHTML = '';
        messages.forEach(m => addMessage(m));
        if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
    }
    
    async function loadGlobalMessages() {
        const res = await fetch('/globalMessages');
        const messages = await res.json();
        const area = document.getElementById('messagesArea');
        area.innerHTML = '';
        messages.forEach(m => addMessage(m));
    }
    
    function addMessage(msg) {
        const area = document.getElementById('messagesArea');
        const div = document.createElement('div');
        div.className = 'message ' + (msg.from === currentUser ? 'message-mine' : '');
        const time = new Date(msg.time).toLocaleTimeString();
        div.innerHTML = '<div class="message-avatar" onclick="showUserInfo(\'' + escapeHtml(msg.from) + '\')">' + (msg.from[0] || '?') + '</div>' +
            '<div class="message-content">' +
            '<div class="message-header">' +
            '<span class="message-name" onclick="showUserInfo(\'' + escapeHtml(msg.from) + '\')">' + escapeHtml(msg.from) + '</span>' +
            '<span class="message-time">' + time + '</span>' +
            '</div>' +
            '<div class="message-text">' + (msg.text ? escapeHtml(msg.text) : '') + '</div>' +
            (msg.gif ? '<img class="message-img" src="' + msg.gif + '" onclick="window.open(this.src)">' : '') +
            (msg.image ? '<img class="message-img" src="' + msg.image + '" onclick="window.open(this.src)">' : '') +
            (msg.sticker ? '<div style="font-size: 48px; margin-top: 5px;">' + msg.sticker + '</div>' : '') +
            '</div>';
        area.appendChild(div);
        div.scrollIntoView({ behavior: 'smooth' });
    }
    
    function showUserInfo(username) {
        if (username === currentUser) {
            showToast('Это ты, глупый! 🤪');
        } else {
            showToast('👤 ' + username + ' - напиши ему в ЛС!');
        }
    }
    
    function sendMessage() {
        const input = document.getElementById('messageInput');
        let text = input.value.trim();
        if (!text) return;
        
        // Обработка слэш-команд
        if (text.startsWith('/')) {
            const parts = text.split(' ');
            const command = parts[0].toLowerCase();
            if (slashCommands[command]) {
                let response;
                if (command === '/8ball') {
                    response = slashCommands[command](parts.slice(1).join(' '));
                } else {
                    response = slashCommands[command];
                }
                if (typeof response === 'function') response = response();
                
                addMessage({ from: '🤖 БОТ', text: response, time: new Date() });
                input.value = '';
                return;
            } else {
                showToast('❓ Неизвестная команда. /help для списка');
                input.value = '';
                return;
            }
        }
        
        // Эффект пьяного чата
        if (drunkMode && Math.random() > 0.7) {
            const drunkTexts = ['Я тебя лю... блин...', 'Аааааа', 'Кто здесь?', 'Пиваааа!', 'Где мои тапки?'];
            text = drunkTexts[Math.floor(Math.random() * drunkTexts.length)];
        }
        
        if (currentChat.type === 'global') {
            socket.emit('global message', { from: currentUser, text: text });
        } else {
            socket.emit('private message', { from: currentUser, to: currentChat.name, text: text });
        }
        input.value = '';
    }
    
    // Добавление друга
    document.getElementById('addFriendBtn').onclick = async () => {
        const friend = document.getElementById('newFriend').value;
        if (!friend) return;
        if (friend === currentUser) {
            showToast('Нельзя добавить самого себя! 🤡');
            return;
        }
        const res = await fetch('/addFriend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: currentUser, friend: friend })
        });
        const data = await res.json();
        showToast(data.message);
        if (data.success) {
            if (!friends.includes(friend)) friends.push(friend);
            renderFriends();
            document.getElementById('newFriend').value = '';
        }
    };
    
    // GIF
    document.getElementById('gifBtn').onclick = async () => {
        const modal = document.getElementById('gifModal');
        if (modal.style.display === 'flex') { modal.style.display = 'none'; return; }
        modal.style.display = 'flex';
        try {
            const res = await fetch('https://tenor.googleapis.com/v2/search?q=funny+meme&key=AIzaSyC-9oUqY5G1m-Sxulx8QJqzvqQm3XqXJpE&limit=12');
            const data = await res.json();
            modal.innerHTML = '';
            (data.results || []).forEach(gif => {
                const img = document.createElement('img');
                img.src = gif.media_formats.gif.url;
                img.onclick = () => {
                    if (currentChat.type === 'global') {
                        socket.emit('global message', { from: currentUser, text: '🎬 Гифка!', gif: img.src });
                    } else {
                        socket.emit('private message', { from: currentUser, to: currentChat.name, text: '🎬 Гифка!', gif: img.src });
                    }
                    modal.style.display = 'none';
                };
                modal.appendChild(img);
            });
        } catch(e) { modal.innerHTML = '😢 Ошибка загрузки GIF'; }
    };
    
    // Стикеры
    document.getElementById('stickerBtn').onclick = () => {
        const modal = document.getElementById('stickerModal');
        if (modal.style.display === 'flex') { modal.style.display = 'none'; return; }
        modal.style.display = 'flex';
        modal.innerHTML = '';
        stickers.forEach(sticker => {
            const div = document.createElement('div');
            div.className = 'sticker';
            div.textContent = sticker;
            div.onclick = () => {
                if (currentChat.type === 'global') {
                    socket.emit('global message', { from: currentUser, text: '', sticker: sticker });
                } else {
                    socket.emit('private message', { from: currentUser, to: currentChat.name, text: '', sticker: sticker });
                }
                modal.style.display = 'none';
            };
            modal.appendChild(div);
        });
    };
    
    // ИИ с приколами
    document.getElementById('aiBtn').onclick = async () => {
        const question = prompt('🤖 Спроси у ИИ-помощника (может ответить по-прикольному):');
        if (!question) return;
        
        const funnyPrefix = funnyResponses[Math.floor(Math.random() * funnyResponses.length)];
        let answer;
        
        if (question.toLowerCase().includes('ты кто')) {
            answer = 'Я Скебоб, искусственный идиот! 🤖🎉';
        } else if (question.toLowerCase().includes('погода')) {
            answer = 'На улице ' + (Math.random() > 0.5 ? 'солнечно' : 'дождливо') + ', но в чате всегда тепло! ☀️';
        } else if (question.toLowerCase().includes('любовь')) {
            answer = 'Любовь — это когда ты готов делиться последним мемом! ❤️😂';
        } else {
            const res = await fetch('/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question })
            });
            const data = await res.json();
            answer = data.answer;
        }
        
        addMessage({ from: '🤖 ИИ', text: funnyPrefix + answer, time: new Date() });
    };
    
    // Звонок (прикол)
    document.getElementById('callBtn').onclick = () => {
        const responses = [
            '📞 *дзынь-дзынь* Алло? Это Скебоб, я в душе!',
            '📞 Звоню... *гудки* Абонент вне зоны доступа мемов',
            '🎵 *мелодия из "Санта-Барбары"* Ваш звонок очень важен для нас...',
            '🤡 Это розыгрыш! Ха-ха!'
        ];
        showToast(responses[Math.floor(Math.random() * responses.length)]);
    };
    
    // Слэш-кнопка (прикол)
    document.getElementById('slashBtn').onclick = () => {
        const randomInsult = insults[Math.floor(Math.random() * insults.length)];
        showToast('💀 /команда: ' + randomInsult);
    };
    
    // Пьяный режим
    document.getElementById('drunkModeBtn').onclick = () => {
        drunkMode = !drunkMode;
        if (drunkMode) {
            document.body.classList.add('drunk-mode');
            showToast('🍺 Активирован пьяный чат! Сообщения будут с приколами');
        } else {
            document.body.classList.remove('drunk-mode');
            showToast('😇 Трезвый режим активирован');
        }
    };
    
    // Радужный режим
    document.getElementById('rainbowModeBtn').onclick = () => {
        rainbowMode = !rainbowMode;
        if (rainbowMode) {
            document.body.classList.add('rainbow-mode');
            showToast('🌈 РАДУЖНЫЙ РЕЖИМ! Все цвета радуги!');
        } else {
            document.body.classList.remove('rainbow-mode');
            showToast('Обычный режим');
        }
    };
    
    // Картинки
    document.getElementById('fileBtn').onclick = () => document.getElementById('imageInput').click();
    document.getElementById('imageInput').onchange = (e) => {
        const file = e.target.files[0];
        if (file.size > 10 * 1024 * 1024) {
            showToast('Файл слишком большой! Максимум 10MB');
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (currentChat.type === 'global') {
                socket.emit('global message', { from: currentUser, text: '📷 Фото', image: ev.target.result });
            } else {
                socket.emit('private message', { from: currentUser, to: currentChat.name, text: '📷 Фото', image: ev.target.result });
            }
            showToast('📸 Картинка отправлена!');
        };
        reader.readAsDataURL(file);
    };
    
    document.getElementById('menuToggle').onclick = () => {
        document.getElementById('sidebar').classList.toggle('open');
    };
    
    function showToast(msg) {
        const toast = document.createElement('div');
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
</script>
</body>
</html>`);
});

// API
app.post('/register', (req, res) => {
  const { username, password, device } = req.body;
  if (users.has(username)) return res.json({ success: false, message: '❌ Пользователь уже существует!' });
  users.set(username, { password, friends: [], device, avatar: '👤', bio: '', coins: 100 });
  res.json({ success: true, message: '✅ Регистрация успешна!' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  if (user && user.password === password) {
    res.json({ success: true, friends: user.friends, device: user.device });
  } else {
    res.json({ success: false });
  }
});

app.post('/addFriend', (req, res) => {
  const { user, friend } = req.body;
  if (!users.has(friend)) return res.json({ success: false, message: '❌ Пользователь не найден!' });
  const userData = users.get(user);
  if (userData.friends.includes(friend)) return res.json({ success: false, message: 'Уже в друзьях!' });
  userData.friends.push(friend);
  users.set(user, userData);
  res.json({ success: true, message: '✅ Друг добавлен!' });
});

app.get('/globalMessages', (req, res) => {
  res.json(globalMessages);
});

app.post('/privateMessages', (req, res) => {
  const { user1, user2 } = req.body;
  const key1 = `${user1}|${user2}`;
  const key2 = `${user2}|${user1}`;
  const messages = privateMessages.get(key1) || privateMessages.get(key2) || [];
  res.json(messages);
});

app.post('/ai', async (req, res) => {
  const { question } = req.body;
  const funnyAnswers = [
    'Похоже, вы спрашиваете слишком умные вещи! Я всего лишь глупый ИИ 🐸',
    'Мой ответ: 42! Это правильный ответ на любой вопрос! (с) Автостопом по галактике',
    'Я бы ответил, но меня отвлекли мемы с котиками 😺',
    'Секунду, гуглю... *звуки модема* Не нашёл! 🤷‍♂️',
    'По моим данным, вы очень крутой человек! Вот такой ответ'
  ];
  res.json({ answer: funnyAnswers[Math.floor(Math.random() * funnyAnswers.length)] });
});

// Socket.IO
io.on('connection', (socket) => {
  let currentUser = null;
  
  socket.on('user online', (username) => {
    currentUser = username;
    online++;
    io.emit('online count', online);
    console.log(`${username} подключился. Онлайн: ${online}`);
  });
  
  socket.on('global message', (msg) => {
    const message = { ...msg, time: new Date() };
    globalMessages.push(message);
    if (globalMessages.length > 100) globalMessages.shift();
    io.emit('global message', message);
  });
  
  socket.on('private message', (msg) => {
    const message = { ...msg, time: new Date() };
    const key = `${msg.from}|${msg.to}`;
    if (!privateMessages.has(key)) privateMessages.set(key, []);
    const messages = privateMessages.get(key);
    messages.push(message);
    if (messages.length > 50) messages.shift();
    
    // Отправляем получателю
    const recipientSocket = Array.from(io.sockets.sockets.values()).find(s => s.currentUser === msg.to);
    if (recipientSocket) {
      recipientSocket.emit('private message', message);
    }
    socket.emit('private message', message);
  });
  
  socket.on('disconnect', () => {
    if (currentUser) {
      online--;
      io.emit('online count', online);
      console.log(`${currentUser} отключился. Онлайн: ${online}`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  console.log('💬 Skebob Messenger - чат с приколами!');
});
