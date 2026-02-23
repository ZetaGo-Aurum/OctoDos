<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-00D4FF?style=for-the-badge&logo=octopusdeploy&logoColor=white" alt="Version" />
  <img src="https://img.shields.io/badge/node-16+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/platform-Win%20%7C%20Linux%20%7C%20macOS%20%7C%20Termux-blueviolet?style=for-the-badge" alt="Platform" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/tools-OctoDos%20+%20OctoRecon-FF6B6B?style=for-the-badge" alt="Tools" />
</p>

<h1 align="center">🐙 OctoDos Suite v2.0.0</h1>

<p align="center">
  <b>Professional DDoS Resilience Auditor & Deep Reconnaissance Engine</b><br>
  <sub>20 Attack Methods · 8 Recon Modules · Origin IP Discovery · Cloudflare Bypass</sub>
</p>

<p align="center">
  <a href="#-octodos--ddos-resilience-auditor">OctoDos</a> •
  <a href="#-octorecon--deep-reconnaissance-engine">OctoRecon</a> •
  <a href="#-installation">Install</a> •
  <a href="#-legal-disclaimer">Legal</a>
</p>

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/ZetaGo-Aurum/OctoDos.git
cd OctoDos

# Install dependencies
npm install

# Register global commands (octodos + octorecon)
npm link
```

> **Supports:** Node.js 16+, Windows, Linux, macOS, **Termux (Android 3GB+ RAM)**

---

## 🐙 OctoDos — DDoS Resilience Auditor

> The Octopus Tentacle Engine deploys **20 coordinated multi-vector attack methods** to stress-test your infrastructure's resilience against real-world DDoS attacks.

### ⚡ Quick Start

```bash
# Interactive menu (recommended)
octodos

# Direct CLI mode
octodos <target> <threads> <duration> [--intensity]
```

### 📋 CLI Examples

```bash
# Standard stress test
octodos https://example.com 100 60

# Aggressive mode — 2x thread multiplier
octodos https://target.com 500 120 --high

# Maximum firepower — 3x threads
octodos 192.168.1.1:80 1000 60 --crit

# Adaptive mode — auto-balances load
octodos https://target.com 200 300 --auto
```

### 🎛️ Intensity Flags

| Flag | Multiplier | Description |
|:-----|:----------:|:------------|
| `--low` | `0.5x` | Conservative — gentle probing |
| `--med` | `1x` | Standard (default) |
| `--high` | `2x` | Aggressive — serious stress |
| `--crit` | `3x` | Maximum firepower — full saturation |
| `--auto` | `1.5x` | Adaptive — smart load balancing |

### 🐙 L7 Layer (Application) — 10 Methods

| Method | Type | Description |
|:-------|:-----|:------------|
| `HTTP-FLOOD` | Volumetric | Multi-method GET/POST/PUT/PATCH/DELETE/HEAD flood with **burst-mode** (10x concurrency) |
| `SLOWLORIS` | Connection | Holds connections open with partial headers indefinitely |
| `RUDY` | Connection | R-U-Dead-Yet — sends POST body bytes at 1 byte/s |
| `HTTP-DESYNC` | Exploit | CL.TE smuggling desynchronization attack |
| `CHUNKED` | Connection | Chunked Transfer-Encoding abuse with infinite drip |
| `BROWSER-EMU` | Evasion | Full Chromium/Firefox fingerprint with Sec-Ch-Ua pairing |
| `CACHE-BUST` | Bypass | CDN cache bypass with unique query strings per request |
| `MULTIPART` | Volumetric | Multipart form-data POST flood with randomized fields |
| `HEAD-FLOOD` | Lightweight | High-frequency HEAD requests with minimal overhead |
| `PIPELINE` | Multiplier | HTTP pipelining — 5-20 requests per single TCP connection |

### 💣 L4 Layer (Transport) — 10 Methods

| Method | Type | Description |
|:-------|:-----|:------------|
| `TCP-FLOOD` | Volumetric | High-speed TCP SYN+data flood |
| `UDP-FLOOD` | Volumetric | Randomized UDP packet storm |
| `SYN-STORM` | State | Half-open SYN connection exhaustion |
| `SLOWREAD` | Connection | Receives data at minimum window size |
| `CONN-EXHAUST` | Resource | Exhausts server's connection table |
| `FRAG-ATTACK` | Fragmentation | Fragmented IP packet reassembly abuse |
| `ACK-FLOOD` | Volumetric | TCP ACK packet flood |
| `RST-FLOOD` | Disruption | TCP RST injection flood |
| `XMAS-FLOOD` | Evasion | All TCP flags set (FIN+URG+PSH) |
| `NULL-FLOOD` | Evasion | Zero-flag TCP packets |

### 🔧 Engine Features

| Feature | Description |
|:--------|:------------|
| 🔥 **Burst Mode** | 10 concurrent fire chains per thread — **1000+ req/s with 100 threads** |
| 🛡️ **Anti-WAF v4.0** | 12 browser profiles with paired `Sec-Ch-Ua` + `User-Agent` fingerprints |
| 🔄 **Proxy Tunnel** | True `HttpsProxyAgent` tunneling through 8K+ rotating proxies |
| 🧠 **Dynamic Agents** | `maxSockets = threads × 128` — auto-scales to available RAM |
| 💀 **Crash Shield** | Global exception handler — immune to OS network faults |
| 📊 **Live Dashboard** | Real-time RPS, success rate, connections, data transferred |
| 📝 **Audit Logs** | Forensic-grade timestamped JSON logs |
| 📂 **Results History** | Persistent JSON history with search |

---

## 🔍 OctoRecon — Deep Reconnaissance Engine

> Smart multi-module reconnaissance engine that discovers **origin IPs behind Cloudflare/WAF**, enumerates subdomains, audits security headers, scans ports, and fingerprints technology stacks.

### ⚡ Quick Start

```bash
# Interactive menu (recommended)
octorecon

