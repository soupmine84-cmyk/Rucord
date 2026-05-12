const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ['polling']
});

// База данных
const users = new Map();
const globalMessages = [];
const privateMessages = new Map();
let online = 0;
const activeSockets = new Map();

app.use(express.json({ limit: '50mb' }));

// ============================================================
// === УМНЫЙ АБСУРДНЫЙ ИИ "ВАЛЕРИЙ ГРАЧУНЕЗ" (как DeepSeek) ===
// ============================================================
function valeriyGrachunez(question) {
  const q = question.toLowerCase();
  
  // 1. Сначала отвечаем умно (логика, факты, советы)
  let smartAnswer = "";
  
  // ---- ЕСЛИ ВОПРОС ПРО НАСТРОЕНИЕ/СОВЕТЫ ----
  if (q.includes('груст') || q.includes('плох') || q.includes('депрес') || q.includes('уныние')) {
    smartAnswer = "Мне жаль, что ты чувствуешь себя так. Попробуй сделать три вещи: 1) выйди на свежий воздух 2) поговори с кем-то близким 3) съешь что-то вкусное. Это не решит все проблемы, но немного облегчит состояние. Помни — любые эмоции проходят, и эта тоже пройдёт.";
  }
  else if (q.includes('любов') || q.includes('отношен') || q.includes('девушк') || q.includes('парень')) {
    smartAnswer = "Отношения — это сложно. Главные составляющие здоровых отношений: доверие, честность и умение слышать друг друга. Не пытайся быть идеальным — будь настоящим. И да, иногда лучше просто поговорить, чем думать, что партнёр сам догадается.";
  }
  else if (q.includes('работ') || q.includes('уволи') || q.includes('начальник') || q.includes('коллег')) {
    smartAnswer = "Токсичная работа высасывает энергию. Если каждый день идёшь с тяжестью — подумай о смене. Но сначала: 1) честно поговори с начальством, 2) начни искать альтернативы в свободное время. Не увольняйся в пустоту.";
  }
  else if (q.includes('друг') || q.includes('ссора') || q.includes('поссорил')) {
    smartAnswer = "Лучшие друзья не появляются из воздуха. Если поссорились — не дай эмоциям взять верх. Подожди день, остынь, потом честно скажи, что чувствуешь. Настоящая дружба переживёт одну ссору, но не переживёт игнорирования.";
  }
  else if (q.includes('учеба') || q.includes('экзамен') || q.includes('учиться')) {
    smartAnswer = "Методика эффективного заучивания: повторять с интервалами (через 20 минут, через день, через неделю). Высыпайся перед экзаменом — память во сне консолидируется. И да, метод 'просто читаю и надеюсь' работает хуже всего.";
  }
  else if (q.includes('деньг') || q.includes('денег') || q.includes('копейк') || q.includes('зарплат')) {
    smartAnswer = "Начни с бюджета: запиши все доходы и расходы за месяц. Найди 2-3 статьи, где можно срезать без боли (кофе на вынос, подписки). Откладывай даже 500 руб автоматически — через год будет 6000 + привычка.";
  }
  else if (q.includes('здоров') || q.includes('бол') || q.includes('болезн') || q.includes('лечен')) {
    smartAnswer = "Я не врач, но базовое: пей воду, высыпайся, не жертвуй сном ради работы. Если что-то беспокоит больше 3 дней — иди к врачу. Самодиагностика по интернету — дорога к тревожному расстройству.";
  }
  else if (q.includes('одино') || q.includes('одинец') || q.includes('никто')) {
    smartAnswer = "Одиночество — это не значит 'никому не нужен'. Часто это просто пауза. Используй её для себя: хобби, прогулки, саморазвитие. Люди начинают тянуться к тем, кому и без них хорошо.";
  }
  else if (q.includes('кот') || q.includes('кошк') || q.includes('пес') || q.includes('питом')) {
    smartAnswer = "Животные — лучшие антидепрессанты. Если берёшь питомца — будь готов к ответственности на 10+ лет. Если не уверен — попробуй передержку или волонтёрство в приюте.";
  }
  else if (q.includes('сон') || q.includes('спать') || q.includes('сплю') || q.includes('бессонниц')) {
    smartAnswer = "Хороший сон = затемнение + прохлада + никаких гаджетов за час. Если не спится — встань, почитай скучную книгу, не лежи в телефоне. Лучше 4 часа полноценного сна, чем 8 часов с телефоном в руках.";
  }
  else if (q.includes('время') || q.includes('быстр') || q.includes('успеват') || q.includes('прокрастин')) {
    smartAnswer = "Правило 2 минут: если дело занимает меньше 2 минут — сделай сразу. Для больших задач разбивай на маленькие. И помни: идеального момента не будет, начинай с того, что есть.";
  }
  else if (q.includes('что делать') && q.length < 30) {
    smartAnswer = "Конкретизируй вопрос. Что именно случилось? Чем конкретнее спросишь — тем лучше я помогу.";
  }
  else if (q.length < 10) {
    smartAnswer = "Расшифруй вопрос. Я умный, но телепатические способности (пока) не купил.";
  }
  
  // 2. Если вопрос не подошёл под категории — генерируем умно-общий ответ
  if (!smartAnswer) {
    const smartResponses = [
      "Это интересный вопрос. Если разобрать его на составляющие: сначала стоит отделить факты от интерпретаций. Затем посмотреть на ситуацию с разных сторон. И только потом делать вывод. Обычно проблема не в фактах, а в том, как мы их склеиваем в голове.",
      "Подумай: то, что происходит сейчас — это результат прошлых действий. Хочешь изменить результат — меняй действия. Звучит банально, но 90% проблем решаются именно так.",
      "Попробуй применить закон Парето: 20% усилий дают 80% результата. Сейчас ты точно фокусируешься на важных 20%? Или распыляешься на 80% мелочей?",
      "Когнитивное искажение: мы часто думаем, что ситуация хуже, чем она есть. Спроси себя: 'Что самое страшное может случиться? А насколько это вероятно? А смогу ли я с этим справиться?' Ответы обычно успокаивают.",
      "Вот тебе техника '5 почему': возьми проблему и спроси 'почему?' 5 раз подряд. Докопаешься до реальной причины, а не просто следствия. Попробуй прямо сейчас."
    ];
    smartAnswer = smartResponses[Math.floor(Math.random() * smartResponses.length)];
  }
  
  // 3. Добавляем АБСУРДНО-РЖАЧНУЮ концовку
  const absurdEndings = [
    " (с) Валерий Грачунез. P.S. А ещё я видел, как ёжик носил яблоко. Это была мощь. 🦔",
    " — Так сказал Валерий и ушёл в закат, жуя печеньку. 🍪",
    "❗Валерий добавил: если ты это читаешь — у тебя хороший вкус. А если нет — всё равно хороший.",
    "🤖 Disclaimer: пока ты читал, Валерий съел твой бутерброд. Извини, инстинкты.",
    "💥 Гениальный ответ одобрен нейросетью 'Кот Бегемот'. Мяу?",
    "🎲 Валерий бросил кубик предсказаний. Выпало: 'Сегодня — твой день. А завтра — тоже. Просто живи, брат.'",
    "🐸 Абсурд-фактор: я нашёл ответ в банке с огурцами. Он там был. Не спрашивай почему.",
    "⚡ Валерий Грачунез желает тебе сил. И да, ты справишься. А если нет — спросишь снова.",
    "🍕 P.S. Валерий рекомендует съесть пиццу. Ржачно, умно, по делу.",
    "🎭 Итог: мир — театр. Ты — актёр. А Валерий — тот чувак в зале, который орёт 'Браво'."
  ];
  
  const randomEnding = absurdEndings[Math.floor(Math.random() * absurdEndings.length)];
  
  // 4. Иногда добавляем умное начало-ахинею
  let prefix = "";
  if (Math.random() > 0.6) {
    const smartPrefixes = [
      "После 2 секунд глубоких размышлений (и поломки вентилятора) я пришёл к выводу: ",
      "С вероятностью 94,7% (плюс-минус табуретка) — ",
      "Валерий Грачунез активировал режим 'Мудрый дед с рофлами': ",
      "Ошибка 404: спокойствие не найдено. Но ответ есть: ",
      "Пока ты печатал, Валерий пересчитал звёзды. Их много. А ответ: "
    ];
    prefix = smartPrefixes[Math.floor(Math.random() * smartPrefixes.length)];
  }
  
  // Финальный ответ
  return prefix + smartAnswer + " " + randomEnding;
}

