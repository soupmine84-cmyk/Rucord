// ========== SKEOB MESSENGER ==========
// Telegram + Discord Design Clone (Pure JavaScript)

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentUser = null;
let currentServer = 'main';
let currentChannel = 'general';
let currentChat = 'global'; // 'global' или 'private'
let currentFriend = null;
let friends = [];
let onlineUsers = new Set();
let socket = null;

// Telegram-style данные
let editingMessageId = null;
let replyingToMessage = null;
let selectedMessages = new Set(); // для выделения нескольких сообщений
let userTyping = new Map(); // кто печатает
let userLastSeen = new Map(); // когда был онлайн

// Discord-style данные
let servers = {
    main: {
        name: 'Skebob Community',
        icon: '⚡',
        channels: [
            { id: 'general', name: 'общий-чат', type: 'text', topic: 'Обсуждаем всё' },
            { id: 'memes', name: 'мемы', type: 'text', topic: 'Только мемасики' },
            { id: 'voice-1', name: '🎤 Голосовой', type: 'voice' }
        ],
        roles: ['@everyone', 'Админ', 'Модератор', 'Valeriy Enjoyer']
    },
    gaming: {
        name: 'Gaming Hub',
        icon: '🎮',
        channels: [
            { id: 'lfg', name: 'поиск-игроков', type: 'text' },
            { id: 'valorant', name: 'валорант', type: 'text' }
        ],
        roles: ['@everyone', 'Геймер', 'Про']
    }
};

let currentUserRoles = ['@everyone']; // роли текущего пользователя
let messages = {
    global: [],      // общий чат
    general: [],     // канал general
    memes: [],       // канал memes
    lfg: [],
    valorant: []
};

// ========== TELEGRAM FUNCTIONS ==========

// Форматирование времени "было вчера" / "только что"
function formatTelegramTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days === 1) return 'вчера';
    if (days < 7) return `${days} д назад`;
    return date.toLocaleDateString();
}

// Редактирование сообщения (Telegram style)
function editMessage(messageId, newText) {
    let message = findMessageById(messageId);
    if (message && message.from === currentUser) {
        message.text = newText;
        message.edited = true;
        message.editTime = new Date();
        renderMessages();
        showToast('✏️ Сообщение изменено');
    } else {
        showToast('❌ Нельзя редактировать чужие сообщения');
    }
}

// Добавление реакции (Telegram + Discord style)
function addReaction(messageId, emoji) {
    let message = findMessageById(messageId);
    if (message) {
        if (!message.reactions) message.reactions = {};
        if (!message.reactions[emoji]) message.reactions[emoji] = [];
        if (!message.reactions[emoji].includes(currentUser)) {
            message.reactions[emoji].push(currentUser);
            renderMessages();
            
            // Анимация (Discord style)
            playReactionSound();
        }
    }
}

// Голосовое сообщение (Telegram)
function startVoiceRecording() {
    showToast('🎙️ Запись голосового... (демо)');
    setTimeout(() => {
        let fakeVoiceUrl = 'https://example.com/voice.ogg';
        sendMessage({ text: '🎤 Голосовое сообщение', voice: fakeVoiceUrl });
        showToast('✅ Голосовое отправлено');
    }, 3000);
}

// Ответ на сообщение (Telegram style)
function replyToMessage(message) {
    replyingToMessage = message;
    document.getElementById('messageInput').placeholder = `Ответ ${message.from}...`;
    document.getElementById('replyBar').style.display = 'flex';
}

// Отмена ответа
function cancelReply() {
    replyingToMessage = null;
    document.getElementById('messageInput').placeholder = 'Введите сообщение...';
    document.getElementById('replyBar').style.display = 'none';
}

// Показ "печатает..." (Telegram)
function showTyping(username) {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.textContent = `${username} печатает...`;
        typingIndicator.style.display = 'block';
        setTimeout(() => {
            typingIndicator.style.display = 'none';
        }, 2000);
    }
}

// ========== DISCORD FUNCTIONS ==========

// Переключение сервера (Discord)
function switchServer(serverId) {
    currentServer = serverId;
    const server = servers[serverId];
    const firstTextChannel = server.channels.find(ch => ch.type === 'text');
    if (firstTextChannel) {
        switchChannel(firstTextChannel.id);
    }
    renderServersList();
    renderChannelsList();
    document.getElementById('serverName').textContent = server.name;
}