# Direct CLI mode
octorecon <target> <parameter> [--intensity]
```

### 📋 CLI Examples

```bash
# Full global recon
octorecon google.com global --deep

# Find origin IP behind Cloudflare
octorecon example.com root --deep

# Server-side only
octorecon 192.168.1.1 server

# Maximum coverage
octorecon https://target.com all --deep

# Quick check
octorecon example.com .
```

### 🎯 Scan Parameters

| Parameter | Modules | Use Case |
|:----------|:--------|:---------|
| `global` | DNS, Subdomains, WAF, Headers, Tech, SSL | General overview |
| `root` | DNS, Subs, WAF, **Origin IP**, SSL, Ports, Headers, Tech | Deep root analysis |
| `server` | DNS, **Origin IP**, SSL, Ports, WAF | Server infrastructure |
| `client` | Headers, Tech, SSL | Client-side security |
| `both` | All modules combined | Global + Root |
| `all` | Every module | Maximum coverage |
| `.` | Headers, Tech, WAF | Quick check |

### 🔥 Intensity Levels

| Flag | Description |
|:-----|:------------|
| `--light` | Fast scan — basic wordlist, top 20 ports |
| `--normal` | Standard depth (default) |
| `--deep` | 130+ subdomain wordlist, top 40 ports, extended probing |

### 🧠 Reconnaissance Modules

| Module | Capabilities |
|:-------|:-------------|
| 📡 **DNS Engine** | A, AAAA, MX, NS, TXT, SOA, CNAME, SRV, Reverse DNS |
| 🌐 **Subdomain Scanner** | 50 common + 80 deep brute-force via DNS resolution |
| 🛡️ **WAF Detector** | Cloudflare, Akamai, Sucuri, AWS WAF, Imperva, F5, Barracuda, Varnish, Fastly, CloudFront, DDoS-Guard |
| 🎯 **Origin IP Finder** | DNS history, MX record bypass, SSL SAN analysis, IPv6, origin subdomain probing (`origin.*`, `direct.*`, `backend.*`) |
| 🔒 **SSL/TLS Audit** | Protocol version, cipher suite, certificate chain, SAN, fingerprint, expiry |
| 📋 **Headers Audit** | HSTS, CSP, X-Frame-Options, XSS-Protection, Referrer-Policy, Permissions-Policy |
| 🚪 **Port Scanner** | Top 20-40 TCP ports with batch concurrency (1.5s timeout) |
| ⚙️ **Tech Detector** | Server, CMS (WordPress/Joomla/Drupal), frameworks (Next.js/Laravel/Django/Express), libraries (React/Vue/Angular/jQuery) |

---

## 🏗️ Project Structure

```
OctoDos/
├── index.js              # OctoDos CLI entry point
├── octorecon.js           # OctoRecon CLI entry point
├── package.json           # v2.0.0 — dual binaries
├── lib/
│   ├── l7.js              # L7 Tentacle Engine (10 methods, burst-mode)
│   ├── l4.js              # L4 Tentacle Engine (10 methods)
│   ├── recon-engine.js    # OctoRecon deep recon engine (8 modules)
│   ├── antiwaf.js         # Anti-WAF v4.0 — browser fingerprint evasion
│   ├── proxy.js           # Proxy scraper — 14 sources, 8K+ proxies
│   ├── recon.js            # OctoDos internal recon module
│   ├── auditor.js         # Defense recommendations engine
│   ├── banner.js          # UI components and banners
│   ├── logger.js          # Forensic audit logger
│   ├── results.js         # Results history manager
│   └── methods.js         # Method registry
├── scripts/
│   └── postinstall.js     # Global registration script
├── CHANGELOG.md
├── LICENSE
├── TERMS_OF_SERVICE.md
└── README.md
```

---

## ⚠️ Legal Disclaimer

> **This tool is designed for authorized penetration testing only.**
>
> Unauthorized use against systems you do not own or have explicit written permission to test is **illegal** and constitutes a **criminal offense** under computer crime laws worldwide.
>
> By using OctoDos or OctoRecon, you agree to the [Terms of Service](TERMS_OF_SERVICE.md) and accept full legal responsibility for your actions.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>Created with 🐙 by <a href="https://github.com/ZetaGo-Aurum">ZetaGo-Aurum</a></b><br>
  <sub>OctoDos Suite v2.0.0 — Stress Testing & Reconnaissance Redefined</sub>
</p>
