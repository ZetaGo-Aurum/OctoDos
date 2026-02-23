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
    console.log(CYAN.bold('  🔍 OctoRecon v1.0.0 — Deep Reconnaissance Engine'));
    console.log(DIM('  Created by ZetaGo-Aurum | 8 Modules | Origin IP Discovery'));
    console.log(DIM('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    console.log(CYAN('\n  🧠 Modules:'));
    console.log(DIM('    ├── 📡 DNS Engine       — A/AAAA/MX/NS/TXT/SOA/CNAME/SRV/PTR'));
    console.log(DIM('    ├── 🌐 Subdomain Scan   — 130+ wordlist brute-force'));
    console.log(DIM('    ├── 🛡️  WAF Detection    — CF/Akamai/Sucuri/Imperva/AWS/11 WAFs'));
    console.log(DIM('    ├── 🎯 Origin IP Finder — MX/SSL/IPv6/Subdomain bypass'));
    console.log(DIM('    ├── 🔒 SSL/TLS Audit    — Protocol, cipher, cert, SAN, expiry'));
    console.log(DIM('    ├── 📋 Headers Audit    — HSTS/CSP/XFO/XSS/Referrer'));
    console.log(DIM('    ├── 🚪 Port Scanner     — Top 40 TCP with batch concurrency'));
    console.log(DIM('    └── ⚙️  Tech Detector    — Server, CMS, framework, libraries'));
}

// ── Result Printer ──
function printResults(results) {
    console.log(CYAN.bold('\n  ╔══════════════════════════════════════════════════╗'));
    console.log(CYAN.bold('  ║   🔍 OCTORECON RECONNAISSANCE REPORT              ║'));
    console.log(CYAN.bold('  ╚══════════════════════════════════════════════════╝\n'));

    if (results.dns) {
        console.log(PINK.bold('  📡 DNS Records:'));
        for (const [type, records] of Object.entries(results.dns)) {
            if (records && (Array.isArray(records) ? records.length > 0 : true)) {
                const val = Array.isArray(records) ? (typeof records[0] === 'object' ? JSON.stringify(records) : records.join(', ')) : JSON.stringify(records);
                console.log(DIM(`     ${type.padEnd(10)}`), chalk.white(val));
            }
        }
        console.log();
    }

    if (results.subdomains) {
        console.log(PINK.bold(`  🌐 Subdomains Found: ${results.subdomains.length}`));
        results.subdomains.forEach(s => {
            console.log(DIM(`     ${s.subdomain.padEnd(35)}`), NEON(s.ip.join(', ')));
        });
        console.log();
    }

    if (results.waf) {
        console.log(PINK.bold('  🛡️  WAF Detection:'));
        if (results.waf.detected.length > 0) {
            results.waf.detected.forEach(w => console.log(GOLD(`     ⚠ ${w} DETECTED`)));
        } else {
            console.log(NEON('     ✓ No WAF detected'));
        }
        console.log();
    }

    if (results.origin) {
        console.log(PINK.bold('  🎯 Origin IP Discovery:'));
        results.origin.forEach(o => {
            if (o.ips) {
                console.log(DIM(`     [${o.method}]`), chalk.red.bold(o.ips.join(', ')));
            } else if (o.data && o.data.subjectaltname) {
                console.log(DIM(`     [${o.method}]`), chalk.white(o.data.subjectaltname));
            }
        });
        console.log();
    }

    if (results.ssl && !results.ssl.error) {
        console.log(PINK.bold('  🔒 SSL/TLS:'));
        console.log(DIM('     Protocol:  '), chalk.white(results.ssl.protocol));
        console.log(DIM('     Cipher:    '), chalk.white(results.ssl.cipher ? results.ssl.cipher.name : 'N/A'));
        console.log(DIM('     Valid:     '), chalk.white(`${results.ssl.valid_from} → ${results.ssl.valid_to}`));
        if (results.ssl.subjectaltname) console.log(DIM('     SAN:       '), chalk.white(results.ssl.subjectaltname.substring(0, 100)));
        console.log();
    }

    if (results.ports) {
        console.log(PINK.bold(`  🚪 Open Ports: ${results.ports.length}`));
        if (results.ports.length > 0) console.log(NEON(`     ${results.ports.join(', ')}`));
        console.log();
    }

    if (results.headers && results.headers.audit) {
        console.log(PINK.bold('  📋 Security Headers:'));
        for (const [header, value] of Object.entries(results.headers.audit)) {
            const icon = typeof value === 'string' && value.startsWith('❌') ? chalk.red('✗') : chalk.green('✓');
            console.log(`     ${icon} ${DIM(header.padEnd(30))} ${chalk.white(typeof value === 'string' ? value.substring(0, 60) : value)}`);
        }
        console.log();
    }

    if (results.tech && results.tech.length > 0) {
        console.log(PINK.bold('  ⚙️  Technology Stack:'));
        results.tech.forEach(t => {
            console.log(DIM(`     [${t.name}]`), chalk.white(t.value));
        });
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
    console.log();

    const { target } = await inquirer.prompt([{
        type: 'input',
        name: 'target',
        message: CYAN('Target (URL/IP/Domain):'),
        validate: (v) => v.trim().length > 0 ? true : 'Target is required',
    }]);

    const { parameter } = await inquirer.prompt([{
        type: 'list',
        name: 'parameter',
        message: CYAN('Select Scan Parameter:'),
        choices: [
            new inquirer.Separator(DIM('──── 🔍 Scan Profiles ────')),
            { name: '🌍 Global          — DNS, Subdomains, WAF, Headers, Tech, SSL', value: 'global' },
            { name: '🏴 Root            — Deep scan + Origin IP + Ports', value: 'root' },
            { name: '🖥️  Server          — Server-side (DNS, Origin, SSL, Ports)', value: 'server' },
            { name: '👤 Client          — Client-side (Headers, Tech, SSL)', value: 'client' },
            { name: '🔄 Both            — Global + Root combined', value: 'both' },
            { name: '💀 All             — Every module (Maximum coverage)', value: 'all' },
            new inquirer.Separator(DIM('──── ⚡ Quick ────')),
            { name: '⚡ Quick Scan (.)  — Headers, Tech, WAF only', value: '.' },
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