// Переключение канала (Discord)
function switchChannel(channelId) {
    currentChannel = channelId;
    currentChat = channelId;
    currentFriend = null;
    
    const channel = getCurrentChannel();
    document.getElementById('chatTitle').innerHTML = `# ${channel.name}`;
    document.getElementById('channelTopic').textContent = channel.topic || 'Добро пожаловать!';
    
    loadMessagesForChannel(channelId);
    renderMessages();
    renderChannelsList(); // подсветка активного
}

// Создание эмбеда (Discord)
function createEmbed(title, description, color = '#5865f2', fields = [], thumbnail = null) {
    return {
        type: 'embed',
        title: title,
        description: description,
        color: color,
        fields: fields,
        thumbnail: thumbnail,
        timestamp: new Date()
    };
}

// Отправка эмбеда в чат
function sendEmbed(embedData) {
    sendMessage({ embed: embedData, text: '' });
}

// Упоминание пользователя / роли (Discord)
function mentionUser(username) {
    document.getElementById('messageInput').value += `@${username} `;
    document.getElementById('messageInput').focus();
}

function mentionRole(roleName) {
    document.getElementById('messageInput').value += `@${roleName} `;
}

// Discord-style код-блок с подсветкой
function insertCodeBlock(language = 'javascript') {
    const input = document.getElementById('messageInput');
    input.value += `\`\`\`${language}\n\n\`\`\``;
    input.focus();
}

// Добавление реакции к сообщению (Discord popup)
function showReactionPicker(messageId) {
    const emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥', '💀', '🍑'];
    const picker = document.createElement('div');
    picker.className = 'reaction-picker';
    picker.innerHTML = emojis.map(e => `<span class="reaction-emoji">${e}</span>`).join('');
    picker.style.position = 'absolute';
    picker.style.background = '#1e1f22';
    picker.style.borderRadius = '20px';
    picker.style.padding = '8px';
    picker.style.zIndex = '1000';
    
    document.body.appendChild(picker);
    // позиционирование...
    
    picker.querySelectorAll('.reaction-emoji').forEach(emoji => {
        emoji.onclick = () => {
            addReaction(messageId, emoji.textContent);
            picker.remove();
        };
    });
}

// ========== ОБЩИЕ ФУНКЦИИ ==========

// Поиск сообщения по ID
function findMessageById(messageId) {
    const allMessages = getCurrentMessages();
    return allMessages.find(m => m.id === messageId);
}

// Получить текущие сообщения
function getCurrentMessages() {
    if (currentChat === 'global') return messages.global;
    if (messages[currentChat]) return messages[currentChat];
    return [];
}

// Загрузка сообщений для канала
function loadMessagesForChannel(channelId) {
    if (!messages[channelId]) {
        messages[channelId] = [];
    }
}

// Получить текущий канал
function getCurrentChannel() {
    const server = servers[currentServer];
    return server.channels.find(ch => ch.id === currentChannel);
}

// Отправка сообщения (с поддержкой всех форматов)
function sendMessage(messageData = null) {
    let input = document.getElementById('messageInput');
    let text = messageData ? messageData.text : input.value.trim();
    
    if (!text && !messageData?.image && !messageData?.video && !messageData?.embed) return;
    
    const message = {
        id: Date.now(),
        from: currentUser,
        text: text || '',
        time: new Date(),
        reactions: {},
        replies: []
    };
    
    // Добавляем медиа если есть
    if (messageData?.image) message.image = messageData.image;
    if (messageData?.video) message.video = messageData.video;
    if (messageData?.embed) message.embed = messageData.embed;
    if (messageData?.voice) message.voice = messageData.voice;
    
    // Добавляем ответ если есть
    if (replyingToMessage) {
        message.replyTo = {
            id: replyingToMessage.id,
            from: replyingToMessage.from,
            text: replyingToMessage.text
        };
        cancelReply();
    }
    
    // Сохраняем сообщение
    if (currentChat === 'global') {
        messages.global.push(message);
    } else {
        if (!messages[currentChat]) messages[currentChat] = [];
        messages[currentChat].push(message);
    }
    
    // Очищаем input
    if (!messageData) input.value = '';
    
    renderMessages();
    scrollToBottom();
    
    // Симуляция ответа Валерия (как в оригинале)
    if (text.includes('?')) {
        setTimeout(() => {
            const aiResponse = valeriyGrachunez(text);
            sendMessage({ text: aiResponse });
        }, 1000);
    }
}

