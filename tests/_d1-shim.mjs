/* A stand-in for a D1 database, backed by the SQLite that ships with
   Node, so the Vault's SQL is run for real in a test rather than read
   and believed. It answers the few calls src/server/vault-db.ts makes
   (prepare, bind, all, first, run, batch) in the shapes D1 does. */
import { DatabaseSync } from 'node:sqlite';

class Statement {
  constructor(db, sql, values = []) { this.db = db; this.sql = sql; this.values = values; }
  bind(...values) {
    // D1 refuses undefined; so does this, loudly, so a test finds it.
    for (const v of values) if (v === undefined) throw new Error(`D1 shim: undefined bound in: ${this.sql.slice(0, 80)}`);
    return new Statement(this.db, this.sql, values.map((v) => (typeof v === 'boolean' ? Number(v) : v)));
  }
  async all() { return { results: this.db.raw.prepare(this.sql).all(...this.values).map((r) => ({ ...r })) }; }
  async first() { const row = this.db.raw.prepare(this.sql).get(...this.values); return row ? { ...row } : null; }
  async run() { return this.runNow(); }
  runNow() {
    this.db.statements += 1;
    const out = this.db.raw.prepare(this.sql).run(...this.values);
    return { results: [], meta: { changes: Number(out.changes) } };
  }
}

export class FakeD1 {
  constructor(path = ':memory:') { this.raw = new DatabaseSync(path); this.statements = 0; }
  prepare(sql) { return new Statement(this, sql); }
  async batch(list) {
    // D1 runs a batch as one transaction: all of it or none, with
    // nothing else let in between its statements.
    this.raw.exec('BEGIN');
    try {
      const out = list.map((s) => s.runNow());
      this.raw.exec('COMMIT');
      return out;
    } catch (err) { this.raw.exec('ROLLBACK'); throw err; }
  }
}

/** R2, as much of it as the Vault uses, kept in memory. */
export class FakeR2 {
  constructor() { this.files = new Map(); }
  async put(key, body, opts = {}) {
    const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : new Uint8Array(body);
    this.files.set(key, { bytes, contentType: opts.httpMetadata?.contentType ?? null, etag: `e${this.files.size}-${bytes.length}` });
    return { key };
  }
  async head(key) { const f = this.files.get(key); return f ? { size: f.bytes.length, httpMetadata: { contentType: f.contentType }, etag: f.etag } : null; }
  async get(key) {
    const f = this.files.get(key);
    if (!f) return null;
    return {
      size: f.bytes.length, etag: f.etag, httpMetadata: { contentType: f.contentType }, body: f.bytes,
      async arrayBuffer() { return f.bytes.buffer.slice(f.bytes.byteOffset, f.bytes.byteOffset + f.bytes.byteLength); },
      async json() { return JSON.parse(new TextDecoder().decode(f.bytes)); },
    };
  }
  async delete(keys) { for (const k of Array.isArray(keys) ? keys : [keys]) this.files.delete(k); }
}
