
  if (msg) {
    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
    if (!msg.reactions[emoji].includes(username)) {
      msg.reactions[emoji].push(username);
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } else {
    res.json({ success: false });
  }
});

app.post('/privateMessages', (req, res) => {
  const { user1, user2 } = req.body;
  const key = [user1, user2].sort().join('|');
  res.json(privateMessages.get(key) || []);
});

app.post('/savePrivateMessage', (req, res) => {
  const { user1, user2, message } = req.body;
  const key = [user1, user2].sort().join('|');
  if (!privateMessages.has(key)) privateMessages.set(key, []);
  privateMessages.get(key).push(message);
  res.json({ success: true });
});

app.post('/ai', (req, res) => {
  res.json({ answer: valeriyGrachunez(req.body.question || '') });
});

app.get('/userProfile/:username', (req, res) => {
  const user = users.get(req.params.username);
  if (user) {
    res.json({ username: req.params.username, avatar: user.avatar, roles: user.roles, registeredAt: user.registeredAt });
  } else {
    res.json({ error: 'Not found' });
  }
});

// ========== HTML СТРАНИЦА ==========
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Skebob | Чат + ЛС</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1e1f22; height: 100vh; overflow: hidden; }
        
        .login-screen { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .login-box { background: #2b2d31; padding: 30px; border-radius: 20px; width: 90%; max-width: 400px; text-align: center; }
        .login-box h1 { color: white; margin-bottom: 20px; }
        .login-box input { width: 100%; padding: 12px; margin: 10px 0; background: #1e1f22; border: none; color: white; border-radius: 8px; font-size: 16px; }
        .login-box button { width: 100%; padding: 12px; margin: 10px 0; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px; }
        #loginBtn { background: #5865f2; color: white; }
        #registerBtn { background: #23a55a; color: white; }
        
        .app { display: none; height: 100vh; }
        .sidebar { position: fixed; left: -280px; top: 0; bottom: 0; width: 280px; background: #2b2d31; transition: 0.3s; padding: 20px; overflow-y: auto; z-index: 150; }
        .sidebar.open { left: 0; }
        
        .profile-card { text-align: center; padding: 15px; background: #1e1f22; border-radius: 12px; margin-bottom: 20px; cursor: pointer; transition: 0.2s; }
        .profile-card:hover { background: #383a40; }
        .profile-avatar { width: 70px; height: 70px; border-radius: 50%; margin: 0 auto 10px; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; overflow: hidden; font-size: 32px; color: white; }
        .profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .profile-name { color: white; font-weight: bold; font-size: 18px; }
        
        .chat-area { margin-left: 0; height: 100vh; display: flex; flex-direction: column; background: #313338; }
        .chat-header { padding: 15px 20px; background: #2b2d31; border-bottom: 1px solid #1e1f22; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; }
        .chat-header h2 { color: white; font-size: 18px; }
        
        .messages-area { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .message { display: flex; gap: 12px; animation: fadeIn 0.2s; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .message-mine { flex-direction: row-reverse; }
        .message-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; flex-shrink: 0; color: white; font-weight: bold; }
        .message-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .message-content { max-width: 70%; }
        .message-header { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
        .message-name { font-weight: bold; color: white; font-size: 14px; cursor: pointer; }
        .message-time { font-size: 10px; color: #949ba4; }
        .message-text { background: #2b2d31; padding: 8px 12px; border-radius: 18px; color: white; word-wrap: break-word; margin-top: 4px; }
        .message-mine .message-text { background: #5865f2; cursor: pointer; }
        .edited-badge { font-size: 9px; color: #949ba4; margin-left: 5px; }
        
        .reactions-bar { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
        .reaction-badge { background: #1e1f22; padding: 2px 8px; border-radius: 20px; font-size: 12px; cursor: pointer; transition: 0.1s; }
        .reaction-badge:hover { background: #5865f2; transform: scale(1.05); }
        
        .reaction-picker { position: fixed; background: #2b2d31; border-radius: 28px; padding: 8px 12px; display: flex; gap: 8px; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .reaction-emoji { font-size: 24px; cursor: pointer; padding: 4px; transition: 0.1s; }
        .reaction-emoji:hover { transform: scale(1.2); background: #1e1f22; border-radius: 50%; }
        
        .input-panel { padding: 15px 20px; background: #2b2d31; display: flex; gap: 10px; border-top: 1px solid #1e1f22; }
        .input-panel input { flex: 1; padding: 12px 16px; background: #1e1f22; border: none; color: white; border-radius: 25px; font-size: 15px; outline: none; }
        .input-panel button { padding: 10px 20px; background: #5865f2; border: none; color: white; border-radius: 25px; cursor: pointer; font-weight: bold; }
        
        .action-bar { display: flex; gap: 8px; }
        .action-btn { padding: 8px 15px; border: none; border-radius: 20px; cursor: pointer; color: white; font-weight: bold; font-size: 13px; }
        .gif-btn { background: #e67e22; }
        .ai-btn { background: #9b59b6; }
        .file-btn { background: #3498db; }
        
        .menu-toggle { position: fixed; bottom: 20px; left: 20px; background: #5865f2; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; z-index: 200; border: none; font-size: 24px; }
        
        @media (min-width: 768px) {
            .sidebar { position: relative; left: 0; width: 280px; }
            .menu-toggle { display: none; }
            .app { display: flex !important; flex-direction: row; }
            .chat-area { flex: 1; }
        }
        
        .friend { padding: 12px; margin: 8px 0; background: #1e1f22; border-radius: 10px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.2s; color: white; }
        .friend:hover { background: #5865f2; }
        .friend.active { background: #5865f2; }
        .friend-avatar { width: 32px; height: 32px; border-radius: 50%; background: #5865f2; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        
        .toast { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #1e1f22; color: white; padding: 10px 20px; border-radius: 25px; z-index: 9999; font-size: 14px; white-space: nowrap; }
        .modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .modal-content { background: #2b2d31; border-radius: 20px; padding: 30px; max-width: 400px; width: 90%; text-align: center; }
        .role-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; margin: 2px; color: white; }
        .avatar-upload { margin: 15px 0; }
        .avatar-upload label { background: #5865f2; padding: 8px 16px; border-radius: 20px; cursor: pointer; color: white; display: inline-block; }
        .avatar-upload input { display: none; }
    </style>
</head>
<body>

<div class="login-screen" id="loginScreen">
    <div class="login-box">
        <h1>⚡ Skebob Messenger</h1>
        <input type="text" id="username" placeholder="👤 Имя пользователя">
        <input type="password" id="password" placeholder="🔒 Пароль">
        <button id="loginBtn">Войти</button>
        <button id="registerBtn">Регистрация</button>
    </div>
</div>

<div class="app" id="app">
    <div class="sidebar" id="sidebar">
        <div class="profile-card" id="profileCard">
            <div class="profile-avatar" id="profileAvatar">?</div>
            <div class="profile-name" id="profileName"></div>
            <div id="profileRoles"></div>
        </div>
        <h3 style="color:white;">📱 Друзья</h3>
        <div id="friendsList"></div>
        <div style="margin-top:20px;">
            <input type="text" id="friendName" placeholder="Имя друга" style="width:100%; padding:10px; margin-bottom:10px; background:#1e1f22; border:none; color:white; border-radius:8px;">
            <button id="addFriendBtn" style="width:100%; padding:10px; background:#23a55a; border:none; color:white; border-radius:8px; cursor:pointer;">➕ Добавить</button>
        </div>
    </div>
    
    <div class="chat-area">
        <div class="chat-header">
            <h2 id="chatTitle"># Общий чат</h2>
            <div class="action-bar">
                <button id="gifBtn" class="action-btn gif-btn">🎬 GIF</button>
                <button id="fileBtn" class="action-btn file-btn">📎 Медиа</button>
                <button id="aiBtn" class="action-btn ai-btn">🧠 Валерий</button>
            </div>
        </div>
        <div class="messages-area" id="messagesArea">
            <div style="text-align:center;color:#949ba4;margin-top:50px;">💬 Напиши сообщение</div>
        </div>
        <div class="input-panel">
            <input type="text" id="messageInput" placeholder="Введите сообщение..." autocomplete="off">
            <button id="sendBtn">📤 Отправить</button>
        </div>
    </div>
</div>
<button class="menu-toggle" id="menuToggle">☰</button>

<script>
    let currentUser = '';
    let currentChat = 'global';
    let currentFriend = null;
    let friends = [];
    let currentAvatar = null;
    let currentRoles = ['Пользователь'];
    
    function showToast(msg) {
        let t = document.createElement('div');
        t.className = 'toast';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function() { t.remove(); }, 3000);
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
    
    function formatTime(date) {
        let d = new Date(date);
        let minutes = Math.floor((new Date() - d) / 60000);
        if (minutes < 1) return 'только что';
        if (minutes < 60) return minutes + ' мин назад';
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    function getRoleColor(role) {
        var colors = { 'Админ': '#ff5555', 'Модератор': '#55ff55', 'Valeriy Enjoyer': '#9b59b6', 'Пользователь': '#5865f2' };
        return colors[role] || '#5865f2';
    }
    
    async function loadMessages() {
        var res;
        if (currentChat === 'global') {
            res = await fetch('/globalMessages');
        } else {
            res = await fetch('/privateMessages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user1: currentUser, user2: currentFriend })
            });
        }
        var messages = await res.json();
        var area = document.getElementById('messagesArea');
        area.innerHTML = '';
        
        for (var i = 0; i < messages.length; i++) {
            var msg = messages[i];
            var div = document.createElement('div');
            div.className = 'message ' + (msg.from === currentUser ? 'message-mine' : '');
            
            var avatarHtml = msg.avatar ? '<img src="' + msg.avatar + '">' : (msg.from[0] || '?').toUpperCase();
            
            var reactionsHtml = '';
            if (msg.reactions) {
                reactionsHtml = '<div class="reactions-bar">';
                for (var emoji in msg.reactions) {
                    reactionsHtml += '<span class="reaction-badge" onclick="showReactionPicker(' + msg.id + ', this)">' + emoji + ' ' + msg.reactions[emoji].length + '</span>';
                }
                reactionsHtml += '</div>';
            }
            
            var rolesHtml = '';
            if (msg.roles) {
                for (var r = 0; r < msg.roles.length; r++) {
                    rolesHtml += '<span class="role-badge" style="background:' + getRoleColor(msg.roles[r]) + '">' + msg.roles[r] + '</span>';
                }
            }
            
            div.innerHTML = '<div class="message-avatar" onclick="openProfile(\\'' + msg.from + '\\')">' + avatarHtml + '</div>' +
                '<div class="message-content">' +
                    '<div class="message-header">' +
                        '<span class="message-name" onclick="openProfile(\\'' + msg.from + '\\')">' + escapeHtml(msg.from) + '</span>' +
                        '<span class="message-time">' + formatTime(msg.time) + '</span>' +
                        rolesHtml +
                    '</div>' +
                    '<div class="message-text" ondblclick="' + (msg.from === currentUser ? 'editMessage(' + msg.id + ', \\'' + escapeHtml(msg.text) + '\\')' : '') + '">' +
                        escapeHtml(msg.text) +
                        (msg.edited ? '<span class="edited-badge">(ред.)</span>' : '') +
                    '</div>' +
                    reactionsHtml +
                '</div>';
            
            area.appendChild(div);
        }
        
        if (messages.length === 0) {
            area.innerHTML = '<div style="text-align:center;color:#949ba4;margin-top:50px;">💬 Нет сообщений</div>';
        }
        area.scrollTop = area.scrollHeight;
    }
    
    async function sendMessageToServer(text, media) {
        var msg = {
            id: Date.now(),
            from: currentUser,
            text: text,
            time: new Date(),
            avatar: currentAvatar,
            roles: currentRoles
        };
        if (media) msg.image = media;
        
        if (currentChat === 'global') {
            await fetch('/globalMessages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(msg)
            });
        } else {
            await fetch('/savePrivateMessage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user1: currentUser, user2: currentFriend, message: msg })
            });
        }
        await loadMessages();
    }
    
    async function sendMessage() {
        var input = document.getElementById('messageInput');
        var text = input.value.trim();
        if (!text) return;
        await sendMessageToServer(text, null);
        input.value = '';
    }
    
    async function editMessage(id, oldText) {
        var newText = prompt('✏️ Редактировать сообщение:', oldText);
        if (newText && newText !== oldText) {
            await fetch('/editMessage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId: id, newText: newText, chatType: currentChat, chatId: currentChat === 'global' ? 'global' : currentFriend })
            });
            await loadMessages();
        }
    }
    
    function showReactionPicker(messageId, element) {
        var picker = document.createElement('div');
        picker.className = 'reaction-picker';
        var emojis = ['👍', '❤️', '😂', '🔥', '💀', '🍑', '🎩', '🧠'];
        picker.innerHTML = '';
        for (var i = 0; i < emojis.length; i++) {
            var span = document.createElement('span');
            span.className = 'reaction-emoji';
            span.textContent = emojis[i];
            picker.appendChild(span);
        }
        
        var rect = element.getBoundingClientRect();
        picker.style.left = rect.left + 'px';
        picker.style.top = (rect.top - 50) + 'px';
        
        var spans = picker.querySelectorAll('.reaction-emoji');
        for (var j = 0; j < spans.length; j++) {
            spans[j].onclick = async function(emoji) {
                return async function() {
                    await fetch('/addReaction', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ messageId: messageId, emoji: emoji, username: currentUser, chatType: currentChat, chatId: currentChat === 'global' ? 'global' : currentFriend })
                    });
                    picker.remove();
                    await loadMessages();
                };
            }(spans[j].textContent);
        }
        
        document.body.appendChild(picker);
        setTimeout(function() { if (picker) picker.remove(); }, 5000);
    }
    
    function openGlobalChat() {
        currentChat = 'global';
        currentFriend = null;
        document.getElementById('chatTitle').innerHTML = '# Общий чат';
        loadMessages();
        renderFriends();
        if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
    }
    
    function openPrivateChat(friend) {
        currentChat = 'private';
        currentFriend = friend;
        document.getElementById('chatTitle').innerHTML = '@' + friend;
        loadMessages();
        renderFriends();
        if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
    }
    
    function renderFriends() {
        var container = document.getElementById('friendsList');
        var globalClass = (currentChat === 'global') ? 'active' : '';
        var html = '<div class="friend ' + globalClass + '" onclick="openGlobalChat()"><div class="friend-avatar">🌍</div> Общий чат</div>';
        for (var i = 0; i < friends.length; i++) {
            var f = friends[i];
            var activeClass = (currentChat === 'private' && currentFriend === f) ? 'active' : '';
            html += '<div class="friend ' + activeClass + '" onclick="openPrivateChat(\\'' + f + '\\')"><div class="friend-avatar">👤</div> ' + escapeHtml(f) + '</div>';
        }
        container.innerHTML = html;
    }
    
    async function openProfile(username) {
        var res = await fetch('/userProfile/' + username);
        var data = await res.json();
        if (data.error) return;
        var modal = document.createElement('div');
        modal.className = 'modal';
        var avatarHtml = data.avatar ? '<img src="' + data.avatar + '" style="width:100px;height:100px;border-radius:50%;">' : (username[0] || '?').toUpperCase();
        var rolesHtml = '';
        for (var i = 0; i < (data.roles || []).length; i++) {
            rolesHtml += '<span class="role-badge" style="background:' + getRoleColor(data.roles[i]) + '">' + data.roles[i] + '</span>';
        }
        modal.innerHTML = '<div class="modal-content">' +
            '<div style="width:100px;height:100px;border-radius:50%;margin:0 auto;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;overflow:hidden;">' + avatarHtml + '</div>' +
            '<h2 style="color:white;margin-top:15px;">' + escapeHtml(username) + '</h2>' +
            '<div>' + rolesHtml + '</div>' +
            '<p style="color:#949ba4;margin-top:15px;">📅 Зарегистрирован: ' + new Date(data.registeredAt).toLocaleDateString() + '</p>' +
            '<button onclick="this.parentElement.parentElement.remove()" style="margin-top:20px; padding:10px 20px; background:#5865f2; border:none; border-radius:20px; color:white; cursor:pointer;">Закрыть</button>' +
            '</div>';
        document.body.appendChild(modal);
    }
    
    function uploadAvatarViaModal() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = async function(ev) {
                var res = await fetch('/uploadAvatar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: currentUser, avatarData: ev.target.result })
                });
                var data = await res.json();
                if (data.success) {
                    currentAvatar = data.avatar;
                    document.getElementById('profileAvatar').innerHTML = '<img src="' + currentAvatar + '">';
                    showToast('✅ Аватарка обновлена!');
                    loadMessages();
                }
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }
    
    // Регистрация
    document.getElementById('registerBtn').onclick = async function() {
        var u = document.getElementById('username').value.trim();
        var p = document.getElementById('password').value.trim();
        if (!u || !p) { showToast('Заполните поля'); return; }
        var res = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        var data = await res.json();
        showToast(data.message);
        if (data.success) {
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
        }
    };
    
    // Логин
    document.getElementById('loginBtn').onclick = async function() {
        var u = document.getElementById('username').value.trim();
        var p = document.getElementById('password').value.trim();
        if (!u || !p) { showToast('Заполните поля'); return; }
        var res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        var data = await res.json();
        if (data.success) {
            currentUser = u;
            friends = data.friends || [];
            currentAvatar = data.avatar;
            currentRoles = data.roles || ['Пользователь'];
            
            document.getElementById('profileName').innerHTML = escapeHtml(u);
            if (currentAvatar) {
                document.getElementById('profileAvatar').innerHTML = '<img src="' + currentAvatar + '">';
            }
            var rolesContainer = document.getElementById('profileRoles');
            rolesContainer.innerHTML = '';
            for (var i = 0; i < currentRoles.length; i++) {
                var badge = document.createElement('span');
                badge.className = 'role-badge';
                badge.style.background = getRoleColor(currentRoles[i]);
                badge.textContent = currentRoles[i];
                rolesContainer.appendChild(badge);
            }
            
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('app').style.display = 'flex';
            await loadMessages();
            renderFriends();
            showToast('Добро пожаловать, ' + u);
        } else {
            showToast('Неверный логин или пароль');
        }
    };
    
    document.getElementById('sendBtn').onclick = sendMessage;
    document.getElementById('messageInput').onkeypress = function(e) { if (e.key === 'Enter') sendMessage(); };
    
    document.getElementById('addFriendBtn').onclick = async function() {
        var f = document.getElementById('friendName').value.trim();
        if (!f) { showToast('Введите имя друга'); return; }
        if (f === currentUser) { showToast('Нельзя добавить себя'); return; }
        var res = await fetch('/addFriend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: currentUser, friend: f })
        });
        var data = await res.json();
        showToast(data.message);
        if (data.success && !friends.includes(f)) {
            friends.push(f);
            renderFriends();
            document.getElementById('friendName').value = '';
        }
    };
    
    document.getElementById('gifBtn').onclick = function() {
        var url = prompt('🎬 URL GIF:');
        if (url) sendMessageToServer('🎬 GIF', url);
    };
    
    document.getElementById('fileBtn').onclick = function() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                sendMessageToServer('📷 Фото', ev.target.result);
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };
    
    document.getElementById('aiBtn').onclick = async function() {
        var q = prompt('🧠 Спроси у Валерия:');
        if (!q) return;
        showToast('Валерий думает...');
        var res = await fetch('/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: q })
        });
        var data = await res.json();
        await sendMessageToServer(data.answer, null);
    };
    
    document.getElementById('profileCard').onclick = function() {
        var modal = document.createElement('div');
        modal.className = 'modal';
        var avatarHtml = currentAvatar ? '<img src="' + currentAvatar + '" style="width:100px;height:100px;border-radius:50%;">' : (currentUser[0] || '?').toUpperCase();
        modal.innerHTML = '<div class="modal-content">' +
            '<div style="width:100px;height:100px;border-radius:50%;margin:0 auto;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:48px;color:white;">' + avatarHtml + '</div>' +
            '<h2 style="color:white;margin-top:15px;">' + escapeHtml(currentUser) + '</h2>' +
            '<div class="avatar-upload">' +
                '<label>📸 Изменить аватарку<input type="file" id="avatarInput" accept="image/*"></label>' +
            '</div>' +
            '<button onclick="uploadAvatarViaModal()" style="margin-top:10px; padding:8px 16px; background:#23a55a; border:none; border-radius:20px; color:white; cursor:pointer;">Загрузить</button>' +
            '<button onclick="this.parentElement.parentElement.remove()" style="margin-top:10px; padding:8px 16px; background:#5865f2; border:none; border-radius:20px; color:white; cursor:pointer;">Закрыть</button>' +
            '</div>';
        document.body.appendChild(modal);
    };
    
    document.getElementById('menuToggle').onclick = function() {
        document.getElementById('sidebar').classList.toggle('open');
    };
    
    // Добавляем демо-сообщения при первом запуске
    setTimeout(function() {
        if (globalMessages.length === 0) {
            globalMessages.push({ id: 1, from: 'Valeriy_Grachunez', text: '🍑 ХРЕНЬ ЭТО! Но чат работает!', time: new Date(), reactions: { '🔥': ['admin'], '🍑': ['User'] }, roles: ['Valeriy Enjoyer'] });
            globalMessages.push({ id: 2, from: 'admin', text: 'Двойной клик по своему сообщению = редактирование', time: new Date(), edited: true, roles: ['Админ'] });
        }
    }, 100);
</script>
</body>
</html>
  `);
});

// ========== ЗАПУСК ==========
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', function() {
  console.log('✅ Skebob запущен на порту ' + PORT);
});
