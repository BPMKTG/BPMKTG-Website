// Bundle entry for the portal tests.
//
// The Pages Functions under functions/portal/ cannot be imported into
// Node directly: they are modules of Cloudflare handlers. Everything
// they actually decide with lives in these files, so the tests point at
// those and this re-exports them as one module.
export * from '../src/data/portal';
export * from '../src/data/portal-content';
export * from '../src/data/portal-labels';
export * from '../src/server/portal-auth';
export * from '../src/server/portal-login';
export * from '../src/server/portal-move';
export * from '../src/server/portal-notion';
export * from '../src/server/portal-write';
// The brand brief. Everything in here that touches R2 takes the
// bucket as an argument, so what is testable is what decides: the
// key, the URL, the size cap and whether the bytes are a PDF.
export {
  BRIEF_FILE, MAX_BRIEF_BYTES, briefKey, briefUrl, looksLikePdf, fileSize,
} from '../src/server/brief';
// Blueprint HQ. The rules that decide what a Today row is and what may
// be done to it, and the whitelist for the one Clients write.
export * from '../src/data/hq';
export * from '../src/server/hq-write';
