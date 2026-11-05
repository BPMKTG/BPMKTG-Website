// Bundle entry for the report and audit PDF tests.
//
// Same arrangement as _portal-entry.ts: the Pages Functions cannot be
// imported into Node, so the tests point at the modules those handlers
// actually decide with. The two template modules are included because
// the only way to assert "six pages, and none of them says undefined"
// is to render one.
export * from '../src/data/print';
export * from '../src/server/print-report';
export * from '../src/server/print-audit';
export * from '../src/server/print-token';
export * from '../src/server/print-html';
export * from '../src/server/share-link';
export * from '../src/server/report-mail';
export { fileSlug, reportKey, auditKey } from '../src/server/pdf';
export * from './fixtures/print-fixture';
