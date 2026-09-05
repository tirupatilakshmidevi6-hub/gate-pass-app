#!/usr/bin/env node
/**
 * Permanent fix for OneDrive-related Node.js errors on Windows.
 *
 * Problems solved:
 *   1. "EPERM: operation not permitted, unlink .next"
 *      OneDrive locks .next files while uploading → Next.js can't rebuild.
 *      Fix: Junction .next → %LOCALAPPDATA%/gate-pass-app-next-cache
 *           (OneDrive never follows junctions, so it never sees those files.)
 *
 *   2. "UNKNOWN: unknown error, read" from node_modules
 *      OneDrive Files On-Demand makes some node_modules files cloud-only
 *      (placeholder on disk, real bytes in the cloud). Node.js can't read them.
 *      Fix: attrib -U +P on the node_modules folder forces OneDrive to keep
 *           every file fully downloaded locally (pinned = always available offline).
 *           We cannot junction node_modules because npm removes junctions during
 *           `npm install --reify`, which would recreate a real directory in OneDrive.
 *
 * Run automatically via the "predev" npm script before every `npm run dev`.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const projectRoot = path.join(__dirname, '..');

// ── 1. Junction .next → outside OneDrive ─────────────────────────────────────

const nextInProject = path.join(projectRoot, '.next');
const nextTarget = path.join(os.homedir(), 'AppData', 'Local', 'gate-pass-app-next-cache');

fs.mkdirSync(nextTarget, { recursive: true });

if (fs.existsSync(nextInProject)) {
  try {
    const stat = fs.lstatSync(nextInProject);
    if (stat.isSymbolicLink()) {
      const current = fs.readlinkSync(nextInProject);
      if (current === nextTarget) {
        console.log(`[predev] .next junction already correct → ${nextTarget}`);
      } else {
        fs.rmSync(nextInProject, { recursive: true, force: true });
        createJunction(nextInProject, nextTarget);
      }
    } else {
      // Regular directory — remove and replace with junction
      try { fs.rmSync(nextInProject, { recursive: true, force: true }); } catch {
        try { execSync(`rd /s /q "${nextInProject}"`, { shell: 'cmd.exe', stdio: 'pipe' }); } catch { /* ignore */ }
      }
      createJunction(nextInProject, nextTarget);
    }
  } catch {
    try { execSync(`rd /s /q "${nextInProject}"`, { shell: 'cmd.exe', stdio: 'pipe' }); } catch { /* ignore */ }
    createJunction(nextInProject, nextTarget);
  }
} else {
  createJunction(nextInProject, nextTarget);
}

function createJunction(link, target) {
  if (process.platform === 'win32') {
    execSync(`mklink /J "${link}" "${target}"`, { shell: 'cmd.exe', stdio: 'pipe' });
  } else {
    fs.symlinkSync(target, link, 'dir');
  }
  console.log(`[predev] ✓ Junction created: .next → ${target}`);
}

// ── 2. Pin node_modules so OneDrive keeps all files available offline ─────────

if (process.platform === 'win32') {
  const nodeModulesPath = path.join(projectRoot, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    try {
      // -U removes "Unpinned" (cloud-only) attribute; +P sets "Pinned" (always local)
      execSync(`attrib -U +P "${nodeModulesPath}" /S /D`, {
        shell: 'cmd.exe',
        stdio: 'pipe',
      });
      console.log('[predev] ✓ node_modules pinned — OneDrive will keep all files local');
    } catch {
      // attrib fails silently on non-OneDrive drives — that is fine
      console.log('[predev] node_modules attrib skipped (not an OneDrive path or no cloud files)');
    }
  }
}
