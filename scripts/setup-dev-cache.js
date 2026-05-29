#!/usr/bin/env node
/**
 * Permanent fix for "EPERM: operation not permitted, unlink .next" on Windows
 * when the project lives inside an OneDrive-synced folder.
 *
 * Root cause: OneDrive holds file locks on .next files while uploading them.
 * Next.js dev server tries to delete/replace those locked files → EPERM.
 *
 * Fix: Create a Windows junction point at .next that points to a real
 * directory under %LOCALAPPDATA% (outside OneDrive's sync scope).
 * OneDrive does not follow junction points, so it never locks the build files.
 * Next.js sees .next as normal and works without any changes.
 *
 * Run automatically via the "predev" npm script before every `npm run dev`.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const projectRoot = path.join(__dirname, '..');
const nextInProject = path.join(projectRoot, '.next');

// Build output goes here — outside OneDrive, never synced
const buildTarget = path.join(
  os.homedir(), 'AppData', 'Local', 'gate-pass-app-next-cache'
);

// Ensure target directory exists
fs.mkdirSync(buildTarget, { recursive: true });

// If .next is already a junction/symlink pointing to the right place, skip
if (fs.existsSync(nextInProject)) {
  try {
    const stat = fs.lstatSync(nextInProject);
    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(nextInProject);
      if (target === buildTarget) {
        console.log(`[predev] .next junction already set → ${buildTarget}`);
        process.exit(0);
      }
      // Wrong target — remove and recreate
      fs.rmSync(nextInProject, { recursive: true, force: true });
    } else {
      // Regular directory — remove it so we can create the junction
      fs.rmSync(nextInProject, { recursive: true, force: true });
      console.log('[predev] Removed regular .next directory');
    }
  } catch {
    // On Windows, lstatSync may throw for junction points in edge cases
    // Try to remove and recreate
    try {
      execSync(`rd /s /q "${nextInProject}"`, { shell: 'cmd.exe', stdio: 'pipe' });
    } catch { /* ignore */ }
  }
}

// Create the junction (does NOT require admin rights on Windows)
if (process.platform === 'win32') {
  execSync(`mklink /J "${nextInProject}" "${buildTarget}"`, {
    shell: 'cmd.exe',
    stdio: 'pipe',
  });
  console.log(`[predev] ✓ Junction created: .next → ${buildTarget}`);
} else {
  // macOS / Linux fallback: regular symlink
  fs.symlinkSync(buildTarget, nextInProject, 'dir');
  console.log(`[predev] ✓ Symlink created: .next → ${buildTarget}`);
}
