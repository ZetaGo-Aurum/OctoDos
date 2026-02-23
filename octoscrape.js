#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║               OctoScrape v1.0.0                               ║
 * ║  Deep Web Data Extraction — Source · Cookies · Configs · SEO  ║
 * ║                                                               ║
 * ║  Created by ZetaGo-Aurum | MIT License                       ║
 * ║  Part of the OctoDos Suite v2.0.0                             ║
 * ║  ⚠ DATA EXTRACTION TOOL — AUTHORIZATION REQUIRED             ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
process.removeAllListeners('warning');

const chalk = require('chalk');
const figlet = require('figlet');
const gradient = require('gradient-string');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { runScrape } = require('./lib/scrape-engine');

// ── Color Palette ──
const PINK = chalk.hex('#FF6B9D');
const NEON = chalk.hex('#00FF88');
const GOLD = chalk.hex('#FFD700');
const CYAN = chalk.hex('#00D4FF');
const DIM = chalk.gray;

// ── Banner ──
function showBanner() {
    const banner = figlet.textSync('OCTOSCRAPE', { font: 'ANSI Shadow', horizontalLayout: 'default' });
    console.log(gradient.passion(banner));
    console.log(DIM('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(PINK.bold('  🕷️  OctoScrape v1.0.0 — Deep Web Data Extraction Engine'));
    console.log(DIM('  Created by ZetaGo-Aurum | 9 Modules | OctoRecon Integration'));
    console.log(DIM('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    console.log(PINK('\n  🔬 Extraction Modules:'));
    console.log(DIM('    ├── 📄 Source Code      — Full HTML, inline JS/CSS, comments'));
    console.log(DIM('    ├── 🖼️  Page Assets      — JS, CSS, images, fonts, media, iframes'));
    console.log(DIM('    ├── 🍪 Cookies          — All cookies with HttpOnly/Secure/SameSite'));
    console.log(DIM('    ├── 🔒 Security Stack   — Headers audit, CORS, CSP analysis'));
    console.log(DIM('    ├── ⚙️  Tech Stack       — Server, CMS, frameworks, libraries'));
    console.log(DIM('    ├── 📂 Config Files     — .env, .git, robots.txt, wp-config, 50+ paths'));
    console.log(DIM('    ├── 📝 Forms & Inputs   — Form actions, methods, hidden fields'));
    console.log(DIM('    ├── 🔗 Links & Sitemap  — Internal/external links, emails, anchors'));
    console.log(DIM('    └── 🏷️  Metadata & SEO   — Title, OG, Twitter, JSON-LD, canonical'));

    console.log(chalk.red.bold('\n  ⚠ WARNING: Data extraction without authorization is ILLEGAL.'));
    console.log(chalk.red('  You MUST have explicit written permission from the target owner.\n'));
}

// ── Output Formatters ──
function saveJSON(results, url) {
    const hostname = new URL(url).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `octoscrape_${hostname}_${Date.now()}.json`;
    const outPath = path.join(process.cwd(), 'results', filename);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
    return outPath;
}

function saveTXT(results, url) {
    const hostname = new URL(url).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `octoscrape_${hostname}_${Date.now()}.txt`;
    const outPath = path.join(process.cwd(), 'results', filename);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    let txt = `OctoScrape Report — ${url}\nTimestamp: ${results.timestamp}\nWAF: ${(results.waf || []).join(', ') || 'None'}\n\n`;

    for (const [mod, data] of Object.entries(results.modules || {})) {
        txt += `═══ ${mod.toUpperCase()} ═══\n`;
        txt += JSON.stringify(data, null, 2).substring(0, 10000) + '\n\n';
    }

    fs.writeFileSync(outPath, txt, 'utf8');
    return outPath;
}

async function saveZIP(results, url) {
    // Save as JSON first, then create a simple archive structure
    const hostname = new URL(url).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const dirName = `octoscrape_${hostname}_${Date.now()}`;
    const outDir = path.join(process.cwd(), 'results', dirName);
    fs.mkdirSync(outDir, { recursive: true });

    // Save each module as separate file
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(results, null, 2));

    if (results.modules.source && results.modules.source.html) {
        fs.writeFileSync(path.join(outDir, 'source.html'), results.modules.source.html);
    }
    if (results.modules.configs) {
        fs.writeFileSync(path.join(outDir, 'configs.json'), JSON.stringify(results.modules.configs, null, 2));
    }
    if (results.modules.cookies) {
        fs.writeFileSync(path.join(outDir, 'cookies.json'), JSON.stringify(results.modules.cookies, null, 2));
    }
    if (results.modules.security) {
        fs.writeFileSync(path.join(outDir, 'security.json'), JSON.stringify(results.modules.security, null, 2));
    }
    if (results.modules.links) {
        fs.writeFileSync(path.join(outDir, 'links.json'), JSON.stringify(results.modules.links, null, 2));
    }
    if (results.modules.meta) {
        fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(results.modules.meta, null, 2));
    }
    if (results.modules.forms) {
        fs.writeFileSync(path.join(outDir, 'forms.json'), JSON.stringify(results.modules.forms, null, 2));
    }
    if (results.modules.assets) {
        fs.writeFileSync(path.join(outDir, 'assets.json'), JSON.stringify(results.modules.assets, null, 2));
    }

    return outDir;
}

// ── Result Printer ──
function printResults(results) {
    console.log(PINK.bold('\n  ╔══════════════════════════════════════════════════╗'));
    console.log(PINK.bold('  ║   🕷️  OCTOSCRAPE EXTRACTION REPORT                ║'));
    console.log(PINK.bold('  ╚══════════════════════════════════════════════════╝\n'));

    // WAF
    if (results.waf && results.waf.length > 0) {
        console.log(GOLD(`  ⚠ WAF Detected: ${results.waf.join(', ')}`));
    } else {
        console.log(NEON('  ✓ No WAF Detected — Target is exposed'));
    }
    console.log();

    const m = results.modules;

    // Source
    if (m.source && !m.source.error) {
        console.log(CYAN.bold('  📄 Source Code:'));
        console.log(DIM(`     HTML Size:   ${(m.source.htmlSize / 1024).toFixed(1)} KB`));
        console.log(DIM(`     Scripts:     ${m.source.inlineScripts} inline`));
        console.log(DIM(`     Styles:      ${m.source.inlineStyles} inline`));
        console.log(DIM(`     Comments:    ${m.source.comments.length} found`));
        if (m.source.comments.length > 0) {
            m.source.comments.slice(0, 3).forEach(c => console.log(chalk.yellow(`     💬 ${c.substring(0, 80)}`)));
        }
        console.log();
    }

    // Assets
    if (m.assets) {
        console.log(CYAN.bold('  🖼️  Page Assets:'));
        console.log(DIM(`     JavaScript:  ${m.assets.js.length} files`));
        m.assets.js.slice(0, 3).forEach(j => console.log(DIM(`       → ${j.substring(0, 80)}`)));
        console.log(DIM(`     CSS:         ${m.assets.css.length} files`));
        console.log(DIM(`     Images:      ${m.assets.images.length} files`));
        console.log(DIM(`     Iframes:     ${m.assets.iframes.length}`));
        console.log();
    }

    // Cookies
    if (m.cookies && m.cookies.length > 0) {
        console.log(CYAN.bold(`  🍪 Cookies: ${m.cookies.length}`));
        m.cookies.forEach(c => {
            const flags = Object.entries(c.flags).filter(([, v]) => v).map(([k, v]) => typeof v === 'boolean' ? k : `${k}=${v}`).join(', ');
            console.log(DIM(`     ${c.name.padEnd(25)}`), chalk.white(flags || 'No flags'));
        });
        console.log();
    }

    // Security
    if (m.security && m.security.securityHeaders) {
        console.log(CYAN.bold('  🔒 Security Stack:'));
        for (const [header, value] of Object.entries(m.security.securityHeaders)) {
            const icon = typeof value === 'string' && value.startsWith('❌') ? chalk.red('✗') : chalk.green('✓');
            console.log(`     ${icon} ${DIM(header.padEnd(30))} ${chalk.white(typeof value === 'string' ? value.substring(0, 50) : value)}`);
        }
        console.log(DIM(`     Server:      ${m.security.server}`));
        console.log(DIM(`     Powered By:  ${m.security.poweredBy}`));
        console.log();
    }

    // Tech
    if (m.tech && m.tech.length > 0) {
        console.log(CYAN.bold('  ⚙️  Tech Stack:'));
        m.tech.forEach(t => console.log(DIM(`     [${t.name}]`), chalk.white(t.value)));
        console.log();
    }

    // Configs
    if (m.configs && m.configs.length > 0) {
        console.log(chalk.red.bold(`  📂 Sensitive Files Found: ${m.configs.length}`));
        m.configs.forEach(c => {
            console.log(chalk.red(`     🔓 ${c.path.padEnd(30)}`), DIM(`${c.statusCode} | ${(c.size / 1024).toFixed(1)}KB`));
        });
        console.log();
    }

    // Forms
    if (m.forms && m.forms.length > 0) {
        console.log(CYAN.bold(`  📝 Forms: ${m.forms.length}`));
        m.forms.forEach((f, i) => {
            console.log(DIM(`     Form ${i + 1}: ${f.method} → ${f.action || '(self)'} | ${f.inputs.length} inputs`));
            f.inputs.filter(inp => inp.type === 'hidden').forEach(inp => {
                console.log(chalk.yellow(`       🔑 HIDDEN: ${inp.name} = ${inp.value}`));
            });
        });
        console.log();
    }

    // Links
    if (m.links) {
        console.log(CYAN.bold('  🔗 Links:'));
        console.log(DIM(`     Internal:    ${m.links.totalInternal}`));
        console.log(DIM(`     External:    ${m.links.totalExternal}`));
        console.log(DIM(`     Emails:      ${m.links.emails.length}`));
        if (m.links.emails.length > 0) {
            m.links.emails.slice(0, 5).forEach(e => console.log(chalk.yellow(`     📧 ${e}`)));
        }
        console.log();
    }

    // Meta
    if (m.meta) {
        console.log(CYAN.bold('  🏷️  Metadata:'));
        if (m.meta.title) console.log(DIM('     Title:       '), chalk.white(m.meta.title));
        if (m.meta.description) console.log(DIM('     Desc:        '), chalk.white(m.meta.description.substring(0, 80)));
        if (m.meta.canonical) console.log(DIM('     Canonical:   '), chalk.white(m.meta.canonical));
        if (m.meta.author) console.log(DIM('     Author:      '), chalk.white(m.meta.author));
        if (m.meta.robots) console.log(DIM('     Robots:      '), chalk.white(m.meta.robots));
        if (m.meta.structuredData.length > 0) console.log(DIM(`     JSON-LD:     ${m.meta.structuredData.length} schemas`));
        console.log();
    }
}

// ── TOS Consent ──
async function tosConsent() {
    console.log(chalk.red.bold('\n  ╔══════════════════════════════════════════════════════════╗'));
    console.log(chalk.red.bold('  ║  ⚠ OctoScrape — STRICT AUTHORIZATION REQUIRED           ║'));
    console.log(chalk.red.bold('  ╚══════════════════════════════════════════════════════════╝'));
    console.log(chalk.red('\n  This tool performs EXPLICIT DATA EXTRACTION from web targets.'));
    console.log(chalk.red('  Unauthorized use constitutes DATA THEFT and is a CRIMINAL OFFENSE.'));
    console.log(chalk.red('  You MUST have written authorization from the target owner.\n'));

    const { consent } = await inquirer.prompt([{
        type: 'confirm',
        name: 'consent',
        message: chalk.yellow('I confirm I have EXPLICIT WRITTEN AUTHORIZATION to scrape this target:'),
        default: false,
    }]);

    if (!consent) {
        console.log(chalk.red('\n  ❌ Authorization not confirmed. Aborting.\n'));
        process.exit(0);
    }
}

// ── CLI Help ──
function showHelp() {
    showBanner();
    console.log(chalk.white('  📖 CLI USAGE:'));
    console.log(CYAN('    octoscrape <url> <parameter> [--json|--txt|--zip]\n'));

    console.log(chalk.white('  Parameters:'));
    console.log(DIM('    global     ') + chalk.white('Source, Assets, Cookies, Security, Tech, Links, Meta'));
    console.log(DIM('    root       ') + chalk.white('All modules including Config/Sensitive file probing'));
    console.log(DIM('    server     ') + chalk.white('Security, Tech, Configs, Cookies'));
    console.log(DIM('    client     ') + chalk.white('Source, Assets, Forms, Links, Meta'));
    console.log(DIM('    both/all   ') + chalk.white('Every extraction module'));
    console.log(DIM('    .          ') + chalk.white('Quick: Security, Meta, Cookies\n'));

    console.log(chalk.white('  Output Formats:'));
    console.log(DIM('    --json     ') + chalk.white('JSON file (default)'));
    console.log(DIM('    --txt      ') + chalk.white('Plain text report'));
    console.log(DIM('    --zip      ') + chalk.white('Directory with separate files per module\n'));

    console.log(chalk.white('  Examples:'));
    console.log(GOLD('    octoscrape https://example.com all --zip'));
    console.log(GOLD('    octoscrape https://target.com root --json'));
    console.log(GOLD('    octoscrape https://target.com server --txt'));
    console.log(GOLD('    octoscrape https://target.com .\n'));
}

// ═══════════════════════════════════════════════════
// INTERACTIVE MENU
// ═══════════════════════════════════════════════════
async function interactiveMenu() {
    showBanner();
    await tosConsent();

    const { target } = await inquirer.prompt([{
        type: 'input',
        name: 'target',
        message: PINK('Target URL (must include https://):'),
        validate: (v) => {
            if (!v.trim().startsWith('http')) return 'Target must be a full URL (https://...)';
            try { new URL(v.trim()); return true; } catch { return 'Invalid URL'; }
        },
    }]);

    const { parameter } = await inquirer.prompt([{
        type: 'list',
        name: 'parameter',
        message: PINK('Select Extraction Profile:'),
        choices: [
            new inquirer.Separator(DIM('──── 🔬 Extraction Profiles ────')),
            { name: '🌍 Global          — Source, Assets, Cookies, Security, Tech, Links, Meta', value: 'global' },
            { name: '🏴 Root            — ALL modules + config/sensitive file probing', value: 'root' },
            { name: '🖥️  Server          — Security, Tech, Configs, Cookies', value: 'server' },
            { name: '👤 Client          — Source, Assets, Forms, Links, Meta', value: 'client' },
            { name: '💀 All             — Every extraction module', value: 'all' },
            new inquirer.Separator(DIM('──── ⚡ Quick ────')),
            { name: '⚡ Quick (.)       — Security, Meta, Cookies', value: '.' },
        ],
    }]);

    const { output } = await inquirer.prompt([{
        type: 'list',
        name: 'output',
        message: PINK('Select Output Format:'),
        choices: [
            { name: '📋 JSON  — Structured data file (default)', value: '--json' },
            { name: '📝 TXT   — Plain text report', value: '--txt' },
            { name: '📦 ZIP   — Directory with separate module files', value: '--zip' },
        ],
    }]);

    await executeScrape(target.trim(), parameter, output);
}

// ═══════════════════════════════════════════════════
// SCRAPE EXECUTOR
// ═══════════════════════════════════════════════════
async function executeScrape(target, parameter, outputFlag) {
    console.log(DIM('\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(PINK(`  🎯 Target:    ${chalk.white.bold(target)}`));
    console.log(PINK(`  📋 Profile:   ${chalk.white.bold(parameter)}`));
    console.log(PINK(`  💾 Output:    ${chalk.white.bold(outputFlag.replace('--', '').toUpperCase())}`));
    console.log(DIM('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    const startTime = Date.now();

    try {
        const results = await runScrape(target, parameter, outputFlag);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        printResults(results);

        // Save output
        let outPath;
        if (outputFlag === '--txt') {
            outPath = saveTXT(results, target);
        } else if (outputFlag === '--zip') {
            outPath = await saveZIP(results, target);
        } else {
            outPath = saveJSON(results, target);
        }

        console.log(DIM('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(NEON.bold(`  ✅ Extraction Complete — ${elapsed}s elapsed`));
        console.log(NEON(`  💾 Saved to: ${outPath}\n`));
    } catch (e) {
        console.error(chalk.red(`\n  ❌ Scrape failed: ${e.message}`));
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
    if (!target.startsWith('http')) {
        console.log(chalk.red('\n  ❌ Target must be a full URL (https://example.com)\n'));
        return;
    }

    const validParams = ['global', 'root', 'server', 'client', 'both', 'all', '.'];
    const parameter = args[1] && validParams.includes(args[1]) ? args[1] : 'global';
    const output = args.find(a => ['--json', '--txt', '--zip'].includes(a)) || '--json';

    showBanner();
    await tosConsent();
    await executeScrape(target, parameter, output);
}

main();
