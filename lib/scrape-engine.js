/**
 * OctoScrape Engine v1.0.0 — Deep Web Data Extraction Engine
 * 9 modular extractors: Source, Assets, Cookies, Headers, Tech, Config, Forms, Links, Meta
 * Integrates with OctoRecon for pre-scan intelligence.
 *
 * Created by ZetaGo-Aurum | MIT License
 */
const https = require('https');
const http = require('http');
const { URL } = require('url');
const chalk = require('chalk');
const { detectWAF, detectTech, headersAudit } = require('./recon-engine');

// ── HTTP Fetcher ──
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
            // Follow redirects (up to 3)
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && (opts.redirects || 0) < 3) {
                const loc = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
                return fetchPage(loc, { ...opts, redirects: (opts.redirects || 0) + 1 }).then(resolve).catch(reject);
            }
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: Buffer.concat(chunks).toString('utf8'),
                    url: url,
                });
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

// Probe a URL path, returns body or null
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

        // Extract inline scripts
        const scripts = [];
        const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
        let m;
        while ((m = scriptRegex.exec(html)) !== null) {
            if (m[1].trim().length > 0) scripts.push(m[1].trim().substring(0, 5000));
        }

        // Extract inline styles
        const styles = [];
        const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
        while ((m = styleRegex.exec(html)) !== null) {
            if (m[1].trim().length > 0) styles.push(m[1].trim().substring(0, 5000));
        }

        // Extract HTML comments
        const comments = [];
        const commentRegex = /<!--([\s\S]*?)-->/gi;
        while ((m = commentRegex.exec(html)) !== null) {
            const c = m[1].trim();
            if (c.length > 0 && !c.startsWith('[if')) comments.push(c.substring(0, 500));
        }

        return {
            html: html.substring(0, 50000),
            htmlSize: html.length,
            inlineScripts: scripts.length,
            inlineStyles: styles.length,
            comments: comments,
            scripts: scripts.slice(0, 10),
            styles: styles.slice(0, 5),
        };
    } catch (e) {
        return { error: e.message };
    }
}

// ═══════════════════════════════════════════════════
// MODULE 2: Page Assets
// ═══════════════════════════════════════════════════
async function extractAssets(url, html) {
    const assets = { js: [], css: [], images: [], fonts: [], media: [], iframes: [] };

    // JS files
    const jsRegex = /<script[^>]+src=["']([^"']+)["']/gi;
    let m;
    while ((m = jsRegex.exec(html)) !== null) assets.js.push(m[1]);

    // CSS files
    const cssRegex = /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']stylesheet["']/gi;
    while ((m = cssRegex.exec(html)) !== null) assets.css.push(m[1]);
    const cssRegex2 = /<link[^>]*rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi;
    while ((m = cssRegex2.exec(html)) !== null) {
        if (!assets.css.includes(m[1])) assets.css.push(m[1]);
    }

    // Images
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    while ((m = imgRegex.exec(html)) !== null) assets.images.push(m[1]);

    // Fonts (from CSS @font-face or link tags)
    const fontRegex = /url\(["']?([^"')]+\.(woff2?|ttf|otf|eot))["']?\)/gi;
    while ((m = fontRegex.exec(html)) !== null) assets.fonts.push(m[1]);

    // Media (video/audio)
    const mediaRegex = /<(?:video|audio|source)[^>]+src=["']([^"']+)["']/gi;
    while ((m = mediaRegex.exec(html)) !== null) assets.media.push(m[1]);

    // Iframes
    const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
    while ((m = iframeRegex.exec(html)) !== null) assets.iframes.push(m[1]);

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
        const h = audit.rawHeaders || audit.headers || {};

        // CORS analysis
        const cors = {
            'Access-Control-Allow-Origin': h['access-control-allow-origin'] || 'Not set',
            'Access-Control-Allow-Methods': h['access-control-allow-methods'] || 'Not set',
            'Access-Control-Allow-Headers': h['access-control-allow-headers'] || 'Not set',
            'Access-Control-Allow-Credentials': h['access-control-allow-credentials'] || 'Not set',
        };

        // CSP deep parse
        const csp = h['content-security-policy'] || null;

        return {
            statusCode: audit.statusCode,
            securityHeaders: audit.audit,
            cors,
            csp: csp ? csp.substring(0, 1000) : null,
            server: h['server'] || 'Hidden',
            poweredBy: h['x-powered-by'] || 'Hidden',
            allHeaders: h,
        };
    } catch (e) {
        return { error: e.message };
    }
}

