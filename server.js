const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const CONVO_FILE = path.join(__dirname, 'convo.json');

// Configuration du serveur
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Securite : Cree le fichier convo.json s'il n'existe pas
if (!fs.existsSync(CONVO_FILE)) {
    fs.writeFileSync(CONVO_FILE, JSON.stringify({}), 'utf8');
}

function readConvo() {
    try {
        return JSON.parse(fs.readFileSync(CONVO_FILE, 'utf8'));
    } catch (e) {
        return {};
    }
}

function writeConvo(data) {
    fs.writeFileSync(CONVO_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Endpoint unique : /api/gemini-vision
app.all('/api/gemini-vision', async (req, res) => {
    // Recupere les donnees peu importe la methode (GET ou POST)
    const prompt = req.query.prompt || req.body.prompt;
    const uid = req.query.uid || req.body.uid;
    const apikey = req.query.apikey || req.body.apikey || process.env.GEMINI_API_KEY;
    const imgUrl = req.query.imgUrl || req.body.imgUrl;
    const img = req.query.img || req.body.img;

    // Verifications de securite des parametres requis
    if (!prompt || !uid) {
        return res.status(400).json({ status: false, error: "Les parametres 'prompt' et 'uid' sont obligatoires." });
    }
    if (!apikey) {
        return res.status(400).json({ status: false, error: "Cle API Gemini manquante." });
    }

    // Commande speciale pour effacer la memoire d'un utilisateur
    if (prompt.trim().toLowerCase() === 'clear') {
        let db = readConvo();
        if (db[uid]) {
            delete db[uid];
            writeConvo(db);
        }
        return res.json({ message: "Conversation history cleared." });
    }

    try {
        let db = readConvo();
        if (!db[uid]) db[uid] = [];

        let contents = [];
        
        // On injecte l'historique de cet utilisateur dans la requete pour Gemini
        db[uid].forEach(msg => {
            contents.push({ role: msg.role, parts: [{ text: msg.text }] });
        });

        let newParts = [{ text: prompt }];

        // Gestion de l'image si elle est fournie par URL
        if (imgUrl) {
            try {
                const response = await fetch(imgUrl);
                const buffer = await response.arrayBuffer();
                const base64 = Buffer.from(buffer).toString('base64');
                newParts.push({
                    inlineData: { mimeType: "image/jpeg", data: base64 }
                });
            } catch (e) {
                return res.status(400).json({ status: false, error: "Impossible de recuperer l'image depuis l'URL." });
            }
        } 
        // Gestion de l'image si elle est fournie directement en Base64
        else if (img) {
            const cleanBase64 = img.replace(/^data:image\/\w+;base64,/, "");
            newParts.push({
                inlineData: { mimeType: "image/jpeg", data: cleanBase64 }
            });
        }

        contents.push({ role: "user", parts: newParts });

        // Requete HTTP vers l'API officielle Google Gemini 2.5 Flash
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apikey}`;
        const geminiRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        const json = await geminiRes.json();
        
        if (json.candidates && json.candidates[0]?.content?.parts?.[0]?.text) {
            const replyText = json.candidates[0].content.parts[0].text;

            // Sauvegarde du dialogue dans convo.json pour le contexte futur
            db[uid].push({ role: "user", text: prompt });
            db[uid].push({ role: "model", text: replyText });
            writeConvo(db);

            return res.json({ status: true, response: replyText });
        } else {
            return res.status(500).json({ status: false, error: "Reponse inattendue de l'API Gemini.", details: json });
        }

    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
});

// Demarrage du serveur local
app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Serveur pret : http://localhost:${PORT}`);
    console.log(`💬 Interface Web : http://localhost:${PORT}`);
    console.log(`🔌 Endpoint API  : http://localhost:${PORT}/api/gemini-vision`);
    console.log(`=======================================================`);
});

