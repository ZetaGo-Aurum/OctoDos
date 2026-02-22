/**
 * OctoDos Deep Recon Engine v3.0
 * Comprehensive origin IP discovery and infrastructure analysis.
 *
 * Techniques:
 *   - DNS A/AAAA/MX/NS/TXT/CNAME resolution
 *   - SPF record IP extraction
 *   - Cloudflare IP range detection
 *   - Multi-WAF fingerprinting (CF, Akamai, AWS, Sucuri, Imperva, F5)
 *   - Subdomain origin leak scan (50+ subdomains)
 *   - Certificate Transparency search
 *   - Security header audit
 *   - Technology fingerprinting
 *
 * Created by ZetaGo-Aurum | MIT License
 */
const dns = require('dns').promises;
const chalk = require('chalk');
const axios = require('axios');
const { generateEvasionHeaders } = require('./antiwaf');

// ── 50+ Common Subdomains That Leak Origin IPs ──
const LEAK_SUBDOMAINS = [
    'direct', 'origin', 'backend', 'real', 'true', 'actual',
    'api', 'api2', 'api-v2', 'rest', 'graphql', 'ws', 'websocket',
    'dev', 'development', 'staging', 'stage', 'stg', 'test', 'testing', 'qa',
    'mail', 'smtp', 'imap', 'pop', 'pop3', 'mx', 'email', 'webmail', 'owa',
    'ftp', 'sftp', 'ssh', 'rdp', 'vpn', 'openvpn', 'wireguard',
    'cpanel', 'whm', 'plesk', 'admin', 'panel', 'dashboard', 'manage',
    'ns1', 'ns2', 'ns3', 'dns', 'dns1', 'dns2',
    'old', 'legacy', 'v1', 'v2', 'archive', 'backup', 'bak',
    'cdn', 'media', 'static', 'img', 'images', 'assets', 'files', 'uploads',
    'db', 'database', 'mysql', 'postgres', 'mongo', 'redis', 'elastic',
    'monitor', 'grafana', 'prometheus', 'kibana', 'nagios', 'zabbix',
    'internal', 'intranet', 'corp', 'office', 'gateway', 'proxy', 'lb',
    'jenkins', 'gitlab', 'git', 'ci', 'cd', 'deploy', 'docker', 'k8s',
    'www2', 'www3', 'web', 'web2', 'app', 'app2',
];

// ── Cloudflare IP Ranges ──
const CF_RANGES = [
    '103.21.244.', '103.22.200.', '103.31.4.', '104.16.', '104.17.',
    '104.18.', '104.19.', '104.20.', '104.21.', '104.22.', '104.23.',
    '104.24.', '104.25.', '104.26.', '104.27.', '108.162.', '131.0.72.',
    '141.101.', '162.158.', '172.64.', '172.65.', '172.66.', '172.67.',
    '173.245.', '188.114.', '190.93.', '197.234.', '198.41.',
];

function isCfIp(ip) { return CF_RANGES.some(r => ip.startsWith(r)); }

