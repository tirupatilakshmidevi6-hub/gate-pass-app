#!/usr/bin/env node
/**
 * Starts Next.js dev server with NODE_PATH pointing to the project's
 * node_modules directory.
 *
 * Why this is needed: The .next directory is a Windows junction to AppData,
 * so server-side compiled bundles physically live outside the project tree.
 * Node.js resolves require() based on the calling file's real path (after
 * resolving junctions), so walking up the tree from AppData never reaches the
 * project's node_modules. Setting NODE_PATH adds the project's node_modules
 * as an extra search root for every require() in the process — fixing runtime
 * errors like "Cannot find module 'react/jsx-runtime'" from compiled bundles.
 */

const { spawn } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

const child = spawn('next', ['dev', '--webpack'], {
  stdio: 'inherit',
  cwd: projectRoot,
  shell: true,
  env: {
    ...process.env,
    NODE_PATH: path.join(projectRoot, 'node_modules'),
  },
});

child.on('close', (code) => process.exit(code ?? 0));
