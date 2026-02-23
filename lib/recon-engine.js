/**
 * OctoRecon Engine v2.0.0 — Deep Reconnaissance Engine
 * 14 modular scanners: DNS, Subdomains, WAF, Origin IP, SSL, Headers,
 * Ports, Tech, WHOIS, Email Security, Cloud Detection, HTTP/2, Zone Transfer, DirBrute
 *
 * Created by ZetaGo-Aurum | MIT License
 */
const dns = require('dns');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');
const net = require('net');
const tls = require('tls');
const chalk = require('chalk');

// ── Helper: HTTP GET with redirect ──
async function httpGet(url, opts = {}) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36', ...opts.headers };
        const req = mod.get(url, { timeout: opts.timeout || 5000, rejectUnauthorized: false, headers }, (res) => {
            if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && (opts._redir || 0) < 3) {
                const loc = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).href;
                return httpGet(loc, { ...opts, _redir: (opts._redir || 0) + 1 }).then(resolve).catch(reject);
            }
            let body = '';
            res.on('data', c => { if (body.length < 50000) body += c; });
            res.on('end', () => resolve({ headers: res.headers, statusCode: res.statusCode, body }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

// ═══════════════════════════════════════════════════
// MODULE 1: DNS Records
// ═══════════════════════════════════════════════════
async function dnsRecon(hostname) {
    const results = {};
    const types = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'SOA', 'CNAME', 'SRV'];
    const promises = types.map(type => new Promise(resolve => {
        dns.resolve(hostname, type, (err, records) => resolve({ type, records: err ? null : records }));
    }));
    (await Promise.all(promises)).forEach(r => { results[r.type] = r.records; });

    try {
        const ips = await new Promise((resolve) => dns.resolve4(hostname, (err, a) => resolve(err ? [] : a)));
        if (ips.length > 0) {
            results.REVERSE = await new Promise(resolve => dns.reverse(ips[0], (err, h) => resolve(err ? null : h)));
        }
        results.IP = ips;
    } catch { }
    return results;
}

// ═══════════════════════════════════════════════════
// MODULE 2: Subdomain Discovery (expanded wordlist)
// ═══════════════════════════════════════════════════
async function subdomainScan(hostname, deep = false) {
    const common = [
        'www', 'mail', 'ftp', 'admin', 'blog', 'dev', 'staging', 'api',
        'app', 'cdn', 'cloud', 'cpanel', 'dashboard', 'db', 'demo',
        'docs', 'email', 'git', 'gitlab', 'graphql', 'help', 'host',
        'internal', 'jenkins', 'jira', 'login', 'm', 'media', 'monitor',
        'mysql', 'ns1', 'ns2', 'office', 'panel', 'portal', 'proxy',
        'redis', 'remote', 'repo', 'server', 'shop', 'smtp', 'ssh',
        'ssl', 'static', 'status', 'store', 'support',
        'test', 'vpn', 'webmail', 'wiki', 'ws', 'beta', 'alpha',
    ];
    const extra = deep ? [
        'backup', 'cache', 'ci', 'cms', 'conf', 'config', 'console',
        'core', 'data', 'debug', 'dns', 'docker', 'edge', 'elastic',
        'exchange', 'files', 'firewall', 'forum', 'gateway', 'gw',
        'img', 'intranet', 'k8s', 'lab', 'ldap', 'legacy', 'log',
        'logs', 'manage', 'metrics', 'mq', 'mx', 'nas', 'nginx',
        'node', 'ops', 'origin', 'pma', 'prod', 'queue', 'rabbitmq',
        'raft', 'relay', 'rest', 's3', 'sandbox', 'sentry', 'sftp',
        'sip', 'solr', 'spark', 'sql', 'stage', 'stg', 'syslog',
        'tmp', 'tools', 'track', 'vault', 'vip', 'web', 'worker',
        'auth', 'sso', 'oauth', 'pay', 'payment', 'checkout', 'billing',
        'webhook', 'notify', 'push', 'socket', 'ws2', 'grpc', 'rpc',
    ] : [];

    const all = [...common, ...extra];
    const found = [];

    // Batch DNS lookups in groups of 20 for speed
    for (let i = 0; i < all.length; i += 20) {
        const batch = all.slice(i, i + 20);
        const results = await Promise.allSettled(
            batch.map(sub => new Promise((resolve, reject) => {
                dns.resolve4(`${sub}.${hostname}`, (err, addrs) => err ? reject(err) : resolve({ subdomain: `${sub}.${hostname}`, ip: addrs }));
            }))
        );
        results.forEach(r => { if (r.status === 'fulfilled') found.push(r.value); });
    }
    return found;
}

// ═══════════════════════════════════════════════════
// MODULE 3: WAF Detection (expanded signatures)
// ═══════════════════════════════════════════════════
async function detectWAF(target) {
    const wafSignatures = {
        'Cloudflare': ['cf-ray', 'cf-cache-status', '__cfduid', 'cloudflare'],
        'Akamai': ['x-akamai', 'akamai-ghost', 'akamai-x-cache'],
        'Sucuri': ['x-sucuri', 'sucuri-cache'],
        'AWS WAF': ['x-amzn-requestid', 'x-amz-apigw', 'x-amz-cf-id'],
        'AWS Shield': ['x-amz-server-side-encryption', 'x-amz-id-2'],
        'Imperva': ['x-iinfo', 'incap_ses', 'incapsula'],
        'F5 BIG-IP': ['bigipserver', 'x-cnection'],
        'Barracuda': ['barra_counter_session'],
        'Varnish': ['x-varnish', 'via: varnish'],
        'Fastly': ['x-fastly', 'x-served-by', 'x-cache-hits'],
        'CloudFront': ['x-amz-cf-id', 'x-amz-cf-pop'],
        'DDoS-Guard': ['ddos-guard', 'x-ddos-protection'],
        'Wordfence': ['wordfence'],
        'ModSecurity': ['mod_security', 'modsecurity'],
        'Comodo': ['x-comodo'],
        'StackPath': ['x-sp-', 'stackpath'],
        'Azure Front Door': ['x-azure-ref', 'x-fd-healthprobe'],
        'Google Cloud Armor': ['x-cloud-trace-context'],
    };

    const detected = [];
    try {
        const url = target.startsWith('http') ? target : `https://${target}`;
        const response = await httpGet(url);
        const allHeaders = JSON.stringify(response.headers).toLowerCase();
        const bodyLower = response.body.toLowerCase();

        for (const [waf, sigs] of Object.entries(wafSignatures)) {
            for (const sig of sigs) {
                if (allHeaders.includes(sig) || bodyLower.includes(sig)) {
                    detected.push(waf);
                    break;
                }
            }
        }
        return { detected, headers: response.headers, statusCode: response.statusCode };
    } catch (e) {
        return { detected: [], error: e.message };
    }
}

// ═══════════════════════════════════════════════════
// MODULE 4: Origin IP Discovery (Bypass WAF/Cloudflare)
// ═══════════════════════════════════════════════════
async function findOriginIP(hostname) {
    const origins = [];

    // Method 1: Direct A records
    try {
        const ips = await new Promise(resolve => dns.resolve4(hostname, (err, a) => resolve(err ? [] : a)));
        origins.push({ method: 'DNS A Record', ips });
    } catch { }

    // Method 2: Origin subdomains
    const originSubs = ['origin', 'direct', 'real', 'backend', 'server', 'web', 'host', 'node', 'app', 'api', 'mail', 'ftp', 'cpanel', 'webmail', 'smtp', 'pop', 'imap', 'ns1', 'ns2', 'mx', 'db', 'staging', 'dev'];
    const subResults = await Promise.allSettled(
        originSubs.map(sub => new Promise((resolve, reject) => {
            dns.resolve4(`${sub}.${hostname}`, (err, addrs) => err ? reject(err) : resolve({ method: `Subdomain: ${sub}.${hostname}`, ips: addrs }));
        }))
    );
    subResults.forEach(r => { if (r.status === 'fulfilled') origins.push(r.value); });

    // Method 3: MX record IPs
    try {
        const mx = await new Promise((resolve, reject) => dns.resolveMx(hostname, (err, r) => err ? reject(err) : resolve(r)));
        const mxResults = await Promise.allSettled(
            mx.slice(0, 5).map(record => new Promise((resolve, reject) => {
                dns.resolve4(record.exchange, (err, addrs) => err ? reject(err) : resolve({ method: `MX: ${record.exchange}`, ips: addrs }));
            }))
        );
        mxResults.forEach(r => { if (r.status === 'fulfilled') origins.push(r.value); });
    } catch { }

    // Method 4: SSL SAN
    try {
        const certInfo = await new Promise((resolve, reject) => {
            const sock = tls.connect(443, hostname, { rejectUnauthorized: false, timeout: 5000 }, () => {
                const cert = sock.getPeerCertificate();
                sock.destroy();
                resolve({ subject: cert.subject, issuer: cert.issuer, valid_from: cert.valid_from, valid_to: cert.valid_to, subjectaltname: cert.subjectaltname, fingerprint: cert.fingerprint });
            });
            sock.on('error', reject); sock.on('timeout', () => { sock.destroy(); reject(new Error('timeout')); });
        });
        origins.push({ method: 'SSL Certificate SAN', data: certInfo });
    } catch { }

    // Method 5: IPv6
    try {
        const ipv6 = await new Promise((resolve, reject) => dns.resolve6(hostname, (err, a) => err ? reject(err) : resolve(a)));
        origins.push({ method: 'IPv6 AAAA Record', ips: ipv6 });
    } catch { }

    // Method 6: NS records (nameserver IPs)
    try {
        const ns = await new Promise((resolve, reject) => dns.resolveNs(hostname, (err, r) => err ? reject(err) : resolve(r)));
        origins.push({ method: 'NS Records', data: ns });
    } catch { }

    return origins;
}

// ═══════════════════════════════════════════════════
// MODULE 5: SSL/TLS Analysis
// ═══════════════════════════════════════════════════
async function sslAnalysis(hostname) {
    try {
        return await new Promise((resolve, reject) => {
            const sock = tls.connect(443, hostname, { rejectUnauthorized: false, timeout: 5000 }, () => {
                const cert = sock.getPeerCertificate(true);
                const proto = sock.getProtocol();
                const cipher = sock.getCipher();
                sock.destroy();
                resolve({ protocol: proto, cipher, subject: cert.subject, issuer: cert.issuer, valid_from: cert.valid_from, valid_to: cert.valid_to, serialNumber: cert.serialNumber, fingerprint256: cert.fingerprint256, subjectaltname: cert.subjectaltname, bits: cert.bits });
            });
            sock.on('error', reject); sock.on('timeout', () => { sock.destroy(); reject(new Error('timeout')); });
        });
    } catch (e) { return { error: e.message }; }
}

// ═══════════════════════════════════════════════════
// MODULE 6: Security Headers Audit
// ═══════════════════════════════════════════════════
async function headersAudit(target) {
    try {
        const url = target.startsWith('http') ? target : `https://${target}`;
        const response = await httpGet(url);
        const h = response.headers;
        const audit = {
            'Strict-Transport-Security': h['strict-transport-security'] || '❌ MISSING',
            'Content-Security-Policy': h['content-security-policy'] || '❌ MISSING',
            'X-Frame-Options': h['x-frame-options'] || '❌ MISSING',
            'X-Content-Type-Options': h['x-content-type-options'] || '❌ MISSING',
            'X-XSS-Protection': h['x-xss-protection'] || '❌ MISSING',
            'Referrer-Policy': h['referrer-policy'] || '❌ MISSING',
            'Permissions-Policy': h['permissions-policy'] || '❌ MISSING',
            'Cross-Origin-Embedder-Policy': h['cross-origin-embedder-policy'] || '❌ MISSING',
            'Cross-Origin-Opener-Policy': h['cross-origin-opener-policy'] || '❌ MISSING',
            'Cross-Origin-Resource-Policy': h['cross-origin-resource-policy'] || '❌ MISSING',
            'Server': h['server'] || 'Hidden',
            'X-Powered-By': h['x-powered-by'] || 'Hidden',
        };
        return { statusCode: response.statusCode, audit, rawHeaders: h };
    } catch (e) { return { error: e.message }; }
}

// ═══════════════════════════════════════════════════
// MODULE 7: Port Scanner (Top 40)
// ═══════════════════════════════════════════════════
async function portScan(hostname, deep = false) {
    const commonPorts = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 27017];
    const deepPorts = deep ? [1433, 1521, 2082, 2083, 2086, 2087, 4443, 5000, 5601, 7443, 8000, 8081, 8888, 9090, 9200, 9300, 10000, 11211, 15672, 27018, 50000, 8083, 8084, 9443, 2375, 2376, 6443, 10250, 4848, 7001] : [];
    const ports = [...commonPorts, ...deepPorts];
    const open = [];

    for (let i = 0; i < ports.length; i += 15) {
        const batch = ports.slice(i, i + 15);
        const results = await Promise.allSettled(
            batch.map(port => new Promise((resolve, reject) => {
                const sock = new net.Socket();
                sock.setTimeout(1200);
                sock.on('connect', () => { sock.destroy(); resolve(port); });
                sock.on('timeout', () => { sock.destroy(); reject(); });
                sock.on('error', () => { sock.destroy(); reject(); });
                sock.connect(port, hostname);
            }))
        );
        results.forEach(r => { if (r.status === 'fulfilled') open.push(r.value); });
    }
    return open;
}

