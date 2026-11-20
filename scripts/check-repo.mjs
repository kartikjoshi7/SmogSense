import { execSync } from 'node:child_process';
import { statSync } from 'node:fs';

const MAX_TRACKED_SIZE_BYTES = 9 * 1024 * 1024; // 9 MB
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
  .map((b) => b.trim())
  .filter(Boolean);

if (branches.length > 1) {
  fail(`Found ${branches.length} local branches (expected 1): ${branches.join(', ')}`);
} else {
  pass(`Single local branch: ${branches[0] ?? 'main'}`);
}

// 2. Check total size of tracked files
const trackedFiles = execSync('git ls-files', { encoding: 'utf-8' }).split('\n').filter(Boolean);

let totalSize = 0;
for (const file of trackedFiles) {
  try {
    totalSize += statSync(file).size;
  } catch {
    // File may have been deleted but still tracked
  }
}

const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
if (totalSize > MAX_TRACKED_SIZE_BYTES) {
  fail(`Tracked files total ${sizeMB} MB (limit: 9 MB)`);
} else {
  pass(`Tracked files total ${sizeMB} MB (limit: 9 MB)`);
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
