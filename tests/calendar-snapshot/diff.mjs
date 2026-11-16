// What moved between two calendar snapshots.
//
//   node diff.mjs before.json after.json
//
// Exits 1 on any difference, so it can gate a change.
import { readFileSync } from 'node:fs';

const [A, B] = process.argv.slice(2);
if (!A || !B) { console.error('usage: node diff.mjs <before.json> <after.json>'); process.exit(2); }
const a = JSON.parse(readFileSync(A, 'utf8'));
const b = JSON.parse(readFileSync(B, 'utf8'));

let diffs = 0;
const show = (path, x, y) => {
  diffs++;
  console.log(`\n  ${path}`);
  console.log(`    before  ${JSON.stringify(x)?.slice(0, 300) ?? 'undefined'}`);
  console.log(`    after   ${JSON.stringify(y)?.slice(0, 300) ?? 'undefined'}`);
};

const walk = (path, x, y) => {
  if (JSON.stringify(x) === JSON.stringify(y)) return;
  const obj = (v) => v && typeof v === 'object';
  if (!obj(x) || !obj(y) || Array.isArray(x) !== Array.isArray(y)) return show(path, x, y);
  if (Array.isArray(x)) {
    if (x.length !== y.length) return show(`${path}.length`, x.length, y.length);
    for (let i = 0; i < x.length; i++) walk(`${path}[${i}]`, x[i], y[i]);
    return;
  }
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(`${path}.${k}`, x[k], y[k]);
};

for (const engine of new Set([...Object.keys(a), ...Object.keys(b)])) {
  console.log(`\n══ ${engine} ${'═'.repeat(44)}`);
  const ea = a[engine] ?? {}, eb = b[engine] ?? {};
  const states = [...new Set([...Object.keys(ea), ...Object.keys(eb)])];
  let bad = 0;
  for (const s of states) {
    const before = diffs;
    walk(s, ea[s], eb[s]);
    if (diffs > before) bad++;
  }
  console.log(`\n  ${states.length - bad}/${states.length} states identical`);
}

console.log(diffs ? `\n${diffs} DIFFERENCE${diffs === 1 ? '' : 'S'}\n` : '\nidentical\n');
process.exit(diffs ? 1 : 0);
