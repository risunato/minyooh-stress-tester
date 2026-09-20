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
let botClients = [];

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

        botClients.push(client);

        client.listeners('error').forEach(listener => {
            client.removeListener('error', listener);
        });

        client.on('error', (err) => {
            if (err.message && (err.message.includes('Read error') || err.message.includes('PartialReadError'))) {
            } else if (err.message && err.message.includes('Ping timed out')) {
                console.log(`  [!] Server menendang ${username} (Ping Timeout). TPS Server drop!`);
            } else {
                console.log(`  [!] Error tak terduga pada ${username}: ${err.message}`);
            }
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
            if (packet.current_tick) {
                tick = BigInt(packet.current_tick);
            }
            console.log(`  [>] ${username} ter-spawn di X:${pos.x.toFixed(1)}. Memulai Sinkronisasi Tick: ${tick}...`);
            
            moveInterval = setInterval(() => {
                try {
                    tick++;
                    client.write('player_auth_input', {
                        pitch: 0,
                        yaw: 0,
                        position: pos,
                        move_vector: { x: 0, z: 0 },
                        head_yaw: 0,
                        input_data: 0n,
                        input_mode: 'mouse',
                        play_mode: 'screen',
                        interaction_model: 'touch',
                        interact_rotation: { x: 0, z: 0 },
                        tick: tick,
                        delta: { x: 0, y: -0.0784, z: 0 },
                        transaction_presence: false,
                        item_stack_request_presence: false,
                        block_action_presence: false,
                        vehicle_rotation_presence: false,
                        predicted_vehicle_presence: false,
                        analogue_move_vector: { x: 0, z: 0 },
                        camera_orientation: { x: 0, y: 0, z: 0 },
                        raw_move_vector: { x: 0, z: 0 }
                    });
                } catch(e) {
                    // Munculkan error jika paket salah format!
                    console.log(`  [X] Gagal mengirim paket Auth Input: ${e.message}`);
                }
            }, 50);

            try {
                client.write('request_chunk_radius', { chunk_radius: 2 });
            } catch (e) { }
        });

        client.on('disconnect', (packet) => {
            activeBots--;
            if (moveInterval) clearInterval(moveInterval);
            let reason = packet.reason || 'Server ditutup/Kicked';
            if (packet.hide_disconnect_reason === false) {
                 reason += ` (Pesan Server: ${packet.message})`;
            }
            console.log(`  [-] ${username} terputus: ${reason}`);
        });

    } catch (e) {
        console.error(`  [X] Gagal membuat ${username}:`, e.message);
    }
}

// Tangkap semua error aneh
process.on('uncaughtException', (err) => {
    console.error("  [X] FATAL ERROR Bckgrnd:", err.message);
});
process.on('unhandledRejection', (err) => {
    console.error("  [X] FATAL PROMISE Bckgrnd:", err.message);
});

const { fork } = require('child_process');

if (process.argv[2] === 'child') {
    const botIndex = parseInt(process.argv[3]);
    createBot(botIndex);
} else {
    const count = parseInt(process.env.BOT_COUNT || '10');
    console.log("==========================================");
    console.log(" 🤖 MINYOOH SMP - GITHUB ACTIONS STRESS TESTER");
    console.log("==========================================");
    console.log(` 📡 Target : ${SERVER_IP}:${SERVER_PORT}`);
    console.log(` 🚀 Meluncurkan ${count} Bot...`);
    console.log("==========================================\n");

    const JOIN_DELAY_MS = 5000; 

    (async () => {
        for (let i = 1; i <= count; i++) {
            fork(__filename, ['child', i.toString()]);
            await new Promise(resolve => setTimeout(resolve, JOIN_DELAY_MS));
        }
        console.log(`\n✅ Semua perintah koneksi selesai dikirim. Script ditahan agar tidak dimatikan GitHub...`);
        // PENTING: Mencegah GitHub mematikan server secara paksa selama 1 Jam!
        setInterval(() => {}, 1000 * 60 * 60);
    })();
}