// Рендер сообщений (с поддержкой всего функционала)
function renderMessages() {
    const area = document.getElementById('messagesArea');
    if (!area) return;
    
    const allMessages = getCurrentMessages();
    if (allMessages.length === 0) {
        area.innerHTML = '<div class="welcome-message">✨ Добро пожаловать! Напиши первое сообщение</div>';
        return;
    }
    
    area.innerHTML = '';
    
    allMessages.forEach(msg => {
        const div = document.createElement('div');
        div.className = `message ${msg.from === currentUser ? 'message-mine' : ''}`;
        div.setAttribute('data-message-id', msg.id);
        
        const timeStr = formatTelegramTime(new Date(msg.time));
        
        // Сборка HTML с реакциями (Discord style)
        let reactionsHtml = '';
        if (msg.reactions && Object.keys(msg.reactions).length > 0) {
            reactionsHtml = '<div class="reactions-bar">';
            for (const [emoji, users] of Object.entries(msg.reactions)) {
                reactionsHtml += `<span class="reaction-badge" onclick="addReaction(${msg.id}, '${emoji}')">${emoji} ${users.length}</span>`;
            }
            reactionsHtml += '</div>';
        }
        
        // Ответ на сообщение (Telegram style)
        let replyHtml = '';
        if (msg.replyTo) {
            replyHtml = `<div class="reply-indicator">↩️ Ответ ${msg.replyTo.from}: ${msg.replyTo.text.substring(0, 50)}</div>`;
        }
        
        // Эмбед (Discord style)
        let embedHtml = '';
        if (msg.embed) {
            embedHtml = `<div class="embed" style="border-left-color: ${msg.embed.color};">
                            <div class="embed-title">${msg.embed.title}</div>
                            <div class="embed-description">${msg.embed.description}</div>
                         </div>`;
        }
        
        // Медиафайлы
        let mediaHtml = '';
        if (msg.image) mediaHtml = `<img src="${msg.image}" class="message-img" onclick="window.open(this.src)">`;
        if (msg.video) mediaHtml = `<video class="message-video" controls><source src="${msg.video}"></video>`;
        if (msg.voice) mediaHtml = `<audio controls src="${msg.voice}"></audio>`;
        
        div.innerHTML = `
            <div class="message-avatar">${(msg.from[0] || '?').toUpperCase()}</div>
            <div class="message-content">
                <span class="message-name">${escapeHtml(msg.from)}</span>
                <span class="message-time">${timeStr}</span>
                ${replyHtml}
                <div class="message-text">${escapeHtml(msg.text)}</div>
                ${embedHtml}
                ${mediaHtml}
                ${reactionsHtml}
                ${msg.edited ? '<span class="edited-badge">(ред.)</span>' : ''}
            </div>
            <div class="message-actions">
                <button onclick="replyToMessage(${msg.id})">↩️</button>
                ${msg.from === currentUser ? `<button onclick="editMessage(${msg.id})">✏️</button>` : ''}
                <button onclick="showReactionPicker(${msg.id})">😊</button>
            </div>
        `;
        
        area.appendChild(div);
    });
    
    scrollToBottom();
}

// Скролл вниз
function scrollToBottom() {
    const area = document.getElementById('messagesArea');
    if (area) area.scrollTop = area.scrollHeight;
}

// Вспомогательные функции
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
}

