// ─────────────────────────────────────────────────────────────
// The intake engine: one form runner, many forms.
//
// /intake?client=SLUG is one page and one endpoint. Which questions
// it asks is decided by the Clients row the slug finds: its Client
// Type, then its Tier. A form is a config (the object below) and
// nothing else, so a new form is a new config and one line in
// FORM_RULES, with no change to the page or the server.
//
// The artist form is the default: it is what an unknown slug, a slug
// with no Client Type, and every link sent before this file existed
// all get, and it is the list in intake.ts, untouched.
//
// Nothing here talks to Notion or reads a secret.
// ─────────────────────────────────────────────────────────────

import { intakeSteps, URL_FALLBACK_PROP, type IntakeField, type IntakeStep } from './intake';
import { cheerGymSteps } from './intake-cheer';

export interface IntakeForm {
  /** Short and stable. It is in the page's markup and in the saved
   *  draft's key, so it is not a thing to rename. */
  id: string;
  /** The Notion database a submission is written to. */
  database: string;
  steps: IntakeStep[];
  /** The field whose answer names the submission (Notion's title). */
  titleProp: string;
  /** The field that has to be an email address. */
  emailProp: string;
  /** Where a link that will not parse is appended rather than lost. */
  urlFallbackProp: string;
  /** What the page says once it has been sent. */
  success: { heading: string; body: string };
  /** What the notification email calls whoever sent it. */
  noun: string;
  /**
   * Clients fields this form fills in, and the answer each comes
   * from. Only ever into a field that is EMPTY on the Clients row: an
   * intake never overwrites what we have typed. Absent means the form
   * writes nothing to Clients, which is the artist form.
   */
  toClients?: ReadonlyArray<{ client: string; from: string }>;
}

export const ARTIST_FORM: IntakeForm = {
  id: 'artist',
  database: 'e992eaab-da11-4c65-bcda-b6a40a1db965',
  steps: intakeSteps,
  titleProp: 'Artist Name',
  emailProp: 'Email',
  urlFallbackProp: URL_FALLBACK_PROP,
  success: {
    heading: "You're in.",
    body: "We'll review everything and come to our kickoff call with your audit ready.",
  },
  noun: 'an artist',
};

export const CHEER_GYM_FORM: IntakeForm = {
  id: 'cheer-gym',
  // The Gym Intake database. Created beside Artist Intake.
  database: '41cc8be8-be72-81e4-8d36-d9ffe023d6ac',
  steps: cheerGymSteps,
  titleProp: 'Gym Name',
  emailProp: 'Email',
  urlFallbackProp: 'Other Accounts',
  success: {
    heading: "You're in.",
    body: "We'll review everything and come to our kickoff call ready to plan your season.",
  },
  noun: 'a gym',
  toClients: [
    { client: 'Instagram', from: 'Instagram' },
    { client: 'TikTok', from: 'TikTok' },
  ],
};

/** Every form there is, default first. */
export const INTAKE_FORMS: readonly IntakeForm[] = [ARTIST_FORM, CHEER_GYM_FORM];

/**
 * Which form a client gets. Read top to bottom, first match wins.
 *
 * A rule with a `tier` is for one offer; a rule without is the type's
 * default. To give an artist tier its own questions, write its config
 * and add a line above the artist default:
 *
 *   { type: 'artist', tier: 'Tier 1 · Growth Blueprint Session', form: TIER_ONE_FORM },
 */
const FORM_RULES: ReadonlyArray<{ type: string; tier?: string; form: IntakeForm }> = [
  { type: 'cheer-gym', form: CHEER_GYM_FORM },
  { type: 'artist', form: ARTIST_FORM },
];

/** The form for a client type's id and a Tier as Notion holds it. */
export function intakeFormFor(typeId: string | null | undefined, tier?: string | null): IntakeForm {
  const type = typeId || 'artist';
  const rule = FORM_RULES.find((r) => r.type === type && r.tier !== undefined && r.tier === (tier ?? ''))
    ?? FORM_RULES.find((r) => r.type === type && r.tier === undefined);
  return rule?.form ?? ARTIST_FORM;
}

export function intakeFormById(id: string | null | undefined): IntakeForm {
  return INTAKE_FORMS.find((f) => f.id === id) ?? ARTIST_FORM;
}

/** A form's fields, flat, for the server to validate and map. */
export function fieldsOf(form: IntakeForm): IntakeField[] {
  return form.steps.flatMap((s) => s.fields);
}

// Guard, the same one intake.ts has for the artist form: `prop` is the
// submitted key and the Notion property, so a duplicate inside one
// form would silently overwrite. Throws at build time.
for (const form of INTAKE_FORMS) {
  const names = fieldsOf(form).map((f) => f.prop);
  const dupes = names.filter((p, i) => names.indexOf(p) !== i);
  if (dupes.length) {
    throw new Error(`intake form "${form.id}": duplicate Notion property names: ${[...new Set(dupes)].join(', ')}`);
  }
  for (const need of [form.titleProp, form.emailProp, form.urlFallbackProp]) {
    if (!names.includes(need)) throw new Error(`intake form "${form.id}": no field called "${need}"`);
  }
}
