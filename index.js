#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║                    OctoDos v1.0.0                            ║
 * ║     Professional DDoS Resilience Auditor for Pentesters      ║
 * ║     20 Coordinated Tentacle Methods (10 L7 + 10 L4)         ║
 * ║                                                               ║
 * ║  Created by: ZetaGo-Aurum                                    ║
 * ║  License:    MIT (see LICENSE file)                           ║
 * ║  Terms:      See TERMS_OF_SERVICE.md                         ║
 * ║                                                               ║
 * ║  ⚠ AUTHORIZED PENETRATION TESTING ONLY                      ║
 * ║  Unauthorized use is a criminal offense.                     ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const { startL7 } = require('./lib/l7');
const { startL4 } = require('./lib/l4');
const { runRecon } = require('./lib/recon');
const { getRecommendations } = require('./lib/auditor');
const { fetchProxies, getProxyStats } = require('./lib/proxy');
const { AuditLogger } = require('./lib/logger');
const { saveResult, showResults } = require('./lib/results');
const { showBanner, showMethodTable, showEngines, showDisclaimer, showAuditSummary, showPhaseHeader, showComplete } = require('./lib/banner');
const { getMethodCount } = require('./lib/methods');

// ═══════════════════════════════════════════════════
// TARGET DETECTION
// ═══════════════════════════════════════════════════
function isUrl(str) {
    return /^https?:\/\//i.test(str) || /\.(com|net|org|io|dev|app|xyz|me|co|info|biz|gov|edu|mil|int|id|uk|us|au|jp|cn|ru|de|fr|in|br|kr|my|sg|th|ph|vn)\b/i.test(str);
}

function normalizeTarget(target) {
    if (isUrl(target) && !/^https?:\/\//i.test(target)) return `http://${target}`;
    return target;
}

// ═══════════════════════════════════════════════════
// INTERACTIVE MENU
// ═══════════════════════════════════════════════════
async function interactiveMenu() {
    showBanner();
    showEngines();

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: chalk.hex('#a855f7').bold('Select Operation:'),
            choices: [
                new inquirer.Separator(chalk.gray('──── 🐙 Audit Operations ────')),
                { name: `${chalk.hex('#FF6B6B')('⚡')} Full Audit (Recon + 20-Method Attack + Defense)`, value: 'full' },
                { name: `${chalk.hex('#FF8E53')('🔍')} Recon Only (Deep Reconnaissance Scan)`, value: 'recon' },
                { name: `${chalk.hex('#FFDD57')('🚀')} Quick Audit (Fast 10-second stress test)`, value: 'quick' },
                new inquirer.Separator(chalk.gray('──── 🛡️ Defense Operations ────')),
                { name: `${chalk.hex('#43E97B')('🛡️')}  Defense Report Only (Recommendations)`, value: 'defense' },
                new inquirer.Separator(chalk.gray('──── 📊 History & Info ────')),
                { name: `${chalk.hex('#38F9D7')('📂')} View Audit Results History`, value: 'results' },
                { name: `${chalk.hex('#38F9D7')('📋')} View All Methods (${getMethodCount()} methods)`, value: 'methods' },
                { name: `${chalk.hex('#00C9FF')('📜')} View License / Terms of Service`, value: 'license' },
                { name: `${chalk.hex('#6366f1')('👤')} Credits`, value: 'credits' },
                new inquirer.Separator(chalk.gray('────────────────────────────')),
                { name: `${chalk.red('✖')}  Exit`, value: 'exit' },
            ],
            pageSize: 16,
        },
    ]);

    switch (action) {
        case 'full': await startFullAudit(); break;
        case 'recon': await startReconOnly(); break;
        case 'quick': await startQuickAudit(); break;
        case 'defense': await startDefenseOnly(); break;
        case 'results': showResults(); await returnToMenu(); break;
        case 'methods': showMethodTable(); await returnToMenu(); break;
        case 'license': showLicenseInfo(); await returnToMenu(); break;
        case 'credits': showCredits(); await returnToMenu(); break;
        case 'exit':
            console.log(chalk.gray('  Goodbye. Stay ethical. — ZetaGo-Aurum\n'));
            process.exit(0);
    }
}

