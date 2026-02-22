/**
 * OctoDos Banner & UI Module v1.0.0
 * Terminal UI rendering with gradients, figlet art, and rich formatting.
 * Uses ASCII-safe characters for maximum terminal compatibility.
 *
 * Created by ZetaGo-Aurum | MIT License
 */
const chalk = require('chalk');
const figlet = require('figlet');
const gradient = require('gradient-string');

const octoGradient = gradient(['#FF6B6B', '#FF8E53', '#FFDD57', '#43E97B', '#38F9D7']);
const dangerGradient = gradient(['#FF0000', '#FF4444', '#FF6B6B']);
const cyanGradient = gradient(['#00C9FF', '#92FE9D']);
const purpleGradient = gradient(['#a855f7', '#6366f1', '#3b82f6']);
const warnGradient = gradient(['#FFDD57', '#FF8E53', '#FF6B6B']);

function showBanner() {
    console.clear();
    const art = figlet.textSync('OctoDos', { font: 'ANSI Shadow', horizontalLayout: 'fitted' });
    console.log(octoGradient.multiline(art));
    console.log(purpleGradient('  ================================================================'));
    console.log(chalk.hex('#a855f7').bold('  [*] OctoDos v1.0.0 -- Professional DDoS Resilience Auditor'));
    console.log(chalk.hex('#6366f1')('  [*] Created by ZetaGo-Aurum | 20 Methods | Tentacle Engine'));
    console.log(purpleGradient('  ================================================================'));
    console.log('');
}

function showMethodTable() {
    const Table = require('cli-table3');
    const l7Table = new Table({
        head: [chalk.hex('#FF6B6B').bold('L7 Methods'), chalk.hex('#FF6B6B').bold('Description'), chalk.hex('#FF6B6B').bold('Risk')],
        colWidths: [16, 50, 10], style: { border: ['gray'] },
    });
    l7Table.push(
        ['HTTP-FLOOD', 'Multi-method randomized GET/POST/HEAD with evasion', chalk.red('HIGH')],
        ['SLOWLORIS', 'Partial header connection exhaustion', chalk.red('HIGH')],
        ['RUDY', 'Slow POST body (R-U-Dead-Yet)', chalk.yellow('MED')],
        ['HTTP-DESYNC', 'CL.TE request smuggling confusion', chalk.red('CRIT')],
        ['CHUNKED', 'Slow chunked Transfer-Encoding abuse', chalk.yellow('MED')],
        ['BROWSER-EMU', 'Full browser fingerprint emulation', chalk.yellow('MED')],
        ['CACHE-BUST', 'Cache-busting randomized query bypass', chalk.red('HIGH')],
        ['MULTIPART', 'Multipart form-data boundary abuse', chalk.red('HIGH')],
        ['HEAD-FLOOD', 'HEAD-only (lightweight but full processing)', chalk.yellow('MED')],
        ['PIPELINE', 'HTTP pipelining multi-request abuse', chalk.red('HIGH')],
    );

    const l4Table = new Table({
        head: [chalk.hex('#4158D0').bold('L4 Methods'), chalk.hex('#4158D0').bold('Description'), chalk.hex('#4158D0').bold('Risk')],
        colWidths: [16, 50, 10], style: { border: ['gray'] },
    });
    l4Table.push(
        ['TCP-FLOOD', 'Rapid connect + multi-frame data push', chalk.red('HIGH')],
        ['UDP-FLOOD', 'Volumetric UDP bombardment (1472B)', chalk.red('HIGH')],
        ['SYN-STORM', 'Half-open connection flooding', chalk.red('CRIT')],
        ['SLOWREAD', 'Slow read buffer exhaustion', chalk.yellow('MED')],
        ['CONN-EXHAUST', 'Connection pool exhaustion + keepalive', chalk.red('HIGH')],
        ['FRAG-ATTACK', 'Fragmented UDP burst simulation', chalk.yellow('MED')],
        ['ACK-FLOOD', 'TCP ACK flooding (bypasses stateless FW)', chalk.red('HIGH')],
        ['RST-FLOOD', 'Forced TCP RST disruption', chalk.red('HIGH')],
        ['XMAS-FLOOD', 'TCP XMAS (all flags) filter confusion', chalk.yellow('MED')],
        ['NULL-FLOOD', 'Zero-flag TCP firewall bypass', chalk.yellow('MED')],
    );

    console.log(l7Table.toString());
    console.log('');
    console.log(l4Table.toString());
    console.log('');
}

