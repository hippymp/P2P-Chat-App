const express = require('express');
const { Server } = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ADMIN = "Admin";

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Start the server
const expressServer = app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

// State management
const UsersState = {
    users: [],
    setUsers(newUsersArray) {
        this.users = newUsersArray;
    }
};

// Initialize Socket.IO
const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5501", "http://127.0.0.1:5501"]
    }
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log(`User ${socket.id} connected`);

    // Send welcome message to the connected user
    socket.emit('message', buildMsg(ADMIN, "Welcome to Chat App!"));

    // Handle room joining
    socket.on('enterRoom', ({ name, room }) => handleRoomJoin(socket, name, room));

    // Handle user disconnection
    socket.on('disconnect', () => handleUserDisconnect(socket));

    // Handle incoming messages
    socket.on('message', ({ name, text, fileContent }) => handleMessage(socket, name, text, fileContent));

    // Handle activity (e.g., typing indicator)
    socket.on('activity', (name) => handleActivity(socket, name));
});

// Helper functions
function handleRoomJoin(socket, name, room) {
    const prevRoom = getUser(socket.id)?.room;

    // Leave the previous room
    if (prevRoom) {
        socket.leave(prevRoom);
        io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`));
    }

    // Activate the user and join the new room
    const user = activateUser(socket.id, name, room);

    // Update the previous room's user list
    if (prevRoom) {
        io.to(prevRoom).emit('userList', { users: getUsersInRoom(prevRoom) });
    }

    // Join the new room
    socket.join(user.room);

    // Notify the user and others in the room
    socket.emit('message', buildMsg(ADMIN, `You have joined the ${user.room} chat room`));
    socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`));

    // Update the user list for the room
    io.to(user.room).emit('userList', { users: getUsersInRoom(user.room) });

    // Update the list of active rooms for everyone
    io.emit('roomList', { rooms: getAllActiveRooms() });
}

function handleUserDisconnect(socket) {
    const user = getUser(socket.id);
    userLeavesApp(socket.id);

    if (user) {
        io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`));
        io.to(user.room).emit('userList', { users: getUsersInRoom(user.room) });
        io.emit('roomList', { rooms: getAllActiveRooms() });
    }

    console.log(`User ${socket.id} disconnected`);
}

function handleMessage(socket, name, text, fileContent) {
    const room = getUser(socket.id)?.room;
    if (room) {
        const message = buildMsg(name, text, fileContent);
        io.to(room).emit('message', message);
    }
}

function handleActivity(socket, name) {
    const room = getUser(socket.id)?.room;
    if (room) {
        socket.broadcast.to(room).emit('activity', name);
    }
}

function buildMsg(name, text, fileContent = null) {
    return {
        name,
        text,
        fileContent,
        time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    };
}

// User management functions
function activateUser(id, name, room) {
    const user = { id, name, room };
    UsersState.setUsers([
        ...UsersState.users.filter(user => user.id !== id),
        user
    ]);
    return user;
}

function userLeavesApp(id) {
    UsersState.setUsers(
        UsersState.users.filter(user => user.id !== id)
    );
}

function getUser(id) {
    return UsersState.users.find(user => user.id === id);
}

function getUsersInRoom(room) {
    return UsersState.users.filter(user => user.room === room);
}

function getAllActiveRooms() {
    return Array.from(new Set(UsersState.users.map(user => user.room)));
}