async function returnToMenu() {
    const { back } = await inquirer.prompt([
        { type: 'confirm', name: 'back', message: 'Return to main menu?', default: true },
    ]);
    if (back) await interactiveMenu();
    else process.exit(0);
}

// ═══════════════════════════════════════════════════
// TARGET INPUT PROMPTS
// ═══════════════════════════════════════════════════
async function getTargetConfig(skipAdvanced = false) {
    const questions = [
        {
            type: 'input', name: 'target',
            message: chalk.cyan('Enter target (URL or IP:PORT):'),
            validate: (v) => v.trim().length > 0 ? true : 'Target is required',
        },
        {
            type: 'number', name: 'threads',
            message: chalk.cyan('Number of threads:'),
            default: 50,
            validate: (v) => v > 0 && v <= 500 ? true : 'Threads must be 1-500',
        },
        {
            type: 'number', name: 'time',
            message: chalk.cyan('Duration (seconds):'),
            default: 30,
            validate: (v) => v > 0 && v <= 3600 ? true : 'Duration must be 1-3600',
        },
    ];

    if (!skipAdvanced) {
        questions.push(
            {
                type: 'confirm', name: 'useProxy',
                message: chalk.cyan('Enable proxy rotation?'), default: true,
            },
            {
                type: 'list', name: 'intensity',
                message: chalk.cyan('Audit intensity:'),
                choices: [
                    { name: `${chalk.green('●')} Low (Conservative, safe)`, value: 'low' },
                    { name: `${chalk.yellow('●')} Medium (Standard pentest)`, value: 'medium' },
                    { name: `${chalk.red('●')} High (Aggressive, max impact)`, value: 'high' },
                    { name: `${chalk.hex('#FF0000')('●')} Critical (Full power, all 20 vectors)`, value: 'critical' },
                ], default: 'medium',
            }
        );
    }

    const answers = await inquirer.prompt(questions);
    answers.target = normalizeTarget(answers.target.trim());
    answers.isL7 = isUrl(answers.target);
    if (skipAdvanced) { answers.useProxy = true; answers.intensity = 'medium'; }

    const multipliers = { low: 0.5, medium: 1, high: 2, critical: 3 };
    answers.effectiveThreads = Math.min(500, Math.max(1, Math.round(answers.threads * (multipliers[answers.intensity] || 1))));
    return answers;
}

// ═══════════════════════════════════════════════════
// TERMS ACCEPTANCE
// ═══════════════════════════════════════════════════
async function acceptTerms() {
    showDisclaimer();
    const { accept } = await inquirer.prompt([
        { type: 'confirm', name: 'accept', message: chalk.red.bold('Do you accept the Terms of Service?'), default: false },
    ]);
    if (!accept) { console.log(chalk.red('\n  ✖ Terms not accepted. Aborting.\n')); process.exit(1); }

    const { confirm } = await inquirer.prompt([
        { type: 'confirm', name: 'confirm', message: chalk.yellow.bold('FINAL CONFIRMATION: You have written authorization to test this target?'), default: false },
    ]);
    if (!confirm) { console.log(chalk.red('\n  ✖ Authorization not confirmed. Aborting.\n')); process.exit(1); }
    return true;
}

