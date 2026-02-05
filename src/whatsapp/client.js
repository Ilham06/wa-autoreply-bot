import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';

let waReady = false;

export async function startWA(onMessage) {
    const { state, saveCreds } = await useMultiFileAuthState('auth');

    const sock = makeWASocket({
        auth: state
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            waReady = true;
            console.log('🟢 WA READY TO SEND');
        }

        if (connection === 'close') {
            waReady = false;
            console.log('🔴 WA NOT READY');
        }
    });



    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        const msg = messages[0];
        if (!msg.message) return;

        await onMessage(sock, msg);
    });


    return sock;
}

export function isWaReady() {
    return waReady;
}

