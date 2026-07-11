let currentBase64Image = null;

// Gestion de la prévisualisation de l'image
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

// Fonction de formatage basique du Markdown (Gras et Blocs de Code)
function formatMarkdown(text) {
    // Échapper le HTML pour éviter les failles XSS
    let cleanText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Gestion des blocs de code ```javascript ... ```
    cleanText = cleanText.replace(/```([\s\S]*?)```/g, function(match, code) {
        return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Gestion du texte en gras **texte**
    cleanText = cleanText.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');

    // Gestion des retours à la ligne
    return cleanText.replace(/\n/g, '<br>');
}

// Envoyer le message à l'API locale
async function sendMessage() {
    const promptInput = document.getElementById('user-prompt');
    const apiKey = document.getElementById('api-key-input').value;
    const uid = document.getElementById('uid-input').value;
    
    const text = promptInput.value.trim();
    if (!text) return;

    // Afficher le message de l'utilisateur
    appendMessage(text, 'user', false);
    promptInput.value = "";

    if (text.toLowerCase() === 'clear') {
        clearMemory();
        return;
    }

    // Message de chargement temporaire
    const aiMessageDiv = appendMessage("L'IA analyse votre requête...", 'ai', false);

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
            // On applique le formatage Markdown et l'effet fluide
            simulateTyping(aiMessageDiv, data.response);
        } else {
            aiMessageDiv.innerHTML = `<span style="color: #ff6b6b;">⚠️ Erreur : ${data.error || "Réponse incorrecte."}</span>`;
        }
    } catch (err) {
        aiMessageDiv.innerHTML = '<span style="color: #ff6b6b;">❌ Impossible de joindre l\'API. Lancez `npm start`.</span>';
    }
}

function appendMessage(text, sender, isHTML = false) {
    const chatBox = document.getElementById('chat-box');
    const msg = document.createElement('div');
    msg.classList.add('message', sender);
    
    if (isHTML) {
        msg.innerHTML = text;
    } else {
        msg.innerText = text;
    }
    
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
    return msg;
}

// Effet machine à écrire compatible avec le HTML formaté
function simulateTyping(element, rawText) {
    element.innerText = "";
    const formattedText = formatMarkdown(rawText);
    
    // Pour éviter de casser les balises HTML en écrivant lettre par lettre, 
    // on injecte directement le HTML formaté avec une transition fluide en CSS
    element.innerHTML = formattedText;
    element.style.opacity = 0;
    setTimeout(() => {
        element.style.transition = "opacity 0.4s ease";
        element.style.opacity = 1;
    }, 50);
}

// Effacer la mémoire locale
async function clearMemory() {
    const uid = document.getElementById('uid-input').value;
    const apiKey = document.getElementById('api-key-input').value;
    
    try {
        const res = await fetch(`/api/gemini-vision?prompt=clear&uid=${uid}&apikey=${apiKey}`);
        const data = await res.json();
        appendMessage("🧹 " + (data.message || "Mémoire vidée !"), 'system-msg', false);
    } catch(e) {
        appendMessage("Erreur lors de la réinitialisation.", 'system-msg', false);
    }
}

// Mode Premium
function unlockPremium() {
    const password = document.getElementById('premium-pwd').value;
    const badge = document.getElementById('premium-badge');
    const premiumOptions = document.getElementById('premium-options');

    if (password === "2$mondombo") {
        badge.innerText = "💎 Mode Premium Actif";
        badge.classList.add('premium');
        premiumOptions.classList.remove('hidden');
    } else {
        alert("Mot de passe incorrect.");
    }
}

function changeBackground() {
    const theme = document.getElementById('bg-selector').value;
    document.body.className = ""; 
    if (theme !== "default") {
        document.body.classList.add(theme);
    }
}

function toggleAudio() {
    const audio = document.getElementById('lofi-audio');
    if (audio.paused) {
        audio.play();
    } else {
        audio.pause();
    }
}
