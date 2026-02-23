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

// ═══════════════════════════════════════════════════
// FULL EXHAUSTIVE RESULT PRINTER
// Terminal ALWAYS shows EVERYTHING.
// Output flags (--json/--txt/--zip) are just for export/save.
// ═══════════════════════════════════════════════════
function printResults(results) {
    const SEP = DIM('  ────────────────────────────────────────────────────────────────');

    console.log(PINK.bold('\n  ╔═══════════════════════════════════════════════════════════════╗'));
    console.log(PINK.bold('  ║        🕷️  OCTOSCRAPE — FULL EXTRACTION REPORT               ║'));
    console.log(PINK.bold('  ╚═══════════════════════════════════════════════════════════════╝'));
    console.log(DIM(`  Target:    ${results.target}`));
    console.log(DIM(`  Time:      ${results.timestamp}`));
    console.log();

    // ── WAF ──
    console.log(SEP);
    console.log(GOLD.bold('  🛡️  WAF / CDN DETECTION'));
    console.log(SEP);
    if (results.waf && results.waf.length > 0) {
        results.waf.forEach(w => console.log(chalk.red(`  ⚠  ${w} — DETECTED`)));
    } else {
        console.log(NEON('  ✓  No WAF/CDN detected — Target appears unprotected'));
    }
    console.log();

    const m = results.modules;

    // ── SOURCE CODE ──
    if (m.source && !m.source.error) {
        console.log(SEP);
        console.log(CYAN.bold('  📄 SOURCE CODE ANALYSIS'));
        console.log(SEP);
        console.log(chalk.white(`  HTML Document Size:    ${(m.source.htmlSize / 1024).toFixed(1)} KB (${m.source.htmlSize.toLocaleString()} bytes)`));
        console.log(chalk.white(`  Inline Scripts:        ${m.source.inlineScripts}`));
        console.log(chalk.white(`  Inline Styles:         ${m.source.inlineStyles}`));
        console.log(chalk.white(`  HTML Comments:         ${m.source.comments.length}`));
        if (m.source.comments.length > 0) {
            console.log(GOLD('\n  📝 HTML Comments (potential info leak):'));
            m.source.comments.forEach((c, i) => {
                console.log(chalk.yellow(`  [${i + 1}] ${c.substring(0, 200)}`));
            });
        }
        if (m.source.scripts && m.source.scripts.length > 0) {
            console.log(GOLD(`\n  📜 Inline Script Snippets (${m.source.scripts.length}):`));
            m.source.scripts.forEach((s, i) => {
                console.log(DIM(`  ── Script ${i + 1} ──`));
                console.log(chalk.white(`  ${s.substring(0, 300).replace(/\n/g, '\n  ')}`));
                if (s.length > 300) console.log(DIM(`  ... (${s.length} chars total)`));
            });
        }
        if (m.source.styles && m.source.styles.length > 0) {
            console.log(GOLD(`\n  🎨 Inline Style Snippets (${m.source.styles.length}):`));
            m.source.styles.forEach((s, i) => {
                console.log(DIM(`  ── Style ${i + 1} ──`));
                console.log(chalk.white(`  ${s.substring(0, 200).replace(/\n/g, '\n  ')}`));
            });
        }
        console.log();
    }

    // ── ASSETS ──
    if (m.assets) {
        console.log(SEP);
        console.log(CYAN.bold('  🖼️  PAGE ASSETS TREE'));
        console.log(SEP);

        const total = m.assets.js.length + m.assets.css.length + m.assets.images.length + m.assets.fonts.length + m.assets.media.length + m.assets.iframes.length;
        console.log(chalk.white(`  Total Assets: ${total}\n`));

        if (m.assets.js.length > 0) {
            console.log(GOLD(`  📦 JavaScript Files (${m.assets.js.length}):`));
            m.assets.js.forEach((j, i) => {
                const isLast = i === m.assets.js.length - 1;
                console.log(DIM(`  ${isLast ? '└──' : '├──'} `) + chalk.white(j));
            });
            console.log();
        }

        if (m.assets.css.length > 0) {
            console.log(GOLD(`  🎨 CSS Stylesheets (${m.assets.css.length}):`));
            m.assets.css.forEach((c, i) => {
                const isLast = i === m.assets.css.length - 1;
                console.log(DIM(`  ${isLast ? '└──' : '├──'} `) + chalk.white(c));
            });
            console.log();
        }

        if (m.assets.images.length > 0) {
            console.log(GOLD(`  🖼️  Images (${m.assets.images.length}):`));
            m.assets.images.forEach((img, i) => {
                const isLast = i === m.assets.images.length - 1;
                console.log(DIM(`  ${isLast ? '└──' : '├──'} `) + chalk.white(img));
            });
            console.log();
        }

        if (m.assets.fonts.length > 0) {
            console.log(GOLD(`  🔤 Fonts (${m.assets.fonts.length}):`));
            m.assets.fonts.forEach(f => console.log(DIM('  └── ') + chalk.white(f)));
            console.log();
        }

        if (m.assets.media.length > 0) {
            console.log(GOLD(`  🎬 Media (${m.assets.media.length}):`));
            m.assets.media.forEach(v => console.log(DIM('  └── ') + chalk.white(v)));
            console.log();
        }

        if (m.assets.iframes.length > 0) {
            console.log(GOLD(`  📺 Iframes (${m.assets.iframes.length}):`));
            m.assets.iframes.forEach(f => console.log(DIM('  └── ') + chalk.white(f)));
            console.log();
        }
    }

    // ── COOKIES ──
    if (m.cookies) {
        console.log(SEP);
        console.log(CYAN.bold('  🍪 COOKIES'));
        console.log(SEP);
        if (m.cookies.length === 0) {
            console.log(DIM('  No cookies set by target.'));
        } else {
            console.log(chalk.white(`  Total Cookies: ${m.cookies.length}\n`));
            m.cookies.forEach((c, i) => {
                console.log(GOLD(`  [Cookie ${i + 1}] ${c.name}`));
                console.log(chalk.white(`     Value:      ${c.value.substring(0, 120)}${c.value.length > 120 ? '...' : ''}`));
                console.log(chalk.white(`     HttpOnly:   ${c.flags.httpOnly ? chalk.red('Yes ⚠') : chalk.green('No')}`));
                console.log(chalk.white(`     Secure:     ${c.flags.secure ? chalk.green('Yes ✓') : chalk.red('No ⚠')}`));
                console.log(chalk.white(`     SameSite:   ${c.flags.sameSite || chalk.red('Not set ⚠')}`));
                if (c.flags.domain) console.log(chalk.white(`     Domain:     ${c.flags.domain}`));
                if (c.flags.path) console.log(chalk.white(`     Path:       ${c.flags.path}`));
                if (c.flags.expires) console.log(chalk.white(`     Expires:    ${c.flags.expires}`));
                if (c.flags.maxAge) console.log(chalk.white(`     Max-Age:    ${c.flags.maxAge}s`));
            });
        }
        console.log();
    }

    // ── SECURITY STACK ──
    if (m.security) {
        console.log(SEP);
        console.log(CYAN.bold('  🔒 SECURITY STACK'));
        console.log(SEP);

        if (m.security.statusCode) console.log(chalk.white(`  HTTP Status:     ${m.security.statusCode}`));
        console.log(chalk.white(`  Server:          ${m.security.server || 'Hidden'}`));
        console.log(chalk.white(`  X-Powered-By:    ${m.security.poweredBy || 'Hidden'}`));

        if (m.security.securityHeaders) {
            console.log(GOLD('\n  📋 Security Headers Audit:'));
            for (const [header, value] of Object.entries(m.security.securityHeaders)) {
                const isPresent = typeof value === 'string' && !value.startsWith('❌');
                const icon = isPresent ? chalk.green('✓') : chalk.red('✗');
                console.log(`     ${icon} ${chalk.white(header.padEnd(32))} ${isPresent ? NEON(value) : chalk.red(value)}`);
            }
        }

        if (m.security.cors) {
            console.log(GOLD('\n  🌐 CORS Policy:'));
            for (const [key, val] of Object.entries(m.security.cors)) {
                const isSet = val !== 'Not set';
                console.log(`     ${isSet ? chalk.green('✓') : chalk.red('✗')} ${chalk.white(key.padEnd(40))} ${isSet ? NEON(val) : chalk.red(val)}`);
            }
        }

        if (m.security.csp) {
            console.log(GOLD('\n  🛡️  Content-Security-Policy:'));
            const directives = m.security.csp.split(';').map(d => d.trim()).filter(Boolean);
            directives.forEach(d => {
                const [directive, ...values] = d.split(/\s+/);
                console.log(`     ${chalk.cyan(directive.padEnd(25))} ${chalk.white(values.join(' '))}`);
            });
        }

        if (m.security.allHeaders) {
            console.log(GOLD('\n  📡 All Response Headers:'));
            for (const [key, val] of Object.entries(m.security.allHeaders)) {
                const v = Array.isArray(val) ? val.join('; ') : String(val);
                console.log(`     ${DIM(key.padEnd(35))} ${chalk.white(v.substring(0, 120))}`);
            }
        }
        console.log();
    }

    // ── TECH STACK ──
    if (m.tech && m.tech.length > 0) {
        console.log(SEP);
        console.log(CYAN.bold('  ⚙️  TECHNOLOGY STACK'));
        console.log(SEP);
        console.log(chalk.white(`  Detected Technologies: ${m.tech.length}\n`));

        // Group by category
        const categories = {};
        m.tech.forEach(t => {
            const cat = t.name || 'Other';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(t.value);
        });

        const catKeys = Object.keys(categories);
        catKeys.forEach((cat, ci) => {
            const isLast = ci === catKeys.length - 1;
            const prefix = isLast ? '└──' : '├──';
            console.log(DIM(`  ${prefix} `) + GOLD(cat));
            categories[cat].forEach((val, vi) => {
                const childPrefix = isLast ? '    ' : '│   ';
                const childBranch = vi === categories[cat].length - 1 ? '└──' : '├──';
                console.log(DIM(`  ${childPrefix}${childBranch} `) + chalk.white(val));
            });
        });
        console.log();
    }

    // ── CONFIG / SENSITIVE FILES ──
    if (m.configs) {
        console.log(SEP);
        console.log(chalk.red.bold('  📂 SENSITIVE FILES & CONFIG PROBING'));
        console.log(SEP);

        if (m.configs.length === 0) {
            console.log(NEON('  ✓  No sensitive files found (all probed paths returned 403/404)'));
        } else {
            console.log(chalk.red.bold(`  ⚠  ${m.configs.length} SENSITIVE FILE(S) ACCESSIBLE!\n`));
            m.configs.forEach((c, i) => {
                const isLast = i === m.configs.length - 1;
                console.log(chalk.red(`  ${isLast ? '└' : '├'}── 🔓 ${c.path}`));
                console.log(chalk.white(`  ${isLast ? ' ' : '│'}      Status: ${c.statusCode} | Size: ${(c.size / 1024).toFixed(1)} KB | URL: ${c.url}`));
                if (c.body) {
                    const preview = c.body.substring(0, 300).replace(/\n/g, '\n  ' + (isLast ? ' ' : '│') + '      ');
                    console.log(DIM(`  ${isLast ? ' ' : '│'}      ── Content Preview ──`));
                    console.log(DIM(`  ${isLast ? ' ' : '│'}      ${preview}`));
                    if (c.body.length > 300) console.log(DIM(`  ${isLast ? ' ' : '│'}      ... (${(c.size / 1024).toFixed(1)} KB total)`));
                }
            });
        }
        console.log();
    }

    // ── FORMS ──
    if (m.forms) {
        console.log(SEP);
        console.log(CYAN.bold('  📝 FORMS & INPUT FIELDS'));
        console.log(SEP);

        if (m.forms.length === 0) {
            console.log(DIM('  No forms found on page.'));
        } else {
            console.log(chalk.white(`  Total Forms: ${m.forms.length}\n`));
            m.forms.forEach((f, i) => {
                console.log(GOLD(`  ┌── Form ${i + 1}`));
                console.log(chalk.white(`  │   Action:    ${f.action || '(self/current page)'}`));
                console.log(chalk.white(`  │   Method:    ${f.method}`));
                if (f.enctype) console.log(chalk.white(`  │   Enctype:   ${f.enctype}`));
                console.log(chalk.white(`  │   Inputs:    ${f.inputs.length}`));

                if (f.inputs.length > 0) {
                    console.log(DIM('  │'));
                    f.inputs.forEach((inp, j) => {
                        const isLast = j === f.inputs.length - 1;
                        const branch = isLast ? '└──' : '├──';
                        const isHidden = inp.type === 'hidden';
                        const isPassword = inp.type === 'password';

                        let line = `  │   ${branch} `;
                        if (isHidden) line += chalk.red(`🔑 HIDDEN  `);
                        else if (isPassword) line += chalk.yellow(`🔐 PASSWD  `);
                        else line += DIM(`[${inp.type.padEnd(8)}] `);

                        line += chalk.white(`name="${inp.name || ''}" `);
                        if (inp.id) line += DIM(`id="${inp.id}" `);
                        if (inp.value) line += chalk.yellow(`value="${inp.value}" `);
                        if (inp.placeholder) line += DIM(`placeholder="${inp.placeholder}"`);

                        console.log(line);
                    });
                }
                console.log(DIM('  └──'));
                console.log();
            });
        }
    }

    // ── LINKS ──
    if (m.links) {
        console.log(SEP);
        console.log(CYAN.bold('  🔗 LINK MAP & SITEMAP'));
        console.log(SEP);

        console.log(chalk.white(`  Internal Links:  ${m.links.totalInternal}`));
        console.log(chalk.white(`  External Links:  ${m.links.totalExternal}`));
        console.log(chalk.white(`  Anchor Tags:     ${m.links.anchors ? m.links.anchors.length : 0}`));
        console.log(chalk.white(`  Email Addresses: ${m.links.emails.length}`));

        if (m.links.internal && m.links.internal.length > 0) {
            console.log(GOLD(`\n  🏠 Internal Links (${m.links.internal.length}):`));
            m.links.internal.forEach((l, i) => {
                const isLast = i === m.links.internal.length - 1;
                console.log(DIM(`  ${isLast ? '└──' : '├──'} `) + chalk.white(l));
            });
        }

        if (m.links.external && m.links.external.length > 0) {
            console.log(GOLD(`\n  🌍 External Links (${m.links.external.length}):`));
            m.links.external.forEach((l, i) => {
                const isLast = i === m.links.external.length - 1;
                console.log(DIM(`  ${isLast ? '└──' : '├──'} `) + chalk.white(l));
            });
        }

        if (m.links.anchors && m.links.anchors.length > 0) {
            console.log(GOLD(`\n  ⚓ Anchor Fragments (${m.links.anchors.length}):`));
            m.links.anchors.forEach(a => console.log(DIM('  └── ') + chalk.white(a)));
        }

        if (m.links.emails && m.links.emails.length > 0) {
            console.log(GOLD(`\n  📧 Email Addresses (${m.links.emails.length}):`));
            m.links.emails.forEach(e => console.log(chalk.yellow(`  └── ${e}`)));
        }
        console.log();
    }

    // ── METADATA & SEO ──
    if (m.meta) {
        console.log(SEP);
        console.log(CYAN.bold('  🏷️  METADATA & SEO'));
        console.log(SEP);

        console.log(chalk.white(`  Title:         ${m.meta.title || chalk.red('MISSING ⚠')}`));
        console.log(chalk.white(`  Description:   ${m.meta.description || chalk.red('MISSING ⚠')}`));
        console.log(chalk.white(`  Keywords:      ${m.meta.keywords || DIM('Not set')}`));
        console.log(chalk.white(`  Author:        ${m.meta.author || DIM('Not set')}`));
        console.log(chalk.white(`  Robots:        ${m.meta.robots || DIM('Not set')}`));
        console.log(chalk.white(`  Canonical:     ${m.meta.canonical || DIM('Not set')}`));
        console.log(chalk.white(`  Favicon:       ${m.meta.favicon || DIM('Not found')}`));
        console.log(chalk.white(`  Charset:       ${m.meta.charset || DIM('Not specified')}`));
        console.log(chalk.white(`  Viewport:      ${m.meta.viewport || DIM('Not set')}`));

        if (m.meta.og && Object.keys(m.meta.og).length > 0) {
            console.log(GOLD('\n  📘 Open Graph Tags:'));
            for (const [key, val] of Object.entries(m.meta.og)) {
                console.log(`     ${DIM(key.padEnd(25))} ${chalk.white(val)}`);
            }
        }

        if (m.meta.twitter && Object.keys(m.meta.twitter).length > 0) {
            console.log(GOLD('\n  🐦 Twitter Card Tags:'));
            for (const [key, val] of Object.entries(m.meta.twitter)) {
                console.log(`     ${DIM(key.padEnd(25))} ${chalk.white(val)}`);
            }
        }

        if (m.meta.structuredData && m.meta.structuredData.length > 0) {
            console.log(GOLD(`\n  📊 JSON-LD Structured Data (${m.meta.structuredData.length} schema(s)):`));
            m.meta.structuredData.forEach((sd, i) => {
                console.log(DIM(`\n  ── Schema ${i + 1} ──`));
                const pretty = JSON.stringify(sd, null, 2).split('\n');
                pretty.forEach(line => console.log(chalk.white(`  ${line}`)));
            });
        }
        console.log();
    }

    // ── SUMMARY TREE ──
    console.log(SEP);
    console.log(PINK.bold('  📊 EXTRACTION SUMMARY'));
    console.log(SEP);
    const moduleNames = Object.keys(m);
    moduleNames.forEach((mod, i) => {
        const isLast = i === moduleNames.length - 1;
        let count = '✓';
        if (Array.isArray(m[mod])) count = `${m[mod].length} items`;
        else if (m[mod] && typeof m[mod] === 'object' && m[mod].error) count = chalk.red('Error');
        console.log(DIM(`  ${isLast ? '└──' : '├──'} `) + NEON(mod.padEnd(15)) + chalk.white(count));
    });
    console.log();
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