// ═══════════════════════════════════════════════════
// FULL AUDIT MODE
// ═══════════════════════════════════════════════════
async function startFullAudit() {
    const config = await getTargetConfig();
    await acceptTerms();
    showBanner();
    showAuditSummary(config);

    const logger = new AuditLogger(config.target);

    // Phase 0: Proxy
    if (config.useProxy) {
        showPhaseHeader(0, 'PROXY ACQUISITION', '🔄');
        const spinner = ora({ text: chalk.cyan('Fetching proxy pool from multiple sources...'), spinner: 'dots12' }).start();
        await fetchProxies();
        const ps = getProxyStats();
        spinner.succeed(chalk.green(`Loaded ${ps.total} proxies (HTTP: ${ps.http} | SOCKS4: ${ps.socks4} | SOCKS5: ${ps.socks5})`));
        logger.logProxy(ps.http, ps.socks4, ps.socks5, ps.total);
    }

    // Phase 1: Recon
    showPhaseHeader(1, 'DEEP RECONNAISSANCE', '🔍');
    const reconData = await runRecon(config.target);
    logger.logRecon(reconData);

    // Phase 2: Audit
    showPhaseHeader(2, config.isL7 ? 'L7 OCTOPUS TENTACLE AUDIT — 10 METHODS' : 'L4 OCTOPUS TENTACLE AUDIT — 10 METHODS', '🐙');
    let auditStats;
    if (config.isL7) auditStats = await startL7(config.target, config.effectiveThreads, config.time);
    else auditStats = await startL4(config.target, config.effectiveThreads, config.time);
    logger.logAudit(auditStats, config.isL7);

    // Phase 3: Defense
    showPhaseHeader(3, 'DEFENSIVE ANALYSIS', '🛡️');
    const threatLevel = getRecommendations(config.target, reconData, auditStats, config.isL7);

    // Save result
    const saved = saveResult({
        target: config.target, mode: config.isL7 ? 'L7' : 'L4',
        duration: config.time, threads: config.effectiveThreads, intensity: config.intensity,
        proxyCount: config.useProxy ? getProxyStats().total : 0,
        recon: reconData, audit: auditStats, threatLevel: threatLevel || 0,
        methodsUsed: auditStats.methodsUsed || [],
        summary: `Full ${config.isL7 ? 'L7' : 'L4'} audit with ${config.effectiveThreads} threads for ${config.time}s`,
    });
    if (saved) console.log(chalk.gray(`  📂 Result saved: ${saved.filename} (ID: ${saved.id})`));

    logger.finalize({ recon: reconData, audit: auditStats });
    showComplete();
    await returnToMenu();
}

// ═══════════════════════════════════════════════════
// RECON ONLY
// ═══════════════════════════════════════════════════
async function startReconOnly() {
    const { target } = await inquirer.prompt([
        { type: 'input', name: 'target', message: chalk.cyan('Enter target (URL or domain):'), validate: (v) => v.trim().length > 0 ? true : 'Required' },
    ]);
    showBanner();
    const nt = normalizeTarget(target.trim());
    console.log(chalk.cyan(`  🎯 Recon Target: ${nt}\n`));
    const logger = new AuditLogger(nt);
    showPhaseHeader(1, 'DEEP RECONNAISSANCE', '🔍');
    const reconData = await runRecon(nt);
    logger.logRecon(reconData);

    const saved = saveResult({ target: nt, mode: 'RECON', recon: reconData, summary: 'Reconnaissance scan only' });
    if (saved) console.log(chalk.gray(`  📂 Result saved: ${saved.filename}`));

    logger.finalize({ recon: reconData });
    showComplete();
    await returnToMenu();
}

