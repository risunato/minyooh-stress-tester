// --- HACK VERSI 1.26.51 (ULTIMATE) ---
const mcDataPath = require.resolve('minecraft-data');
const originalMcData = require('minecraft-data');

const patchedMcData = function(version, preNetty) {
    if (version === 'bedrock_1.26.51') {
        return originalMcData('bedrock_1.26.45', preNetty);
    }
    return originalMcData(version, preNetty);
};
Object.assign(patchedMcData, originalMcData);
require.cache[mcDataPath].exports = patchedMcData;

const bedrock = require('bedrock-protocol');
const options = require('bedrock-protocol/src/options');
if (options && options.Versions) {
    options.Versions['1.26.51'] = 2193;
}
// ---------------------------------------

const SERVER_IP = process.env.SERVER_IP || 'premium2.raehost.com'; 
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '19210');     

let activeBots = 0;

async function createBot(index) {
    const username = `Bot_Minyooh_${index}`;
    try {
        const client = bedrock.createClient({
            host: SERVER_IP,
            port: SERVER_PORT,
            username: username,
            offline: true,
            version: '1.26.51'
        });

        client.listeners('error').forEach(listener => client.removeListener('error', listener));
        client.on('error', (err) => {}); // Abaikan semua error pembacaan paket dari server

        client.on('join', () => {
            activeBots++;
            console.log(`  [+] ${username} berhasil menembus masuk! (Online: ${activeBots})`);
        });

        client.on('start_game', (packet) => {
            let pos = packet.player_position;
            console.log(`  [>] ${username} Spawn di X:${pos.x.toFixed(1)}. Berdiri diam memuat Chunk...`);
            
            // Kita minta server mengecilkan chunk agar tidak membebani internet GitHub
            try { client.write('request_chunk_radius', { chunk_radius: 2 }); } catch (e) { }
        });

        client.on('close', () => {
            activeBots--;
            console.log(`  [-] ${username} TERPUTUS dari server. (Sisa: ${activeBots})`);
        });

    } catch (e) {
        console.error(`  [X] Gagal membuat ${username}:`, e.message);
    }
}

// Anti-Crash Global
process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

const { fork } = require('child_process');

if (process.argv[2] === 'child') {
    createBot(parseInt(process.argv[3]));
} else {
    const count = parseInt(process.env.BOT_COUNT || '10');
    console.log("==========================================");
    console.log(` 📡 Target : ${SERVER_IP}:${SERVER_PORT} | 🚀 ${count} Bot...`);
    console.log("==========================================\n");

    (async () => {
        for (let i = 1; i <= count; i++) {
            fork(__filename, ['child', i.toString()]);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Jeda 5 detik tiap bot
        }
        console.log(`\n✅ Pasukan Patung berhasil diterjunkan! Script diamankan.`);
        setInterval(() => {}, 1000 * 60 * 60); // Tahan script hidup 1 jam
    })();
}
