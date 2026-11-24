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
// key, the URL, the size cap, whether the bytes are a PDF, and which
// of the two kinds a pointer resolves to.
export {
  BRIEF_FILE, MAX_BRIEF_BYTES, briefKey, briefUrl, looksLikePdf, fileSize,
  briefHost, isOurBriefUrl, isSafeBriefUrl, readBrief,
} from '../src/server/brief';
// Blueprint HQ. The rules that decide what a Today row is and what may
// be done to it, and the whitelist for the one Clients write.
// Previews: our own copy of a Drive file. The rules, and the two
// small adapters that read and write a card's preview fields.
export * from '../src/data/preview';
export { storedPreviewProperties } from '../src/server/preview';
// The installed app: what a notification says and when one is owed,
// and the signing and encryption behind sending it.
export * from '../src/data/push';
export {
  b64uToBytes, bytesToB64u, encryptPush, pushConfig, vapidAuthorization, notifyReview, notifyReport, notifyAdmins,
  sweepReviewFor, saveDevice, deviceState, forgetDevice,
} from '../src/server/push';
export { HQ_MANIFEST } from '../functions/portal/hq/app.webmanifest';
export * from '../src/data/hq';
export * from '../src/server/hq-write';
// The one record of a publish email. Reads a claim out of a KV-shaped
// object, so a stub covers it.
export { mailSentAt } from '../src/server/report-mail';
export * from '../src/data/playbooks';
export * from '../src/server/playbooks';
// Pieces: the Content Pipeline rows a campaign step owes, keeping the
// two in step, and what to trim from a month that is over.
export * from '../src/data/pieces';
export { pieceProperties, shapeStep, shapePiece, PIECE_WRITE_BUDGET } from '../src/server/pieces';
// "Update campaigns to current playbook": the plan, and the snapshot
// that makes it undoable.
export * from '../src/data/playbook-update';
export {
  buildSnapshot, isSnapshotKey, pieceRestore, pieceWrite, snapshotKey, snapshotPrefix,
  stepRestore, stepWrite, latestSnapshotKey, getSnapshot, putSnapshot,
} from '../src/server/playbook-update';
// The Playbook Audit: which PDF a client is shown, where it is kept,
// and what an upload has to be before it is stored.
export {
  AUDIT_FILE, GENERAL_AUDIT_KEY, HQ_GENERAL_AUDIT_URL, MAX_AUDIT_BYTES, SHARED_PREFIX, SITE_ORIGIN,
  clientAuditKey, clientAuditPrefix, clientAuditUrl, generalAuditUrl, isOurAuditUrl, putClientAudit,
  putGeneralAudit, readAuditPointer, readClientAudit, readGeneralAudit, readOwnAudit, readPdfUpload,
} from '../src/server/playbook-audit';
// Client types: what kind of client this is, and what follows from it.
export * from '../src/data/client-types';
// Deliveries: photo sets and footage batches, for a client who posts
// for themselves.
export * from '../src/data/deliveries';
export {
  DELIVERABLE_PROP, deliveryPatchProperties, isDeliveryPage, newDeliveryProperties, shapeDelivery, splitPages,
} from '../src/server/deliveries';
export { publishNumbers } from '../src/server/report-publish';
// Applying a playbook to a moment: the plan, and the page a row becomes.
export * from '../src/data/playbook-apply';
export { copyProperties, readApplyAsk, MASTER_PROP, PENDING_PROP } from '../src/server/playbook-apply';