// ============================================================
// ========== ДАЛЬШЕ ИДЁТ HTML И СЕРВЕР ==========
// ============================================================

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Skebob Messenger | Валерий Грачунез</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1e1f22; height: 100vh; overflow: hidden; }
        
        .login-screen { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .login-box { background: #2b2d31; padding: 30px; border-radius: 20px; width: 90%; max-width: 400px; text-align: center; }
        .login-box input { width: 100%; padding: 12px; margin: 10px 0; background: #1e1f22; border: none; color: white; border-radius: 8px; font-size: 16px; }
        .login-box button { width: 100%; padding: 12px; margin: 10px 0; border: none; border-radius: 8px; cursor: pointer; background: #5865f2; color: white; font-size: 16px; font-weight: bold; }
        .register { background: #23a55a !important; }
        
        .app { display: none; height: 100vh; }
        .sidebar { position: fixed; left: -280px; top: 0; bottom: 0; width: 280px; background: #2b2d31; transition: 0.3s; z-index: 100; padding: 20px; overflow-y: auto; }
        .sidebar.open { left: 0; }
        .chat-area { margin-left: 0; height: 100vh; display: flex; flex-direction: column; background: #313338; }
        .chat-header { padding: 15px; background: #2b2d31; border-bottom: 1px solid #1e1f22; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; }
        .messages-area { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 10px; }
        .message { display: flex; gap: 10px; animation: fadeIn 0.3s; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .message-mine { flex-direction: row-reverse; }
        .message-avatar { width: 40px; height: 40px; background: #5865f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
        .message-content { max-width: 70%; }
        .message-name { font-weight: bold; color: white; margin-bottom: 5px; display: block; }
        .message-text { background: #2b2d31; padding: 8px 12px; border-radius: 15px; color: white; word-wrap: break-word; }
        .message-mine .message-text { background: #5865f2; }
        .message-time { font-size: 10px; color: #949ba4; margin-top: 5px; display: block; }
        
        .input-panel { padding: 15px; background: #2b2d31; display: flex; gap: 10px; border-top: 1px solid #1e1f22; }
        .input-panel input { flex: 1; padding: 12px; background: #1e1f22; border: none; color: white; border-radius: 25px; }
        .action-btn { padding: 8px 15px; margin: 0 5px; border: none; border-radius: 20px; cursor: pointer; color: white; font-weight: bold; }
        .gif-btn { background: #e67e22; }
        .ai-btn { background: #9b59b6; }
        
        .menu-toggle { position: fixed; bottom: 20px; left: 20px; background: #5865f2; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; z-index: 200; border: none; font-size: 24px; }
        
        @media (min-width: 768px) {
            .sidebar { position: relative; left: 0; width: 280px; }
            .menu-toggle { display: none; }
            .app { display: flex !important; flex-direction: row; }
            .chat-area { flex: 1; }
        }
        
        .friend { padding: 12px; margin: 8px 0; background: #1e1f22; border-radius: 10px; cursor: pointer; color: white; transition: 0.2s; }
        .friend:hover { background: #5865f2; }
        .friend.active { background: #5865f2; }
        .online-count { font-size: 12px; color: #949ba4; margin-top: 10px; }
        .toast { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #2b2d31; color: white; padding: 10px 20px; border-radius: 25px; z-index: 9999; animation: fadeIn 0.3s; pointer-events: none; }
    </style>
</head>
<body>

<div class="login-screen" id="loginScreen">
    <div class="login-box">
        <h1>🧠 Skebob + Валерий Грачунез</h1>
        <input type="text" id="username" placeholder="👤 Имя">
        <input type="password" id="password" placeholder="🔒 Пароль">
        <button id="loginBtn">Войти</button>
        <button id="registerBtn" class="register">Регистрация</button>
    </div>
</div>

<div class="app" id="app">
    <div class="sidebar" id="sidebar">
        <h3 style="color: white;">📱 Друзья</h3>
        <div class="online-count" id="onlineCount">👥 Онлайн: 0</div>
        <div id="friendsList" style="margin-top: 20px;"></div>
        <div style="margin-top: 20px;">
            <input type="text" id="friendName" placeholder="Имя друга" style="width:100%; padding:10px; margin-bottom:10px; background:#1e1f22; border:none; color:white; border-radius:8px;">
            <button id="addFriendBtn" style="width:100%; padding:10px; background:#23a55a; border:none; color:white; border-radius:8px; cursor:pointer;">➕ Добавить</button>
        </div>
    </div>
    
    <div class="chat-area">
        <div class="chat-header">
            <h2 id="chatTitle" style="color:white;"># Общий чат</h2>
            <div>
                <button id="gifBtn" class="action-btn gif-btn">🎬 GIF</button>
                <button id="aiBtn" class="action-btn ai-btn">🧠 Валерий Грачунез</button>
            </div>
        </div>
        <div class="messages-area" id="messagesArea"></div>
        <div class="input-panel">
            <input type="text" id="messageInput" placeholder="Спроси Валерия или пиши в чат...">
            <button id="sendBtn">📤</button>
        </div>
    </div>
</div>
<button class="menu-toggle" id="menuToggle">☰</button>

<script src="/socket.io/socket.io.js"></script>
<script>
    let socket = null, currentUser = '', currentChat = 'global', currentFriend = null, friends = [], onlineUsers = new Set();
    
    function showToast(msg) { let t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }
    function escapeHtml(str) { return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }
    
    function addMessageToUI(msg) {
        let area = document.getElementById('messagesArea');
        let div = document.createElement('div');
        div.className = 'message ' + (msg.from === currentUser ? 'message-mine' : '');
        let time = new Date(msg.time).toLocaleTimeString();
        div.innerHTML = '<div class="message-avatar">' + (msg.from[0] || '?').toUpperCase() + '</div>' +
            '<div class="message-content"><span class="message-name">' + escapeHtml(msg.from) + '</span>' +
            '<div class="message-text">' + (msg.text ? escapeHtml(msg.text) : '') + '</div>' +
            (msg.gif ? '<img src="' + escapeHtml(msg.gif) + '" style="max-width:200px; border-radius:10px; margin-top:5px; cursor:pointer;" onclick="window.open(this.src)">' : '') +
            '<span class="message-time">' + time + '</span></div>';
        area.appendChild(div);
        div.scrollIntoView({ behavior: 'smooth' });
    }
    
    function sendMessage() {
        let input = document.getElementById('messageInput');
        let text = input.value.trim();
        if (!text) return;
        if (currentChat === 'global') { socket.emit('global message', { from: currentUser, text: text }); }
        else { socket.emit('private message', { from: currentUser, to: currentFriend, text: text }); addMessageToUI({ from: currentUser, text: text, time: new Date() }); }
        input.value = '';
    }
    
    async function loadGlobalMessages() {
        let res = await fetch('/globalMessages');
        let messages = await res.json();
        let area = document.getElementById('messagesArea');
        area.innerHTML = '';
        if (messages.length === 0) area.innerHTML = '<div style="text-align:center;color:#949ba4;margin-top:50px;">💬 Нет сообщений</div>';
        else messages.forEach(m => addMessageToUI(m));
    }
    
    async function loadPrivateMessages(friend) {
        let res = await fetch('/privateMessages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user1: currentUser, user2: friend }) });
        let messages = await res.json();
        let area = document.getElementById('messagesArea');
        area.innerHTML = '';
        if (messages.length === 0) area.innerHTML = '<div style="text-align:center;color:#949ba4;margin-top:50px;">💬 Нет сообщений с ' + friend + '</div>';
        else messages.forEach(m => addMessageToUI(m));
    }
    
    window.openGlobalChat = function() { currentChat = 'global'; currentFriend = null; document.getElementById('chatTitle').innerHTML = '# Общий чат'; loadGlobalMessages(); renderFriends(); if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open'); };
    window.openPrivateChat = async function(friend) { currentChat = 'private'; currentFriend = friend; document.getElementById('chatTitle').innerHTML = '@' + friend + (onlineUsers.has(friend) ? ' 🟢' : ' ⚫'); await loadPrivateMessages(friend); renderFriends(); if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open'); };
    
    function renderFriends() {
        let container = document.getElementById('friendsList');
        let globalClass = (currentChat === 'global') ? 'active' : '';
        let html = '<div class="friend ' + globalClass + '" onclick="openGlobalChat()">🌍 Общий чат</div>';
        friends.forEach(friend => { let activeClass = (currentChat === 'private' && currentFriend === friend) ? 'active' : ''; let status = onlineUsers.has(friend) ? '🟢' : '⚫'; html += '<div class="friend ' + activeClass + '" onclick="openPrivateChat(\\'' + friend + '\\')">👤 ' + escapeHtml(friend) + ' ' + status + '</div>'; });
        container.innerHTML = html;
    }
    
    function initSocket() {
        socket = io({ transports: ['polling'], reconnection: true });
        socket.on('connect', () => { socket.emit('user online', currentUser); });
        socket.on('global message', (msg) => { if (currentChat === 'global') addMessageToUI(msg); });
        socket.on('private message', (msg) => { if (currentChat === 'private' && currentFriend === msg.from) addMessageToUI(msg); if (msg.from !== currentUser) showToast('📩 от ' + msg.from); });
        socket.on('online users', (usersList) => { onlineUsers.clear(); usersList.forEach(u => onlineUsers.add(u)); renderFriends(); });
        socket.on('online count', (count) => { document.getElementById('onlineCount').innerHTML = '👥 Онлайн: ' + count; });
        socket.on('user joined', (username) => { onlineUsers.add(username); renderFriends(); if (currentFriend === username) document.getElementById('chatTitle').innerHTML = '@' + currentFriend + ' 🟢'; });
        socket.on('user left', (username) => { onlineUsers.delete(username); renderFriends(); if (currentFriend === username) document.getElementById('chatTitle').innerHTML = '@' + currentFriend + ' ⚫'; });
    }
    
    document.getElementById('registerBtn').onclick = async () => { let username = document.getElementById('username').value.trim(); let password = document.getElementById('password').value.trim(); if (!username || !password) { showToast('Заполните поля'); return; } let res = await fetch('/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }); let data = await res.json(); showToast(data.message); if (data.success) { document.getElementById('username').value = ''; document.getElementById('password').value = ''; } };
    
    document.getElementById('loginBtn').onclick = async () => { let username = document.getElementById('username').value.trim(); let password = document.getElementById('password').value.trim(); if (!username || !password) { showToast('Заполните поля'); return; } let res = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }); let data = await res.json(); if (data.success) { currentUser = username; friends = data.friends || []; document.getElementById('loginScreen').style.display = 'none'; document.getElementById('app').style.display = 'flex'; initSocket(); await loadGlobalMessages(); renderFriends(); showToast('Добро пожаловать, ' + username); } else { showToast('Неверный логин или пароль'); } };
    
    document.getElementById('sendBtn').onclick = () => sendMessage();
    document.getElementById('messageInput').onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
    
    document.getElementById('addFriendBtn').onclick = async () => { let friend = document.getElementById('friendName').value.trim(); if (!friend) return; if (friend === currentUser) { showToast('Нельзя себя'); return; } let res = await fetch('/addFriend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: currentUser, friend: friend }) }); let data = await res.json(); showToast(data.message); if (data.success && !friends.includes(friend)) { friends.push(friend); renderFriends(); document.getElementById('friendName').value = ''; } };
    
    document.getElementById('gifBtn').onclick = () => { let url = prompt('URL GIF:'); if (url && socket) { if (currentChat === 'global') socket.emit('global message', { from: currentUser, text: '🎬 GIF', gif: url }); else { socket.emit('private message', { from: currentUser, to: currentFriend, text: '🎬 GIF', gif: url }); addMessageToUI({ from: currentUser, text: '🎬 GIF', gif: url, time: new Date() }); } } };
    
    document.getElementById('aiBtn').onclick = async () => { let question = prompt('🧠 Спроси у Валерия Грачунеза (умный ответ + абсурд и рофлы):'); if (!question) return; showToast('Валерий думает... 🤔'); let res = await fetch('/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: question }) }); let data = await res.json(); addMessageToUI({ from: '🧠 Валерий Грачунез', text: data.answer, time: new Date() }); };
    
    document.getElementById('menuToggle').onclick = () => { document.getElementById('sidebar').classList.toggle('open'); };
</script>
</body>
</html>
  `);
});

// API
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (users.has(username)) return res.json({ success: false, message: '❌ Пользователь существует' });
  users.set(username, { password, friends: [] });
  res.json({ success: true, message: '✅ Регистрация успешна!' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  if (user && user.password === password) res.json({ success: true, friends: user.friends });
  else res.json({ success: false });
});

app.post('/addFriend', (req, res) => {
  const { user, friend } = req.body;
  if (!users.has(friend)) return res.json({ success: false, message: '❌ Пользователь не найден' });
  const userData = users.get(user);
  if (userData.friends.includes(friend)) return res.json({ success: false, message: '❌ Уже в друзьях' });
  userData.friends.push(friend);
  users.set(user, userData);
  res.json({ success: true, message: '✅ Друг добавлен!' });
});

app.get('/globalMessages', (req, res) => res.json(globalMessages));

app.post('/privateMessages', (req, res) => {
  const { user1, user2 } = req.body;
  const key = [user1, user2].sort().join('|');
  res.json(privateMessages.get(key) || []);
});

// Эндпоинт для ИИ "Валерий Грачунез"
app.post('/ai', (req, res) => {
  const { question } = req.body;
  const answer = valeriyGrachunez(question);
  res.json({ answer: answer });
});

// Socket.IO
io.on('connection', (socket) => {
  let currentUser = null;
  socket.on('user online', (username) => { currentUser = username; online++; activeSockets.set(username, socket.id); io.emit('online users', Array.from(activeSockets.keys())); io.emit('online count', online); io.emit('user joined', username); });
  socket.on('global message', (msg) => { const message = { ...msg, time: new Date() }; globalMessages.push(message); if (globalMessages.length > 100) globalMessages.shift(); io.emit('global message', message); });
  socket.on('private message', (msg) => { const message = { ...msg, time: new Date() }; const key = [msg.from, msg.to].sort().join('|'); if (!privateMessages.has(key)) privateMessages.set(key, []); privateMessages.get(key).push(message); if (privateMessages.get(key).length > 50) privateMessages.get(key).shift(); const recipientId = activeSockets.get(msg.to); if (recipientId) io.to(recipientId).emit('private message', message); socket.emit('private message', message); });
  socket.on('disconnect', () => { if (currentUser) { online--; activeSockets.delete(currentUser); io.emit('online users', Array.from(activeSockets.keys())); io.emit('online count', online); io.emit('user left', currentUser); } });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Сервер: http://localhost:${PORT}\n🧠 ИИ "Валерий Грачунез" готов рофлить и умничать!`));