// ═══════════════════════════════════════════════════
// MODULE 5: Config & Sensitive Files Probing
// ═══════════════════════════════════════════════════
async function probeConfigs(baseUrl) {
    const targets = [
        // Standard
        '/robots.txt', '/sitemap.xml', '/sitemap_index.xml', '/humans.txt',
        '/.well-known/security.txt', '/security.txt', '/crossdomain.xml',
        // Git/VCS
        '/.git/config', '/.git/HEAD', '/.svn/entries', '/.hg/requires',
        // Environment
        '/.env', '/.env.local', '/.env.production', '/.env.development',
        // Config
        '/wp-config.php', '/configuration.php', '/config.php', '/config.yml',
        '/config.json', '/settings.json', '/appsettings.json',
        '/web.config', '/app.config', '/.htaccess', '/nginx.conf',
        // Backup
        '/backup.sql', '/dump.sql', '/database.sql', '/db.sql',
        '/backup.zip', '/backup.tar.gz', '/site.zip',
        // Debug/Info
        '/phpinfo.php', '/info.php', '/test.php', '/debug',
        '/server-status', '/server-info', '/.DS_Store',
        // API docs
        '/swagger.json', '/api-docs', '/openapi.json', '/graphql',
        '/api/v1', '/api/v2', '/api/health', '/api/status',
        // Package files
        '/package.json', '/composer.json', '/Gemfile', '/requirements.txt',
        '/Dockerfile', '/docker-compose.yml', '/.dockerignore',
        // Admin panels
        '/admin', '/administrator', '/wp-admin', '/cpanel',
        '/phpmyadmin', '/adminer.php', '/dashboard',
    ];

    const found = [];

    // Batch probe in groups of 5
    for (let i = 0; i < targets.length; i += 5) {
        const batch = targets.slice(i, i + 5);
        const results = await Promise.allSettled(
            batch.map(path => probe(baseUrl, path))
        );
        results.forEach((r, idx) => {
            if (r.status === 'fulfilled' && r.value) {
                found.push({ path: batch[idx], ...r.value });
            }
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
        const formTag = m[0];
        const formBody = m[1];

        // Extract form attributes
        const action = (formTag.match(/action=["']([^"']*)["']/i) || [])[1] || '';
        const method = (formTag.match(/method=["']([^"']*)["']/i) || [])[1] || 'GET';
        const enctype = (formTag.match(/enctype=["']([^"']*)["']/i) || [])[1] || '';

        // Extract inputs
        const inputs = [];
        const inputRegex = /<input[^>]*>/gi;
        let inp;
        while ((inp = inputRegex.exec(formBody)) !== null) {
            const tag = inp[0];
            inputs.push({
                type: (tag.match(/type=["']([^"']*)["']/i) || [])[1] || 'text',
                name: (tag.match(/name=["']([^"']*)["']/i) || [])[1] || '',
                id: (tag.match(/id=["']([^"']*)["']/i) || [])[1] || '',
                value: (tag.match(/value=["']([^"']*)["']/i) || [])[1] || '',
                placeholder: (tag.match(/placeholder=["']([^"']*)["']/i) || [])[1] || '',
            });
        }

        // Extract textareas
        const textareaRegex = /<textarea[^>]*>/gi;
        while ((inp = textareaRegex.exec(formBody)) !== null) {
            const tag = inp[0];
            inputs.push({
                type: 'textarea',
                name: (tag.match(/name=["']([^"']*)["']/i) || [])[1] || '',
                id: (tag.match(/id=["']([^"']*)["']/i) || [])[1] || '',
            });
        }

        // Extract selects
        const selectRegex = /<select[^>]*>/gi;
        while ((inp = selectRegex.exec(formBody)) !== null) {
            const tag = inp[0];
            inputs.push({
                type: 'select',
                name: (tag.match(/name=["']([^"']*)["']/i) || [])[1] || '',
                id: (tag.match(/id=["']([^"']*)["']/i) || [])[1] || '',
            });
        }

        forms.push({ action, method: method.toUpperCase(), enctype, inputs });
    }

    return forms;
}

// ═══════════════════════════════════════════════════
// MODULE 7: Links & Sitemap
// ═══════════════════════════════════════════════════
function extractLinks(html, baseUrl) {
    const internal = new Set();
    const external = new Set();
    const anchors = new Set();
    const emails = new Set();

    let host;
    try { host = new URL(baseUrl).hostname; } catch { host = ''; }

    // All <a href>
    const linkRegex = /<a[^>]+href=["']([^"'#][^"']*)["']/gi;
    let m;
    while ((m = linkRegex.exec(html)) !== null) {
        const href = m[1].trim();
        if (href.startsWith('mailto:')) {
            emails.add(href.replace('mailto:', ''));
        } else if (href.startsWith('http')) {
            try {
                const u = new URL(href);
                if (u.hostname === host || u.hostname.endsWith('.' + host)) internal.add(href);
                else external.add(href);
            } catch { }
        } else if (href.startsWith('/') || href.startsWith('./')) {
            try { internal.add(new URL(href, baseUrl).href); } catch { }
        }
    }

    // Anchor fragments
    const anchorRegex = /<a[^>]+href=["'](#[^"']*)["']/gi;
    while ((m = anchorRegex.exec(html)) !== null) anchors.add(m[1]);

    return {
        internal: [...internal].slice(0, 100),
        external: [...external].slice(0, 50),
        anchors: [...anchors],
        emails: [...emails],
        totalInternal: internal.size,
        totalExternal: external.size,
    };
}

// ═══════════════════════════════════════════════════
// MODULE 8: Metadata & SEO
// ═══════════════════════════════════════════════════
function extractMeta(html) {
    const meta = {};

    // Title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    meta.title = titleMatch ? titleMatch[1].trim() : null;

    // Meta tags
    const metaRegex = /<meta[^>]*>/gi;
    const metaTags = [];
    let m;
    while ((m = metaRegex.exec(html)) !== null) {
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

    // Open Graph
    meta.og = {};
    metaTags.filter(t => t.name.startsWith('og:')).forEach(t => { meta.og[t.name] = t.content; });

    // Twitter Card
    meta.twitter = {};
    metaTags.filter(t => t.name.startsWith('twitter:')).forEach(t => { meta.twitter[t.name] = t.content; });

    // Charset
    meta.charset = (html.match(/<meta[^>]+charset=["']?([^"'\s>]+)/i) || [])[1] || null;

    // Viewport
    meta.viewport = metaTags.find(t => t.name === 'viewport')?.content || null;

    // JSON-LD structured data
    const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const structuredData = [];
    while ((m = jsonLdRegex.exec(html)) !== null) {
        try { structuredData.push(JSON.parse(m[1])); } catch { }
    }
    meta.structuredData = structuredData;

    return meta;
}

// ═══════════════════════════════════════════════════
// ORCHESTRATOR — Run modules based on parameter
// ═══════════════════════════════════════════════════
async function runScrape(url, parameter, outputFormat) {
    const results = { target: url, timestamp: new Date().toISOString(), modules: {} };
    const modules = [];

    // Determine which modules to run
    switch (parameter) {
        case 'global':
            modules.push('source', 'assets', 'cookies', 'security', 'tech', 'links', 'meta');
            break;
        case 'root':
            modules.push('source', 'assets', 'cookies', 'security', 'tech', 'configs', 'forms', 'links', 'meta');
            break;
        case 'server':
            modules.push('security', 'tech', 'configs', 'cookies');
            break;
        case 'client':
            modules.push('source', 'assets', 'forms', 'links', 'meta');
            break;
        case 'both':
        case 'all':
            modules.push('source', 'assets', 'cookies', 'security', 'tech', 'configs', 'forms', 'links', 'meta');
            break;
        case '.':
            modules.push('security', 'meta', 'cookies');
            break;
        default:
            modules.push('source', 'security', 'meta');
    }

    // Phase 1: OctoRecon pre-scan
    console.log(chalk.hex('#FF6B9D').bold('\n  ╔══════════════════════════════════════════╗'));
    console.log(chalk.hex('#FF6B9D').bold('  ║  📡 PHASE 1: OctoRecon Intelligence      ║'));
    console.log(chalk.hex('#FF6B9D').bold('  ╚══════════════════════════════════════════╝\n'));

    process.stdout.write(chalk.cyan('  🛡️  WAF Pre-Check...'));
    const waf = await detectWAF(url);
    console.log(chalk.green(` ✓ (${waf.detected.length > 0 ? waf.detected.join(', ') : 'Clear'})`));
    results.waf = waf.detected;

    // Fetch main page (shared across modules)
    process.stdout.write(chalk.cyan('  📥 Fetching target page...'));
    let page;
    try {
        page = await fetchPage(url);
        console.log(chalk.green(` ✓ (${page.statusCode}, ${(page.body.length / 1024).toFixed(1)}KB)`));
    } catch (e) {
        console.log(chalk.red(` ✗ ${e.message}`));
        return results;
    }

    // Phase 2: Data Extraction
    console.log(chalk.hex('#FF6B9D').bold('\n  ╔══════════════════════════════════════════╗'));
    console.log(chalk.hex('#FF6B9D').bold('  ║  🔬 PHASE 2: Deep Data Extraction        ║'));
    console.log(chalk.hex('#FF6B9D').bold('  ╚══════════════════════════════════════════╝\n'));

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
                console.log(chalk.green(` ✓ (${results.modules.links.totalInternal} internal, ${results.modules.links.totalExternal} external)`));
                break;
            case 'meta':
                process.stdout.write(chalk.cyan('  🏷️  Metadata & SEO...'));
                results.modules.meta = extractMeta(page.body);
                console.log(chalk.green(` ✓ (${results.modules.meta.title ? results.modules.meta.title.substring(0, 40) : 'No title'})`));
                break;
        }
    }

    return results;
}

module.exports = { runScrape, fetchPage, extractSource, extractAssets, extractCookies, extractSecurity, probeConfigs, extractForms, extractLinks, extractMeta };
