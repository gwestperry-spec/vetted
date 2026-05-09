#!/usr/bin/env node
// Post-build wiring for the public marketing landing page.
//
// After `vite build`:
//   - dist/index.html         — the React SPA (vite emits this)
//   - dist/_assets/*          — the SPA's hashed bundle (assetsDir override)
//
// We need:
//   - dist/index.html         — the static landing page (verbatim source)
//   - dist/app/index.html     — the React SPA, served at /app
//   - dist/assets/*           — the landing's own asset bundle
//   - dist/reel/*             — the reel JSX iframes
//
// This script performs the swap. It is intentionally tiny and dependency-free.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const landingSrc = path.join(root, 'design', 'landing');
const landingHtml = path.join(landingSrc, 'Landing Page.html');
const landingAssets = path.join(landingSrc, 'assets');
const landingReel = path.join(landingSrc, 'reel');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const spaSrc = path.join(dist, 'index.html');
if (!fs.existsSync(spaSrc)) {
  console.error('postbuild-landing: dist/index.html not found — did vite build run?');
  process.exit(1);
}
if (!fs.existsSync(landingHtml)) {
  console.error(`postbuild-landing: ${landingHtml} not found`);
  process.exit(1);
}

// 1. Move SPA index.html → dist/app/index.html
const appDir = path.join(dist, 'app');
fs.mkdirSync(appDir, { recursive: true });
fs.renameSync(spaSrc, path.join(appDir, 'index.html'));

// 2. Copy landing HTML verbatim → dist/index.html
fs.copyFileSync(landingHtml, path.join(dist, 'index.html'));

// 3. Copy landing's assets/ → dist/assets/
copyDir(landingAssets, path.join(dist, 'assets'));

// 4. Copy landing's reel/ → dist/reel/
if (fs.existsSync(landingReel)) {
  copyDir(landingReel, path.join(dist, 'reel'));
}

console.log('postbuild-landing: ok');
console.log('  dist/index.html       → landing (verbatim)');
console.log('  dist/app/index.html   → SPA');
console.log('  dist/assets/          → landing bundle');
console.log('  dist/reel/            → reel iframes');
