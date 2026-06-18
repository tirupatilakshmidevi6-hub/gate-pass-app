#!/usr/bin/env node
/**
 * Production build wrapper — mirrors run-dev.js.
 *
 * Why this is needed: when `predev` runs, it creates a Windows junction
 * at .next pointing to %LOCALAPPDATA%/gate-pass-app-next-cache (outside
 * OneDrive). The junction persists between sessions, so `next build` also
 * writes compiled route bundles into that AppData directory.
 *
 * During the "Collecting page data" phase, Next.js executes those compiled
 * bundles from their physical AppData path. Node.js module resolution walks
 * up from that path and never reaches the project's node_modules (which lives
 * under OneDrive). Any require() inside the bundle — including Next.js's own
 * runtime files — fails with "Cannot find module".
 *
 * Setting NODE_PATH to the project's node_modules directory adds it as an
 * extra module search root for every require() in the process, fixing
 * resolution for bundles executing from AppData.
 *
 * On Linux / Vercel there is no junction and no AppData path, so this
 * setting is harmless but still correct.
 */

const { spawn } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

const child = spawn('next', ['build', '--webpack'], {
  stdio: 'inherit',
  cwd: projectRoot,
  shell: true,
  env: {
    ...process.env,
    NODE_PATH: path.join(projectRoot, 'node_modules'),
  },
});

child.on('close', (code) => process.exit(code ?? 0));