// ═══════════════════════════════════════════════════
// MODULE 8: Technology Detection (expanded)
// ═══════════════════════════════════════════════════
async function detectTech(target) {
    try {
        const url = target.startsWith('http') ? target : `https://${target}`;
        const response = await httpGet(url);
        const tech = [];
        const h = response.headers;
        const body = response.body.toLowerCase();

        if (h['server']) tech.push({ name: 'Server', value: h['server'] });
        if (h['x-powered-by']) tech.push({ name: 'Powered By', value: h['x-powered-by'] });

        // CMS
        if (body.includes('wp-content') || body.includes('wordpress')) tech.push({ name: 'CMS', value: 'WordPress' });
        if (body.includes('joomla')) tech.push({ name: 'CMS', value: 'Joomla' });
        if (body.includes('drupal')) tech.push({ name: 'CMS', value: 'Drupal' });
        if (body.includes('shopify')) tech.push({ name: 'CMS', value: 'Shopify' });
        if (body.includes('squarespace')) tech.push({ name: 'CMS', value: 'Squarespace' });
        if (body.includes('ghost')) tech.push({ name: 'CMS', value: 'Ghost' });
        if (body.includes('wix.com')) tech.push({ name: 'CMS', value: 'Wix' });

        // Frameworks
        if (body.includes('next/static') || body.includes('__next')) tech.push({ name: 'Framework', value: 'Next.js' });
        if (body.includes('nuxt') || body.includes('__nuxt')) tech.push({ name: 'Framework', value: 'Nuxt.js' });
        if (body.includes('gatsby')) tech.push({ name: 'Framework', value: 'Gatsby' });
        if (body.includes('svelte') || body.includes('sveltekit')) tech.push({ name: 'Framework', value: 'SvelteKit' });
        if (body.includes('remix') || body.includes('__remix')) tech.push({ name: 'Framework', value: 'Remix' });
        if (body.includes('astro')) tech.push({ name: 'Framework', value: 'Astro' });

        // Libraries
        if (body.includes('react') || body.includes('reactdom') || body.includes('__react')) tech.push({ name: 'Library', value: 'React' });
        if (body.includes('angular')) tech.push({ name: 'Framework', value: 'Angular' });
        if (body.includes('vue.js') || body.includes('vuejs') || body.includes('__vue')) tech.push({ name: 'Framework', value: 'Vue.js' });
        if (body.includes('jquery')) tech.push({ name: 'Library', value: 'jQuery' });
        if (body.includes('alpine')) tech.push({ name: 'Library', value: 'Alpine.js' });
        if (body.includes('htmx')) tech.push({ name: 'Library', value: 'HTMX' });

        // CSS
        if (body.includes('bootstrap')) tech.push({ name: 'CSS', value: 'Bootstrap' });
        if (body.includes('tailwindcss') || body.includes('tailwind')) tech.push({ name: 'CSS', value: 'TailwindCSS' });
        if (body.includes('bulma')) tech.push({ name: 'CSS', value: 'Bulma' });
        if (body.includes('material-ui') || body.includes('mui')) tech.push({ name: 'CSS', value: 'Material UI' });

        // Backend
        if (body.includes('laravel') || (h['set-cookie'] && h['set-cookie'].includes('laravel'))) tech.push({ name: 'Framework', value: 'Laravel' });
        if (body.includes('django') || (h['set-cookie'] && h['set-cookie'].includes('csrftoken'))) tech.push({ name: 'Framework', value: 'Django' });
        if (body.includes('express')) tech.push({ name: 'Framework', value: 'Express.js' });
        if (body.includes('rails') || (h['set-cookie'] && h['set-cookie'].includes('_rails'))) tech.push({ name: 'Framework', value: 'Ruby on Rails' });
        if (body.includes('spring') || h['x-application-context']) tech.push({ name: 'Framework', value: 'Spring Boot' });
        if (h['x-aspnet-version'] || h['x-aspnetmvc-version']) tech.push({ name: 'Framework', value: 'ASP.NET' });

        // Analytics
        if (body.includes('google-analytics') || body.includes('gtag') || body.includes('ga.js')) tech.push({ name: 'Analytics', value: 'Google Analytics' });
        if (body.includes('hotjar')) tech.push({ name: 'Analytics', value: 'Hotjar' });
        if (body.includes('segment.com') || body.includes('analytics.js')) tech.push({ name: 'Analytics', value: 'Segment' });

        return tech;
    } catch (e) { return [{ name: 'Error', value: e.message }]; }
}