function showToast(msg) {
    let t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function playReactionSound() {
    // Просто визуальный фидбек
    console.log('🔊 Reaction sound!');
}

// Валерий Грачунез (копия из оригинала)
function valeriyGrachunez(question) {
    const q = question.toLowerCase();
    const dandyKeywords = ['денди', 'dandy', 'денди ворлд'];
    for (let keyword of dandyKeywords) {
        if (q.includes(keyword)) {
            return "🍑 ХРЕНЬ ЭТО! Валерий говорит — полная хрень! 💀";
        }
    }
    const brainrotKeywords = ['brainrot', 'skibidi', 'сигма'];
    for (let keyword of brainrotKeywords) {
        if (q.includes(keyword)) {
            return "🔥 ЭТО КРУТО! Валерий Грачунез одобряет! 🧠💀";
        }
    }
    const answers = ["ДА, КОНЕЧНО! 🤪", "НЕТ, ТОЧНО НЕТ! 🚫", "БАЗА! 💪", "КРИНЖ! 🤡"];
    return answers[Math.floor(Math.random() * answers.length)];
}

// ========== РЕНДЕР ИНТЕРФЕЙСА ==========
function renderServersList() {
    const container = document.getElementById('serversList');
    if (!container) return;
    
    let html = '';
    for (const [id, server] of Object.entries(servers)) {
        html += `<div class="server-icon ${currentServer === id ? 'active' : ''}" onclick="switchServer('${id}')">${server.icon}</div>`;
    }
    container.innerHTML = html;
}

function renderChannelsList() {
    const container = document.getElementById('channelsList');
    if (!container) return;
    
    const server = servers[currentServer];
    let html = `<div class="channel-header">ТЕКСТОВЫЕ КАНАЛЫ</div>`;
    
    server.channels.forEach(channel => {
        if (channel.type === 'text') {
            html += `<div class="channel ${currentChannel === channel.id ? 'active' : ''}" onclick="switchChannel('${channel.id}')">
                        # ${channel.name}
                     </div>`;
        }
    });
    
    html += `<div class="channel-header">ГОЛОСОВЫЕ</div>`;
    server.channels.forEach(channel => {
        if (channel.type === 'voice') {
            html += `<div class="channel voice-channel" onclick="showToast('🎙️ Голосовой канал (демо)')">
                        🔊 ${channel.name}
                     </div>`;
        }
    });
    
    html += `<div class="channel-header">УЧАСТНИКИ</div>`;
    html += `<div class="member">🟢 ${currentUser}</div>`;
    for (let user of onlineUsers) {
        if (user !== currentUser) {
            html += `<div class="member">🟢 ${user}</div>`;
        }
    }
    
    container.innerHTML = html;
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function init() {
    // Симуляция входа
    currentUser = 'Skebob_User';
    onlineUsers.add('Skebob_User');
    onlineUsers.add('Valeriy_Grachunez');
    friends = ['Valeriy_Grachunez', 'Dendi_Fan'];
    
    renderServersList();
    renderChannelsList();
    
    // Добавляем демо-сообщения
    messages.global.push({
        id: 1,
        from: 'Valeriy_Grachunez',
        text: '🍑 ХРЕНЬ ЭТО! Но вообще база!',
        time: new Date(),
        reactions: { '🔥': ['Skebob_User'], '💀': ['Dendi_Fan'] }
    });
    
    messages.global.push({
        id: 2,
        from: 'Skebob_User',
        text: 'Как дела?',
        time: new Date(Date.now() - 3600000),
        edited: true
    });
    
    renderMessages();
    
    // Настройка обработчиков
    document.getElementById('sendBtn')?.addEventListener('click', () => sendMessage());
    document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
        // Симуляция "печатает..."
        if (socket) socket.emit('typing', currentUser);
    });
    
    document.getElementById('gifBtn')?.addEventListener('click', () => {
        let url = prompt('🎬 URL GIF:');
        if (url) sendMessage({ text: '🎬 GIF', image: url });
    });
    
    document.getElementById('fileBtn')?.addEventListener('click', () => {
        let input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.onchange = (e) => {
            let file = e.target.files[0];
            if (file) {
                let reader = new FileReader();
                reader.onload = (ev) => {
                    let isVideo = file.type.startsWith('video');
                    sendMessage({ 
                        text: isVideo ? '📹 Видео' : '📷 Фото',
                        [isVideo ? 'video' : 'image']: ev.target.result 
                    });
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    });
    
    document.getElementById('aiBtn')?.addEventListener('click', () => {
        let q = prompt('🧠 Спроси у Валерия:');
        if (q) sendMessage({ text: valeriyGrachunez(q) });
    });
    
    document.getElementById('menuToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('open');
    });
    
    showToast('✅ Skebob готов! Дизайн Telegram + Discord');
}

// Запуск при загрузке
if (typeof window !== 'undefined') {
    window.init = init;
    window.switchServer = switchServer;
    window.switchChannel = switchChannel;
    window.sendMessage = sendMessage;
    window.editMessage = editMessage;
    window.addReaction = addReaction;
    window.replyToMessage = replyToMessage;
    window.cancelReply = cancelReply;
    window.showReactionPicker = showReactionPicker;
    window.insertCodeBlock = insertCodeBlock;
    window.mentionUser = mentionUser;
    window.startVoiceRecording = startVoiceRecording;
    
    document.addEventListener('DOMContentLoaded', init);
}

// Экспорт для Node.js (если нужно)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { valeriyGrachunez, sendMessage, editMessage, addReaction };
}
