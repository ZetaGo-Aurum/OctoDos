/**
 * OctoDos Proxy Engine v3.0
 * Multi-source proxy fetching with health checking and rotation.
 *
 * Created by ZetaGo-Aurum | MIT License
 */
const axios = require('axios');
const chalk = require('chalk');

const PROXY_SOURCES = [
    // HTTP proxies
    'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all',
    'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
    'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
    'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt',
    'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt',
    'https://raw.githubusercontent.com/sunny9577/proxy-scraper/master/proxies.txt',
    'https://raw.githubusercontent.com/mmpx12/proxy-list/master/http.txt',
    'https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW.txt',
    // SOCKS4
    'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks4&timeout=5000&country=all',
    'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks4.txt',
    'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks4.txt',
    // SOCKS5
    'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=5000&country=all',
    'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt',
    'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks5.txt',
];

let httpPool = [];
let socks4Pool = [];
let socks5Pool = [];
let allProxies = [];
let proxyIndex = 0;

async function fetchProxies() {
    const httpSet = new Set();
    const s4Set = new Set();
    const s5Set = new Set();

    // Limit concurrency to prevent Termux/Low-RAM device freezes
    const concurrency = 3;
    for (let i = 0; i < PROXY_SOURCES.length; i += concurrency) {
        const batch = PROXY_SOURCES.slice(i, i + concurrency);
        await Promise.allSettled(batch.map(async (src) => {
            try {
                const resp = await axios.get(src, { timeout: 8000 });
                const lines = resp.data.split('\n').map(l => l.trim()).filter(l => /^\d+\.\d+\.\d+\.\d+:\d+$/.test(l));

                if (src.includes('socks5')) lines.forEach(p => s5Set.add(p));
                else if (src.includes('socks4')) lines.forEach(p => s4Set.add(p));
                else lines.forEach(p => httpSet.add(p));
            } catch (_) { /* source unavailable */ }
        }));
    }

    httpPool = shuffle(Array.from(httpSet));
    socks4Pool = shuffle(Array.from(s4Set));
    socks5Pool = shuffle(Array.from(s5Set));
    allProxies = [...httpPool, ...socks4Pool, ...socks5Pool];

    return allProxies;
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getNextProxy() {
    if (allProxies.length === 0) return null;
    const proxy = allProxies[proxyIndex % allProxies.length];
    proxyIndex++;
    return `http://${proxy}`;
}

function getNextHttpProxy() {
    if (httpPool.length === 0) return null;
    return `http://${httpPool[proxyIndex++ % httpPool.length]}`;
}

function getProxyCount() {
    return allProxies.length;
}

function getProxyStats() {
    return { http: httpPool.length, socks4: socks4Pool.length, socks5: socks5Pool.length, total: allProxies.length };
}

module.exports = { fetchProxies, getNextProxy, getNextHttpProxy, getProxyCount, getProxyStats };
