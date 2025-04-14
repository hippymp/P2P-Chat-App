// Get references to HTML elements
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const messagesDiv = document.getElementById('messages');
const fileInput = document.getElementById('file-input');
const uploadButton = document.getElementById('upload-button');
const fileListDiv = document.getElementById('file-list');
const room = prompt('Enter room name:');

// WebSocket connection
const socket = new WebSocket('ws://localhost:3000');

// Event listeners
sendButton.addEventListener('click', sendMessage);
uploadButton.addEventListener('click', uploadFile);

// Functions
function sendMessage() {
    const message = messageInput.value;
    // Send message to the signaling server
    socket.send(JSON.stringify({ type: 'message', text: message }));
    messageInput.value = '';
}

function uploadFile() {
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();

        reader.onload = function (event) {
            const arrayBuffer = event.target.result;
            // Send file data to the signaling server
            socket.send(JSON.stringify({
                type: 'file',
                name: file.name,
                size: file.size,
                data: arrayBuffer
            }));
        };

        reader.readAsArrayBuffer(file);
    } else {
        alert('Please select a file to upload.');
    }
}

// WebSocket event handlers
socket.addEventListener('open', (event) => {
    console.log('Connected to signaling server');
    // Send a join message to the server
    socket.send(JSON.stringify({ type: 'join', room: room, user: 'user' }));
});

socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
        case 'message':
            displayMessage(data.text);
            break;
        case 'file':
            // Handle file data
            console.log('Receiving file:', data.name);
            displayFile(data);
            break;
    }
});

socket.addEventListener('close', (event) => {
    console.log('Disconnected from signaling server');
});

socket.addEventListener('error', (event) => {
    console.error('WebSocket error:', event);
});

// Helper functions
function displayMessage(message) {
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll to bottom
}

function downloadFile(fileData) {
    const blob = new Blob([fileData.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileData.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function displayFile(fileData) {
    const fileElement = document.createElement('p');
    const downloadLink = document.createElement('a');
    downloadLink.href = '#'; // Placeholder for the download link
    downloadLink.textContent = fileData.name;
    downloadLink.addEventListener('click', () => {
        downloadFile(fileData);
    });
    fileElement.appendChild(downloadLink);
    fileListDiv.appendChild(fileElement);
}