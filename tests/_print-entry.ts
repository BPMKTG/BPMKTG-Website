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
export { fileSlug, reportKey, auditKey, canRender } from '../src/server/pdf';
// The one pure piece of the publish path: what a Notion PATCH is
// shaped like. The writes themselves need a network and are not here.
export { stampSnapshotEdit } from '../src/server/report-publish';
export { editedBy } from '../src/server/portal-write';
export * from './fixtures/print-fixture';
