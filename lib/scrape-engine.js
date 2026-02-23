/**
 * OctoScrape Engine v2.0.0 — Aggressive Deep Web Data Extraction
 * 16 modular extractors with Hydration/Chunk breaking & security bypass
 * Integrates with OctoRecon v2 for pre-scan intelligence.
 *
 * Created by ZetaGo-Aurum | MIT License
 */
const https = require('https');
const http = require('http');
const { URL } = require('url');
const chalk = require('chalk');
const { detectWAF, detectTech, headersAudit } = require('./recon-engine');

// ── HTTP Fetcher with redirect following ──
async function fetchPage(url, opts = {}) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'identity',
            ...opts.headers,
        };
        const req = mod.get(url, { timeout: 10000, rejectUnauthorized: false, headers }, (res) => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && (opts.redirects || 0) < 3) {
                const loc = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
                return fetchPage(loc, { ...opts, redirects: (opts.redirects || 0) + 1 }).then(resolve).catch(reject);
            }
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8'), url }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

async function probe(baseUrl, path) {
    try {
        const url = new URL(path, baseUrl).href;
        const res = await fetchPage(url);
        if (res.statusCode >= 200 && res.statusCode < 400 && res.body.length > 0) {
            return { url, statusCode: res.statusCode, body: res.body.substring(0, 10000), size: res.body.length };
        }
        return null;
    } catch { return null; }
}

// ═══════════════════════════════════════════════════
// MODULE 1: Source Code Extraction
// ═══════════════════════════════════════════════════
async function extractSource(url) {
    try {
        const res = await fetchPage(url);
        const html = res.body;
        const scripts = [], styles = [], comments = [];
        let m;

        const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
        while ((m = scriptRegex.exec(html)) !== null) if (m[1].trim().length > 0) scripts.push(m[1].trim().substring(0, 5000));

        const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
        while ((m = styleRegex.exec(html)) !== null) if (m[1].trim().length > 0) styles.push(m[1].trim().substring(0, 5000));

        const commentRegex = /<!--([\s\S]*?)-->/gi;
        while ((m = commentRegex.exec(html)) !== null) { const c = m[1].trim(); if (c.length > 0 && !c.startsWith('[if')) comments.push(c.substring(0, 500)); }

        return { html: html.substring(0, 50000), htmlSize: html.length, inlineScripts: scripts.length, inlineStyles: styles.length, comments, scripts: scripts.slice(0, 15), styles: styles.slice(0, 8) };
    } catch (e) { return { error: e.message }; }
}

