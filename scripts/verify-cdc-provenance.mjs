#!/usr/bin/env node
/**
 * Verify the provenance of the embedded CDC 2000 height-for-age LMS tables.
 *
 * Unlike the blood-pressure datasets, the four cdc-*.json files entered the repo
 * in the same commit as everything else (d78916f, 2026-02-04) with no extraction
 * script, no pinned URL and no source notes. This script closes that gap after
 * the fact: it fetches the LMS tables the CDC publishes and asserts that every
 * committed point is the official value rounded to four decimals.
 *
 * It verifies rather than generates, on purpose. Regenerating would silently
 * rewrite the data an application already uses clinically; verifying turns the
 * provenance claim in NOTICE.md into something that fails loudly if it stops
 * being true.
 *
 * Source: CDC 2000 Growth Charts, percentile data files (public domain).
 *   Kuczmarski RJ et al. CDC growth charts: United States.
 *   Adv Data. 2000;(314):1-27.
 *
 * Usage: node scripts/verify-cdc-provenance.mjs
 * Exits non-zero if any point diverges.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');

const BASE = 'https://www.cdc.gov/growthcharts/data/zscore';

/** CDC encodes sex as 1 = male, 2 = female. */
const SEX = { boys: '1', girls: '2' };

const SOURCES = [
  { csv: 'lenageinf.csv', prefix: 'cdc-length', label: 'length-for-age (recumbent, 0-36 mo)' },
  { csv: 'statage.csv', prefix: 'cdc-stature', label: 'stature-for-age (standing, 2-20 y)' },
];

/**
 * The committed files carry four decimals. A value rounded to four decimals sits
 * within 5e-5 of the original whatever tie-breaking rule produced it, so this
 * tolerance checks the claim without depending on half-up vs half-to-even —
 * the discrepancy that cost two rounds on the Zemel tables.
 */
const TOLERANCE = 5e-5;

/**
 * Both CDC files use CRLF, and lenageinf.csv additionally carries a UTF-8 BOM.
 * Left in place, the BOM turns the first header into "﻿Sex" and the CRLF
 * turns the last one into "P97\r"; lookups by name then return undefined and
 * every value in those columns parses as NaN, with no error raised anywhere.
 */
function parseCsv(text) {
  const clean = text.replace(/^﻿/, '').replace(/\r/g, '');
  const lines = clean.trim().split('\n');
  const header = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(header.map((key, i) => [key, cells[i]]));
  });
}

async function fetchCsv(name) {
  // The CDC returns 403 to Node's default User-Agent; identify the script instead.
  const res = await fetch(`${BASE}/${name}`, {
    headers: { 'User-Agent': 'pedi-bp-provenance-check/1.0 (+https://www.npmjs.com/package/@pedi-bp/core)' },
  });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return parseCsv(await res.text());
}

let failures = 0;
let verified = 0;

for (const { csv, prefix, label } of SOURCES) {
  const rows = await fetchCsv(csv);

  for (const [sexName, sexCode] of Object.entries(SEX)) {
    const file = `${prefix}-${sexName}.json`;
    const committed = JSON.parse(await readFile(join(DATA_DIR, file), 'utf8'));

    const official = new Map(
      rows.filter((r) => r.Sex === sexCode).map((r) => [Number(r.Agemos), r]),
    );

    const problems = [];
    for (const point of committed) {
      const row = official.get(point.age);
      if (!row) {
        problems.push(`age ${point.age}: absent from ${csv}`);
        continue;
      }
      for (const param of ['L', 'M', 'S']) {
        const delta = Math.abs(point[param] - Number(row[param]));
        if (!(delta <= TOLERANCE)) {
          problems.push(
            `age ${point.age} ${param}: committed ${point[param]}, CDC ${row[param]} (delta ${delta.toExponential(2)})`,
          );
        }
      }
    }

    const status = problems.length === 0 ? 'OK  ' : 'FAIL';
    console.log(`${status} ${file.padEnd(24)} ${committed.length} points  ${label} — ${sexName}`);
    for (const p of problems.slice(0, 5)) console.log(`       ${p}`);
    if (problems.length > 5) console.log(`       ... and ${problems.length - 5} more`);

    failures += problems.length;
    verified += committed.length;
  }
}

console.log(
  `\n${verified} points checked against ${BASE}/{lenageinf,statage}.csv, ${failures} divergent.`,
);

if (failures > 0) {
  console.error('FAIL: the committed tables no longer match the CDC source (see NOTICE.md).');
  process.exit(1);
}
console.log('OK: provenance matches NOTICE.md — CDC 2000, public domain, rounded to 4 decimals.');
