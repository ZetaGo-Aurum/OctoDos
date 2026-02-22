/**
 * OctoDos Method Registry v1.0.0 — 20 Total Methods
 * 10 L7 + 10 L4 coordinated tentacle methods.
 *
 * Created by ZetaGo-Aurum | MIT License
 */

const L7_METHODS = [
    { id: 'HTTP-FLOOD', name: 'HTTP Flood', description: 'Multi-method randomized GET/POST/HEAD/PUT/PATCH/DELETE with evasion', risk: 'HIGH', weight: 25, category: 'volumetric', techniques: ['Header Randomization', 'Method Rotation', 'Path Obfuscation', 'Cookie Sim'] },
    { id: 'SLOWLORIS', name: 'Slowloris', description: 'Partial headers keep connections alive, exhausting server pool', risk: 'HIGH', weight: 10, category: 'connection-exhaustion', techniques: ['Partial Headers', 'Keep-Alive Abuse', 'X-Header Dripping'] },
    { id: 'RUDY', name: 'R-U-Dead-Yet', description: 'Slow POST body byte-by-byte with huge Content-Length', risk: 'MEDIUM', weight: 8, category: 'slow-rate', techniques: ['Slow POST', 'Content-Length Mismatch', 'Byte Drain'] },
    { id: 'HTTP-DESYNC', name: 'HTTP Desync', description: 'CL.TE request smuggling to confuse proxies and WAFs', risk: 'CRITICAL', weight: 10, category: 'protocol-abuse', techniques: ['CL.TE Desync', 'TE.CL Desync', 'Pipeline Confusion'] },
    { id: 'CHUNKED', name: 'Chunked Abuse', description: 'Slow chunked Transfer-Encoding to hold connections open', risk: 'MEDIUM', weight: 7, category: 'slow-rate', techniques: ['Slow Chunks', 'Infinite Chunking', 'Zero-Length Chunks'] },
    { id: 'BROWSER-EMU', name: 'Browser Emulation', description: 'Full browser fingerprint + Sec-Ch-Ua + Sec-Fetch headers', risk: 'MEDIUM', weight: 10, category: 'evasion', techniques: ['Full Browser Headers', 'TLS Fingerprint', 'Referer Spoofing'] },
    { id: 'CACHE-BUST', name: 'Cache Buster', description: 'Random query params + no-cache headers bypass CDN caches', risk: 'HIGH', weight: 10, category: 'volumetric', techniques: ['Cache-Control Bypass', 'ETag Randomization', 'UUID Params'] },
    { id: 'MULTIPART', name: 'Multipart Flood', description: 'Multipart form-data with fake files + many fields', risk: 'HIGH', weight: 8, category: 'protocol-abuse', techniques: ['Boundary Abuse', 'Fake Uploads', 'Field Explosion'] },
    { id: 'HEAD-FLOOD', name: 'HEAD Flood', description: 'HEAD-only requests (no body transfer but full server processing)', risk: 'MEDIUM', weight: 7, category: 'volumetric', techniques: ['Head-Only', 'Fast Cycle', 'Low Bandwidth'] },
    { id: 'PIPELINE', name: 'Pipeline Abuse', description: 'HTTP pipelining — multiple requests per single TCP connection', risk: 'HIGH', weight: 5, category: 'protocol-abuse', techniques: ['Multi-Request', 'Connection Reuse', 'Pipeline Overload'] },
];

const L4_METHODS = [
    { id: 'TCP-FLOOD', name: 'TCP Flood', description: 'Rapid TCP connections with multi-frame data push', risk: 'HIGH', weight: 20, category: 'volumetric', techniques: ['Multi-Frame Push', 'Random Payloads', 'Connection Recycling'] },
    { id: 'UDP-FLOOD', name: 'UDP Flood', description: 'Volumetric UDP bombardment with 1472B payloads', risk: 'HIGH', weight: 15, category: 'volumetric', techniques: ['Max-Size Payloads', 'Random Ports', 'Amplification'] },
    { id: 'SYN-STORM', name: 'SYN Storm', description: 'Half-open connections exhausting backlog queue', risk: 'CRITICAL', weight: 15, category: 'protocol-abuse', techniques: ['Half-Open', 'Backlog Exhaustion', 'Rapid Reset'] },
    { id: 'SLOWREAD', name: 'Slow Read', description: 'Connects and reads extremely slowly, forcing buffer allocation', risk: 'MEDIUM', weight: 7, category: 'slow-rate', techniques: ['Buffer Exhaustion', 'Window Throttling', 'Pause-Resume'] },
    { id: 'CONN-EXHAUST', name: 'Connection Exhaust', description: 'Holds connections with tiny keepalive bytes', risk: 'HIGH', weight: 7, category: 'connection-exhaustion', techniques: ['Persistent Hold', 'Keepalive Bytes', 'Pool Drain'] },
    { id: 'FRAG-ATTACK', name: 'Fragment Attack', description: 'Tiny fragmented UDP packets in bursts', risk: 'MEDIUM', weight: 8, category: 'volumetric', techniques: ['Tiny Fragments', 'Burst Mode', 'Reassembly Overload'] },
    { id: 'ACK-FLOOD', name: 'ACK Flood', description: 'TCP ACK packet flooding bypasses stateless firewalls', risk: 'HIGH', weight: 8, category: 'volumetric', techniques: ['ACK Bursts', 'Flag Manipulation', 'Stateless Bypass'] },
    { id: 'RST-FLOOD', name: 'RST Flood', description: 'Forced TCP reset flooding disrupts connection tracking', risk: 'HIGH', weight: 8, category: 'protocol-abuse', techniques: ['Forced RST', 'Connection Disruption', 'Table Pollution'] },
    { id: 'XMAS-FLOOD', name: 'XMAS Flood', description: 'TCP XMAS packets (all flags) confuse packet filters', risk: 'MEDIUM', weight: 6, category: 'protocol-abuse', techniques: ['All-Flags Set', 'Filter Confusion', 'IDS Evasion'] },
    { id: 'NULL-FLOOD', name: 'NULL Flood', description: 'Zero-flag TCP packets bypass many firewall rules', risk: 'MEDIUM', weight: 6, category: 'protocol-abuse', techniques: ['Zero Flags', 'Firewall Bypass', 'Rule Confusion'] },
];

function getAllMethods() { return { l7: L7_METHODS, l4: L4_METHODS }; }
function getMethodCount() { return L7_METHODS.length + L4_METHODS.length; }
function getMethodById(id) { return [...L7_METHODS, ...L4_METHODS].find(m => m.id === id); }

module.exports = { L7_METHODS, L4_METHODS, getAllMethods, getMethodCount, getMethodById };