// ═══════════════════════════════════════════════════
// MODULE 2: Page Assets
// ═══════════════════════════════════════════════════
async function extractAssets(url, html) {
    const assets = { js: [], css: [], images: [], fonts: [], media: [], iframes: [] };
    let m;
    const jsRx = /<script[^>]+src=["']([^"']+)["']/gi;
    while ((m = jsRx.exec(html)) !== null) assets.js.push(m[1]);
    const cssRx = /<link[^>]+href=["']([^"']+)["'][^>]*(?:rel=["']stylesheet["'])/gi;
    while ((m = cssRx.exec(html)) !== null) assets.css.push(m[1]);
    const cssRx2 = /<link[^>]*rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi;
    while ((m = cssRx2.exec(html)) !== null) if (!assets.css.includes(m[1])) assets.css.push(m[1]);
    const imgRx = /<img[^>]+src=["']([^"']+)["']/gi;
    while ((m = imgRx.exec(html)) !== null) assets.images.push(m[1]);
    const fontRx = /url\(["']?([^"')]+\.(woff2?|ttf|otf|eot))["']?\)/gi;
    while ((m = fontRx.exec(html)) !== null) assets.fonts.push(m[1]);
    const mediaRx = /<(?:video|audio|source)[^>]+src=["']([^"']+)["']/gi;
    while ((m = mediaRx.exec(html)) !== null) assets.media.push(m[1]);
    const iframeRx = /<iframe[^>]+src=["']([^"']+)["']/gi;
    while ((m = iframeRx.exec(html)) !== null) assets.iframes.push(m[1]);
    return assets;
}

// ═══════════════════════════════════════════════════
// MODULE 3: Cookies
// ═══════════════════════════════════════════════════
function extractCookies(headers) {
    const cookies = [];
    const setCookies = headers['set-cookie'];
    if (!setCookies) return cookies;
    const cookieArr = Array.isArray(setCookies) ? setCookies : [setCookies];
    for (const raw of cookieArr) {
        const parts = raw.split(';').map(p => p.trim());
        const [nameVal, ...flags] = parts;
        const eqIdx = nameVal.indexOf('=');
        const name = eqIdx > -1 ? nameVal.substring(0, eqIdx) : nameVal;
        const value = eqIdx > -1 ? nameVal.substring(eqIdx + 1) : '';
        const cookie = { name, value: value.substring(0, 200), flags: {} };
        for (const f of flags) {
            const fl = f.toLowerCase();
            if (fl === 'httponly') cookie.flags.httpOnly = true;
            else if (fl === 'secure') cookie.flags.secure = true;
            else if (fl.startsWith('samesite=')) cookie.flags.sameSite = f.split('=')[1];
            else if (fl.startsWith('domain=')) cookie.flags.domain = f.split('=')[1];
            else if (fl.startsWith('path=')) cookie.flags.path = f.split('=')[1];
            else if (fl.startsWith('expires=')) cookie.flags.expires = f.split('=').slice(1).join('=');
            else if (fl.startsWith('max-age=')) cookie.flags.maxAge = f.split('=')[1];
        }
        cookies.push(cookie);
    }
    return cookies;
}

// ═══════════════════════════════════════════════════
// MODULE 4: Headers & Security Stack
// ═══════════════════════════════════════════════════
async function extractSecurity(url) {
    try {
        const audit = await headersAudit(url);
        const h = audit.rawHeaders || {};
        const cors = {
            'Access-Control-Allow-Origin': h['access-control-allow-origin'] || 'Not set',
            'Access-Control-Allow-Methods': h['access-control-allow-methods'] || 'Not set',
            'Access-Control-Allow-Headers': h['access-control-allow-headers'] || 'Not set',
            'Access-Control-Allow-Credentials': h['access-control-allow-credentials'] || 'Not set',
        };
        return { statusCode: audit.statusCode, securityHeaders: audit.audit, cors, csp: h['content-security-policy'] || null, server: h['server'] || 'Hidden', poweredBy: h['x-powered-by'] || 'Hidden', allHeaders: h };
    } catch (e) { return { error: e.message }; }
}

// ═══════════════════════════════════════════════════
// MODULE 5: Config & Sensitive Files (60+ paths)
// ═══════════════════════════════════════════════════
async function probeConfigs(baseUrl) {
    const targets = [
        '/robots.txt', '/sitemap.xml', '/sitemap_index.xml', '/humans.txt',
        '/.well-known/security.txt', '/security.txt', '/crossdomain.xml',
        '/.git/config', '/.git/HEAD', '/.git/logs/HEAD', '/.svn/entries', '/.hg/requires',
        '/.env', '/.env.local', '/.env.production', '/.env.development', '/.env.staging',
        '/wp-config.php', '/configuration.php', '/config.php', '/config.yml', '/config.json',
        '/settings.json', '/appsettings.json', '/appsettings.Development.json',
        '/web.config', '/app.config', '/.htaccess', '/nginx.conf',
        '/backup.sql', '/dump.sql', '/database.sql', '/db.sql', '/data.sql',
        '/backup.zip', '/backup.tar.gz', '/site.zip', '/www.zip',
        '/phpinfo.php', '/info.php', '/test.php', '/debug', '/debug/default/view',
        '/server-status', '/server-info', '/.DS_Store', '/Thumbs.db',
        '/swagger.json', '/swagger-ui.html', '/api-docs', '/openapi.json', '/openapi.yaml',
        '/graphql', '/graphiql', '/__graphql',
        '/api/v1', '/api/v2', '/api/health', '/api/status', '/api/config', '/api/debug',
        '/package.json', '/package-lock.json', '/composer.json', '/composer.lock',
        '/Gemfile', '/Gemfile.lock', '/requirements.txt', '/Pipfile',
        '/Dockerfile', '/docker-compose.yml', '/.dockerignore', '/Makefile',
        '/admin', '/administrator', '/wp-admin', '/cpanel', '/phpmyadmin', '/adminer.php',
        '/.well-known/openid-configuration', '/manifest.json', '/browserconfig.xml',
        '/firebase-messaging-sw.js', '/service-worker.js', '/sw.js',
        '/Procfile', '/Vagrantfile', '/.travis.yml', '/.gitlab-ci.yml',
    ];

    const found = [];
    for (let i = 0; i < targets.length; i += 8) {
        const batch = targets.slice(i, i + 8);
        const results = await Promise.allSettled(batch.map(path => probe(baseUrl, path)));
        results.forEach((r, idx) => {
            if (r.status === 'fulfilled' && r.value) found.push({ path: batch[idx], ...r.value });
        });
    }
    return found;
}

// ═══════════════════════════════════════════════════
// MODULE 6: Forms & Input Fields
// ═══════════════════════════════════════════════════
function extractForms(html) {
    const forms = [];
    const formRegex = /<form[^>]*>([\s\S]*?)<\/form>/gi;
    let m;
    while ((m = formRegex.exec(html)) !== null) {
        const tag = m[0], body = m[1];
        const action = (tag.match(/action=["']([^"']*)["']/i) || [])[1] || '';
        const method = (tag.match(/method=["']([^"']*)["']/i) || [])[1] || 'GET';
        const enctype = (tag.match(/enctype=["']([^"']*)["']/i) || [])[1] || '';
        const inputs = [];
        let inp;
        const inputRx = /<input[^>]*>/gi;
        while ((inp = inputRx.exec(body)) !== null) {
            const t = inp[0];
            inputs.push({ type: (t.match(/type=["']([^"']*)["']/i) || [])[1] || 'text', name: (t.match(/name=["']([^"']*)["']/i) || [])[1] || '', id: (t.match(/id=["']([^"']*)["']/i) || [])[1] || '', value: (t.match(/value=["']([^"']*)["']/i) || [])[1] || '', placeholder: (t.match(/placeholder=["']([^"']*)["']/i) || [])[1] || '' });
        }
        const textareaRx = /<textarea[^>]*>/gi;
        while ((inp = textareaRx.exec(body)) !== null) inputs.push({ type: 'textarea', name: (inp[0].match(/name=["']([^"']*)["']/i) || [])[1] || '' });
        const selectRx = /<select[^>]*>/gi;
        while ((inp = selectRx.exec(body)) !== null) inputs.push({ type: 'select', name: (inp[0].match(/name=["']([^"']*)["']/i) || [])[1] || '' });
        forms.push({ action, method: method.toUpperCase(), enctype, inputs });
    }
    return forms;
}

// ═══════════════════════════════════════════════════
// MODULE 7: Links & Sitemap
// ═══════════════════════════════════════════════════
function extractLinks(html, baseUrl) {
    const internal = new Set(), external = new Set(), anchors = new Set(), emails = new Set();
    let host; try { host = new URL(baseUrl).hostname; } catch { host = ''; }
    let m;
    const linkRx = /<a[^>]+href=["']([^"'#][^"']*)["']/gi;
    while ((m = linkRx.exec(html)) !== null) {
        const href = m[1].trim();
        if (href.startsWith('mailto:')) emails.add(href.replace('mailto:', ''));
        else if (href.startsWith('http')) { try { const u = new URL(href); if (u.hostname === host || u.hostname.endsWith('.' + host)) internal.add(href); else external.add(href); } catch { } }
        else if (href.startsWith('/') || href.startsWith('./')) { try { internal.add(new URL(href, baseUrl).href); } catch { } }
    }
    const anchorRx = /<a[^>]+href=["'](#[^"']*)["']/gi;
    while ((m = anchorRx.exec(html)) !== null) anchors.add(m[1]);
    return { internal: [...internal].slice(0, 150), external: [...external].slice(0, 80), anchors: [...anchors], emails: [...emails], totalInternal: internal.size, totalExternal: external.size };
}

// ═══════════════════════════════════════════════════
// MODULE 8: Metadata & SEO
// ═══════════════════════════════════════════════════
function extractMeta(html) {
    const meta = {};
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    meta.title = titleMatch ? titleMatch[1].trim() : null;
    const metaTags = [];
    let m;
    const metaRx = /<meta[^>]*>/gi;
    while ((m = metaRx.exec(html)) !== null) {
        const tag = m[0];
        const name = (tag.match(/(?:name|property)=["']([^"']*)["']/i) || [])[1] || '';
        const content = (tag.match(/content=["']([^"']*)["']/i) || [])[1] || '';
        if (name && content) metaTags.push({ name, content: content.substring(0, 300) });
    }
    meta.description = metaTags.find(t => t.name === 'description')?.content || null;
    meta.keywords = metaTags.find(t => t.name === 'keywords')?.content || null;
    meta.author = metaTags.find(t => t.name === 'author')?.content || null;
    meta.robots = metaTags.find(t => t.name === 'robots')?.content || null;
    meta.canonical = (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i) || [])[1] || null;
    meta.favicon = (html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']*)["']/i) || [])[1] || null;
    meta.og = {};
    metaTags.filter(t => t.name.startsWith('og:')).forEach(t => { meta.og[t.name] = t.content; });
    meta.twitter = {};
    metaTags.filter(t => t.name.startsWith('twitter:')).forEach(t => { meta.twitter[t.name] = t.content; });
    meta.charset = (html.match(/<meta[^>]+charset=["']?([^"'\s>]+)/i) || [])[1] || null;
    meta.viewport = metaTags.find(t => t.name === 'viewport')?.content || null;
    const jsonLdRx = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const structuredData = [];
    while ((m = jsonLdRx.exec(html)) !== null) { try { structuredData.push(JSON.parse(m[1])); } catch { } }
    meta.structuredData = structuredData;
    return meta;
}

// ═══════════════════════════════════════════════════
// MODULE 9: Hydration & Chunk Decoder ★ NEW
// Breaks Next.js, Nuxt, Remix, Gatsby, React state
// ═══════════════════════════════════════════════════
function extractHydration(html) {
    const hydration = { nextjs: null, nuxt: null, remix: null, gatsby: null, reactState: null, svelte: null, apollo: null, relay: null, chunks: [] };

    // Next.js __NEXT_DATA__
    const nextMatch = html.match(/<script\s+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
    if (nextMatch) {
        try { hydration.nextjs = JSON.parse(nextMatch[1]); } catch { hydration.nextjs = { raw: nextMatch[1].substring(0, 5000) }; }
    }

    // Nuxt.js __NUXT__ / __NUXT_DATA__
    const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\});?\s*(?:<\/script>|$)/i);
    if (nuxtMatch) hydration.nuxt = { raw: nuxtMatch[1].substring(0, 5000) };
    const nuxtDataMatch = html.match(/<script\s+id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
    if (nuxtDataMatch) hydration.nuxt = { raw: nuxtDataMatch[1].substring(0, 5000), type: 'NUXT_DATA' };

    // Remix loader data
    const remixMatch = html.match(/window\.__remixContext\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/i);
    if (remixMatch) hydration.remix = { raw: remixMatch[1].substring(0, 5000) };

    // Gatsby page data
    const gatsbyMatch = html.match(/window\.___GATSBY\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/i);
    if (gatsbyMatch) hydration.gatsby = { raw: gatsbyMatch[1].substring(0, 5000) };

    // React initial state (common patterns)
    const reactPatterns = [
        /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/i,
        /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/i,
        /window\.__APP_DATA__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/i,
        /window\.__DATA__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/i,
        /window\.__STORE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/i,
        /window\.__STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/i,
    ];
    for (const rx of reactPatterns) {
        const match = html.match(rx);
        if (match) { hydration.reactState = { raw: match[1].substring(0, 5000), pattern: rx.source.substring(0, 40) }; break; }
    }

    // SvelteKit data
    const svelteMatch = html.match(/__sveltekit_[\s\S]*?=\s*(\{[\s\S]*?\})/i);
    if (svelteMatch) hydration.svelte = { raw: svelteMatch[1].substring(0, 5000) };

    // Apollo/GraphQL cache
    const apolloMatch = html.match(/window\.__APOLLO_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/i);
    if (apolloMatch) hydration.apollo = { raw: apolloMatch[1].substring(0, 5000) };

    // Relay store
    const relayMatch = html.match(/window\.__RELAY_STORE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/i);
    if (relayMatch) hydration.relay = { raw: relayMatch[1].substring(0, 5000) };

    // Generic data/state chunks in script tags
    const chunkRx = /<script[^>]*>\s*(?:window|self)\[["']([^"']+)["']\]\s*=\s*(\{[\s\S]{20,}?\});?\s*<\/script>/gi;
    let cm;
    while ((cm = chunkRx.exec(html)) !== null) {
        hydration.chunks.push({ key: cm[1], data: cm[2].substring(0, 3000) });
    }

    return hydration;
}

// ═══════════════════════════════════════════════════
// MODULE 10: Source Map Extractor ★ NEW
// ═══════════════════════════════════════════════════
async function extractSourceMaps(url, assetJs) {
    const maps = [];

    // Check for sourceMappingURL in JS files
    for (const jsFile of assetJs.slice(0, 15)) {
        try {
            const jsUrl = jsFile.startsWith('http') ? jsFile : new URL(jsFile, url).href;
            const res = await fetchPage(jsUrl);

            // Look for //# sourceMappingURL=...
            const mapMatch = res.body.match(/\/\/[#@]\s*sourceMappingURL=([^\s]+)/);
            if (mapMatch) {
                const mapUrl = mapMatch[1].startsWith('http') ? mapMatch[1] : new URL(mapMatch[1], jsUrl).href;
                try {
                    const mapRes = await fetchPage(mapUrl);
                    if (mapRes.statusCode === 200 && mapRes.body.includes('"sources"')) {
                        const mapData = JSON.parse(mapRes.body);
                        maps.push({
                            jsFile,
                            mapUrl,
                            sources: mapData.sources || [],
                            sourcesContent: (mapData.sourcesContent || []).slice(0, 3).map(s => s ? s.substring(0, 500) : null),
                            version: mapData.version,
                        });
                    }
                } catch { maps.push({ jsFile, mapUrl, error: 'Failed to fetch map' }); }
            }

            // Also try .map extension
            if (!mapMatch) {
                try {
                    const mapRes = await fetchPage(jsUrl + '.map');
                    if (mapRes.statusCode === 200 && mapRes.body.includes('"sources"')) {
                        const mapData = JSON.parse(mapRes.body);
                        maps.push({
                            jsFile,
                            mapUrl: jsUrl + '.map',
                            sources: mapData.sources || [],
                            sourcesContent: (mapData.sourcesContent || []).slice(0, 3).map(s => s ? s.substring(0, 500) : null),
                            version: mapData.version,
                        });
                    }
                } catch { }
            }
        } catch { }
    }
    return maps;
}

// ═══════════════════════════════════════════════════
// MODULE 11: API Endpoint Discovery ★ NEW
// ═══════════════════════════════════════════════════
function discoverAPIs(html, jsContents) {
    const apis = new Set();
    const allContent = html + '\n' + (jsContents || []).join('\n');

    // Fetch/axios patterns
    const patterns = [
        /(?:fetch|axios\.(?:get|post|put|delete|patch))\s*\(\s*["'`]([^"'`]+)["'`]/gi,
        /(?:\.get|\.post|\.put|\.delete|\.patch)\s*\(\s*["'`]([^"'`]+)["'`]/gi,
        /["'`](\/api\/[^"'`\s]+)["'`]/gi,
        /["'`](https?:\/\/[^"'`\s]+\/api[^"'`\s]*)["'`]/gi,
        /(?:url|endpoint|baseURL|apiUrl|API_URL)\s*[:=]\s*["'`]([^"'`]+)["'`]/gi,
        /XMLHttpRequest[\s\S]*?\.open\s*\(\s*["'][A-Z]+["']\s*,\s*["'`]([^"'`]+)["'`]/gi,
    ];

    for (const rx of patterns) {
        let m;
        while ((m = rx.exec(allContent)) !== null) {
            const ep = m[1].trim();
            if (ep.length > 3 && ep.length < 200 && !ep.includes('*') && !ep.endsWith('.js') && !ep.endsWith('.css')) apis.add(ep);
        }
    }

    return [...apis].slice(0, 50);
}

// ═══════════════════════════════════════════════════
// MODULE 12: Environment Variable Leak Scanner ★ NEW
// ═══════════════════════════════════════════════════
function scanEnvLeaks(html, jsContents) {
    const leaks = [];
    const allContent = html + '\n' + (jsContents || []).join('\n');

    // Process.env patterns
    const envPatterns = [
        /process\.env\.([A-Z_][A-Z0-9_]+)\s*(?:===?|!==?|&&|\|\|)?\s*["'`]?([^"'`\s;,)}\]]*)/gi,
        /(?:REACT_APP_|NEXT_PUBLIC_|VITE_|GATSBY_|NUXT_)([A-Z0-9_]+)\s*[:=]\s*["'`]([^"'`]+)["'`]/gi,
        /["'`]((?:sk|pk|api|key|secret|token|auth|password|credential)[-_]?[a-zA-Z0-9]{10,})["'`]/gi,
    ];

    for (const rx of envPatterns) {
        let m;
        while ((m = rx.exec(allContent)) !== null) {
            leaks.push({ match: m[0].substring(0, 150), value: m[1] || m[2], type: rx.source.includes('process') ? 'process.env' : rx.source.includes('REACT') ? 'framework_env' : 'secret_pattern' });
        }
    }

    // API keys & tokens
    const keyPatterns = [
        { name: 'Google API Key', rx: /AIza[0-9A-Za-z-_]{35}/g },
        { name: 'AWS Access Key', rx: /AKIA[0-9A-Z]{16}/g },
        { name: 'Stripe Key', rx: /(?:sk|pk)_(?:test|live)_[0-9a-zA-Z]{24,}/g },
        { name: 'GitHub Token', rx: /gh[ps]_[0-9a-zA-Z]{36}/g },
        { name: 'Firebase Key', rx: /AIza[0-9A-Za-z\\-_]{35}/g },
        { name: 'JWT Token', rx: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]{20,}/g },
        { name: 'Slack Token', rx: /xox[baprs]-[0-9]{10,}-[0-9a-zA-Z]{20,}/g },
        { name: 'Generic Secret', rx: /["']([a-f0-9]{32,64})["']/g },
    ];

    for (const { name, rx } of keyPatterns) {
        let m;
        while ((m = rx.exec(allContent)) !== null) {
            leaks.push({ match: m[0].substring(0, 80), type: name });
        }
    }

    return leaks.slice(0, 30);
}

// ═══════════════════════════════════════════════════
// MODULE 13: GraphQL Introspection ★ NEW
// ═══════════════════════════════════════════════════
async function graphqlIntrospection(baseUrl) {
    const endpoints = ['/graphql', '/graphiql', '/__graphql', '/api/graphql', '/query', '/gql'];
    const introspectionQuery = JSON.stringify({
        query: '{ __schema { queryType { name } mutationType { name } types { name kind fields { name type { name kind } } } } }',
    });

    for (const ep of endpoints) {
        try {
            const url = new URL(ep, baseUrl).href;
            const res = await new Promise((resolve, reject) => {
                const mod = url.startsWith('https') ? https : http;
                const u = new URL(url);
                const req = mod.request({ hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST', timeout: 5000, rejectUnauthorized: false, headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' } }, (res) => {
                    let body = '';
                    res.on('data', c => { if (body.length < 50000) body += c; });
                    res.on('end', () => resolve({ statusCode: res.statusCode, body }));
                });
                req.on('error', reject);
                req.on('timeout', () => { req.destroy(); reject(); });
                req.write(introspectionQuery);
                req.end();
            });

            if (res.statusCode === 200 && res.body.includes('__schema')) {
                try {
                    const data = JSON.parse(res.body);
                    const types = data.data?.__schema?.types || [];
                    return {
                        endpoint: ep,
                        vulnerable: true,
                        queryType: data.data?.__schema?.queryType?.name,
                        mutationType: data.data?.__schema?.mutationType?.name,
                        types: types.filter(t => !t.name.startsWith('__')).map(t => ({
                            name: t.name,
                            kind: t.kind,
                            fields: (t.fields || []).slice(0, 10).map(f => ({ name: f.name, type: f.type?.name || f.type?.kind })),
                        })).slice(0, 30),
                        totalTypes: types.length,
                    };
                } catch { return { endpoint: ep, vulnerable: true, raw: res.body.substring(0, 3000) }; }
            }
        } catch { continue; }
    }
    return { vulnerable: false, message: 'No GraphQL endpoint found or introspection disabled' };
}

// ═══════════════════════════════════════════════════
// MODULE 14: Session & Token Extraction ★ NEW
// ═══════════════════════════════════════════════════
function extractTokens(html, cookies, headers) {
    const tokens = [];

    // CSRF tokens in HTML
    const csrfPatterns = [
        /<meta[^>]+name=["']csrf-token["'][^>]+content=["']([^"']+)["']/i,
        /<input[^>]+name=["']_?csrf[_-]?token["'][^>]+value=["']([^"']+)["']/i,
        /<input[^>]+name=["']authenticity_token["'][^>]+value=["']([^"']+)["']/i,
        /<input[^>]+name=["']__RequestVerificationToken["'][^>]+value=["']([^"']+)["']/i,
        /<input[^>]+name=["']_token["'][^>]+value=["']([^"']+)["']/i,
    ];
    for (const rx of csrfPatterns) {
        const m = html.match(rx);
        if (m) tokens.push({ type: 'CSRF Token', value: m[1].substring(0, 80), source: 'HTML meta/input' });
    }

    // Session cookies
    const sessionNames = ['sessionid', 'session', 'sid', 'connect.sid', 'phpsessid', 'jsessionid', 'asp.net_sessionid', '_session', 'token', 'auth_token', 'access_token'];
    if (cookies) {
        cookies.forEach(c => {
            if (sessionNames.some(n => c.name.toLowerCase().includes(n))) {
                tokens.push({ type: 'Session Cookie', name: c.name, value: c.value.substring(0, 60), httpOnly: c.flags.httpOnly || false, secure: c.flags.secure || false });
            }
        });
    }

    // Authorization headers
    if (headers) {
        if (headers['authorization']) tokens.push({ type: 'Authorization Header', value: headers['authorization'].substring(0, 60) });
        if (headers['x-api-key']) tokens.push({ type: 'API Key Header', value: headers['x-api-key'].substring(0, 60) });
    }

    // Nonce values
    const nonceMatch = html.match(/nonce=["']([^"']+)["']/gi);
    if (nonceMatch) nonceMatch.slice(0, 3).forEach(n => tokens.push({ type: 'Nonce', value: (n.match(/["']([^"']+)["']/)||[])[1] || n }));

    return tokens;
}

// ═══════════════════════════════════════════════════
// MODULE 15: Webpack/Vite Chunk Analyzer ★ NEW
// ═══════════════════════════════════════════════════
function analyzeChunks(html, assets) {
    const analysis = { bundler: null, chunks: [], entryPoints: [], publicPath: null };

    // Detect bundler
    if (html.includes('webpackChunk') || html.includes('__webpack_require__')) analysis.bundler = 'Webpack';
    else if (html.includes('__vite_') || html.includes('/@vite/')) analysis.bundler = 'Vite';
    else if (html.includes('_buildManifest') || html.includes('_ssgManifest')) analysis.bundler = 'Next.js';
    else if (html.includes('parcelRequire')) analysis.bundler = 'Parcel';
    else if (html.includes('System.register')) analysis.bundler = 'SystemJS';
    else if (html.includes('rollup')) analysis.bundler = 'Rollup';

    // Analyze chunk filenames for build info
    if (assets && assets.js) {
        assets.js.forEach(js => {
            const basename = js.split('/').pop();
            const hashMatch = basename.match(/[.-]([a-f0-9]{6,32})\./);
            const chunkMatch = basename.match(/(chunk|vendor|main|app|runtime|framework|polyfill|common|shared)/i);
            analysis.chunks.push({
                file: basename,
                hash: hashMatch ? hashMatch[1] : null,
                type: chunkMatch ? chunkMatch[1] : 'unknown',
                fullPath: js,
            });
        });
    }

    // Webpack public path
    const ppMatch = html.match(/__webpack_require__\.p\s*=\s*["']([^"']+)["']/);
    if (ppMatch) analysis.publicPath = ppMatch[1];

    // Webpack chunk loading patterns
    const chunkMapMatch = html.match(/(?:webpackChunk|__webpack_require__\.e)\s*[=(]\s*(?:function)?\s*\(?(\{[\s\S]{10,500}?\})/);
    if (chunkMapMatch) analysis.chunkMap = chunkMapMatch[1].substring(0, 500);

    return analysis;
}

// ═══════════════════════════════════════════════════
// MODULE 16: JavaScript Deep Analysis ★ NEW
// ═══════════════════════════════════════════════════
async function jsDeepAnalysis(url, assets) {
    const results = { totalFiles: 0, totalSize: 0, libraries: [], dangerousFunctions: [], hardcodedUrls: [], interesting: [] };

    for (const jsFile of (assets?.js || []).slice(0, 10)) {
        try {
            const jsUrl = jsFile.startsWith('http') ? jsFile : new URL(jsFile, url).href;
            const res = await fetchPage(jsUrl);
            results.totalFiles++;
            results.totalSize += res.body.length;

            const code = res.body.substring(0, 30000);

            // Dangerous functions
            const dangerous = ['eval(', 'document.write(', 'innerHTML', 'outerHTML', 'insertAdjacentHTML', 'Function(', 'setTimeout(', 'setInterval('];
            dangerous.forEach(fn => {
                if (code.includes(fn)) results.dangerousFunctions.push({ file: jsFile.split('/').pop(), function: fn });
            });

            // Hardcoded URLs (potential internal APIs)
            const urlRx = /["'`](https?:\/\/[a-z0-9.-]+(?:\.[a-z]{2,})[^\s"'`]{0,100})["'`]/gi;
            let m;
            while ((m = urlRx.exec(code)) !== null) {
                if (!m[1].includes('schema.org') && !m[1].includes('w3.org') && !m[1].includes('googleapis.com/css')) {
                    results.hardcodedUrls.push({ file: jsFile.split('/').pop(), url: m[1].substring(0, 120) });
                }
            }

            // Interesting strings
            const interestingRx = /(?:password|secret|private|admin|internal|debug|staging|localhost|127\.0\.0\.1|api[_-]?key|auth[_-]?token)/gi;
            while ((m = interestingRx.exec(code)) !== null) {
                const ctx = code.substring(Math.max(0, m.index - 30), Math.min(code.length, m.index + m[0].length + 50));
                results.interesting.push({ file: jsFile.split('/').pop(), match: m[0], context: ctx.replace(/\n/g, ' ').trim() });
            }
        } catch { }
    }

    results.hardcodedUrls = [...new Map(results.hardcodedUrls.map(h => [h.url, h])).values()].slice(0, 30);
    results.interesting = results.interesting.slice(0, 20);
    results.dangerousFunctions = [...new Set(results.dangerousFunctions.map(d => JSON.stringify(d)))].map(d => JSON.parse(d)).slice(0, 20);

    return results;
}

// ═══════════════════════════════════════════════════
// ORCHESTRATOR — Phase 1: Recon → Phase 2: Extract
// ═══════════════════════════════════════════════════
async function runScrape(url, parameter, outputFormat) {
    const results = { target: url, timestamp: new Date().toISOString(), modules: {} };
    const modules = [];

    switch (parameter) {
        case 'global':
            modules.push('source', 'assets', 'cookies', 'security', 'tech', 'links', 'meta', 'hydration', 'chunks');
            break;
        case 'root':
            modules.push('source', 'assets', 'cookies', 'security', 'tech', 'configs', 'forms', 'links', 'meta', 'hydration', 'sourcemaps', 'apis', 'envleaks', 'graphql', 'tokens', 'chunks', 'jsdeep');
            break;
        case 'server':
            modules.push('security', 'tech', 'configs', 'cookies', 'graphql', 'tokens');
            break;
        case 'client':
            modules.push('source', 'assets', 'forms', 'links', 'meta', 'hydration', 'chunks', 'apis', 'envleaks', 'jsdeep');
            break;
        case 'both': case 'all':
            modules.push('source', 'assets', 'cookies', 'security', 'tech', 'configs', 'forms', 'links', 'meta', 'hydration', 'sourcemaps', 'apis', 'envleaks', 'graphql', 'tokens', 'chunks', 'jsdeep');
            break;
        case '.':
            modules.push('security', 'meta', 'cookies', 'tokens');
            break;
        default:
            modules.push('source', 'security', 'meta', 'hydration');
    }

    // Phase 1: OctoRecon pre-scan
    console.log(chalk.hex('#FF6B9D').bold('\n  ╔══════════════════════════════════════════════╗'));
    console.log(chalk.hex('#FF6B9D').bold('  ║  📡 PHASE 1: OctoRecon v2 Intelligence       ║'));
    console.log(chalk.hex('#FF6B9D').bold('  ╚══════════════════════════════════════════════╝\n'));

    process.stdout.write(chalk.cyan('  🛡️  WAF Pre-Check...'));
    const waf = await detectWAF(url);
    console.log(chalk.green(` ✓ (${waf.detected.length > 0 ? waf.detected.join(', ') : 'Clear'})`));
    results.waf = waf.detected;

    process.stdout.write(chalk.cyan('  📥 Fetching target page...'));
    let page;
    try {
        page = await fetchPage(url);
        console.log(chalk.green(` ✓ (${page.statusCode}, ${(page.body.length / 1024).toFixed(1)}KB)`));
    } catch (e) {
        console.log(chalk.red(` ✗ ${e.message}`));
        return results;
    }

    // Phase 2: Extraction
    console.log(chalk.hex('#FF6B9D').bold('\n  ╔══════════════════════════════════════════════╗'));
    console.log(chalk.hex('#FF6B9D').bold('  ║  🔬 PHASE 2: Deep Data Extraction v2         ║'));
    console.log(chalk.hex('#FF6B9D').bold('  ╚══════════════════════════════════════════════╝\n'));

    for (const mod of modules) {
        switch (mod) {
            case 'source':
                process.stdout.write(chalk.cyan('  📄 Source Code...'));
                results.modules.source = await extractSource(url);
                console.log(chalk.green(` ✓ (${(results.modules.source.htmlSize / 1024).toFixed(1)}KB, ${results.modules.source.comments.length} comments)`));
                break;
            case 'assets':
                process.stdout.write(chalk.cyan('  🖼️  Page Assets...'));
                results.modules.assets = await extractAssets(url, page.body);
                const a = results.modules.assets;
                console.log(chalk.green(` ✓ (${a.js.length} JS, ${a.css.length} CSS, ${a.images.length} IMG)`));
                break;
            case 'cookies':
                process.stdout.write(chalk.cyan('  🍪 Cookies...'));
                results.modules.cookies = extractCookies(page.headers);
                console.log(chalk.green(` ✓ (${results.modules.cookies.length} cookies)`));
                break;
            case 'security':
                process.stdout.write(chalk.cyan('  🔒 Security Stack...'));
                results.modules.security = await extractSecurity(url);
                console.log(chalk.green(' ✓'));
                break;
            case 'tech':
                process.stdout.write(chalk.cyan('  ⚙️  Tech Stack...'));
                results.modules.tech = await detectTech(url);
                console.log(chalk.green(` ✓ (${results.modules.tech.length} detected)`));
                break;
            case 'configs':
                process.stdout.write(chalk.cyan('  📂 Config/Sensitive Files...'));
                results.modules.configs = await probeConfigs(url);
                console.log(chalk.green(` ✓ (${results.modules.configs.length} found)`));
                break;
            case 'forms':
                process.stdout.write(chalk.cyan('  📝 Forms & Inputs...'));
                results.modules.forms = extractForms(page.body);
                console.log(chalk.green(` ✓ (${results.modules.forms.length} forms)`));
                break;
            case 'links':
                process.stdout.write(chalk.cyan('  🔗 Links & Sitemap...'));
                results.modules.links = extractLinks(page.body, url);
                console.log(chalk.green(` ✓ (${results.modules.links.totalInternal}+${results.modules.links.totalExternal})`));
                break;
            case 'meta':
                process.stdout.write(chalk.cyan('  🏷️  Metadata & SEO...'));
                results.modules.meta = extractMeta(page.body);
                console.log(chalk.green(` ✓`));
                break;
            case 'hydration':
                process.stdout.write(chalk.cyan('  💉 Hydration/Chunk Decoder...'));
                results.modules.hydration = extractHydration(page.body);
                const hCount = Object.values(results.modules.hydration).filter(v => v && v !== null && !(Array.isArray(v) && v.length === 0)).length;
                console.log(chalk.green(` ✓ (${hCount} framework states found)`));
                break;
            case 'sourcemaps':
                process.stdout.write(chalk.cyan('  🗺️  Source Map Extraction...'));
                results.modules.sourceMaps = await extractSourceMaps(url, results.modules.assets?.js || []);
                console.log(chalk.green(` ✓ (${results.modules.sourceMaps.length} maps)`));
                break;
            case 'apis':
                process.stdout.write(chalk.cyan('  🔌 API Endpoint Discovery...'));
                results.modules.apis = discoverAPIs(page.body, results.modules.source?.scripts || []);
                console.log(chalk.green(` ✓ (${results.modules.apis.length} endpoints)`));
                break;
            case 'envleaks':
                process.stdout.write(chalk.cyan('  🔑 Environment Leak Scan...'));
                results.modules.envLeaks = scanEnvLeaks(page.body, results.modules.source?.scripts || []);
                console.log(chalk.green(` ✓ (${results.modules.envLeaks.length} leaks)`));
                break;
            case 'graphql':
                process.stdout.write(chalk.cyan('  📊 GraphQL Introspection...'));
                results.modules.graphql = await graphqlIntrospection(url);
                console.log(chalk.green(` ✓ (${results.modules.graphql.vulnerable ? chalk.red('EXPOSED!') : 'Protected'})`));
                break;
            case 'tokens':
                process.stdout.write(chalk.cyan('  🎫 Token/Session Extraction...'));
                results.modules.tokens = extractTokens(page.body, results.modules.cookies || [], page.headers);
                console.log(chalk.green(` ✓ (${results.modules.tokens.length} tokens)`));
                break;
            case 'chunks':
                process.stdout.write(chalk.cyan('  📦 Webpack/Vite Chunk Analysis...'));
                results.modules.chunks = analyzeChunks(page.body, results.modules.assets);
                console.log(chalk.green(` ✓ (${results.modules.chunks.bundler || 'Unknown'} bundler)`));
                break;
            case 'jsdeep':
                process.stdout.write(chalk.cyan('  🔬 JS Deep Analysis...'));
                results.modules.jsDeep = await jsDeepAnalysis(url, results.modules.assets);
                console.log(chalk.green(` ✓ (${results.modules.jsDeep.totalFiles} files, ${(results.modules.jsDeep.totalSize/1024).toFixed(0)}KB)`));
                break;
        }
    }

    return results;
}

module.exports = { runScrape, fetchPage, extractSource, extractAssets, extractCookies, extractSecurity, probeConfigs, extractForms, extractLinks, extractMeta, extractHydration, extractSourceMaps, discoverAPIs, scanEnvLeaks, graphqlIntrospection, extractTokens, analyzeChunks, jsDeepAnalysis };
