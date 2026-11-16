// The calendar gate, as one command.
//
//   node run.mjs            snapshot the built portal, diff against baseline.json
//   node run.mjs --record   snapshot it and make that the new baseline
//
// Exits 0 when the calendar drew exactly what the baseline says it
// should, 1 when anything moved. See README.md for when to re-record.
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const BASELINE = join(HERE, 'baseline.json');
const record = process.argv.includes('--record');

const node = (script, ...args) =>
  spawnSync(process.execPath, [join(HERE, script), ...args], { stdio: 'inherit' }).status ?? 1;

const dir = mkdtempSync(join(tmpdir(), 'bp-calendar-'));
const out = join(dir, 'now.json');
let code = 1;
try {
  code = node('snapshot.mjs', out);
  if (code !== 0) {
    console.error('\nThe snapshot run itself failed, so there is nothing to compare.');
    console.error('If a browser is missing: npx playwright install chromium webkit');
  } else if (record) {
    // Shown before it is kept, so a re-record is never a blind one.
    node('diff.mjs', BASELINE, out);
    copyFileSync(out, BASELINE);
    console.log('baseline.json re-recorded. Read the differences above before you commit it.');
  } else {
    code = node('diff.mjs', BASELINE, out);
    if (code !== 0) {
      console.error('The calendar does not match the baseline. If every difference above is one');
      console.error('you meant to make, run: npm run test:calendar:record');
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
process.exit(code);
