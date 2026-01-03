const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); // Serve static files from root

const DATA_DIR = path.join(__dirname, 'data');

// Helper to read/write JSON files
const readData = (filename) => {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
};

const writeData = (filename, data) => {
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// --- Auth Endpoints ---
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    const users = readData('users.json');
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.post('/auth/signup', (req, res) => {
    const { email, password, name } = req.body;
    const users = readData('users.json');
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ success: false, message: 'User already exists' });
    }
    const newUser = { id: Date.now(), email, password, name };
    users.push(newUser);
    writeData('users.json', users);
    res.json({ success: true, user: { id: newUser.id, email: newUser.email, name: newUser.name } });
});

// --- Client Endpoints ---
app.get('/clients', (req, res) => {
    const clients = readData('clients.json');
    res.json(clients);
});

app.post('/clients', (req, res) => {
    const { name, gstin } = req.body;
    const clients = readData('clients.json');
    const newClient = { id: Date.now(), name, gstin, services: [] };
    clients.push(newClient);
    writeData('clients.json', clients);
    res.json(newClient);
});

// --- Service Endpoints ---
app.get('/clients/:clientId/services', (req, res) => {
    const { clientId } = req.params;
    const clients = readData('clients.json');
    const client = clients.find(c => c.id == clientId);
    if (client) {
        res.json(client.services || []);
    } else {
        res.status(404).json({ message: 'Client not found' });
    }
});

app.post('/clients/:clientId/services', (req, res) => {
    const { clientId } = req.params;
    const { name, status, description } = req.body;
    const clients = readData('clients.json');
    const clientIndex = clients.findIndex(c => c.id == clientId);
    if (clientIndex !== -1) {
        const newService = { id: Date.now(), name, status, description };
        if (!clients[clientIndex].services) clients[clientIndex].services = [];
        clients[clientIndex].services.push(newService);
        writeData('clients.json', clients);
        res.json(newService);
    } else {
        res.status(404).json({ message: 'Client not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
