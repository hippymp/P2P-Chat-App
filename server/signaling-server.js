const WebSocket = require('ws');

function createSignalingServer(server) {
    const wss = new WebSocket.Server({ server });

    const rooms = {};

    wss.on('connection', (ws) => {
        let currentRoom = null;

        ws.on('message', (message) => {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'join':
                    currentRoom = data.room;
                    if (!rooms[currentRoom]) {
                        rooms[currentRoom] = [];
                    }
                    rooms[currentRoom].push(ws);
                    broadcast(currentRoom, { type: 'user-joined', user: data.user });
                    break;

                case 'signal':
                    const roomMembers = rooms[currentRoom] || [];
                    roomMembers.forEach((member) => {
                        if (member !== ws) {
                            member.send(JSON.stringify(data));
                        }
                    });
                    break;

                case 'leave':
                    if (currentRoom) {
                        rooms[currentRoom] = rooms[currentRoom].filter((member) => member !== ws);
                        broadcast(currentRoom, { type: 'user-left', user: data.user });
                    }
                    break;
                case 'message':
                    broadcast(currentRoom, { type: 'message', text: data.text });
                    break;
                case 'file':
                    // Broadcast the file data to all clients in the room
                    broadcast(currentRoom, {
                        type: 'file',
                        name: data.name,
                        size: data.size,
                        data: data.data
                    });
                    break;
            }
        });

        ws.on('close', () => {
            if (currentRoom) {
                rooms[currentRoom] = rooms[currentRoom].filter((member) => member !== ws);
                broadcast(currentRoom, { type: 'user-left', user: 'A user' });
            }
        });
    });

    function broadcast(room, message) {
        const roomMembers = rooms[room] || [];
        roomMembers.forEach((member) => {
            member.send(JSON.stringify(message));
        });
    }
}

module.exports = createSignalingServer;