async function runRecon(target) {
    console.log(chalk.hex('#FFDD57').bold('\n  ┌──────────────────────────────────────────────────┐'));
    console.log(chalk.hex('#FFDD57').bold('  │   🔍 OCTODOS DEEP RECON ENGINE v3.0               │'));
    console.log(chalk.hex('#FFDD57').bold('  └──────────────────────────────────────────────────┘'));

    const results = {
        originIp: 'Not found',
        resolvedIps: [],
        proxies: [],
        security: [],
        leakedIps: [],
        headers: {},
        wafDetected: null,
        technologies: [],
        dnsRecords: {},
    };

    try {
        const urlObj = new URL(target.startsWith('http') ? target : `http://${target}`);
        const hostname = urlObj.hostname;

        // ══════════════════════════════════════════
        // PHASE 1: COMPREHENSIVE DNS ANALYSIS
        // ══════════════════════════════════════════
        console.log(chalk.cyan('\n  [Phase 1] Comprehensive DNS Analysis'));

        // A Records
        try {
            const a = await dns.resolve4(hostname);
            results.resolvedIps = a;
            results.originIp = a[0] || 'Unknown';
            results.dnsRecords.A = a;
            console.log(chalk.white(`    A Records:     ${a.join(', ')}`));
            a.forEach(ip => {
                if (isCfIp(ip)) {
                    if (!results.proxies.includes('Cloudflare')) results.proxies.push('Cloudflare');
                    console.log(chalk.red(`    ⚠ ${ip} is a Cloudflare IP (origin hidden)`));
                }
            });
        } catch { console.log(chalk.gray('    A Records:     None')); }

        // AAAA Records
        try {
            const aaaa = await dns.resolve6(hostname);
            results.dnsRecords.AAAA = aaaa;
            console.log(chalk.white(`    AAAA Records:  ${aaaa.join(', ')}`));
        } catch { }

        // MX Records (common origin leak)
        try {
            const mx = await dns.resolveMx(hostname);
            results.dnsRecords.MX = mx.map(r => r.exchange);
            console.log(chalk.white(`    MX Records:    ${mx.map(r => `${r.exchange} (pri: ${r.priority})`).join(', ')}`));
            for (const rec of mx) {
                try {
                    const mxIps = await dns.resolve4(rec.exchange);
                    mxIps.forEach(ip => {
                        if (!isCfIp(ip) && !results.leakedIps.includes(ip)) {
                            results.leakedIps.push(ip);
                            console.log(chalk.green(`    💡 Origin leak via MX: ${rec.exchange} → ${ip}`));
                        }
                    });
                } catch { }
            }
        } catch { }

        // NS Records
        try {
            const ns = await dns.resolveNs(hostname);
            results.dnsRecords.NS = ns;
            console.log(chalk.white(`    NS Records:    ${ns.join(', ')}`));
        } catch { }

        // CNAME Records
        try {
            const cname = await dns.resolveCname(hostname);
            results.dnsRecords.CNAME = cname;
            console.log(chalk.white(`    CNAME Records: ${cname.join(', ')}`));
        } catch { }

        // TXT Records (SPF IP extraction)
        try {
            const txt = await dns.resolveTxt(hostname);
            const flat = txt.flat();
            results.dnsRecords.TXT = flat;
            const spf = flat.find(r => r.startsWith('v=spf1'));
            if (spf) {
                console.log(chalk.white(`    SPF Record:    ${spf.substring(0, 80)}${spf.length > 80 ? '...' : ''}`));
                const ipMatches = spf.match(/ip4:(\d+\.\d+\.\d+\.\d+(?:\/\d+)?)/g);
                if (ipMatches) {
                    ipMatches.forEach(m => {
                        const ip = m.replace('ip4:', '').split('/')[0];
                        if (!isCfIp(ip) && !results.leakedIps.includes(ip)) {
                            results.leakedIps.push(ip);
                            console.log(chalk.green(`    💡 Origin leak via SPF: ${ip}`));
                        }
                    });
                }
                // Include mechanisms
                const includes = spf.match(/include:([^\s]+)/g);
                if (includes) {
                    console.log(chalk.gray(`    SPF Includes:  ${includes.join(', ')}`));
                }
            }
            // DMARC
            const dmarc = flat.find(r => r.startsWith('v=DMARC1'));
            if (dmarc) {
                console.log(chalk.white(`    DMARC:         ${dmarc.substring(0, 80)}${dmarc.length > 80 ? '...' : ''}`));
            }
        } catch { }

        // ══════════════════════════════════════════
        // PHASE 2: HTTP FINGERPRINTING & WAF DETECTION
        // ══════════════════════════════════════════
        console.log(chalk.cyan('\n  [Phase 2] HTTP Fingerprinting & WAF Detection'));
        try {
            const headers = generateEvasionHeaders(target);
            const resp = await axios.get(target, {
                timeout: 8000,
                maxRedirects: 5,
                validateStatus: () => true,
                headers: headers,
            });
            results.headers = resp.headers;
            const server = (resp.headers['server'] || '').toLowerCase();
            const via = resp.headers['via'] || '';
            const xPoweredBy = resp.headers['x-powered-by'] || '';

            // WAF Detection Matrix
            const wafChecks = [
                { name: 'Cloudflare', checks: [
                    () => server.includes('cloudflare'),
                    () => !!resp.headers['cf-ray'],
                    () => !!resp.headers['cf-cache-status'],
                ]},
                { name: 'Akamai', checks: [
                    () => server.includes('akamai'),
                    () => !!resp.headers['x-akamai-transformed'],
                    () => !!resp.headers['x-akamai-request-id'],
                ]},
                { name: 'AWS CloudFront', checks: [
                    () => !!resp.headers['x-amz-cf-id'],
                    () => !!resp.headers['x-amz-cf-pop'],
                    () => server.includes('amazons3'),
                ]},
                { name: 'AWS WAF', checks: [
                    () => !!resp.headers['x-amzn-requestid'],
                    () => server.includes('awselb'),
                ]},
                { name: 'Sucuri', checks: [
                    () => !!resp.headers['x-sucuri-id'],
                    () => !!resp.headers['x-sucuri-cache'],
                    () => server.includes('sucuri'),
                ]},
                { name: 'Imperva/Incapsula', checks: [
                    () => !!resp.headers['x-iinfo'],
                    () => !!resp.headers['x-cdn'],
                    () => server.includes('incapsula'),
                ]},
                { name: 'F5 BIG-IP', checks: [
                    () => server.includes('big-ip') || server.includes('bigip'),
                    () => !!resp.headers['x-cnection'],
                ]},
                { name: 'Fastly', checks: [
                    () => !!resp.headers['x-served-by'],
                    () => !!resp.headers['x-fastly-request-id'],
                    () => server.includes('fastly'),
                ]},
                { name: 'Varnish', checks: [
                    () => !!resp.headers['x-varnish'],
                    () => via.toLowerCase().includes('varnish'),
                ]},
                { name: 'DDoS-Guard', checks: [
                    () => server.includes('ddos-guard'),
                ]},
                { name: 'StackPath', checks: [
                    () => !!resp.headers['x-sp-waf'],
                ]},
            ];

            for (const waf of wafChecks) {
                if (waf.checks.some(c => { try { return c(); } catch { return false; } })) {
                    if (!results.proxies.includes(waf.name)) results.proxies.push(waf.name);
                    if (!results.wafDetected) results.wafDetected = waf.name;
                    console.log(chalk.red(`    ⚠ WAF/CDN Detected: ${waf.name}`));
                }
            }

            // Server fingerprint
            if (server) console.log(chalk.white(`    Server:        ${server}`));
            if (xPoweredBy) {
                console.log(chalk.white(`    X-Powered-By:  ${xPoweredBy}`));
                results.security.push(`X-Powered-By exposed: ${xPoweredBy}`);
                results.technologies.push(xPoweredBy);
            }
            if (via) console.log(chalk.white(`    Via:           ${via}`));
            if (resp.headers['x-cache']) console.log(chalk.white(`    X-Cache:       ${resp.headers['x-cache']}`));

            // Technology detection
            const techHeaders = {
                'x-aspnet-version': 'ASP.NET',
                'x-aspnetmvc-version': 'ASP.NET MVC',
                'x-drupal-cache': 'Drupal',
                'x-generator': resp.headers['x-generator'],
                'x-wordpress': 'WordPress',
            };
            for (const [h, tech] of Object.entries(techHeaders)) {
                if (resp.headers[h]) {
                    const t = typeof tech === 'string' ? tech : resp.headers[h];
                    results.technologies.push(t);
                    console.log(chalk.white(`    Technology:    ${t}`));
                }
            }

            // Security headers audit
            const secHeaders = {
                'strict-transport-security': 'HSTS',
                'x-content-type-options': 'X-Content-Type-Options',
                'x-frame-options': 'X-Frame-Options',
                'content-security-policy': 'CSP',
                'x-xss-protection': 'X-XSS-Protection',
                'referrer-policy': 'Referrer-Policy',
                'permissions-policy': 'Permissions-Policy',
                'cross-origin-embedder-policy': 'COEP',
                'cross-origin-opener-policy': 'COOP',
                'cross-origin-resource-policy': 'CORP',
            };
            const present = [];
            const missing = [];
            for (const [h, name] of Object.entries(secHeaders)) {
                if (resp.headers[h]) present.push(name);
                else missing.push(name);
            }
            if (missing.length > 0) {
                results.security.push(`Missing security headers: ${missing.join(', ')}`);
                console.log(chalk.yellow(`    ⚠ Missing:     ${missing.join(', ')}`));
            }
            if (present.length > 0) {
                console.log(chalk.green(`    ✓ Present:     ${present.join(', ')}`));
            }

        } catch (e) {
            console.log(chalk.gray(`    HTTP Error: ${e.message}`));
        }

        // ══════════════════════════════════════════
        // PHASE 3: SUBDOMAIN ORIGIN LEAK SCAN
        // ══════════════════════════════════════════
        console.log(chalk.cyan('\n  [Phase 3] Subdomain Origin Leak Scan'));
        const baseDomain = hostname.split('.').slice(-2).join('.');
        let scanned = 0;
        let found = 0;

        const batchSize = 15;
        for (let i = 0; i < LEAK_SUBDOMAINS.length; i += batchSize) {
            const batch = LEAK_SUBDOMAINS.slice(i, i + batchSize);
            const tasks = batch.map(async (sub) => {
                const fqdn = `${sub}.${baseDomain}`;
                try {
                    const ips = await dns.resolve4(fqdn);
                    ips.forEach(ip => {
                        if (!isCfIp(ip) && !results.leakedIps.includes(ip)) {
                            results.leakedIps.push(ip);
                            found++;
                            console.log(chalk.green(`    💡 Leak: ${fqdn} → ${ip}`));
                        }
                    });
                } catch { }
                scanned++;
            });
            await Promise.all(tasks);
        }
        console.log(chalk.gray(`    Scanned ${scanned}/${LEAK_SUBDOMAINS.length} subdomains | Found ${found} potential origin IPs`));

        // ══════════════════════════════════════════
        // PHASE 4: CERTIFICATE TRANSPARENCY CHECK
        // ══════════════════════════════════════════
        console.log(chalk.cyan('\n  [Phase 4] Certificate Transparency Lookup'));
        try {
            const ctResp = await axios.get(`https://crt.sh/?q=${hostname}&output=json`, { timeout: 10000 });
            if (Array.isArray(ctResp.data)) {
                const uniqueNames = new Set();
                ctResp.data.forEach(cert => {
                    const names = cert.name_value.split('\n');
                    names.forEach(n => uniqueNames.add(n.trim()));
                });
                const ctDomains = Array.from(uniqueNames).filter(n => n && !n.startsWith('*'));
                console.log(chalk.white(`    Found ${ctDomains.length} unique names in CT logs`));

                // Check first 20 for origin leaks
                const ctBatch = ctDomains.slice(0, 20);
                for (const domain of ctBatch) {
                    try {
                        const ips = await dns.resolve4(domain);
                        ips.forEach(ip => {
                            if (!isCfIp(ip) && !results.leakedIps.includes(ip)) {
                                results.leakedIps.push(ip);
                                console.log(chalk.green(`    💡 CT Leak: ${domain} → ${ip}`));
                            }
                        });
                    } catch { }
                }
            }
        } catch {
            console.log(chalk.gray('    CT lookup unavailable'));
        }

        // ══════════════════════════════════════════
        // RECON SUMMARY
        // ══════════════════════════════════════════
        console.log(chalk.hex('#FFDD57').bold('\n  ┌──────────────────────────────────────────────────┐'));
        console.log(chalk.hex('#FFDD57').bold('  │   📋 RECON INTELLIGENCE SUMMARY                  │'));
        console.log(chalk.hex('#FFDD57').bold('  └──────────────────────────────────────────────────┘'));
        console.log(chalk.white(`  Resolved IPs:       ${results.resolvedIps.join(', ') || 'None'}`));
        console.log(chalk.white(`  WAF/CDN:            ${results.proxies.length > 0 ? chalk.red(results.proxies.join(', ')) : chalk.green('None detected — exposed!')}`));
        console.log(chalk.white(`  Leaked Origin IPs:  ${results.leakedIps.length > 0 ? chalk.hex('#FF6B6B').bold(results.leakedIps.join(', ')) : 'None found'}`));
        console.log(chalk.white(`  Technologies:       ${results.technologies.length > 0 ? results.technologies.join(', ') : 'Unknown'}`));
        console.log(chalk.white(`  Security Issues:    ${results.security.length}`));

    } catch (error) {
        console.log(chalk.red(`  Recon error: ${error.message}`));
    }

    return results;
}

module.exports = { runRecon };
