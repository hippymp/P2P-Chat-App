// Initialize Socket.IO
const socket = io('ws://localhost:3000');

// DOM Elements
const msgInput = document.querySelector('#message');
const nameInput = document.querySelector('#name');
const chatRoom = document.querySelector('#room');
const activity = document.querySelector('.activity');
const usersList = document.querySelector('.user-list');
const roomList = document.querySelector('.room-list');
const chatDisplay = document.querySelector('.chat-display');
const suggestionsContainer = document.querySelector('#suggestions');

const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/aac',
    'video/mp4',
    'video/webm',
    'video/ogg',
]

// Import nspell for spell-checking
import nspell from 'https://cdn.skypack.dev/nspell';

// Dictionary URLs
const affUrl = 'https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/en/index.aff';
const dicUrl = 'https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/en/index.dic';

let spell;

// Load the dictionary for spell-checking
async function loadDictionary() {
    try {
        const affResponse = await fetch(affUrl);
        const dicResponse = await fetch(dicUrl);

        const aff = await affResponse.text();
        const dic = await dicResponse.text();

        spell = nspell({ aff, dic });
        console.log('Dictionary loaded successfully');
    } catch (error) {
        console.error('Error loading dictionary:', error);
    }
}

loadDictionary();

// Event Listeners
msgInput.addEventListener("keydown", async (e) => {
    if (!spell) return; // Wait until the dictionary is loaded

    if (e.key !== " ") {
        hideSuggestions();
        return;
    }

    const words = msgInput.value.split(" ");
    const lastWord = words[words.length - 1].trim();

    // Check if the word is valid using nspell
    if (!spell.correct(lastWord)) {
        const suggestions = spell.suggest(lastWord);

        if (suggestions.length > 0) {
            showSuggestions(suggestions, lastWord, words);
        } else {
            hideSuggestions();
        }
    } else {
        hideSuggestions();
    }
});

msgInput.addEventListener('keypress', () => {
    socket.emit('activity', nameInput.value);
});

document.querySelector('.form-msg').addEventListener('submit', sendMessage);
document.querySelector('.form-join').addEventListener('submit', enterRoom);
document.querySelector('#file-input').addEventListener('change', uploadFile);

// Helper Functions
function showSuggestions(suggestions, lastWord, words) {
    // Clear previous suggestions
    suggestionsContainer.innerHTML = '';

    // Populate suggestions
    suggestions.forEach(suggestion => {
        const button = document.createElement('button');
        button.textContent = suggestion;
        button.addEventListener('click', () => {
            // Replace the last word with the selected suggestion
            words[words.length - 1] = suggestion;
            msgInput.value = words.join(" ") + " ";
            hideSuggestions();
        });
        suggestionsContainer.appendChild(button);
    });

    // Position the suggestions container above the input field
    const rect = msgInput.getBoundingClientRect();
    const spacing = 17;
    suggestionsContainer.style.top = `${rect.top + window.scrollY - rect.height - spacing}px`; // Above the input field
    suggestionsContainer.style.left = `${rect.left + window.scrollX}px`;
    suggestionsContainer.style.display = 'flex';
}

function hideSuggestions() {
    suggestionsContainer.style.display = "none";
}

function sendMessage(e) {
    e.preventDefault();
    if (nameInput.value && msgInput.value && chatRoom.value) {
        socket.emit('message', {
            name: nameInput.value,
            text: msgInput.value
        });
        msgInput.value = "";
    }
    msgInput.focus();
}

function enterRoom(e) {
    e.preventDefault();
    if (nameInput.value && chatRoom.value) {
        socket.emit('enterRoom', {
            name: nameInput.value,
            room: chatRoom.value
        });
    }
}

function uploadFile(e) {
    const file = e.target.files[0];
    const maxFileSize = 5 * 1024 * 1024; // 5MB

    if (file.size > maxFileSize) {
        alert("File size exceeds the 5MB limit.");
        e.target.value = "";
        return;
    }

    if (!allowedTypes.includes(file.type)) {
        alert("Invalid file type. Please upload a valid file.");
        e.target.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        socket.emit('message', {
            name: nameInput.value,
            text: `Uploaded file: ${file.name}`,
            fileContent: event.target.result
        })
    }
    reader.readAsDataURL(file);
}

