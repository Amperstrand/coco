import { AuthSession, AuthSessionRepository, CoreProof, Counter, CounterRepository, HistoryEntry, HistoryRepository, KeyRingRepository, Keypair, KeypairPurpose, Keyset, KeysetRepository, LegacyMintQuoteRepository, MeltOperationRepository, MeltQuote, MeltQuoteRepository, Mint, MintMethodRemoteState, MintOperationRepository, MintQuote, MintQuoteRepository, MintRepository, PaymentRequestReceiveAttempt, PaymentRequestReceiveAttemptRepository, PaymentRequestReceiveAttemptState, PaymentRequestReceiveOperation, PaymentRequestReceiveOperationRepository, PaymentRequestReceiveState, ProofRepository, ProofState, ProofUnitFilter, ReceiveOperation, ReceiveOperationRepository, ReceiveOperationState, Repositories, RepositoryTransactionScope, SendOperation, SendOperationRepository, SendOperationState } from "@cashu/coco-core";

//#region src/db.d.ts
/**
 * Thin async wrapper around Cloudflare D1's prepared statement API.
 * Provides run/get/all/exec methods compatible with the coco repository pattern.
 */
declare class D1Db {
  readonly db: D1Database;
  readonly localName: string;
  constructor(db: D1Database, localName: string);
  run(sql: string, params?: unknown[]): Promise<{
    meta: D1Result<never>['meta'];
  }>;
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>;
  exec(sql: string): Promise<void>;
}
//#endregion
//#region src/schema.d.ts
/**
 * Ensures the D1 database schema is initialized.
 * For D1, we apply the full final schema as a single batch instead of incremental migrations.
 * We still record a migration entry to prevent re-application.
 */