function showEngines() {
    console.log(chalk.hex('#a855f7').bold('  [+] Engines:'));
    console.log(chalk.gray('    |-- [~] Proxy Rotation   -- HTTP/SOCKS4/SOCKS5 (14 sources, 8K+ proxies)'));
    console.log(chalk.gray('    |-- [~] Anti-WAF         -- 30+ UAs, CF bypass, cookie sim, header mutation'));
    console.log(chalk.gray('    |-- [~] Deep Recon       -- DNS/MX/SPF/CT, 99 subdomains, 11 WAFs'));
    console.log(chalk.gray('    |-- [~] Tentacle Engine  -- 20 coordinated multi-vector methods'));
    console.log(chalk.gray('    |-- [~] Threat Scoring   -- 0-100 risk assessment'));
    console.log(chalk.gray('    |-- [~] Audit Logger     -- Timestamped forensic-grade logs'));
    console.log(chalk.gray('    `-- [~] Results History  -- JSON history with search'));
    console.log('');
}

function showDisclaimer() {
    console.log(dangerGradient('\n  +===========================================================+'));
    console.log(dangerGradient('  |           [!] WARNING -- DANGEROUS TOOL [!]               |'));
    console.log(dangerGradient('  +===========================================================+'));
    console.log(chalk.red.bold('  This tool can cause REAL DAMAGE to systems if misused.'));
    console.log(chalk.red('  Unauthorized use is a CRIMINAL OFFENSE under:'));
    console.log(chalk.white('  * CFAA 1030(a)(5)(A) (US)       * Computer Misuse Act S3 (UK)'));
    console.log(chalk.white('  * UU ITE Pasal 33 (ID)          * EU Directive 2013/40 Art.4'));
    console.log(chalk.white('  * StGB S303b (DE)               * Criminal Code S430(1.1) (CA)'));
    console.log(chalk.white('  * Criminal Code S477.3 (AU)     * CMA S7 (SG)'));
    console.log(chalk.white('  * Penal Code Art.234-2 (JP)     * ICNA Art.48(3) (KR)'));
    console.log('');
    console.log(chalk.yellow('  By proceeding, you confirm:'));
    console.log(chalk.white('  1. You have WRITTEN AUTHORIZATION to test the target'));
    console.log(chalk.white('  2. You accept full legal responsibility'));
    console.log(chalk.white('  3. The creator (ZetaGo-Aurum) assumes NO liability'));
    console.log(chalk.white('  4. You have read the Terms of Service'));
    console.log('');
}

function showAuditSummary(config) {
    const Table = require('cli-table3');
    const table = new Table({ style: { border: ['gray'] } });
    table.push(
        { [chalk.cyan('Target')]: config.target },
        { [chalk.cyan('Mode')]: config.isL7 ? 'Layer 7 (Application) -- 10 Methods' : 'Layer 4 (Transport) -- 10 Methods' },
        { [chalk.cyan('Threads')]: config.effectiveThreads.toString() },
        { [chalk.cyan('Duration')]: `${config.time}s` },
        { [chalk.cyan('Intensity')]: config.intensity.toUpperCase() },
        { [chalk.cyan('Proxy')]: config.useProxy ? 'Enabled (Auto-Rotate)' : 'Disabled' },
        { [chalk.cyan('Recon')]: 'Full Deep Scan' },
        { [chalk.cyan('Tentacles')]: '20 coordinated multi-vector methods' },
    );
    console.log(table.toString());
    console.log('');
}

function showPhaseHeader(num, title, icon) {
    const symbols = { '[>]': '[>]', '[~]': '[~]', '[!]': '[!]', '[*]': '[*]' };
    const sym = icon || '[>]';
    console.log(warnGradient(`\n  === ${sym} PHASE ${num}: ${title} ===\n`));
}

function showComplete() {
    console.log(octoGradient('\n  +===========================================================+'));
    console.log(octoGradient('  |   [*] AUDIT COMPLETE -- Stay Vigilant, Stay Secure        |'));
    console.log(octoGradient('  |   Created by ZetaGo-Aurum | OctoDos v1.0.0               |'));
    console.log(octoGradient('  +===========================================================+'));
    console.log('');
}

module.exports = {
    showBanner, showMethodTable, showEngines, showDisclaimer,
    showAuditSummary, showPhaseHeader, showComplete,
    octoGradient, dangerGradient, cyanGradient, purpleGradient, warnGradient,
};
