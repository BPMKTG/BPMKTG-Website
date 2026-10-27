// Bundle entry for the portal tests.
//
// The Pages Functions under functions/portal/ cannot be imported into
// Node directly: they are modules of Cloudflare handlers. Everything
// they actually decide with lives in these three files, so the tests
// point at those and this re-exports them as one module.
export * from '../src/data/portal';
export * from '../src/data/portal-labels';
export * from '../src/server/portal-auth';
export * from '../src/server/portal-notion';