// ═══════════════════════════════════════════════════
// MODULE 9: WHOIS Lookup (via RDAP / public API)
// ═══════════════════════════════════════════════════
async function whoisLookup(hostname) {
    try {
        const res = await httpGet(`https://rdap.org/domain/${hostname}`, { timeout: 8000 });
        if (res.statusCode === 200) {
            try {
                const data = JSON.parse(res.body);
                return {
                    name: data.ldhName || hostname,
                    status: data.status || [],
                    events: (data.events || []).map(e => ({ action: e.eventAction, date: e.eventDate })),
                    nameservers: (data.nameservers || []).map(n => n.ldhName),
                    registrar: data.entities ? data.entities.find(e => (e.roles || []).includes('registrar'))?.vcardArray?.[1]?.find(v => v[0] === 'fn')?.[3] || 'Unknown' : 'Unknown',
                    source: 'RDAP',
                };
            } catch { return { raw: res.body.substring(0, 2000), source: 'RDAP' }; }
        }
        return { error: `Status ${res.statusCode}` };
    } catch (e) { return { error: e.message }; }
}

// ═══════════════════════════════════════════════════
// MODULE 10: Email Security (SPF/DKIM/DMARC)
// ═══════════════════════════════════════════════════
async function emailSecurity(hostname) {
    const results = { spf: null, dmarc: null, dkim: null, mxRecords: null };

    // SPF
    try {
        const txt = await new Promise((resolve, reject) => dns.resolveTxt(hostname, (err, r) => err ? reject(err) : resolve(r)));
        const spfRecord = txt.flat().find(r => r.startsWith('v=spf1'));
        results.spf = spfRecord || '❌ NO SPF RECORD';
    } catch { results.spf = '❌ NO SPF RECORD'; }

    // DMARC
    try {
        const dmarc = await new Promise((resolve, reject) => dns.resolveTxt(`_dmarc.${hostname}`, (err, r) => err ? reject(err) : resolve(r)));
        results.dmarc = dmarc.flat().find(r => r.startsWith('v=DMARC1')) || '❌ NO DMARC RECORD';
    } catch { results.dmarc = '❌ NO DMARC RECORD'; }

    // DKIM (common selectors)
    const selectors = ['default', 'google', 'selector1', 'selector2', 'dkim', 'mail', 'k1', 'k2', 'sig1', 'mimecast'];
    const dkimResults = await Promise.allSettled(
        selectors.map(sel => new Promise((resolve, reject) => {
            dns.resolveTxt(`${sel}._domainkey.${hostname}`, (err, r) => err ? reject(err) : resolve({ selector: sel, record: r.flat().join('') }));
        }))
    );
    results.dkim = dkimResults.filter(r => r.status === 'fulfilled').map(r => r.value);
    if (results.dkim.length === 0) results.dkim = '❌ NO DKIM FOUND';

    // MX
    try {
        results.mxRecords = await new Promise((resolve, reject) => dns.resolveMx(hostname, (err, r) => err ? reject(err) : resolve(r)));
    } catch { results.mxRecords = []; }

    return results;
}

