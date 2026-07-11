let currentBase64Image = null;

// Gérer l'ouverture/fermeture du menu sur téléphone
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function previewFile() {
    const file = document.getElementById('image-input').files[0];
    const preview = document.getElementById('image-preview');
    const container = document.getElementById('image-preview-container');
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = function () {
        currentBase64Image = reader.result;
        preview.src = reader.result;
        container.classList.remove('hidden');
    }
    reader.readAsDataURL(file);
}

function removeImage() {
    currentBase64Image = null;
    document.getElementById('image-input').value = "";
    document.getElementById('image-preview-container').classList.add('hidden');
}

function formatMarkdown(text) {
    let cleanText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    cleanText = cleanText.replace(/```([\s\S]*?)```/g, function(match, code) {
        return `<pre><code>${code.trim()}</code></pre>`;
    });
    cleanText = cleanText.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
    return cleanText.replace(/\n/g, '<br>');
}

async function sendMessage() {
    const promptInput = document.getElementById('user-prompt');
    const apiKey = document.getElementById('api-key-input').value;
    const uid = document.getElementById('uid-input').value;
    
    const text = promptInput.value.trim();
    if (!text) return;

    appendMessage(text, 'user', false);
    promptInput.value = "";

    if (text.toLowerCase() === 'clear') {
        clearMemory();
        return;
    }

    const aiMessageDiv = appendMessage("L'IA analyse votre message...", 'ai', false);

    try {
        const response = await fetch('/api/gemini-vision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: text,
                uid: uid,
                apikey: apiKey,
                img: currentBase64Image
            })
        });

        const data = await response.json();
        removeImage(); 

        if (data.status) {
            aiMessageDiv.innerHTML = formatMarkdown(data.response);
            document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight;
        } else {
            aiMessageDiv.innerHTML = `<span style="color: #ff6b6b;">⚠️ Erreur : ${data.error || "Clé invalide."}</span>`;
        }
    } catch (err) {
        aiMessageDiv.innerHTML = '<span style="color: #ff6b6b;">❌ Impossible de joindre le serveur.</span>';
    }
}

function appendMessage(text, sender, isHTML = false) {
    const chatBox = document.getElementById('chat-box');
    const msg = document.createElement('div');
    msg.classList.add('message', sender);
    if (isHTML) msg.innerHTML = text; else msg.innerText = text;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
    return msg;
}

async function clearMemory() {
    const uid = document.getElementById('uid-input').value;
    const apiKey = document.getElementById('api-key-input').value;
    try {
        const res = await fetch(`/api/gemini-vision?prompt=clear&uid=${uid}&apikey=${apiKey}`);
        const data = await res.json();
        appendMessage("🧹 " + (data.message || "Mémoire vidée !"), 'system-msg', false);
    } catch(e) {
        appendMessage("Erreur réseau.", 'system-msg', false);
    }
}

function unlockPremium() {
    const password = document.getElementById('premium-pwd').value;
    const badge = document.getElementById('premium-badge');
    const premiumOptions = document.getElementById('premium-options');

    if (password === "2$mondombo") {
        badge.innerText = "💎 Premium";
        badge.classList.add('premium');
        premiumOptions.classList.remove('hidden');
        alert("Mode Premium activé ! 🎉");
    } else {
        alert("Mot de passe incorrect.");
    }
}

function changeBackground() {
    const theme = document.getElementById('bg-selector').value;
    document.body.className = ""; 
    if (theme !== "default") document.body.classList.add(theme);
}

function toggleAudio() {
    const audio = document.getElementById('lofi-audio');
    if (audio.paused) audio.play(); else audio.pause();
}
