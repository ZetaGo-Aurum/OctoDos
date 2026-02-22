#!/usr/bin/env node
/**
 * OctoDos Postinstall — Auto-register 'octodos' as global CLI command
 * Creates a symlink/shim directly without spawning npm link (which freezes).
 *
 * This script runs automatically after `npm install`.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function getGlobalBinDir() {
    // Method 1: npm prefix (most reliable)
    try {
        const prefix = execSync('npm config get prefix', { encoding: 'utf-8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
        if (prefix) {
            const isWindows = process.platform === 'win32';
            const binDir = isWindows ? prefix : path.join(prefix, 'bin');
            if (fs.existsSync(isWindows ? prefix : path.dirname(binDir))) return binDir;
        }
    } catch {}

    // Method 2: npm bin -g
    try {
        const dir = execSync('npm bin -g', { encoding: 'utf-8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
        if (dir && fs.existsSync(path.dirname(dir))) return dir;
    } catch {}

    // Method 3: well-known paths
    if (process.platform !== 'win32') {
        const knownPaths = ['/usr/local/bin', '/usr/bin', `${process.env.HOME}/.npm-global/bin`];
        for (const p of knownPaths) {
            if (fs.existsSync(p)) return p;
        }
    }

    return null;
}

function register() {
    const binDir = getGlobalBinDir();
    if (!binDir) {
        console.log('  [i] Could not detect global npm bin directory. Run "npm link" manually.');
        return;
    }

    const entryFile = path.resolve(__dirname, '..', 'index.js');
    const isWindows = process.platform === 'win32';

    // Ensure index.js has execute permission on Unix
    if (!isWindows) {
        try {
            fs.chmodSync(entryFile, '755');
        } catch {}
    }

    if (isWindows) {
        // Create .cmd shim for Windows
        const cmdShim = path.join(binDir, 'octodos.cmd');
        const shContent = `@ECHO off\r\nGOTO start\r\n:find_dp0\r\nSET dp0=%~dp0\r\nEXIT /b\r\n:start\r\nSETLOCAL\r\nCALL :find_dp0\r\nIF EXIST "%dp0%\\node.exe" (\r\n  SET "_prog=%dp0%\\node.exe"\r\n) ELSE (\r\n  SET "_prog=node"\r\n  SET PATHEXT=%PATHEXT:;.JS;=;%\r\n)\r\nendLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "${entryFile}" %*\r\n`;
        try {
            fs.writeFileSync(cmdShim, shContent);
            console.log(`  ✅ Registered "octodos" as global command`);
            console.log(`     Location: ${cmdShim}`);
        } catch (e) {
            console.log(`  [i] Could not auto-register (${e.code || e.message}). Run "npm link" manually.`);
        }
    } else {
        // Unix: create symlink
        const linkPath = path.join(binDir, 'octodos');
        try {
            // Remove existing link/file if present
            try { fs.unlinkSync(linkPath); } catch {}
            fs.symlinkSync(entryFile, linkPath);
            // Ensure symlink target is executable
            try { fs.chmodSync(entryFile, '755'); } catch {}
            console.log(`  ✅ Registered "octodos" as global command`);
            console.log(`     Symlink: ${linkPath} -> ${entryFile}`);
        } catch (e) {
            if (e.code === 'EACCES') {
                console.log('  [i] Permission denied for auto-register. To register globally, run:');
                console.log('      sudo npm link');
                console.log('      # or: sudo ln -sf ' + entryFile + ' ' + linkPath);
            } else {
                console.log(`  [i] Could not auto-register (${e.code || e.message}). Run "npm link" manually.`);
            }
        }
    }
}

// Only run if this is a local install (not from npm registry)
const isDirectInstall = !__dirname.includes('node_modules');
if (isDirectInstall) {
    register();
}
