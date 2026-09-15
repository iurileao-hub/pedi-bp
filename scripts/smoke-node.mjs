#!/usr/bin/env node
/**
 * Smoke test of the BUILT package under plain Node.js ESM.
 *
 * The vitest suite cannot catch what this catches. It runs on Vite, which resolves
 * `import('./x.json')` itself before Node ever sees it; Node's own ESM loader refuses
 * that import without `with { type: 'json' }`. Version 0.1.0 and 0.1.1 shipped with all
 * 14 data imports missing the attribute: 100 tests green, and the package threw
 * ERR_IMPORT_ATTRIBUTE_MISSING on the first calculation for anyone consuming it from
 * Node — while the README promised "Works in Node.js, browsers, and edge runtimes".
 *
 * So this exercises dist/ the way an installed consumer does, and reaches every data
 * source, because each one loads different JSON.
 *
 * Usage: npm run build && node scripts/smoke-node.mjs
 */

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const entry = join(root, 'dist', 'index.js');

if (!existsSync(entry)) {
  console.error('dist/ not built. Run `npm run build` first.');
  process.exit(1);
}

const { calculateBp } = await import(entry);

const cases = [
  { name: 'Gemelli  (infant, 6 mo)',
    input: { sex: 'male', ageMonths: 6, sbp: 90, dbp: 50 } },
  { name: 'AAP 2017 (10 y, height known)',
    input: { sex: 'male', ageMonths: 120, heightCm: 138, sbp: 105, dbp: 65 } },
  { name: 'NHLBI    (10 y, explicit)',
    input: { sex: 'female', ageMonths: 120, heightCm: 138, sbp: 105, dbp: 65, source: 'nhlbi' } },
  { name: 'Lo 2013  (8 y, no height)',
    input: { sex: 'female', ageMonths: 96, sbp: 100, dbp: 60, source: 'lo2013' } },
  { name: 'ERICA    (15 y, Brazilian)',
    input: { sex: 'male', ageMonths: 180, heightCm: 170, sbp: 118, dbp: 70, source: 'erica' } },
];

let failed = 0;
for (const { name, input } of cases) {
  try {
    const r = await calculateBp(input);
    if (!r?.classification?.category || !r?.source?.used) {
      console.error(`FAIL ${name}: got ${JSON.stringify(r)?.slice(0, 120)}`);
      failed++;
    } else {
      console.log(`OK   ${name.padEnd(32)} ${r.source.used.padEnd(11)} ${r.classification.category}`);
    }
  } catch (err) {
    console.error(`FAIL ${name}: ${err.code || err.message}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} case(s) failed under plain Node ESM.`);
  process.exit(1);
}
console.log('\nOK: the built package loads and computes under plain Node ESM.');
