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

// Envoyer le message à l'API locale
async function sendMessage() {
    const promptInput = document.getElementById('user-prompt');
    const apiKey = document.getElementById('api-key-input').value;
    const uid = document.getElementById('uid-input').value;
    const chatBox = document.getElementById('chat-box');
    
    const text = promptInput.value.trim();
    if (!text) return;

    // Afficher le message utilisateur sur l'écran
    appendMessage(text, 'user');
    promptInput.value = "";

    // Si l'utilisateur tape clear directement dans le chat
    if (text.toLowerCase() === 'clear') {
        clearMemory();
        return;
    }

    // Création de l'élément de chargement IA
    const aiMessageDiv = appendMessage("En train de réfléchir...", 'ai');

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
        removeImage(); // Nettoie l'image après envoi

        if (data.status) {
            simulateTyping(aiMessageDiv, data.response);
        } else {
            aiMessageDiv.innerText = "Erreur : " + (data.error || "Impossible de joindre l'IA.");
        }
    } catch (err) {
        aiMessageDiv.innerText = "Erreur réseau : Vérifie que ton serveur local tourne.";
    }
}

function appendMessage(text, sender) {
    const chatBox = document.getElementById('chat-box');
    const msg = document.createElement('div');
    msg.classList.add('message', sender);
    msg.innerText = text;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
    return msg;
}

// Effet d'écriture fluide (effet machine à écrire)
function simulateTyping(element, text) {
    element.innerText = "";
    let i = 0;
    const interval = setInterval(() => {
        if (i < text.length) {
            element.innerText += text.charAt(i);
            i++;
        } else {
            clearInterval(interval);
        }
    }, 15);
}

// Fonction globale d'effacement de l'historique
async function clearMemory() {
    const uid = document.getElementById('uid-input').value;
    const apiKey = document.getElementById('api-key-input').value;
    
    try {
        const res = await fetch(`/api/gemini-vision?prompt=clear&uid=${uid}&apikey=${apiKey}`);
        const data = await res.json();
        appendMessage("🧹 " + (data.message || "Mémoire vidée !"), 'system-msg');
    } catch(e) {
        appendMessage("Impossible de communiquer avec le serveur pour effacer l'historique.", 'system-msg');
    }
}

// Débloquer les options Premium avec ton mot de passe unique
function unlockPremium() {
    const password = document.getElementById('premium-pwd').value;
    const badge = document.getElementById('premium-badge');
    const premiumOptions = document.getElementById('premium-options');

    if (password === "2$mondombo") {
        badge.innerText = "💎 Mode Premium Actif";
        badge.classList.add('premium');
        premiumOptions.classList.remove('hidden');
        alert("Félicitations ! Le panneau Premium a été débloqué avec succès ! 🎉");
    } else {
        alert("Mot de passe incorrect. Les fonctionnalités Premium restent verrouillées.");
    }
}

// Fonction premium : Changement d'arrière-plan thématique
function changeBackground() {
    const theme = document.getElementById('bg-selector').value;
    document.body.className = ""; // Reset
    if (theme !== "default") {
        document.body.classList.add(theme);
    }
}

// Fonction premium : Activation/Désactivation de la musique d'ambiance
function toggleAudio() {
    const audio = document.getElementById('lofi-audio');
    if (audio.paused) {
        audio.play();
    } else {
        audio.pause();
    }
}

