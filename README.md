<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-00D4FF?style=for-the-badge&logo=octopusdeploy&logoColor=white" alt="Version" />
  <img src="https://img.shields.io/badge/node-16+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/platform-Win%20%7C%20Linux%20%7C%20macOS%20%7C%20Termux-blueviolet?style=for-the-badge" alt="Platform" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/tools-OctoDos%20+%20OctoRecon%20+%20OctoScrape-FF6B6B?style=for-the-badge" alt="Tools" />
</p>

<h1 align="center">🐙 OctoDos Suite v2.0.0</h1>

<p align="center">
  <b>Professional DDoS Resilience Auditor, Deep Reconnaissance & Web Data Extraction Suite</b><br>
  <sub>20 Attack Methods · 14 Recon Modules · 16 Scraping Modules · Hydration Breaking · Double TOS</sub>
</p>

<p align="center">
  <a href="#-octodos--ddos-resilience-auditor">OctoDos</a> •
  <a href="#-octorecon--deep-reconnaissance-engine">OctoRecon</a> •
  <a href="#%EF%B8%8F-octoscrape--web-data-extraction-engine">OctoScrape</a> •
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
octodos 192.*.*.*.*.* 1000 60 --crit

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

## 🔍 OctoRecon v2 — Advanced Deep Reconnaissance Engine

> Smart multi-module reconnaissance engine with **14 scanners**. Discovers **origin IPs behind Cloudflare/WAF**, validates email security, detects cloud providers, tests zone transfer vulnerabilities, and bruteforces directories. **Double TOS verification** required.

### ⚡ Quick Start

```bash
# Interactive menu (double TOS verification)
octorecon

# Direct CLI mode
octorecon <target> <parameter> [--intensity]
```

### 📋 CLI Examples

```bash
# Full global recon (8 modules)
octorecon google.com global --deep

# ALL 14 modules at max depth
octorecon example.com root --deep

# Server infrastructure scan
octorecon 192.168.1.1 server

# Quick check
octorecon example.com .
```

### 🎯 Scan Parameters

| Parameter | Modules | Use Case |
|:----------|:--------|:---------|
| `global` | DNS, Subs, WAF, Headers, Tech, SSL, Email, Cloud | General overview |
| `root` | **ALL 14 modules** | Deep root analysis |
| `server` | DNS, Origin, SSL, Ports, WAF, Cloud, H2, Zone | Server infrastructure |
| `client` | Headers, Tech, SSL, HTTP/2 | Client-side security |
| `all` | Every module at full intensity | Maximum coverage |
| `.` | Headers, Tech, WAF | Quick check |

### 🔥 Intensity Levels

| Flag | Description |
|:-----|:------------|
| `--light` | Fast scan — basic wordlist, top 20 ports |
| `--normal` | Standard depth (default) |
| `--deep` | 130+ subdomain wordlist, top 50 ports, 80+ dir paths |

### 🧠 Core Modules (8)

| Module | Capabilities |
|:-------|:-------------|
| 📡 **DNS Engine** | A, AAAA, MX, NS, TXT, SOA, CNAME, SRV, Reverse DNS |
| 🌐 **Subdomain Scanner** | 130+ wordlist brute-force via batch DNS resolution |
| 🛡️ **WAF Detector** | 18 WAF/CDN vendors: Cloudflare, Akamai, Sucuri, AWS WAF/Shield, Imperva, F5, Varnish, Fastly, CloudFront, DDoS-Guard, Wordfence, ModSecurity, Azure, GCP |
| 🎯 **Origin IP Finder** | DNS, MX bypass, SSL SAN, IPv6, NS records, origin subdomain probing |
| 🔒 **SSL/TLS Audit** | Protocol, cipher, cert chain, SAN, fingerprint, key size, expiry |
| 📋 **Headers Audit** | 12 security headers + CORS policy (COEP, COOP, CORP) |
| 🚪 **Port Scanner** | Top 50 TCP ports with batch concurrency (1.2s timeout) |
| ⚙️ **Tech Detector** | 35+ technologies: CMS, frameworks, libraries, CSS, analytics, backend |

### 💀 Advanced Modules (6) — NEW

| Module | Capabilities |
|:-------|:-------------|
| 📝 **WHOIS Lookup** | Domain registration data via RDAP (registrar, status, events, NS) |
| 📧 **Email Security** | SPF/DKIM/DMARC validation, 10 DKIM selectors, MX records |
| ☁️ **Cloud Detection** | 12 providers: AWS, Azure, GCP, Vercel, Netlify, Heroku, Cloudflare Pages, Railway, Fly.io, Render, DigitalOcean |
| 🔗 **HTTP/2 Fingerprint** | ALPN negotiation, TLS version, cipher, Alt-Svc header |
| 🗺️ **Zone Transfer** | AXFR vulnerability test against all nameservers |
| 📂 **Dir Bruteforce** | 80+ paths: admin panels, API docs, config files, debug endpoints |

---

## 🕷️ OctoScrape v2 — Aggressive Web Data Extraction Engine

> ⚠️ **AGGRESSIVE DATA EXTRACTION TOOL** — OctoScrape v2 performs deep data collection including **hydration state breaking**, **source map extraction**, and **API key leak scanning**. **Double TOS verification** required. Unauthorized use = **DATA THEFT**.

> 16-module extraction engine that breaks through **Next.js/Nuxt/Remix/Gatsby hydration** to extract raw application state, discovers **source maps** exposing original code, finds **leaked API keys**, dumps **GraphQL schemas**, and harvests **session tokens**. Integrates with OctoRecon v2.

### ⚡ Quick Start

```bash
# Interactive menu (double TOS verification)
octoscrape

# Direct CLI mode (terminal shows FULL results, flags = export/save)
octoscrape <url> <parameter> [--json|--txt|--zip]
```

