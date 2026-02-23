# 🐙 OctoDos + OctoRecon Suite v2.0.0

> **Professional DDoS Resilience Auditor & Deep Reconnaissance Engine**
> Created by [ZetaGo-Aurum](https://github.com/ZetaGo-Aurum) | MIT License

---

## ⚡ Two Tools, One Repo

| Tool | Purpose | Methods |
|------|---------|---------|
| **OctoDos** | DDoS Resilience Stress Testing | 20 attack methods (L7 + L4) |
| **OctoRecon** | Deep Reconnaissance & Origin IP Discovery | 8 recon modules |

---

## 🚀 Installation

```bash
# Clone
git clone https://github.com/ZetaGo-Aurum/OctoDos.git
cd OctoDos

# Install
npm install

# Register global commands
npm link
```

**Supports:** Node.js 16+, Windows, Linux, macOS, **Termux (Android)**

---

## 🐙 OctoDos — DDoS Resilience Auditor

### Quick Start
```bash
# Interactive menu
octodos

# Direct CLI mode
octodos <target> <threads> <duration> [--intensity]

# Examples
octodos https://example.com 100 60
octodos https://target.com 500 120 --high
octodos 192.168.1.1:80 1000 60 --crit
```

### Intensity Flags
| Flag | Multiplier | Description |
|------|-----------|-------------|
| `--low` | 0.5x | Conservative |
| `--med` | 1x | Standard (default) |
| `--high` | 2x | Aggressive |
| `--crit` | 3x | Maximum firepower |
| `--auto` | 1.5x | Adaptive |

### L7 Methods (10)
`HTTP-FLOOD` · `SLOWLORIS` · `RUDY` · `HTTP-DESYNC` · `CHUNKED` · `BROWSER-EMU` · `CACHE-BUST` · `MULTIPART` · `HEAD-FLOOD` · `PIPELINE`

### L4 Methods (10)
`TCP-FLOOD` · `UDP-FLOOD` · `SYN-STORM` · `SLOWREAD` · `CONN-EXHAUST` · `FRAG-ATTACK` · `ACK-FLOOD` · `RST-FLOOD` · `XMAS-FLOOD` · `NULL-FLOOD`

### Features
- 🔥 **Burst Mode** — 10x concurrent fire chains per thread for maximum RPS
- 🛡️ **Anti-WAF** — Realistic Chrome/Firefox browser fingerprints with Sec-Ch-Ua pairing
- 🔄 **Proxy Tunneling** — True `HttpsProxyAgent` tunnels through 8K+ rotating proxies
- 🧠 **Smart Agents** — Dynamic socket pooling based on thread count
- 💀 **Crash Shield** — Immune to OS network errors during flooding
- 📊 **Live Stats** — Real-time RPS, success rate, and connection monitoring
- 📝 **Audit Logs** — Forensic-grade timestamped JSON logs

---

## 🔍 OctoRecon — Deep Reconnaissance Engine

### Quick Start
```bash
# Basic usage
octorecon <target> <parameter> [--intensity]

# Examples
octorecon google.com global --deep
octorecon example.com root --normal
octorecon 192.168.1.1 server
octorecon https://target.com all --deep
```

### Parameters
| Parameter | Modules | Description |
|-----------|---------|-------------|
| `global` | DNS, Subdomains, WAF, Headers, Tech, SSL | General reconnaissance |
| `root` | DNS, Subs, WAF, Origin IP, SSL, Ports, Headers, Tech | Deep scan to the root |
| `server` | DNS, Origin IP, SSL, Ports, WAF | Server-side only |
| `client` | Headers, Tech, SSL | Client-side only |
| `both` | All modules combined | Global + Root combined |
| `all` | Every available module | Maximum coverage |
| `.` | Headers, Tech, WAF | Quick scan |

### Intensity Flags
| Flag | Description |
|------|-------------|
| `--light` | Fast scan, fewer checks |
| `--normal` | Standard scan (default) |
| `--deep` | Maximum depth — more subdomains, more ports |

### Recon Modules (8)
| Module | Capabilities |
|--------|-------------|
| 📡 **DNS** | A, AAAA, MX, NS, TXT, SOA, CNAME, SRV, Reverse DNS |
| 🌐 **Subdomains** | 50+ common + 80 deep subdomain brute-force |
| 🛡️ **WAF Detect** | Cloudflare, Akamai, Sucuri, AWS WAF, Imperva, F5, Fastly, CloudFront, DDoS-Guard |
| 🎯 **Origin IP** | DNS history, MX bypass, SSL SAN, IPv6, Origin subdomain probing |
| 🔒 **SSL/TLS** | Protocol, cipher, certificate chain, SAN, expiry, fingerprint |
| 📋 **Headers** | HSTS, CSP, X-Frame, XSS-Protection, Referrer-Policy audit |
| 🚪 **Ports** | Top 20-40 TCP port scan with batch concurrency |
| ⚙️ **Tech Stack** | Server, framework, CMS, CSS library detection |

---

## ⚠️ Legal Disclaimer

This tool is for **authorized penetration testing only**. Unauthorized use against systems you do not own or have explicit written permission to test is **illegal** and a **criminal offense**.

By using OctoDos or OctoRecon, you agree to the [Terms of Service](TERMS_OF_SERVICE.md).

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

**Created with 🐙 by [ZetaGo-Aurum](https://github.com/ZetaGo-Aurum)**
