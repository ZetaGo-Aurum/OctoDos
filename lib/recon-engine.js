/**
 * OctoRecon Engine v1.0.0 — Deep Reconnaissance Engine
 * Modular scanning: DNS, Subdomains, WAF, Origin IP, SSL, Headers, Ports, Tech, Whois
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

// ═══════════════════════════════════════════════════
// MODULE 1: DNS Records
// ═══════════════════════════════════════════════════
async function dnsRecon(hostname) {
    const results = {};
    const types = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'SOA', 'CNAME', 'SRV'];

    for (const type of types) {
        try {
            results[type] = await new Promise((resolve, reject) => {
                dns.resolve(hostname, type, (err, records) => {
                    if (err) return resolve(null);
                    resolve(records);
                });
            });
        } catch { results[type] = null; }
    }

    // Reverse DNS
    try {
        const ips = await new Promise((resolve, reject) => {
            dns.resolve4(hostname, (err, addrs) => err ? resolve([]) : resolve(addrs));
        });
        if (ips.length > 0) {
            results.REVERSE = await new Promise((resolve) => {
                dns.reverse(ips[0], (err, hostnames) => err ? resolve(null) : resolve(hostnames));
            });
        }
        results.IP = ips;
    } catch { }

    return results;
}

// ═══════════════════════════════════════════════════
// MODULE 2: Subdomain Discovery
// ═══════════════════════════════════════════════════
async function subdomainScan(hostname, deep = false) {
    const common = [
        'www', 'mail', 'ftp', 'admin', 'blog', 'dev', 'staging', 'api',
        'app', 'cdn', 'cloud', 'cpanel', 'dashboard', 'db', 'demo',
        'docs', 'email', 'git', 'gitlab', 'graphql', 'help', 'host',
        'internal', 'jenkins', 'jira', 'login', 'm', 'media', 'monitor',
        'mysql', 'ns1', 'ns2', 'office', 'panel', 'portal', 'proxy',
        'redis', 'remote', 'repo', 'server', 'shop', 'smtp', 'ssh',
        'ssl', 'staging', 'static', 'status', 'store', 'support',
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
    ] : [];

    const all = [...common, ...extra];
    const found = [];

    // Batch DNS lookups in groups of 10 for speed
    for (let i = 0; i < all.length; i += 10) {
        const batch = all.slice(i, i + 10);
        const results = await Promise.allSettled(
            batch.map(sub => new Promise((resolve, reject) => {
                dns.resolve4(`${sub}.${hostname}`, (err, addrs) => {
                    if (err) return reject(err);
                    resolve({ subdomain: `${sub}.${hostname}`, ip: addrs });
                });
            }))
        );
        results.forEach(r => {
            if (r.status === 'fulfilled') found.push(r.value);
        });
    }

    return found;
}

// ═══════════════════════════════════════════════════
// MODULE 3: WAF Detection
// ═══════════════════════════════════════════════════
async function detectWAF(target) {
    const wafSignatures = {
        'Cloudflare': ['cf-ray', 'cf-cache-status', '__cfduid', 'cf-connecting-ip', 'cloudflare'],
        'Akamai': ['x-akamai', 'akamai', 'akamai-ghost', 'akamai-x-cache'],
        'Sucuri': ['x-sucuri', 'sucuri', 'sucuri-cache'],
        'AWS WAF': ['x-amzn', 'x-amz-cf', 'aws', 'amazon'],
        'Imperva': ['x-iinfo', 'incap_ses', 'incapsula', 'imperva'],
        'F5 BIG-IP': ['bigipserver', 'x-cnection', 'f5'],
        'Barracuda': ['barra_counter_session', 'barracuda'],
        'Varnish': ['x-varnish', 'via varnish'],
        'Fastly': ['x-fastly', 'fastly', 'x-served-by'],
        'CloudFront': ['x-amz-cf', 'cloudfront', 'x-cache: hit from cloudfront'],
        'DDoS-Guard': ['ddos-guard', 'x-ddos-protection'],
    };

    const detected = [];

    try {
        const url = target.startsWith('http') ? target : `https://${target}`;
        const response = await new Promise((resolve, reject) => {
            const mod = url.startsWith('https') ? https : http;
            const req = mod.get(url, { timeout: 5000, rejectUnauthorized: false, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36' } }, (res) => {
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => resolve({ headers: res.headers, statusCode: res.statusCode, body: body.substring(0, 2000) }));
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        });

        const allHeaders = JSON.stringify(response.headers).toLowerCase();
        const bodyLower = response.body.toLowerCase();

        for (const [waf, signatures] of Object.entries(wafSignatures)) {
            for (const sig of signatures) {
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

    // Method 1: Direct DNS records
    try {
        const ips = await new Promise((resolve, reject) => {
            dns.resolve4(hostname, (err, addrs) => err ? resolve([]) : resolve(addrs));
        });
        origins.push({ method: 'DNS A Record', ips });
    } catch { }

    // Method 2: Check common origin subdomains
    const originSubs = ['origin', 'direct', 'real', 'backend', 'server', 'web', 'host', 'node', 'app', 'api', 'mail', 'ftp', 'cpanel', 'webmail', 'smtp', 'pop', 'imap'];
    for (const sub of originSubs) {
        try {
            const ips = await new Promise((resolve, reject) => {
                dns.resolve4(`${sub}.${hostname}`, { timeout: 2000 }, (err, addrs) => err ? reject(err) : resolve(addrs));
            });
            origins.push({ method: `Subdomain: ${sub}.${hostname}`, ips });
        } catch { }
    }

    // Method 3: MX record IPs (mail servers often reveal origin)
    try {
        const mx = await new Promise((resolve, reject) => {
            dns.resolveMx(hostname, (err, records) => err ? reject(err) : resolve(records));
        });
        for (const record of mx.slice(0, 3)) {
            try {
                const ips = await new Promise((resolve, reject) => {
                    dns.resolve4(record.exchange, (err, addrs) => err ? reject(err) : resolve(addrs));
                });
                origins.push({ method: `MX: ${record.exchange}`, ips });
            } catch { }
        }
    } catch { }

    // Method 4: SSL certificate check — connect directly and inspect cert SAN
    try {
        const certInfo = await new Promise((resolve, reject) => {
            const sock = tls.connect(443, hostname, { rejectUnauthorized: false, timeout: 5000 }, () => {
                const cert = sock.getPeerCertificate();
                sock.destroy();
                resolve({
                    subject: cert.subject,
                    issuer: cert.issuer,
                    valid_from: cert.valid_from,
                    valid_to: cert.valid_to,
                    subjectaltname: cert.subjectaltname,
                    fingerprint: cert.fingerprint,
                });
            });
            sock.on('error', reject);
            sock.on('timeout', () => { sock.destroy(); reject(new Error('timeout')); });
        });
        origins.push({ method: 'SSL Certificate SAN', data: certInfo });
    } catch { }

    // Method 5: IPv6 resolution (often bypasses Cloudflare)
    try {
        const ipv6 = await new Promise((resolve, reject) => {
            dns.resolve6(hostname, (err, addrs) => err ? reject(err) : resolve(addrs));
        });
        origins.push({ method: 'IPv6 AAAA Record', ips: ipv6 });
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
                resolve({
                    protocol: proto,
                    cipher: cipher,
                    subject: cert.subject,
                    issuer: cert.issuer,
                    valid_from: cert.valid_from,
                    valid_to: cert.valid_to,
                    serialNumber: cert.serialNumber,
                    fingerprint256: cert.fingerprint256,
                    subjectaltname: cert.subjectaltname,
                    bits: cert.bits,
                });
            });
            sock.on('error', reject);
            sock.on('timeout', () => { sock.destroy(); reject(new Error('timeout')); });
        });
    } catch (e) {
        return { error: e.message };
    }
}

// ═══════════════════════════════════════════════════
// MODULE 6: Security Headers Audit
// ═══════════════════════════════════════════════════
async function headersAudit(target) {
    try {
        const url = target.startsWith('http') ? target : `https://${target}`;
        const response = await new Promise((resolve, reject) => {
            const mod = url.startsWith('https') ? https : http;
            mod.get(url, { timeout: 5000, rejectUnauthorized: false }, (res) => {
                resolve({ headers: res.headers, statusCode: res.statusCode });
            }).on('error', reject);
        });

        const h = response.headers;
        const audit = {
            'Strict-Transport-Security': h['strict-transport-security'] || '❌ MISSING',
            'Content-Security-Policy': h['content-security-policy'] || '❌ MISSING',
            'X-Frame-Options': h['x-frame-options'] || '❌ MISSING',
            'X-Content-Type-Options': h['x-content-type-options'] || '❌ MISSING',
            'X-XSS-Protection': h['x-xss-protection'] || '❌ MISSING',
            'Referrer-Policy': h['referrer-policy'] || '❌ MISSING',
            'Permissions-Policy': h['permissions-policy'] || '❌ MISSING',
            'Server': h['server'] || 'Hidden',
            'X-Powered-By': h['x-powered-by'] || 'Hidden',
        };

        return { statusCode: response.statusCode, audit, rawHeaders: h };
    } catch (e) {
        return { error: e.message };
    }
}

// ═══════════════════════════════════════════════════
// MODULE 7: Port Scanner (Top 20)
// ═══════════════════════════════════════════════════
async function portScan(hostname, deep = false) {
    const commonPorts = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 27017];
    const deepPorts = deep ? [1433, 1521, 2082, 2083, 2086, 2087, 4443, 5000, 7443, 8000, 8081, 8888, 9090, 9200, 9300, 10000, 11211, 15672, 27018, 50000] : [];
    const ports = [...commonPorts, ...deepPorts];
    const open = [];

    // Scan in batches of 10
    for (let i = 0; i < ports.length; i += 10) {
        const batch = ports.slice(i, i + 10);
        const results = await Promise.allSettled(
            batch.map(port => new Promise((resolve, reject) => {
                const sock = new net.Socket();
                sock.setTimeout(1500);
                sock.on('connect', () => { sock.destroy(); resolve(port); });
                sock.on('timeout', () => { sock.destroy(); reject(); });
                sock.on('error', () => { sock.destroy(); reject(); });
                sock.connect(port, hostname);
            }))
        );
        results.forEach(r => {
            if (r.status === 'fulfilled') open.push(r.value);
        });
    }

    return open;
}

// ═══════════════════════════════════════════════════
// MODULE 8: Technology Detection
// ═══════════════════════════════════════════════════
async function detectTech(target) {
    try {
        const url = target.startsWith('http') ? target : `https://${target}`;
        const response = await new Promise((resolve, reject) => {
            const mod = url.startsWith('https') ? https : http;
            mod.get(url, { timeout: 5000, rejectUnauthorized: false, headers: { 'User-Agent': 'Mozilla/5.0 Chrome/122.0.0.0' } }, (res) => {
                let body = '';
                res.on('data', c => body += c.toString().substring(0, 5000));
                res.on('end', () => resolve({ headers: res.headers, body }));
            }).on('error', reject);
        });

        const tech = [];
        const h = response.headers;
        const body = response.body.toLowerCase();

        // Server detection
        if (h['server']) tech.push({ name: 'Server', value: h['server'] });
        if (h['x-powered-by']) tech.push({ name: 'Powered By', value: h['x-powered-by'] });

        // Framework detection via HTML
        if (body.includes('wp-content') || body.includes('wordpress')) tech.push({ name: 'CMS', value: 'WordPress' });
        if (body.includes('joomla')) tech.push({ name: 'CMS', value: 'Joomla' });
        if (body.includes('drupal')) tech.push({ name: 'CMS', value: 'Drupal' });
        if (body.includes('next/static') || body.includes('__next')) tech.push({ name: 'Framework', value: 'Next.js' });
        if (body.includes('nuxt') || body.includes('__nuxt')) tech.push({ name: 'Framework', value: 'Nuxt.js' });
        if (body.includes('react') || body.includes('reactdom')) tech.push({ name: 'Library', value: 'React' });
        if (body.includes('angular')) tech.push({ name: 'Framework', value: 'Angular' });
        if (body.includes('vue.js') || body.includes('vuejs')) tech.push({ name: 'Framework', value: 'Vue.js' });
        if (body.includes('jquery')) tech.push({ name: 'Library', value: 'jQuery' });
        if (body.includes('bootstrap')) tech.push({ name: 'CSS', value: 'Bootstrap' });
        if (body.includes('tailwindcss') || body.includes('tailwind')) tech.push({ name: 'CSS', value: 'TailwindCSS' });
        if (body.includes('laravel') || (h['set-cookie'] && h['set-cookie'].includes('laravel'))) tech.push({ name: 'Framework', value: 'Laravel' });
        if (body.includes('django') || (h['set-cookie'] && h['set-cookie'].includes('csrftoken'))) tech.push({ name: 'Framework', value: 'Django' });
        if (body.includes('express')) tech.push({ name: 'Framework', value: 'Express.js' });

        return tech;
    } catch (e) {
        return [{ name: 'Error', value: e.message }];
    }
}

// ═══════════════════════════════════════════════════
// ORCHESTRATOR — Run modules based on parameter
// ═══════════════════════════════════════════════════
async function runRecon(target, parameter, intensity) {
    const hostname = target.replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0];
    const isDeep = intensity === '--deep';
    const results = {};
    const modules = [];

    // Determine which modules to run based on parameter
    switch (parameter) {
        case 'global':
            modules.push('dns', 'subdomains', 'waf', 'headers', 'tech', 'ssl');
            break;
        case 'root':
            modules.push('dns', 'subdomains', 'waf', 'origin', 'ssl', 'ports', 'headers', 'tech');
            break;
        case 'server':
            modules.push('dns', 'origin', 'ssl', 'ports', 'waf');
            break;
        case 'client':
            modules.push('headers', 'tech', 'ssl');
            break;
        case 'both':
            modules.push('dns', 'subdomains', 'waf', 'origin', 'ssl', 'ports', 'headers', 'tech');
            break;
        case 'all':
            modules.push('dns', 'subdomains', 'waf', 'origin', 'ssl', 'ports', 'headers', 'tech');
            break;
        case '.':
            modules.push('headers', 'tech', 'waf');
            break;
        default:
            modules.push('dns', 'waf', 'headers');
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
                console.log(chalk.green(` ✓ (${results.waf.detected.length > 0 ? results.waf.detected.join(', ') : 'None detected'})`));
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
        }
    }

    return results;
}

module.exports = { runRecon, dnsRecon, subdomainScan, detectWAF, findOriginIP, sslAnalysis, headersAudit, portScan, detectTech };