// ═══════════════════════════════════════════════════
// MODULE 11: Cloud Provider Detection
// ═══════════════════════════════════════════════════
async function detectCloud(hostname) {
    const providers = [];

    try {
        const ips = await new Promise(resolve => dns.resolve4(hostname, (err, a) => resolve(err ? [] : a)));
        if (ips.length === 0) return providers;

        // Check CNAME for cloud indicators
        try {
            const cname = await new Promise((resolve, reject) => dns.resolveCname(hostname, (err, r) => err ? reject(err) : resolve(r)));
            const cn = cname.join(' ').toLowerCase();
            if (cn.includes('amazonaws') || cn.includes('aws') || cn.includes('elb') || cn.includes('cloudfront') || cn.includes('s3')) providers.push({ provider: 'AWS', evidence: `CNAME: ${cname.join(', ')}` });
            if (cn.includes('azure') || cn.includes('azurewebsites') || cn.includes('cloudapp') || cn.includes('trafficmanager')) providers.push({ provider: 'Azure', evidence: `CNAME: ${cname.join(', ')}` });
            if (cn.includes('google') || cn.includes('googleapis') || cn.includes('appspot') || cn.includes('run.app')) providers.push({ provider: 'Google Cloud', evidence: `CNAME: ${cname.join(', ')}` });
            if (cn.includes('digitalocean')) providers.push({ provider: 'DigitalOcean', evidence: `CNAME: ${cname.join(', ')}` });
            if (cn.includes('herokuapp') || cn.includes('heroku')) providers.push({ provider: 'Heroku', evidence: `CNAME: ${cname.join(', ')}` });
            if (cn.includes('netlify')) providers.push({ provider: 'Netlify', evidence: `CNAME: ${cname.join(', ')}` });
            if (cn.includes('vercel') || cn.includes('now.sh')) providers.push({ provider: 'Vercel', evidence: `CNAME: ${cname.join(', ')}` });
            if (cn.includes('pages.dev') || cn.includes('workers.dev')) providers.push({ provider: 'Cloudflare Pages', evidence: `CNAME: ${cname.join(', ')}` });
            if (cn.includes('render.com')) providers.push({ provider: 'Render', evidence: `CNAME: ${cname.join(', ')}` });
            if (cn.includes('railway.app')) providers.push({ provider: 'Railway', evidence: `CNAME: ${cname.join(', ')}` });
            if (cn.includes('fly.dev') || cn.includes('fly.io')) providers.push({ provider: 'Fly.io', evidence: `CNAME: ${cname.join(', ')}` });
        } catch { }

        // Check headers for cloud hints
        try {
            const url = hostname.startsWith('http') ? hostname : `https://${hostname}`;
            const res = await httpGet(url, { timeout: 3000 });
            const hdr = JSON.stringify(res.headers).toLowerCase();
            if (hdr.includes('x-vercel') || hdr.includes('x-vercel-id')) providers.push({ provider: 'Vercel', evidence: 'Headers' });
            if (hdr.includes('x-netlify')) providers.push({ provider: 'Netlify', evidence: 'Headers' });
            if (hdr.includes('x-amz') || hdr.includes('x-amzn')) providers.push({ provider: 'AWS', evidence: 'Headers' });
            if (hdr.includes('x-azure')) providers.push({ provider: 'Azure', evidence: 'Headers' });
            if (hdr.includes('x-goog') || hdr.includes('x-cloud-trace')) providers.push({ provider: 'Google Cloud', evidence: 'Headers' });
            if (hdr.includes('fly-request-id')) providers.push({ provider: 'Fly.io', evidence: 'Headers' });
            if (hdr.includes('render')) providers.push({ provider: 'Render', evidence: 'Headers' });
        } catch { }

        return [...new Map(providers.map(p => [p.provider, p])).values()];
    } catch (e) { return [{ provider: 'Error', evidence: e.message }]; }
}

