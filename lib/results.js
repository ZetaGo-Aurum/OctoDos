/**
 * OctoDos Results Manager v1.0.0
 * Manages audit history in /results directory with JSON files.
 * Users can view history, search results, and export reports.
 *
 * Created by ZetaGo-Aurum | MIT License
 */
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const RESULTS_DIR = path.join(process.cwd(), 'results');

function ensureResultsDir() {
    if (!fs.existsSync(RESULTS_DIR)) {
        fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }
}

/**
 * Save audit result to JSON file.
 */
function saveResult(data) {
    ensureResultsDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const sanitized = (data.target || 'unknown').replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 40);
    const filename = `audit_${sanitized}_${timestamp}.json`;
    const filepath = path.join(RESULTS_DIR, filename);

    const result = {
        id: generateId(),
        tool: 'OctoDos v1.0.0',
        operator: 'ZetaGo-Aurum',
        timestamp: new Date().toISOString(),
        target: data.target || 'unknown',
        mode: data.mode || 'unknown',
        duration: data.duration || 0,
        threads: data.threads || 0,
        intensity: data.intensity || 'medium',
        proxyCount: data.proxyCount || 0,
        recon: {
            resolvedIps: data.recon?.resolvedIps || [],
            leakedIps: data.recon?.leakedIps || [],
            wafDetected: data.recon?.wafDetected || null,
            proxies: data.recon?.proxies || [],
            technologies: data.recon?.technologies || [],
            securityIssues: data.recon?.security?.length || 0,
            dnsRecords: data.recon?.dnsRecords || {},
        },
        audit: {
            totalRequests: data.audit?.totalRequests || data.audit?.totalConnections || 0,
            successful: data.audit?.successfulRequests || data.audit?.successfulConnections || 0,
            failed: data.audit?.failedRequests || data.audit?.failedConnections || 0,
            rps: data.audit?.rps || data.audit?.cps || 0,
            elapsed: data.audit?.elapsed || 0,
            statusCodes: data.audit?.statusCodes || {},
            methodsUsed: data.methodsUsed || [],
            dataBytesSent: data.audit?.dataBytesSent || 0,
        },
        threatLevel: data.threatLevel || 0,
        summary: data.summary || '',
    };

    try {
        fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
        return { filepath, filename, id: result.id };
    } catch (e) {
        console.log(chalk.red(`  [!] Could not save result: ${e.message}`));
        return null;
    }
}

/**
 * Get all saved results.
 */
function getResults() {
    ensureResultsDir();
    try {
        const files = fs.readdirSync(RESULTS_DIR)
            .filter(f => f.endsWith('.json') && f.startsWith('audit_'))
            .sort()
            .reverse();

        return files.map(f => {
            try {
                const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), 'utf8'));
                data._filename = f;
                return data;
            } catch { return null; }
        }).filter(Boolean);
    } catch {
        return [];
    }
}

/**
 * Display results history in terminal.
 */
function showResults() {
    const results = getResults();
    const Table = require('cli-table3');

    if (results.length === 0) {
        console.log(chalk.yellow('\n  No audit results found. Run an audit first.\n'));
        return;
    }

    console.log(chalk.hex('#a855f7').bold(`\n  [*] Audit History -- ${results.length} results\n`));

    const table = new Table({
        head: [
            chalk.cyan('#'),
            chalk.cyan('Date'),
            chalk.cyan('Target'),
            chalk.cyan('Mode'),
            chalk.cyan('Requests'),
            chalk.cyan('RPS'),
            chalk.cyan('Threat'),
            chalk.cyan('ID'),
        ],
        colWidths: [4, 22, 28, 6, 10, 7, 8, 16],
        style: { border: ['gray'] },
    });

    results.slice(0, 25).forEach((r, i) => {
        const date = new Date(r.timestamp).toLocaleString();
        const target = (r.target || '').substring(0, 26);
        const mode = r.mode === 'L7' ? chalk.hex('#FF6B6B')('L7') : chalk.hex('#4158D0')('L4');
        const total = r.audit?.totalRequests || 0;
        const rps = r.audit?.rps || 0;
        const threat = r.threatLevel || 0;
        const threatColor = threat >= 70 ? chalk.red : threat >= 40 ? chalk.yellow : chalk.green;

        table.push([
            i + 1,
            date,
            target,
            mode,
            total.toLocaleString(),
            rps,
            threatColor(`${threat}/100`),
            r.id || '—',
        ]);
    });

    console.log(table.toString());
    console.log(chalk.gray(`\n  Results saved in: ${RESULTS_DIR}\n`));
}

/**
 * Get a specific result by ID or index.
 */
function getResultById(id) {
    const results = getResults();
    return results.find(r => r.id === id);
}

function generateId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = 'OCT-';
    for (let i = 0; i < 8; i++) {
        if (i === 4) id += '-';
        id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
}

module.exports = { saveResult, getResults, showResults, getResultById, RESULTS_DIR };
