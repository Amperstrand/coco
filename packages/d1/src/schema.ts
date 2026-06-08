import { D1Db, getUnixTimeSeconds } from './db.ts';

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

const MIGRATION_ID = 'd1_fresh_schema_v2';

/**
 * Ensures the D1 database schema is initialized.
 * For D1, we apply the full final schema as a single batch instead of incremental migrations.
 * We still record a migration entry to prevent re-application.
 */
export async function ensureSchema(db: D1Db): Promise<void> {
  let existing: { id: string } | undefined;
  try {
    existing = await db.get<{ id: string }>(
      'SELECT id FROM coco_cashu_migrations WHERE id = ?',
      [MIGRATION_ID],
    );
  } catch {
    // Table doesn't exist yet — first run
  }

  if (existing) return;

  await db.exec(SCHEMA_SQL);

  await db.run('INSERT INTO coco_cashu_migrations (id, appliedAt) VALUES (?, ?)', [
    MIGRATION_ID,
    getUnixTimeSeconds(),
  ]);
}
