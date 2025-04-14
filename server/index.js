const express = require('express');
const http = require('http');
const createSignalingServer = require('./signaling-server'); // Import the signaling server

const app = express();
const server = http.createServer(app);
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Start the WebSocket server
createSignalingServer(server);

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});