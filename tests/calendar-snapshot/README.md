# Calendar snapshot

A regression gate for the portal calendar (`src/scripts/portal-calendar.ts`
and the rules it reads from `src/data/portal.ts`).

It opens the **built** client portal in Chromium and WebKit, feeds it a
fixed fixture instead of Notion, walks the calendar through 55 states per
browser (month, week and agenda views, every layer chip, the filters, the
tray, the drawers, drags, the admin view, phone width) and writes down what
was drawn. That is compared with `baseline.json`. Anything that moved is
either the change you meant to make or a regression.

It never touches Notion and needs no login or `.dev.vars`: the page's data
is `fixture.mjs`, and every write the page attempts is answered by a stub
and recorded.

## Run it

```bash
npm run test:calendar
```

That builds the site, takes a snapshot and diffs it against the baseline.
It ends with `identical` and exits 0, or lists each difference (state,
path, before, after) and exits 1. It takes about a minute.

It is not part of `npm test` because it needs a build and two browsers.
Run it before and after any change to the calendar, the layer chips, or
the calendar rules in `src/data/portal.ts`.

### First time on a machine

Playwright comes with `npm install`, but its browsers do not:

```bash
npx playwright install chromium webkit
```

## Re-record the baseline

Only when the calendar is *supposed* to look different, and only after
reading the diff:

1. `npm run test:calendar` and read every difference it lists.
2. If each one is a change you meant to make, and nothing else moved:

   ```bash
   npm run test:calendar:record
   ```

   It prints the same differences once more and overwrites `baseline.json`.
3. Commit `baseline.json` in the same commit as the change that caused it,
   and say in the message what moved.

If a difference is one you did not mean to make, fix the code, not the
baseline.

## Files

| File | What it is |
|---|---|
| `run.mjs` | The one command: snapshot, then diff or record. |
| `snapshot.mjs` | Serves `dist/`, stubs the data and the writes, walks the states. |
| `fixture.mjs` | The payload the portal is given. Dates hang off one pinned day (`TODAY`), so a run next month gives the same snapshot. |
| `reader.mjs` | What "what the calendar drew" means: the DOM read into plain data. |
| `diff.mjs` | Compares two snapshots, path by path. |
| `baseline.json` | The snapshot the calendar is held to. |

By hand, to keep a snapshot around or compare two of your own:

```bash
node tests/calendar-snapshot/snapshot.mjs /tmp/now.json
node tests/calendar-snapshot/diff.mjs tests/calendar-snapshot/baseline.json /tmp/now.json
```

## Adding a state

Add a `visit('name', …)` to `snapshot.mjs`, or a row to `fixture.mjs` for a
case the calendar should handle, then re-record. A new state shows in the
diff as `undefined` before and its contents after; that is expected, and it
is the only difference a new state should cause.

## Things that have gone wrong before

- **A drag that moves nothing.** The calendar drags on pointer events, not
  the HTML5 drag API. Use the `drag()` helper in `snapshot.mjs`, not
  Playwright's `dragTo()`.
- **A reload that is not one.** Changing only the URL hash does not reload
  the page, so cleared preferences are not the ones in force. `boot()`
  changes the query string for that reason.
- **A stub that answers too little.** The page checks what a write returns.
  A stub that echoes less than the real endpoint makes every save roll back,
  and the snapshot then records the failure path as normal.
