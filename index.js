const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

// Load user and inventory data from JSON files
let users = JSON.parse(fs.readFileSync('users.json'));
let inventory = JSON.parse(fs.readFileSync('inventory.json'));

// Middleware for API key authentication
function authenticateApiKey(req, res, next) {
    const apiKey = req.header('X-API-Key');
    if (!apiKey) {
        return res.status(401).send('Unauthorized - API Key missing');
    }

    const user = users.find(user => user.apiKey === apiKey);
    if (!user) {
        return res.status(403).send('Forbidden - Invalid API Key');
    }

    req.user = user;
    next();
}

// Middleware for authorization (Admin vs. Normal user)
function authorizeAdmin(req, res, next) {
    if (req.user.role === 'admin') {
        next();
    } else {
        res.status(403).send('Forbidden - Admin access required');
    }
}

// Create user endpoint
app.post('/api/users', (req, res) => {
    const { username, role } = req.body;
    if (!username || !role) {
        return res.status(400).send('Bad Request - Username and role are required');
    }

    if (users.find(user => user.username === username)) {
        return res.status(409).send('Conflict - Username already exists');
    }

    const apiKey = Math.random().toString(36).substr(2, 16);
    const newUser = { username, role, apiKey };
    users.push(newUser);
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
    res.send(newUser);
});

// API key authentication required for the following routes
app.use(authenticateApiKey);

// Normal user can get inventory items
app.get('/api/items', (req, res) => {
    if (req.user.role === 'normal') {
        return res.send(inventory);
    } else {
        return res.status(403).send('Forbidden - Normal user access only');
    }
});

// Admin user can create, update, and delete items
app.post('/api/items', authorizeAdmin, (req, res) => {
    const newItem = req.body;
    newItem.id = inventory.length + 1;
    inventory.push(newItem);
    fs.writeFileSync('inventory.json', JSON.stringify(inventory, null, 2));
    res.send(newItem);
});

app.put('/api/items/:id', authorizeAdmin, (req, res) => {
    const itemId = parseInt(req.params.id);
    const updatedItem = req.body;
    inventory = inventory.map(item => (item.id === itemId ? updatedItem : item));
    fs.writeFileSync('inventory.json', JSON.stringify(inventory, null, 2));
    res.send(updatedItem);
});

app.delete('/api/items/:id', authorizeAdmin, (req, res) => {
    const itemId = parseInt(req.params.id);
    inventory = inventory.filter(item => item.id !== itemId);
    fs.writeFileSync('inventory.json', JSON.stringify(inventory, null, 2));
    res.send(`Item with ID ${itemId} deleted`);
});

// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
