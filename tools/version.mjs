// Sube el número de versión (js/version.js) en cada commit. Lo llama .githooks/pre-commit.
// Si el commit ya trae un cambio de versión hecho a mano, lo respeta.
// Activar en un clon nuevo: git config core.hooksPath .githooks
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const FILE = 'js/version.js';
const sh = (c) => execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const staged = sh('git diff --cached --name-only').split('\n').filter(Boolean);
let head = '';
try { head = sh(`git show HEAD:${FILE}`); } catch { /* aún no existe en HEAD */ }
const src = readFileSync(FILE, 'utf8');
const ver = (s) => (s.match(/VERSION = '(\d+)\.(\d+)\.(\d+)'/) || []).slice(1).map(Number);
const cur = ver(src), old = ver(head);
if (!staged.length || !cur.length) process.exit(0);
// versión nueva puesta a mano (o primer commit con versión): se deja como está
if (staged.includes(FILE) && (!old.length || cur.join('.') !== old.join('.'))) { console.log(`versión ${cur.join('.')}`); process.exit(0); }
const base = old.length ? old : cur;
const next = [base[0], base[1], base[2] + 1].join('.');
writeFileSync(FILE, src.replace(/VERSION = '[\d.]+'/, `VERSION = '${next}'`));
sh(`git add ${FILE}`);
console.log(`versión ${next}`);