declare function ensureSchema(db: D1Db): Promise<void>;
//#endregion
//#region src/repositories/MintRepository.d.ts
declare class D1MintRepository implements MintRepository {
  private readonly db;
  constructor(db: D1Db);
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
declare class D1KeysetRepository implements KeysetRepository {
  private readonly db;
  constructor(db: D1Db);
  getKeysetsByMintUrl(mintUrl: string): Promise<Keyset[]>;
  getKeysetById(mintUrl: string, id: string): Promise<Keyset | null>;
  updateKeyset(keyset: Omit<Keyset, 'keypairs' | 'updatedAt'>): Promise<void>;
  addKeyset(keyset: Omit<Keyset, 'updatedAt'>): Promise<void>;
  deleteKeyset(mintUrl: string, keysetId: string): Promise<void>;
}
//#endregion
//#region src/repositories/KeyRingRepository.d.ts
declare class D1KeyRingRepository implements KeyRingRepository {
  private readonly db;
  constructor(db: D1Db);
  getPersistedKeyPair(publicKey: string, purpose?: KeypairPurpose): Promise<Keypair | null>;
  setPersistedKeyPair(keyPair: Keypair): Promise<void>;
  deletePersistedKeyPair(publicKey: string, purpose?: KeypairPurpose): Promise<void>;
  getAllPersistedKeyPairs(purpose?: KeypairPurpose): Promise<Keypair[]>;
  getLatestKeyPair(purpose?: KeypairPurpose): Promise<Keypair | null>;
  getLastDerivationIndex(purpose?: KeypairPurpose): Promise<number>;
}
//#endregion
//#region src/repositories/CounterRepository.d.ts
declare class D1CounterRepository implements CounterRepository {
  private readonly db;
  constructor(db: D1Db);
  getCounter(mintUrl: string, keysetId: string): Promise<Counter | null>;
  setCounter(mintUrl: string, keysetId: string, counter: number): Promise<void>;
}
//#endregion
//#region src/repositories/ProofRepository.d.ts
declare class D1ProofRepository implements ProofRepository {
  private readonly db;
  constructor(db: D1Db);
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
declare class D1MeltQuoteRepository implements MeltQuoteRepository {
  private readonly db;
  constructor(db: D1Db);
  getMeltQuote(mintUrl: string, method: string, quoteId: string): Promise<MeltQuote | null>;
  upsertMeltQuote(quote: MeltQuote): Promise<void>;
  getPendingMeltQuotes(method?: string): Promise<MeltQuote[]>;
}
//#endregion
//#region src/repositories/MintQuoteRepository.d.ts
declare class D1MintQuoteRepository implements MintQuoteRepository {
  private readonly db;
  constructor(db: D1Db);
  getMintQuote(mintUrl: string, method: string, quoteId: string): Promise<MintQuote | null>;
  upsertMintQuote(quote: MintQuote): Promise<void>;
  setMintQuoteState(mintUrl: string, method: string, quoteId: string, state: MintMethodRemoteState, observedAt?: number): Promise<void>;
  getPendingMintQuotes(method?: string): Promise<MintQuote[]>;
}
//#endregion
//#region src/repositories/LegacyMintQuoteRepository.d.ts
declare class D1LegacyMintQuoteRepository implements LegacyMintQuoteRepository {
  private readonly db;
  constructor(db: D1Db);
  getPendingLegacyMintQuotes(mintUrl?: string): Promise<MintQuote[]>;
}
//#endregion
//#region src/repositories/HistoryRepository.d.ts
declare class D1HistoryRepository implements HistoryRepository {
  private readonly db;
  constructor(db: D1Db);
  getPaginatedHistoryEntries(limit: number, offset: number): Promise<HistoryEntry[]>;
  getHistoryEntryById(id: string): Promise<HistoryEntry | null>;
}
//#endregion
//#region src/repositories/SendOperationRepository.d.ts
declare class D1SendOperationRepository implements SendOperationRepository {
  private readonly db;
  constructor(db: D1Db);
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
declare class D1MeltOperationRepository implements MeltOperationRepository {
  private readonly db;
  constructor(db: D1Db);
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
declare class D1AuthSessionRepository implements AuthSessionRepository {
  private readonly db;
  constructor(db: D1Db);
  getSession(mintUrl: string): Promise<AuthSession | null>;
  saveSession(session: AuthSession): Promise<void>;
  deleteSession(mintUrl: string): Promise<void>;
  getAllSessions(): Promise<AuthSession[]>;
}
//#endregion
//#region src/repositories/MintOperationRepository.d.ts
type MintOperation = NonNullable<Awaited<ReturnType<MintOperationRepository['getById']>>>;
type MintOperationState = Parameters<MintOperationRepository['getByState']>[0];
declare class D1MintOperationRepository implements MintOperationRepository {
  private readonly db;
  constructor(db: D1Db);
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
declare class D1ReceiveOperationRepository implements ReceiveOperationRepository {
  private readonly db;
  constructor(db: D1Db);
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
declare class D1PaymentRequestReceiveOperationRepository implements PaymentRequestReceiveOperationRepository {
  private readonly db;
  constructor(db: D1Db);
  create(operation: PaymentRequestReceiveOperation): Promise<void>;
  update(operation: PaymentRequestReceiveOperation): Promise<void>;
  getById(id: string): Promise<PaymentRequestReceiveOperation | null>;
  getByState(state: PaymentRequestReceiveState): Promise<PaymentRequestReceiveOperation[]>;
  getActiveByRequestId(requestId: string): Promise<PaymentRequestReceiveOperation[]>;
  list(filter?: {
    state?: PaymentRequestReceiveState;
  }): Promise<PaymentRequestReceiveOperation[]>;
}
declare class D1PaymentRequestReceiveAttemptRepository implements PaymentRequestReceiveAttemptRepository {
  private readonly db;
  constructor(db: D1Db);
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
//#region src/index.d.ts
interface D1RepositoriesOptions {
  /** Cloudflare D1 database binding */
  d1Database: D1Database;
  /** Tenant identifier for multi-tenancy row-level isolation */
  localName: string;
}
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
declare class D1Repositories implements Repositories {
  readonly mintRepository: MintRepository;
  readonly keyRingRepository: KeyRingRepository;
  readonly counterRepository: CounterRepository;
  readonly keysetRepository: KeysetRepository;
  readonly proofRepository: ProofRepository;
  readonly meltQuoteRepository: MeltQuoteRepository;
  readonly mintQuoteRepository: MintQuoteRepository;
  readonly legacyMintQuoteRepository: LegacyMintQuoteRepository;
  readonly historyRepository: D1HistoryRepository;
  readonly sendOperationRepository: SendOperationRepository;
  readonly meltOperationRepository: MeltOperationRepository;
  readonly authSessionRepository: AuthSessionRepository;
  readonly mintOperationRepository: MintOperationRepository;
  readonly receiveOperationRepository: ReceiveOperationRepository;
  readonly paymentRequestReceiveOperationRepository: PaymentRequestReceiveOperationRepository;
  readonly paymentRequestReceiveAttemptRepository: PaymentRequestReceiveAttemptRepository;
  readonly db: D1Db;
  constructor(options: D1RepositoriesOptions);
  init(): Promise<void>;
  withTransaction<T>(fn: (repos: RepositoryTransactionScope) => Promise<T>): Promise<T>;
}
//#endregion
export { D1AuthSessionRepository, D1CounterRepository, D1Db, D1HistoryRepository, D1KeyRingRepository, D1KeysetRepository, D1LegacyMintQuoteRepository, D1MeltOperationRepository, D1MeltQuoteRepository, D1MintOperationRepository, D1MintQuoteRepository, D1MintRepository, D1PaymentRequestReceiveAttemptRepository, D1PaymentRequestReceiveOperationRepository, D1ProofRepository, D1ReceiveOperationRepository, D1Repositories, D1RepositoriesOptions, D1SendOperationRepository, ensureSchema };