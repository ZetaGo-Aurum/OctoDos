#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                 OctoRecon v1.0.0                              ║
 * ║  Deep Reconnaissance Engine — Origin IP · WAF · Subdomains   ║
 * ║                                                               ║
 * ║  Created by ZetaGo-Aurum | MIT License                       ║
 * ║  Part of the OctoDos Suite v2.0.0                             ║
 * ║  Unauthorized use is a criminal offense.                     ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
process.removeAllListeners('warning');

const chalk = require('chalk');
const figlet = require('figlet');
const gradient = require('gradient-string');
const inquirer = require('inquirer');
const { runRecon } = require('./lib/recon-engine');

// ── Color Palette ──
const CYAN = chalk.hex('#00D4FF');
const NEON = chalk.hex('#00FF88');
const PINK = chalk.hex('#FF6B9D');
const GOLD = chalk.hex('#FFD700');
const DIM = chalk.gray;

// ── Banner ──
function showBanner() {
    const banner = figlet.textSync('OCTORECON', { font: 'ANSI Shadow', horizontalLayout: 'default' });
    console.log(gradient.vice(banner));
    console.log(DIM('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(CYAN.bold('  🔍 OctoRecon v2.0.0 — Advanced Deep Reconnaissance Engine'));
    console.log(DIM('  Created by ZetaGo-Aurum | 14 Modules | Smarter & More Accurate'));
    console.log(DIM('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    console.log(CYAN('\n  🧠 Core Modules:'));
    console.log(DIM('    ├── 📡 DNS Engine        — A/AAAA/MX/NS/TXT/SOA/CNAME/SRV/PTR'));
    console.log(DIM('    ├── 🌐 Subdomain Scan    — 130+ wordlist, batch DNS brute-force'));
    console.log(DIM('    ├── 🛡️  WAF Detection     — 18 WAF/CDN vendors detection'));
    console.log(DIM('    ├── 🎯 Origin IP Finder  — MX/SSL/IPv6/Subdomain bypass'));
    console.log(DIM('    ├── 🔒 SSL/TLS Audit     — Protocol, cipher, cert, SAN, expiry'));
    console.log(DIM('    ├── 📋 Headers Audit     — 12 security headers + CORS policies'));
    console.log(DIM('    ├── 🚪 Port Scanner      — Top 50 TCP with batch concurrency'));
    console.log(DIM('    └── ⚙️  Tech Detector     — 35+ technologies detection'));
    console.log(CYAN('\n  💀 Advanced Modules:'));
    console.log(DIM('    ├── 📝 WHOIS Lookup      — Domain registration via RDAP'));
    console.log(DIM('    ├── 📧 Email Security    — SPF/DKIM/DMARC validation'));
    console.log(DIM('    ├── ☁️  Cloud Detection   — AWS/Azure/GCP/Vercel/Netlify/12 providers'));
    console.log(DIM('    ├── 🔗 HTTP/2 Fingerprint — ALPN, TLS version, alt-svc'));
    console.log(DIM('    ├── 🗺️  Zone Transfer     — AXFR vulnerability test'));
    console.log(DIM('    └── 📂 Dir Bruteforce    — 80+ common admin/config/API paths'));

    console.log(chalk.red.bold('\n  ⚠ WARNING: Unauthorized reconnaissance is ILLEGAL.'));
    console.log(chalk.red('  You MUST have EXPLICIT AUTHORIZATION from the target owner.\n'));
}

// ── Result Printer ──
function printResults(results) {
    const SEP = DIM('  ────────────────────────────────────────────────────────────────');
    console.log(CYAN.bold('\n  ╔═══════════════════════════════════════════════════════════════╗'));
    console.log(CYAN.bold('  ║   🔍 OCTORECON v2 — FULL RECONNAISSANCE REPORT              ║'));
    console.log(CYAN.bold('  ╚═══════════════════════════════════════════════════════════════╝\n'));

    if (results.dns) {
        console.log(SEP); console.log(PINK.bold('  📡 DNS RECORDS')); console.log(SEP);
        for (const [type, records] of Object.entries(results.dns)) {
            if (records && (Array.isArray(records) ? records.length > 0 : true)) {
                const val = Array.isArray(records) ? (typeof records[0] === 'object' ? JSON.stringify(records) : records.join(', ')) : JSON.stringify(records);
                console.log(DIM(`     ${type.padEnd(10)}`), chalk.white(val));
            }
        }
        console.log();
    }

    if (results.subdomains) {
        console.log(SEP); console.log(PINK.bold(`  🌐 SUBDOMAIN DISCOVERY (${results.subdomains.length})`)); console.log(SEP);
        results.subdomains.forEach((s, i) => {
            const isLast = i === results.subdomains.length - 1;
            console.log(DIM(`  ${isLast ? '└──' : '├──'} `) + chalk.white(s.subdomain.padEnd(35)) + NEON(s.ip.join(', ')));
        });
        console.log();
    }

    if (results.waf) {
        console.log(SEP); console.log(PINK.bold('  🛡️  WAF / CDN DETECTION')); console.log(SEP);
        if (results.waf.detected.length > 0) results.waf.detected.forEach(w => console.log(chalk.red(`  ⚠ ${w} — DETECTED`)));
        else console.log(NEON('  ✓ No WAF/CDN detected — Target is exposed'));
        console.log();
    }

    if (results.origin) {
        console.log(SEP); console.log(PINK.bold('  🎯 ORIGIN IP DISCOVERY')); console.log(SEP);
        results.origin.forEach(o => {
            if (o.ips) console.log(DIM(`     [${o.method}]`) + ' ' + chalk.red.bold(o.ips.join(', ')));
            else if (o.data) {
                if (o.data.subjectaltname) console.log(DIM(`     [${o.method}]`) + ' ' + chalk.white(o.data.subjectaltname));
                else if (Array.isArray(o.data)) console.log(DIM(`     [${o.method}]`) + ' ' + chalk.white(o.data.join(', ')));
            }
        });
        console.log();
    }

    if (results.ssl && !results.ssl.error) {
        console.log(SEP); console.log(PINK.bold('  🔒 SSL/TLS ANALYSIS')); console.log(SEP);
        console.log(chalk.white(`  Protocol:     ${results.ssl.protocol}`));
        console.log(chalk.white(`  Cipher:       ${results.ssl.cipher ? results.ssl.cipher.name : 'N/A'}`));
        console.log(chalk.white(`  Valid:         ${results.ssl.valid_from} → ${results.ssl.valid_to}`));
        if (results.ssl.bits) console.log(chalk.white(`  Key Size:     ${results.ssl.bits} bits`));
        if (results.ssl.subjectaltname) console.log(chalk.white(`  SAN:          ${results.ssl.subjectaltname.substring(0, 120)}`));
        if (results.ssl.fingerprint256) console.log(DIM(`  Fingerprint:  ${results.ssl.fingerprint256}`));
        console.log();
    }

    if (results.ports) {
        console.log(SEP); console.log(PINK.bold(`  🚪 PORT SCAN (${results.ports.length} open)`)); console.log(SEP);
        if (results.ports.length > 0) {
            results.ports.forEach((p, i) => {
                const isLast = i === results.ports.length - 1;
                console.log(DIM(`  ${isLast ? '└──' : '├──'} `) + NEON(`Port ${p}`));
            });
        } else console.log(DIM('  All probed ports closed or filtered.'));
        console.log();
    }

    if (results.headers && results.headers.audit) {
        console.log(SEP); console.log(PINK.bold('  📋 SECURITY HEADERS')); console.log(SEP);
        for (const [header, value] of Object.entries(results.headers.audit)) {
            const icon = typeof value === 'string' && value.startsWith('❌') ? chalk.red('✗') : chalk.green('✓');
            console.log(`     ${icon} ${chalk.white(header.padEnd(35))} ${typeof value === 'string' && value.startsWith('❌') ? chalk.red(value) : NEON(value)}`);
        }
        console.log();
    }

    if (results.tech && results.tech.length > 0) {
        console.log(SEP); console.log(PINK.bold(`  ⚙️  TECHNOLOGY STACK (${results.tech.length})`)); console.log(SEP);
        const cats = {};
        results.tech.forEach(t => { const c = t.name || 'Other'; if (!cats[c]) cats[c] = []; cats[c].push(t.value); });
        const cKeys = Object.keys(cats);
        cKeys.forEach((cat, ci) => {
            const isLast = ci === cKeys.length - 1;
            console.log(DIM(`  ${isLast ? '└──' : '├──'} `) + GOLD(cat));
            cats[cat].forEach((v, vi) => {
                const cp = isLast ? '    ' : '│   '; const cb = vi === cats[cat].length - 1 ? '└──' : '├──';
                console.log(DIM(`  ${cp}${cb} `) + chalk.white(v));
            });
        });
        console.log();
    }

    // ── NEW v2 MODULES ──
    if (results.whois) {
        console.log(SEP); console.log(PINK.bold('  📝 WHOIS / RDAP')); console.log(SEP);
        if (results.whois.error) { console.log(DIM(`  Error: ${results.whois.error}`)); }
        else {
            if (results.whois.name) console.log(chalk.white(`  Domain:      ${results.whois.name}`));
            if (results.whois.registrar) console.log(chalk.white(`  Registrar:   ${results.whois.registrar}`));
            if (results.whois.status) console.log(chalk.white(`  Status:      ${Array.isArray(results.whois.status) ? results.whois.status.join(', ') : results.whois.status}`));
            if (results.whois.events) results.whois.events.forEach(e => console.log(DIM(`  ${e.action}: `) + chalk.white(e.date)));
            if (results.whois.nameservers) console.log(chalk.white(`  Nameservers: ${results.whois.nameservers.join(', ')}`));
        }
        console.log();
    }

    if (results.email) {
        console.log(SEP); console.log(PINK.bold('  📧 EMAIL SECURITY')); console.log(SEP);
        const spfOk = results.email.spf && !String(results.email.spf).includes('❌');
        console.log(`  ${spfOk ? chalk.green('✓') : chalk.red('✗')} SPF:    ${spfOk ? NEON(results.email.spf) : chalk.red(results.email.spf)}`);
        const dmarcOk = results.email.dmarc && !String(results.email.dmarc).includes('❌');
        console.log(`  ${dmarcOk ? chalk.green('✓') : chalk.red('✗')} DMARC:  ${dmarcOk ? NEON(results.email.dmarc) : chalk.red(results.email.dmarc)}`);
        if (Array.isArray(results.email.dkim) && results.email.dkim.length > 0) {
            results.email.dkim.forEach(d => console.log(chalk.green(`  ✓ DKIM [${d.selector}]: `) + DIM(d.record.substring(0, 60))));
        } else console.log(chalk.red(`  ✗ DKIM:  ${typeof results.email.dkim === 'string' ? results.email.dkim : 'No selectors found'}`));
        if (results.email.mxRecords && results.email.mxRecords.length > 0) {
            console.log(GOLD('\n  MX Records:'));
            results.email.mxRecords.forEach(mx => console.log(DIM(`     Priority ${String(mx.priority).padEnd(5)} → `) + chalk.white(mx.exchange)));
        }
        console.log();
    }

    if (results.cloud) {
        console.log(SEP); console.log(PINK.bold('  ☁️  CLOUD PROVIDER DETECTION')); console.log(SEP);
        if (results.cloud.length === 0) console.log(DIM('  No cloud provider detected'));
        else results.cloud.forEach(c => console.log(NEON(`  ✓ ${c.provider}`) + DIM(` — Evidence: ${c.evidence}`)));
        console.log();
    }

    if (results.http2) {
        console.log(SEP); console.log(PINK.bold('  🔗 HTTP/2 & PROTOCOL FINGERPRINT')); console.log(SEP);
        console.log(chalk.white(`  HTTP/2:      ${results.http2.http2 ? NEON('Supported') : chalk.red('Not supported')}`));
        console.log(chalk.white(`  ALPN:        ${results.http2.alpn || 'N/A'}`));
        console.log(chalk.white(`  TLS Version: ${results.http2.tlsVersion || 'N/A'}`));
        if (results.http2.cipher) console.log(chalk.white(`  Cipher:      ${results.http2.cipher.name || 'N/A'}`));
        if (results.http2.altSvc) console.log(chalk.white(`  Alt-Svc:     ${results.http2.altSvc}`));
        console.log();
    }

    if (results.zoneTransfer) {
        console.log(SEP); console.log(PINK.bold('  🗺️  DNS ZONE TRANSFER')); console.log(SEP);
        if (results.zoneTransfer.vulnerable) {
            console.log(chalk.red.bold('  ⚠ ZONE TRANSFER VULNERABILITY DETECTED!'));
            results.zoneTransfer.records.forEach(r => console.log(chalk.red(`     NS: ${r.ns} — Data size: ${r.dataSize} bytes`)));
        } else {
            console.log(NEON('  ✓ Zone transfer refused — Nameservers are properly configured'));
        }
        console.log(DIM(`  Tested: ${results.zoneTransfer.attempted} nameserver(s)`));
        console.log();
    }

    if (results.directories) {
        console.log(SEP); console.log(PINK.bold(`  📂 DIRECTORY BRUTEFORCE (${results.directories.length})`)); console.log(SEP);
        if (results.directories.length === 0) console.log(DIM('  No accessible directories or files found.'));
        else {
            results.directories.forEach((d, i) => {
                const isLast = i === results.directories.length - 1;
                const statusColor = d.protected ? chalk.yellow : (d.status === 200 ? chalk.red : chalk.white);
                const label = d.protected ? '🔒 Protected' : `🔓 Open (${d.status})`;
                console.log(DIM(`  ${isLast ? '└──' : '├──'} `) + statusColor(`${label} ${d.path}`) + (d.size ? DIM(` ${(d.size/1024).toFixed(1)}KB`) : ''));
            });
        }
        console.log();
    }
}

// ── CLI Help ──
function showHelp() {
    showBanner();
    console.log(chalk.white('\n  📖 CLI USAGE:'));
    console.log(CYAN('    octorecon <target> <parameter> [--intensity]\n'));

    console.log(chalk.white('  Parameters:'));
    console.log(DIM('    global     ') + chalk.white('General scan (DNS, Subs, WAF, Headers, Tech, SSL)'));
    console.log(DIM('    root       ') + chalk.white('Deep to the root (+ Origin IP, Ports)'));
    console.log(DIM('    server     ') + chalk.white('Server-side (DNS, Origin IP, SSL, Ports, WAF)'));
    console.log(DIM('    client     ') + chalk.white('Client-side (Headers, Tech, SSL)'));
    console.log(DIM('    both       ') + chalk.white('Global + Root combined'));
    console.log(DIM('    all        ') + chalk.white('Every available module'));
    console.log(DIM('    .          ') + chalk.white('Quick scan (Headers, Tech, WAF)\n'));

    console.log(chalk.white('  Intensity Flags:'));
    console.log(DIM('    --light    ') + chalk.white('Fast, fewer checks'));
    console.log(DIM('    --normal   ') + chalk.white('Standard (default)'));
    console.log(DIM('    --deep     ') + chalk.white('Maximum depth\n'));

    console.log(chalk.white('  Examples:'));
    console.log(GOLD('    octorecon google.com global --deep'));
    console.log(GOLD('    octorecon example.com root --normal'));
    console.log(GOLD('    octorecon 192.168.1.1 server'));
    console.log(GOLD('    octorecon https://target.com all --deep\n'));
}

// ═══════════════════════════════════════════════════
// INTERACTIVE MENU
// ═══════════════════════════════════════════════════
async function interactiveMenu() {
    showBanner();

    // ── DOUBLE TOS ──
    console.log(chalk.red.bold('\n  ╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.red.bold('  ║  ⚠ OCTORECON v2 — DOUBLE AUTHORIZATION REQUIRED            ║'));
    console.log(chalk.red.bold('  ╚══════════════════════════════════════════════════════════════╝'));

    console.log(chalk.yellow.bold('\n  ╔═══════════════════════════════════════════╗'));
    console.log(chalk.yellow.bold('  ║  STEP 1/2: GENERAL AUTHORIZATION         ║'));
    console.log(chalk.yellow.bold('  ╚═══════════════════════════════════════════╝'));
    const { consent1 } = await inquirer.prompt([{
        type: 'confirm', name: 'consent1',
        message: chalk.yellow('I have LEGAL AUTHORIZATION to scan this target:'),
        default: false,
    }]);
    if (!consent1) { console.log(chalk.red('\n  ❌ Aborting.\n')); process.exit(0); }

    console.log(chalk.yellow.bold('\n  ╔═══════════════════════════════════════════╗'));
    console.log(chalk.yellow.bold('  ║  STEP 2/2: RECONNAISSANCE CONSENT        ║'));
    console.log(chalk.yellow.bold('  ╚═══════════════════════════════════════════╝'));
    console.log(chalk.red('  Active scanning can trigger IDS/IPS alerts.'));
    console.log(chalk.red('  Port scanning and dir bruteforce may be logged.\n'));
    const { consent2 } = await inquirer.prompt([{
        type: 'confirm', name: 'consent2',
        message: chalk.yellow('I accept FULL RESPONSIBILITY for this reconnaissance:'),
        default: false,
    }]);
    if (!consent2) { console.log(chalk.red('\n  ❌ Aborting.\n')); process.exit(0); }
    console.log(NEON('\n  ✓ Double verification passed — Proceeding...\n'));

    const { target } = await inquirer.prompt([{
        type: 'input', name: 'target',
        message: CYAN('Target (URL/IP/Domain):'),
        validate: (v) => v.trim().length > 0 ? true : 'Target is required',
    }]);

    const { parameter } = await inquirer.prompt([{
        type: 'list', name: 'parameter',
        message: CYAN('Select Scan Profile:'),
        choices: [
            new inquirer.Separator(DIM('──── 🔍 Scan Profiles ────')),
            { name: '🌍 Global      — DNS, Subs, WAF, Headers, Tech, SSL, Email, Cloud', value: 'global' },
            { name: '🏴 Root        — ALL 14 modules (Maximum coverage)', value: 'root' },
            { name: '🖥️  Server      — DNS, Origin, SSL, Ports, WAF, Cloud, H2, Zone', value: 'server' },
            { name: '👤 Client      — Headers, Tech, SSL, HTTP/2', value: 'client' },
            { name: '💀 All         — Every module at full intensity', value: 'all' },
            new inquirer.Separator(DIM('──── ⚡ Quick ────')),
            { name: '⚡ Quick (.)   — Headers, Tech, WAF only', value: '.' },
        ],
    }]);

    const { intensity } = await inquirer.prompt([{
        type: 'list',
        name: 'intensity',
        message: CYAN('Select Intensity:'),
        choices: [
            { name: '🟢 Light   — Fast scan, basic checks', value: '--light' },
            { name: '🟡 Normal  — Standard depth (default)', value: '--normal' },
            { name: '🔴 Deep    — Maximum depth, more subdomains & ports', value: '--deep' },
        ],
    }]);

    console.log(DIM('\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(CYAN(`\n  🎯 Target:    ${chalk.white.bold(target)}`));
    console.log(CYAN(`  📋 Parameter: ${chalk.white.bold(parameter)}`));
    console.log(CYAN(`  ⚡ Intensity: ${chalk.white.bold(intensity.replace('--', ''))}`));
    console.log(DIM('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    const startTime = Date.now();

    try {
        const results = await runRecon(target, parameter, intensity);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        printResults(results);
        console.log(DIM('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(NEON.bold(`  ✅ Recon Complete — ${elapsed}s elapsed\n`));
    } catch (e) {
        console.error(chalk.red(`\n  ❌ Recon failed: ${e.message}`));
    }
}

// ═══════════════════════════════════════════════════
// CLI MODE
// ═══════════════════════════════════════════════════
async function cliMode(target, parameter, intensity) {
    showBanner();

    console.log(CYAN(`\n  🎯 Target:    ${chalk.white.bold(target)}`));
    console.log(CYAN(`  📋 Parameter: ${chalk.white.bold(parameter)}`));
    console.log(CYAN(`  ⚡ Intensity: ${chalk.white.bold(intensity.replace('--', ''))}`));
    console.log(DIM('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    const startTime = Date.now();

    try {
        const results = await runRecon(target, parameter, intensity);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        printResults(results);
        console.log(DIM('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(NEON.bold(`  ✅ Recon Complete — ${elapsed}s elapsed\n`));
    } catch (e) {
        console.error(chalk.red(`\n  ❌ Recon failed: ${e.message}`));
    }
}

// ── Main ──
async function main() {
    const args = process.argv.slice(2);

    // Help
    if (args.includes('--help') || args.includes('-h') || args.includes('--h')) {
        showHelp();
        return;
    }

    // No args → Interactive Menu
    if (args.length === 0) {
        await interactiveMenu();
        return;
    }

    // CLI mode
    const target = args[0];
    const validParams = ['global', 'root', 'server', 'client', 'both', 'all', '.'];
    const parameter = args[1] && validParams.includes(args[1]) ? args[1] : 'global';
    const intensity = args.find(a => ['--light', '--normal', '--deep'].includes(a)) || '--normal';

    await cliMode(target, parameter, intensity);
}

main();
