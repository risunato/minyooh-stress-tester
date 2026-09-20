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

        // CCTV 1: Tangkap alasan Kick
        client.on('kick', (reason) => {
            console.log(`  [!] ${username} KICKED:`, reason);
        });

        // CCTV 2: Tangkap Putusnya Jaringan (RakNet Close)
        client.on('close', () => {
            console.log(`  [-] ${username} JARINGAN TERPUTUS (Close Event)!`);
        });

        client.listeners('error').forEach(listener => client.removeListener('error', listener));
        client.on('error', (err) => {
            if (err.message && (err.message.includes('Read error') || err.message.includes('PartialReadError'))) return;
            console.log(`  [X] ERROR ${username}: ${err.message}`);
        });

        client.on('join', () => {
            activeBots++;
            console.log(`  [+] ${username} berhasil masuk!`);
        });

        let tick = 0n;
        let pos = { x: 0, y: 0, z: 0 };
        let moveInterval = null;

        client.on('start_game', (packet) => {
            pos = packet.player_position;
            if (packet.current_tick) tick = BigInt(packet.current_tick);
            console.log(`  [>] ${username} Spawn di X:${pos.x.toFixed(1)}. Sinkronisasi Tick: ${tick}...`);
            
            moveInterval = setInterval(() => {
                try {
                    tick++;
                    client.write('player_auth_input', {
                        pitch: 0, yaw: 0, position: pos, move_vector: { x: 0, z: 0 }, head_yaw: 0,
                        input_data: 0n, input_mode: 'mouse', play_mode: 'screen', interaction_model: 'touch',
                        interact_rotation: { x: 0, z: 0 }, tick: tick, delta: { x: 0, y: -0.0784, z: 0 },
                        transaction_presence: false, item_stack_request_presence: false, block_action_presence: false,
                        vehicle_rotation_presence: false, predicted_vehicle_presence: false, analogue_move_vector: { x: 0, z: 0 },
                        camera_orientation: { x: 0, y: 0, z: 0 }, raw_move_vector: { x: 0, z: 0 }
                    });
                } catch(e) {}
            }, 50);
        });

    } catch (e) {
        console.error(`  [X] Gagal membuat ${username}:`, e.message);
    }
}

process.on('uncaughtException', (err) => {
    console.error("  [X] FATAL ERROR:", err.message);
});

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
            const child = fork(__filename, ['child', i.toString()]);
            
            // CCTV 3: Tangkap jika mesin bot meledak (Crash/Segfault)
            child.on('exit', (code) => {
                console.log(`  [💀] ALARM: Bot ${i} Mati Terbunuh Sistem! (Exit Code: ${code})`);
            });
            
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        setInterval(() => {}, 1000 * 60 * 60);
    })();
}
