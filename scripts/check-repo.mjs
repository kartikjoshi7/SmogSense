import { execSync } from 'node:child_process';
import { statSync } from 'node:fs';

const LIMIT_MB = 9;
const MAX_TRACKED_SIZE_BYTES = LIMIT_MB * 1024 * 1024;
let exitCode = 0;

function fail(message) {
  console.error(`FAIL: ${message}`);
  exitCode = 1;
}

function pass(message) {
  console.log(`OK:   ${message}`);
}

// 1. Check number of local branches
const branches = execSync('git branch', { encoding: 'utf-8' })
  .split('\n')
  .map((b) => b.replace(/^\*\s*/, '').trim())
  .filter(Boolean);

if (branches.length > 1) {
  fail(`Found ${branches.length} local branches (expected 1): ${branches.join(', ')}`);
} else {
  pass(`Single local branch: ${branches[0] ?? 'main'}`);
}

// 2. Check total size of tracked files
const trackedFiles = execSync('git ls-files', { encoding: 'utf-8' }).split('\n').filter(Boolean);

/** Size in bytes; 0 for a tracked file that was deleted from the working tree. */
const sizeOf = (file) => statSync(file, { throwIfNoEntry: false })?.size ?? 0;
const totalSize = trackedFiles.reduce((sum, file) => sum + sizeOf(file), 0);

const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
if (totalSize > MAX_TRACKED_SIZE_BYTES) {
  fail(`Tracked files total ${sizeMB} MB (limit: ${LIMIT_MB} MB)`);
} else {
  pass(`Tracked files total ${sizeMB} MB (limit: ${LIMIT_MB} MB)`);
}

// 3. Check for tracked .env files (other than .env.example)
const trackedEnvFiles = trackedFiles.filter(
  (f) => /(?:^|\/)\.env(?:\..+)?$/.test(f) && !f.endsWith('.env.example'),
);

if (trackedEnvFiles.length > 0) {
  fail(`Tracked .env files found: ${trackedEnvFiles.join(', ')}`);
} else {
  pass('No tracked .env files (except .env.example)');
}

console.log('');
if (exitCode === 0) {
  console.log('All repo checks passed.');
} else {
  console.log('Some repo checks failed.');
}

process.exit(exitCode);