// ═══════════════════════════════════════════════════
// QUICK AUDIT (10s)
// ═══════════════════════════════════════════════════
async function startQuickAudit() {
    const { target } = await inquirer.prompt([
        { type: 'input', name: 'target', message: chalk.cyan('Enter target (URL or IP:PORT):'), validate: (v) => v.trim().length > 0 ? true : 'Required' },
    ]);
    await acceptTerms();
    showBanner();
    const nt = normalizeTarget(target.trim());
    const isL7 = isUrl(nt);
    const config = { target: nt, threads: 20, effectiveThreads: 20, time: 10, isL7, useProxy: false, intensity: 'low' };
    showAuditSummary(config);
    const logger = new AuditLogger(nt);

    showPhaseHeader(1, 'QUICK RECON', '🔍');
    const reconData = await runRecon(nt);

    showPhaseHeader(2, 'QUICK STRESS TEST (10s)', '⚡');
    let auditStats = isL7 ? await startL7(nt, 20, 10) : await startL4(nt, 20, 10);

    showPhaseHeader(3, 'QUICK DEFENSE REPORT', '🛡️');
    const threatLevel = getRecommendations(nt, reconData, auditStats, isL7);

    const saved = saveResult({ target: nt, mode: isL7 ? 'L7' : 'L4', duration: 10, threads: 20, intensity: 'low', recon: reconData, audit: auditStats, threatLevel: threatLevel || 0, methodsUsed: auditStats.methodsUsed || [], summary: 'Quick 10-second audit' });
    if (saved) console.log(chalk.gray(`  📂 Result saved: ${saved.filename}`));

    logger.logAudit(auditStats, isL7);
    logger.finalize({ recon: reconData, audit: auditStats });
    showComplete();
    await returnToMenu();
}

// ═══════════════════════════════════════════════════
// DEFENSE ONLY
// ═══════════════════════════════════════════════════
async function startDefenseOnly() {
    const { target } = await inquirer.prompt([
        { type: 'input', name: 'target', message: chalk.cyan('Enter target (URL or domain):'), validate: (v) => v.trim().length > 0 ? true : 'Required' },
    ]);
    showBanner();
    const nt = normalizeTarget(target.trim());
    showPhaseHeader(1, 'DEEP RECONNAISSANCE', '🔍');
    const reconData = await runRecon(nt);
    showPhaseHeader(2, 'DEFENSIVE ANALYSIS (NO ATTACK)', '🛡️');
    const fakeStats = { totalRequests: 0, successfulRequests: 0, failedRequests: 0, statusCodes: {}, rps: 0, elapsed: 0 };
    getRecommendations(nt, reconData, fakeStats, isUrl(nt));

    const saved = saveResult({ target: nt, mode: 'DEFENSE', recon: reconData, summary: 'Defense report only (no attack)' });
    if (saved) console.log(chalk.gray(`  📂 Result saved: ${saved.filename}`));

    showComplete();
    await returnToMenu();
}

// ═══════════════════════════════════════════════════
// INFO
// ═══════════════════════════════════════════════════
function showLicenseInfo() {
    console.log(chalk.hex('#a855f7').bold('\n  ── License & Terms ──\n'));
    console.log(chalk.white('  License:   MIT (see LICENSE file)'));
    console.log(chalk.white('  Terms:     See TERMS_OF_SERVICE.md'));
    console.log(chalk.white('  Author:    ZetaGo-Aurum'));
    console.log(chalk.yellow('\n  ⚠ AUTHORIZED TESTING ONLY. View TERMS_OF_SERVICE.md for full legal references.\n'));
}

function showCredits() {
    console.log(chalk.hex('#a855f7').bold('\n  ── Credits ──\n'));
    console.log(chalk.white('  Creator:       ZetaGo-Aurum'));
    console.log(chalk.white('  Project:       OctoDos v1.0.0'));
    console.log(chalk.white('  Architecture:  Octopus Tentacle Multi-Vector'));
    console.log(chalk.white('  Methods:       20 (10 L7 + 10 L4)'));
    console.log(chalk.white('  Proxy Engine:  14 sources, HTTP/SOCKS4/SOCKS5'));
    console.log(chalk.white('  Anti-WAF:      30+ User-Agents, Cookie Sim, CF Bypass'));
    console.log(chalk.white('  Recon:         99 subdomains, 11 WAFs, CT lookup'));
    console.log(chalk.gray('\n  "With great power comes great responsibility." — ZetaGo-Aurum\n'));
}

