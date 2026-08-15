import { AuthSession, AuthSessionRepository, CoreProof, Counter, CounterRepository, HistoryEntry, HistoryProjectionRepository, HistoryRepository, KeyRingRepository, Keypair, KeypairPurpose, Keyset, KeysetRepository, LegacyMintQuoteRepository, MeltOperationRepository, MeltQuote, MeltQuoteRepository, Mint, MintMethodRemoteState, MintOperationRepository, MintQuote, MintQuoteRepository, MintRepository, PaymentRequestReceiveAttempt, PaymentRequestReceiveAttemptRepository, PaymentRequestReceiveAttemptState, PaymentRequestReceiveOperation, PaymentRequestReceiveOperationRepository, PaymentRequestReceiveState, ProofRepository, ProofState, ProofUnitFilter, QuoteIdentity, ReceiveOperation, ReceiveOperationRepository, ReceiveOperationState, Repositories, RepositoryTransactionScope, SendOperation, SendOperationRepository, SendOperationState } from "@cashu/coco-core/adapter";

//#region src/repositories/MintRepository.d.ts
declare class SqliteMintRepository implements MintRepository {
  private readonly db;
  constructor(db: SqlDatabase);
  isTrustedMint(mintUrl: string): Promise<boolean>;
  getMintByUrl(mintUrl: string): Promise<Mint>;
  getAllMints(): Promise<Mint[]>;
  getAllTrustedMints(): Promise<Mint[]>;
  addNewMint(mint: Mint): Promise<void>;
  addOrUpdateMint(mint: Mint): Promise<void>;
  updateMint(mint: Mint): Promise<void>;
  setMintTrusted(mintUrl: string, trusted: boolean): Promise<void>;
  deleteMint(mintUrl: string): Promise<void>;
}
//#endregion
//#region src/repositories/KeysetRepository.d.ts
declare class SqliteKeysetRepository implements KeysetRepository {
  private readonly db;
  constructor(db: SqlDatabase);
  getKeysetsByMintUrl(mintUrl: string): Promise<Keyset[]>;
  getKeysetById(mintUrl: string, id: string): Promise<Keyset | null>;
  updateKeyset(keyset: Omit<Keyset, 'keypairs' | 'updatedAt'>): Promise<void>;
  addKeyset(keyset: Omit<Keyset, 'updatedAt'>): Promise<void>;
  deleteKeyset(mintUrl: string, keysetId: string): Promise<void>;
}
//#endregion
//#region src/repositories/KeyRingRepository.d.ts
declare class SqliteKeyRingRepository implements KeyRingRepository {
  private readonly db;
  constructor(db: SqlDatabase);
  getPersistedKeyPair(publicKey: string, purpose?: KeypairPurpose): Promise<Keypair | null>;
  setPersistedKeyPair(keyPair: Keypair): Promise<void>;
  deletePersistedKeyPair(publicKey: string, purpose?: KeypairPurpose): Promise<void>;
  getAllPersistedKeyPairs(purpose?: KeypairPurpose): Promise<Keypair[]>;
  getLatestKeyPair(purpose?: KeypairPurpose): Promise<Keypair | null>;
  getLastDerivationIndex(purpose?: KeypairPurpose): Promise<number>;
}
//#endregion
//#region src/repositories/CounterRepository.d.ts
declare class SqliteCounterRepository implements CounterRepository {
  private readonly db;
  constructor(db: SqlDatabase);
  getCounter(mintUrl: string, keysetId: string): Promise<Counter | null>;
  setCounter(mintUrl: string, keysetId: string, counter: number): Promise<void>;
}
//#endregion
//#region src/repositories/ProofRepository.d.ts
declare class SqliteProofRepository implements ProofRepository {
  private readonly db;
  constructor(db: SqlDatabase);
  saveProofs(mintUrl: string, proofs: CoreProof[]): Promise<void>;
  getReadyProofs(mintUrl: string, filter?: ProofUnitFilter): Promise<CoreProof[]>;
  getInflightProofs(mintUrls?: string[], filter?: ProofUnitFilter): Promise<CoreProof[]>;
  getAllReadyProofs(filter?: ProofUnitFilter): Promise<CoreProof[]>;
  getProofsByKeysetId(mintUrl: string, keysetId: string, filter?: ProofUnitFilter): Promise<CoreProof[]>;
  setProofState(mintUrl: string, secrets: string[], state: ProofState): Promise<void>;
  deleteProofs(mintUrl: string, secrets: string[]): Promise<void>;
  wipeProofsByKeysetId(mintUrl: string, keysetId: string): Promise<void>;
  reserveProofs(mintUrl: string, secrets: string[], operationId: string): Promise<void>;
  releaseProofs(mintUrl: string, secrets: string[]): Promise<void>;
  setCreatedByOperation(mintUrl: string, secrets: string[], operationId: string): Promise<void>;
  getProofBySecret(mintUrl: string, secret: string): Promise<CoreProof | null>;
  getProofsBySecrets(mintUrl: string, secrets: string[]): Promise<CoreProof[]>;
  getProofsByOperationId(mintUrl: string, operationId: string): Promise<CoreProof[]>;
  getAvailableProofs(mintUrl: string, filter?: ProofUnitFilter): Promise<CoreProof[]>;
  getReservedProofs(): Promise<CoreProof[]>;
}
//#endregion
//#region src/repositories/MeltQuoteRepository.d.ts
declare class SqliteMeltQuoteRepository implements MeltQuoteRepository {
  private readonly db;
  constructor(db: SqlDatabase);
  getMeltQuoteById(identity: QuoteIdentity): Promise<MeltQuote | null>;
  getMeltQuote(mintUrl: string, method: string, quoteId: string): Promise<MeltQuote | null>;
  upsertMeltQuote(quote: MeltQuote): Promise<void>;
  getPendingMeltQuotes(method?: string): Promise<MeltQuote[]>;
}
//#endregion
//#region src/repositories/MintQuoteRepository.d.ts
declare class SqliteMintQuoteRepository implements MintQuoteRepository {
  private readonly db;
  constructor(db: SqlDatabase);
  getMintQuoteById(identity: QuoteIdentity): Promise<MintQuote | null>;
  getMintQuote(mintUrl: string, method: string, quoteId: string): Promise<MintQuote | null>;
  upsertMintQuote(quote: MintQuote): Promise<void>;
  setMintQuoteState(mintUrl: string, method: string, quoteId: string, state: MintMethodRemoteState, observedAt?: number): Promise<void>;
  getPendingMintQuotes(method?: string): Promise<MintQuote[]>;
}
//#endregion
//#region src/repositories/LegacyMintQuoteRepository.d.ts
declare class SqliteLegacyMintQuoteRepository implements LegacyMintQuoteRepository {
  private readonly db;
  constructor(db: SqlDatabase);
  getPendingLegacyMintQuotes(mintUrl?: string): Promise<MintQuote[]>;
}
//#endregion
//#region src/repositories/HistoryRepository.d.ts
declare class SqliteHistoryRepository implements HistoryRepository {
  private readonly db;
  constructor(db: SqlDatabase);
  getPaginatedHistoryEntries(limit: number, offset: number): Promise<HistoryEntry[]>;
  getHistoryEntryById(id: string): Promise<HistoryEntry | null>;
}
//#endregion
//#region src/repositories/SendOperationRepository.d.ts
declare class SqliteSendOperationRepository implements SendOperationRepository {
  private readonly db;
  constructor(db: SqlDatabase);
  create(operation: SendOperation): Promise<void>;
  update(operation: SendOperation): Promise<void>;
  getById(id: string): Promise<SendOperation | null>;
  getByState(state: SendOperationState): Promise<SendOperation[]>;
  getPending(): Promise<SendOperation[]>;
  getByMintUrl(mintUrl: string): Promise<SendOperation[]>;
  delete(id: string): Promise<void>;
}
//#endregion
//#region src/repositories/MeltOperationRepository.d.ts
type MeltOperation = NonNullable<Awaited<ReturnType<MeltOperationRepository['getById']>>>;
type MeltOperationState = Parameters<MeltOperationRepository['getByState']>[0];
declare class SqliteMeltOperationRepository implements MeltOperationRepository {
  private readonly db;
  constructor(db: SqlDatabase);
  create(operation: MeltOperation): Promise<void>;
  update(operation: MeltOperation): Promise<void>;
  getById(id: string): Promise<MeltOperation | null>;
  getByState(state: MeltOperationState): Promise<MeltOperation[]>;
  getPending(): Promise<MeltOperation[]>;
  getByMintUrl(mintUrl: string): Promise<MeltOperation[]>;
  getByQuoteId(mintUrl: string, quoteId: string): Promise<MeltOperation[]>;
  delete(id: string): Promise<void>;
  private assertNoDuplicateQuoteOperation;
}
//#endregion
//#region src/repositories/AuthSessionRepository.d.ts
declare class SqliteAuthSessionRepository implements AuthSessionRepository {
  private readonly db;
  constructor(db: SqlDatabase);
  getSession(mintUrl: string): Promise<AuthSession | null>;
  saveSession(session: AuthSession): Promise<void>;
  deleteSession(mintUrl: string): Promise<void>;
  getAllSessions(): Promise<AuthSession[]>;
}
//#endregion
//#region src/repositories/MintOperationRepository.d.ts
type MintOperation = NonNullable<Awaited<ReturnType<MintOperationRepository['getById']>>>;
type MintOperationState = Parameters<MintOperationRepository['getByState']>[0];
declare class SqliteMintOperationRepository implements MintOperationRepository {
  private readonly db;
  constructor(db: SqlDatabase);
  create(operation: MintOperation): Promise<void>;
  update(operation: MintOperation): Promise<void>;
  getById(id: string): Promise<MintOperation | null>;
  getByState(state: MintOperationState): Promise<MintOperation[]>;
  getPending(): Promise<MintOperation[]>;
  getByMintUrl(mintUrl: string): Promise<MintOperation[]>;
  getByQuoteId(mintUrl: string, method: string, quoteId: string): Promise<MintOperation[]>;
  delete(id: string): Promise<void>;
}
//#endregion
//#region src/repositories/ReceiveOperationRepository.d.ts
declare class SqliteReceiveOperationRepository implements ReceiveOperationRepository {
  private readonly db;
  constructor(db: SqlDatabase);
  create(operation: ReceiveOperation): Promise<void>;
  update(operation: ReceiveOperation): Promise<void>;
  getById(id: string): Promise<ReceiveOperation | null>;
  getByState(state: ReceiveOperationState): Promise<ReceiveOperation[]>;
  getPending(): Promise<ReceiveOperation[]>;
  getByMintUrl(mintUrl: string): Promise<ReceiveOperation[]>;
  getByPaymentRequestAttemptId(attemptId: string): Promise<ReceiveOperation | null>;
  delete(id: string): Promise<void>;
}
//#endregion
//#region src/repositories/PaymentRequestReceiveRepository.d.ts
declare class SqlitePaymentRequestReceiveOperationRepository implements PaymentRequestReceiveOperationRepository {
  private readonly db;
  constructor(db: SqlDatabase);
  create(operation: PaymentRequestReceiveOperation): Promise<void>;
  update(operation: PaymentRequestReceiveOperation): Promise<void>;
  getById(id: string): Promise<PaymentRequestReceiveOperation | null>;
  getByState(state: PaymentRequestReceiveState): Promise<PaymentRequestReceiveOperation[]>;
  getActiveByRequestId(requestId: string): Promise<PaymentRequestReceiveOperation[]>;
  list(filter?: {
    state?: PaymentRequestReceiveState;
  }): Promise<PaymentRequestReceiveOperation[]>;
}
declare class SqlitePaymentRequestReceiveAttemptRepository implements PaymentRequestReceiveAttemptRepository {
  private readonly db;
  constructor(db: SqlDatabase);
  create(attempt: PaymentRequestReceiveAttempt): Promise<void>;
  update(attempt: PaymentRequestReceiveAttempt): Promise<void>;
  getById(id: string): Promise<PaymentRequestReceiveAttempt | null>;
  getByRequestOperationId(requestOperationId: string): Promise<PaymentRequestReceiveAttempt[]>;
  getByReceiveOperationId(receiveOperationId: string): Promise<PaymentRequestReceiveAttempt | null>;
  getByTransportMessageId(transportMessageId: string): Promise<PaymentRequestReceiveAttempt | null>;
  getByPayloadHash(requestOperationId: string, payloadHash: string): Promise<PaymentRequestReceiveAttempt | null>;
  getByRequestIdAndPayloadHash(requestId: string, payloadHash: string): Promise<PaymentRequestReceiveAttempt | null>;
  getByState(state: PaymentRequestReceiveAttemptState): Promise<PaymentRequestReceiveAttempt[]>;
  delete(id: string): Promise<void>;
}
//#endregion
//#region src/repositories.d.ts
interface SqlStorageRepositoriesOptions {
  database: SqlDatabase;
}
declare class SqlStorageRepositories implements Repositories {
  readonly mintRepository: MintRepository;
  readonly keyRingRepository: KeyRingRepository;
  readonly counterRepository: CounterRepository;
  readonly keysetRepository: KeysetRepository;
  readonly proofRepository: ProofRepository;
  readonly meltQuoteRepository: MeltQuoteRepository;
  readonly mintQuoteRepository: MintQuoteRepository;
  readonly legacyMintQuoteRepository: LegacyMintQuoteRepository;
  readonly historyRepository: HistoryProjectionRepository;
  readonly sendOperationRepository: SendOperationRepository;
  readonly meltOperationRepository: MeltOperationRepository;
  readonly authSessionRepository: AuthSessionRepository;
  readonly mintOperationRepository: MintOperationRepository;
  readonly receiveOperationRepository: ReceiveOperationRepository;
  readonly paymentRequestReceiveOperationRepository: PaymentRequestReceiveOperationRepository;
  readonly paymentRequestReceiveAttemptRepository: PaymentRequestReceiveAttemptRepository;
  readonly database: SqlDatabase;
  constructor(options: SqlStorageRepositoriesOptions);
  init(): Promise<void>;
  withTransaction<T>(fn: (repos: RepositoryTransactionScope) => Promise<T>): Promise<T>;
}
//#endregion
//#region src/schema.d.ts
interface Migration {
  id: string;
  sql?: string;
  run?: (db: SqlDatabase) => Promise<void>;
}
declare const MIGRATIONS: readonly Migration[];
/**
 * Ensures the database schema is up to date by running all pending migrations.
 */