### 📋 CLI Examples

```bash
# Full aggressive extraction
octoscrape https://example.com all --zip

# Root analysis with sensitive file probing
octoscrape https://target.com root --json

# Client-side hydration breaking
octoscrape https://target.com client --txt

# Quick security snapshot
octoscrape https://target.com .
```

### 🎯 Extraction Parameters

| Parameter | Modules | Use Case |
|:----------|:--------|:---------|
| `global` | Source, Assets, Cookies, Security, Tech, Links, Meta, Hydration, Chunks | General extraction |
| `root` | **ALL 16 modules** | Deep aggressive extraction |
| `server` | Security, Tech, Configs, Cookies, GraphQL, Tokens | Server infrastructure |
| `client` | Source, Assets, Forms, Links, Meta, Hydration, Chunks, APIs, EnvLeaks, JSDeep | Client-side breaking |
| `both/all` | Every extraction module | Maximum coverage |
| `.` | Security, Meta, Cookies, Tokens | Quick check |

### 💾 Output Formats

> **Terminal always shows FULL exhaustive results.** Output flags are for **export/save only.**

| Flag | Format | Description |
|:-----|:-------|:------------|
| `--json` | JSON | Structured data file (default) |
| `--txt` | TXT | Plain text report |
| `--zip` | Directory | Separate file per module — open media files directly |

### 🔬 Core Modules (9)

| Module | Capabilities |
|:-------|:-------------|
| 📄 **Source Code** | Full HTML, inline JS/CSS snippets, HTML comments (info leak) |
| 🖼️ **Page Assets** | JS, CSS, images, fonts, media, iframes — full URL tree |
| 🍪 **Cookies** | All cookies with HttpOnly, Secure, SameSite, Domain, Path, Expiry, Max-Age |
| 🔒 **Security Stack** | 12 headers audit, CORS policy, CSP directive parsing, all response headers |
| ⚙️ **Tech Stack** | 35+ technologies grouped as tree (Server, CMS, Framework, Library, CSS, Analytics) |
| 📂 **Config Files** | 75+ sensitive paths: `.env`, `.git`, `robots.txt`, `wp-config`, `swagger`, `Dockerfile`, backups, admin panels |
| 📝 **Forms & Inputs** | Actions, methods, enctype, every input with type/name/id/value/placeholder, hidden field + password markers |
| 🔗 **Links & Sitemap** | Internal/external links, anchor fragments, email harvesting |
| 🏷️ **Meta & SEO** | Title, description, keywords, OG tags, Twitter Cards, JSON-LD schemas, canonical, favicon |

### 💀 Aggressive Modules (7) — NEW

| Module | Capabilities |
|:-------|:-------------|
| 💉 **Hydration Decoder** | Breaks Next.js `__NEXT_DATA__`, Nuxt `__NUXT__`, Remix `__remixContext`, Gatsby `___GATSBY`, React `__INITIAL_STATE__`, SvelteKit, Apollo cache, Relay store |
| 🗺️ **Source Map Extractor** | Finds `.map` files → **original source code** with file tree and content preview |
| 🔌 **API Discovery** | Extracts fetch/axios/XMLHttpRequest endpoints from client bundles |
| 🔑 **Env Leak Scanner** | Detects Google API keys, AWS Access keys, Stripe keys, GitHub tokens, JWT, Slack tokens, generic secrets |
| 📊 **GraphQL Introspection** | Schema dump: query/mutation types, all type fields exposed |
| 🎫 **Token Extraction** | CSRF tokens, session cookies, authorization headers, nonces |
| 📦 **Chunk Analyzer** | Webpack/Vite/Parcel/Rollup detection, chunk hashes, public path, build structure |

---

## 🏗️ Project Structure

```
OctoDos/
├── index.js              # OctoDos CLI entry point
├── octorecon.js           # OctoRecon v2 CLI (14 modules, double TOS)
├── octoscrape.js          # OctoScrape v2 CLI (16 modules, double TOS)
├── package.json           # v2.0.0 — triple binaries
├── lib/
│   ├── l7.js              # L7 Tentacle Engine (10 methods, burst-mode)
│   ├── l4.js              # L4 Tentacle Engine (10 methods, OOM-safe)
│   ├── recon-engine.js    # OctoRecon v2 engine (14 modules)
│   ├── scrape-engine.js   # OctoScrape v2 engine (16 modules)
│   ├── antiwaf.js         # Anti-WAF v4.0 — browser fingerprint evasion
│   ├── proxy.js           # Proxy scraper — 14 sources, 8K+ proxies
│   ├── recon.js           # OctoDos internal recon module
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

> **This suite is designed for authorized penetration testing and security auditing only.**
>
> All tools require **DOUBLE TOS VERIFICATION** — two consecutive consent prompts before execution.
>
> Unauthorized use against systems you do not own or have explicit written permission to test is **illegal** and constitutes a **criminal offense** under computer crime laws worldwide.
>
> **OctoScrape Warning:** Data extraction without authorization constitutes **data theft** and may violate privacy laws including GDPR, CCPA, UU PDP, and equivalent legislation. Hydration state breaking, source map extraction, and API key scanning carry **additional legal responsibilities**.
>
> By using OctoDos, OctoRecon, or OctoScrape, you agree to the [Terms of Service](TERMS_OF_SERVICE.md) and accept full legal responsibility for your actions.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>Created with 🐙 by <a href="https://github.com/ZetaGo-Aurum">ZetaGo-Aurum</a></b><br>
  <sub>OctoDos Suite v2.0.0 — Stress Testing, Reconnaissance & Data Extraction Redefined</sub>
</p>
