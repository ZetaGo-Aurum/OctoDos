/**
 * OctoDos Defensive Auditor v3.0 — Expert Recommendation Engine
 *
 * Provides comprehensive, method-specific defense recommendations
 * based on recon intelligence and audit results.
 *
 * Created by ZetaGo-Aurum | MIT License
 */
const chalk = require('chalk');

function getRecommendations(target, reconData, auditStats, isL7) {
    console.log(chalk.hex('#43E97B').bold('\n  ╔══════════════════════════════════════════════════╗'));
    console.log(chalk.hex('#43E97B').bold('  |   [*] OCTODOS DEFENSIVE AUDIT REPORT v3.0        |'));
    console.log(chalk.hex('#43E97B').bold('  ╚══════════════════════════════════════════════════╝'));

    let threatLevel = 0; // 0-100

    // ══════════════════════════════════
    // WAF / CDN ANALYSIS
    // ══════════════════════════════════
    console.log(chalk.yellow.bold('\n  ── 1. WAF / CDN Analysis ──'));
    if (reconData.proxies.length === 0) {
        threatLevel += 30;
        console.log(chalk.red.bold('  [CRITICAL] No WAF/CDN/Proxy detected!'));
        console.log(chalk.white('  → Target IP is directly exposed to the internet.'));
        console.log(chalk.white('  → All volumetric and application-layer attacks will reach origin.'));
        console.log(chalk.white('  → Server has zero DDoS mitigation at the network edge.\n'));
        console.log(chalk.cyan('  [~] IMMEDIATE DEPLOYMENT REQUIRED:'));
        console.log(chalk.white('    ┌─ Option A: Cloudflare (Free–Enterprise) ─────────────────────┐'));
        console.log(chalk.white('    │  • Enable proxy mode on all DNS records                      │'));
        console.log(chalk.white('    │  • Activate "I\'m Under Attack" mode for incidents             │'));
        console.log(chalk.white('    │  • Configure Rate Limiting rules (100 req/10s threshold)      │'));
        console.log(chalk.white('    │  • Enable Bot Management + Super Bot Fight Mode              │'));
        console.log(chalk.white('    │  • Deploy Managed WAF Ruleset (OWASP Core)                   │'));
        console.log(chalk.white('    │  • Set geographic access rules for non-target regions         │'));
        console.log(chalk.white('    └──────────────────────────────────────────────────────────────┘'));
        console.log(chalk.white('    ┌─ Option B: AWS Shield + WAF ─────────────────────────────────┐'));
        console.log(chalk.white('    │  • Deploy AWS Shield Standard (free) / Advanced ($3k/mo)     │'));
        console.log(chalk.white('    │  • Configure AWS WAF with rate-based rules                   │'));
        console.log(chalk.white('    │  • Use CloudFront as CDN with regional edge caches           │'));
        console.log(chalk.white('    │  • Enable AWS Global Accelerator for Anycast                 │'));
        console.log(chalk.white('    └──────────────────────────────────────────────────────────────┘'));
        console.log(chalk.white('    ┌─ Option C: Akamai / Imperva / Sucuri ────────────────────────┐'));
        console.log(chalk.white('    │  • Enterprise-grade DDoS mitigation (multi-Tbps capacity)    │'));
        console.log(chalk.white('    │  • Origin IP masking + scrubbing center protection           │'));
        console.log(chalk.white('    │  • Bot detection with ML-based fingerprinting                │'));
        console.log(chalk.white('    └──────────────────────────────────────────────────────────────┘'));
    } else {
        console.log(chalk.green(`  [+] Defensive layers detected: ${reconData.proxies.join(', ')}`));

        if (reconData.wafDetected === 'Cloudflare') {
            console.log(chalk.cyan('\n  [~] CLOUDFLARE HARDENING:'));
            console.log(chalk.white('    1. Enable "Under Attack" mode during active incidents'));
            console.log(chalk.white('    2. Configure rate limiting: 100 req/10s per IP'));
            console.log(chalk.white('    3. Enable Super Bot Fight Mode (Business/Enterprise)'));
            console.log(chalk.white('    4. Deploy Managed WAF with OWASP Core Rule Set'));
            console.log(chalk.white('    5. Set up Firewall Rules to challenge suspicious traffic'));
            console.log(chalk.white('    6. Enable Browser Integrity Check'));
            console.log(chalk.white('    7. Configure IP Access Rules for known bad actors'));
            console.log(chalk.white('    8. Enable HTTP DDoS Attack Protection (auto-enabled)'));
            console.log(chalk.white('    9. Set Security Level to "High" or "I\'m Under Attack"'));
            console.log(chalk.white('   10. Use Page Rules to disable caching on sensitive paths'));
        }
    }

    // ══════════════════════════════════
    // ORIGIN IP LEAK ANALYSIS
    // ══════════════════════════════════
    if (reconData.leakedIps && reconData.leakedIps.length > 0) {
        threatLevel += 25;
        console.log(chalk.red.bold('\n  -- 2. [!] ORIGIN IP LEAK DETECTED --'));
        console.log(chalk.red(`  Leaked IPs: ${reconData.leakedIps.join(', ')}`));
        console.log(chalk.white('  → Attacker can bypass WAF by targeting origin IP directly.'));
        console.log(chalk.white('  → CDN protection is effectively nullified.\n'));
        console.log(chalk.cyan('  [~] CRITICAL FIX REQUIRED:'));
        console.log(chalk.white('    1. IMMEDIATELY change your server\'s IP address'));
        console.log(chalk.white('    2. Remove all direct A/AAAA records pointing to origin'));
        console.log(chalk.white('    3. Proxy ALL subdomains through CDN (orange cloud in CF)'));
        console.log(chalk.white('    4. Move mail server to separate IP (prevents MX leak)'));
        console.log(chalk.white('    5. Remove origin IP from SPF/TXT records'));
        console.log(chalk.white('    6. Configure origin firewall: ONLY allow CDN IP ranges'));
        console.log(chalk.white('    7. Use authenticated origin pulls (CF: Authenticated Origin)'));
        console.log(chalk.white('    8. Audit ALL historical DNS records for leaked IPs'));
        console.log(chalk.white('    9. Check Shodan/Censys for indexed origin services'));
        console.log(chalk.white('   10. Rotate credentials after IP change'));
    } else {
        console.log(chalk.green.bold('\n  ── 2. Origin IP Protection ──'));
        console.log(chalk.green('  [+] No origin IP leaks detected via DNS/MX/SPF/Subdomains'));
    }

    // ══════════════════════════════════
    // SECURITY HEADER ANALYSIS
    // ══════════════════════════════════
    if (reconData.security && reconData.security.length > 0) {
        threatLevel += 10;
        console.log(chalk.yellow.bold('\n  ── 3. Security Issues ──'));
        reconData.security.forEach(issue => {
            console.log(chalk.yellow(`  [!] ${issue}`));
        });
        console.log(chalk.cyan('\n  [~] HEADER HARDENING (add to Nginx/Apache/CDN):'));
        console.log(chalk.white('    Strict-Transport-Security: max-age=31536000; includeSubDomains; preload'));
        console.log(chalk.white('    X-Content-Type-Options: nosniff'));
        console.log(chalk.white('    X-Frame-Options: DENY'));
        console.log(chalk.white('    X-XSS-Protection: 1; mode=block'));
        console.log(chalk.white('    Content-Security-Policy: default-src \'self\''));
        console.log(chalk.white('    Referrer-Policy: strict-origin-when-cross-origin'));
        console.log(chalk.white('    Permissions-Policy: geolocation=(), microphone=()'));
        console.log(chalk.white('    Remove: X-Powered-By, Server (version info)'));
    }

    // ══════════════════════════════════
    // RESILIENCE ANALYSIS
    // ══════════════════════════════════
    console.log(chalk.yellow.bold('\n  ── 4. Resilience Analysis ──'));

    if (isL7) {
        const total = auditStats.totalRequests || 0;
        const success = auditStats.successfulRequests || 0;
        const rps = auditStats.rps || 0;
        const successRate = total > 0 ? ((success / total) * 100).toFixed(2) : 0;

        console.log(chalk.white(`  Total Requests:  ${total} | Success: ${successRate}% | RPS: ${rps}`));

        if (successRate > 90) {
            threatLevel += 25;
            console.log(chalk.red.bold('  [VULNERABLE] Server accepted nearly all requests.'));
            console.log(chalk.white('  → No rate limiting, no connection throttling detected.'));
            console.log(chalk.white('  → Target is highly vulnerable to HTTP flood attacks.\n'));
            console.log(chalk.cyan('  [~] L7 HARDENING:'));
            console.log(chalk.white('    ┌─ Nginx Rate Limiting ──────────────────────────────────────┐'));
            console.log(chalk.white('    │  limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s│'));
            console.log(chalk.white('    │  limit_conn_zone $binary_remote_addr zone=conn:10m;        │'));
            console.log(chalk.white('    │  limit_conn conn 50;                                       │'));
            console.log(chalk.white('    └─────────────────────────────────────────────────────────────┘'));
            console.log(chalk.white('    • Deploy CAPTCHA/JS challenge for suspicious patterns'));
            console.log(chalk.white('    • Implement request queuing / tarpit for abusive clients'));
            console.log(chalk.white('    • Use connection timeout: proxy_read_timeout 5s'));
            console.log(chalk.white('    • Enable HTTP/2 server push to detect browser validity'));
            console.log(chalk.white('    • Implement request body size limits (client_max_body_size)'));
        } else if (successRate > 50) {
            threatLevel += 10;
            console.log(chalk.yellow('  [MODERATE] Some resilience detected but improvement needed.'));
        } else {
            console.log(chalk.green('  [STRONG] Infrastructure effectively throttled audit traffic.'));
        }

        if (auditStats.statusCodes) {
            const codes = auditStats.statusCodes;
            if (codes[429]) console.log(chalk.green(`  [+] Rate limiting: ${codes[429]} × 429 responses`));
            if (codes[403]) console.log(chalk.green(`  [+] WAF blocking:  ${codes[403]} × 403 responses`));
            if (codes[503]) {
                threatLevel += 10;
                console.log(chalk.red(`  [!] Overloaded:    ${codes[503]} × 503 responses`));
                console.log(chalk.white('    → Enable auto-scaling (k8s HPA, AWS ASG, etc.)'));
                console.log(chalk.white('    → Configure upstream failover / load balancing'));
            }
        }
    } else {
        const total = auditStats.totalConnections || 0;
        const success = auditStats.successfulConnections || 0;
        const cps = auditStats.cps || 0;
        const successRate = total > 0 ? ((success / total) * 100).toFixed(2) : 0;

        console.log(chalk.white(`  Total Connections: ${total} | Success: ${successRate}% | CPS: ${cps}`));

        if (successRate > 80) {
            threatLevel += 25;
            console.log(chalk.red.bold('  [VULNERABLE] Server accepted most TCP/UDP connections.'));
            console.log(chalk.white('  → No SYN flood protection, no connection limiting detected.\n'));
            console.log(chalk.cyan('  [~] L4 HARDENING:'));
            console.log(chalk.white('    ┌─ Linux Kernel Tuning ──────────────────────────────────────┐'));
            console.log(chalk.white('    │  net.ipv4.tcp_syncookies = 1                               │'));
            console.log(chalk.white('    │  net.ipv4.tcp_max_syn_backlog = 65536                      │'));
            console.log(chalk.white('    │  net.ipv4.tcp_synack_retries = 2                           │'));
            console.log(chalk.white('    │  net.ipv4.conf.all.rp_filter = 1                           │'));
            console.log(chalk.white('    │  net.core.somaxconn = 65535                                │'));
            console.log(chalk.white('    │  net.ipv4.tcp_fin_timeout = 15                             │'));
            console.log(chalk.white('    │  net.ipv4.tcp_tw_reuse = 1                                 │'));
            console.log(chalk.white('    └─────────────────────────────────────────────────────────────┘'));
            console.log(chalk.white('    ┌─ iptables Rules ────────────────────────────────────────────┐'));
            console.log(chalk.white('    │  -A INPUT -p tcp --syn -m limit --limit 50/s -j ACCEPT     │'));
            console.log(chalk.white('    │  -A INPUT -p tcp --syn -j DROP                             │'));
            console.log(chalk.white('    │  -A INPUT -p udp -m limit --limit 50/s -j ACCEPT           │'));
            console.log(chalk.white('    │  -A INPUT -p icmp --icmp-type echo-request -j DROP         │'));
            console.log(chalk.white('    └─────────────────────────────────────────────────────────────┘'));
            console.log(chalk.white('    • Deploy fail2ban for repeat offenders'));
            console.log(chalk.white('    • Use Anycast (Cloudflare Spectrum, AWS Global Accelerator)'));
            console.log(chalk.white('    • Consider BGP Flowspec for ISP-level filtering'));
        } else {
            console.log(chalk.green('  [STRONG] Connection limiting appears active.'));
        }
    }

    // ══════════════════════════════════
    // THREAT LEVEL ASSESSMENT
    // ══════════════════════════════════
    threatLevel = Math.min(100, threatLevel);
    const threatColor = threatLevel >= 70 ? chalk.red : threatLevel >= 40 ? chalk.yellow : chalk.green;
    const threatLabel = threatLevel >= 70 ? 'CRITICAL' : threatLevel >= 40 ? 'MODERATE' : 'LOW';
    const threatBar = '█'.repeat(Math.floor(threatLevel / 5)) + '░'.repeat(20 - Math.floor(threatLevel / 5));

    console.log(chalk.yellow.bold('\n  ── 5. Overall Threat Level ──'));
    console.log(threatColor(`  [${threatBar}] ${threatLevel}/100 — ${threatLabel}`));

    // ══════════════════════════════════
    // GENERAL BEST PRACTICES
    // ══════════════════════════════════
    console.log(chalk.cyan.bold('\n  ── 6. General Best Practices ──'));
    console.log(chalk.white('    1.  Keep all server software updated and patched'));
    console.log(chalk.white('    2.  Implement monitoring (Prometheus + Grafana + AlertManager)'));
    console.log(chalk.white('    3.  Create a DDoS incident response runbook'));
    console.log(chalk.white('    4.  Use geographic rate limiting for non-target markets'));
    console.log(chalk.white('    5.  Regularly audit with tools like OctoDos'));
    console.log(chalk.white('    6.  Configure connection timeouts and keepalive limits'));
    console.log(chalk.white('    7.  Separate origin from mail/DNS. Use dedicated IPs.'));
    console.log(chalk.white('    8.  Enable access logs and anomaly detection'));
    console.log(chalk.white('    9.  Implement circuit breakers for downstream services'));
    console.log(chalk.white('   10.  Test disaster recovery and failover procedures'));
    console.log(chalk.white('   11.  Use WAF rules to block known attack patterns'));
    console.log(chalk.white('   12.  Deploy honeypots to detect reconnaissance'));

    console.log(chalk.hex('#43E97B').bold('\n  ╔══════════════════════════════════════════════════╗'));
    console.log(chalk.hex('#43E97B').bold('  |   [*] AUDIT COMPLETE -- Stay Vigilant, Stay Secure |'));
    console.log(chalk.hex('#43E97B').bold('  ║   Created by ZetaGo-Aurum | OctoDos v3.0         ║'));
    console.log(chalk.hex('#43E97B').bold('  ╚══════════════════════════════════════════════════╝\n'));
}

module.exports = { getRecommendations };
