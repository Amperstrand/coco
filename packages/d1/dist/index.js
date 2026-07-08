import { DEFAULT_UNIT, deserializeAmount, deserializeToken, getMintQuoteAmount, getMintQuoteRemoteState, isMintQuotePending, isStatefulMintQuote, normalizeMeltMethodData, normalizeMintUrl, normalizeUnit, operationHistoryId, parseHistoryEntryId, projectLegacyHistoryRow, serializeAmount, stringifyJson } from "@cashu/coco-core";

//#region src/db.ts
/**
* Thin async wrapper around Cloudflare D1's prepared statement API.
* Provides run/get/all/exec methods compatible with the coco repository pattern.
*/
var D1Db = class {
	localName;
	constructor(db, localName) {
		this.db = db;
		this.localName = localName;
	}
	async run(sql, params = []) {
		return { meta: (await this.db.prepare(sql).bind(...params).run()).meta };
	}
	async all(sql, params = []) {
		return (await this.db.prepare(sql).bind(...params).all()).results ?? [];
	}
	async get(sql, params = []) {
		return this.db.prepare(sql).bind(...params).first();
	}
	async exec(sql) {
		await this.db.exec(sql);
	}
	/**
	* Create a prepared statement for use with batch() or direct execution.
	* Returns D1's native D1PreparedStatement for bind() chaining.
	*/
	prepare(sql) {
		return this.db.prepare(sql);
	}
	/**
	* Execute multiple prepared statements atomically.
	* D1 batch is a SQL transaction — all succeed or all roll back.
	* Returns D1Result[] with meta.changes for each statement.
	*/
	async batch(statements) {
		return this.db.batch(statements);
	}
};
function getUnixTimeSeconds() {
	return Math.floor(Date.now() / 1e3);
}

//#endregion
//#region src/schema.ts
/**
* Fresh schema — the FINAL state of all tables after all upstream migrations.
* Uses CREATE TABLE IF NOT EXISTS so it's idempotent.
* All amount columns are TEXT (migration 024 converted from INTEGER).
*
* v2: Adds local_name TEXT NOT NULL as first column in every table (except migrations)
* for multi-tenancy support. All PKs are updated to include local_name.
*/
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS coco_cashu_migrations (
    id        TEXT PRIMARY KEY,
    appliedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS coco_cashu_mints (
    local_name TEXT NOT NULL,
    mintUrl   TEXT NOT NULL,
    name      TEXT NOT NULL,
    mintInfo  TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    trusted   INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (local_name, mintUrl)
  );

  CREATE TABLE IF NOT EXISTS coco_cashu_keysets (
    local_name TEXT NOT NULL,
    mintUrl   TEXT NOT NULL,
    id        TEXT NOT NULL,
    keypairs  TEXT NOT NULL,
    active    INTEGER NOT NULL,
    feePpk    INTEGER NOT NULL,
    unit      TEXT,
    updatedAt INTEGER NOT NULL,
    PRIMARY KEY (local_name, mintUrl, id)
  );

  CREATE TABLE IF NOT EXISTS coco_cashu_counters (
    local_name TEXT NOT NULL,
    mintUrl  TEXT NOT NULL,
    keysetId TEXT NOT NULL,
    counter  INTEGER NOT NULL,
    PRIMARY KEY (local_name, mintUrl, keysetId)
  );

  CREATE TABLE IF NOT EXISTS coco_cashu_proofs (
    local_name TEXT NOT NULL,
    mintUrl   TEXT NOT NULL,
    id        TEXT NOT NULL,
    unit      TEXT NOT NULL DEFAULT 'sat',
    amount    TEXT NOT NULL,
    secret    TEXT NOT NULL,
    C         TEXT NOT NULL,
    dleqJson  TEXT,
    witnessJson   TEXT,
    state     TEXT NOT NULL CHECK (state IN ('inflight', 'ready', 'spent')),
    createdAt INTEGER NOT NULL,
    usedByOperationId TEXT,
    createdByOperationId TEXT,
    PRIMARY KEY (local_name, mintUrl, secret)
  );

  CREATE TABLE IF NOT EXISTS coco_cashu_mint_quotes (
    local_name TEXT NOT NULL,
    mintUrl TEXT NOT NULL,
    quote   TEXT NOT NULL,
    state   TEXT NOT NULL CHECK (state IN ('UNPAID','PAID','ISSUED')),
    request TEXT NOT NULL,
    amount  TEXT NOT NULL,
    unit    TEXT NOT NULL,
    expiry  INTEGER,
    pubkey  TEXT,
    PRIMARY KEY (local_name, mintUrl, quote)
  );

  CREATE TABLE IF NOT EXISTS coco_cashu_canonical_mint_quotes (
    local_name TEXT NOT NULL,
    mintUrl TEXT NOT NULL,
    method TEXT NOT NULL,
    quoteId TEXT NOT NULL,
    state TEXT CHECK (state IS NULL OR state IN ('UNPAID','PAID','ISSUED')),
    request TEXT NOT NULL,
    amount TEXT,
    unit TEXT NOT NULL,
    expiry INTEGER,
    pubkey TEXT,
    quoteDataJson TEXT NOT NULL DEFAULT '{}',
    lastObservedRemoteState TEXT,
    lastObservedRemoteStateAt INTEGER,
    reusable INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    PRIMARY KEY (local_name, mintUrl, method, quoteId)
  );

  CREATE TABLE IF NOT EXISTS coco_cashu_melt_quotes (
    local_name TEXT NOT NULL,
    mintUrl TEXT NOT NULL,
    method TEXT NOT NULL,
    quoteId TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('UNPAID','PENDING','PAID')),
    request TEXT NOT NULL,
    amount TEXT NOT NULL,
    unit TEXT NOT NULL,
    expiry INTEGER NOT NULL,
    fee_reserve TEXT,
    payment_preimage TEXT,
    fee_options_json TEXT,
    outpoint TEXT,
    changeJson TEXT,
    lastObservedRemoteState TEXT,
    lastObservedRemoteStateAt INTEGER,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    PRIMARY KEY (local_name, mintUrl, method, quoteId)
  );

  CREATE TABLE IF NOT EXISTS coco_cashu_history (
    local_name TEXT NOT NULL,
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    mintUrl   TEXT NOT NULL,
    type      TEXT NOT NULL CHECK (type IN ('mint','melt','send','receive')),
    unit      TEXT NOT NULL,
    amount    TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    quoteId   TEXT,
    state     TEXT,
    paymentRequest TEXT,
    tokenJson TEXT,
    metadata  TEXT,
    operationId TEXT
  );

  CREATE TABLE IF NOT EXISTS coco_cashu_keypairs (
    local_name TEXT NOT NULL,
    publicKey TEXT NOT NULL,
    secretKey TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    derivationIndex INTEGER,
    purpose TEXT NOT NULL DEFAULT 'p2pk',
    PRIMARY KEY (local_name, publicKey)
  );

  CREATE TABLE IF NOT EXISTS coco_cashu_send_operations (
    local_name TEXT NOT NULL,
    id         TEXT NOT NULL,
    mintUrl    TEXT NOT NULL,
    amount     TEXT NOT NULL,
    unit       TEXT NOT NULL DEFAULT 'sat',
    state      TEXT NOT NULL CHECK (state IN ('init', 'prepared', 'executing', 'pending', 'finalized', 'rolling_back', 'rolled_back')),
    createdAt  INTEGER NOT NULL,
    updatedAt  INTEGER NOT NULL,
    error      TEXT,
    needsSwap  INTEGER,
    fee        TEXT,
    inputAmount TEXT,
    inputProofSecretsJson TEXT,
    outputDataJson TEXT,
    method TEXT NOT NULL DEFAULT 'default',
    methodDataJson TEXT NOT NULL DEFAULT '{}',
    tokenJson TEXT,
    PRIMARY KEY (local_name, id)
  );

  CREATE TABLE IF NOT EXISTS coco_cashu_melt_operations (
    local_name TEXT NOT NULL,
    id TEXT NOT NULL,
    mintUrl TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('init', 'prepared', 'executing', 'pending', 'finalized', 'rolling_back', 'rolled_back')),
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    error TEXT,
    method TEXT NOT NULL,
    methodDataJson TEXT NOT NULL,
    quoteId TEXT,
    amount TEXT,
    fee_reserve TEXT,
    swap_fee TEXT,
    needsSwap INTEGER,
    inputAmount TEXT,
    inputProofSecretsJson TEXT,
    changeOutputDataJson TEXT,
    swapOutputDataJson TEXT,
    changeAmount TEXT,
    effectiveFee TEXT,
    finalizedDataJson TEXT,
    unit TEXT,
    PRIMARY KEY (local_name, id)
  );

  CREATE TABLE IF NOT EXISTS coco_cashu_receive_operations (
    local_name TEXT NOT NULL,
    id TEXT NOT NULL,
    mintUrl TEXT NOT NULL,
    amount TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('init', 'prepared', 'executing', 'finalized', 'rolled_back')),
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    error TEXT,
    fee TEXT,
    inputProofsJson TEXT NOT NULL,
    outputDataJson TEXT,
    unit TEXT NOT NULL DEFAULT 'sat',
    sourceJson TEXT,
    PRIMARY KEY (local_name, id)
  );

  CREATE TABLE IF NOT EXISTS coco_cashu_mint_operations (
    local_name TEXT NOT NULL,
    id TEXT NOT NULL,
    mintUrl TEXT NOT NULL,
    quoteId TEXT,
    state TEXT NOT NULL CHECK (state IN ('init', 'pending', 'executing', 'finalized', 'failed')),
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    error TEXT,
    method TEXT NOT NULL,
    methodDataJson TEXT NOT NULL,
    amount TEXT,
    unit TEXT,
    request TEXT,
    expiry INTEGER,
    pubkey TEXT,
    lastObservedRemoteState TEXT,
    lastObservedRemoteStateAt INTEGER,
    terminalFailureJson TEXT,
    outputDataJson TEXT,
    PRIMARY KEY (local_name, id)
  );

  CREATE TABLE IF NOT EXISTS coco_cashu_auth_sessions (
    local_name      TEXT NOT NULL,
    mintUrl         TEXT NOT NULL,
    accessToken     TEXT NOT NULL,
    refreshToken    TEXT,
    expiresAt       INTEGER NOT NULL,
    scope           TEXT,
    batPoolJson     TEXT,
    PRIMARY KEY (local_name, mintUrl)
  );

  CREATE TABLE IF NOT EXISTS coco_cashu_payment_request_receive_operations (
    local_name TEXT NOT NULL,
    id TEXT NOT NULL,
    requestId TEXT,
    encodedRequest TEXT NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('active', 'completed', 'cancelled')),
    transport TEXT NOT NULL CHECK (transport IN ('inband', 'nostr', 'post')),
    amount TEXT NOT NULL,
    unit TEXT NOT NULL,
    mintsJson TEXT NOT NULL,
    singleUse INTEGER NOT NULL,
    description TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    error TEXT,
    completedAt INTEGER,
    PRIMARY KEY (local_name, id)
  );

  CREATE TABLE IF NOT EXISTS coco_cashu_payment_request_receive_attempts (
    local_name TEXT NOT NULL,
    id TEXT NOT NULL,
    requestOperationId TEXT NOT NULL,
    requestId TEXT,
    transport TEXT NOT NULL CHECK (transport IN ('inband', 'nostr', 'post')),
    transportMessageId TEXT,
    payloadHash TEXT NOT NULL,
    senderPubkey TEXT,
    memo TEXT,
    mintUrl TEXT NOT NULL,
    unit TEXT NOT NULL,
    grossAmount TEXT NOT NULL,
    fee TEXT,
    netAmount TEXT,
    receiveOperationId TEXT,
    state TEXT NOT NULL CHECK (state IN ('received', 'validating', 'receiving', 'finalized', 'rejected')),
    error TEXT,
    payloadJson TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    PRIMARY KEY (local_name, id)
  );

  -- Mints indexes
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_mints_local_name ON coco_cashu_mints(local_name);

  -- Keysets indexes
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_keysets_local_name ON coco_cashu_keysets(local_name);

  -- Counters indexes
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_counters_local_name ON coco_cashu_counters(local_name);

  -- Proof indexes
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_proofs_local_name ON coco_cashu_proofs(local_name);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_proofs_state ON coco_cashu_proofs(state);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_proofs_mint_state ON coco_cashu_proofs(mintUrl, state);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_proofs_mint_id_state ON coco_cashu_proofs(mintUrl, id, state);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_proofs_mint_unit_state ON coco_cashu_proofs(mintUrl, unit, state);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_proofs_mint_unit_id_state ON coco_cashu_proofs(mintUrl, unit, id, state);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_proofs_unit_state ON coco_cashu_proofs(unit, state);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_proofs_usedByOp ON coco_cashu_proofs(usedByOperationId) WHERE usedByOperationId IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_proofs_createdByOp ON coco_cashu_proofs(createdByOperationId) WHERE createdByOperationId IS NOT NULL;

  -- Mint quotes indexes (legacy)
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_mint_quotes_local_name ON coco_cashu_mint_quotes(local_name);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_mint_quotes_state ON coco_cashu_mint_quotes(state);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_mint_quotes_mint ON coco_cashu_mint_quotes(mintUrl);

  -- Canonical mint quotes indexes
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_canonical_mint_quotes_local_name ON coco_cashu_canonical_mint_quotes(local_name);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_canonical_mint_quotes_state ON coco_cashu_canonical_mint_quotes(state);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_canonical_mint_quotes_mint ON coco_cashu_canonical_mint_quotes(mintUrl);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_canonical_mint_quotes_method ON coco_cashu_canonical_mint_quotes(method);

  -- Melt quotes indexes
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_melt_quotes_local_name ON coco_cashu_melt_quotes(local_name);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_melt_quotes_state ON coco_cashu_melt_quotes(state);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_melt_quotes_mint ON coco_cashu_melt_quotes(mintUrl);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_melt_quotes_method ON coco_cashu_melt_quotes(method);

  -- History indexes
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_history_local_name ON coco_cashu_history(local_name);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_history_mint_createdAt ON coco_cashu_history(mintUrl, createdAt DESC);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_history_mint_quote ON coco_cashu_history(mintUrl, quoteId);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_history_type ON coco_cashu_history(type);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_history_createdAt ON coco_cashu_history(createdAt DESC, id DESC);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_history_type_operation ON coco_cashu_history(type, operationId) WHERE operationId IS NOT NULL;

  -- Keypair indexes
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_keypairs_local_name ON coco_cashu_keypairs(local_name);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_keypairs_createdAt ON coco_cashu_keypairs(createdAt DESC);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_keypairs_derivationIndex ON coco_cashu_keypairs(derivationIndex DESC) WHERE derivationIndex IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_keypairs_purpose_createdAt ON coco_cashu_keypairs(purpose, createdAt DESC);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_keypairs_purpose_derivationIndex ON coco_cashu_keypairs(purpose, derivationIndex DESC) WHERE derivationIndex IS NOT NULL;

  -- Send operations indexes
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_send_operations_local_name ON coco_cashu_send_operations(local_name);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_send_operations_state ON coco_cashu_send_operations(state);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_send_operations_mint ON coco_cashu_send_operations(mintUrl);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_send_operations_createdAt ON coco_cashu_send_operations(createdAt DESC, id DESC);

  -- Melt operations indexes
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_melt_operations_local_name ON coco_cashu_melt_operations(local_name);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_melt_operations_state ON coco_cashu_melt_operations(state);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_melt_operations_mint ON coco_cashu_melt_operations(mintUrl);
  CREATE UNIQUE INDEX IF NOT EXISTS ux_coco_cashu_melt_operations_mint_quote ON coco_cashu_melt_operations(mintUrl, quoteId) WHERE quoteId IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_melt_operations_createdAt ON coco_cashu_melt_operations(createdAt DESC, id DESC);

  -- Receive operations indexes
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_receive_operations_local_name ON coco_cashu_receive_operations(local_name);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_receive_operations_state ON coco_cashu_receive_operations(state);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_receive_operations_mint ON coco_cashu_receive_operations(mintUrl);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_receive_operations_createdAt ON coco_cashu_receive_operations(createdAt DESC, id DESC);

  -- Mint operations indexes
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_mint_operations_local_name ON coco_cashu_mint_operations(local_name);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_mint_operations_state ON coco_cashu_mint_operations(state);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_mint_operations_mint ON coco_cashu_mint_operations(mintUrl);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_mint_operations_mint_quote ON coco_cashu_mint_operations(mintUrl, quoteId) WHERE quoteId IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_mint_operations_mint_method_quote ON coco_cashu_mint_operations(mintUrl, method, quoteId) WHERE quoteId IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_mint_operations_createdAt ON coco_cashu_mint_operations(createdAt DESC, id DESC);

  -- Auth sessions indexes
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_auth_sessions_local_name ON coco_cashu_auth_sessions(local_name);

  -- Payment request receive operations indexes
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_pr_receive_operations_local_name ON coco_cashu_payment_request_receive_operations(local_name);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_pr_receive_operations_state ON coco_cashu_payment_request_receive_operations(state);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_pr_receive_operations_request_id ON coco_cashu_payment_request_receive_operations(requestId);

  -- Payment request receive attempts indexes
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_pr_receive_attempts_local_name ON coco_cashu_payment_request_receive_attempts(local_name);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_pr_receive_attempts_request_operation ON coco_cashu_payment_request_receive_attempts(requestOperationId);
  CREATE INDEX IF NOT EXISTS idx_coco_cashu_pr_receive_attempts_state ON coco_cashu_payment_request_receive_attempts(state);
  CREATE UNIQUE INDEX IF NOT EXISTS ux_coco_cashu_pr_receive_attempts_message ON coco_cashu_payment_request_receive_attempts(transportMessageId) WHERE transportMessageId IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS ux_coco_cashu_pr_receive_attempts_payload ON coco_cashu_payment_request_receive_attempts(requestOperationId, payloadHash);
  CREATE UNIQUE INDEX IF NOT EXISTS ux_coco_cashu_pr_receive_attempts_receive ON coco_cashu_payment_request_receive_attempts(receiveOperationId) WHERE receiveOperationId IS NOT NULL;
