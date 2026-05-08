#!/usr/bin/env node
// Sync design/landing/ from the newest Vetted Design System-*.zip in ~/Downloads.
//
// Usage:
//   npm run sync:design                 # finds newest matching zip
//   npm run sync:design -- /path/to.zip # explicit zip
//
// Extracts Landing Page.html, assets/, and reel/ into design/landing/ verbatim,
// overwriting whatever is there. Run `git diff design/landing` afterward to
// review, then commit if you like the change.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dest = path.join(root, 'design', 'landing');

function entriesOf(zipPath) {
  const r = spawnSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  return r.stdout.split('\n').filter(Boolean);
}

function pickNewestZip() {
  const dir = path.join(os.homedir(), 'Downloads');
  const candidates = fs.readdirSync(dir)
    .filter((f) => /^Vetted Design System(-\d+)?\.zip$/.test(f))
    .map((f) => {
      const p = path.join(dir, f);
      return { p, mtime: fs.statSync(p).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  for (const c of candidates) {
    const e = entriesOf(c.p);
    if (e?.some((x) => /(^|\/)Landing Page\.html$/.test(x))) return c.p;
  }
  return null;
}

const zip = process.argv[2] ?? pickNewestZip();
if (!zip) {
  console.error('sync-design-system: no "Vetted Design System*.zip" containing "Landing Page.html" found in ~/Downloads');
  console.error('  pass an explicit path: npm run sync:design -- /path/to.zip');
  process.exit(1);
}
if (!fs.existsSync(zip)) {
  console.error(`sync-design-system: ${zip} not found`);
  process.exit(1);
}

console.log(`Source: ${zip}`);
console.log(`Target: ${dest}`);

const entries = entriesOf(zip);
if (!entries) {
  console.error('sync-design-system: unzip -Z1 failed');
  process.exit(1);
}
const landingEntry = entries.find((e) => /(^|\/)Landing Page\.html$/.test(e));
if (!landingEntry) {
  console.error('sync-design-system: zip has no "Landing Page.html"');
  console.error('  pass a zip that contains it: npm run sync:design -- /path/to.zip');
  process.exit(1);
}
const prefix = landingEntry.replace(/Landing Page\.html$/, ''); // '' or 'vetted-design-system/'

// Extract into a tempdir, then move the three pieces we care about into dest.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vds-sync-'));
const wanted = [
  `${prefix}Landing Page.html`,
  `${prefix}assets/*`,
  `${prefix}reel/*`,
];
const ext = spawnSync('unzip', ['-o', zip, ...wanted, '-d', tmp], { encoding: 'utf8' });
if (ext.status !== 0) {
  console.error('sync-design-system: unzip extract failed');
  console.error(ext.stderr);
  process.exit(1);
}

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const tmpRoot = path.join(tmp, prefix);
fs.mkdirSync(dest, { recursive: true });

// Replace Landing Page.html
const landingDst = path.join(dest, 'Landing Page.html');
fs.copyFileSync(path.join(tmpRoot, 'Landing Page.html'), landingDst);

// Replace assets/ and reel/ wholesale (so removed files in the zip drop locally)
for (const sub of ['assets', 'reel']) {
  const srcDir = path.join(tmpRoot, sub);
  const dstDir = path.join(dest, sub);
  if (fs.existsSync(srcDir)) {
    rmrf(dstDir);
    copyDir(srcDir, dstDir);
  }
}

rmrf(tmp);

console.log('\nDone. Files updated:');
console.log(`  ${path.relative(root, landingDst)}`);
console.log(`  ${path.relative(root, path.join(dest, 'assets'))}/`);
console.log(`  ${path.relative(root, path.join(dest, 'reel'))}/`);
console.log('\nNext:');
console.log('  git diff design/landing       # review');
console.log('  npm run build                 # smoke-test');
console.log('  git add design/landing && git commit');
