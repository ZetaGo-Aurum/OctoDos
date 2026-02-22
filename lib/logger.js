/**
 * OctoDos Audit Logger v1.0.0
 * Forensic-grade timestamped audit trail logging.
 *
 * Features:
 *   - Per-session log file creation
 *   - Timestamped entries
 *   - Phase tracking
 *   - JSON-exportable results
 *   - Configurable log directory
 *
 * Created by ZetaGo-Aurum | MIT License
 */
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class AuditLogger {
    constructor(target) {
        this.target = target;
        this.startTime = new Date();
        this.entries = [];
        this.sessionId = this._generateSessionId();

        // Create logs directory
        this.logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }

        // Sanitize target for filename
        const sanitized = target.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
        const dateStr = this.startTime.toISOString().replace(/[:.]/g, '-').substring(0, 19);
        this.logFile = path.join(this.logDir, `octodos_${sanitized}_${dateStr}.log`);
        this.jsonFile = path.join(this.logDir, `octodos_${sanitized}_${dateStr}.json`);

        this.log('SESSION', `OctoDos Audit Session Started`);
        this.log('SESSION', `Session ID: ${this.sessionId}`);
        this.log('SESSION', `Target: ${target}`);
        this.log('SESSION', `Operator: ZetaGo-Aurum`);
        this.log('SESSION', `Timestamp: ${this.startTime.toISOString()}`);
        this.log('SESSION', `Terms Accepted: YES`);
        this._separator();
    }

    _generateSessionId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = 'OCTO-';
        for (let i = 0; i < 12; i++) {
            if (i > 0 && i % 4 === 0) id += '-';
            id += chars[Math.floor(Math.random() * chars.length)];
        }
        return id;
    }

    _separator() {
        this.entries.push({ time: new Date().toISOString(), level: 'INFO', message: '─'.repeat(60) });
    }

    log(level, message) {
        const timestamp = new Date().toISOString();
        const entry = { time: timestamp, level, message };
        this.entries.push(entry);

        const line = `[${timestamp}] [${level.padEnd(8)}] ${message}`;

        // Append to log file
        try {
            fs.appendFileSync(this.logFile, line + '\n');
        } catch { }
    }

    phase(num, name) {
        this._separator();
        this.log('PHASE', `═══ Phase ${num}: ${name} ═══`);
    }

    logRecon(reconData) {
        this.phase(1, 'DEEP RECONNAISSANCE');
        this.log('RECON', `Resolved IPs: ${(reconData.resolvedIps || []).join(', ') || 'None'}`);
        this.log('RECON', `WAF/CDN: ${(reconData.proxies || []).join(', ') || 'None detected'}`);
        this.log('RECON', `Leaked IPs: ${(reconData.leakedIps || []).join(', ') || 'None'}`);
        this.log('RECON', `Technologies: ${(reconData.technologies || []).join(', ') || 'Unknown'}`);
        this.log('RECON', `Security Issues: ${(reconData.security || []).length}`);
        if (reconData.dnsRecords) {
            Object.entries(reconData.dnsRecords).forEach(([type, records]) => {
                this.log('DNS', `${type}: ${Array.isArray(records) ? records.join(', ') : records}`);
            });
        }
    }

    logProxy(httpCount, socks4Count, socks5Count, total) {
        this.phase(0, 'PROXY ACQUISITION');
        this.log('PROXY', `HTTP Proxies:   ${httpCount}`);
        this.log('PROXY', `SOCKS4 Proxies: ${socks4Count}`);
        this.log('PROXY', `SOCKS5 Proxies: ${socks5Count}`);
        this.log('PROXY', `Total Pool:     ${total}`);
    }

    logAudit(stats, isL7) {
        this.phase(2, isL7 ? 'L7 APPLICATION LAYER AUDIT' : 'L4 TRANSPORT LAYER AUDIT');
        if (isL7) {
            this.log('AUDIT', `Total Requests:  ${stats.totalRequests || 0}`);
            this.log('AUDIT', `Successful:      ${stats.successfulRequests || 0}`);
            this.log('AUDIT', `Failed:          ${stats.failedRequests || 0}`);
            this.log('AUDIT', `Avg RPS:         ${stats.rps || 0}`);
            this.log('AUDIT', `Duration:        ${stats.elapsed || 0}s`);
            if (stats.statusCodes) {
                Object.entries(stats.statusCodes).forEach(([code, count]) => {
                    this.log('HTTP', `Status ${code}: ${count} responses`);
                });
            }
        } else {
            this.log('AUDIT', `Total Connections: ${stats.totalConnections || 0}`);
            this.log('AUDIT', `Successful:        ${stats.successfulConnections || 0}`);
            this.log('AUDIT', `Failed:            ${stats.failedConnections || 0}`);
            this.log('AUDIT', `Data Sent:         ${((stats.dataBytesSent || 0) / 1024).toFixed(2)} KB`);
            this.log('AUDIT', `Avg CPS:           ${stats.cps || 0}`);
            this.log('AUDIT', `Duration:          ${stats.elapsed || 0}s`);
        }
    }

    logDefense(threatLevel) {
        this.phase(3, 'DEFENSIVE ANALYSIS');
        this.log('DEFENSE', `Threat Level: ${threatLevel}/100`);
    }

    finalize(summary) {
        this._separator();
        this.log('SESSION', 'Audit session completed');
        this.log('SESSION', `Total Duration: ${((Date.now() - this.startTime.getTime()) / 1000).toFixed(2)}s`);
        this.log('SESSION', `Log File: ${this.logFile}`);
        this._separator();

        // Write JSON report
        const report = {
            session: {
                id: this.sessionId,
                target: this.target,
                operator: 'ZetaGo-Aurum',
                tool: 'OctoDos v1.0.0',
                startTime: this.startTime.toISOString(),
                endTime: new Date().toISOString(),
                durationSeconds: ((Date.now() - this.startTime.getTime()) / 1000).toFixed(2),
            },
            summary: summary || {},
            entries: this.entries,
        };

        try {
            fs.writeFileSync(this.jsonFile, JSON.stringify(report, null, 2));
            console.log(chalk.gray(`  📝 Log saved: ${path.basename(this.logFile)}`));
            console.log(chalk.gray(`  📊 Report saved: ${path.basename(this.jsonFile)}`));
        } catch (e) {
            console.log(chalk.gray(`  ⚠ Could not save JSON report: ${e.message}`));
        }
    }
}

module.exports = { AuditLogger };