`;
const MIGRATION_ID = "d1_fresh_schema_v2";
/**
* Ensures the D1 database schema is initialized.
* For D1, we apply the full final schema as a single batch instead of incremental migrations.
* We still record a migration entry to prevent re-application.
*/
async function ensureSchema(db) {
	let existing;
	try {
		existing = await db.get("SELECT id FROM coco_cashu_migrations WHERE id = ?", [MIGRATION_ID]);
	} catch {}
	if (existing) return;
	await db.exec(SCHEMA_SQL);
	await db.run("INSERT INTO coco_cashu_migrations (id, appliedAt) VALUES (?, ?)", [MIGRATION_ID, getUnixTimeSeconds()]);
}

//#endregion
//#region src/repositories/MintRepository.ts
var D1MintRepository = class {
	db;
	constructor(db) {
		this.db = db;
	}
	async isTrustedMint(mintUrl) {
		return (await this.db.get("SELECT trusted FROM coco_cashu_mints WHERE local_name = ? AND mintUrl = ? LIMIT 1", [this.db.localName, mintUrl]))?.trusted === 1;
	}
	async getMintByUrl(mintUrl) {
		const row = await this.db.get("SELECT mintUrl, name, mintInfo, trusted, createdAt, updatedAt FROM coco_cashu_mints WHERE local_name = ? AND mintUrl = ? LIMIT 1", [this.db.localName, mintUrl]);
		if (!row) throw new Error(`Mint not found: ${mintUrl}`);
		return {
			mintUrl: row.mintUrl,
			name: row.name,
			mintInfo: JSON.parse(row.mintInfo),
			trusted: row.trusted === 1,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt
		};
	}
	async getAllMints() {
		return (await this.db.all("SELECT mintUrl, name, mintInfo, trusted, createdAt, updatedAt FROM coco_cashu_mints WHERE local_name = ?", [this.db.localName])).map((r) => ({
			mintUrl: r.mintUrl,
			name: r.name,
			mintInfo: JSON.parse(r.mintInfo),
			trusted: r.trusted === 1,
			createdAt: r.createdAt,
			updatedAt: r.updatedAt
		}));
	}
	async getAllTrustedMints() {
		return (await this.db.all("SELECT mintUrl, name, mintInfo, trusted, createdAt, updatedAt FROM coco_cashu_mints WHERE local_name = ? AND trusted = 1", [this.db.localName])).map((r) => ({
			mintUrl: r.mintUrl,
			name: r.name,
			mintInfo: JSON.parse(r.mintInfo),
			trusted: r.trusted === 1,
			createdAt: r.createdAt,
			updatedAt: r.updatedAt
		}));
	}
	async addNewMint(mint) {
		await this.db.run(`INSERT INTO coco_cashu_mints (local_name, mintUrl, name, mintInfo, trusted, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(local_name, mintUrl) DO UPDATE SET
         name=excluded.name,
         mintInfo=excluded.mintInfo,
         trusted=excluded.trusted,
         createdAt=excluded.createdAt,
         updatedAt=excluded.updatedAt`, [
			this.db.localName,
			mint.mintUrl,
			mint.name,
			JSON.stringify(mint.mintInfo),
			mint.trusted ? 1 : 0,
			mint.createdAt,
			mint.updatedAt
		]);
	}
	async addOrUpdateMint(mint) {
		await this.db.run(`INSERT INTO coco_cashu_mints (local_name, mintUrl, name, mintInfo, trusted, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(local_name, mintUrl) DO UPDATE SET
         name=excluded.name,
         mintInfo=excluded.mintInfo,
         trusted=excluded.trusted,
         updatedAt=excluded.updatedAt`, [
			this.db.localName,
			mint.mintUrl,
			mint.name,
			JSON.stringify(mint.mintInfo),
			mint.trusted ? 1 : 0,
			mint.createdAt,
			mint.updatedAt
		]);
	}
	async updateMint(mint) {
		await this.addNewMint(mint);
	}
	async setMintTrusted(mintUrl, trusted) {
		await this.db.run("UPDATE coco_cashu_mints SET trusted = ? WHERE local_name = ? AND mintUrl = ?", [
			trusted ? 1 : 0,
			this.db.localName,
			mintUrl
		]);
	}
	async deleteMint(mintUrl) {
		await this.db.run("DELETE FROM coco_cashu_mints WHERE local_name = ? AND mintUrl = ?", [this.db.localName, mintUrl]);
	}
};

//#endregion
//#region src/repositories/KeysetRepository.ts
var D1KeysetRepository = class {
	db;
	constructor(db) {
		this.db = db;
	}
	async getKeysetsByMintUrl(mintUrl) {
		return (await this.db.all("SELECT mintUrl, id, unit, keypairs, active, feePpk, updatedAt FROM coco_cashu_keysets WHERE local_name = ? AND mintUrl = ?", [this.db.localName, mintUrl])).map((r) => ({
			mintUrl: r.mintUrl,
			id: r.id,
			unit: r.unit ?? "",
			keypairs: JSON.parse(r.keypairs),
			active: !!r.active,
			feePpk: r.feePpk,
			updatedAt: r.updatedAt
		}));
	}
	async getKeysetById(mintUrl, id) {
		const row = await this.db.get("SELECT mintUrl, id, unit, keypairs, active, feePpk, updatedAt FROM coco_cashu_keysets WHERE local_name = ? AND mintUrl = ? AND id = ? LIMIT 1", [
			this.db.localName,
			mintUrl,
			id
		]);
		if (!row) return null;
		return {
			mintUrl: row.mintUrl,
			id: row.id,
			unit: row.unit ?? "",
			keypairs: JSON.parse(row.keypairs),
			active: !!row.active,
			feePpk: row.feePpk,
			updatedAt: row.updatedAt
		};
	}
	async updateKeyset(keyset) {
		const now = getUnixTimeSeconds();
		if (!await this.db.get("SELECT keypairs FROM coco_cashu_keysets WHERE local_name = ? AND mintUrl = ? AND id = ? LIMIT 1", [
			this.db.localName,
			keyset.mintUrl,
			keyset.id
		])) {
			await this.db.run("INSERT INTO coco_cashu_keysets (local_name, mintUrl, id, unit, keypairs, active, feePpk, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
				this.db.localName,
				keyset.mintUrl,
				keyset.id,
				keyset.unit,
				JSON.stringify({}),
				keyset.active ? 1 : 0,
				keyset.feePpk,
				now
			]);
			return;
		}
		await this.db.run("UPDATE coco_cashu_keysets SET unit = ?, active = ?, feePpk = ?, updatedAt = ? WHERE local_name = ? AND mintUrl = ? AND id = ?", [
			keyset.unit,
			keyset.active ? 1 : 0,
			keyset.feePpk,
			now,
			this.db.localName,
			keyset.mintUrl,
			keyset.id
		]);
	}
	async addKeyset(keyset) {
		const now = getUnixTimeSeconds();
		await this.db.run(`INSERT INTO coco_cashu_keysets (local_name, mintUrl, id, unit, keypairs, active, feePpk, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(local_name, mintUrl, id) DO UPDATE SET
         unit=excluded.unit,
         keypairs=excluded.keypairs,
         active=excluded.active,
         feePpk=excluded.feePpk,
         updatedAt=excluded.updatedAt`, [
			this.db.localName,
			keyset.mintUrl,
			keyset.id,
			keyset.unit,
			JSON.stringify(keyset.keypairs ?? {}),
			keyset.active ? 1 : 0,
			keyset.feePpk,
			now
		]);
	}
	async deleteKeyset(mintUrl, keysetId) {
		await this.db.run("DELETE FROM coco_cashu_keysets WHERE local_name = ? AND mintUrl = ? AND id = ?", [
			this.db.localName,
			mintUrl,
			keysetId
		]);
	}
};

//#endregion
//#region src/utils.ts
/**
* Safely converts a hex string to Uint8Array with validation
*/
function hexToBytes(hexString) {
	if (!/^[0-9a-fA-F]+$/.test(hexString)) throw new Error(`Invalid hex string: contains non-hex characters`);
	if (hexString.length % 2 !== 0) throw new Error(`Invalid hex string: odd length (${hexString.length})`);
	const matches = hexString.match(/.{2}/g);
	if (!matches) throw new Error(`Failed to parse hex string`);
	return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}
/**
* Converts a Uint8Array to hex string
*/
function bytesToHex(bytes) {
	return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

//#endregion
//#region src/repositories/KeyRingRepository.ts
const DEFAULT_KEYPAIR_PURPOSE = "p2pk";
function rowToKeypair(row) {
	return {
		publicKeyHex: row.publicKey,
		secretKey: hexToBytes(row.secretKey),
		derivationIndex: row.derivationIndex ?? void 0,
		purpose: row.purpose ?? DEFAULT_KEYPAIR_PURPOSE
	};
}
var D1KeyRingRepository = class {
	db;
	constructor(db) {
		this.db = db;
	}
	async getPersistedKeyPair(publicKey, purpose) {
		const row = await this.db.get(`SELECT publicKey, secretKey, derivationIndex, purpose
       FROM coco_cashu_keypairs
       WHERE local_name = ? AND publicKey = ? ${purpose ? "AND purpose = ?" : ""} LIMIT 1`, purpose ? [
			this.db.localName,
			publicKey,
			purpose
		] : [this.db.localName, publicKey]);
		if (!row) return null;
		try {
			return rowToKeypair(row);
		} catch (error) {
			throw new Error(`Failed to parse secret key for public key ${publicKey}: ${error instanceof Error ? error.message : "unknown error"}`);
		}
	}
	async setPersistedKeyPair(keyPair) {
		const secretKeyHex = bytesToHex(keyPair.secretKey);
		const purpose = keyPair.purpose ?? DEFAULT_KEYPAIR_PURPOSE;
		await this.db.run(`INSERT INTO coco_cashu_keypairs (local_name, publicKey, secretKey, createdAt, derivationIndex, purpose)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(local_name, publicKey) DO UPDATE SET
         secretKey=excluded.secretKey,
         derivationIndex=COALESCE(excluded.derivationIndex, coco_cashu_keypairs.derivationIndex),
         purpose=excluded.purpose`, [
			this.db.localName,
			keyPair.publicKeyHex,
			secretKeyHex,
			Date.now(),
			keyPair.derivationIndex ?? null,
			purpose
		]);
	}
	async deletePersistedKeyPair(publicKey, purpose) {
		await this.db.run(`DELETE FROM coco_cashu_keypairs WHERE local_name = ? AND publicKey = ? ${purpose ? "AND purpose = ?" : ""}`, purpose ? [
			this.db.localName,
			publicKey,
			purpose
		] : [this.db.localName, publicKey]);
	}
	async getAllPersistedKeyPairs(purpose) {
		return (await this.db.all(`SELECT publicKey, secretKey, derivationIndex, purpose
       FROM coco_cashu_keypairs WHERE local_name = ? ${purpose ? "AND purpose = ?" : ""}`, purpose ? [this.db.localName, purpose] : [this.db.localName])).map((row) => {
			try {
				return rowToKeypair(row);
			} catch (error) {
				throw new Error(`Failed to parse secret key for public key ${row.publicKey}: ${error instanceof Error ? error.message : "unknown error"}`);
			}
		});
	}
	async getLatestKeyPair(purpose) {
		const row = await this.db.get(`SELECT publicKey, secretKey, derivationIndex, purpose
       FROM coco_cashu_keypairs
       WHERE local_name = ? ${purpose ? "AND purpose = ?" : ""}
       ORDER BY createdAt DESC LIMIT 1`, purpose ? [this.db.localName, purpose] : [this.db.localName]);
		if (!row) return null;
		try {
			return rowToKeypair(row);
		} catch (error) {
			throw new Error(`Failed to parse latest secret key for public key ${row.publicKey}: ${error instanceof Error ? error.message : "unknown error"}`);
		}
	}
	async getLastDerivationIndex(purpose) {
		return (await this.db.get(`SELECT derivationIndex FROM coco_cashu_keypairs
       WHERE local_name = ? AND derivationIndex IS NOT NULL ${purpose ? "AND purpose = ?" : ""}
       ORDER BY derivationIndex DESC LIMIT 1`, purpose ? [this.db.localName, purpose] : [this.db.localName]))?.derivationIndex ?? -1;
	}
};

//#endregion
//#region src/repositories/CounterRepository.ts
var D1CounterRepository = class {
	db;
	constructor(db) {
		this.db = db;
	}
	async getCounter(mintUrl, keysetId) {
		const row = await this.db.get("SELECT counter FROM coco_cashu_counters WHERE local_name = ? AND mintUrl = ? AND keysetId = ? LIMIT 1", [
			this.db.localName,
			mintUrl,
			keysetId
		]);
		if (!row) return null;
		return {
			mintUrl,
			keysetId,
			counter: row.counter
		};
	}
	async setCounter(mintUrl, keysetId, counter) {
		await this.db.run(`INSERT INTO coco_cashu_counters (local_name, mintUrl, keysetId, counter)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(local_name, mintUrl, keysetId) DO UPDATE SET counter = excluded.counter`, [
			this.db.localName,
			mintUrl,
			keysetId,
			counter
		]);
	}
};

//#endregion
//#region src/repositories/ProofRepository.ts
const MAX_PROOF_SECRET_LOOKUP_BATCH_SIZE = 900;
const PROOF_COLUMNS = "mintUrl, id, unit, amount, secret, C, dleqJson, witnessJson, state, usedByOperationId, createdByOperationId";
function normalizeProofUnit(proof) {
	return normalizeUnit(proof.unit);
}
function getUnitFilter(filter) {
	const units = [...filter?.units ?? [], ...filter?.unit ? [filter.unit] : []];
	if (units.length === 0) return void 0;
	return Array.from(new Set(units.map((unit) => normalizeUnit(unit))));
}
function appendUnitFilter(sql, params, filter) {
	const units = getUnitFilter(filter);
	if (!units || units.length === 0) return sql;
	if (units.length === 1) {
		params.push(units[0]);
		return `${sql} AND unit = ?`;
	}
	params.push(...units);
	return `${sql} AND unit IN (${units.map(() => "?").join(", ")})`;
}
function rowToProof(r) {
	return {
		id: r.id,
		amount: deserializeAmount(r.amount),
		secret: r.secret,
		C: r.C,
		...r.dleqJson ? { dleq: JSON.parse(r.dleqJson) } : {},
		...r.witnessJson ? { witness: JSON.parse(r.witnessJson) } : {},
		mintUrl: r.mintUrl,
		unit: normalizeUnit(r.unit ?? void 0, { defaultUnit: DEFAULT_UNIT }),
		state: r.state,
		...r.usedByOperationId ? { usedByOperationId: r.usedByOperationId } : {},
		...r.createdByOperationId ? { createdByOperationId: r.createdByOperationId } : {}
	};
}
var D1ProofRepository = class {
	db;
	constructor(db) {
		this.db = db;
	}
	async saveProofs(mintUrl, proofs) {
		if (!proofs || proofs.length === 0) return;
		const now = getUnixTimeSeconds();
		const normalizedProofs = proofs.map((proof) => ({
			...proof,
			unit: normalizeProofUnit(proof)
		}));
		for (let i = 0; i < normalizedProofs.length; i += MAX_PROOF_SECRET_LOOKUP_BATCH_SIZE) {
			const secrets = normalizedProofs.slice(i, i + MAX_PROOF_SECRET_LOOKUP_BATCH_SIZE).map((p) => p.secret);
			const placeholders = secrets.map(() => "?").join(", ");
			const existing = await this.db.all(`SELECT secret FROM coco_cashu_proofs WHERE local_name = ? AND mintUrl = ? AND secret IN (${placeholders})`, [
				this.db.localName,
				mintUrl,
				...secrets
			]);
			if (existing.length > 0) throw new Error(`Proofs with secrets already exist: ${existing.map((r) => r.secret).join(", ")}`);
		}
		const insertSql = "INSERT INTO coco_cashu_proofs (local_name, mintUrl, id, unit, amount, secret, C, dleqJson, witnessJson, state, createdAt, usedByOperationId, createdByOperationId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
		const stmts = normalizedProofs.map((p) => {
			const dleqJson = p.dleq ? JSON.stringify(p.dleq) : null;
			const witnessJson = p.witness ? JSON.stringify(p.witness) : null;
			return this.db.prepare(insertSql).bind(this.db.localName, mintUrl, p.id, p.unit, serializeAmount(p.amount), p.secret, p.C, dleqJson, witnessJson, p.state, now, p.usedByOperationId ?? null, p.createdByOperationId ?? null);
		});
		await this.db.batch(stmts);
	}
	async getReadyProofs(mintUrl, filter) {
		const params = [this.db.localName, mintUrl];
		return (await this.db.all(appendUnitFilter(`SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND mintUrl = ? AND state = 'ready'`, params, filter), params)).map(rowToProof);
	}
	async getInflightProofs(mintUrls, filter) {
		if (!mintUrls || mintUrls.length === 0) {
			const params = [this.db.localName];
			return (await this.db.all(appendUnitFilter(`SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND state = 'inflight'`, params, filter), params)).map(rowToProof);
		}
		const mintUrlList = mintUrls.map((url) => url.trim()).filter((url) => url.length > 0);
		if (mintUrlList.length === 0) return [];
		const uniqueMintUrls = Array.from(new Set(mintUrlList));
		const placeholders = uniqueMintUrls.map(() => "?").join(", ");
		const params = [this.db.localName, ...uniqueMintUrls];
		return (await this.db.all(appendUnitFilter(`SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND state = 'inflight' AND mintUrl IN (${placeholders})`, params, filter), params)).map(rowToProof);
	}
	async getAllReadyProofs(filter) {
		const params = [this.db.localName];
		return (await this.db.all(appendUnitFilter(`SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND state = 'ready'`, params, filter), params)).map(rowToProof);
	}
	async getProofsByKeysetId(mintUrl, keysetId, filter) {
		const params = [
			this.db.localName,
			mintUrl,
			keysetId
		];
		return (await this.db.all(appendUnitFilter(`SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND mintUrl = ? AND id = ? AND state = 'ready'`, params, filter), params)).map(rowToProof);
	}
	async setProofState(mintUrl, secrets, state) {
		if (!secrets || secrets.length === 0) return;
		const stmts = secrets.map((s) => this.db.prepare("UPDATE coco_cashu_proofs SET state = ? WHERE local_name = ? AND mintUrl = ? AND secret = ?").bind(state, this.db.localName, mintUrl, s));
		await this.db.batch(stmts);
	}
	async deleteProofs(mintUrl, secrets) {
		if (!secrets || secrets.length === 0) return;
		const stmts = secrets.map((s) => this.db.prepare("DELETE FROM coco_cashu_proofs WHERE local_name = ? AND mintUrl = ? AND secret = ?").bind(this.db.localName, mintUrl, s));
		await this.db.batch(stmts);
	}
	async wipeProofsByKeysetId(mintUrl, keysetId) {
		await this.db.run("DELETE FROM coco_cashu_proofs WHERE local_name = ? AND mintUrl = ? AND id = ?;", [
			this.db.localName,
			mintUrl,
			keysetId
		]);
	}
	async reserveProofs(mintUrl, secrets, operationId) {
		if (!secrets || secrets.length === 0) return;
		const stmts = secrets.map((secret) => this.db.prepare("UPDATE coco_cashu_proofs SET usedByOperationId = ? WHERE local_name = ? AND mintUrl = ? AND secret = ? AND state = 'ready' AND usedByOperationId IS NULL").bind(operationId, this.db.localName, mintUrl, secret));
		const results = await this.db.batch(stmts);
		for (let i = 0; i < results.length; i++) if (!results[i]?.meta?.changes) {
			if (i > 0) {
				const releaseStmts = secrets.slice(0, i).map((secret) => this.db.prepare("UPDATE coco_cashu_proofs SET usedByOperationId = NULL WHERE local_name = ? AND mintUrl = ? AND secret = ?").bind(this.db.localName, mintUrl, secret));
				await this.db.batch(releaseStmts);
			}
			throw new Error(`Proof is not available for reservation: ${secrets[i]}`);
		}
	}
	async releaseProofs(mintUrl, secrets) {
		if (!secrets || secrets.length === 0) return;
		const stmts = secrets.map((s) => this.db.prepare("UPDATE coco_cashu_proofs SET usedByOperationId = NULL WHERE local_name = ? AND mintUrl = ? AND secret = ?").bind(this.db.localName, mintUrl, s));
		await this.db.batch(stmts);
	}
	async setCreatedByOperation(mintUrl, secrets, operationId) {
		if (!secrets || secrets.length === 0) return;
		const stmts = secrets.map((s) => this.db.prepare("UPDATE coco_cashu_proofs SET createdByOperationId = ? WHERE local_name = ? AND mintUrl = ? AND secret = ?").bind(operationId, this.db.localName, mintUrl, s));
		await this.db.batch(stmts);
	}
	async getProofBySecret(mintUrl, secret) {
		const row = await this.db.get(`SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND mintUrl = ? AND secret = ?`, [
			this.db.localName,
			mintUrl,
			secret
		]);
		return row ? rowToProof(row) : null;
	}
	async getProofsBySecrets(mintUrl, secrets) {
		if (!secrets || secrets.length === 0) return [];
		const uniqueSecrets = Array.from(new Set(secrets));
		const proofsBySecret = /* @__PURE__ */ new Map();
		for (let i = 0; i < uniqueSecrets.length; i += MAX_PROOF_SECRET_LOOKUP_BATCH_SIZE) {
			const secretBatch = uniqueSecrets.slice(i, i + MAX_PROOF_SECRET_LOOKUP_BATCH_SIZE);
			const placeholders = secretBatch.map(() => "?").join(", ");
			const rows = await this.db.all(`SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND mintUrl = ? AND secret IN (${placeholders})`, [
				this.db.localName,
				mintUrl,
				...secretBatch
			]);
			for (const row of rows) proofsBySecret.set(row.secret, rowToProof(row));
		}
		return uniqueSecrets.flatMap((secret) => {
			const proof = proofsBySecret.get(secret);
			return proof ? [proof] : [];
		});
	}
	async getProofsByOperationId(mintUrl, operationId) {
		return (await this.db.all(`SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND mintUrl = ? AND (usedByOperationId = ? OR createdByOperationId = ?)`, [
			this.db.localName,
			mintUrl,
			operationId,
			operationId
		])).map(rowToProof);
	}
	async getAvailableProofs(mintUrl, filter) {
		const params = [this.db.localName, mintUrl];
		return (await this.db.all(appendUnitFilter(`SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND mintUrl = ? AND state = 'ready' AND usedByOperationId IS NULL`, params, filter), params)).map(rowToProof);
	}
	async getReservedProofs() {
		return (await this.db.all(`SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND state = 'ready' AND usedByOperationId IS NOT NULL`, [this.db.localName])).map(rowToProof);
	}
};

//#endregion
//#region src/repositories/MeltQuoteRepository.ts
function rowToQuote(row) {
	const base = {
		mintUrl: row.mintUrl,
		method: row.method,
		quoteId: row.quoteId,
		quote: row.quoteId,
		state: row.state,
		request: row.request,
		amount: deserializeAmount(row.amount),
		unit: row.unit,
		expiry: row.expiry,
		change: row.changeJson ? JSON.parse(row.changeJson) : void 0,
		lastObservedRemoteState: row.lastObservedRemoteState ?? void 0,
		lastObservedRemoteStateAt: row.lastObservedRemoteStateAt ?? void 0,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
	if (row.method === "onchain") {
		const feeOptions = row.fee_options_json ? JSON.parse(row.fee_options_json) : void 0;
		if (!Array.isArray(feeOptions) || feeOptions.length === 0) throw new Error(`Stored onchain melt quote ${row.quoteId} is missing fee_options`);
		return {
			...base,
			method: "onchain",
			fee_options: feeOptions.map((option) => ({
				...option,
				fee_reserve: deserializeAmount(option.fee_reserve)
			})),
			outpoint: row.outpoint ?? void 0
		};
	}
	if (row.fee_reserve === null || row.fee_reserve === void 0) throw new Error(`Stored BOLT melt quote ${row.quoteId} is missing fee_reserve`);
	return {
		...base,
		method: row.method,
		fee_reserve: deserializeAmount(row.fee_reserve),
		payment_preimage: row.payment_preimage ?? void 0
	};
}
var D1MeltQuoteRepository = class {
	constructor(db) {
		this.db = db;
	}
	async getMeltQuote(mintUrl, method, quoteId) {
		const row = await this.db.get(`SELECT mintUrl, method, quoteId, state, request, amount, unit, fee_reserve, expiry,
              payment_preimage, fee_options_json, outpoint, changeJson, lastObservedRemoteState, lastObservedRemoteStateAt,
              createdAt, updatedAt
       FROM coco_cashu_melt_quotes
       WHERE local_name = ? AND mintUrl = ? AND method = ? AND quoteId = ? LIMIT 1`, [
			this.db.localName,
			normalizeMintUrl(mintUrl),
			method,
			quoteId
		]);
		return row ? rowToQuote(row) : null;
	}
	async upsertMeltQuote(quote) {
		const now = Date.now();
		await this.db.run(`INSERT INTO coco_cashu_melt_quotes
         (local_name, mintUrl, method, quoteId, state, request, amount, unit, fee_reserve, expiry,
          payment_preimage, fee_options_json, outpoint, changeJson, lastObservedRemoteState,
          lastObservedRemoteStateAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(local_name, mintUrl, method, quoteId) DO UPDATE SET
         state=excluded.state,
         request=excluded.request,
         amount=excluded.amount,
         unit=excluded.unit,
         fee_reserve=excluded.fee_reserve,
         expiry=excluded.expiry,
         payment_preimage=excluded.payment_preimage,
         fee_options_json=excluded.fee_options_json,
         outpoint=excluded.outpoint,
         changeJson=excluded.changeJson,
         lastObservedRemoteState=excluded.lastObservedRemoteState,
         lastObservedRemoteStateAt=excluded.lastObservedRemoteStateAt,
         updatedAt=excluded.updatedAt`, [
			this.db.localName,
			normalizeMintUrl(quote.mintUrl),
			quote.method,
			quote.quoteId,
			quote.state,
			quote.request,
			serializeAmount(quote.amount),
			quote.unit,
			quote.method === "onchain" ? null : serializeAmount(quote.fee_reserve),
			quote.expiry,
			quote.method === "onchain" ? null : quote.payment_preimage ?? null,
			quote.method === "onchain" ? stringifyJson(quote.fee_options.map((option) => ({
				...option,
				fee_reserve: serializeAmount(option.fee_reserve)
			}))) : null,
			quote.method === "onchain" ? quote.outpoint ?? null : null,
			quote.change ? stringifyJson(quote.change) : null,
			quote.lastObservedRemoteState ?? quote.state,
			quote.lastObservedRemoteStateAt ?? now,
			quote.createdAt,
			quote.updatedAt || now
		]);
	}
	async getPendingMeltQuotes(method) {
		return (await this.db.all(`SELECT mintUrl, method, quoteId, state, request, amount, unit, fee_reserve, expiry,
              payment_preimage, fee_options_json, outpoint, changeJson, lastObservedRemoteState, lastObservedRemoteStateAt,
              createdAt, updatedAt
       FROM coco_cashu_melt_quotes
       WHERE local_name = ? AND state != 'PAID' ${method ? "AND method = ?" : ""}`, method ? [this.db.localName, method] : [this.db.localName])).map(rowToQuote);
	}
};

//#endregion
//#region src/repositories/MintQuoteRepository.ts
function parseQuoteData(value) {
	if (!value) return {};
	const parsed = JSON.parse(value);
	return parsed && typeof parsed === "object" ? parsed : {};
}
function rowToMintQuote(row) {
	const quoteData = parseQuoteData(row.quoteDataJson);
	if (row.method === "onchain" || row.method === "bolt12") {
		const pubkey = quoteData.pubkey ?? row.pubkey ?? "";
		const amountValue = quoteData.amount ?? row.amount ?? void 0;
		const amount = row.method === "bolt12" && amountValue !== void 0 ? deserializeAmount(amountValue) : void 0;
		return {
			mintUrl: row.mintUrl,
			method: row.method,
			quoteId: row.quoteId,
			quote: row.quoteId,
			request: row.request,
			unit: row.unit,
			...amount !== void 0 ? { amount } : {},
			expiry: row.expiry,
			pubkey,
			reusable: true,
			quoteData: {
				pubkey,
				...amount !== void 0 ? { amount } : {},
				amountPaid: deserializeAmount(quoteData.amountPaid ?? 0),
				amountIssued: deserializeAmount(quoteData.amountIssued ?? 0)
			},
			lastObservedRemoteStateAt: row.lastObservedRemoteStateAt ?? void 0,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt
		};
	}
	const amount = deserializeAmount(quoteData.amount ?? row.amount ?? 0);
	const state = row.state ?? row.lastObservedRemoteState ?? "UNPAID";
	return {
		mintUrl: row.mintUrl,
		method: "bolt11",
		quoteId: row.quoteId,
		quote: row.quoteId,
		state,
		request: row.request,
		amount,
		unit: row.unit,
		expiry: row.expiry,
		pubkey: row.pubkey ?? void 0,
		lastObservedRemoteState: row.lastObservedRemoteState ?? state,
		lastObservedRemoteStateAt: row.lastObservedRemoteStateAt ?? void 0,
		reusable: false,
		quoteData: { amount },
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}
function serializeQuoteData(quote) {
	if (isStatefulMintQuote(quote)) return stringifyJson({ amount: serializeAmount(quote.quoteData.amount) });
	if (quote.method === "bolt12") {
		const amount = quote.quoteData.amount ?? quote.amount;
		return stringifyJson({
			pubkey: quote.quoteData.pubkey,
			...amount !== void 0 ? { amount: serializeAmount(amount) } : {},
			amountPaid: serializeAmount(quote.quoteData.amountPaid),
			amountIssued: serializeAmount(quote.quoteData.amountIssued)
		});
	}
	return stringifyJson({
		pubkey: quote.quoteData.pubkey,
		amountPaid: serializeAmount(quote.quoteData.amountPaid),
		amountIssued: serializeAmount(quote.quoteData.amountIssued)
	});
}
var D1MintQuoteRepository = class {
	db;
	constructor(db) {
		this.db = db;
	}
	async getMintQuoteById(identity) {
		const normalizedMintUrl = normalizeMintUrl(identity.mintUrl);
		const rows = await this.db.all(`SELECT mintUrl, method, quoteId, state, request, amount, unit, expiry, pubkey,
              quoteDataJson, lastObservedRemoteState, lastObservedRemoteStateAt, reusable,
              createdAt, updatedAt
       FROM coco_cashu_canonical_mint_quotes
       WHERE local_name = ? AND mintUrl = ? AND quoteId = ?`, [
			this.db.localName,
			normalizedMintUrl,
			identity.quoteId
		]);
		if (rows.length === 0) return null;
		return rowToMintQuote(rows[0]);
	}
	async getMintQuote(mintUrl, method, quoteId) {
		const row = await this.db.get(`SELECT mintUrl, method, quoteId, state, request, amount, unit, expiry, pubkey,
              quoteDataJson, lastObservedRemoteState, lastObservedRemoteStateAt, reusable,
              createdAt, updatedAt
       FROM coco_cashu_canonical_mint_quotes
       WHERE local_name = ? AND mintUrl = ? AND method = ? AND quoteId = ? LIMIT 1`, [
			this.db.localName,
			normalizeMintUrl(mintUrl),
			method,
			quoteId
		]);
		return row ? rowToMintQuote(row) : null;
	}
	async upsertMintQuote(quote) {
		const now = Date.now();
		const state = getMintQuoteRemoteState(quote) ?? null;
		const amount = getMintQuoteAmount(quote);
		await this.db.run(`INSERT INTO coco_cashu_canonical_mint_quotes
         (local_name, mintUrl, method, quoteId, state, request, amount, unit, expiry, pubkey, quoteDataJson,
          lastObservedRemoteState, lastObservedRemoteStateAt, reusable, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(local_name, mintUrl, method, quoteId) DO UPDATE SET
         state=excluded.state,
         request=excluded.request,
         amount=excluded.amount,
         unit=excluded.unit,
         expiry=excluded.expiry,
         pubkey=excluded.pubkey,
         quoteDataJson=excluded.quoteDataJson,
         lastObservedRemoteState=excluded.lastObservedRemoteState,
         lastObservedRemoteStateAt=excluded.lastObservedRemoteStateAt,
         reusable=excluded.reusable,
         updatedAt=excluded.updatedAt`, [
			this.db.localName,
			normalizeMintUrl(quote.mintUrl),
			quote.method,
			quote.quoteId,
			state,
			quote.request,
			amount ? serializeAmount(amount) : null,
			quote.unit,
			quote.expiry,
			quote.pubkey ?? null,
			serializeQuoteData(quote),
			getMintQuoteRemoteState(quote) ?? null,
			quote.lastObservedRemoteStateAt ?? now,
			quote.reusable ? 1 : 0,
			quote.createdAt,
			quote.updatedAt || now
		]);
	}
	async setMintQuoteState(mintUrl, method, quoteId, state, observedAt = Date.now()) {
		await this.db.run(`UPDATE coco_cashu_canonical_mint_quotes
       SET state = ?, lastObservedRemoteState = ?, lastObservedRemoteStateAt = ?, updatedAt = ?
       WHERE local_name = ? AND mintUrl = ? AND method = ? AND quoteId = ?`, [
			state,
			state,
			observedAt,
			observedAt,
			this.db.localName,
			normalizeMintUrl(mintUrl),
			method,
			quoteId
		]);
	}
	async getPendingMintQuotes(method) {
		return (await this.db.all(`SELECT mintUrl, method, quoteId, state, request, amount, unit, expiry, pubkey,
              quoteDataJson, lastObservedRemoteState, lastObservedRemoteStateAt, reusable,
              createdAt, updatedAt
       FROM coco_cashu_canonical_mint_quotes
       WHERE local_name = ? AND (state IS NULL OR state != 'ISSUED') ${method ? "AND method = ?" : ""}`, method ? [this.db.localName, method] : [this.db.localName])).map(rowToMintQuote).filter(isMintQuotePending);
	}
};

//#endregion
//#region src/repositories/LegacyMintQuoteRepository.ts
var D1LegacyMintQuoteRepository = class {
	constructor(db) {
		this.db = db;
	}
	async getPendingLegacyMintQuotes(mintUrl) {
		const normalizedMintUrl = mintUrl ? normalizeMintUrl(mintUrl) : void 0;
		const rows = await this.db.all(`SELECT mintUrl, quote, state, request, amount, unit, expiry, pubkey
       FROM coco_cashu_mint_quotes
       WHERE local_name = ? AND state != 'ISSUED' ${normalizedMintUrl ? "AND mintUrl = ?" : ""}`, normalizedMintUrl ? [this.db.localName, normalizedMintUrl] : [this.db.localName]);
		const now = Date.now();
		return rows.map((row) => ({
			mintUrl: row.mintUrl,
			method: "bolt11",
			quoteId: row.quote,
			quote: row.quote,
			state: row.state,
			request: row.request,
			amount: deserializeAmount(row.amount),
			unit: row.unit,
			expiry: row.expiry,
			pubkey: row.pubkey ?? void 0,
			lastObservedRemoteState: row.state,
			lastObservedRemoteStateAt: now,
			reusable: false,
			quoteData: { amount: deserializeAmount(row.amount) },
			createdAt: now,
			updatedAt: now
		}));
	}
};

//#endregion
//#region src/repositories/HistoryRepository.ts
function buildProjectionSelect(ln) {
	return `
  SELECT *
  FROM (
    SELECT
      'operation' AS source,
      'send:' || id AS id,
      NULL AS legacyHistoryId,
      'send' AS type,
      mintUrl,
      COALESCE(unit, 'sat') AS unit,
      amount,
      createdAt * 1000 AS createdAt,
      updatedAt * 1000 AS updatedAt,
      state,
      NULL AS quoteId,
      NULL AS paymentRequest,
      tokenJson,
      NULL AS inputProofsJson,
      NULL AS metadata,
      id AS operationId,
      NULL AS remoteState,
      error
    FROM coco_cashu_send_operations
    WHERE local_name = '${ln}' AND state != 'init'

    UNION ALL

    SELECT
      'operation' AS source,
      'melt:' || id AS id,
      NULL AS legacyHistoryId,
      'melt' AS type,
      mintUrl,
      COALESCE(unit, 'sat') AS unit,
      amount,
      createdAt * 1000 AS createdAt,
      updatedAt * 1000 AS updatedAt,
      state,
      quoteId,
      NULL AS paymentRequest,
      NULL AS tokenJson,
      NULL AS inputProofsJson,
      NULL AS metadata,
      id AS operationId,
      NULL AS remoteState,
      error
    FROM coco_cashu_melt_operations
    WHERE local_name = '${ln}' AND state IN ('prepared', 'executing', 'pending', 'finalized', 'rolling_back', 'rolled_back')

    UNION ALL

    SELECT
      'operation' AS source,
      'mint:' || op.id AS id,
      NULL AS legacyHistoryId,
      'mint' AS type,
      op.mintUrl,
      op.unit,
      op.amount,
      op.createdAt * 1000 AS createdAt,
      op.updatedAt * 1000 AS updatedAt,
      op.state,
      op.quoteId,
      op.request AS paymentRequest,
      NULL AS tokenJson,
      NULL AS inputProofsJson,
      NULL AS metadata,
      op.id AS operationId,
      q.lastObservedRemoteState AS remoteState,
      op.error
    FROM coco_cashu_mint_operations op
    LEFT JOIN coco_cashu_canonical_mint_quotes q
      ON q.local_name = op.local_name
     AND q.mintUrl = op.mintUrl
     AND q.method = op.method
     AND q.quoteId = op.quoteId
    WHERE op.local_name = '${ln}' AND op.state != 'init'

    UNION ALL

    SELECT
      'operation' AS source,
      'receive:' || id AS id,
      NULL AS legacyHistoryId,
      'receive' AS type,
      mintUrl,
      COALESCE(unit, 'sat') AS unit,
      amount,
      createdAt * 1000 AS createdAt,
      updatedAt * 1000 AS updatedAt,
      state,
      NULL AS quoteId,
      NULL AS paymentRequest,
      NULL AS tokenJson,
      inputProofsJson,
      sourceJson AS metadata,
      id AS operationId,
      NULL AS remoteState,
      error
    FROM coco_cashu_receive_operations
    WHERE local_name = '${ln}' AND state IN ('finalized', 'rolled_back')

    UNION ALL

    SELECT
      'legacy' AS source,
      'legacy:' || h.id AS id,
      CAST(h.id AS TEXT) AS legacyHistoryId,
      h.type,
      h.mintUrl,
      h.unit,
      h.amount,
      h.createdAt,
      h.createdAt AS updatedAt,
      COALESCE(h.state, '') AS state,
      h.quoteId,
      h.paymentRequest,
      h.tokenJson,
      NULL AS inputProofsJson,
      h.metadata,
      h.operationId,
      NULL AS remoteState,
      NULL AS error
    FROM coco_cashu_history h
    WHERE h.local_name = '${ln}' AND NOT (
      h.operationId IS NOT NULL AND EXISTS (
        SELECT 1 FROM (
          SELECT 'send' AS type, id AS operationId
          FROM coco_cashu_send_operations
          WHERE local_name = '${ln}' AND state != 'init'
          UNION ALL
          SELECT 'melt' AS type, id AS operationId
          FROM coco_cashu_melt_operations
          WHERE local_name = '${ln}' AND state IN (
            'prepared',
            'executing',
            'pending',
            'finalized',
            'rolling_back',
            'rolled_back'
          )
          UNION ALL
          SELECT 'mint' AS type, id AS operationId
          FROM coco_cashu_mint_operations
          WHERE local_name = '${ln}' AND state != 'init'
          UNION ALL
          SELECT 'receive' AS type, id AS operationId
          FROM coco_cashu_receive_operations
          WHERE local_name = '${ln}' AND state IN ('finalized', 'rolled_back')
        ) op
        WHERE op.type = h.type AND op.operationId = h.operationId
      )
    )
    AND NOT (
      h.operationId IS NULL
      AND h.type IN ('mint', 'melt')
      AND h.quoteId IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM (
          SELECT 'mint' AS type, mintUrl, quoteId
          FROM coco_cashu_mint_operations
          WHERE local_name = '${ln}' AND state != 'init'
          UNION ALL
          SELECT 'melt' AS type, mintUrl, quoteId
          FROM coco_cashu_melt_operations
          WHERE local_name = '${ln}' AND state IN (
            'prepared',
            'executing',
            'pending',
            'finalized',
            'rolling_back',
            'rolled_back'
          )
        ) opq
        WHERE opq.type = h.type AND opq.mintUrl = h.mintUrl AND opq.quoteId = h.quoteId
      )
    )
  )
  `;
}
function parseToken$1(tokenJson) {
	return tokenJson ? deserializeToken(JSON.parse(tokenJson)) : void 0;
}
function parseMetadata(metadata) {
	return metadata ? JSON.parse(metadata) : void 0;
}
function parseReceiveSourceMetadata(sourceJson) {
	if (!sourceJson) return void 0;
	const source = JSON.parse(sourceJson);
	if (source.type !== "payment-request" || typeof source.requestOperationId !== "string" || typeof source.attemptId !== "string" || typeof source.transport !== "string") return;
	return {
		source: "payment-request",
		requestOperationId: source.requestOperationId,
		attemptId: source.attemptId,
		...typeof source.requestId === "string" ? { requestId: source.requestId } : {},
		transport: source.transport,
		...typeof source.transportMessageId === "string" ? { transportMessageId: source.transportMessageId } : {},
		...typeof source.senderPubkey === "string" ? { senderPubkey: source.senderPubkey } : {},
		...typeof source.memo === "string" ? { memo: source.memo } : {}
	};
}
var D1HistoryRepository = class {
	db;
	constructor(db) {
		this.db = db;
	}
	async getPaginatedHistoryEntries(limit, offset) {
		const projectionSelect = buildProjectionSelect(this.db.localName);
		return (await this.db.all(`${projectionSelect}
       ORDER BY createdAt DESC, id DESC
       LIMIT ? OFFSET ?`, [limit, offset])).map(rowToEntry);
	}
	async getHistoryEntryById(id) {
		const parsed = parseHistoryEntryId(id);
		if (!parsed) return null;
		const projectionSelect = buildProjectionSelect(this.db.localName);
		if (parsed.source === "legacy") {
			const row = await this.db.get(`${projectionSelect}
         WHERE source = 'legacy' AND legacyHistoryId = ?
         LIMIT 1`, [parsed.legacyHistoryId]);
			return row ? rowToEntry(row) : null;
		}
		const row = await this.db.get(`${projectionSelect}
       WHERE source = 'operation' AND type = ? AND operationId = ?
       LIMIT 1`, [parsed.type, parsed.operationId]);
		return row ? rowToEntry(row) : null;
	}
};
function rowToEntry(row) {
	if (row.source === "legacy") return projectLegacyHistoryRow(rowToLegacyInput(row));
	const base = {
		id: operationHistoryId(row.type, row.operationId ?? ""),
		source: "operation",
		type: row.type,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		mintUrl: row.mintUrl,
		unit: row.unit ?? "sat",
		operationId: row.operationId ?? "",
		amount: deserializeAmount(row.amount),
		state: row.state,
		...row.error ? { error: row.error } : {}
	};
	switch (row.type) {
		case "mint": return {
			...base,
			type: "mint",
			quoteId: row.quoteId ?? "",
			paymentRequest: row.paymentRequest ?? "",
			state: row.state,
			...row.remoteState ? { remoteState: row.remoteState } : {}
		};
		case "melt": return {
			...base,
			type: "melt",
			quoteId: row.quoteId ?? "",
			state: row.state
		};
		case "send": {
			const token = parseToken$1(row.tokenJson);
			return {
				...base,
				type: "send",
				state: row.state,
				...token ? { token } : {}
			};
		}
		case "receive": {
			const metadata = parseReceiveSourceMetadata(row.metadata);
			return {
				...base,
				type: "receive",
				state: row.state,
				...metadata ? { metadata } : {},
				...row.state === "finalized" ? { token: {
					mint: row.mintUrl,
					proofs: parseTokenProofs(row.inputProofsJson),
					unit: row.unit ?? "sat"
				} } : {}
			};
		}
	}
}
function rowToLegacyInput(row) {
	return {
		legacyHistoryId: row.legacyHistoryId ?? row.id.slice(7),
		type: row.type,
		createdAt: row.createdAt,
		mintUrl: row.mintUrl,
		unit: row.unit ?? "sat",
		amount: deserializeAmount(row.amount),
		quoteId: row.quoteId,
		state: row.state || null,
		paymentRequest: row.paymentRequest,
		token: parseToken$1(row.tokenJson),
		metadata: parseMetadata(row.metadata),
		operationId: row.operationId
	};
}
function parseTokenProofs(inputProofsJson) {
	return (inputProofsJson ? JSON.parse(inputProofsJson) : []).map((proof) => ({
		...proof,
		amount: deserializeAmount(proof.amount)
	}));
}

//#endregion
//#region src/repositories/SendOperationRepository.ts
function parseToken(tokenJson) {
	return tokenJson ? deserializeToken(JSON.parse(tokenJson)) : void 0;
}
function serializeToken(operation) {
	const maybeTokenOperation = operation;
	return maybeTokenOperation.token ? JSON.stringify(maybeTokenOperation.token) : null;
}
function rowToOperation$4(row) {
	const base = {
		id: row.id,
		mintUrl: row.mintUrl,
		amount: deserializeAmount(row.amount),
		unit: normalizeUnit(row.unit ?? "sat"),
		createdAt: row.createdAt * 1e3,
		updatedAt: row.updatedAt * 1e3,
		error: row.error ?? void 0,
		method: row.method,
		methodData: JSON.parse(row.methodDataJson)
	};
	if (row.state === "init") return {
		...base,
		state: "init"
	};
	const preparedData = {
		needsSwap: row.needsSwap === 1,
		fee: deserializeAmount(row.fee ?? 0),
		inputAmount: deserializeAmount(row.inputAmount ?? 0),
		inputProofSecrets: row.inputProofSecretsJson ? JSON.parse(row.inputProofSecretsJson) : [],
		outputData: row.outputDataJson ? JSON.parse(row.outputDataJson) : void 0
	};
	switch (row.state) {
		case "prepared": return {
			...base,
			state: "prepared",
			...preparedData
		};
		case "executing": return {
			...base,
			state: "executing",
			...preparedData
		};
		case "pending": return {
			...base,
			state: "pending",
			...preparedData,
			token: parseToken(row.tokenJson)
		};
		case "finalized": return {
			...base,
			state: "finalized",
			...preparedData,
			token: parseToken(row.tokenJson)
		};
		case "rolling_back": return {
			...base,
			state: "rolling_back",
			...preparedData,
			token: parseToken(row.tokenJson)
		};
		case "rolled_back": return {
			...base,
			state: "rolled_back",
			...preparedData,
			token: parseToken(row.tokenJson)
		};
		default: throw new Error(`Unknown state: ${row.state}`);
	}
}
function operationToParams$3(ln, op) {
	const createdAtSeconds = Math.floor(op.createdAt / 1e3);
	const updatedAtSeconds = Math.floor(op.updatedAt / 1e3);
	if (op.state === "init") return [
		ln,
		op.id,
		op.mintUrl,
		serializeAmount(op.amount),
		op.unit,
		op.state,
		createdAtSeconds,
		updatedAtSeconds,
		op.error ?? null,
		op.method,
		stringifyJson(op.methodData),
		null,
		null,
		null,
		null,
		null,
		null
	];
	return [
		ln,
		op.id,
		op.mintUrl,
		serializeAmount(op.amount),
		op.unit,
		op.state,
		createdAtSeconds,
		updatedAtSeconds,
		op.error ?? null,
		op.method,
		stringifyJson(op.methodData),
		op.needsSwap ? 1 : 0,
		serializeAmount(op.fee),
		serializeAmount(op.inputAmount),
		JSON.stringify(op.inputProofSecrets),
		op.outputData ? JSON.stringify(op.outputData) : null,
		serializeToken(op)
	];
}
var D1SendOperationRepository = class {
	db;
	constructor(db) {
		this.db = db;
	}
	async create(operation) {
		if (await this.db.get("SELECT id FROM coco_cashu_send_operations WHERE local_name = ? AND id = ? LIMIT 1", [this.db.localName, operation.id])) throw new Error(`SendOperation with id ${operation.id} already exists`);
		const params = operationToParams$3(this.db.localName, operation);
		await this.db.run(`INSERT INTO coco_cashu_send_operations
        (local_name, id, mintUrl, amount, unit, state, createdAt, updatedAt, error, method, methodDataJson, needsSwap, fee, inputAmount, inputProofSecretsJson, outputDataJson, tokenJson)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, params);
	}
	async update(operation) {
		if (!await this.db.get("SELECT id FROM coco_cashu_send_operations WHERE local_name = ? AND id = ? LIMIT 1", [this.db.localName, operation.id])) throw new Error(`SendOperation with id ${operation.id} not found`);
		const updatedAtSeconds = getUnixTimeSeconds();
		if (operation.state === "init") await this.db.run(`UPDATE coco_cashu_send_operations
         SET state = ?, updatedAt = ?, error = ?, unit = ?
         WHERE local_name = ? AND id = ?`, [
			operation.state,
			updatedAtSeconds,
			operation.error ?? null,
			operation.unit,
			this.db.localName,
			operation.id
		]);
		else await this.db.run(`UPDATE coco_cashu_send_operations
         SET state = ?, updatedAt = ?, error = ?, unit = ?, needsSwap = ?, fee = ?, inputAmount = ?, inputProofSecretsJson = ?, outputDataJson = ?, tokenJson = ?
         WHERE local_name = ? AND id = ?`, [
			operation.state,
			updatedAtSeconds,
			operation.error ?? null,
			operation.unit,
			operation.needsSwap ? 1 : 0,
			serializeAmount(operation.fee),
			serializeAmount(operation.inputAmount),
			JSON.stringify(operation.inputProofSecrets),
			operation.outputData ? JSON.stringify(operation.outputData) : null,
			serializeToken(operation),
			this.db.localName,
			operation.id
		]);
	}
	async getById(id) {
		const row = await this.db.get("SELECT * FROM coco_cashu_send_operations WHERE local_name = ? AND id = ?", [this.db.localName, id]);
		return row ? rowToOperation$4(row) : null;
	}
	async getByState(state) {
		return (await this.db.all("SELECT * FROM coco_cashu_send_operations WHERE local_name = ? AND state = ?", [this.db.localName, state])).map(rowToOperation$4);
	}
	async getPending() {
		return (await this.db.all(`SELECT * FROM coco_cashu_send_operations WHERE local_name = ? AND state IN ('executing', 'pending', 'rolling_back')`, [this.db.localName])).map(rowToOperation$4);
	}
	async getByMintUrl(mintUrl) {
		return (await this.db.all("SELECT * FROM coco_cashu_send_operations WHERE local_name = ? AND mintUrl = ?", [this.db.localName, mintUrl])).map(rowToOperation$4);
	}
	async delete(id) {
		await this.db.run("DELETE FROM coco_cashu_send_operations WHERE local_name = ? AND id = ?", [this.db.localName, id]);
	}
};

//#endregion
//#region src/repositories/MeltOperationRepository.ts
const getOperationQuoteId = (operation) => "quoteId" in operation && operation.quoteId ? operation.quoteId : void 0;
const preparedStates = [
	"prepared",
	"executing",
	"pending",
	"finalized",
	"rolling_back",
	"rolled_back"
];
const isPreparedState = (state) => preparedStates.includes(state);
const parseMethodData = (row) => normalizeMeltMethodData(JSON.parse(row.methodDataJson));
const rowToOperation$3 = (row) => {
	const base = {
		id: row.id,
		mintUrl: row.mintUrl,
		method: row.method,
		methodData: parseMethodData(row),
		unit: normalizeUnit(row.unit ?? "sat"),
		createdAt: row.createdAt * 1e3,
		updatedAt: row.updatedAt * 1e3,
		error: row.error ?? void 0
	};
	if (!isPreparedState(row.state)) return {
		...base,
		state: "init",
		...row.quoteId ? { quoteId: row.quoteId } : {}
	};
	const preparedData = {
		quoteId: row.quoteId ?? "",
		amount: deserializeAmount(row.amount ?? 0),
		fee_reserve: deserializeAmount(row.fee_reserve ?? 0),
		swap_fee: deserializeAmount(row.swap_fee ?? 0),
		needsSwap: row.needsSwap === 1,
		inputAmount: deserializeAmount(row.inputAmount ?? 0),
		inputProofSecrets: row.inputProofSecretsJson ? JSON.parse(row.inputProofSecretsJson) : [],
		changeOutputData: row.changeOutputDataJson ? JSON.parse(row.changeOutputDataJson) : {
			keep: [],
			send: []
		},
		swapOutputData: row.swapOutputDataJson ? JSON.parse(row.swapOutputDataJson) : void 0
	};
	const operation = {
		...base,
		state: row.state,
		...preparedData
	};
	if (row.state === "finalized") return {
		...operation,
		changeAmount: row.changeAmount !== null ? deserializeAmount(row.changeAmount) : void 0,
		effectiveFee: row.effectiveFee !== null ? deserializeAmount(row.effectiveFee) : void 0,
		finalizedData: row.finalizedDataJson ? JSON.parse(row.finalizedDataJson) : void 0
	};
	return operation;
};
const operationToParams$2 = (ln, operation) => {
	const createdAtSeconds = Math.floor(operation.createdAt / 1e3);
	const updatedAtSeconds = Math.floor(operation.updatedAt / 1e3);
	const methodDataJson = stringifyJson(operation.methodData);
	if (operation.state === "init") return [
		ln,
		operation.id,
		operation.mintUrl,
		operation.state,
		createdAtSeconds,
		updatedAtSeconds,
		operation.error ?? null,
		operation.method,
		methodDataJson,
		operation.quoteId ?? null,
		operation.unit,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null
	];
	const settlement = operation;
	const changeAmount = operation.state === "finalized" && settlement.changeAmount !== void 0 ? serializeAmount(settlement.changeAmount) : null;
	const effectiveFee = operation.state === "finalized" && settlement.effectiveFee !== void 0 ? serializeAmount(settlement.effectiveFee) : null;
	const finalizedDataJson = operation.state === "finalized" && settlement.finalizedData !== void 0 ? JSON.stringify(settlement.finalizedData) : null;
	return [
		ln,
		operation.id,
		operation.mintUrl,
		operation.state,
		createdAtSeconds,
		updatedAtSeconds,
		operation.error ?? null,
		operation.method,
		methodDataJson,
		operation.quoteId,
		operation.unit,
		serializeAmount(operation.amount),
		serializeAmount(operation.fee_reserve),
		serializeAmount(operation.swap_fee),
		operation.needsSwap ? 1 : 0,
		serializeAmount(operation.inputAmount),
		JSON.stringify(operation.inputProofSecrets),
		JSON.stringify(operation.changeOutputData),
		operation.swapOutputData ? JSON.stringify(operation.swapOutputData) : null,
		changeAmount,
		effectiveFee,
		finalizedDataJson
	];
};
var D1MeltOperationRepository = class {
	db;
	constructor(db) {
		this.db = db;
	}
	async create(operation) {
		if (operation.state === "failed") throw new Error("Cannot persist failed melt operation");
		if (await this.db.get("SELECT id FROM coco_cashu_melt_operations WHERE local_name = ? AND id = ? LIMIT 1", [this.db.localName, operation.id])) throw new Error(`MeltOperation with id ${operation.id} already exists`);
		await this.assertNoDuplicateQuoteOperation(operation);
		const params = operationToParams$2(this.db.localName, operation);
		await this.db.run(`INSERT INTO coco_cashu_melt_operations
         (local_name, id, mintUrl, state, createdAt, updatedAt, error, method, methodDataJson, quoteId, unit, amount, fee_reserve, swap_fee, needsSwap, inputAmount, inputProofSecretsJson, changeOutputDataJson, swapOutputDataJson, changeAmount, effectiveFee, finalizedDataJson)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, params);
	}
	async update(operation) {
		if (operation.state === "failed") throw new Error("Cannot persist failed melt operation");
		if (!await this.db.get("SELECT id FROM coco_cashu_melt_operations WHERE local_name = ? AND id = ? LIMIT 1", [this.db.localName, operation.id])) throw new Error(`MeltOperation with id ${operation.id} not found`);
		await this.assertNoDuplicateQuoteOperation(operation);
		const updatedAtSeconds = getUnixTimeSeconds();
		if (operation.state === "init") {
			await this.db.run(`UPDATE coco_cashu_melt_operations
         SET state = ?, updatedAt = ?, error = ?, method = ?, methodDataJson = ?, quoteId = ?, unit = ?
         WHERE local_name = ? AND id = ?`, [
				operation.state,
				updatedAtSeconds,
				operation.error ?? null,
				operation.method,
				stringifyJson(operation.methodData),
				operation.quoteId ?? null,
				operation.unit,
				this.db.localName,
				operation.id
			]);
			return;
		}
		const settlement = operation;
		await this.db.run(`UPDATE coco_cashu_melt_operations
        SET state = ?, updatedAt = ?, error = ?, method = ?, methodDataJson = ?, quoteId = ?, unit = ?, amount = ?, fee_reserve = ?, swap_fee = ?, needsSwap = ?, inputAmount = ?, inputProofSecretsJson = ?, changeOutputDataJson = ?, swapOutputDataJson = ?, changeAmount = ?, effectiveFee = ?, finalizedDataJson = ?
        WHERE local_name = ? AND id = ?`, [
			operation.state,
			updatedAtSeconds,
			operation.error ?? null,
			operation.method,
			stringifyJson(operation.methodData),
			operation.quoteId,
			operation.unit,
			serializeAmount(operation.amount),
			serializeAmount(operation.fee_reserve),
			serializeAmount(operation.swap_fee),
			operation.needsSwap ? 1 : 0,
			serializeAmount(operation.inputAmount),
			JSON.stringify(operation.inputProofSecrets),
			JSON.stringify(operation.changeOutputData),
			operation.swapOutputData ? JSON.stringify(operation.swapOutputData) : null,
			operation.state === "finalized" && settlement.changeAmount !== void 0 ? serializeAmount(settlement.changeAmount) : null,
			operation.state === "finalized" && settlement.effectiveFee !== void 0 ? serializeAmount(settlement.effectiveFee) : null,
			operation.state === "finalized" && settlement.finalizedData !== void 0 ? JSON.stringify(settlement.finalizedData) : null,
			this.db.localName,
			operation.id
		]);
	}
	async getById(id) {
		const row = await this.db.get("SELECT * FROM coco_cashu_melt_operations WHERE local_name = ? AND id = ?", [this.db.localName, id]);
		return row ? rowToOperation$3(row) : null;
	}
	async getByState(state) {
		return (await this.db.all("SELECT * FROM coco_cashu_melt_operations WHERE local_name = ? AND state = ?", [this.db.localName, state])).map(rowToOperation$3);
	}
	async getPending() {
		return (await this.db.all("SELECT * FROM coco_cashu_melt_operations WHERE local_name = ? AND state IN (\"executing\", \"pending\")", [this.db.localName])).map(rowToOperation$3);
	}
	async getByMintUrl(mintUrl) {
		return (await this.db.all("SELECT * FROM coco_cashu_melt_operations WHERE local_name = ? AND mintUrl = ?", [this.db.localName, mintUrl])).map(rowToOperation$3);
	}
	async getByQuoteId(mintUrl, quoteId) {
		return (await this.db.all("SELECT * FROM coco_cashu_melt_operations WHERE local_name = ? AND mintUrl = ? AND quoteId = ?", [
			this.db.localName,
			mintUrl,
			quoteId
		])).map(rowToOperation$3);
	}
	async delete(id) {
		await this.db.run("DELETE FROM coco_cashu_melt_operations WHERE local_name = ? AND id = ?", [this.db.localName, id]);
	}
	async assertNoDuplicateQuoteOperation(operation) {
		const quoteId = getOperationQuoteId(operation);
		if (!quoteId) return;
		if (await this.db.get("SELECT id FROM coco_cashu_melt_operations WHERE local_name = ? AND mintUrl = ? AND quoteId = ? AND id <> ? LIMIT 1", [
			this.db.localName,
			operation.mintUrl,
			quoteId,
			operation.id
		])) throw new Error(`MeltOperation already exists for mint ${operation.mintUrl} and quote ${quoteId}`);
	}
};

//#endregion
//#region src/repositories/AuthSessionRepository.ts
function parseBatPool(batPoolJson) {
	if (!batPoolJson) return void 0;
	return JSON.parse(batPoolJson)?.map((proof) => ({
		...proof,
		amount: deserializeAmount(proof.amount)
	}));
}
function rowToSession(row) {
	return {
		mintUrl: row.mintUrl,
		accessToken: row.accessToken,
		refreshToken: row.refreshToken ?? void 0,
		expiresAt: row.expiresAt,
		scope: row.scope ?? void 0,
		batPool: parseBatPool(row.batPoolJson)
	};
}
var D1AuthSessionRepository = class {
	db;
	constructor(db) {
		this.db = db;
	}
	async getSession(mintUrl) {
		const row = await this.db.get("SELECT mintUrl, accessToken, refreshToken, expiresAt, scope, batPoolJson FROM coco_cashu_auth_sessions WHERE local_name = ? AND mintUrl = ? LIMIT 1", [this.db.localName, mintUrl]);
		if (!row) return null;
		return rowToSession(row);
	}
	async saveSession(session) {
		await this.db.run(`INSERT INTO coco_cashu_auth_sessions (local_name, mintUrl, accessToken, refreshToken, expiresAt, scope, batPoolJson)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(local_name, mintUrl) DO UPDATE SET
         accessToken=excluded.accessToken,
         refreshToken=excluded.refreshToken,
         expiresAt=excluded.expiresAt,
         scope=excluded.scope,
         batPoolJson=excluded.batPoolJson`, [
			this.db.localName,
			session.mintUrl,
			session.accessToken,
			session.refreshToken ?? null,
			session.expiresAt,
			session.scope ?? null,
			session.batPool ? JSON.stringify(session.batPool) : null
		]);
	}
	async deleteSession(mintUrl) {
		await this.db.run("DELETE FROM coco_cashu_auth_sessions WHERE local_name = ? AND mintUrl = ?", [this.db.localName, mintUrl]);
	}
	async getAllSessions() {
		return (await this.db.all("SELECT mintUrl, accessToken, refreshToken, expiresAt, scope, batPoolJson FROM coco_cashu_auth_sessions WHERE local_name = ?", [this.db.localName])).map(rowToSession);
	}
};

//#endregion
//#region src/repositories/MintOperationRepository.ts
const persistedStates = [
	"pending",
	"executing",
	"finalized",
	"failed"
];
const isPersistedState = (state) => persistedStates.includes(state);
const normalizeState = (state) => {
	if (state === "pending" || state === "executing" || state === "finalized" || state === "failed") return state;
	return "init";
};
const requireQuoteId = (row) => {
	if (!row.quoteId || row.quoteId.trim() === "") throw new Error(`MintOperation ${row.id} is missing required quoteId`);
	return row.quoteId;
};
const rowToOperation$2 = (row) => {
	const quoteId = requireQuoteId(row);
	const base = {
		id: row.id,
		mintUrl: row.mintUrl,
		method: row.method,
		methodData: JSON.parse(row.methodDataJson),
		createdAt: row.createdAt * 1e3,
		updatedAt: row.updatedAt * 1e3,
		error: row.error ?? void 0,
		...row.terminalFailureJson ? { terminalFailure: JSON.parse(row.terminalFailureJson) } : {}
	};
	const intent = {
		amount: deserializeAmount(row.amount ?? 0),
		unit: row.unit ?? ""
	};
	if (!isPersistedState(row.state)) return {
		...base,
		...intent,
		state: "init",
		quoteId
	};
	return {
		...base,
		...intent,
		state: normalizeState(row.state),
		quoteId,
		request: row.request ?? "",
		expiry: row.expiry ?? null,
		pubkey: row.pubkey ?? void 0,
		outputData: row.outputDataJson ? JSON.parse(row.outputDataJson) : {
			keep: [],
			send: []
		}
	};
};
const operationToParams$1 = (ln, operation) => {
	const createdAtSeconds = Math.floor(operation.createdAt / 1e3);
	const updatedAtSeconds = Math.floor(operation.updatedAt / 1e3);
	const methodDataJson = stringifyJson(operation.methodData);
	if (operation.state === "init") return [
		ln,
		operation.id,
		operation.mintUrl,
		operation.quoteId,
		operation.state,
		createdAtSeconds,
		updatedAtSeconds,
		operation.error ?? null,
		operation.method,
		methodDataJson,
		serializeAmount(operation.amount),
		operation.unit,
		null,
		null,
		null,
		null,
		null,
		operation.terminalFailure ? JSON.stringify(operation.terminalFailure) : null,
		null
	];
	return [
		ln,
		operation.id,
		operation.mintUrl,
		operation.quoteId,
		operation.state,
		createdAtSeconds,
		updatedAtSeconds,
		operation.error ?? null,
		operation.method,
		methodDataJson,
		serializeAmount(operation.amount),
		operation.unit,
		operation.request,
		operation.expiry,
		operation.pubkey ?? null,
		null,
		null,
		operation.terminalFailure ? JSON.stringify(operation.terminalFailure) : null,
		JSON.stringify(operation.outputData)
	];
};
var D1MintOperationRepository = class {
	db;
	constructor(db) {
		this.db = db;
	}
	async create(operation) {
		if (await this.db.get("SELECT id FROM coco_cashu_mint_operations WHERE local_name = ? AND id = ? LIMIT 1", [this.db.localName, operation.id])) throw new Error(`MintOperation with id ${operation.id} already exists`);
		const params = operationToParams$1(this.db.localName, operation);
		await this.db.run(`INSERT INTO coco_cashu_mint_operations
        (local_name, id, mintUrl, quoteId, state, createdAt, updatedAt, error, method, methodDataJson, amount, unit, request, expiry, pubkey, lastObservedRemoteState, lastObservedRemoteStateAt, terminalFailureJson, outputDataJson)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, params);
	}
	async update(operation) {
		if (!await this.db.get("SELECT id FROM coco_cashu_mint_operations WHERE local_name = ? AND id = ? LIMIT 1", [this.db.localName, operation.id])) throw new Error(`MintOperation with id ${operation.id} not found`);
		const updatedAtSeconds = getUnixTimeSeconds();
		if (operation.state === "init") {
			await this.db.run(`UPDATE coco_cashu_mint_operations
         SET quoteId = ?, state = ?, updatedAt = ?, error = ?, method = ?, methodDataJson = ?, amount = ?, unit = ?, terminalFailureJson = ?
         WHERE local_name = ? AND id = ?`, [
				operation.quoteId,
				operation.state,
				updatedAtSeconds,
				operation.error ?? null,
				operation.method,
				stringifyJson(operation.methodData),
				serializeAmount(operation.amount),
				operation.unit,
				operation.terminalFailure ? JSON.stringify(operation.terminalFailure) : null,
				this.db.localName,
				operation.id
			]);
			return;
		}
		await this.db.run(`UPDATE coco_cashu_mint_operations
       SET quoteId = ?, state = ?, updatedAt = ?, error = ?, method = ?, methodDataJson = ?, amount = ?, unit = ?, request = ?, expiry = ?, pubkey = ?, lastObservedRemoteState = ?, lastObservedRemoteStateAt = ?, terminalFailureJson = ?, outputDataJson = ?
       WHERE local_name = ? AND id = ?`, [
			operation.quoteId,
			operation.state,
			updatedAtSeconds,
			operation.error ?? null,
			operation.method,
			stringifyJson(operation.methodData),
			serializeAmount(operation.amount),
			operation.unit,
			operation.request,
			operation.expiry,
			operation.pubkey ?? null,
			null,
			null,
			operation.terminalFailure ? JSON.stringify(operation.terminalFailure) : null,
			JSON.stringify(operation.outputData),
			this.db.localName,
			operation.id
		]);
	}
	async getById(id) {
		const row = await this.db.get("SELECT * FROM coco_cashu_mint_operations WHERE local_name = ? AND id = ?", [this.db.localName, id]);
		return row ? rowToOperation$2(row) : null;
	}
	async getByState(state) {
		return (await this.db.all("SELECT * FROM coco_cashu_mint_operations WHERE local_name = ? AND state = ?", [this.db.localName, state])).map(rowToOperation$2);
	}
	async getPending() {
		return (await this.db.all("SELECT * FROM coco_cashu_mint_operations WHERE local_name = ? AND state IN ('pending', 'executing')", [this.db.localName])).map(rowToOperation$2);
	}
	async getByMintUrl(mintUrl) {
		return (await this.db.all("SELECT * FROM coco_cashu_mint_operations WHERE local_name = ? AND mintUrl = ?", [this.db.localName, mintUrl])).map(rowToOperation$2);
	}
	async getByQuoteId(mintUrl, method, quoteId) {
		return (await this.db.all(`SELECT * FROM coco_cashu_mint_operations
       WHERE local_name = ? AND mintUrl = ? AND method = ? AND quoteId = ?
       ORDER BY createdAt ASC, id ASC`, [
			this.db.localName,
			mintUrl,
			method,
			quoteId
		])).map(rowToOperation$2);
	}
	async delete(id) {
		await this.db.run("DELETE FROM coco_cashu_mint_operations WHERE local_name = ? AND id = ?", [this.db.localName, id]);
	}
};

//#endregion
//#region src/repositories/ReceiveOperationRepository.ts
function getOperationUnit(op) {
	return op.unit ?? "sat";
}
function parseInputProofs(inputProofsJson) {
	return (inputProofsJson ? JSON.parse(inputProofsJson) : []).map((proof) => ({
		...proof,
		amount: deserializeAmount(proof.amount)
	}));
}
function rowToOperation$1(row) {
	const base = {
		id: row.id,
		mintUrl: row.mintUrl,
		unit: row.unit ?? "sat",
		amount: deserializeAmount(row.amount),
		inputProofs: parseInputProofs(row.inputProofsJson),
		createdAt: row.createdAt * 1e3,
		updatedAt: row.updatedAt * 1e3,
		error: row.error ?? void 0,
		source: row.sourceJson ? JSON.parse(row.sourceJson) : void 0
	};
	if (row.state === "init") return {
		...base,
		state: "init"
	};
	const preparedData = {
		fee: deserializeAmount(row.fee ?? 0),
		outputData: row.outputDataJson ? JSON.parse(row.outputDataJson) : void 0
	};
	switch (row.state) {
		case "prepared": return {
			...base,
			state: "prepared",
			...preparedData
		};
		case "executing": return {
			...base,
			state: "executing",
			...preparedData
		};
		case "finalized": return {
			...base,
			state: "finalized",
			...preparedData
		};
		case "rolled_back": return {
			...base,
			state: "rolled_back",
			...preparedData
		};
		default: throw new Error(`Unknown state: ${row.state}`);
	}
}
function operationToParams(ln, op) {
	const createdAtSeconds = Math.floor(op.createdAt / 1e3);
	const updatedAtSeconds = Math.floor(op.updatedAt / 1e3);
	if (op.state === "init") return [
		ln,
		op.id,
		op.mintUrl,
		getOperationUnit(op),
		serializeAmount(op.amount),
		op.state,
		createdAtSeconds,
		updatedAtSeconds,
		op.error ?? null,
		null,
		JSON.stringify(op.inputProofs),
		null,
		op.source ? JSON.stringify(op.source) : null
	];
	return [
		ln,
		op.id,
		op.mintUrl,
		getOperationUnit(op),
		serializeAmount(op.amount),
		op.state,
		createdAtSeconds,
		updatedAtSeconds,
		op.error ?? null,
		serializeAmount(op.fee),
		JSON.stringify(op.inputProofs),
		op.outputData ? JSON.stringify(op.outputData) : null,
		op.source ? JSON.stringify(op.source) : null
	];
}
var D1ReceiveOperationRepository = class {
	db;
	constructor(db) {
		this.db = db;
	}
	async create(operation) {
		if (await this.db.get("SELECT id FROM coco_cashu_receive_operations WHERE local_name = ? AND id = ? LIMIT 1", [this.db.localName, operation.id])) throw new Error(`ReceiveOperation with id ${operation.id} already exists`);
		const params = operationToParams(this.db.localName, operation);
		await this.db.run(`INSERT INTO coco_cashu_receive_operations
        (local_name, id, mintUrl, unit, amount, state, createdAt, updatedAt, error, fee, inputProofsJson, outputDataJson, sourceJson)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, params);
	}
	async update(operation) {
		if (!await this.db.get("SELECT id FROM coco_cashu_receive_operations WHERE local_name = ? AND id = ? LIMIT 1", [this.db.localName, operation.id])) throw new Error(`ReceiveOperation with id ${operation.id} not found`);
		const updatedAtSeconds = getUnixTimeSeconds();
		if (operation.state === "init") await this.db.run(`UPDATE coco_cashu_receive_operations
         SET state = ?, updatedAt = ?, error = ?, unit = ?, inputProofsJson = ?, sourceJson = ?
         WHERE local_name = ? AND id = ?`, [
			operation.state,
			updatedAtSeconds,
			operation.error ?? null,
			getOperationUnit(operation),
			JSON.stringify(operation.inputProofs),
			operation.source ? JSON.stringify(operation.source) : null,
			this.db.localName,
			operation.id
		]);
		else await this.db.run(`UPDATE coco_cashu_receive_operations
         SET state = ?, updatedAt = ?, error = ?, unit = ?, fee = ?, inputProofsJson = ?, outputDataJson = ?, sourceJson = ?
         WHERE local_name = ? AND id = ?`, [
			operation.state,
			updatedAtSeconds,
			operation.error ?? null,
			getOperationUnit(operation),
			serializeAmount(operation.fee),
			JSON.stringify(operation.inputProofs),
			operation.outputData ? JSON.stringify(operation.outputData) : null,
			operation.source ? JSON.stringify(operation.source) : null,
			this.db.localName,
			operation.id
		]);
	}
	async getById(id) {
		const row = await this.db.get("SELECT * FROM coco_cashu_receive_operations WHERE local_name = ? AND id = ?", [this.db.localName, id]);
		return row ? rowToOperation$1(row) : null;
	}
	async getByState(state) {
		return (await this.db.all("SELECT * FROM coco_cashu_receive_operations WHERE local_name = ? AND state = ?", [this.db.localName, state])).map(rowToOperation$1);
	}
	async getPending() {
		return (await this.db.all("SELECT * FROM coco_cashu_receive_operations WHERE local_name = ? AND state IN ('executing')", [this.db.localName])).map(rowToOperation$1);
	}
	async getByMintUrl(mintUrl) {
		return (await this.db.all("SELECT * FROM coco_cashu_receive_operations WHERE local_name = ? AND mintUrl = ?", [this.db.localName, mintUrl])).map(rowToOperation$1);
	}
	async getByPaymentRequestAttemptId(attemptId) {
		return (await this.db.all("SELECT * FROM coco_cashu_receive_operations WHERE local_name = ? AND sourceJson IS NOT NULL", [this.db.localName])).map(rowToOperation$1).find((candidate) => candidate.source?.type === "payment-request" && candidate.source.attemptId === attemptId) ?? null;
	}
	async delete(id) {
		await this.db.run("DELETE FROM coco_cashu_receive_operations WHERE local_name = ? AND id = ?", [this.db.localName, id]);
	}
};

//#endregion
//#region src/repositories/PaymentRequestReceiveRepository.ts
function operationToRow(operation) {
	return {
		id: operation.id,
		requestId: operation.requestId ?? null,
		encodedRequest: operation.encodedRequest,
		state: operation.state,
		transport: operation.transport,
		amount: serializeAmount(operation.amount),
		unit: operation.unit,
		mintsJson: JSON.stringify(operation.mints),
		singleUse: operation.singleUse ? 1 : 0,
		description: operation.description ?? null,
		createdAt: Math.floor(operation.createdAt / 1e3),
		updatedAt: Math.floor(operation.updatedAt / 1e3),
		error: operation.error ?? null,
		completedAt: operation.completedAt ? Math.floor(operation.completedAt / 1e3) : null
	};
}
function rowToOperation(row) {
	return {
		id: row.id,
		requestId: row.requestId ?? void 0,
		encodedRequest: row.encodedRequest,
		state: row.state,
		transport: row.transport,
		amount: deserializeAmount(row.amount),
		unit: row.unit,
		mints: JSON.parse(row.mintsJson),
		singleUse: row.singleUse === 1,
		description: row.description ?? void 0,
		createdAt: row.createdAt * 1e3,
		updatedAt: row.updatedAt * 1e3,
		error: row.error ?? void 0,
		completedAt: row.completedAt ? row.completedAt * 1e3 : void 0
	};
}
function attemptToRow(attempt) {
	return {
		id: attempt.id,
		requestOperationId: attempt.requestOperationId,
		requestId: attempt.requestId ?? null,
		transport: attempt.transport,
		transportMessageId: attempt.transportMessageId ?? null,
		payloadHash: attempt.payloadHash,
		senderPubkey: attempt.senderPubkey ?? null,
		memo: attempt.memo ?? null,
		mintUrl: attempt.mintUrl,
		unit: attempt.unit,
		grossAmount: serializeAmount(attempt.grossAmount),
		fee: attempt.fee ? serializeAmount(attempt.fee) : null,
		netAmount: attempt.netAmount ? serializeAmount(attempt.netAmount) : null,
		receiveOperationId: attempt.receiveOperationId ?? null,
		state: attempt.state,
		error: attempt.error ?? null,
		payloadJson: attempt.payload ? JSON.stringify(attempt.payload) : null,
		createdAt: Math.floor(attempt.createdAt / 1e3),
		updatedAt: Math.floor(attempt.updatedAt / 1e3)
	};
}
function rowToAttempt(row) {
	const payload = row.payloadJson ? JSON.parse(row.payloadJson) : void 0;
	return {
		id: row.id,
		requestOperationId: row.requestOperationId,
		requestId: row.requestId ?? void 0,
		transport: row.transport,
		transportMessageId: row.transportMessageId ?? void 0,
		payloadHash: row.payloadHash,
		senderPubkey: row.senderPubkey ?? void 0,
		memo: row.memo ?? void 0,
		mintUrl: row.mintUrl,
		unit: row.unit,
		grossAmount: deserializeAmount(row.grossAmount),
		fee: row.fee === null ? void 0 : deserializeAmount(row.fee),
		netAmount: row.netAmount === null ? void 0 : deserializeAmount(row.netAmount),
		receiveOperationId: row.receiveOperationId ?? void 0,
		state: row.state,
		error: row.error ?? void 0,
		payload,
		createdAt: row.createdAt * 1e3,
		updatedAt: row.updatedAt * 1e3
	};
}
var D1PaymentRequestReceiveOperationRepository = class {
	constructor(db) {
		this.db = db;
	}
	async create(operation) {
		const row = operationToRow(operation);
		await this.db.run(`INSERT INTO coco_cashu_payment_request_receive_operations
        (local_name, id, requestId, encodedRequest, state, transport, amount, unit, mintsJson, singleUse, description, createdAt, updatedAt, error, completedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [this.db.localName, ...Object.values(row)]);
	}
	async update(operation) {
		const row = operationToRow({
			...operation,
			updatedAt: Date.now()
		});
		await this.db.run(`UPDATE coco_cashu_payment_request_receive_operations
       SET requestId = ?, encodedRequest = ?, state = ?, transport = ?, amount = ?, unit = ?,
           mintsJson = ?, singleUse = ?, description = ?, updatedAt = ?, error = ?, completedAt = ?
       WHERE local_name = ? AND id = ?`, [
			row.requestId,
			row.encodedRequest,
			row.state,
			row.transport,
			row.amount,
			row.unit,
			row.mintsJson,
			row.singleUse,
			row.description,
			getUnixTimeSeconds(),
			row.error,
			row.completedAt,
			this.db.localName,
			row.id
		]);
	}
	async getById(id) {
		const row = await this.db.get("SELECT * FROM coco_cashu_payment_request_receive_operations WHERE local_name = ? AND id = ?", [this.db.localName, id]);
		return row ? rowToOperation(row) : null;
	}
	async getByState(state) {
		return (await this.db.all("SELECT * FROM coco_cashu_payment_request_receive_operations WHERE local_name = ? AND state = ?", [this.db.localName, state])).map(rowToOperation);
	}
	async getActiveByRequestId(requestId) {
		return (await this.db.all("SELECT * FROM coco_cashu_payment_request_receive_operations WHERE local_name = ? AND state = 'active' AND requestId = ?", [this.db.localName, requestId])).map(rowToOperation);
	}
	async list(filter) {
		return (filter?.state ? await this.db.all("SELECT * FROM coco_cashu_payment_request_receive_operations WHERE local_name = ? AND state = ?", [this.db.localName, filter.state]) : await this.db.all("SELECT * FROM coco_cashu_payment_request_receive_operations WHERE local_name = ?", [this.db.localName])).map(rowToOperation);
	}
};
var D1PaymentRequestReceiveAttemptRepository = class {
	constructor(db) {
		this.db = db;
	}
	async create(attempt) {
		const row = attemptToRow(attempt);
		await this.db.run(`INSERT INTO coco_cashu_payment_request_receive_attempts
        (local_name, id, requestOperationId, requestId, transport, transportMessageId, payloadHash, senderPubkey,
         memo, mintUrl, unit, grossAmount, fee, netAmount, receiveOperationId, state, error,
         payloadJson, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [this.db.localName, ...Object.values(row)]);
	}
	async update(attempt) {
		const row = attemptToRow({
			...attempt,
			updatedAt: Date.now()
		});
		await this.db.run(`UPDATE coco_cashu_payment_request_receive_attempts
       SET requestId = ?, transport = ?, transportMessageId = ?, payloadHash = ?, senderPubkey = ?,
           memo = ?, mintUrl = ?, unit = ?, grossAmount = ?, fee = ?, netAmount = ?,
           receiveOperationId = ?, state = ?, error = ?, payloadJson = ?, updatedAt = ?
       WHERE local_name = ? AND id = ?`, [
			row.requestId,
			row.transport,
			row.transportMessageId,
			row.payloadHash,
			row.senderPubkey,
			row.memo,
			row.mintUrl,
			row.unit,
			row.grossAmount,
			row.fee,
			row.netAmount,
			row.receiveOperationId,
			row.state,
			row.error,
			row.payloadJson,
			getUnixTimeSeconds(),
			this.db.localName,
			row.id
		]);
	}
	async getById(id) {
		const row = await this.db.get("SELECT * FROM coco_cashu_payment_request_receive_attempts WHERE local_name = ? AND id = ?", [this.db.localName, id]);
		return row ? rowToAttempt(row) : null;
	}
	async getByRequestOperationId(requestOperationId) {
		return (await this.db.all("SELECT * FROM coco_cashu_payment_request_receive_attempts WHERE local_name = ? AND requestOperationId = ?", [this.db.localName, requestOperationId])).map(rowToAttempt);
	}
	async getByReceiveOperationId(receiveOperationId) {
		const row = await this.db.get("SELECT * FROM coco_cashu_payment_request_receive_attempts WHERE local_name = ? AND receiveOperationId = ?", [this.db.localName, receiveOperationId]);
		return row ? rowToAttempt(row) : null;
	}
	async getByTransportMessageId(transportMessageId) {
		const row = await this.db.get("SELECT * FROM coco_cashu_payment_request_receive_attempts WHERE local_name = ? AND transportMessageId = ?", [this.db.localName, transportMessageId]);
		return row ? rowToAttempt(row) : null;
	}
	async getByPayloadHash(requestOperationId, payloadHash) {
		const row = await this.db.get("SELECT * FROM coco_cashu_payment_request_receive_attempts WHERE local_name = ? AND requestOperationId = ? AND payloadHash = ?", [
			this.db.localName,
			requestOperationId,
			payloadHash
		]);
		return row ? rowToAttempt(row) : null;
	}
	async getByRequestIdAndPayloadHash(requestId, payloadHash) {
		const row = await this.db.get(`SELECT * FROM coco_cashu_payment_request_receive_attempts
       WHERE local_name = ? AND requestId = ? AND payloadHash = ?
       ORDER BY CASE WHEN state = 'finalized' THEN 0 ELSE 1 END, createdAt ASC
       LIMIT 1`, [
			this.db.localName,
			requestId,
			payloadHash
		]);
		return row ? rowToAttempt(row) : null;
	}
	async getByState(state) {
		return (await this.db.all("SELECT * FROM coco_cashu_payment_request_receive_attempts WHERE local_name = ? AND state = ?", [this.db.localName, state])).map(rowToAttempt);
	}
	async delete(id) {
		await this.db.run("DELETE FROM coco_cashu_payment_request_receive_attempts WHERE local_name = ? AND id = ?", [this.db.localName, id]);
	}
};

//#endregion
//#region src/index.ts
/**
* Cloudflare D1 implementation of the coco Repositories interface.
*
* Uses D1's async API (prepare/bind/run/all/first) instead of better-sqlite3's sync API.
*
* Transaction support:
* `withTransaction()` creates new repository instances for the callback scope.
* D1 does not support freehand SQL transactions (BEGIN/COMMIT/ROLLBACK).
* For this first pass, operations within a transaction callback execute against
* the same D1 binding. D1's single-writer guarantee provides serializability.
* A future version may use `db.batch()` for atomic multi-statement execution.
*/
var D1Repositories = class {
	mintRepository;
	keyRingRepository;
	counterRepository;
	keysetRepository;
	proofRepository;
	meltQuoteRepository;
	mintQuoteRepository;
	legacyMintQuoteRepository;
	historyRepository;
	sendOperationRepository;
	meltOperationRepository;
	authSessionRepository;
	mintOperationRepository;
	receiveOperationRepository;
	paymentRequestReceiveOperationRepository;
	paymentRequestReceiveAttemptRepository;
	db;
	constructor(options) {
		this.db = new D1Db(options.d1Database, options.localName);
		this.mintRepository = new D1MintRepository(this.db);
		this.keyRingRepository = new D1KeyRingRepository(this.db);
		this.counterRepository = new D1CounterRepository(this.db);
		this.keysetRepository = new D1KeysetRepository(this.db);
		this.proofRepository = new D1ProofRepository(this.db);
		this.meltQuoteRepository = new D1MeltQuoteRepository(this.db);
		this.mintQuoteRepository = new D1MintQuoteRepository(this.db);
		this.legacyMintQuoteRepository = new D1LegacyMintQuoteRepository(this.db);
		this.historyRepository = new D1HistoryRepository(this.db);
		this.sendOperationRepository = new D1SendOperationRepository(this.db);
		this.meltOperationRepository = new D1MeltOperationRepository(this.db);
		this.authSessionRepository = new D1AuthSessionRepository(this.db);
		this.mintOperationRepository = new D1MintOperationRepository(this.db);
		this.receiveOperationRepository = new D1ReceiveOperationRepository(this.db);
		this.paymentRequestReceiveOperationRepository = new D1PaymentRequestReceiveOperationRepository(this.db);
		this.paymentRequestReceiveAttemptRepository = new D1PaymentRequestReceiveAttemptRepository(this.db);
	}
	async init() {
		await ensureSchema(this.db);
	}
	async withTransaction(fn) {
		return fn({
			mintRepository: new D1MintRepository(this.db),
			keyRingRepository: new D1KeyRingRepository(this.db),
			counterRepository: new D1CounterRepository(this.db),
			keysetRepository: new D1KeysetRepository(this.db),
			proofRepository: new D1ProofRepository(this.db),
			meltQuoteRepository: new D1MeltQuoteRepository(this.db),
			mintQuoteRepository: new D1MintQuoteRepository(this.db),
			legacyMintQuoteRepository: new D1LegacyMintQuoteRepository(this.db),
			historyRepository: new D1HistoryRepository(this.db),
			sendOperationRepository: new D1SendOperationRepository(this.db),
			meltOperationRepository: new D1MeltOperationRepository(this.db),
			authSessionRepository: new D1AuthSessionRepository(this.db),
			mintOperationRepository: new D1MintOperationRepository(this.db),
			receiveOperationRepository: new D1ReceiveOperationRepository(this.db),
			paymentRequestReceiveOperationRepository: new D1PaymentRequestReceiveOperationRepository(this.db),
			paymentRequestReceiveAttemptRepository: new D1PaymentRequestReceiveAttemptRepository(this.db)
		});
	}
};

//#endregion
export { D1AuthSessionRepository, D1CounterRepository, D1Db, D1HistoryRepository, D1KeyRingRepository, D1KeysetRepository, D1LegacyMintQuoteRepository, D1MeltOperationRepository, D1MeltQuoteRepository, D1MintOperationRepository, D1MintQuoteRepository, D1MintRepository, D1PaymentRequestReceiveAttemptRepository, D1PaymentRequestReceiveOperationRepository, D1ProofRepository, D1ReceiveOperationRepository, D1Repositories, D1SendOperationRepository, ensureSchema };