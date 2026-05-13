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
