const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const CONVO_FILE = path.join(__dirname, 'convo.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

if (!fs.existsSync(CONVO_FILE)) {
    fs.writeFileSync(CONVO_FILE, JSON.stringify({}), 'utf8');
}

function readConvo() {
    try { return JSON.parse(fs.readFileSync(CONVO_FILE, 'utf8')); } catch (e) { return {}; }
}

function writeConvo(data) {
    fs.writeFileSync(CONVO_FILE, JSON.stringify(data, null, 2), 'utf8');
}

app.all('/api/gemini-vision', async (req, res) => {
    const prompt = req.query.prompt || req.body.prompt;
    const uid = req.query.uid || req.body.uid;
    const apikey = req.query.apikey || req.body.apikey || process.env.GEMINI_API_KEY;
    const imgUrl = req.query.imgUrl || req.body.imgUrl;
    const img = req.query.img || req.body.img;

    if (!prompt || !uid) {
        return res.status(400).json({ status: false, error: "Les paramètres 'prompt' et 'uid' sont obligatoires." });
    }
    if (!apikey) {
        return res.status(400).json({ status: false, error: "Clé API Gemini manquante. Insère-la dans la configuration." });
    }

    if (prompt.trim().toLowerCase() === 'clear') {
        let db = readConvo();
        if (db[uid]) { delete db[uid]; writeConvo(db); }
        return res.json({ message: "Conversation history cleared." });
    }

    try {
        let db = readConvo();
        if (!db[uid]) db[uid] = [];

        let contents = [];
        db[uid].forEach(msg => {
            contents.push({ role: msg.role, parts: [{ text: msg.text }] });
        });

        let newParts = [{ text: prompt }];

        if (imgUrl) {
            try {
                const response = await fetch(imgUrl);
                const buffer = await response.arrayBuffer();
                const base64 = Buffer.from(buffer).toString('base64');
                newParts.push({ inlineData: { mimeType: "image/jpeg", data: base64 } });
            } catch (e) {
                return res.status(400).json({ status: false, error: "Impossible de charger l'image depuis l'URL." });
            }
        } else if (img) {
            const cleanBase64 = img.replace(/^data:image\/\w+;base64,/, "");
            newParts.push({ inlineData: { mimeType: "image/jpeg", data: cleanBase64 } });
        }

        contents.push({ role: "user", parts: newParts });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apikey}`;
        const geminiRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        const json = await geminiRes.json();
        
        if (json.candidates && json.candidates[0]?.content?.parts?.[0]?.text) {
            const replyText = json.candidates[0].content.parts[0].text;
            db[uid].push({ role: "user", text: prompt });
            db[uid].push({ role: "model", text: replyText });
            writeConvo(db);
            return res.json({ status: true, response: replyText });
        } else {
            return res.status(500).json({ status: false, error: "Erreur de la clé ou de Gemini.", details: json });
        }
    } catch (error) {
        return res.status(500).json({ status: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur actif : http://localhost:${PORT}`);
});
