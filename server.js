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

// Прикольные ответы
const funnyResponses = [
    "🤖 Я бы ответил, но меня отвлекли мемы с котиками... ",
    "🎲 Выпало число 42, это ответ на твой вопрос! ",
    "🍕 Пока я думал, кто-то съел мою пиццу. Ответ: ",
    "💀 Я не ИИ, я просто программист под столом. Ладно, держи: ",
    "🦄 По секрету: "
];

const insults = [
    "🤡 Ты серьезно?", "😏 Ой, всё!", "💀 Баян!", "🎪 Так себе идея", "🐸 Ну ты и придумал"
];

app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>⚡ Skebob Messenger</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto; background: #1e1f22; height: 100vh; overflow: hidden; }
        
        @keyframes shake {
            0%,100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        @keyframes rainbow {
            0% { filter: hue-rotate(0deg); }
            100% { filter: hue-rotate(360deg); }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .drunk-mode .messages-area { animation: shake 0.1s infinite; }
        .drunk-mode .message-text { filter: blur(0.5px); }
        .rainbow-mode .message-mine .message-text { animation: rainbow 1s linear infinite; }
        
        .login-screen { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .login-box { background: rgba(43,45,49,0.95); backdrop-filter: blur(10px); padding: 30px; border-radius: 24px; width: 100%; max-width: 380px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        .login-box h1 { color: white; margin-bottom: 20px; font-size: 28px; }
        .login-box input { width: 100%; padding: 14px; margin: 8px 0; background: #1e1f22; border: none; color: white; border-radius: 12px; font-size: 16px; outline: none; }
        .login-box button { width: 100%; padding: 14px; margin: 8px 0; border: none; border-radius: 12px; cursor: pointer; background: #5865f2; color: white; font-size: 16px; font-weight: 600; transition: 0.2s; }
        .login-box button:hover { transform: scale(1.02); filter: brightness(1.1); }
        .register { background: linear-gradient(45deg, #23a55a, #1e7e43) !important; }
        
        .device-select { display: flex; gap: 10px; margin: 15px 0; flex-wrap: wrap; }
        .device-btn { flex: 1; padding: 10px; background: #1e1f22; border: 2px solid #3a3c43; border-radius: 12px; cursor: pointer; color: white; transition: 0.2s; }
        .device-btn.selected { border-color: #5865f2; background: #5865f2; transform: scale(1.05); }
        
        .app { display: none; height: 100vh; flex-direction: column; }
        
        .sidebar { position: fixed; top: 0; left: -280px; bottom: 0; width: 280px; background: #2b2d31; z-index: 200; transition: 0.3s; display: flex; flex-direction: column; }
        .sidebar.open { left: 0; }
        .sidebar-header { padding: 20px; background: linear-gradient(135deg, #5865f2, #4752c4); }
        .sidebar-header h3 { color: white; }
        .online-count { font-size: 12px; color: white; margin-top: 5px; opacity: 0.9; }
        .friends-list { flex: 1; overflow-y: auto; padding: 10px; }
        .friend { padding: 12px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; gap: 12px; margin-bottom: 4px; transition: 0.2s; color: #dbdee1; }
        .friend:hover { background: #3a3c43; transform: translateX(5px); }
        .friend.active { background: #5865f2; }
        .friend-avatar { width: 44px; height: 44px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .friend-info { flex: 1; }
        .friend-name { font-weight: 500; }
        .friend-status { font-size: 11px; color: #949ba4; }
        
        .add-friend { padding: 16px; border-top: 1px solid #1e1f22; display: flex; gap: 8px; }
        .add-friend input { flex: 1; padding: 12px; background: #1e1f22; border: none; color: white; border-radius: 12px; outline: none; }
        .add-friend button { padding: 12px 16px; background: #23a55a; border: none; border-radius: 12px; color: white; cursor: pointer; transition: 0.2s; }
        .add-friend button:hover { transform: scale(1.05); }
        
        .chat-area { flex: 1; display: flex; flex-direction: column; background: #313338; }
        .chat-header { padding: 12px 16px; background: #2b2d31; border-bottom: 1px solid #1e1f22; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
        .chat-header h2 { color: white; font-size: 18px; }
        .action-buttons { display: flex; gap: 6px; flex-wrap: wrap; }
        .action-btn { padding: 6px 14px; border-radius: 20px; border: none; cursor: pointer; color: white; font-size: 13px; font-weight: 500; transition: 0.2s; }
        .action-btn:hover { transform: scale(1.05); }
        .gif-btn { background: #e67e22; }
        .ai-btn { background: #9b59b6; }
        .call-btn { background: #2ecc71; }
        .sticker-btn { background: #f1c40f; color: #333; }
        .slash-btn { background: #e74c3c; }
        
        .messages-area { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .message { display: flex; gap: 10px; animation: fadeIn 0.3s; }
        .message-mine { flex-direction: row-reverse; }
        .message-avatar { width: 36px; height: 36px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
        .message-content { max-width: 75%; }
        .message-header { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
        .message-name { color: white; font-size: 13px; font-weight: 500; cursor: pointer; }
        .message-time { color: #949ba4; font-size: 10px; }
        .message-text { background: #2b2d31; padding: 8px 14px; border-radius: 18px; color: white; word-wrap: break-word; font-size: 14px; }
        .message-mine .message-text { background: #5865f2; }
        .message-img { max-width: 180px; border-radius: 12px; margin-top: 6px; cursor: pointer; }
        
        .input-panel { padding: 12px; background: #2b2d31; display: flex; gap: 8px; border-top: 1px solid #1e1f22; }
        .input-panel input { flex: 1; padding: 12px 16px; background: #1e1f22; border: none; border-radius: 28px; color: white; font-size: 15px; outline: none; }
        .input-panel button { padding: 8px 18px; background: #5865f2; border: none; border-radius: 28px; color: white; cursor: pointer; transition: 0.2s; }
        .input-panel button:hover { transform: scale(1.05); }
        
        .modal { display: none; position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #2b2d31; padding: 12px; border-radius: 20px; width: 90%; max-width: 320px; flex-wrap: wrap; gap: 8px; max-height: 300px; overflow-y: auto; z-index: 1000; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
        .modal img { width: calc(33% - 6px); aspect-ratio: 1; object-fit: cover; border-radius: 10px; cursor: pointer; transition: 0.2s; }
        .modal img:hover { transform: scale(1.05); }
        .sticker { font-size: 48px; cursor: pointer; padding: 8px; transition: 0.2s; background: #1e1f22; border-radius: 12px; text-align: center; display: inline-block; margin: 4px; }
        .sticker:hover { transform: scale(1.2); background: #5865f2; }
        
        .menu-toggle { position: fixed; bottom: 20px; left: 20px; z-index: 150; background: linear-gradient(135deg, #5865f2, #4752c4); width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; border: none; font-size: 24px; }
        .toast { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #2b2d31; color: white; padding: 10px 20px; border-radius: 28px; z-index: 1100; animation: fadeIn 0.3s; pointer-events: none; }
        
        @media (min-width: 769px) {
            .sidebar { position: relative; left: 0; width: 280px; }
            .menu-toggle { display: none; }
            .app { flex-direction: row; }
        }
        
        body.android .message-mine .message-text { background: linear-gradient(135deg, #e91e63, #c2185b); }
        body.iphone .message-mine .message-text { background: linear-gradient(135deg, #007aff, #0051d5); }
    </style>
</head>
<body>

<button class="menu-toggle" id="menuToggle">☰</button>

<div id="loginScreen" class="login-screen">
    <div class="login-box">
        <h1>⚡ Skebob</h1>
        <input type="text" id="loginName" placeholder="Имя">
        <input type="password" id="loginPass" placeholder="Пароль">
        <div class="device-select">
            <button class="device-btn" data-device="android">🤖 Android</button>
            <button class="device-btn" data-device="iphone">📱 iPhone</button>
            <button class="device-btn" data-device="web">💻 Web</button>
        </div>
        <button id="loginBtn">Войти</button>
        <button id="registerBtn" class="register">Регистрация</button>
    </div>
</div>

<div id="app" class="app">
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <h3>⚡ Skebob</h3>
            <div class="online-count" id="onlineCount">👥 Онлайн: 0</div>
            <div style="margin-top: 8px; display: flex; gap: 6px;">
                <button id="drunkModeBtn" style="background:#e74c3c; border:none; padding:4px 8px; border-radius:8px; color:white; cursor:pointer;">🍺 Пьяный</button>
                <button id="rainbowModeBtn" style="background:#f1c40f; border:none; padding:4px 8px; border-radius:8px; color:#333; cursor:pointer;">🌈 Радуга</button>
            </div>
        </div>
        <div class="friends-list" id="friendsList"></div>
        <div class="add-friend">
            <input type="text" id="newFriend" placeholder="Имя друга">
            <button id="addFriendBtn">Добавить</button>
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
            <input type="text" id="messageInput" placeholder="Сообщение... (/help)">
            <button id="fileBtn">📎</button>
            <button id="sendBtn">💬</button>
        </div>
    </div>
</div>

<div id="gifModal" class="modal"></div>
<div id="stickerModal" class="modal"></div>
<input type="file" id="imageInput" style="display:none">

<script src="/socket.io/socket.io.js"></script>
<script>
    let socket = null;
    let currentUser = '';
    let currentChat = { type: 'global', name: 'Общий чат' };
    let friends = [];
    let selectedDevice = 'web';
    let drunkMode = false;
    let rainbowMode = false;
    
    const stickers = ['😀', '😂', '🥲', '😎', '🤪', '🥳', '😈', '👻', '🎃', '🤖', '🐱', '🐶', '🐼', '🍕', '🍺', '💀', '🎉', '❤️', '🔥', '⭐'];
    
    const slashCommands = {
        '/help': '📋 Команды: /joke, /insult, /time, /coinflip, /dice, /8ball [вопрос]',
        '/joke': () => ['Почему программисты не любят природу? Много багов!', 'Что сказал бит другому? "Держи бит!"', 'Встречаются два бага... "Это фича!"'][Math.floor(Math.random()*3)],
        '/insult': () => ['Ты тупой как крякозябра!', 'У тебя лицо как у кота с огурцом!', 'Ты гений обратного действия!'][Math.floor(Math.random()*3)],
        '/time': () => new Date().toLocaleString(),
        '/coinflip': () => Math.random() > 0.5 ? 'Орёл 🦅' : 'Решка 💰',
        '/dice': () => '🎲 Выпало: ' + (Math.floor(Math.random()*6)+1),
        '/8ball': (q) => q ? ['Да', 'Нет', 'Возможно', '100%'][Math.floor(Math.random()*4)] : 'Спроси что-то, например /8ball Я крутой?'
    };
    
    function showToast(msg) {
        let t = document.createElement('div');
        t.className = 'toast';
        t.innerText = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }
    
    function escapeHtml(str) { return str.replace(/[&<>]/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }
    
    document.querySelectorAll('.device-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedDevice = btn.dataset.device;
            document.body.className = selectedDevice;
        };
    });
    document.querySelector('.device-btn[data-device="web"]').classList.add('selected');
    
    document.getElementById('registerBtn').onclick = async () => {
        let user = document.getElementById('loginName').value;
        let pass = document.getElementById('loginPass').value;
        if (!user || !pass) { showToast('Заполните поля!'); return; }
        let res = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass, device: selectedDevice })
        });
        let data = await res.json();
        showToast(data.message);
    };
    
    document.getElementById('loginBtn').onclick = async () => {
        let user = document.getElementById('loginName').value;
        let pass = document.getElementById('loginPass').value;
        let res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        let data = await res.json();
        if (data.success) {
            currentUser = user;
            friends = data.friends || [];
            if (data.device) document.body.className = data.device;
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('app').style.display = 'flex';
            
            socket = io();
            socket.emit('user online', currentUser);
            
            socket.on('online count', (c) => document.getElementById('onlineCount').innerHTML = '👥 Онлайн: ' + c);
            socket.on('global message', (msg) => { if (currentChat.type === 'global') addMessage(msg); });
            socket.on('private message', (msg) => {
                if (currentChat.type === 'private' && currentChat.name === msg.from) addMessage(msg);
                if (msg.from !== currentUser && !friends.includes(msg.from)) showToast('📩 От ' + msg.from);
            });
            
            renderFriends();
            loadGlobalMessages();
            showToast('Добро пожаловать, ' + user);
        } else { showToast('Ошибка входа'); }
    };
    
    function renderFriends() {
        let container = document.getElementById('friendsList');
        container.innerHTML = '<div class="friend ' + (currentChat.type === 'global' ? 'active' : '') + '" onclick="openGlobalChat()"><div class="friend-avatar">🌍</div><div class="friend-info"><div class="friend-name">Общий чат</div><div class="friend-status">Все пользователи</div></div></div>';
        friends.forEach(f => {
            let div = document.createElement('div');
            div.className = 'friend ' + (currentChat.type === 'private' && currentChat.name === f ? 'active' : '');
            div.innerHTML = '<div class="friend-avatar">👤</div><div class="friend-info"><div class="friend-name">' + escapeHtml(f) + '</div><div class="friend-status">Нажми для чата</div></div>';
            div.onclick = () => openPrivateChat(f);
            container.appendChild(div);
        });
    }
    
    window.openGlobalChat = async function() {
        currentChat = { type: 'global', name: 'Общий чат' };
        document.getElementById('chatTitle').innerHTML = '# Общий чат';
        renderFriends();
        await loadGlobalMessages();
        if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
    };
    
    window.openPrivateChat = async function(friend) {
        currentChat = { type: 'private', name: friend };
        document.getElementById('chatTitle').innerHTML = '@' + friend;
        renderFriends();
        let res = await fetch('/privateMessages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user1: currentUser, user2: friend })
        });
        let messages = await res.json();
        let area = document.getElementById('messagesArea');
        area.innerHTML = '';
        messages.forEach(m => addMessage(m));
        if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
    };
    
    async function loadGlobalMessages() {
        let res = await fetch('/globalMessages');
        let messages = await res.json();
        let area = document.getElementById('messagesArea');
        area.innerHTML = '';
        messages.forEach(m => addMessage(m));
    }
    
    function addMessage(msg) {
        let area = document.getElementById('messagesArea');
        let div = document.createElement('div');
        div.className = 'message ' + (msg.from === currentUser ? 'message-mine' : '');
        let time = new Date(msg.time).toLocaleTimeString();
        div.innerHTML = '<div class="message-avatar" onclick="showUserInfo(\'' + escapeHtml(msg.from) + '\')">' + (msg.from[0] || '?') + '</div>' +
            '<div class="message-content">' +
            '<div class="message-header">' +
            '<span class="message-name" onclick="showUserInfo(\'' + escapeHtml(msg.from) + '\')">' + escapeHtml(msg.from) + '</span>' +
            '<span class="message-time">' + time + '</span>' +
            '</div>' +
            '<div class="message-text">' + (msg.text ? escapeHtml(msg.text) : '') + '</div>' +
            (msg.gif ? '<img class="message-img" src="' + msg.gif + '" onclick="window.open(this.src)">' : '') +
            (msg.image ? '<img class="message-img" src="' + msg.image + '" onclick="window.open(this.src)">' : '') +
            (msg.sticker ? '<div style="font-size:48px; margin-top:5px;">' + msg.sticker + '</div>' : '') +
            '</div>';
        area.appendChild(div);
        div.scrollIntoView({ behavior: 'smooth' });
    }
    
    window.showUserInfo = function(username) {
        if (username === currentUser) showToast('Это ты! 🤪');
        else showToast('👤 ' + username);
    };
    
    window.sendMessage = function() {
        let input = document.getElementById('messageInput');
        let text = input.value.trim();
        if (!text) return;
        
        if (text.startsWith('/')) {
            let parts = text.split(' ');
            let cmd = parts[0].toLowerCase();
            if (slashCommands[cmd]) {
                let resp = typeof slashCommands[cmd] === 'function' ? slashCommands[cmd](parts.slice(1).join(' ')) : slashCommands[cmd];
                addMessage({ from: '🤖 БОТ', text: resp, time: new Date() });
                input.value = '';
                return;
            } else { showToast('Неизвестная команда. /help'); input.value = ''; return; }
        }
        
        if (drunkMode && Math.random() > 0.7) {
            let drunk = ['Я тебя лю... блин...', 'Ааааа', 'Кто здесь?', 'Пивааа!', 'Где мои тапки?'];
            text = drunk[Math.floor(Math.random()*drunk.length)];
        }
        
        if (currentChat.type === 'global') socket.emit('global message', { from: currentUser, text: text });
        else socket.emit('private message', { from: currentUser, to: currentChat.name, text: text });
        input.value = '';
    };
    
    document.getElementById('sendBtn').onclick = () => sendMessage();
    document.getElementById('messageInput').onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };
    
    document.getElementById('addFriendBtn').onclick = async () => {
        let friend = document.getElementById('newFriend').value;
        if (!friend) return;
        if (friend === currentUser) { showToast('Нельзя себя добавить!'); return; }
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
            document.getElementById('newFriend').value = '';
        }
    };
    
    document.getElementById('gifBtn').onclick = async () => {
        let modal = document.getElementById('gifModal');
        if (modal.style.display === 'flex') { modal.style.display = 'none'; return; }
        modal.style.display = 'flex';
        try {
            let res = await fetch('https://tenor.googleapis.com/v2/search?q=funny&key=AIzaSyC-9oUqY5G1m-Sxulx8QJqzvqQm3XqXJpE&limit=12');
            let data = await res.json();
            modal.innerHTML = '';
            (data.results || []).forEach(g => {
                let img = document.createElement('img');
                img.src = g.media_formats.gif.url;
                img.onclick = () => {
                    if (currentChat.type === 'global') socket.emit('global message', { from: currentUser, text: '🎬 Гифка!', gif: img.src });
                    else socket.emit('private message', { from: currentUser, to: currentChat.name, text: '🎬 Гифка!', gif: img.src });
                    modal.style.display = 'none';
                };
                modal.appendChild(img);
            });
        } catch(e) { modal.innerHTML = 'Ошибка загрузки'; }
    };
    
    document.getElementById('stickerBtn').onclick = () => {
        let modal = document.getElementById('stickerModal');
        if (modal.style.display === 'flex') { modal.style.display = 'none'; return; }
        modal.style.display = 'flex';
        modal.innerHTML = '';
        stickers.forEach(s => {
            let div = document.createElement('div');
            div.className = 'sticker';
            div.innerText = s;
            div.onclick = () => {
                if (currentChat.type === 'global') socket.emit('global message', { from: currentUser, text: '', sticker: s });
                else socket.emit('private message', { from: currentUser, to: currentChat.name, text: '', sticker: s });
                modal.style.display = 'none';
            };
            modal.appendChild(div);
        });
    };
    
    document.getElementById('aiBtn').onclick = async () => {
        let q = prompt('🤖 Спроси у ИИ:');
        if (!q) return;
        let prefix = funnyResponses[Math.floor(Math.random()*funnyResponses.length)];
        let answer = '';
        if (q.toLowerCase().includes('ты кто')) answer = 'Я Скебоб, искусственный идиот!';
        else if (q.toLowerCase().includes('погода')) answer = 'В чате всегда солнечно! ☀️';
        else if (q.toLowerCase().includes('любовь')) answer = 'Любовь — это делиться мемами! ❤️';
        else {
            let res = await fetch('/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }) });
            let data = await res.json();
            answer = data.answer;
        }
        addMessage({ from: '🤖 ИИ', text: prefix + answer, time: new Date() });
    };
    
    document.getElementById('callBtn').onclick = () => {
        let r = ['📞 Алло? Я в душе!', '📞 Абонент вне зоны мемов', '🎵 Ваш звонок важен...', '🤡 Розыгрыш! Ха-ха!'][Math.floor(Math.random()*4)];
        showToast(r);
    };
    
    document.getElementById('slashBtn').onclick = () => {
        showToast('💀 /команда: ' + insults[Math.floor(Math.random()*insults.length)]);
    };
    
    document.getElementById('drunkModeBtn').onclick = () => {
        drunkMode = !drunkMode;
        if(drunkMode) { document.body.classList.add('drunk-mode'); showToast('🍺 Пьяный чат включен!'); }
        else { document.body.classList.remove('drunk-mode'); showToast('😇 Трезвый режим'); }
    };
    
    document.getElementById('rainbowModeBtn').onclick = () => {
        rainbowMode = !rainbowMode;
        if(rainbowMode) { document.body.classList.add('rainbow-mode'); showToast('🌈 Радужный режим!'); }
        else { document.body.classList.remove('rainbow-mode'); showToast('Обычный режим'); }
    };
    
    document.getElementById('fileBtn').onclick = () => document.getElementById('imageInput').click();
    document.getElementById('imageInput').onchange = (e) => {
        let file = e.target.files[0];
        if(file.size > 10*1024*1024) { showToast('Файл >10MB'); return; }
        let reader = new FileReader();
        reader.onload = (ev) => {
            if(currentChat.type === 'global') socket.emit('global message', { from: currentUser, text: '📷 Фото', image: ev.target.result });
            else socket.emit('private message', { from: currentUser, to: currentChat.name, text: '📷 Фото', image: ev.target.result });
            showToast('Фото отправлено');
        };
        reader.readAsDataURL(file);
    };
    
    document.getElementById('menuToggle').onclick = () => {
        document.getElementById('sidebar').classList.toggle('open');
    };
</script>
</body>
</html>`);
});

// API
app.post('/register', (req, res) => {
  const { username, password, device } = req.body;
  if (users.has(username)) return res.json({ success: false, message: '❌ Пользователь существует' });
  users.set(username, { password, friends: [], device });
  res.json({ success: true, message: '✅ Регистрация успешна!' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  if (user && user.password === password) res.json({ success: true, friends: user.friends, device: user.device });
  else res.json({ success: false });
});

app.post('/addFriend', (req, res) => {
  const { user, friend } = req.body;
  if (!users.has(friend)) return res.json({ success: false, message: '❌ Пользователь не найден' });
  const userData = users.get(user);
  if (userData.friends.includes(friend)) return res.json({ success: false, message: 'Уже в друзьях' });
  userData.friends.push(friend);
  users.set(user, userData);
  res.json({ success: true, message: '✅ Друг добавлен' });
});

app.get('/globalMessages', (req, res) => res.json(globalMessages));

app.post('/privateMessages', (req, res) => {
  const { user1, user2 } = req.body;
  const messages = privateMessages.get(`${user1}|${user2}`) || privateMessages.get(`${user2}|${user1}`) || [];
  res.json(messages);
});

app.post('/ai', (req, res) => {
  const answers = ['Похоже на баг!', '42 — ответ на всё', 'Я глупый ИИ 🐸', 'Гуглил... Не нашёл', 'Ты крутой!'];
  res.json({ answer: answers[Math.floor(Math.random()*answers.length)] });
});

io.on('connection', (socket) => {
  let currentUser = null;
  socket.on('user online', (user) => { currentUser = user; online++; io.emit('online count', online); });
  socket.on('global message', (msg) => { let m = { ...msg, time: new Date() }; globalMessages.push(m); if(globalMessages.length>100) globalMessages.shift(); io.emit('global message', m); });
  socket.on('private message', (msg) => {
    let m = { ...msg, time: new Date() };
    let key = `${msg.from}|${msg.to}`;
    if(!privateMessages.has(key)) privateMessages.set(key, []);
    privateMessages.get(key).push(m);
    if(privateMessages.get(key).length>50) privateMessages.get(key).shift();
    let target = Array.from(io.sockets.sockets.values()).find(s => s.currentUser === msg.to);
    if(target) target.emit('private message', m);
    socket.emit('private message', m);
  });
  socket.on('disconnect', () => { if(currentUser) { online--; io.emit('online count', online); } });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Сервер на http://localhost:${PORT}`));