// ═══════════════════════════════════════════════════
// MODULE 12: HTTP/2 & Protocol Fingerprint
// ═══════════════════════════════════════════════════
async function http2Fingerprint(hostname) {
    const results = { http2: false, protocols: [], tlsVersion: null, alpn: null };
    try {
        await new Promise((resolve, reject) => {
            const sock = tls.connect(443, hostname, { rejectUnauthorized: false, timeout: 5000, ALPNProtocols: ['h2', 'http/1.1', 'http/1.0'] }, () => {
                results.http2 = sock.alpnProtocol === 'h2';
                results.alpn = sock.alpnProtocol;
                results.tlsVersion = sock.getProtocol();
                results.cipher = sock.getCipher();
                results.protocols.push(sock.alpnProtocol);
                sock.destroy();
                resolve();
            });
            sock.on('error', reject); sock.on('timeout', () => { sock.destroy(); reject(); });
        });
    } catch { }

    // Check HTTP/1.1 response headers for upgrade hints
    try {
        const url = `https://${hostname}`;
        const res = await httpGet(url);
        if (res.headers['alt-svc']) results.altSvc = res.headers['alt-svc'];
        if (res.headers['upgrade']) results.upgrade = res.headers['upgrade'];
    } catch { }

    return results;
}

// ═══════════════════════════════════════════════════
// MODULE 13: DNS Zone Transfer Attempt
// ═══════════════════════════════════════════════════
async function zoneTransfer(hostname) {
    const results = { vulnerable: false, nameservers: [], attempted: 0, records: [] };
    try {
        const nsRecords = await new Promise((resolve, reject) => dns.resolveNs(hostname, (err, r) => err ? reject(err) : resolve(r)));
        results.nameservers = nsRecords;

        for (const ns of nsRecords.slice(0, 3)) {
            results.attempted++;
            try {
                const nsIps = await new Promise((resolve, reject) => dns.resolve4(ns, (err, a) => err ? reject(err) : resolve(a)));
                if (nsIps.length === 0) continue;

                // Attempt AXFR query via TCP
                await new Promise((resolve, reject) => {
                    const sock = new net.Socket();
                    sock.setTimeout(3000);
                    sock.connect(53, nsIps[0], () => {
                        // Build AXFR query
                        const labels = hostname.split('.').map(l => { const b = Buffer.alloc(l.length + 1); b[0] = l.length; b.write(l, 1); return b; });
                        const name = Buffer.concat([...labels, Buffer.from([0])]);
                        const header = Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
                        const question = Buffer.concat([name, Buffer.from([0x00, 0xFC, 0x00, 0x01])]);
                        const msg = Buffer.concat([header, question]);
                        const lenBuf = Buffer.alloc(2); lenBuf.writeUInt16BE(msg.length);
                        sock.write(Buffer.concat([lenBuf, msg]));

                        let data = Buffer.alloc(0);
                        sock.on('data', d => {
                            data = Buffer.concat([data, d]);
                            if (data.length > 14) {
                                const flags = data.readUInt16BE(4);
                                const rcode = flags & 0x0F;
                                if (rcode === 0 && data.length > 50) {
                                    results.vulnerable = true;
                                    results.records.push({ ns, dataSize: data.length });
                                }
                            }
                        });
                        setTimeout(() => { sock.destroy(); resolve(); }, 3000);
                    });
                    sock.on('error', () => { sock.destroy(); resolve(); });
                    sock.on('timeout', () => { sock.destroy(); resolve(); });
                });
            } catch { }
        }
    } catch { }
    return results;
}

