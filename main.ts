// Token Launch Radar: an entry for make.fun's token-radar-01 bounty.
//
// Reads the sealed DefiLlama snapshot (at grade time /input/snapshot.json;
// locally pass --input <file|dir>), ranks every protocol that records no
// token by the implied value model in lib/model.ts, and writes:
//   board.json    the ranked board the gate checks
//   data.js       the same rows as window.RADAR, for the dashboard
//   dashboard/    a copy of this repository's static page
//   screenshots/  a copy of this repository's three screenshots
//   dossier.json  buildDossier's summary of the page and screenshots
// Two runs over the same snapshot write identical bytes: the model is pure
// arithmetic over the snapshot and the copies are file-for-file.
//
// Local run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <kit>/input/snapshot.json

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const TEXT_MAX_BYTES = 65_536;
const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;
const root = fileURLToPath(new URL('.', import.meta.url));

function flag(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && process.argv[at + 1] !== undefined) return process.argv[at + 1]!;
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq === undefined ? fallback : eq.slice(name.length + 3);
}

const inputArg = flag('input', '/input');
const inputPath = inputArg.endsWith('.json') ? inputArg : join(inputArg, 'snapshot.json');
if (!existsSync(inputPath)) {
  process.stderr.write(`token-radar: no snapshot at ${inputPath} (pass --input <snapshot.json|dir> or mount /input)\n`);
  process.exit(2);
}
const outDir = flag('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const snapshot = parseSnapshot(readFileSync(inputPath, 'utf8'));
const { board, radar } = buildRadar(snapshot);
const issue = boardIssue(board, snapshot);
if (issue !== null) {
  process.stderr.write(`token-radar: refusing to write a board the gate would reject: ${issue}\n`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
writeFileSync(join(outDir, 'data.js'), dataScript(radar));

function copyTree(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from).sort()) {
    if (name.startsWith('.')) continue;
    const src = join(from, name);
    if (statSync(src).isDirectory()) {
      copied.push(...copyTree(src, join(to, name)).map((n) => `${name}/${n}`));
    } else {
      copyFileSync(src, join(to, name));
      copied.push(name);
    }
  }
  return copied;
}

const pageFiles = copyTree(join(root, 'dashboard'), join(outDir, 'dashboard'));
const shots = copyTree(join(root, 'screenshots'), join(outDir, 'screenshots'));
if (shots.length < 3 || shots.length > 4) {
  process.stderr.write(`token-radar: screenshots/ holds ${shots.length} files; the entry hands in 3 or 4\n`);
  process.exit(1);
}
for (const name of shots) {
  if (!IMAGE_NAME.test(name)) {
    process.stderr.write(`token-radar: screenshots/${name}: names are letters, digits and . _ -, 1-128 characters\n`);
    process.exit(1);
  }
}

// Written last, from the finished output, so the dossier matches the gate's
// own rebuild of it byte for byte.
writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, { text_max_bytes: TEXT_MAX_BYTES }));

process.stdout.write(
  `token-radar: snapshot of ${snapshot.as_of}: ${snapshot.protocols.length} protocols scanned, ` +
    `${radar.rows.length} pre-token ranked, ${snapshot.watchlist.length} watchlist covered\n` +
    `token-radar: wrote board.json (${board.length} rows), data.js, dashboard/ (${pageFiles.length} files), ` +
    `screenshots/ (${shots.length} images), dossier.json\n`,
);
