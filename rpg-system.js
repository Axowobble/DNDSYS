/**
 * RPG System Logic
 * Handles GitHub API interactions and D&D 5e Mechanics
 */

// Configuration
const REPO_OWNER = 'Axowobble';
const REPO_NAME = 'DNDSYS';
const FILE_PATH = 'players.json';

// D&D 5e XP Table (Level 1 - 20)
const XP_TABLE = [
    0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 
    85000, 100000, 120000, 140000, 165000, 190000, 225000, 265000, 305000, 355000
];

// --- API UTILITIES ---

function getToken() {
    const token = localStorage.getItem('dnd_pat');
    if (!token) {
        const input = prompt("Enter your GitHub PAT to access the Tavern:");
        if (input) {
            localStorage.setItem('dnd_pat', input);
            return input;
        }
        alert("Access Denied: Token required.");
        return null;
    }
    return token;
}

async function fetchPlayers() {
    const token = getToken();
    if (!token) return;

    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
    
    try {
        const response = await fetch(url, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        
        const data = await response.json();
        // GitHub sends content as Base64
        const content = JSON.parse(atob(data.content));
        return { content, sha: data.sha }; // SHA is needed to update the file
    } catch (error) {
        console.error("Failed to load players:", error);
        alert("Failed to load data. Check your Token and Repo settings.");
    }
}

async function savePlayers(newContent, currentSha) {
    const token = getToken();
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
    
    const body = {
        message: "Update player data via DnD Dashboard",
        content: btoa(JSON.stringify(newContent, null, 2)), // Encode to Base64
        sha: currentSha
    };

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (response.ok) {
            alert("Saved to Chronicles!");
            window.location.reload();
        } else {
            alert("Save failed. Check console.");
        }
    } catch (e) {
        console.error(e);
    }
}

// --- GAME LOGIC ---

function getLevel(exp) {
    for (let i = XP_TABLE.length - 1; i >= 0; i--) {
        if (exp >= XP_TABLE[i]) return i + 1;
    }
    return 1;
}

function getNextLevelExp(level) {
    if (level >= 20) return XP_TABLE[19];
    return XP_TABLE[level]; // XP_TABLE index is level-1, so next level is index 'level'
}

// --- UI FUNCTIONS ---

// Dashboard Renderer (index.html)
async function initDashboard() {
    const container = document.getElementById('player-grid');
    if (!container) return;

    const data = await fetchPlayers();
    if (!data) return;

    container.innerHTML = data.content.map((p, index) => {
        const nextExp = getNextLevelExp(p.level);
        const prevExp = XP_TABLE[p.level - 1];
        const progressPercent = Math.min(100, Math.max(0, ((p.exp - prevExp) / (nextExp - prevExp)) * 100));

        return `
        <div class="bg-gray-800 border-2 border-yellow-600 rounded-lg p-6 shadow-lg relative overflow-hidden">
            <div class="absolute top-0 right-0 bg-yellow-600 text-black font-bold px-3 py-1 rounded-bl-lg">Lvl ${p.level}</div>
            <h2 class="text-2xl text-yellow-500 font-serif mb-1">${p.name}</h2>
            <p class="text-gray-400 italic mb-4">${p.class}</p>
            
            <div class="mb-2 flex justify-between text-sm text-gray-300">
                <span>XP: ${p.exp}</span>
                <span>Next: ${nextExp}</span>
            </div>
            
            <div class="w-full bg-gray-700 rounded-full h-4 mb-6 border border-gray-600">
                <div class="bg-yellow-600 h-4 rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
            </div>

            <div class="flex gap-2">
                <input type="number" id="exp-input-${index}" placeholder="Add XP" class="w-full bg-gray-900 border border-gray-600 text-white px-3 py-2 rounded focus:outline-none focus:border-yellow-500">
                <button onclick="addExp(${index})" class="bg-yellow-700 hover:bg-yellow-600 text-white px-4 py-2 rounded font-bold transition">Give</button>
            </div>
        </div>
        `;
    }).join('');

    window.playersData = data; // Store globally for handlers
}

// Admin Renderer (admin.html)
async function initAdmin() {
    const tbody = document.getElementById('admin-tbody');
    if (!tbody) return;

    const data = await fetchPlayers();
    if (!data) return;
    window.playersData = data;

    tbody.innerHTML = data.content.map((p, index) => `
        <tr class="border-b border-gray-700 hover:bg-gray-750">
            <td class="p-4 text-white">${p.name}</td>
            <td class="p-4 text-gray-400">${p.class}</td>
            <td class="p-4 text-yellow-500">${p.level}</td>
            <td class="p-4 text-right">
                <button onclick="removePlayer(${index})" class="text-red-400 hover:text-red-300 font-bold">Banist</button>
            </td>
        </tr>
    `).join('');
}

// --- HANDLERS ---

async function addExp(index) {
    const input = document.getElementById(`exp-input-${index}`);
    const amount = parseInt(input.value);
    if (!amount) return;

    const data = window.playersData;
    const player = data.content[index];
    
    player.exp += amount;
    player.level = getLevel(player.exp);

    await savePlayers(data.content, data.sha);
}

async function createPlayer() {
    const name = document.getElementById('new-name').value;
    const cls = document.getElementById('new-class').value;
    if (!name || !cls) return;

    const data = window.playersData;
    const newPlayer = {
        id: Date.now(),
        name: name,
        class: cls,
        exp: 0,
        level: 1
    };

    data.content.push(newPlayer);
    await savePlayers(data.content, data.sha);
}

async function removePlayer(index) {
    if(!confirm("Are you sure you want to banish this soul?")) return;
    
    const data = window.playersData;
    data.content.splice(index, 1);
    await savePlayers(data.content, data.sha);
}

// Auto-init based on page
if (document.getElementById('player-grid')) initDashboard();
if (document.getElementById('admin-tbody')) initAdmin();