// ═══════════════════════════════════════════════════
// MODULE 14: Directory Bruteforce
// ═══════════════════════════════════════════════════
async function dirBrute(target, deep = false) {
    const url = target.startsWith('http') ? target : `https://${target}`;
    const common = [
        '/admin', '/login', '/dashboard', '/wp-admin', '/wp-login.php',
        '/administrator', '/cpanel', '/phpmyadmin', '/api', '/api/v1',
        '/api/v2', '/graphql', '/swagger', '/docs', '/debug',
        '/console', '/shell', '/cmd', '/backup', '/.git',
        '/.env', '/.git/config', '/.svn', '/.htaccess', '/config',
        '/server-status', '/server-info', '/robots.txt', '/sitemap.xml',
        '/wp-config.php', '/phpinfo.php', '/info.php', '/test',
        '/status', '/health', '/metrics', '/monitoring', '/panel',
    ];
    const extra = deep ? [
        '/cgi-bin', '/webdav', '/jenkins', '/jira', '/confluence',
        '/kibana', '/grafana', '/prometheus', '/portainer', '/traefik',
        '/minio', '/adminer', '/redis', '/mongo', '/elastic',
        '/solr', '/rabbitmq', '/flower', '/celery', '/airflow',
        '/jupyter', '/notebook', '/terminal', '/websocket', '/socket.io',
        '/api/docs', '/api/schema', '/openapi.json', '/swagger.json',
        '/v1', '/v2', '/v3', '/internal', '/private', '/secret',
        '/tmp', '/temp', '/log', '/logs', '/error', '/errors',
        '/upload', '/uploads', '/files', '/download', '/downloads',
        '/static', '/assets', '/media', '/public', '/storage',
    ] : [];

    const paths = [...common, ...extra];
    const found = [];

    for (let i = 0; i < paths.length; i += 10) {
        const batch = paths.slice(i, i + 10);
        const results = await Promise.allSettled(
            batch.map(p => new Promise(async (resolve, reject) => {
                try {
                    const res = await httpGet(`${url}${p}`, { timeout: 3000 });
                    if (res.statusCode < 400 && res.statusCode !== 301) {
                        resolve({ path: p, status: res.statusCode, size: res.body.length, server: res.headers['server'] || '' });
                    } else if (res.statusCode === 401 || res.statusCode === 403) {
                        resolve({ path: p, status: res.statusCode, protected: true });
                    } else { reject(); }
                } catch { reject(); }
            }))
        );
        results.forEach(r => { if (r.status === 'fulfilled') found.push(r.value); });
    }
    return found;
}

