<div align="center">

```
  ██████╗  ██████╗████████╗ ██████╗ ██████╗  ██████╗ ███████╗
  ██╔═══██╗██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗██╔═══██╗██╔════╝
  ██║   ██║██║        ██║   ██║   ██║██║  ██║██║   ██║███████╗
  ██║   ██║██║        ██║   ██║   ██║██║  ██║██║   ██║╚════██║
  ╚██████╔╝╚██████╗   ██║   ╚██████╔╝██████╔╝╚██████╔╝███████║
   ╚═════╝  ╚═════╝   ╚═╝    ╚═════╝ ╚═════╝  ╚═════╝ ╚══════╝
```

# OctoDos v1.0.0

### 🐙 Professional DDoS Resilience Auditor — 20 Coordinated Methods

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16.0-green.svg)](https://nodejs.org)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)](CHANGELOG.md)
[![Methods](https://img.shields.io/badge/Methods-20-red.svg)](CHANGELOG.md)
[![Author](https://img.shields.io/badge/Author-ZetaGo--Aurum-gold.svg)](CREDITS.md)

**A professional-grade, multi-vector DDoS resilience auditor with 20 coordinated tentacle methods for authorized penetration testing.**

</div>

---

> [!CAUTION]
> **OctoDos is a DANGEROUS tool.** Capable of causing **real damage** to systems. Use ONLY with explicit written authorization. Unauthorized use is a **criminal offense** under CFAA §1030, CMA §3, UU ITE Pasal 33, and more. See [Terms of Service](TERMS_OF_SERVICE.md) for full legal references across 10 jurisdictions.

---

## ⚡ Features

| Feature | Description |
|---------|-------------|
| **REAL IMPACT** | Every method sends **real network traffic** — actual HTTP requests, raw TCP/UDP packets. Not a simulation. |
| 🐙 **Octopus Tentacle Engine** | 20 methods attack simultaneously — coordinated multi-vector storm |
| 🔥 **20 Attack Methods** | 10 L7 + 10 L4 methods for comprehensive application & transport layer coverage |
| **No Thread Limit** | Unlimited threads — use 100, 5000, or 50000. Your hardware is the only limit. |
| 🛡️ **Anti-WAF Engine** | 30+ User-Agents, cookie simulation, Cloudflare bypass, header mutation |
| 🔄 **Proxy Rotation** | 8,000+ proxies (HTTP/SOCKS4/SOCKS5) from 14 sources |
| 🔍 **Deep Recon** | DNS/MX/SPF/CT lookup, 99+ subdomains, 11 WAF detections |
| 📊 **Threat Scoring** | 0-100 risk assessment with hardening recommendations |
| 📂 **Results History** | JSON audit history in `/results` — never lose a report |
| 📝 **Audit Logger** | Forensic-grade timestamped `.log` + `.json` exports |
| 🎨 **Interactive Menu** | Professional terminal UI with gradients and ASCII art |
| ⚡ **Global CLI** | `octodos <url> <threads> <duration> [--intensity]` from any directory |

---

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/ZetaGo-Aurum/OctoDos.git
cd OctoDos

# Install dependencies
npm install

# Register as global CLI command (optional)
npm link
```

After `npm link`, run **`octodos`** from any directory. Or use `node index.js` directly.

### Requirements
- **Node.js** ≥ 16.0
- **npm** ≥ 8.0
- Internet connection (for proxy fetching)

> [!WARNING]
> **CPU & RAM Warning:** The higher the thread count, the higher the CPU and RAM usage. At 5,000+ threads your system may slow down. At 10,000+ threads all CPU cores will be saturated. At 50,000+ threads your system **WILL freeze**. OctoDos displays real-time CPU/RAM warnings before each assault.

---

## 📖 Usage

### Interactive Mode
```bash
octodos
```

Menu options:
- ⚡ **Full Audit** — Recon + 20-Method Attack + Defense Report
- 🔍 **Recon Only** — Deep reconnaissance scan
- 🚀 **Quick Audit** — 10-second stress test
- 🛡️ **Defense Report** — Recommendations without attacking
- 📂 **Results History** — View past audit results
- 📋 **View Methods** — See all 20 methods

### CLI Mode
```bash
octodos <url/ip> <threads> <duration> [--intensity]

# Examples:
octodos https://example.com 50 30                # L7 audit (default --med)
octodos https://localhost:3000 5000 120 --high    # L7 with 2x threads
octodos 192.168.1.1:80 10000 60 --crit            # L4 with 3x threads
octodos https://target.com 200 300 --auto          # Auto-adaptive 1.5x
```

### Intensity Flags

| Flag | Multiplier | Description |
|------|-----------|-------------|
| `--low` | 0.5x | Conservative — safe testing |
| `--med` | 1x | Standard pentest (default) |
| `--high` | 2x | Aggressive — high impact |
| `--crit` | 3x | Maximum firepower — full assault |
| `--auto` | 1.5x | Adaptive — balanced aggression |

> **Example:** `octodos https://localhost:3000 5000 120 --high` uses **5000 × 2 = 10,000 effective threads**

### Other Flags
```bash
octodos --help        # Show usage
octodos --version     # Show version
octodos --results     # View audit history
octodos --methods     # Show all 20 methods
```

---

## 🐙 20 Attack Methods

### Layer 7 — Application (10 Methods)

| # | Method | Technique | Risk |
|---|--------|-----------|------|
| 1 | **HTTP-FLOOD** | Multi-method GET/POST/HEAD with evasion headers | 🔴 HIGH |
| 2 | **SLOWLORIS** | Partial header connection exhaustion | 🔴 HIGH |
| 3 | **RUDY** | Slow POST body transmission (R-U-Dead-Yet) | 🟡 MED |
| 4 | **HTTP-DESYNC** | CL.TE request smuggling confusion | 🔴 CRIT |
| 5 | **CHUNKED** | Slow chunked Transfer-Encoding abuse | 🟡 MED |
| 6 | **BROWSER-EMU** | Full browser fingerprint emulation | 🟡 MED |
| 7 | **CACHE-BUST** | Cache-busting random query + no-cache headers | 🔴 HIGH |
| 8 | **MULTIPART** | Multipart form-data boundary + fake file abuse | 🔴 HIGH |
| 9 | **HEAD-FLOOD** | HEAD-only (lightweight but full server processing) | 🟡 MED |
| 10 | **PIPELINE** | HTTP pipelining multi-request abuse | 🔴 HIGH |

### Layer 4 — Transport (10 Methods)

| # | Method | Technique | Risk |
|---|--------|-----------|------|
| 1 | **TCP-FLOOD** | Rapid connect + multi-frame data push | 🔴 HIGH |
| 2 | **UDP-FLOOD** | Volumetric UDP bombardment (1472B) | 🔴 HIGH |
| 3 | **SYN-STORM** | Half-open connection flooding | 🔴 CRIT |
| 4 | **SLOWREAD** | Slow read buffer exhaustion | 🟡 MED |
| 5 | **CONN-EXHAUST** | Connection pool exhaustion + keepalive | 🔴 HIGH |
| 6 | **FRAG-ATTACK** | Fragmented UDP burst simulation | 🟡 MED |
| 7 | **ACK-FLOOD** | TCP ACK flooding (bypasses stateless FW) | 🔴 HIGH |
| 8 | **RST-FLOOD** | Forced TCP RST disruption | 🔴 HIGH |
| 9 | **XMAS-FLOOD** | TCP XMAS (all flags) filter confusion | 🟡 MED |
| 10 | **NULL-FLOOD** | Zero-flag TCP firewall bypass | 🟡 MED |

### Tentacle Coordination
All methods attack **simultaneously** with weighted thread distribution:
```
  🐙 Tentacle Distribution:
    ▸ HTTP-FLOOD    25% threads (primary volumetric)
    ▸ UDP-FLOOD     15% threads (amplification)
    ▸ SYN-STORM     15% threads (state exhaustion)
    ▸ CACHE-BUST    10% threads (CDN bypass)
    ▸ ... (remaining methods weighted and coordinated)
```

---

## 🏗️ Architecture

```
octodos/
├── index.js              # Interactive menu + CLI entry point
├── lib/
│   ├── l7.js             # 10-method L7 tentacle engine
│   ├── l4.js             # 10-method L4 tentacle engine
│   ├── antiwaf.js        # Anti-WAF evasion engine
│   ├── proxy.js          # Multi-source proxy rotation
│   ├── recon.js          # Deep reconnaissance engine
│   ├── auditor.js        # Defense recommendation engine
│   ├── banner.js         # Terminal UI rendering
│   ├── logger.js         # Forensic audit logger
│   ├── results.js        # Results history manager
│   └── methods.js        # 20-method registry
├── results/              # JSON audit history (auto-created)
├── logs/                 # Timestamped audit logs (auto-created)
├── LICENSE               # MIT License
├── TERMS_OF_SERVICE.md   # Full legal references (10 jurisdictions)
├── CREDITS.md            # Project credits
├── SECURITY.md           # Vulnerability reporting
├── CONTRIBUTING.md       # Contribution guidelines
├── CHANGELOG.md          # Version history
├── CODE_OF_CONDUCT.md    # Community standards
└── package.json          # v1.0.0 with global CLI bin
```

---

## 📂 Results History

Every audit automatically saves a JSON report in `/results`:

```
results/
├── audit_https_example_com_2026-02-22T10-30-15.json
├── audit_192_168_1_1_80_2026-02-22T11-00-42.json
└── ...
```

View history: `octodos --results` or from interactive menu → **View Audit Results History**

Each result contains: target, mode, duration, threads, recon data, audit stats, threat level, and methods used.

---

## ⚠️ Legal Disclaimer

> **OctoDos is for AUTHORIZED PENETRATION TESTING ONLY.**
>
> Unauthorized use violates:
> - **CFAA § 1030(a)(5)(A)** (US) — up to 10-20 years
> - **Computer Misuse Act § 3** (UK) — up to 10 years
> - **UU ITE Pasal 33** (Indonesia) — up to 10 years + Rp10B
> - **EU Directive 2013/40 Art. 4** — at least 3-5 years
> - And 6 more jurisdictions detailed in [Terms of Service](TERMS_OF_SERVICE.md)

---

## 📜 License

[MIT License](LICENSE) — Copyright © 2026 ZetaGo-Aurum

---

<div align="center">

**🐙 OctoDos v1.0.0 — Stay Vigilant, Stay Secure**

*Created by [ZetaGo-Aurum](CREDITS.md)*

</div>
