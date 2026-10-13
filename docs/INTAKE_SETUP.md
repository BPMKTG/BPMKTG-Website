# Client intake form (`/intake`)

A branded, multi-step intake form that writes straight into the **Artist
Intake** Notion database and links the row to the right **Client**.

Unlisted: it is in no nav and carries `noindex, nofollow`. It is not secret
though, so treat it as "anyone with the link" rather than private.

---

## Adding a new client

1. In the **Clients** Notion database, set that client's **Intake Slug** to
   something short and URL-safe, e.g. `sean-comma`.
2. Send them `https://blueprint-marketing.com/intake?client=sean-comma`.

That is the whole process. The slug travels with the submission and the
server looks it up to link the new Intake row back to the Client.

If the slug matches nothing, or matches more than one client, **the
submission still succeeds**; the row simply arrives unlinked. Losing an
intake because a slug was mistyped would be far worse than linking it by
hand afterwards.

---

## Why a Pages Function, not an Astro API route

`astro.config.mjs` is `output: 'static'` with no adapter, so Astro produces
plain HTML and there is no server for an API route to live on. Cloudflare
Pages runs anything under `/functions` automatically, so the endpoint is
`functions/api/intake.ts`, served at `POST /api/intake`.

If the project ever adopts `@astrojs/cloudflare`, this could move to
`src/pages/api/intake.ts` instead. Until then it must stay where it is.

---

## Secrets

| Name | Required | Purpose |
|------|----------|---------|
| `NOTION_TOKEN` | yes | Notion internal integration token |
| `WEB3FORMS_KEY` | no | Sends "New intake from X" when set; skipped silently when not |

In production these are **encrypted environment variables** in Cloudflare
Pages (Settings > Environment variables). They are read server-side only and
never reach the browser.

Locally, `wrangler pages dev` reads `.dev.vars`. Copy `.dev.vars.example` to
`.dev.vars` and fill it in; `.dev.vars` is gitignored.

**The Notion integration must be shared with both databases.** Open each
database, Connections, add the integration. Without that Notion answers 404
for an id the token is otherwise allowed to see, which reads like a wrong id.

| Database | ID |
|---|---|
| Artist Intake | `e992eaab-da11-4c65-bcda-b6a40a1db965` |
| Clients | `b495a24f-96c3-4108-8d78-106fd6228e14` |

---

## How a submission is shaped

Everything is driven by `src/data/intake.ts`, which both the form and the
server import. **Property names in that file must match Notion exactly**,
punctuation included: Notion silently ignores a property it does not
recognise, so a typo looks like a field that just will not save.

Per type:

- **title / rich_text** split into chunks of 2000 characters, Notion's limit
  per text object. Long answers are never truncated.
- **email / phone_number** sent as plain strings, omitted when empty.
- **url** trimmed, `https://` prepended when missing. If it still will not
  parse it is **not** dropped: it is appended to **Other links** as
  `Property: raw value`, so a mistyped link still reaches a person.
- **select** written only when the value is one of the allowed options.
  Otherwise omitted, because Notion would otherwise create a new option out
  of whatever was posted.
- **multi_select** filtered to the allowed options.
- **Client** written as a relation when the slug matched exactly one client.
- Empty values are omitted entirely rather than written as blanks.

`Client`, `Reviewed` and `Submitted` are not on the form by design.

### Required fields

Eight, flagged by `required: true` in the schema so the form and the server
agree: Artist Name, Your Name, Email, "In one sentence, what is your project
about?", "Who is your ideal fan?", "Footage you already have", "How often do
you post right now?" and "What does a win look like in 90 days?".

Required is **type-aware** on the server, which matters for two of them:

- a required **multi_select** must contain at least one *allowed* option. It
  arrives as an array, or as a bare string when exactly one box is ticked, so
  a string-only check would report every one of them as missing.
- a required **select** must be one of the allowed options, since an unknown
  value is dropped during shaping and would otherwise arrive blank.

Everything else is optional, and the form says so once under the header
rather than labelling thirty fields.

---

## Testing the shaping

```bash
npm run test:intake
```

Bundles the function the way Cloudflare does and asserts the chunking, URL
normalisation, select allow-listing, multi_select filtering, omissions and
the Other-links fallback. Run it after any change to `src/data/intake.ts` or
the function.

---

## Behaviour worth knowing

- **Progress is saved to `localStorage`** per slug (`bp-intake:<slug>`) on
  every keystroke and step change, and cleared after a successful submit.
  Every read and write is wrapped: a private window or blocked site data
  costs the saved draft, not the form.
- **A failed submit keeps every answer**, on screen and in storage, and
  offers a retry rather than making anyone retype.
- **Validation is per step**, and the whole form is re-checked on submit,
  since a restored draft can drop someone straight onto a later step.
- **Honeypot**: a hidden `company_website` field. When filled, the server
  answers `200 ok` without writing anything, so a bot learns nothing.
- Notion errors are logged server-side with the full Notion body (it names
  the offending property) and the browser gets a generic message.
