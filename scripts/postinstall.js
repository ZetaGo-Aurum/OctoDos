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
    try {
        return execSync('npm bin -g', { encoding: 'utf-8', timeout: 10000 }).trim();
    } catch {
        return null;
    }
}

function register() {
    const binDir = getGlobalBinDir();
    if (!binDir) {
        console.log('  [i] Could not detect global npm bin directory. Run "npm link" manually.');
        return;
    }

    const entryFile = path.resolve(__dirname, '..', 'index.js');
    const isWindows = process.platform === 'win32';

    if (isWindows) {
        // Create .cmd shim for Windows
        const cmdShim = path.join(binDir, 'octodos.cmd');
        const psShim = path.join(binDir, 'octodos.ps1');
        const shContent = `@ECHO off\r\nGOTO start\r\n:find_dp0\r\nSET dp0=%~dp0\r\nEXIT /b\r\n:start\r\nSETLOCAL\r\nCALL :find_dp0\r\nIF EXIST "%dp0%\\node.exe" (\r\n  SET "_prog=%dp0%\\node.exe"\r\n) ELSE (\r\n  SET "_prog=node"\r\n  SET PATHEXT=%PATHEXT:;.JS;=;%\r\n)\r\nendLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "${entryFile}" %*\r\n`;
        const psContent = `#!/usr/bin/env pwsh\r\n$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent\r\n$exe=""\r\nif ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {\r\n  $exe=".exe"\r\n}\r\n$ret=0\r\nif (Test-Path "$basedir/node$exe") {\r\n  if ($MyInvocation.ExpectingInput) {\r\n    $input | & "$basedir/node$exe"  "${entryFile}" $args\r\n  } else {\r\n    & "$basedir/node$exe"  "${entryFile}" $args\r\n  }\r\n  $ret=$LASTEXITCODE\r\n} else {\r\n  if ($MyInvocation.ExpectingInput) {\r\n    $input | & "node$exe"  "${entryFile}" $args\r\n  } else {\r\n    & "node$exe"  "${entryFile}" $args\r\n  }\r\n  $ret=$LASTEXITCODE\r\n}\r\nexit $ret\r\n`;
        try {
            fs.writeFileSync(cmdShim, shContent);
            fs.writeFileSync(psShim, psContent);
            console.log(`  ✅ Registered "octodos" as global command`);
            console.log(`     Location: ${cmdShim}`);
        } catch (e) {
            console.log(`  [i] Could not auto-register (${e.code || e.message}). Run "npm link" manually.`);
        }
    } else {
        // Unix: create symlink
        const linkPath = path.join(binDir, 'octodos');
        try {
            // Remove existing link if present
            try { fs.unlinkSync(linkPath); } catch {}
            fs.symlinkSync(entryFile, linkPath);
            fs.chmodSync(linkPath, '755');
            console.log(`  ✅ Registered "octodos" as global command`);
            console.log(`     Location: ${linkPath}`);
        } catch (e) {
            if (e.code === 'EACCES') {
                console.log('  [i] Permission denied. To register globally, run:');
                console.log('      sudo npm link');
            } else {
                console.log(`  [i] Could not auto-register (${e.code || e.message}). Run "npm link" manually.`);
            }
        }
    }
}

// Only run if this is a local install (not from npm registry)
// Check if we're inside node_modules (registry install) vs direct clone
const isDirectInstall = !__dirname.includes('node_modules');
if (isDirectInstall) {
    register();
} else {
    // Installed from npm registry — skip auto-link
}