// ═══════════════════════════════════════════════════
// ORCHESTRATOR
// ═══════════════════════════════════════════════════
async function runRecon(target, parameter, intensity) {
    const hostname = target.replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0];
    const isDeep = intensity === '--deep';
    const results = {};
    const modules = [];

    switch (parameter) {
        case 'global':
            modules.push('dns', 'subdomains', 'waf', 'headers', 'tech', 'ssl', 'email', 'cloud');
            break;
        case 'root':
            modules.push('dns', 'subdomains', 'waf', 'origin', 'ssl', 'ports', 'headers', 'tech', 'whois', 'email', 'cloud', 'http2', 'zone', 'dirbr');
            break;
        case 'server':
            modules.push('dns', 'origin', 'ssl', 'ports', 'waf', 'cloud', 'http2', 'zone');
            break;
        case 'client':
            modules.push('headers', 'tech', 'ssl', 'http2');
            break;
        case 'both': case 'all':
            modules.push('dns', 'subdomains', 'waf', 'origin', 'ssl', 'ports', 'headers', 'tech', 'whois', 'email', 'cloud', 'http2', 'zone', 'dirbr');
            break;
        case '.':
            modules.push('headers', 'tech', 'waf');
            break;
        default:
            modules.push('dns', 'waf', 'headers', 'cloud');
    }

    for (const mod of modules) {
        switch (mod) {
            case 'dns':
                process.stdout.write(chalk.cyan('  🔍 DNS Records...'));
                results.dns = await dnsRecon(hostname);
                console.log(chalk.green(' ✓'));
                break;
            case 'subdomains':
                process.stdout.write(chalk.cyan('  🌐 Subdomain Discovery...'));
                results.subdomains = await subdomainScan(hostname, isDeep);
                console.log(chalk.green(` ✓ (${results.subdomains.length} found)`));
                break;
            case 'waf':
                process.stdout.write(chalk.cyan('  🛡️  WAF Detection...'));
                results.waf = await detectWAF(target);
                console.log(chalk.green(` ✓ (${results.waf.detected.length > 0 ? results.waf.detected.join(', ') : 'Clear'})`));
                break;
            case 'origin':
                process.stdout.write(chalk.cyan('  🎯 Origin IP Discovery...'));
                results.origin = await findOriginIP(hostname);
                console.log(chalk.green(` ✓ (${results.origin.length} sources)`));
                break;
            case 'ssl':
                process.stdout.write(chalk.cyan('  🔒 SSL/TLS Analysis...'));
                results.ssl = await sslAnalysis(hostname);
                console.log(chalk.green(' ✓'));
                break;
            case 'ports':
                process.stdout.write(chalk.cyan('  🚪 Port Scanning...'));
                results.ports = await portScan(hostname, isDeep);
                console.log(chalk.green(` ✓ (${results.ports.length} open)`));
                break;
            case 'headers':
                process.stdout.write(chalk.cyan('  📋 Security Headers...'));
                results.headers = await headersAudit(target);
                console.log(chalk.green(' ✓'));
                break;
            case 'tech':
                process.stdout.write(chalk.cyan('  ⚙️  Technology Stack...'));
                results.tech = await detectTech(target);
                console.log(chalk.green(` ✓ (${results.tech.length} detected)`));
                break;
            case 'whois':
                process.stdout.write(chalk.cyan('  📝 WHOIS Lookup...'));
                results.whois = await whoisLookup(hostname);
                console.log(chalk.green(' ✓'));
                break;
            case 'email':
                process.stdout.write(chalk.cyan('  📧 Email Security (SPF/DKIM/DMARC)...'));
                results.email = await emailSecurity(hostname);
                console.log(chalk.green(' ✓'));
                break;
            case 'cloud':
                process.stdout.write(chalk.cyan('  ☁️  Cloud Provider Detection...'));
                results.cloud = await detectCloud(hostname);
                console.log(chalk.green(` ✓ (${results.cloud.length} detected)`));
                break;
            case 'http2':
                process.stdout.write(chalk.cyan('  🔗 HTTP/2 Fingerprint...'));
                results.http2 = await http2Fingerprint(hostname);
                console.log(chalk.green(` ✓ (${results.http2.http2 ? 'H2' : 'H1.1'})`));
                break;
            case 'zone':
                process.stdout.write(chalk.cyan('  🗺️  DNS Zone Transfer...'));
                results.zoneTransfer = await zoneTransfer(hostname);
                console.log(chalk.green(` ✓ (${results.zoneTransfer.vulnerable ? chalk.red('VULNERABLE!') : 'Protected'})`));
                break;
            case 'dirbr':
                process.stdout.write(chalk.cyan('  📂 Directory Bruteforce...'));
                results.directories = await dirBrute(target, isDeep);
                console.log(chalk.green(` ✓ (${results.directories.length} found)`));
                break;
        }
    }
    return results;
}

module.exports = { runRecon, dnsRecon, subdomainScan, detectWAF, findOriginIP, sslAnalysis, headersAudit, portScan, detectTech, whoisLookup, emailSecurity, detectCloud, http2Fingerprint, zoneTransfer, dirBrute };
