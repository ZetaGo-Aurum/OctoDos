#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                 OctoRecon v1.0.0                              ║
 * ║  Deep Reconnaissance Engine — Origin IP · WAF · Subdomains   ║
 * ║                                                               ║
 * ║  Created by ZetaGo-Aurum | MIT License                       ║
 * ║  Part of the OctoDos Suite                                    ║
 * ║  Unauthorized use is a criminal offense.                     ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
process.removeAllListeners('warning');

const chalk = require('chalk');
const figlet = require('figlet');
const gradient = require('gradient-string');
const ora = require('ora');
const { runRecon } = require('./lib/recon-engine');

// ── Banner ──
function showBanner() {
    const banner = figlet.textSync('OCTORECON', { font: 'ANSI Shadow', horizontalLayout: 'default' });
    console.log(gradient.vice(banner));
    console.log(chalk.gray('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.hex('#00BFFF').bold('  🔍 OctoRecon v1.0.0 — Deep Reconnaissance Engine'));
    console.log(chalk.gray('  Created by ZetaGo-Aurum | 8 Modules | Origin IP Discovery'));
    console.log(chalk.gray('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
}

// ── Result Printer ──
function printResults(results) {
    console.log(chalk.hex('#00BFFF').bold('\\n  ╔══════════════════════════════════════════════════╗'));
    console.log(chalk.hex('#00BFFF').bold('  ║   🔍 OCTORECON RECONNAISSANCE REPORT              ║'));
    console.log(chalk.hex('#00BFFF').bold('  ╚══════════════════════════════════════════════════╝\\n'));

    // DNS
    if (results.dns) {
        console.log(chalk.cyan.bold('  📡 DNS Records:'));
        for (const [type, records] of Object.entries(results.dns)) {
            if (records && (Array.isArray(records) ? records.length > 0 : true)) {
                const val = Array.isArray(records) ? (typeof records[0] === 'object' ? JSON.stringify(records) : records.join(', ')) : JSON.stringify(records);
                console.log(chalk.gray(`     ${type.padEnd(10)}`), chalk.white(val));
            }
        }
        console.log();
    }

    // Subdomains
    if (results.subdomains) {
        console.log(chalk.cyan.bold(`  🌐 Subdomains Found: ${results.subdomains.length}`));
        results.subdomains.forEach(s => {
            console.log(chalk.gray(`     ${s.subdomain.padEnd(35)}`), chalk.green(s.ip.join(', ')));
        });
        console.log();
    }

    // WAF
    if (results.waf) {
        console.log(chalk.cyan.bold('  🛡️  WAF Detection:'));
        if (results.waf.detected.length > 0) {
            results.waf.detected.forEach(w => console.log(chalk.yellow(`     ⚠ ${w} DETECTED`)));
        } else {
            console.log(chalk.green('     ✓ No WAF detected'));
        }
        console.log();
    }

    // Origin IP
    if (results.origin) {
        console.log(chalk.cyan.bold('  🎯 Origin IP Discovery:'));
        results.origin.forEach(o => {
            if (o.ips) {
                console.log(chalk.gray(`     [${o.method}]`), chalk.red.bold(o.ips.join(', ')));
            } else if (o.data && o.data.subjectaltname) {
                console.log(chalk.gray(`     [${o.method}]`), chalk.white(o.data.subjectaltname));
            }
        });
        console.log();
    }

    // SSL
    if (results.ssl && !results.ssl.error) {
        console.log(chalk.cyan.bold('  🔒 SSL/TLS:'));
        console.log(chalk.gray('     Protocol:  '), chalk.white(results.ssl.protocol));
        console.log(chalk.gray('     Cipher:    '), chalk.white(results.ssl.cipher ? results.ssl.cipher.name : 'N/A'));
        console.log(chalk.gray('     Valid:     '), chalk.white(`${results.ssl.valid_from} → ${results.ssl.valid_to}`));
        if (results.ssl.subjectaltname) console.log(chalk.gray('     SAN:       '), chalk.white(results.ssl.subjectaltname.substring(0, 100)));
        console.log();
    }

    // Ports
    if (results.ports) {
        console.log(chalk.cyan.bold(`  🚪 Open Ports: ${results.ports.length}`));
        if (results.ports.length > 0) {
            console.log(chalk.green(`     ${results.ports.join(', ')}`));
        }
        console.log();
    }

    // Headers
    if (results.headers && results.headers.audit) {
        console.log(chalk.cyan.bold('  📋 Security Headers:'));
        for (const [header, value] of Object.entries(results.headers.audit)) {
            const icon = value.startsWith('❌') ? chalk.red('✗') : chalk.green('✓');
            console.log(`     ${icon} ${chalk.gray(header.padEnd(30))} ${chalk.white(typeof value === 'string' ? value.substring(0, 60) : value)}`);
        }
        console.log();
    }

    // Tech
    if (results.tech && results.tech.length > 0) {
        console.log(chalk.cyan.bold('  ⚙️  Technology Stack:'));
        results.tech.forEach(t => {
            console.log(chalk.gray(`     [${t.name}]`), chalk.white(t.value));
        });
        console.log();
    }
}

// ── Help ──
function showHelp() {
    showBanner();
    console.log(chalk.white('\\n  Usage:'));
    console.log(chalk.cyan('    octorecon <target> <parameter> [--intensity]'));
    console.log();
    console.log(chalk.white('  Parameters:'));
    console.log(chalk.gray('    global     ') + chalk.white('General scan (DNS, Subdomains, WAF, Headers, Tech, SSL)'));
    console.log(chalk.gray('    root       ') + chalk.white('Deep scan to the root (DNS, Subs, WAF, Origin IP, SSL, Ports, Headers, Tech)'));
    console.log(chalk.gray('    server     ') + chalk.white('Server-side only (DNS, Origin IP, SSL, Ports, WAF)'));
    console.log(chalk.gray('    client     ') + chalk.white('Client-side only (Headers, Tech, SSL)'));
    console.log(chalk.gray('    both       ') + chalk.white('Combination of global + root'));
    console.log(chalk.gray('    all        ') + chalk.white('Every available module'));
    console.log(chalk.gray('    .          ') + chalk.white('Quick scan (Headers, Tech, WAF)'));
    console.log();
    console.log(chalk.white('  Intensity Flags:'));
    console.log(chalk.gray('    --light    ') + chalk.white('Fast scan, fewer checks'));
    console.log(chalk.gray('    --normal   ') + chalk.white('Standard scan (default)'));
    console.log(chalk.gray('    --deep     ') + chalk.white('Maximum depth — more subdomains, more ports'));
    console.log();
    console.log(chalk.white('  Examples:'));
    console.log(chalk.yellow('    octorecon google.com global --deep'));
    console.log(chalk.yellow('    octorecon example.com root --normal'));
    console.log(chalk.yellow('    octorecon 192.168.1.1 server'));
    console.log(chalk.yellow('    octorecon https://target.com all --deep'));
    console.log();
}

// ── Main ──
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h') || args.includes('--h')) {
        showHelp();
        return;
    }

    const target = args[0];
    const parameter = args[1] || 'global';
    const intensity = args.find(a => a.startsWith('--')) || '--normal';
    const validParams = ['global', 'root', 'server', 'client', 'both', 'all', '.'];

    if (!validParams.includes(parameter)) {
        console.log(chalk.red(`\\n  ❌ Invalid parameter: "${parameter}"`));
        console.log(chalk.gray(`     Valid: ${validParams.join(', ')}`));
        return;
    }

    showBanner();

    console.log(chalk.hex('#00BFFF')(`\\n  🎯 Target:    ${chalk.white.bold(target)}`));
    console.log(chalk.hex('#00BFFF')(`  📋 Parameter: ${chalk.white.bold(parameter)}`));
    console.log(chalk.hex('#00BFFF')(`  ⚡ Intensity: ${chalk.white.bold(intensity.replace('--', ''))}`));
    console.log(chalk.gray('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log();

    const startTime = Date.now();

    try {
        const results = await runRecon(target, parameter, intensity);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        printResults(results);

        console.log(chalk.gray('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.green.bold(`  ✅ Recon Complete — ${elapsed}s elapsed`));
        console.log();
    } catch (e) {
        console.error(chalk.red(`\\n  ❌ Recon failed: ${e.message}`));
    }
}

main();