// ═══════════════════════════════════════════════════
// CLI MODE: octodos <url/ip> <threads> <time>
// ═══════════════════════════════════════════════════
async function cliMode(target, threads, time) {
    const nt = normalizeTarget(target);
    const isL7 = isUrl(nt);
    const t = parseInt(threads) || 50;
    const d = parseInt(time) || 30;

    showBanner();
    const config = { target: nt, threads: t, effectiveThreads: t, time: d, isL7, useProxy: true, intensity: 'medium' };
    await acceptTerms();
    showAuditSummary(config);

    const logger = new AuditLogger(nt);

    showPhaseHeader(0, 'PROXY ACQUISITION', '🔄');
    const spinner = ora({ text: chalk.cyan('Fetching proxy pool...'), spinner: 'dots12' }).start();
    await fetchProxies();
    const ps = getProxyStats();
    spinner.succeed(chalk.green(`Loaded ${ps.total} proxies`));
    logger.logProxy(ps.http, ps.socks4, ps.socks5, ps.total);

    showPhaseHeader(1, 'DEEP RECONNAISSANCE', '🔍');
    const reconData = await runRecon(nt);
    logger.logRecon(reconData);

    showPhaseHeader(2, isL7 ? 'L7 OCTOPUS TENTACLE AUDIT' : 'L4 OCTOPUS TENTACLE AUDIT', '🐙');
    let auditStats = isL7 ? await startL7(nt, t, d) : await startL4(nt, t, d);
    logger.logAudit(auditStats, isL7);

    showPhaseHeader(3, 'DEFENSIVE ANALYSIS', '🛡️');
    const threatLevel = getRecommendations(nt, reconData, auditStats, isL7);

    const saved = saveResult({ target: nt, mode: isL7 ? 'L7' : 'L4', duration: d, threads: t, recon: reconData, audit: auditStats, threatLevel: threatLevel || 0, methodsUsed: auditStats.methodsUsed || [], summary: `CLI ${isL7 ? 'L7' : 'L4'} audit` });
    if (saved) console.log(chalk.gray(`  📂 Result saved: ${saved.filename}`));

    logger.finalize({ recon: reconData, audit: auditStats });
    showComplete();
}

// ═══════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════
async function main() {
    const args = process.argv.slice(2);

    if (args.length >= 3) {
        await cliMode(args[0], args[1], args[2]);
    } else if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
        showBanner();
        console.log(chalk.white('  Usage:'));
        console.log(chalk.cyan('    octodos                          ') + chalk.gray('Interactive menu'));
        console.log(chalk.cyan('    octodos <url/ip> <threads> <time> ') + chalk.gray('Direct CLI mode'));
        console.log(chalk.cyan('    octodos --results                ') + chalk.gray('View audit history'));
        console.log('');
        console.log(chalk.white('  Examples:'));
        console.log(chalk.gray('    octodos https://example.com 50 30'));
        console.log(chalk.gray('    octodos 192.168.1.1:80 100 60'));
        console.log('');
        console.log(chalk.white('  Options:'));
        console.log(chalk.gray('    --help, -h       Show this help'));
        console.log(chalk.gray('    --version, -v    Show version'));
        console.log(chalk.gray('    --results        Show audit history'));
        console.log(chalk.gray('    --methods        Show all 20 methods'));
        console.log('');
    } else if (args.length === 1 && (args[0] === '--version' || args[0] === '-v')) {
        console.log('OctoDos v1.0.0 by ZetaGo-Aurum');
    } else if (args.length === 1 && args[0] === '--results') {
        showBanner();
        showResults();
    } else if (args.length === 1 && args[0] === '--methods') {
        showBanner();
        showMethodTable();
    } else {
        await interactiveMenu();
    }
}

main().catch(err => {
    console.error(chalk.red(`\n  Fatal Error: ${err.message}`));
    process.exit(1);
});