declare function ensureSchema(db: SqlDatabase): Promise<void>;
/**
 * Run migrations up to (but not including) a specific migration ID.
 * If stopBeforeId is not provided, runs all migrations.
 * Used for testing migration behavior.
 */
declare function ensureSchemaUpTo(db: SqlDatabase, stopBeforeId?: string): Promise<void>;
//#endregion
//#region src/index.d.ts
type SqlValue = string | number | bigint | Uint8Array | null;
type SqlParams = readonly SqlValue[];
interface SqlRunResult {
  readonly lastInsertRowId: number;
  readonly changes: number;
}
interface SqlDatabase {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParams): Promise<SqlRunResult>;
  get<Row extends object = Record<string, unknown>>(sql: string, params?: SqlParams): Promise<Row | undefined>;
  all<Row extends object = Record<string, unknown>>(sql: string, params?: SqlParams): Promise<Row[]>;
  transaction<T>(fn: (tx: SqlDatabase) => Promise<T>): Promise<T>;
}
//#endregion
export { SqliteCounterRepository as C, SqliteMintRepository as E, SqliteProofRepository as S, SqliteKeysetRepository as T, SqliteSendOperationRepository as _, MIGRATIONS as a, SqliteMintQuoteRepository as b, ensureSchemaUpTo as c, SqlitePaymentRequestReceiveAttemptRepository as d, SqlitePaymentRequestReceiveOperationRepository as f, SqliteMeltOperationRepository as g, SqliteAuthSessionRepository as h, SqlValue as i, SqlStorageRepositories as l, SqliteMintOperationRepository as m, SqlParams as n, Migration as o, SqliteReceiveOperationRepository as p, SqlRunResult as r, ensureSchema as s, SqlDatabase as t, SqlStorageRepositoriesOptions as u, SqliteHistoryRepository as v, SqliteKeyRingRepository as w, SqliteMeltQuoteRepository as x, SqliteLegacyMintQuoteRepository as y };
//# sourceMappingURL=index-BWfrNssR.d.ts.map