// Socket.IO Event Handlers

function highlightText(text) {
    const doc = nlp(text);

    // Highlight names (proper nouns)
    doc.match('#Person').terms().forEach(term => {
        const word = term.text();
        text = text.replace(
            new RegExp(`\\b${word}\\b`, 'g'),
            `<span class="highlight-name">${word}</span>`
        );
    });

    // Highlight attributes (adjectives)
    doc.match('#Adjective').terms().forEach(term => {
        const word = term.text();
        text = text.replace(
            new RegExp(`\\b${word}\\b`, 'g'),
            `<span class="highlight-attribute">${word}</span>`
        );
    });

    return text;
}


socket.on("message", (data) => {
    activity.textContent = "";
    const { name, text, time, fileContent } = data;

    const li = document.createElement('li');
    li.className = 'post';

    if (name === nameInput.value) li.className = 'post post--right';
    if (name !== nameInput.value && name !== 'Admin') li.className = 'post post--left';

    // Highlight names and attributes
    const highlightedText = highlightText(text);

    if (fileContent) {
        li.innerHTML = `
            <div class="post__header ${name === nameInput.value ? 'post__header--user' : 'post__header--reply'}">
                <span class="post__header--name">${name}</span> 
                <span class="post__header--time">${time}</span> 
            </div>
            <div class="post__text">
                ${highlightedText} <br>
                <a href="${fileContent}" download>Download File</a>
            </div>`;
    } else if (name !== 'Admin') {
        li.innerHTML = `
            <div class="post__header ${name === nameInput.value ? 'post__header--user' : 'post__header--reply'}">
                <span class="post__header--name">${name}</span> 
                <span class="post__header--time">${time}</span> 
            </div>
            <div class="post__text">${highlightedText}</div>`;
    } else {
        li.innerHTML = `<div class="post__text">${highlightedText}</div>`;
    }

    chatDisplay.appendChild(li);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
});

let activityTimer;
socket.on("activity", (name) => {
    activity.textContent = `${name} is typing...`;

    // Clear after 3 seconds 
    clearTimeout(activityTimer);
    activityTimer = setTimeout(() => {
        activity.textContent = "";
    }, 3000);
});

socket.on('userList', ({ users }) => {
    showUsers(users);
});

socket.on('roomList', ({ rooms }) => {
    showRooms(rooms);
});

function showUsers(users) {
    usersList.textContent = '';
    if (users) {
        usersList.innerHTML = `<em>Users in ${chatRoom.value}:</em>`;
        users.forEach((user, i) => {
            usersList.textContent += ` ${user.name}`;
            if (users.length > 1 && i !== users.length - 1) {
                usersList.textContent += ",";
            }
        });
    }
}

function showRooms(rooms) {
    roomList.textContent = '';
    if (rooms) {
        roomList.innerHTML = '<em>Active Rooms:</em>';
        rooms.forEach((room, i) => {
            roomList.textContent += ` ${room}`;
            if (rooms.length > 1 && i !== rooms.length - 1) {
                roomList.textContent += ",";
            }
        });
    }
}


// Focus Toggle 
const focusToggle = document.getElementById('focus-toggle');

function updateFocusButtonText(isOn) {
    focusToggle.textContent = isOn ? 'Focus Mode: ON' : 'Focus Mode: OFF';
}

focusToggle.addEventListener('click', () => {
    const isOn = document.body.classList.toggle('focus-mode');
    localStorage.setItem('focusMode', isOn);
    updateFocusButtonText(isOn);
});

// Set initial button state on load
const storedFocus = localStorage.getItem('focusMode') === 'true';
if (storedFocus) {
    document.body.classList.add('focus-mode');
}
updateFocusButtonText(storedFocus);

