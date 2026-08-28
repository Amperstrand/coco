import * as _cashu_cashu_ts0 from "@cashu/cashu-ts";
import { Amount, AmountLike, AuthProvider, GetKeysetsResponse, HttpResponseError, MeltQuoteBaseResponse, MeltQuoteBolt11Response, MeltQuoteBolt12Response, MeltQuoteOnchainFeeOption, MeltQuoteOnchainResponse, MeltQuoteState, Mint, MintKeys, MintKeyset, MintOperationError, MintQuoteBaseResponse, MintQuoteBolt11Response, MintQuoteBolt12Response, MintQuoteOnchainResponse, NUT10Option, NetworkError, OutputData, OutputDataCreator, OutputDataLike, P2PKOptions, P2PKTag, PaymentRequest, PaymentRequestPayload, PaymentRequestTransport, PaymentRequestTransportType, Proof, SerializedBlindedSignature, SigFlag, Token, TokenResponse, Wallet } from "@cashu/cashu-ts";

//#region models/AuthSession.d.ts
interface AuthSession {
  mintUrl: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
  batPool?: Proof[];
}
//#endregion
//#region models/MintQuoteState.d.ts
/** @deprecated Use canonical `amountPaid` and `amountIssued` Mint Quote Accounting. */
type MintQuoteState = 'UNPAID' | 'PAID' | 'ISSUED';
//#endregion
//#region types.d.ts
type MintInfo = Awaited<ReturnType<Mint['getInfo']>>;
type ProofState = 'inflight' | 'ready' | 'spent';
interface BalanceSnapshot {
  spendable: Amount;
  reserved: Amount;
  total: Amount;
  unit: string;
}
type BalancesByMint = {
  [mintUrl: string]: BalanceSnapshot;
};
type BalancesByMintAndUnit = {
  [mintUrl: string]: {
    [unit: string]: BalanceSnapshot;
  };
};
type BalancesByUnit = {
  [unit: string]: BalanceSnapshot;
};
interface BalanceQuery {
  mintUrls?: string[];
  units?: string[];
  trustedOnly?: boolean;
}
/**
 * @deprecated Use BalanceSnapshot instead.
 */
interface BalanceBreakdown {
  ready: Amount;
  reserved: Amount;
  total: Amount;
}
/**
 * @deprecated Use BalancesByMint instead.
 */
type BalancesBreakdownByMint = {
  [mintUrl: string]: BalanceBreakdown;
};
interface CoreProof extends Proof {
  mintUrl: string;
  unit: string;
  state: ProofState;
  /**
   * ID of the operation that is using this proof as input.
   * When set, the proof is reserved and should not be used by other operations.
   */
  usedByOperationId?: string;
  /**
   * ID of the operation that created this proof as output.
   * Used for auditing and rollback purposes.
   */
  createdByOperationId?: string;
}
//#endregion
//#region logging/Logger.d.ts
type LogLevel = 'error' | 'warn' | 'info' | 'debug';
interface Logger {
  error(message: string, ...meta: unknown[]): void;
  warn(message: string, ...meta: unknown[]): void;
  info(message: string, ...meta: unknown[]): void;
  debug(message: string, ...meta: unknown[]): void;
  log?(level: LogLevel, message: string, ...meta: unknown[]): void;
  child?(bindings: Record<string, unknown>): Logger;
}
//#endregion
//#region utils.d.ts
/**
 * Stored form of a BlindedMessage (JSON-safe)
 */
interface StoredBlindedMessage {
  amount: string | number;
  id: string;
  B_: string;
}
/**
 * Serialized form of a single OutputData entry (JSON-safe)
 */
interface SerializedOutput {
  blindedMessage: StoredBlindedMessage;
  blindingFactor: string;
  secret: string;
  ephemeralE?: string;
}
/**
 * Serialized form of OutputData for keep and send (JSON-safe)
 */
interface SerializedOutputData {
  keep: SerializedOutput[];
  send: SerializedOutput[];
}
/**
 * JSON-safe form of a blinded signature for repository persistence.
 */
type StoredBlindedSignature = Omit<SerializedBlindedSignature, 'amount'> & {
  amount: string;
};
/**
 * Serialize a single OutputData to JSON-safe format
 */
declare function serializeOutput(output: OutputDataLike): SerializedOutput;
/**
 * Deserialize a single SerializedOutput back to OutputData
 */
declare function deserializeOutput(serialized: SerializedOutput): OutputData;
/**
 * Serialize OutputData arrays for keep and send to JSON-safe format
 */
declare function serializeOutputData(data: {
  keep: OutputDataLike[];
  send: OutputDataLike[];
}): SerializedOutputData;
/**
 * Deserialize SerializedOutputData back to OutputData arrays
 */
declare function deserializeOutputData(serialized: SerializedOutputData): {
  keep: OutputData[];
  send: OutputData[];
};
/**
 * Extract secrets from serialized output data.
 * Returns the string form of secrets (matching proof.secret in Proof objects).
 */
declare function getSecretsFromSerializedOutputData(serialized: SerializedOutputData): {
  keepSecrets: string[];
  sendSecrets: string[];
};
declare function toAmount(value: AmountLike): Amount;
declare function sumAmounts(values: Iterable<AmountLike>): Amount;
declare function serializeAmount(value: AmountLike): string;
declare function stringifyJson(value: unknown): string;
declare function deserializeAmount(value: string | number | bigint | Amount): Amount;
/**
 * Convert blinded signatures to a repository-safe form.
 */
declare function serializeBlindedSignatures(signatures: SerializedBlindedSignature[] | undefined): StoredBlindedSignature[] | undefined;
/**
 * Restore blinded signature Amount instances after repository hydration.
 */
declare function deserializeBlindedSignatures(value: unknown): SerializedBlindedSignature[] | undefined;
declare function deserializeToken(value: unknown): Token | undefined;
/**
 * Normalize a mint URL to prevent duplicates from variations like:
 * - Trailing slashes: https://mint.com/ -> https://mint.com
 * - Case differences in hostname: https://MINT.com -> https://mint.com
 * - Default ports: https://mint.com:443 -> https://mint.com
 * - Redundant path segments: https://mint.com/./path -> https://mint.com/path
 */
declare function normalizeMintUrl(mintUrl: string): string;
//#endregion
//#region models/Counter.d.ts
interface Counter {
  mintUrl: string;
  keysetId: string;
  counter: number;
}
//#endregion
//#region events/EventBus.d.ts
type EventHandler<Payload> = (payload: Payload) => void | Promise<void>;
type EventBusOptions<Events extends { [K in keyof Events]: unknown }> = {
  onError?: (args: {
    event: keyof Events;
    payload: Events[keyof Events];
    error: unknown;
  }) => void | Promise<void>;
  concurrency?: 'sequential' | 'parallel';
  throwOnError?: boolean;
};
type EmitOptions = {
  throwOnError?: boolean;
  failFast?: boolean;
};
declare class EventBus<Events extends { [K in keyof Events]: unknown }> {
  private readonly options;
  private listeners;
  constructor(options?: EventBusOptions<Events>);
  on<E extends keyof Events>(event: E, handler: EventHandler<Events[E]>): () => void;
  once<E extends keyof Events>(event: E, handler: EventHandler<Events[E]>): () => void;
  off<E extends keyof Events>(event: E, handler: EventHandler<Events[E]>): void;
  emit<E extends keyof Events>(event: E, payload: Events[E], options?: EmitOptions): Promise<void>;
}
//#endregion
//#region models/Mint.d.ts
interface Mint$1 {
  mintUrl: string;
  name: string;
  mintInfo: MintInfo;
  trusted: boolean;
  createdAt: number;
  updatedAt: number;
}
//#endregion
//#region models/Keyset.d.ts
type KeysetKeypairs = Record<string, string>;
interface Keyset {
  mintUrl: string;
  id: string;
  unit: string;
  keypairs: KeysetKeypairs;
  active: boolean;
  feePpk: number;
  updatedAt: number;
}
//#endregion
//#region infra/MintRequestProvider.d.ts
/**
 * A function compatible with cashu-ts's `_customRequest` parameter.
 */
type MintRequestFn = <T>(options: {
  endpoint: string;
  requestBody?: Record<string, unknown>;
  headers?: Record<string, string>;
  method?: string;
}) => Promise<T>;
interface MintRequestProviderOptions {
  /** Default capacity for rate limiters (default: 20) */
  capacity?: number;
  /** Default refill rate per minute (default: 20) */
  refillPerMinute?: number;
  /** Path prefixes to bypass rate limiting */
  bypassPathPrefixes?: string[];
  /** Optional per-mint configuration override */
  configForMint?: (mintUrl: string) => Partial<{
    capacity: number;
    refillPerMinute: number;
    bypassPathPrefixes: string[];
  }>;
  logger?: Logger;
}
/**
 * Manages per-mint request rate limiters.
 *
 * This class provides a centralized way to share rate limiters across
 * all components that need to make HTTP requests to mints (WalletService,
 * MintAdapter, etc.).
 */
declare class MintRequestProvider {
  private readonly limiters;
  private readonly options;
  constructor(options?: MintRequestProviderOptions);
  /**
   * Get the request function for a specific mint.
   * Creates a new rate limiter if one doesn't exist for this mint.
   */
  getRequestFn(mintUrl: string): MintRequestFn;
  /**
   * Get or create a rate limiter for a specific mint.
   */
  private getOrCreateLimiter;
  /**
   * Clear the rate limiter for a specific mint.
   */
  clearMint(mintUrl: string): void;
  /**
   * Clear all rate limiters.
   */
  clearAll(): void;
}
//#endregion
//#region services/SeedService.d.ts
declare class SeedService {
  private readonly seedGetter;
  private readonly seedTtlMs;
  private cachedSeed;
  private cachedUntil;
  private inFlight;
  constructor(seedGetter: () => Promise<Uint8Array>, options?: {
    seedTtlMs?: number;
  });
  getSeed(): Promise<Uint8Array>;
  clear(): void;
}
//#endregion
//#region services/WalletService.d.ts
declare class WalletService {
  private walletCache;
  private readonly CACHE_TTL;
  private readonly mintService;
  private readonly seedService;
  private inFlight;
  private readonly logger?;
  private readonly requestProvider;
  private readonly authProviderGetter?;
  private readonly outputDataCreator?;
  constructor(mintService: MintService, seedService: SeedService, requestProvider: MintRequestProvider, logger?: Logger, authProviderGetter?: (mintUrl: string) => AuthProvider | undefined, outputDataCreator?: OutputDataCreator);
  getWallet(mintUrl: string, unit: string): Promise<Wallet>;
  getWalletWithActiveKeysetId(mintUrl: string, unit: string): Promise<{
    wallet: Wallet;
    keysetId: string;
    keyset: MintKeyset;
    keys: MintKeys;
    unit: string;
  }>;
  /**
   * Clear cached wallet for a specific mint URL
   */
  clearCache(mintUrl: string, unit?: string): void;
  /**
   * Clear all cached wallets
   */
  clearAllCaches(): void;
  /**
   * Force refresh mint data and get fresh wallet
   */
  refreshWallet(mintUrl: string, unit: string): Promise<Wallet>;
  private getWalletCacheKey;
  private normalizeKeysetUnit;
  private buildWallet;
}
//#endregion
//#region amounts.d.ts
declare const DEFAULT_UNIT = "sat";
interface UnitAmount {
  amount: Amount;
  unit: string;
}
type UnitAmountLike = AmountLike | {
  amount: AmountLike;
  unit: string;
};
declare function isUnitAmountLikeObject(input: UnitAmountLike): input is {
  amount: AmountLike;
  unit: string;
};
declare function normalizeUnit(unit?: string, options?: {
  defaultUnit?: string;
}): string;
declare function normalizeUnitList(units?: readonly string[]): string[] | undefined;
declare function assertSameUnit(actual: string, expected: string, context?: string): void;
/**
 * Parse ergonomic public-boundary amount input into canonical `UnitAmount`.
 *
 * Use this at API and hook boundaries only. Internal services, operations, and
 * handlers should accept `UnitAmount` directly so amount+unit cannot be split or
 * accidentally defaulted.
 */
declare function parseUnitAmount(input: UnitAmountLike, options?: {
  defaultUnit?: string;
  explicitUnit?: string;
}): UnitAmount;
/**
 * Normalize an already-coupled amount/unit value for internal service use.
 *
 * `parseUnitAmount()` is the public-boundary parser for ergonomic inputs. Internal
 * service and operation layers should accept `UnitAmount` and use this helper only
 * to canonicalize the `Amount` instance and lower-case the unit.
 */
declare function normalizeUnitAmount(value: UnitAmount): UnitAmount;
declare function assertUnitAmount(value: UnitAmount, context?: string): UnitAmount;
declare function sameUnitAmount(amount: UnitAmount, expectedUnit: string, context?: string): UnitAmount;
//#endregion
//#region operations/mint/MintOperation.d.ts
/**
 * State machine for mint operations:
 *
 * init -> pending -> executing -> finalized
 *          ^         |
 *          +---------+-> failed
 *
 * - init: Quote-bound local mint intent persisted before prepare has attached output data
 * - pending: Deterministic outputData persisted; quote may now settle remotely
 * - executing: Mint or recovery call in progress
 * - finalized: Quote reached terminal ISSUED state; proofs were saved when recoverable
 * - failed: Operation reached a terminal non-issued state (for example, invalid quote data)
 */
type MintOperationState = 'init' | 'pending' | 'executing' | 'finalized' | 'failed';
interface MintOperationBase<M extends MintMethod = MintMethod> extends MintMethodMeta<M> {
  id: string;
  mintUrl: string;
  createdAt: number;
  updatedAt: number;
  error?: string;
  terminalFailure?: MintOperationFailure;
}
interface MintOperationFailure {
  reason: string;
  code?: string;
  retryable?: boolean;
  observedAt: number;
}
interface MintIntentData {
  amount: Amount;
  unit: string;
}
interface MintQuoteSnapshot {
  quoteId: string;
  request: string;
  expiry: number | null;
  pubkey?: string;
}
interface PendingData {
  outputData: SerializedOutputData;
}
interface InitMintOperation<M extends MintMethod = MintMethod> extends MintOperationBase<M>, MintIntentData {
  state: 'init';
  quoteId: string;
}
interface PendingMintOperation<M extends MintMethod = MintMethod> extends MintOperationBase<M>, MintIntentData, MintQuoteSnapshot, PendingData {
  state: 'pending';
}
interface ExecutingMintOperation<M extends MintMethod = MintMethod> extends MintOperationBase<M>, MintIntentData, MintQuoteSnapshot, PendingData {
  state: 'executing';
}
interface FinalizedMintOperation<M extends MintMethod = MintMethod> extends MintOperationBase<M>, MintIntentData, MintQuoteSnapshot, PendingData {
  state: 'finalized';
}
interface FailedMintOperation<M extends MintMethod = MintMethod> extends MintOperationBase<M>, MintIntentData, MintQuoteSnapshot, PendingData {
  state: 'failed';
}
type MintOperation<M extends MintMethod = MintMethod> = InitMintOperation<M> | PendingMintOperation<M> | ExecutingMintOperation<M> | FinalizedMintOperation<M> | FailedMintOperation<M>;
type PendingOrLaterOperation<M extends MintMethod = MintMethod> = PendingMintOperation<M> | ExecutingMintOperation<M> | FinalizedMintOperation<M> | FailedMintOperation<M>;
type TerminalMintOperation<M extends MintMethod = MintMethod> = FinalizedMintOperation<M> | FailedMintOperation<M>;
declare function hasPendingData<M extends MintMethod>(op: MintOperation<M>): op is PendingOrLaterOperation<M>;
declare function isTerminalOperation$1<M extends MintMethod>(op: MintOperation<M>): op is TerminalMintOperation<M>;
declare function getOutputProofSecrets<M extends MintMethod>(op: PendingOrLaterOperation<M>): string[];
declare function createMintOperation<M extends MintMethod>(id: string, mintUrl: string, meta: MintMethodMeta<M>, intent: UnitAmount, options: {
  quoteId: string;
}): InitMintOperation<M>;
//#endregion
//#region models/MintQuote.d.ts
type MintQuoteOnchainResponse$1 = MintQuoteOnchainResponse;
interface MintQuoteBase<M extends MintMethod> {
  mintUrl: string;
  method: M;
  quoteId: string;
  /**
   * Compatibility alias for cashu-ts quote snapshots.
   * New code should use quoteId for local/remote identity clarity.
   */
  quote: string;
  request: string;
  unit: string;
  expiry: number | null;
  pubkey?: string;
  reusable: boolean;
  /** Mint-reported cumulative amount paid toward this quote. */
  amountPaid: Amount;
  /** Mint-reported cumulative amount issued from this quote. */
  amountIssued: Amount;
  /**
   * Mint-reported Remote Quote Update Time in protocol seconds, or `null` when unavailable.
   * This is distinct from Coco's local `updatedAt` timestamp in milliseconds.
   */
  remoteUpdatedAt: number | null;
  quoteData: MintMethodQuoteData<M>;
  createdAt: number;
  updatedAt: number;
}
type Bolt11MintQuote = MintQuoteBase<'bolt11'> & {
  amount: Amount;
  /**
   * @deprecated Use `amountPaid` and `amountIssued` for Mint Quote Accounting.
   */
  state: MintMethodRemoteState<'bolt11'>;
  reusable: false;
};
type OnchainMintQuote = MintQuoteBase<'onchain'> & {
  amount?: never;
  state?: never;
  reusable: true;
};
type Bolt12MintQuote = MintQuoteBase<'bolt12'> & {
  amount?: Amount;
  state?: never;
  reusable: true;
};
type MintQuote<M extends MintMethod = MintMethod> = M extends 'bolt11' ? Bolt11MintQuote : M extends 'onchain' ? OnchainMintQuote : M extends 'bolt12' ? Bolt12MintQuote : never;
declare function isStatefulMintQuote(quote: MintQuote): quote is MintQuote<'bolt11'>;
/** Derives the deprecated BOLT11 state projection from canonical quote accounting. */
declare function deriveBolt11MintQuoteState(amountPaid: Amount, amountIssued: Amount): MintMethodRemoteState<'bolt11'>;
/**
 * Applies a legacy BOLT11 state observation without allowing it to reduce canonical accounting.
 *
 * @deprecated Legacy state is a fallback for snapshots that do not carry Mint Quote Accounting.
 */
declare function applyBolt11MintQuoteStateFallback(quote: MintQuote<'bolt11'>, state: MintMethodRemoteState<'bolt11'>, observedAt?: number): MintQuote<'bolt11'>;
/**
 * Returns the deprecated BOLT11 state projection for compatibility consumers.
 *
 * @deprecated Use `amountPaid` and `amountIssued`, or the common Claimability assessment.
 */
declare function getMintQuoteRemoteState(quote: MintQuote): MintMethodRemoteState<'bolt11'> | undefined;
/**
 * Returns the fixed mint operation amount for stateful quotes.
 *
 * Reusable quote metadata may include a payment amount, such as a fixed BOLT12
 * offer amount, but that does not constrain the later mint operation amount.
 */
declare function getMintQuoteAmount(quote: MintQuote): Amount | undefined;
/** Returns mint-reported availability without local issuance or reservation facts. */
declare function getMintQuoteAvailableAmount(quote: MintQuote): Amount;
declare function isMintQuotePending(quote: MintQuote): boolean;
declare function mintQuoteFromBolt11Response(mintUrl: string, quote: MintQuoteBolt11Response, options?: {
  now?: number;
}): MintQuote<'bolt11'>;
declare function mintQuoteFromOnchainResponse(mintUrl: string, quote: MintQuoteOnchainResponse, options?: {
  now?: number;
}): MintQuote<'onchain'>;
declare function mintQuoteFromBolt12Response(mintUrl: string, quote: MintQuoteBolt12Response, options?: {
  now?: number;
}): MintQuote<'bolt12'>;
declare function mintQuoteToMethodSnapshot<M extends MintMethod>(quote: MintQuote<M>): MintMethodQuoteSnapshot<M>;
//#endregion
//#region operations/mint/MintMethodHandler.d.ts
type OptionalImportQuoteMetadata<T extends MintQuoteBaseResponse> = Omit<T, 'method' | 'updated_at'> & Partial<Pick<MintQuoteBaseResponse, 'method' | 'updated_at'>>;
/**
 * Compatibility for caller-provided legacy snapshots at Quote Lifecycle's public import seam.
 * These snapshots bypass cashu-ts wire normalization, so Coco derives missing canonical BOLT11
 * accounting or compatibility state before admitting them to the normalized runtime interface.
 */
type CompatibleMintQuoteBolt11Response = Omit<OptionalImportQuoteMetadata<MintQuoteBolt11Response>, 'amount' | 'amount_paid' | 'amount_issued' | 'state'> & {
  amount: Amount;
  amount_paid?: Amount;
  amount_issued?: Amount;
  state?: MintQuoteBolt11Response['state'];
};
type CompatibleMintQuoteOnchainResponse = OptionalImportQuoteMetadata<MintQuoteOnchainResponse>;
type CompatibleMintQuoteBolt12Response = Omit<OptionalImportQuoteMetadata<MintQuoteBolt12Response>, 'amount'> & {
  amount?: Amount | null;
};
/**
 * Registry of supported mint methods and payload shapes.
 * Extend via declaration merging to support additional methods.
 */
interface MintMethodDefinitions {
  bolt11: {
    methodData: Record<string, never>;
    createQuoteData: {
      amount: UnitAmount;
      locked?: boolean; /** Existing Coco-owned NUT-20 key to use instead of generating a fresh key. */
      ownedPubkey?: string;
    };
    quoteData: {
      amount: Amount;
    }; /** @deprecated Compatibility projection of canonical Mint Quote Accounting. */
    remoteState: 'UNPAID' | 'PAID' | 'ISSUED';
    quote: MintQuoteBolt11Response;
  };
  onchain: {
    methodData: Record<string, never>;
    createQuoteData: {
      unit: string;
    };
    quoteData: {
      pubkey: string;
    };
    remoteState: never;
    quote: MintQuoteOnchainResponse;
  };
  bolt12: {
    methodData: Record<string, never>;
    createQuoteData: {
      unit: string;
      amount?: UnitAmount;
      description?: string;
    };
    quoteData: {
      pubkey: string;
      amount?: Amount;
    };
    remoteState: never;
    quote: MintQuoteBolt12Response;
  };
}
type MintMethod = keyof MintMethodDefinitions;
type MintMethodData<M extends MintMethod = MintMethod> = MintMethodDefinitions[M]['methodData'];
type MintMethodCreateQuoteData<M extends MintMethod = MintMethod> = MintMethodDefinitions[M]['createQuoteData'];
type MintMethodQuoteData<M extends MintMethod = MintMethod> = MintMethodDefinitions[M]['quoteData'];
type MintMethodRemoteState<M extends MintMethod = MintMethod> = MintMethodDefinitions[M]['remoteState'];
type MintMethodQuoteSnapshot<M extends MintMethod = MintMethod> = MintMethodDefinitions[M]['quote'];
type MintMethodQuoteImportSnapshot<M extends MintMethod = MintMethod> = M extends 'bolt11' ? CompatibleMintQuoteBolt11Response : M extends 'onchain' ? CompatibleMintQuoteOnchainResponse : M extends 'bolt12' ? CompatibleMintQuoteBolt12Response : never;
interface MintMethodMeta<M extends MintMethod = MintMethod> {
  method: M;
  methodData: MintMethodData<M>;
}
interface BaseHandlerDeps$2 {
  proofRepository: ProofRepository;
  proofService: ProofService;
  walletService: WalletService;
  mintService: MintService;
  mintAdapter: MintAdapter;
  eventBus: EventBus<CoreEvents>;
  logger?: Logger;
}
interface CreateMintQuoteContext<M extends MintMethod = MintMethod> extends BaseHandlerDeps$2 {
  mintUrl: string;
  createQuoteData: MintMethodCreateQuoteData<M>;
  wallet: Wallet;
}
interface FetchRemoteMintQuoteContext<M extends MintMethod = MintMethod> extends BaseHandlerDeps$2 {
  quote: MintQuote<M>;
}
interface PrepareContext<M extends MintMethod = MintMethod> extends BaseHandlerDeps$2 {
  operation: InitMintOperation<M>;
  wallet: Wallet;
  importedQuote?: MintMethodQuoteSnapshot<M>;
}
interface ExecuteContext$2<M extends MintMethod = MintMethod> extends BaseHandlerDeps$2 {
  operation: ExecutingMintOperation<M>;
  wallet: Wallet;
}
interface RecoverExecutingContext$2<M extends MintMethod = MintMethod> extends BaseHandlerDeps$2 {
  operation: ExecutingMintOperation<M>;
  wallet: Wallet;
  localClaimabilityFacts: {
    finalizedAmount: Amount;
    reservedAmount: Amount;
  };
}
interface PendingContext$2<M extends MintMethod = MintMethod> {
  operation: PendingMintOperation<M>;
  mintAdapter: MintAdapter;
  logger?: Logger;
}
type MintExecutionResult = {
  status: 'ISSUED';
  proofs: Proof[];
} | {
  status: 'ALREADY_ISSUED';
} | {
  status: 'FAILED';
  error?: string;
};
type RecoverExecutingResult = {
  status: 'FINALIZED';
} | {
  status: 'TERMINAL';
  error: string;
} | {
  status: 'PENDING';
  error?: string;
};
type PendingMintCheckCategory = 'waiting' | 'ready' | 'completed' | 'terminal';
interface PendingMintCheckResult<M extends MintMethod = MintMethod> {
  /** @deprecated Return `quoteSnapshot` with canonical accounting whenever available. */
  observedRemoteState?: MintMethodRemoteState<M>;
  observedRemoteStateAt: number;
  quoteSnapshot?: MintMethodQuoteSnapshot<M>;
  category: PendingMintCheckCategory;
  terminalFailure?: MintOperationFailure;
}
/**
 * Method-specific facts observed while checking a pending mint operation.
 *
 * Handlers validate whether remote responses belong to their operation. The durable mint saga
 * reconciles attributable snapshots and decides the resulting local operation state.
 */
type PendingMintObservationResult<M extends MintMethod = MintMethod> = {
  observedAt: number;
  quoteSnapshot: MintMethodQuoteSnapshot<M>;
  validationFailure?: never;
} | {
  observedAt: number;
  quoteSnapshot?: MintMethodQuoteSnapshot<M>;
  validationFailure: MintOperationFailure;
};
interface MintMethodHandler<M extends MintMethod = MintMethod> {
  createQuote(ctx: CreateMintQuoteContext<M>): Promise<MintQuote<M>>;
  fetchRemoteQuote(ctx: FetchRemoteMintQuoteContext<M>): Promise<MintQuote<M>>;
  validateQuoteForPrepare?(quote: MintQuote<M>): Promise<void> | void;
  prepare(ctx: PrepareContext<M>): Promise<PendingMintOperation<M>>;
  execute(ctx: ExecuteContext$2<M>): Promise<MintExecutionResult>;
  recoverExecuting(ctx: RecoverExecutingContext$2<M>): Promise<RecoverExecutingResult>;
  checkPending(ctx: PendingContext$2<M>): Promise<PendingMintObservationResult<M>>;
}
type MintMethodHandlerRegistry = { [M in MintMethod]: MintMethodHandler<M> };
//#endregion
//#region infra/MintAdapter.d.ts
type NormalizedMintQuoteSnapshot<M extends MintMethod> = M extends 'bolt11' ? MintQuoteBolt11Response : M extends 'bolt12' ? MintQuoteBolt12Response : MintQuoteOnchainResponse;
/**
 * Adapter for making HTTP requests to Cashu mints.
 *
 * All requests are rate-limited through the MintRequestProvider,
 * sharing the same rate limits with other components (e.g., WalletService).
 */
declare class MintAdapter {
  private cashuMints;
  private readonly requestProvider;
  private readonly authProviders;
  constructor(requestProvider: MintRequestProvider);
  /** Register an AuthProvider for a mint (NUT-21/22). Invalidates the cached Mint instance. */
  setAuthProvider(mintUrl: string, provider: AuthProvider): void;
  /** Get the AuthProvider for a mint (if registered). */
  getAuthProvider(mintUrl: string): AuthProvider | undefined;
  /** Remove the AuthProvider for a mint. Invalidates the cached Mint instance. */
  clearAuthProvider(mintUrl: string): void;
  fetchMintInfo(mintUrl: string): Promise<MintInfo>;
  fetchKeysets(mintUrl: string): Promise<GetKeysetsResponse>;
  fetchKeysForId(mintUrl: string, id: string): Promise<KeysetKeypairs>;
  private getCashuMint;
  checkMintQuote<M extends MintMethod>(mintUrl: string, method: M, quoteId: string): Promise<NormalizedMintQuoteSnapshot<M>>;
  /** Send one NUT-29 mint-quote batch check through the shared auth and rate-limit boundary. */
  checkMintQuoteBatch<M extends MintMethod>(mintUrl: string, method: M, quoteIds: string[]): Promise<NormalizedMintQuoteSnapshot<M>[]>;
  checkMeltQuote(mintUrl: string, quoteId: string): Promise<MeltQuoteBolt11Response>;
  checkMeltQuoteBolt12(mintUrl: string, quoteId: string): Promise<MeltQuoteBolt12Response>;
  checkMeltQuoteOnchain(mintUrl: string, quoteId: string): Promise<MeltQuoteOnchainResponse>;
  checkMeltQuoteState(mintUrl: string, quoteId: string): Promise<MeltQuoteBolt11Response['state']>;
  checkMeltQuoteBolt12State(mintUrl: string, quoteId: string): Promise<MeltQuoteBolt12Response['state']>;
  checkMeltQuoteOnchainState(mintUrl: string, quoteId: string): Promise<MeltQuoteOnchainResponse['state']>;
  checkProofStates(mintUrl: string, Ys: string[]): Promise<_cashu_cashu_ts0.ProofState[]>;
  customMeltBolt11(mintUrl: string, proofsToSend: Proof[], changeOutputs: OutputDataLike[], quoteId: string): Promise<MeltQuoteBolt11Response>;
  customMeltBolt12(mintUrl: string, proofsToSend: Proof[], changeOutputs: OutputDataLike[], quoteId: string): Promise<MeltQuoteBolt12Response>;
  customMeltOnchain(mintUrl: string, proofsToSend: Proof[], changeOutputs: OutputDataLike[], quoteId: string, feeIndex: number): Promise<MeltQuoteOnchainResponse>;
}
//#endregion
//#region services/MintService.d.ts
interface MethodUnitCapability {
  supported: boolean;
  disabled: boolean;
  nut: 4 | 5;
  method: string;
  unit: string;
  minAmount?: Amount | null;
  maxAmount?: Amount | null;
  options?: unknown;
  legacySatAllowed?: boolean;
  reason?: string;
}
/** Operation side for Payment Method Capability discovery. */
type PaymentMethodCapabilityOperationKind = 'mint' | 'melt';
/** Input for checking whether one method/unit pair is supported by mint metadata. */
interface CheckPaymentMethodCapabilityInput {
  mintUrl: string;
  operation: PaymentMethodCapabilityOperationKind;
  method: string;
  unit: string;
}
/** Input for listing actionable Payment Method Capabilities advertised by a mint. */
interface ListPaymentMethodCapabilitiesInput {
  mintUrl: string;
  operation?: PaymentMethodCapabilityOperationKind;
  unit?: string;
}
/** Actionable Payment Method Capability advertised through enabled NUT-04/NUT-05 metadata. */
interface PaymentMethodCapability {
  operation: PaymentMethodCapabilityOperationKind;
  nut: 4 | 5;
  method: string;
  unit: string;
  minAmount?: Amount | null;
  maxAmount?: Amount | null;
  options?: unknown;
}
/** Result for a single Payment Method Capability check, including unsupported reasons. */
interface PaymentMethodCapabilityCheck extends PaymentMethodCapability {
  supported: boolean;
  disabled: boolean;
  reason?: string;
}
type TopLevelNutCapability = 11 | 20;
declare class MintService {
  private readonly mintRepo;
  private readonly keysetRepo;
  private readonly mintAdapter;
  private readonly eventBus?;
  private readonly logger?;
  constructor(mintRepo: MintRepository, keysetRepo: KeysetRepository, mintAdapter: MintAdapter, logger?: Logger, eventBus?: EventBus<CoreEvents>);
  /**
   * Add a new mint by URL, running a single update cycle to fetch info & keysets.
   * If the mint already exists, it ensures it is updated.
   * New mints are added as untrusted by default unless explicitly specified.
   *
   * @param mintUrl - The URL of the mint to add
   * @param options - Optional configuration
   * @param options.trusted - Whether to add the mint as trusted (default: false)
   */
  addMintByUrl(mintUrl: string, options?: {
    trusted?: boolean;
  }): Promise<{
    mint: Mint$1;
    keysets: Keyset[];
  }>;
  updateMintData(mintUrl: string): Promise<{
    mint: Mint$1;
    keysets: Keyset[];
  }>;
  isTrustedMint(mintUrl: string): Promise<boolean>;
  ensureUpdatedMint(mintUrl: string): Promise<{
    mint: Mint$1;
    keysets: Keyset[];
  }>;
  deleteMint(mintUrl: string): Promise<void>;
  getMintInfo(mintUrl: string): Promise<MintInfo>;
  /**
   * Returns whether a mint advertises support for a top-level NUT capability.
   *
   * Supports boolean top-level capability metadata used by recovery and security
   * preflight. Mint information is resolved via
   * `getMintInfo()`, so stale local records may be refreshed and fetch failures
   * propagate to the caller. Missing, malformed, or disabled settings return
   * `false` rather than throwing.
   */
  supportsNut(mintUrl: string, nut: TopLevelNutCapability): Promise<boolean>;
  /**
   * Returns whether a mint advertises NUT-29 mint quote checks for a payment method.
   *
   * When NUT-29 omits its optional method list, enabled NUT-04 method metadata is
   * used as the source of supported mint methods. Missing or malformed metadata
   * returns `false`; mint-info refresh failures propagate unchanged.
   */
  supportsNut29MintQuoteCheck(mintUrl: string, method: string): Promise<boolean>;
  /**
   * Returns the bounded NUT-29 mint quote check limit for one polling group.
   *
   * Unsupported methods and malformed advertised limits use one quote per polling
   * opportunity. An omitted limit uses Coco's protocol safety cap of 100.
   */
  getNut29MintQuoteCheckLimit(mintUrl: string, method: string): Promise<number>;
  /**
   * Requires a mint to advertise a top-level NUT capability.
   *
   * Returns when support is advertised, throws `ProofValidationError` when
   * support is absent, and lets mint-info refresh/fetch failures propagate.
   */
  assertNutSupported(mintUrl: string, nut: TopLevelNutCapability, scope?: string): Promise<void>;
  checkPaymentMethodCapability(input: CheckPaymentMethodCapabilityInput): Promise<PaymentMethodCapabilityCheck>;
  getMintMethodUnitCapability(mintUrl: string, nut: 4 | 5, method: string, unit: string): Promise<MethodUnitCapability>;
  listPaymentMethodCapabilities(input: ListPaymentMethodCapabilitiesInput): Promise<PaymentMethodCapability[]>;
  assertMethodUnitSupported(mintUrl: string, nut: 4 | 5, method: string, scope: string | UnitAmount): Promise<void>;
  getAllMints(): Promise<Mint$1[]>;
  getAllTrustedMints(): Promise<Mint$1[]>;
  trustMint(mintUrl: string): Promise<void>;
  untrustMint(mintUrl: string): Promise<void>;
  private getNutMethodSettings;
  private getNutSupportSettings;
  private assertMethodCapabilityNut;
  private assertSupportCapabilityNut;
  private formatNut;
  private assertPaymentMethodCapabilityOperation;
  private nutForPaymentMethodCapabilityOperation;
  private parseOptionalAmount;
  private updateMint;
}
//#endregion
//#region infra/WsConnectionManager.d.ts
interface WebSocketLike {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: 'open' | 'message' | 'error' | 'close', listener: (event: any) => void): void;
  removeEventListener(type: 'open' | 'message' | 'error' | 'close', listener: (event: any) => void): void;
}
type WebSocketFactory = (url: string) => WebSocketLike;
//#endregion
//#region infra/SubscriptionProtocol.d.ts
type JsonRpcId = number;
type WsRequestMethod = 'subscribe' | 'unsubscribe';
type SubscriptionKind = 'bolt11_mint_quote' | 'onchain_mint_quote' | 'bolt12_mint_quote' | 'bolt11_melt_quote' | 'bolt12_melt_quote' | 'onchain_melt_quote' | 'proof_state';
type UnsubscribeHandler = () => Promise<void>;
interface SubscribeParams {
  kind: SubscriptionKind;
  subId: string;
  filters: string[];
}
interface UnsubscribeParams {
  subId: string;
}
type WsRequest = {
  jsonrpc: '2.0';
  method: WsRequestMethod;
  params: SubscribeParams | UnsubscribeParams;
  id: JsonRpcId;
};
//#endregion
//#region infra/RealTimeTransport.d.ts
type TransportEvent = 'open' | 'message' | 'close' | 'error';
interface RealTimeTransport {
  on(mintUrl: string, event: TransportEvent, handler: (evt: any) => void): void;
  send(mintUrl: string, req: WsRequest): void;
  closeAll(): void;
  closeMint(mintUrl: string): void;
  pause(): void;
  resume(): void;
}
//#endregion
//#region models/MeltQuote.d.ts
type BoltMeltMethod = Extract<MeltMethod, 'bolt11' | 'bolt12'>;
interface MeltQuoteBase<M extends MeltMethod> {
  mintUrl: string;
  method: M;
  quoteId: string;
  /**
   * Compatibility alias for cashu-ts BOLT11 quote snapshots.
   * New code should use quoteId for local/remote identity clarity.
   */
  quote: string;
  request: string;
  amount: Amount;
  unit: string;
  expiry: number;
  state: MeltMethodRemoteState<M>;
  change?: SerializedBlindedSignature[];
  lastObservedRemoteState?: MeltMethodRemoteState<M>;
  lastObservedRemoteStateAt?: number;
  createdAt: number;
  updatedAt: number;
}
interface BoltMeltQuote<M extends BoltMeltMethod = BoltMeltMethod> extends MeltQuoteBase<M> {
  fee_reserve: Amount;
  payment_preimage?: string | null;
}
interface OnchainMeltQuote extends MeltQuoteBase<'onchain'> {
  fee_options: MeltQuoteOnchainFeeOption[];
  outpoint?: string;
}
type MeltQuote<M extends MeltMethod = MeltMethod> = M extends 'onchain' ? OnchainMeltQuote : M extends BoltMeltMethod ? BoltMeltQuote<M> : never;
declare function meltQuoteFromBolt11Response(mintUrl: string, quote: MeltMethodQuoteSnapshot<'bolt11'>, options?: {
  now?: number;
}): MeltQuote<'bolt11'>;
declare function meltQuoteFromBolt12Response(mintUrl: string, quote: MeltMethodQuoteSnapshot<'bolt12'>, options?: {
  now?: number;
}): MeltQuote<'bolt12'>;
declare function meltQuoteFromOnchainResponse(mintUrl: string, quote: MeltMethodQuoteSnapshot<'onchain'>, options?: {
  now?: number;
}): MeltQuote<'onchain'>;
declare function meltQuoteToMethodSnapshot<M extends MeltMethod>(quote: MeltQuote<M>): MeltMethodQuoteSnapshot<M>;
declare function resolveOnchainMeltFeeOption(quote: MeltQuote<'onchain'>, feeIndex?: number): {
  feeIndex: number;
  feeOption: MeltQuoteOnchainFeeOption;
};
//#endregion
//#region models/QuoteIdentity.d.ts
/**
 * Public quote identity shared by mint and melt quote APIs.
 *
 * The identity intentionally omits `method`: callers identify a quote by `{ mintUrl, quoteId }`,
 * and repositories compare the identity after normalizing `mintUrl`. Within each quote kind
 * (mint quotes separately from melt quotes), a quote ID must be unique for a normalized mint URL
 * across all methods. Mint quote identities and melt quote identities are separate namespaces, so
 * the same `{ mintUrl, quoteId }` can identify one mint quote and one melt quote.
 */
type QuoteIdentity = {
  mintUrl: string;
  quoteId: string;
};
/**
 * Method-scoped mint quote reference used after the quote method is known. The `method` narrows the
 * public `QuoteIdentity` to the concrete repository row; it is not part of public quote identity.
 */
type MintQuoteRef<M extends MintMethod = MintMethod> = QuoteIdentity & Pick<MintQuote<M>, 'method'>;
/**
 * Method-scoped melt quote reference used after the quote method is known. The `method` narrows the
 * public `QuoteIdentity` to the concrete repository row; it is not part of public quote identity.
 */
type MeltQuoteRef<M extends MeltMethod = MeltMethod> = QuoteIdentity & Pick<MeltQuote<M>, 'method'>;
//#endregion
//#region quotes/MintQuotePolling.d.ts
type MintQuotePollingFailureCategory = 'network' | 'authentication' | 'rate-limit' | 'server' | 'incompatibility' | 'batch-size' | 'malformed-response' | 'validation';
interface MintQuotePollingFailure {
  category: MintQuotePollingFailureCategory;
  error: Error;
  responseIndex?: number;
  responseQuoteId?: string;
}
type MintQuotePollingOutcome = {
  status: 'updated';
  identity: QuoteIdentity;
  quote: MintQuote;
} | {
  status: 'failed';
  identity: QuoteIdentity;
  failure: MintQuotePollingFailure;
};
interface MintQuotePollingResult {
  outcomes: MintQuotePollingOutcome[];
  responseFailures: MintQuotePollingFailure[];
}
/** Batch-aware quote lifecycle boundary used by Background Watcher polling. */
interface MintQuotePollingOperation {
  getMintQuotePollingLimit(mintUrl: string, method: MintMethod): Promise<number>;
  checkMintQuotesForPolling(method: MintMethod, identities: readonly QuoteIdentity[]): Promise<MintQuotePollingResult>;
}
//#endregion
//#region infra/SubscriptionManager.d.ts
type SubscriptionCallback<TPayload = unknown> = (payload: TPayload) => void | Promise<void>;
interface SubscriptionManagerOptions {
  /** Slow polling interval while WS is connected (default: 20000ms) */
  slowPollingIntervalMs?: number;
  /** Fast polling interval after WS fails (default: 5000ms) */
  fastPollingIntervalMs?: number;
}
declare class SubscriptionManager {
  private readonly nextIdByMint;
  private readonly subscriptions;
  private readonly activeByMint;
  private readonly pendingSubscribeByMint;
  private readonly transportByMint;
  private readonly logger?;
  private readonly messageHandlerByMint;
  private readonly openHandlerByMint;
  private readonly hasOpenedByMint;
  private readonly wsFactory?;
  private readonly mintAdapter;
  private readonly mintQuotePolling?;
  private readonly options;
  private paused;
  constructor(wsFactoryOrManager: WebSocketFactory | RealTimeTransport, mintAdapter: MintAdapter, logger?: Logger, options?: SubscriptionManagerOptions, mintQuotePolling?: MintQuotePollingOperation);
  /**
   * Get or create a transport for a mint.
   *
   * Uses HybridTransport (WS + polling in parallel) when a wsFactory is available.
   * HybridTransport handles WS failures gracefully by speeding up polling, so we
   * don't need to check mint capabilities or WebSocket availability upfront.
   *
   * Falls back to pure PollingTransport only when no wsFactory is provided.
   */
  private getTransport;
  private getNextId;
  private ensureMessageListener;
  private deliverSubscriptionPayload;
  subscribe<TPayload = unknown>(mintUrl: string, kind: SubscriptionKind, filters: string[], onNotification?: SubscriptionCallback<TPayload>): Promise<{
    subId: string;
    unsubscribe: UnsubscribeHandler;
  }>;
  addCallback<TPayload = unknown>(subId: string, cb: SubscriptionCallback<TPayload>): void;
  removeCallback<TPayload = unknown>(subId: string, cb: SubscriptionCallback<TPayload>): void;
  unsubscribe(mintUrl: string, subId: string): Promise<void>;
  closeAll(): void;
  closeMint(mintUrl: string): void;
  private reSubscribeMint;
  pause(): void;
  resume(): void;
}
//#endregion
//#region infra/handlers/melt/MeltHandlerProvider.d.ts
/**
 * Runtime registry for melt method handlers.
 * Keeps wiring concerns out of the core melt domain.
 */
declare class MeltHandlerProvider {
  private registry;
  constructor(initialHandlers?: Partial<MeltMethodHandlerRegistry>);
  register<M extends MeltMethod>(method: M, handler: MeltMethodHandler<M>): void;
  registerMany(handlers: Partial<MeltMethodHandlerRegistry>): void;
  get<M extends MeltMethod>(method: M): MeltMethodHandler<M>;
  getAll(): MeltMethodHandlerRegistry;
  private set;
}
//#endregion
//#region infra/handlers/melt/BaseQuoteMeltHandler.d.ts
type BoltMeltQuoteState = 'UNPAID' | 'PENDING' | 'PAID';
interface QuoteMeltResponse<M extends MeltMethod = MeltMethod> {
  state: MeltMethodRemoteState<M>;
  change?: SerializedBlindedSignature[];
  payment_preimage?: string | null;
  outpoint?: string | null;
}
declare abstract class BaseQuoteMeltHandler<M extends MeltMethod> implements MeltMethodHandler<M> {
  protected abstract readonly method: M;
  protected abstract createRemoteQuote(ctx: CreateMeltQuoteContext<M>): Promise<MeltMethodQuoteSnapshot<M>>;
  protected abstract fetchRemoteMeltQuote(ctx: FetchRemoteMeltQuoteContext<M>): Promise<MeltMethodQuoteSnapshot<M>>;
  protected abstract executeMelt(ctx: ExecuteContext<M>, proofsToMelt: Proof[], changeOutputs: OutputDataLike[], quoteId: string): Promise<QuoteMeltResponse<M>>;
  protected abstract checkMeltQuote(ctx: FinalizeContext<M> | RecoverExecutingContext<M>): Promise<QuoteMeltResponse<M>>;
  protected abstract checkMeltQuoteState(ctx: PendingContext<M> | RecoverExecutingContext<M>): Promise<MeltMethodRemoteState<M>>;
  protected abstract getFeeReserveForQuote(quote: MeltMethodQuoteSnapshot<M>, operation: BasePrepareContext<M>['operation']): Amount;
  protected abstract buildFinalizedData(response: QuoteMeltResponse<M>): FinalizeResult<M>['finalizedData'];
  createQuote(ctx: CreateMeltQuoteContext<M>): Promise<MeltQuote<M>>;
  fetchRemoteQuote(ctx: FetchRemoteMeltQuoteContext<M>): Promise<MeltQuote<M>>;
  private toCanonicalQuote;
  /**
   * Calculate change amount and effective fee from melt operation results.
   * These values are derived from the actual melt settlement, not from the quote.
   *
   * changeAmount: Sum of amounts from change proofs returned by the mint
   * effectiveFee: Actual fee paid = meltInputAmount - amount - changeAmount
   */
  private calculateSettlementAmounts;
  private getPersistedSettlementResponse;
  /**
   * Returns the amount of proofs that were actually sent to the melt call.
   * For swap melts this excludes proofs kept locally after the pre-swap.
   */
  private getMeltInputAmount;
  /**
   * Prepare a bolt-backed melt operation.
   *
   * This method:
   * 1. Uses the canonical melt quote supplied by the quote lifecycle
   * 2. Selects proofs to cover the quote amount + fee reserve with input fees
   * 3. Determines if a pre-swap is needed (when selected amount >> required)
   * 4. Reserves the input proofs for this operation
   * 5. Creates blank outputs for receiving change
   *
   * @returns Prepared operation ready for execution
   */
  prepare(ctx: BasePrepareContext<M>): Promise<PreparedMeltOperation & MeltMethodMeta<M>>;
  /**
   * Prepare a direct melt (no swap needed).
   * Used when selected proofs are close to the required amount.
   */
  private prepareDirectMelt;
  /**
   * Prepare a swap-then-melt operation.
   * Used when selected proofs significantly exceed the required amount.
   */
  private prepareSwapThenMelt;
  /**
   * Create blank outputs to receive change from the melt operation.
   * The change is the difference between what we send and the quote amount.
   */
  private createChangeOutputs;
  /**
   * Execute the bolt11 melt operation.
   *
   * This method:
   * 1. Retrieves the reserved input proofs
   * 2. If swap is needed, performs the swap first to get exact-amount proofs
   * 3. Sends the melt request to the mint
   * 4. Handles the response (PAID → finalize, PENDING → wait, UNPAID → restore proofs)
   */
  execute(ctx: ExecuteContext<M>): Promise<ExecutionResult<M>>;
  /**
   * Handle the melt response and return the appropriate execution result.
   */
  private handleMeltResponse;
  /**
   * Retrieve the input proofs reserved for this operation.
   */
  private getInputProofs;
  /**
   * Execute the pre-melt swap to get exact-amount proofs.
   * Returns the "send" proofs from the swap which will be used for the melt.
   */
  private executeSwap;
  /**
   * Finalize a pending melt operation that has succeeded.
   * Called by MeltOperationService when checkPending returns 'finalize'.
   * Returns settlement amounts for accurate accounting.
   */
  finalize(ctx: FinalizeContext<M>): Promise<FinalizeResult<M>>;
  /**
   * Finalize a melt operation by marking input proofs as spent and saving change proofs.
   * Called immediately when melt returns PAID, or later when a pending melt succeeds.
   */
  private finalizeOperation;
  /**
   * Check the state of a pending melt operation.
   * Returns 'finalize' if paid, 'stay_pending' if still pending, 'rollback' if unpaid/failed.
   */
  checkPending(ctx: PendingContext<M>): Promise<PendingCheckResult>;
  /**
   * Rollback a melt operation by restoring input proofs to ready state.
   */
  rollback(ctx: RollbackContext<M>): Promise<void>;
  /**
   * Recover an executing operation after a crash/restart.
   *
   * Recovery logic:
   * - PAID: Finalize the operation (mark proofs spent, save change)
   * - PENDING: Transition to pending state for continued monitoring
   * - UNPAID: Determine what happened and restore/recover proofs appropriately
   *   - If no swap was needed or swap never happened: release original proofs
   *   - If swap happened and proofs exist locally: restore them to ready
   *   - If swap happened but proofs missing: recover from mint
   */
  recoverExecuting(ctx: RecoverExecutingContext<M>): Promise<ExecutionResult<M>>;
  /**
   * Recover an executing operation that was actually paid.
   * Fetches change signatures and finalizes the operation.
   * Returns execution result with actual settlement amounts.
   */
  private recoverExecutingPaidOperation;
  /**
   * Recover an executing operation that is now pending.
   * Transitions to pending state for continued monitoring.
   */
  private recoverExecutingPendingOperation;
  /**
   * Recover an executing operation that is unpaid.
   * Determines the appropriate recovery path based on whether a swap occurred.
   */
  private recoverExecutingUnpaidOperation;
  /**
   * Recover when swap happened and proofs exist locally.
   * Restores the swap send proofs to ready state.
   */
  private recoverExecutingWithLocalSwapProofs;
  /**
   * Recover when swap happened but proofs weren't saved locally.
   * This can happen if the app crashed after the swap but before saving proofs.
   * Recovers proofs from the mint using the swap output data.
   */
  private recoverExecutingSwapProofsFromMint;
  /**
   * Recover when no swap occurred - restore original proofs to ready.
   */
  private recoverExecutingWithoutSwap;
  /**
   * Check if the swap was executed by verifying if input proofs are spent.
   */
  private checkSwapHappened;
  /**
   * Find swap send proofs that were saved locally during the swap.
   * Returns empty array if proofs don't exist (crash before save).
   */
  private findLocalSwapSendProofs;
  /**
   * Get the secrets of proofs that were sent to the melt operation.
   * For direct melt: these are the original input proofs.
   * For swap-then-melt: these are the swap send proofs (derived from swapOutputData).
   */
  private getMeltInputSecrets;
}
//#endregion
//#region operations/send/SendOperation.d.ts
/**
 * State machine for send operations:
 *
 * init ──► prepared ──► executing ──► pending ──► finalized
 *   │         │            │            │
 *   │         │            │            └──► rolling_back ──► rolled_back
 *   │         │            │                      │
 *   └─────────┴────────────┴──────────────────────┴──► rolled_back
 *
 * - init: Operation created, nothing reserved yet
 * - prepared: Proofs reserved, outputs created, ready to execute
 * - executing: Swap/token creation in progress
 * - pending: Token returned to consumer, awaiting confirmation (proofs spent)
 * - finalized: Sent proofs confirmed spent, operation finalized
 * - rolling_back: Rollback in progress (reclaim swap being executed)
 * - rolled_back: Operation cancelled, proofs reclaimed
 */
type SendOperationState = 'init' | 'prepared' | 'executing' | 'pending' | 'finalized' | 'rolling_back' | 'rolled_back';
/**
 * Base fields present in all send operations
 */
interface SendOperationBase<M extends SendMethod = SendMethod> {
  /** Unique identifier for this operation */
  id: string;
  /** The mint URL for this operation */
  mintUrl: string;
  /** The amount requested to send (before fees) */
  amount: Amount;
  /** Unit for all amounts, proofs, outputs, and token data in this operation. */
  unit: string;
  /** The send method (e.g., 'default', 'p2pk') */
  method: M;
  /** Method-specific data */
  methodData: SendMethodData<M>;
  /** Timestamp when the operation was created */
  createdAt: number;
  /** Timestamp when the operation was last updated */
  updatedAt: number;
  /** Error message if the operation failed */
  error?: string;
}
/**
 * Data set during the prepare phase
 */
interface PreparedData$2 {
  /** Whether the operation requires a swap (false = exact match send) */
  needsSwap: boolean;
  /** Calculated fee for the swap (0 if exact match) */
  fee: Amount;
  /** Total amount of input proofs selected */
  inputAmount: Amount;
  /** Secrets of proofs reserved as input for this operation */
  inputProofSecrets: string[];
  /**
   * Serialized OutputData for the swap operation.
   * Only present if needsSwap is true.
   * Contains all information needed for recovery:
   * - Blinded messages (with keyset ID)
   * - Blinding factors
   * - Secrets (for deriving proof secrets)
   */
  outputData?: SerializedOutputData;
}
/**
 * Token data available once a send has been executed.
 * For P2PK sends, this is the canonical persisted token copy because the send
 * proofs are intentionally not stored in the wallet proof repository.
 */
interface SendTokenData {
  token?: Token;
}
/**
 * Initial state - operation just created, nothing reserved yet
 */
interface InitSendOperation extends SendOperationBase {
  state: 'init';
}
/**
 * Prepared state - proofs reserved, outputs calculated, ready to execute
 */
interface PreparedSendOperation extends SendOperationBase, PreparedData$2 {
  state: 'prepared';
}
/**
 * Executing state - swap/token creation in progress
 */
interface ExecutingSendOperation extends SendOperationBase, PreparedData$2 {
  state: 'executing';
}
/**
 * Pending state - token returned, awaiting confirmation that proofs are spent
 */
interface PendingSendOperation extends SendOperationBase, PreparedData$2, SendTokenData {
  state: 'pending';
}
/**
 * Finalized state - sent proofs confirmed spent, operation finalized
 */
interface FinalizedSendOperation extends SendOperationBase, PreparedData$2, SendTokenData {
  state: 'finalized';
}
/**
 * Rolling back state - rollback in progress, reclaim swap being executed.
 * This is a transient state used to prevent race conditions with ProofStateWatcher.
 * Only used when rolling back from 'pending' state (which requires a reclaim swap).
 */
interface RollingBackSendOperation extends SendOperationBase, PreparedData$2, SendTokenData {
  state: 'rolling_back';
}
/**
 * Rolled back state - operation cancelled, proofs reclaimed
 * Can be rolled back from prepared, executing, or pending states
 */
interface RolledBackSendOperation extends SendOperationBase, PreparedData$2, SendTokenData {
  state: 'rolled_back';
}
/**
 * Discriminated union of all send operation states.
 * TypeScript will narrow the type based on the `state` field.
 */
type SendOperation = InitSendOperation | PreparedSendOperation | ExecutingSendOperation | PendingSendOperation | FinalizedSendOperation | RollingBackSendOperation | RolledBackSendOperation;
/**
 * Any operation that has been prepared (has PreparedData)
 */
type PreparedOrLaterOperation$1 = PreparedSendOperation | ExecutingSendOperation | PendingSendOperation | FinalizedSendOperation | RollingBackSendOperation | RolledBackSendOperation;
/**
 * Terminal states - operation is finished
 * Note: 'rolling_back' is NOT terminal - it's a transient state that needs recovery
 */
type TerminalSendOperation = FinalizedSendOperation | RolledBackSendOperation;
interface CreateSendOperationOptions<M extends SendMethod = SendMethod> {
  method: M;
  methodData: SendMethodData<M>;
}
//#endregion
//#region operations/send/SendMethodHandler.d.ts
/**
 * Structured P2PK send options accepted by Coco.
 *
 * `hashlock` is intentionally unavailable because cashu-ts treats hashlocked
 * P2PK options as HTLC/NUT-14 data, which this send method does not support.
 */
type LegacyP2pkSendOptions = {
  pubkey: string | string[];
  locktime?: number;
  refundKeys?: string[];
  requiredSignatures?: number;
  requiredRefundSignatures?: number;
  additionalTags?: P2PKTag[];
  blindKeys?: boolean;
  sigFlag?: SigFlag; /** HTLC/NUT-14 hashlocks are out of scope for P2PK sends. */
  hashlock?: never;
};
/**
 * P2PK options accepted by Coco. The legacy v4 shape remains supported and is converted to the v5
 * NUT-10 envelope before cashu-ts receives it.
 */
type P2pkSendOptions = (Omit<P2PKOptions, 'kind'> & {
  kind: 'P2PK';
}) | LegacyP2pkSendOptions;
/**
 * Payload accepted by the P2PK send method.
 *
 * `pubkey` is the legacy shorthand for locking outputs to a single public key.
 * Prefer `options` for full NUT-11 P2PK conditions such as `sigflag`,
 * multisig tags, locktime, and refund keys.
 */
type P2pkSendMethodData = {
  /** Legacy/direct shorthand for sending to one P2PK lock key. */pubkey: string;
  options?: never;
} | {
  /** Full NUT-11 P2PK options accepted by Coco output builders. */options: P2pkSendOptions;
  pubkey?: never;
};
/** Options that control a standard unlocked token send. */
interface DefaultSendMethodData {
  /** Swap selected proofs even when they exactly match the requested amount. */
  forceSwap?: boolean;
}
/**
 * Registry of supported send methods and their payload shapes.
 * Extend via declaration merging if you need to add methods externally.
 *
 * Future methods may include:
 * - htlc: { hash: string; timeout: number } - HTLC locked tokens
 */
interface SendMethodDefinitions {
  default: DefaultSendMethodData;
  p2pk: P2pkSendMethodData;
}
type SendMethod = keyof SendMethodDefinitions;
type SendMethodData<M extends SendMethod = SendMethod> = SendMethodDefinitions[M];
interface BaseHandlerDeps$1 {
  proofRepository: ProofRepository;
  proofService: ProofService;
  walletService: WalletService;
  mintService: MintService;
  eventBus: EventBus<CoreEvents>;
  logger?: Logger;
}
interface BasePrepareContext$1 extends BaseHandlerDeps$1 {
  operation: InitSendOperation;
  wallet: Wallet;
}
interface ExecuteContext$1 extends BaseHandlerDeps$1 {
  operation: ExecutingSendOperation;
  wallet: Wallet;
  reservedProofs: Proof[];
}
interface PendingContext$1 extends BaseHandlerDeps$1 {
  operation: PendingSendOperation;
  wallet: Wallet;
}
interface FinalizeContext$1 extends BaseHandlerDeps$1 {
  operation: PendingSendOperation;
}
interface RollbackContext$1 extends BaseHandlerDeps$1 {
  operation: PreparedOrLaterOperation$1;
  wallet: Wallet;
}
interface RecoverExecutingContext$1 extends BaseHandlerDeps$1 {
  operation: ExecutingSendOperation;
  wallet: Wallet;
}
/**
 * Result of a normal execution. A pending result must carry the token so the
 * caller can hand it to the recipient.
 */
type ExecutionResult$1 = {
  status: 'PENDING';
  pending: PendingSendOperation;
  token: Token;
} | {
  status: 'FAILED';
  failed: RolledBackSendOperation;
};
/**
 * Result of recovering an executing operation. Recovery may legitimately reach a
 * pending state without being able to reconstruct the token, so it is optional.
 */
type RecoveryResult = {
  status: 'PENDING';
  pending: PendingSendOperation;
  token?: Token;
} | {
  status: 'FAILED';
  failed: RolledBackSendOperation;
};
type PendingCheckResult$1 = 'finalize' | 'stay_pending' | 'rollback';
interface SendMethodHandler<M extends SendMethod = SendMethod> {
  prepare(ctx: BasePrepareContext$1): Promise<PreparedSendOperation>;
  execute(ctx: ExecuteContext$1): Promise<ExecutionResult$1>;
  finalize?(ctx: FinalizeContext$1): Promise<void>;
  rollback?(ctx: RollbackContext$1): Promise<void>;
  checkPending?(ctx: PendingContext$1): Promise<PendingCheckResult$1>;
  /**
   * Recover an executing operation that failed mid-execution.
   * Handlers must implement this method to handle recovery logic.
   */
  recoverExecuting(ctx: RecoverExecutingContext$1): Promise<RecoveryResult>;
}
type SendMethodHandlerRegistry = Record<SendMethod, SendMethodHandler<any>>;
//#endregion
//#region infra/handlers/send/SendHandlerProvider.d.ts
/**
 * Runtime registry for send method handlers.
 * Keeps wiring concerns out of the core send domain.
 */
declare class SendHandlerProvider {
  private registry;
  constructor(initialHandlers?: Partial<SendMethodHandlerRegistry>);
  register<M extends SendMethod>(method: M, handler: SendMethodHandler<M>): void;
  registerMany(handlers: Partial<SendMethodHandlerRegistry>): void;
  get<M extends SendMethod>(method: M): SendMethodHandler<M>;
  getAll(): SendMethodHandlerRegistry;
}
//#endregion
//#region infra/handlers/mint/MintHandlerProvider.d.ts
/**
 * Runtime registry for mint method handlers.
 */
declare class MintHandlerProvider {
  private registry;
  constructor(initialHandlers?: Partial<MintMethodHandlerRegistry>);
  register<M extends MintMethod>(method: M, handler: MintMethodHandler<M>): void;
  registerMany(handlers: Partial<MintMethodHandlerRegistry>): void;
  get<M extends MintMethod>(method: M): MintMethodHandler<M>;
  getAll(): MintMethodHandlerRegistry;
  private set;
}
//#endregion
//#region operations/MintScopedLock.d.ts
/**
 * In-memory FIFO lock keyed by mint URL.
 *
 * This lock coordinates proof selection/reservation critical sections across
 * operation services within a single runtime.
 */
declare class MintScopedLock {
  private readonly queues;
  acquire(mintUrl: string): Promise<() => void>;
}
//#endregion
//#region models/MintQuoteClaimability.d.ts
type MintQuoteClaimabilityStatus = 'waiting' | 'claimable' | 'complete' | 'invalid';
interface MintQuoteClaimabilityAssessment {
  status: MintQuoteClaimabilityStatus;
  remoteAvailable: Amount;
  claimAmount?: Amount;
}
//#endregion
//#region quotes/QuoteLifecycle.d.ts
interface QuoteLifecycleDeps {
  mintHandlerProvider: MintHandlerProvider;
  meltHandlerProvider: MeltHandlerProvider;
  mintQuoteRepository: MintQuoteRepository;
  meltQuoteRepository: MeltQuoteRepository;
  proofRepository: ProofRepository;
  proofService: ProofService;
  mintService: MintService;
  walletService: WalletService;
  mintAdapter: MintAdapter;
  eventBus: EventBus<CoreEvents>;
  logger?: Logger;
  withMintQuoteTransaction?: <T>(fn: (repository: MintQuoteRepository) => Promise<T>) => Promise<T>;
}
declare class QuoteLifecycle {
  private readonly mintHandlerProvider;
  private readonly meltHandlerProvider;
  private readonly mintQuoteRepository;
  private readonly meltQuoteRepository;
  private readonly proofRepository;
  private readonly proofService;
  private readonly mintService;
  private readonly walletService;
  private readonly mintAdapter;
  private readonly eventBus;
  private readonly logger?;
  private readonly withMintQuoteTransaction;
  private readonly mintQuoteObservationLock;
  private readonly batchUnavailablePollingMethodsByMint;
  constructor(deps: QuoteLifecycleDeps);
  private isBatchUnavailableForPolling;
  private markBatchUnavailableForPolling;
  private clearBatchUnavailablePollingGroups;
  private recordDefinitiveBatchPollingFailure;
  private buildDeps;
  private refreshResolvedMintQuote;
  private refreshResolvedMeltQuote;
  createMintQuote(mintUrl: string, intent: UnitAmount, method?: 'bolt11'): Promise<MintQuote>;
  createMintQuote<M extends MintMethod>(mintUrl: string, method: M, createQuoteData: MintMethodCreateQuoteData<M>): Promise<MintQuote<M>>;
  getMintQuote(mintUrl: string, method: MintMethod, quoteId: string): Promise<MintQuote | null>;
  getMintQuoteById(identity: QuoteIdentity): Promise<MintQuote | null>;
  getPendingMintQuotes(method?: MintMethod): Promise<MintQuote[]>;
  /** Returns the advertised and safety-capped size for one Background Watcher opportunity. */
  getMintQuotePollingLimit(mintUrl: string, method: MintMethod): Promise<number>;
  /**
   * Checks selected mint quotes through the lifecycle polling seam.
   *
   * NUT-29 is used when advertised, with identity-based response attribution and
   * one explicit outcome for every selected quote. Attributable observations are
   * persisted before any update events are emitted, even when other response
   * elements are missing, duplicated, extra, malformed, or conflict with canonical
   * quote data. A single selection falls back to the existing single-quote endpoint
   * when NUT-29 is unavailable; multiple selections never fan out implicitly.
   */
  checkMintQuotesForPolling(method: MintMethod, identities: readonly QuoteIdentity[]): Promise<MintQuotePollingResult>;
  private assertAttributableMintQuotePollingSnapshot;
  refreshMintQuote(mintUrl: string, method: MintMethod, quoteId: string): Promise<MintQuote>;
  refreshMintQuoteById(identity: QuoteIdentity): Promise<MintQuote>;
  requireMintQuoteForPrepare(mintUrl: string, method: MintMethod, quoteId: string, expectedUnit?: string): Promise<MintQuote>;
  requireMintQuoteRefForPrepare(ref: MintQuoteRef): Promise<MintQuote>;
  loadMintQuoteSnapshotForOperation(op: InitMintOperation): Promise<MintMethodQuoteSnapshot>;
  importMintQuote<M extends MintMethod>(mintUrl: string, method: M, quote: MintMethodQuoteImportSnapshot<M>): Promise<MintQuote<M>>;
  private normalizeImportedMintQuoteSnapshot;
  private resolveAndPersistMintQuoteSnapshot;
  private mintQuoteFromSnapshot;
  private resolveAndPersistMintQuoteObservation;
  private resolveAndPersistMintQuoteObservationUnderLock;
  private warnForIgnoredMintQuoteObservation;
  recordMintQuoteSnapshot(mintUrl: string, method: MintMethod, snapshot: MintMethodQuoteSnapshot): Promise<MintQuote>;
  recordMintQuoteObservation(operation: PendingOrLaterOperation, state: MintMethodRemoteState, observedAt?: number): Promise<MintQuote>;
  createMeltQuote<M extends MeltMethod>(mintUrl: string, method: M, methodData: MeltMethodInputData<M>, unit?: string): Promise<MeltQuote<M>>;
  getMeltQuote(mintUrl: string, method: MeltMethod, quoteId: string): Promise<MeltQuote | null>;
  getMeltQuoteById(identity: QuoteIdentity): Promise<MeltQuote | null>;
  getPendingMeltQuotes(method?: MeltMethod): Promise<MeltQuote[]>;
  refreshMeltQuote(mintUrl: string, method: MeltMethod, quoteId: string): Promise<MeltQuote>;
  refreshMeltQuoteById(identity: QuoteIdentity): Promise<MeltQuote>;
  requireMeltQuoteForPrepare(mintUrl: string, method: MeltMethod, quoteId: string, expectedUnit?: string): Promise<MeltQuote>;
  requireMeltQuoteRefForPrepare(ref: MeltQuoteRef): Promise<MeltQuote>;
  loadMeltQuoteSnapshotForOperation(op: InitMeltOperation): Promise<MeltMethodQuoteSnapshot>;
  /**
   * Records a canonical melt quote observation and emits `melt-quote:updated` only when storage
   * changed meaningfully.
   */
  recordMeltQuoteObservation(canonicalQuote: MeltQuote): Promise<MeltQuote>;
  private resolveAndPersistMeltQuoteObservation;
  private persistCanonicalMintQuote;
  private emitMintQuoteUpdatedIfNeeded;
  private persistCanonicalMeltQuote;
  private emitMeltQuoteUpdatedIfNeeded;
  private assertMintQuoteCapabilities;
  private assertMintQuoteCanPrepare;
  private assertMeltQuoteCanPrepare;
  private ensureMintQuoteRecordForOperation;
}
//#endregion
//#region operations/mint/MintOperationService.d.ts
interface ClaimMintQuoteOptions {
  autoClaimRemaining?: boolean;
}
/**
 * MintOperationService orchestrates mint quote redemption as a crash-safe saga.
 */
declare class MintOperationService {
  private readonly handlerProvider;
  private readonly mintOperationRepository;
  private readonly quoteLifecycle;
  private readonly proofRepository;
  private readonly proofService;
  private readonly mintService;
  private readonly walletService;
  private readonly mintAdapter;
  private readonly eventBus;
  private readonly logger?;
  private readonly operationIdLock;
  private recoveryLock;
  private readonly mintScopedLock;
  constructor(handlerProvider: MintHandlerProvider, mintOperationRepository: MintOperationRepository, quoteLifecycle: QuoteLifecycle, proofRepository: ProofRepository, proofService: ProofService, mintService: MintService, walletService: WalletService, mintAdapter: MintAdapter, eventBus: EventBus<CoreEvents>, logger?: Logger, mintScopedLock?: MintScopedLock);
  private buildDeps;
  private acquireOperationLock;
  private acquireOperationLockAfterWait;
  isOperationLocked(operationId: string): boolean;
  isRecoveryInProgress(): boolean;
  private createInitOperation;
  private resolveMintQuoteForOperationCreation;
  prepare(quoteRef: MintQuoteRef, requestedAmount: Amount): Promise<PendingMintOperation>;
  private prepareInitOperation;
  execute(operationId: string): Promise<MintOperation>;
  private executeReadyOperation;
  finalize(operationId: string): Promise<MintOperation>;
  recoverPendingOperations(): Promise<void>;
  recoverExecutingOperation(op: ExecutingMintOperation, options?: {
    skipLock?: boolean;
  }): Promise<void>;
  getOperation(operationId: string): Promise<MintOperation | null>;
  getOperationByQuote(mintUrl: string, method: MintMethod, quoteId: string): Promise<MintOperation | null>;
  getOperationsForQuote(mintUrl: string, method: MintMethod, quoteId: string): Promise<MintOperation[]>;
  listOperationsByQuote(mintUrl: string, quoteId: string): Promise<MintOperation[]>;
  claimMintQuote(mintUrl: string, method: MintMethod, quoteId: string, options?: ClaimMintQuoteOptions): Promise<MintOperation[]>;
  claimPendingMintQuotes(options?: ClaimMintQuoteOptions): Promise<MintOperation[]>;
  /** @internal Used by background schedulers to assess a canonical quote with local operation facts. */
  getMintQuoteClaimability(mintUrl: string, method: MintMethod, quoteId: string, options?: {
    requestedAmount?: Amount;
    targetOperationId?: string;
  }): Promise<MintQuoteClaimabilityAssessment | undefined>;
  private claimPendingQuoteOperation;
  private createAutoClaimOperation;
  private assessQuoteClaimability;
  private getLocalClaimabilityFacts;
  private quoteLockKey;
  getInFlightOperations(): Promise<MintOperation[]>;
  private recoverInitOperation;
  getPendingOperations(): Promise<PendingMintOperation[]>;
  private tryRecoverInitOperation;
  private tryRecoverExecutingOperation;
  private ensureOutputsSaved;
  private finalizeIssuedOperation;
  private failOperation;
  private transitionToPending;
  observePendingOperation(operationId: string): Promise<PendingMintCheckResult>;
  checkPendingOperation(operationId: string): Promise<PendingMintCheckResult>;
  private failPendingOperation;
  private hasSavedOutputs;
}
//#endregion
//#region models/Keypair.d.ts
type KeypairPurpose = 'p2pk' | 'nut20_mint_quote';
type Keypair = {
  publicKeyHex: string;
  secretKey: Uint8Array;
  derivationIndex?: number;
  purpose?: KeypairPurpose;
};
//#endregion
//#region services/KeyRingService.d.ts
declare class KeyRingService {
  private static readonly DERIVATION_PURPOSES;
  private readonly logger?;
  private readonly keyRingRepository;
  private readonly seedService;
  constructor(keyRingRepository: KeyRingRepository, seedService: SeedService, logger?: Logger);
  generateNewKeyPair(): Promise<{
    publicKeyHex: string;
  }>;
  generateNewKeyPair(options: {
    dumpSecretKey: true;
  }): Promise<Keypair>;
  generateNewKeyPair(options: {
    dumpSecretKey: false;
  }): Promise<{
    publicKeyHex: string;
  }>;
  generateMintQuoteKeyPair(): Promise<Keypair>;
  private generateKeyPairForPurpose;
  addKeyPair(secretKey: Uint8Array): Promise<Keypair>;
  removeKeyPair(publicKey: string): Promise<void>;
  getKeyPair(publicKey: string): Promise<Keypair | null>;
  getMintQuoteKeyPair(publicKey: string): Promise<Keypair | null>;
  getLatestKeyPair(): Promise<Keypair | null>;
  getAllKeyPairs(): Promise<Keypair[]>;
  signProof(proof: Proof, publicKey: string): Promise<Proof>;
  /**
   * Converts a secret key to its corresponding public key in SEC1 compressed format.
   * Note: schnorr.getPublicKey() returns a 32-byte x-only public key (BIP340).
   * We prepend '02' to create a 33-byte SEC1 compressed format as expected by Cashu.
   */
  private getPublicKeyHex;
  private getCompressedPublicKeyHex;
}
//#endregion
//#region models/Error.d.ts
declare class UnknownMintError extends Error {
  constructor(message: string);
}
declare class MintFetchError extends Error {
  readonly mintUrl: string;
  constructor(mintUrl: string, message?: string, cause?: unknown);
}
declare class KeysetSyncError extends Error {
  readonly mintUrl: string;
  readonly keysetId: string;
  constructor(mintUrl: string, keysetId: string, message?: string, cause?: unknown);
}
declare class ProofValidationError extends Error {
  constructor(message: string);
}
declare class MintQuoteValidationError extends Error {
  constructor(message: string, cause?: unknown);
}
declare class MintQuoteKeyError extends Error {
  constructor(message: string, cause?: unknown);
}
declare class DerivationIndexExhaustedError extends Error {
  readonly purpose: KeypairPurpose;
  constructor(purpose: KeypairPurpose);
}
declare class UnitValidationError extends Error {
  constructor(message: string);
}
declare class UnitMismatchError extends UnitValidationError {
  constructor(message: string);
}
declare class TokenValidationError extends Error {
  constructor(message: string, cause?: unknown);
}
declare class ProofOperationError extends Error {
  readonly mintUrl: string;
  readonly keysetId?: string;
  constructor(mintUrl: string, message?: string, keysetId?: string, cause?: unknown);
}
/**
 * This error is thrown when a payment request is invalid or cannot be processed.
 */
declare class PaymentRequestError extends Error {
  constructor(message: string, cause?: unknown);
}
/**
 * This error is thrown when attempting to modify an operation that is already in progress.
 */
declare class OperationInProgressError extends Error {
  readonly operationId: string;
  constructor(operationId: string);
}
declare class AuthSessionError extends Error {
  readonly mintUrl: string;
  constructor(mintUrl: string, message?: string, cause?: unknown);
}
declare class AuthSessionExpiredError extends AuthSessionError {
  constructor(mintUrl: string);
}
declare class QuoteIdentityConflictError extends Error {
  readonly kind: 'mint' | 'melt';
  readonly mintUrl: string;
  readonly quoteId: string;
  readonly methods: readonly string[];
  constructor(kind: 'mint' | 'melt', mintUrl: string, quoteId: string, methods: readonly string[], message?: string);
}
//#endregion
//#region services/AuthSessionService.d.ts
declare class AuthSessionService {
  private readonly repo;
  private readonly eventBus;
  private readonly logger?;
  constructor(repo: AuthSessionRepository, eventBus: EventBus<CoreEvents>, logger?: Logger);
  /** Get a valid (non-expired) session; throws if missing or expired. */
  getValidSession(mintUrl: string): Promise<AuthSession>;
  /** Save OIDC tokens as a session. */
  saveSession(mintUrl: string, tokens: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  }, batPool?: Proof[]): Promise<AuthSession>;
  /** Update only the BAT pool of an existing session (no expiry recalculation, no event). */
  updateBatPool(mintUrl: string, batPool?: Proof[]): Promise<void>;
  /** Delete (logout) a session. */
  deleteSession(mintUrl: string): Promise<void>;
  /** Notify listeners that auth state changed (e.g. after restore) */
  emitUpdated(mintUrl: string): Promise<void>;
  /** Get session without expiry check; returns null if missing. */
  getSession(mintUrl: string): Promise<AuthSession | null>;
  /** Check whether a valid (non-expired) session exists for the given mint. */
  hasSession(mintUrl: string): Promise<boolean>;
}
//#endregion
//#region services/AuthService.d.ts
/**
 * Core service for NUT-21/22 authentication.
 *
 * Orchestrates cashu-ts AuthManager (CAT/BAT lifecycle) and
 * AuthSessionService (token persistence) so callers only need
 * `mgr.auth.*` to authenticate with mints.
 */
declare class AuthService {
  private readonly authSessionService;
  private readonly mintAdapter;
  private readonly logger?;
  /** Per-mint AuthManager (always present after login/restore). */
  private readonly managers;
  /** Per-mint PersistingProvider wrapper (returned by getAuthProvider). */
  private readonly providers;
  /** Per-mint OIDCAuth (present when refresh_token is available). */
  private readonly oidcClients;
  constructor(authSessionService: AuthSessionService, mintAdapter: MintAdapter, logger?: Logger | undefined);
  /**
   * Start an OIDC Device Code authorization flow for a mint.
   *
   * Returns the device-code fields (verification_uri, user_code, etc.)
   * plus a `poll()` helper that resolves once the user authorizes.
   * After `poll()` succeeds the session is persisted and the
   * AuthProvider is wired into MintAdapter automatically.
   */
  startDeviceAuth(mintUrl: string): Promise<{
    verification_uri: string;
    verification_uri_complete: string | undefined;
    user_code: string; /** Poll until the user authorizes; resolves with the OIDC tokens. */
    poll: () => Promise<TokenResponse>; /** Cancel the pending device-code poll. */
    cancel: () => void;
  }>;
  /**
   * Save OIDC tokens as an auth session and wire the AuthProvider.
   *
   * Use this when the caller already obtained tokens externally
   * (e.g. via Authorization Code + PKCE or password grant).
   */
  login(mintUrl: string, tokens: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  }): Promise<AuthSession>;
  /**
   * Restore a persisted auth session and wire the AuthProvider.
   *
   * Call this on app startup for each mint that has a stored session.
   * Returns true if a session was found and restored.
   *
   * If the CAT is expired but a refreshToken exists, OIDC is attached
   * so cashu-ts can automatically refresh the CAT on the next request.
   */
  restore(mintUrl: string): Promise<boolean>;
  /** Delete the auth session and disconnect the AuthProvider. */
  logout(mintUrl: string): Promise<void>;
  /** Get a valid (non-expired) session; throws if missing or expired. */
  getSession(mintUrl: string): Promise<AuthSession>;
  /** Check whether a session exists for the given mint. */
  hasSession(mintUrl: string): Promise<boolean>;
  /** Get the AuthProvider for a mint, or undefined if not authenticated. */
  getAuthProvider(mintUrl: string): AuthProvider | undefined;
  /** Get the current BAT pool size for a mint, or 0 if not authenticated. */
  getPoolSize(mintUrl: string): number;
  /**
   * Create an OIDCAuth instance from the mint's NUT-21 metadata,
   * attach it to the AuthManager for automatic CAT refresh, and
   * register the onTokens callback for persistence.
   */
  private attachOIDC;
  /**
   * Wrap an AuthManager so that every BAT consumption/topUp automatically
   * persists the updated pool to the session store.
   */
  private createPersistingProvider;
  private persistPool;
  private saveSessionWithPool;
}
//#endregion
//#region services/HistoryService.d.ts
declare class HistoryService {
  private readonly historyRepository;
  private readonly logger?;
  private readonly eventBus;
  constructor(historyRepository: HistoryProjectionRepository, eventBus: EventBus<CoreEvents>, logger?: Logger);
  getPaginatedHistory(offset?: number, limit?: number): Promise<HistoryEntry[]>;
  getHistoryEntryById(id: string): Promise<HistoryEntry | null>;
  /**
   * Get the operationId for a send history entry.
   * @throws Error if entry not found, is not a send entry, or has no operation id
   */
  getOperationIdFromHistoryEntry(historyId: string): Promise<string>;
  private emitProjectedSend;
  private emitProjectedMelt;
  private emitProjectedMint;
  private emitProjectedReceive;
  private emitProjectedEntry;
  private withSendToken;
}
//#endregion
//#region operations/send/SendOperationService.d.ts
/**
 * Options applied when a prepared send operation is executed.
 */
interface ExecuteSendOptions {
  /** Optional memo to persist on the shareable token. Whitespace-only memos are ignored. */
  memo?: string;
}
/**
 * Service that manages send operations as sagas.
 *
 * This service provides crash recovery and rollback capabilities for send operations
 * by breaking them into discrete steps: init → prepare → execute → finalize/rollback.
 */
declare class SendOperationService {
  private readonly sendOperationRepository;
  private readonly proofRepository;
  private readonly proofService;
  private readonly mintService;
  private readonly walletService;
  private readonly eventBus;
  private readonly handlerProvider;
  private readonly logger?;
  /** In-memory lock to prevent concurrent operations on the same operation ID */
  private readonly operationIdLock;
  /** Lock for the global recovery process */
  private recoveryLock;
  /** In-memory lock to serialize proof selection/reservation per mint */
  private readonly mintScopedLock;
  constructor(sendOperationRepository: SendOperationRepository, proofRepository: ProofRepository, proofService: ProofService, mintService: MintService, walletService: WalletService, eventBus: EventBus<CoreEvents>, handlerProvider: SendHandlerProvider, logger?: Logger, mintScopedLock?: MintScopedLock);
  private buildDeps;
  /**
   * Acquire a lock for an operation.
   * Returns a release function that must be called when the operation completes.
   * Throws if the operation is already locked.
   */
  private acquireOperationLock;
  /**
   * Check if an operation is currently locked.
   */
  isOperationLocked(operationId: string): boolean;
  /**
   * Check if recovery is currently in progress.
   */
  isRecoveryInProgress(): boolean;
  /**
   * Create a new send operation.
   * This is the entry point for the saga.
   */
  init<M extends SendMethod = 'default'>(mintUrl: string, amount: UnitAmount, options?: CreateSendOperationOptions<M>): Promise<InitSendOperation>;
  /**
   * Prepare the operation by reserving proofs and creating outputs.
   * After this step, the operation can be executed or rolled back.
   *
   * If preparation fails, automatically attempts to recover the init operation.
   * Throws if the operation is already in progress.
   *
   * Delegates to the appropriate handler based on the operation method.
   */
  prepare(operation: InitSendOperation): Promise<PreparedSendOperation>;
  /**
   * Execute the prepared operation.
   * Performs the swap (if needed) and creates the token.
   * If a memo is provided, trims it and persists it on the token before saving the
   * pending operation. Whitespace-only memos are omitted.
   *
   * If execution fails after transitioning to 'executing' state,
   * automatically attempts to recover the operation.
   * Throws if the operation is already in progress.
   *
   * Delegates to the appropriate handler based on the operation method.
   */
  execute(operation: PreparedSendOperation, options?: ExecuteSendOptions): Promise<{
    operation: PendingSendOperation;
    token: Token;
  }>;
  /**
   * High-level send method that orchestrates init → prepare → execute.
   * This is the main entry point for consumers.
   */
  send(mintUrl: string, amount: UnitAmount): Promise<Token>;
  /**
   * Finalize a pending operation after its proofs have been spent.
   * This method is idempotent - calling it on an already finalized operation is a no-op.
   * If the operation was rolled back, finalization is skipped (rollback takes precedence).
   * Throws if the operation is already in progress.
   */
  finalize(operationId: string): Promise<void>;
  /**
   * Rollback an operation by reclaiming the proofs.
   * Only works for operations in 'prepared' or 'pending' state.
   * Throws if the operation is already in progress.
   */
  rollback(operationId: string, reason?: string): Promise<void>;
  /**
   * Recover pending operations on startup.
   * This should be called during initialization.
   * Throws if recovery is already in progress.
   */
  recoverPendingOperations(): Promise<void>;
  /**
   * Clean up a failed init operation.
   * Releases any orphaned proof reservations and deletes the operation.
   */
  private recoverInitOperation;
  /**
   * Attempts to recover an init operation, swallowing recovery errors.
   * If recovery fails, logs warning and leaves for startup recovery.
   */
  private tryRecoverInitOperation;
  /**
   * Recover an executing operation.
   * Delegates to the handler for recovery logic.
   */
  private recoverExecutingOperation;
  /**
   * Attempts to recover an executing operation, swallowing recovery errors.
   * If recovery fails (e.g., mint unreachable), logs warning and leaves
   * for startup recovery.
   */
  private tryRecoverExecutingOperation;
  /**
   * Check a pending operation to see if it should be finalized.
   */
  checkPendingOperation(op: PendingSendOperation): Promise<void>;
  private defaultCheckPendingDecision;
  /**
   * Check proof states with the mint.
   */
  private checkProofStatesWithMint;
  /**
   * Mark an operation as rolled back with an error message.
   */
  private markAsRolledBack;
  /**
   * Clean up orphaned proof reservations.
   * Finds proofs that are reserved but point to non-existent or terminal operations.
   */
  private cleanupOrphanedReservations;
  private normalizeMemo;
  private applyTokenMemo;
  /**
   * Get an operation by ID.
   */
  getOperation(operationId: string): Promise<SendOperation | null>;
  /**
   * Get all pending operations.
   */
  getPendingOperations(): Promise<SendOperation[]>;
  /**
   * Get all prepared operations.
   */
  getPreparedOperations(): Promise<PreparedSendOperation[]>;
}
//#endregion
//#region services/PaymentRequestService.d.ts
type InbandPaymentRequestTransport = {
  type: 'inband';
};
type HttpPaymentRequestTransport = {
  type: 'http';
  url: string;
};
type NostrPaymentRequestTransport = {
  type: 'nostr';
  target: string;
  tags?: string[][];
};
type PaymentRequestTransport$1 = InbandPaymentRequestTransport | HttpPaymentRequestTransport | NostrPaymentRequestTransport;
/**
 * A NUT-18 payment request spending condition that was successfully normalized
 * as a NUT-11 P2PK lock by cashu-ts.
 */
type PaymentRequestP2pkRequirement = {
  /** The supported NUT-10 spending condition kind. */kind: 'P2PK'; /** Normalized NUT-11 P2PK options used when preparing locked outputs. */
  options: P2pkSendOptions; /** Original NUT-10 option carried by the payment request. */
  rawNut10: NUT10Option;
};
/**
 * Diagnostic for a payment request that carries a NUT-10 kind Coco cannot pay
 * yet. Parse returns this value with no payable mints; prepare rejects before
 * initializing a send operation.
 */
type PaymentRequestUnsupportedSpendingCondition = {
  kind: 'unsupported'; /** Unsupported NUT-10 kind, for example HTLC. */
  nut10Kind: string; /** Human-readable reason suitable for surfacing to callers. */
  reason: string; /** Original NUT-10 option carried by the payment request. */
  rawNut10: NUT10Option;
};
/**
 * Diagnostic for a payment request whose NUT-10 option is present but cannot
 * be normalized by cashu-ts. Parse returns this value with no payable mints;
 * prepare rejects before initializing a send operation.
 */
type PaymentRequestMalformedSpendingCondition = {
  kind: 'malformed'; /** NUT-10 kind that failed normalization. */
  nut10Kind: string; /** Human-readable normalization failure reason. */
  reason: string; /** Original malformed NUT-10 option carried by the payment request. */
  rawNut10: NUT10Option;
};
/**
 * Spending-condition requirement or diagnostic exposed on resolved payment
 * requests. Absence means the request has no NUT-10 spending condition.
 */
type PaymentRequestSpendingConditionRequirement = {
  kind: 'P2PK'; /** Normalized P2PK requirement that prepare will encode into outputs. */
  p2pk: PaymentRequestP2pkRequirement;
} | PaymentRequestUnsupportedSpendingCondition | PaymentRequestMalformedSpendingCondition;
type ResolvedPaymentRequest = {
  paymentRequest: PaymentRequest;
  payableMints: string[];
  allowedMints: string[];
  amount?: Amount;
  unit: string;
  transport: PaymentRequestTransport$1;
  spendingCondition?: PaymentRequestSpendingConditionRequirement;
};
type PreparedPaymentRequest = {
  sendOperation: PreparedSendOperation;
  request: ResolvedPaymentRequest;
};
type InbandPaymentRequestExecutionResult = {
  type: 'inband';
  token: Token;
  operation: PendingSendOperation;
  request: ResolvedPaymentRequest;
};
type HttpPaymentRequestExecutionResult = {
  type: 'http';
  response: Response;
  operation: PendingSendOperation;
  request: ResolvedPaymentRequest;
};
type PaymentRequestExecutionResult = InbandPaymentRequestExecutionResult | HttpPaymentRequestExecutionResult;
declare class PaymentRequestService {
  private readonly sendOperationService;
  private readonly proofService;
  private readonly mintService;
  private readonly logger?;
  constructor(sendOperationService: SendOperationService, proofService: ProofService, mintService: MintService, logger?: Logger);
  /**
   * Parse and validate a payment request.
   * @param paymentRequest - The payment request to process
   * @returns The resolved payment request
   */
  parse(paymentRequest: string): Promise<ResolvedPaymentRequest>;
  /**
   * Prepare a payment request for execution.
   */
  prepare(request: ResolvedPaymentRequest, options: {
    mintUrl: string;
    amount?: UnitAmount;
  }): Promise<PreparedPaymentRequest>;
  /**
   * Execute a prepared payment request.
   */
  execute(transaction: PreparedPaymentRequest): Promise<PaymentRequestExecutionResult>;
  private readPaymentRequest;
  private validateMint;
  private getPaymentRequestTransport;
  private findMatchingMints;
  private resolveSpendingCondition;
  private getNut10Kind;
  private resolveSendOptions;
  private normalizeP2pkOptionsForPrepare;
  private requireP2pkOnlyOptions;
  private throwMalformedSpendingCondition;
  private validateAmount;
  private resolvePreparedRequest;
}
//#endregion
//#region operations/receive/ReceiveOperation.d.ts
/**
 * State machine for receive operations:
 *
 * init ──► prepared ──► executing ──► finalized
 *   │         │            │
 *   └─────────┴────────────┴──► rolled_back
 *
 * - init: Operation created, token decoded/validated
 * - prepared: Fees calculated, outputs created, ready to execute
 * - executing: Receive in progress (mint interaction)
 * - finalized: Proofs saved, operation complete
 * - rolled_back: Operation failed or aborted before completion
 */
type ReceiveOperationState = 'init' | 'prepared' | 'executing' | 'finalized' | 'rolled_back';
type ReceiveOperationSource = {
  type: 'manual-token';
} | {
  type: 'payment-request';
  requestOperationId: string;
  requestId?: string;
  attemptId: string;
  transport: 'inband' | 'nostr' | 'post';
  transportMessageId?: string;
  senderPubkey?: string;
  memo?: string;
};
/**
 * Base fields present in all receive operations
 */
interface ReceiveOperationBase {
  /** Unique identifier for this operation */
  id: string;
  /** The mint URL for this operation */
  mintUrl: string;
  /** Unit declared by the received token */
  unit: string;
  /** The amount received (sum of input proofs) */
  amount: Amount;
  /** Proofs contained in the received token (prepared for receiving) */
  inputProofs: Proof[];
  /** Timestamp when the operation was created */
  createdAt: number;
  /** Timestamp when the operation was last updated */
  updatedAt: number;
  /** Error message if the operation failed */
  error?: string;
  /** Optional origin metadata for receives created by higher-level sagas. */
  source?: ReceiveOperationSource;
}
/**
 * Data set during the prepare phase
 */
interface PreparedData$1 {
  /** Fees charged for the receive operation */
  fee: Amount;
  /** Serialized OutputData for deterministic receive outputs */
  outputData: SerializedOutputData;
}
/**
 * Initial state - operation just created, token decoded
 */
interface InitReceiveOperation extends ReceiveOperationBase {
  state: 'init';
}
/**
 * Prepared state - outputs created, ready to execute
 */
interface PreparedReceiveOperation extends ReceiveOperationBase, PreparedData$1 {
  state: 'prepared';
}
/**
 * Executing state - receive in progress
 */
interface ExecutingReceiveOperation extends ReceiveOperationBase, PreparedData$1 {
  state: 'executing';
}
/**
 * Finalized state - proofs saved, operation complete
 */
interface FinalizedReceiveOperation extends ReceiveOperationBase, PreparedData$1 {
  state: 'finalized';
}
/**
 * Rolled back state - operation failed or aborted
 */
interface RolledBackReceiveOperation extends ReceiveOperationBase, PreparedData$1 {
  state: 'rolled_back';
}
/**
 * Discriminated union of all receive operation states.
 */
type ReceiveOperation = InitReceiveOperation | PreparedReceiveOperation | ExecutingReceiveOperation | FinalizedReceiveOperation | RolledBackReceiveOperation;
/**
 * Terminal states - operation is finished
 */
type TerminalReceiveOperation = FinalizedReceiveOperation | RolledBackReceiveOperation;
//#endregion
//#region services/TokenService.d.ts
declare class TokenService {
  private readonly mintService;
  private readonly logger?;
  constructor(mintService: MintService, logger?: Logger);
  /** Decode a token into a Token object using the mint's keysets for decoding.
   * @param token - The token to decode (can be a string or already decoded Token object)
   * @param mintUrl - The URL of the mint to use for fetching keysets for decoding
   * @returns The decoded Token object with proofs decoded using the mint's keysets
   */
  decodeToken(token: Token | string, mintUrl: string, expectedUnit?: string): Promise<Token>;
  private resolveTokenUnit;
}
//#endregion
//#region operations/receive/ReceiveOperationService.d.ts
/**
 * Service that manages receive operations as sagas.
 *
 * This service provides crash recovery and rollback capabilities for receive operations
 * By breaking them into discrete step:  init → prepare → execute → finalized
 * rolledback for failure state
 */
declare class ReceiveOperationService {
  private readonly receiveOperationRepository;
  private readonly proofRepository;
  private readonly proofService;
  private readonly mintService;
  private readonly walletService;
  private readonly mintAdapter;
  private readonly tokenService;
  private readonly eventBus;
  private readonly logger?;
  /** In-memory lock to prevent concurrent operations on the same operation ID */
  private readonly operationIdLock;
  /** Lock for the global recovery process */
  private recoveryLock;
  /** In-memory lock to serialize deterministic-output derivation (counter) per mint */
  private readonly mintScopedLock;
  constructor(receiveOperationRepository: ReceiveOperationRepository, proofRepository: ProofRepository, proofService: ProofService, mintService: MintService, walletService: WalletService, mintAdapter: MintAdapter, tokenService: TokenService, eventBus: EventBus<CoreEvents>, logger?: Logger, mintScopedLock?: MintScopedLock);
  /**
   * Acquire an in-memory lock for a specific operation to prevent concurrency races.
   * Returns a release function that must be called in a finally block.
   * Throws if the operation is already locked.
   */
  private acquireOperationLock;
  /** Check if an operation is currently locked (for concurrency control). */
  isOperationLocked(operationId: string): boolean;
  /** Check if a recovery sweep is in progress. */
  isRecoveryInProgress(): boolean;
  /**
   * Create a new receive operation by decoding and validating the token.
   * Persists the init state so recovery can reason about this operation.
   */
  init(token: Token | string, source?: ReceiveOperationSource): Promise<InitReceiveOperation>;
  /**
   * Prepare the operation by calculating fees and creating deterministic outputs.
   * Transitions init -> prepared and stores outputData for crash recovery.
   */
  prepare(operation: InitReceiveOperation): Promise<PreparedReceiveOperation>;
  /** Internal prepare logic used by prepare(), separated for error handling. */
  private prepareInternal;
  /**
   * Execute the prepared operation.
   * Marks executing before mint interaction to ensure crash-safe recovery.
   */
  execute(operation: PreparedReceiveOperation): Promise<FinalizedReceiveOperation>;
  /** Internal execute logic used by execute(), separated for error handling. */
  private executeInternal;
  /**
   * High-level receive method that orchestrates init → prepare → execute.
   * This is the primary entry point used by WalletApi.
   */
  receive(token: Token | string): Promise<void>;
  /**
   * Finalize an executing operation (idempotent).
   * Used by recovery when outputs are already saved.
   */
  finalize(operationId: string): Promise<void>;
  /**
   * Recover pending operations on startup.
   * Handles init cleanup, logs stale prepared operations, and recovers executing operations.
   */
  recoverPendingOperations(): Promise<void>;
  /** Cleanup for failed init operations with no external side effects. */
  private recoverInitOperation;
  /** Init recovery when prepare fails. */
  private tryRecoverInitOperation;
  /**
   * Recover an executing operation by checking mint state and restoring outputs.
   * Uses outputData to recover proofs if inputs were spent at the mint.
   */
  recoverExecutingOperation(op: ExecutingReceiveOperation, options?: {
    skipLock?: boolean;
  }): Promise<void>;
  /** Best-effort executing recovery used when execute fails. */
  private tryRecoverExecutingOperation;
  private getRollbackReasonForReceiveFailure;
  private checkProofStatesWithMint;
  /**
   * Persist finalized state and emit the operation finalized event.
   */
  private markAsFinalized;
  /**
   * Persist rolled back state with error context.
   */
  private markAsRolledBack;
  /**
   * Check if any output proofs already exist locally.
   * Used to avoid unnecessary recovery work.
   */
  private hasSavedOutputs;
  /** Extract and normalize mint URL from token, with validation. */
  private extractMintUrl;
  /**
   * Get an operation by ID.
   */
  getOperation(operationId: string): Promise<ReceiveOperation | null>;
  /**
   * Get all pending operations.
   */
  getPendingOperations(): Promise<ReceiveOperation[]>;
  /**
   * Get all prepared operations.
   */
  getPreparedOperations(): Promise<PreparedReceiveOperation[]>;
  /**
   * Rollback a receive operation.
   * Only allowed for operations in 'init' or 'prepared' state.
   */
  rollback(operationId: string, reason?: string): Promise<void>;
}
//#endregion
//#region operations/paymentRequestReceive/PaymentRequestReceiveOperation.d.ts
type PaymentRequestReceiveState = 'active' | 'completed' | 'cancelled';
type PaymentRequestReceiveAttemptState = 'received' | 'validating' | 'receiving' | 'finalized' | 'rejected';
type PaymentRequestReceiveTransport = 'inband' | 'nostr' | 'post';
type PaymentRequestReceiveSource = {
  transport: PaymentRequestReceiveTransport;
  transportMessageId?: string;
  senderPubkey?: string;
};
interface PaymentRequestReceiveOperation {
  id: string;
  requestId?: string;
  encodedRequest: string;
  state: PaymentRequestReceiveState;
  transport: PaymentRequestReceiveTransport;
  amount: Amount;
  unit: string;
  mints: string[];
  singleUse: boolean;
  description?: string;
  createdAt: number;
  updatedAt: number;
  error?: string;
  completedAt?: number;
}
interface PaymentRequestReceiveAttempt {
  id: string;
  requestOperationId: string;
  requestId?: string;
  transport: PaymentRequestReceiveTransport;
  transportMessageId?: string;
  payloadHash: string;
  senderPubkey?: string;
  memo?: string;
  mintUrl: string;
  unit: string;
  grossAmount: Amount;
  fee?: Amount;
  netAmount?: Amount;
  receiveOperationId?: string;
  state: PaymentRequestReceiveAttemptState;
  error?: string;
  payload?: PaymentRequestPayload;
  createdAt: number;
  updatedAt: number;
}
type ParsedPaymentRequestPayload = {
  id?: string;
  memo?: string;
  mint: string;
  unit: string;
  proofs: Proof[];
};
//#endregion
//#region infra/handlers/paymentRequestReceive/PaymentRequestReceiveTransportHandlerProvider.d.ts
interface PaymentRequestReceiveTransportCreateInput {
  requestId: string;
  amount: Amount;
  unit: string;
  mints: string[];
  description?: string;
  singleUse: boolean;
}
interface PaymentRequestReceiveTransportHandler {
  readonly type: Exclude<PaymentRequestReceiveTransport, 'inband'>;
  createRequestTransport?(input: PaymentRequestReceiveTransportCreateInput): Promise<PaymentRequestTransport> | PaymentRequestTransport;
  activate(operation: PaymentRequestReceiveOperation): Promise<void> | void;
  deactivate(operation: PaymentRequestReceiveOperation): Promise<void> | void;
}
/**
 * Runtime registry for incoming payment request transport handlers.
 * Keeps transport wiring concerns out of the receive saga.
 */
declare class PaymentRequestReceiveTransportHandlerProvider {
  private readonly registry;
  register(handler: PaymentRequestReceiveTransportHandler): () => void;
  get(type: Exclude<PaymentRequestReceiveTransport, 'inband'>): PaymentRequestReceiveTransportHandler;
  getOptional(type: Exclude<PaymentRequestReceiveTransport, 'inband'>): PaymentRequestReceiveTransportHandler | undefined;
}
//#endregion
//#region services/PaymentRequestReceiveService.d.ts
type CashuPaymentRequestTransportInput = PaymentRequestTransport | {
  type: 'nostr' | 'post' | PaymentRequestTransportType;
  target: string;
  tags?: string[][];
};
type PaymentRequestReceiveTransportInput = PaymentRequestReceiveTransport | {
  type: 'inband';
} | CashuPaymentRequestTransportInput;
interface CreatePaymentRequestReceiveInput {
  amount: UnitAmountLike;
  unit?: string;
  mints?: string[];
  requestId?: string;
  description?: string;
  singleUse?: boolean;
  transport?: PaymentRequestReceiveTransportInput;
  encoding?: 'creqA' | 'creqB';
  nut10?: NUT10Option;
}
interface PaymentRequestReceiveClaimResult {
  operation: PaymentRequestReceiveOperation;
  attempt: PaymentRequestReceiveAttempt;
  receiveOperation?: ReceiveOperation;
}
declare class PaymentRequestReceiveService {
  private readonly operationRepository;
  private readonly attemptRepository;
  private readonly receiveOperationService;
  private readonly receiveOperationRepository;
  private readonly mintService;
  private readonly transportHandlerProvider;
  private readonly logger?;
  private readonly lock;
  constructor(operationRepository: PaymentRequestReceiveOperationRepository, attemptRepository: PaymentRequestReceiveAttemptRepository, receiveOperationService: ReceiveOperationService, receiveOperationRepository: ReceiveOperationRepository, mintService: MintService, transportHandlerProvider: PaymentRequestReceiveTransportHandlerProvider, logger?: Logger | undefined);
  isOperationLocked(operationId: string): boolean;
  registerTransportHandler(handler: PaymentRequestReceiveTransportHandler): () => void;
  private acquireLockWhenAvailable;
  create(input: CreatePaymentRequestReceiveInput): Promise<PaymentRequestReceiveOperation>;
  cancel(operationId: string, reason?: string): Promise<PaymentRequestReceiveOperation>;
  get(operationId: string): Promise<PaymentRequestReceiveOperation | null>;
  list(filter?: {
    state?: PaymentRequestReceiveState;
  }): Promise<PaymentRequestReceiveOperation[]>;
  claimPayload(operationOrId: PaymentRequestReceiveOperation | string, payloadInput: PaymentRequestPayload | string, source?: PaymentRequestReceiveSource): Promise<PaymentRequestReceiveClaimResult>;
  ingestPayload(payloadInput: PaymentRequestPayload | string, source?: PaymentRequestReceiveSource): Promise<PaymentRequestReceiveClaimResult>;
  recoverPendingAttempts(): Promise<void>;
  private recoverActiveTransports;
  private activateTransport;
  private deactivateTransport;
  private recoverFinalizedAttempts;
  private recoverReceivingAttempts;
  private recoverReceivingAttemptLocked;
  private recoverPreChildAttemptLocked;
  private claimPayloadLocked;
  private resolveTransportInput;
  private toReceiveTransport;
  private normalizePaymentRequestTransport;
  private parsePayload;
  private validatePayload;
  private assertSingleUseAvailable;
  private hashPayload;
  private canonicalizePayloadHashValue;
  private updateAttempt;
  private rejectAttempt;
  private dropAttemptForRetryOrReject;
  private shouldDropAttemptForRetry;
  private finalizeAttemptFromReceive;
  private resumePreparedChildReceive;
  private resumeInitChildReceive;
  private completeIfSingleUse;
  private resultForAttempt;
  private resultForStoredAttempt;
  private isInFlightAttempt;
  private requireOperation;
}
//#endregion
//#region services/WalletRestoreService.d.ts
declare class WalletRestoreService {
  private readonly proofService;
  private readonly counterService;
  private readonly walletService;
  private readonly requestProvider;
  private readonly logger?;
  private readonly outputDataCreator?;
  private readonly restoreGapLimit;
  private readonly restoreBatchSize;
  private readonly restoreStartCounter;
  constructor(proofService: ProofService, counterService: CounterService, walletService: WalletService, requestProvider: MintRequestProvider, logger?: Logger, outputDataCreator?: OutputDataCreator);
  sweepKeyset(mintUrl: string, keysetId: string, bip39seed: Uint8Array, unit?: string): Promise<void>;
  /**
   * Restore and persist proofs for a single keyset.
   * Enforces the invariant: restored proofs must be >= previously stored proofs.
   * Throws on any validation or persistence error. No transactions are used here.
   */
  restoreKeyset(mintUrl: string, wallet: Wallet, keysetId: string, unit?: string): Promise<void>;
}
//#endregion
//#region operations/melt/MeltOperationService.d.ts
/**
 * MeltOperationService orchestrates melt sagas while delegating
 * method-specific behavior to MeltMethodHandlers.
 */
declare class MeltOperationService {
  private readonly handlerProvider;
  private readonly meltOperationRepository;
  private readonly quoteLifecycle;
  private readonly proofRepository;
  private readonly proofService;
  private readonly mintService;
  private readonly walletService;
  private readonly mintAdapter;
  private readonly eventBus;
  private readonly logger?;
  private readonly operationIdLock;
  private recoveryLock;
  private readonly mintScopedLock;
  constructor(handlerProvider: MeltHandlerProvider, meltOperationRepository: MeltOperationRepository, quoteLifecycle: QuoteLifecycle, proofRepository: ProofRepository, proofService: ProofService, mintService: MintService, walletService: WalletService, mintAdapter: MintAdapter, eventBus: EventBus<CoreEvents>, logger?: Logger, mintScopedLock?: MintScopedLock);
  private buildDeps;
  private acquireOperationLock;
  isOperationLocked(operationId: string): boolean;
  isRecoveryInProgress(): boolean;
  private resolvePendingSettlementQuote;
  init(mintUrl: string, method: MeltMethod, methodData: MeltMethodInputData, unit?: string, options?: {
    quoteId?: string;
  }): Promise<InitMeltOperation>;
  private createQuoteBoundInitOperation;
  private getTrackedOperationForQuote;
  prepareExistingQuote(quoteRef: MeltQuoteRef, options?: {
    feeIndex?: number;
  }): Promise<PreparedMeltOperation>;
  private methodDataFromMeltQuote;
  /**
   * Prepare the operation by reserving proofs and creating outputs.
   * After this step, the operation can be executed or rolled back.
   *
   * If preparation fails, automatically attempts to recover the init operation.
   * Throws if the operation is already in progress.
   */
  prepare(operationId: string): Promise<PreparedMeltOperation>;
  /**
   * Execute the prepared operation.
   * Performs the melt (swap if needed) and processes the result.
   *
   * If execution fails after transitioning to 'executing' state,
   * automatically attempts to recover the operation.
   * Throws if the operation is already in progress.
   */
  execute(operationId: string): Promise<PendingMeltOperation | FinalizedMeltOperation>;
  finalize(operationId: string, options?: {
    canonicalQuote?: MeltQuote;
  }): Promise<FinalizeResult>;
  rollback(operationId: string, reason?: string, options?: {
    canonicalQuote?: MeltQuote;
  }): Promise<void>;
  /**
   * Recover pending operations on startup.
   * This should be called during initialization.
   * Throws if recovery is already in progress.
   */
  recoverPendingOperations(): Promise<void>;
  checkPendingOperation(operationId: string): Promise<PendingCheckResult>;
  private markAsRolledBack;
  /**
   * Clean up a failed init operation.
   * Releases any orphaned proof reservations and deletes the operation.
   */
  private recoverInitOperation;
  /**
   * Attempts to recover an init operation, swallowing recovery errors.
   * If recovery fails, logs warning and leaves for startup recovery.
   */
  private tryRecoverInitOperation;
  /**
   * Recover an executing operation.
   * Delegates to handler for proof cleanup and state determination.
   * Updates operation state based on handler result (finalized, pending, or failed).
   */
  recoverExecutingOperation(op: ExecutingMeltOperation, options?: {
    skipLock?: boolean;
  }): Promise<void>;
  /**
   * Attempts to recover an executing operation, swallowing recovery errors.
   * If recovery fails (e.g., mint unreachable), logs warning and leaves
   * for startup recovery.
   */
  private tryRecoverExecutingOperation;
  getOperation(operationId: string): Promise<MeltOperation | null>;
  getOperationByQuote(mintUrl: string, method: MeltMethod, quoteId: string): Promise<MeltOperation | null>;
  getOperationByQuoteIdentity(identity: QuoteIdentity): Promise<MeltOperation | null>;
  listOperationsByQuote(mintUrl: string, quoteId: string): Promise<MeltOperation[]>;
  getPendingOperations(): Promise<MeltOperation[]>;
  getPreparedOperations(): Promise<PreparedMeltOperation[]>;
}
//#endregion
//#region events/types.d.ts
interface CoreEvents {
  'mint:added': {
    mint: Mint$1;
    keysets: Keyset[];
  };
  'mint:updated': {
    mint: Mint$1;
    keysets: Keyset[];
  };
  'mint:metadata-refreshed': {
    mintUrl: string;
  };
  'mint:trusted': {
    mintUrl: string;
  };
  'mint:untrusted': {
    mintUrl: string;
  };
  'counter:updated': Counter;
  'proofs:saved': {
    mintUrl: string;
    keysetId: string;
    proofs: CoreProof[];
  };
  'proofs:state-changed': {
    mintUrl: string;
    secrets: string[];
    state: ProofState;
  };
  'proofs:deleted': {
    mintUrl: string;
    secrets: string[];
  };
  'proofs:wiped': {
    mintUrl: string;
    keysetId: string;
  };
  'proofs:reserved': {
    mintUrl: string;
    operationId: string;
    secrets: string[];
    amount: UnitAmount;
  };
  'proofs:released': {
    mintUrl: string;
    secrets: string[];
  };
  /** Emitted when send operation is prepared (proofs reserved) */
  'send:prepared': {
    mintUrl: string;
    operationId: string;
    operation: SendOperation;
  };
  /** Emitted when send operation is executed (token created) */
  'send:pending': {
    mintUrl: string;
    operationId: string;
    operation: SendOperation;
    token: Token;
  };
  /** Emitted when send operation is finalized (proofs confirmed spent) */
  'send:finalized': {
    mintUrl: string;
    operationId: string;
    operation: SendOperation;
  };
  /** Emitted when send operation is rolled back */
  'send:rolled-back': {
    mintUrl: string;
    operationId: string;
    operation: SendOperation;
  };
  /** Emitted when receive operation is prepared */
  'receive-op:prepared': {
    mintUrl: string;
    operationId: string;
    operation: ReceiveOperation;
  };
  /** Emitted when receive operation is finalized */
  'receive-op:finalized': {
    mintUrl: string;
    operationId: string;
    operation: ReceiveOperation;
  };
  /** Emitted when receive operation is rolled back */
  'receive-op:rolled-back': {
    mintUrl: string;
    operationId: string;
    operation: ReceiveOperation;
  };
  'history:updated': {
    mintUrl: string;
    entry: HistoryEntry;
  };
  'melt-op:prepared': {
    mintUrl: string;
    operationId: string;
    operation: MeltOperation;
  };
  'melt-op:pending': {
    mintUrl: string;
    operationId: string;
    operation: MeltOperation;
  };
  'melt-op:finalized': {
    mintUrl: string;
    operationId: string;
    operation: MeltOperation;
  };
  'melt-op:rolled-back': {
    mintUrl: string;
    operationId: string;
    operation: MeltOperation;
  };
  'mint-op:pending': {
    mintUrl: string;
    operationId: string;
    operation: MintOperation;
  };
  'mint-quote:updated': {
    mintUrl: string;
    method: MintMethod;
    quoteId: string;
    quote: MintQuote;
  };
  'melt-quote:updated': {
    mintUrl: string;
    method: MeltMethod;
    quoteId: string;
    quote: MeltQuote;
  };
  'mint-op:requeue': {
    mintUrl: string;
    operationId: string;
    operation: MintOperation;
  };
  'mint-op:executing': {
    mintUrl: string;
    operationId: string;
    operation: MintOperation;
  };
  'mint-op:finalized': {
    mintUrl: string;
    operationId: string;
    operation: FinalizedMintOperation;
  };
  'mint-op:failed': {
    mintUrl: string;
    operationId: string;
    operation: FailedMintOperation;
  };
  'subscriptions:paused': void;
  'subscriptions:resumed': void;
  'auth-session:updated': {
    mintUrl: string;
  };
  'auth-session:deleted': {
    mintUrl: string;
  };
  'auth-session:expired': {
    mintUrl: string;
  };
}
//#endregion
//#region services/CounterService.d.ts
declare class CounterService {
  private readonly counterRepo;
  private readonly eventBus?;
  private readonly logger?;
  constructor(counterRepo: CounterRepository, logger?: Logger, eventBus?: EventBus<CoreEvents>);
  getCounter(mintUrl: string, keysetId: string): Promise<Counter>;
  incrementCounter(mintUrl: string, keysetId: string, n: number): Promise<{
    counter: number;
    mintUrl: string;
    keysetId: string;
  }>;
  overwriteCounter(mintUrl: string, keysetId: string, counter: number): Promise<{
    mintUrl: string;
    keysetId: string;
    counter: number;
  }>;
}
//#endregion
//#region services/ProofService.d.ts
declare class ProofService {
  private readonly counterService;
  private readonly proofRepository;
  private readonly eventBus?;
  private readonly walletService;
  private readonly mintService;
  private readonly keyRingService;
  private readonly seedService;
  private readonly logger?;
  private readonly outputDataCreator;
  constructor(counterService: CounterService, proofRepository: ProofRepository, walletService: WalletService, mintService: MintService, keyRingService: KeyRingService, seedService: SeedService, logger?: Logger, eventBus?: EventBus<CoreEvents>, outputDataCreator?: OutputDataCreator);
  /**
   * Calculates the send amount including receiver fees.
   * This is used when the sender pays fees for the receiver.
   */
  calculateSendAmountWithFees(mintUrl: string, intent: UnitAmount): Promise<Amount>;
  checkInflightProofs(): Promise<void>;
  createOutputsAndIncrementCounters(mintUrl: string, amount: {
    keep: UnitAmount;
    send: UnitAmount;
  }, options?: {
    includeFees?: boolean;
  }): Promise<{
    keep: OutputDataLike[];
    send: OutputDataLike[];
    sendAmount: Amount;
    keepAmount: Amount;
  }>;
  saveProofs(mintUrl: string, proofs: CoreProof[]): Promise<void>;
  getReadyProofs(mintUrl: string, filter?: ProofUnitFilter): Promise<CoreProof[]>;
  getAllReadyProofs(filter?: ProofUnitFilter): Promise<CoreProof[]>;
  /**
   * Gets the total balance for a single mint.
   * @param mintUrl - The URL of the mint
   * @returns The total balance for the mint
   */
  getBalance(mintUrl: string): Promise<Amount>;
  /**
   * Gets the spendable balance for a single mint.
   * @param mintUrl - The URL of the mint
   * @returns The spendable balance for the mint
   */
  getSpendableBalance(mintUrl: string): Promise<Amount>;
  /**
   * Gets the full balance breakdown for a single mint.
   * @param mintUrl - The URL of the mint
   * @returns Balance breakdown with ready, reserved, and total amounts
   */
  getBalanceBreakdown(mintUrl: string): Promise<BalanceBreakdown>;
  /**
   * Gets balances for all mints.
   * @returns An object mapping mint URLs to their total balances
   */
  getBalances(): Promise<{
    [mintUrl: string]: Amount;
  }>;
  /**
   * Gets spendable balances for all mints.
   * @returns An object mapping mint URLs to their spendable balances
   */
  getSpendableBalances(): Promise<{
    [mintUrl: string]: Amount;
  }>;
  /**
   * Gets canonical balances for all mints with spendable, reserved, and total amounts.
   * @returns An object mapping mint URLs to their balances
   */
  getBalancesByMint(scope?: BalanceQuery): Promise<BalancesByMint>;
  getBalancesByMintAndUnit(scope?: BalanceQuery): Promise<BalancesByMintAndUnit>;
  /**
   * Gets the aggregated balance for the selected mint scope.
   * @returns A single balance snapshot with spendable, reserved, and total amounts
   */
  getBalanceTotal(scope?: BalanceQuery): Promise<BalanceSnapshot>;
  getBalancesByUnit(scope?: BalanceQuery): Promise<BalancesByUnit>;
  getBalanceTotalByUnit(scope?: BalanceQuery): Promise<BalancesByUnit>;
  /**
   * Gets balance breakdowns for all mints.
   * @returns An object mapping mint URLs to their balance breakdowns
   */
  getBalancesBreakdown(): Promise<BalancesBreakdownByMint>;
  /**
   * Gets balances for trusted mints only.
   * @returns An object mapping trusted mint URLs to their total balances
   */
  getTrustedBalances(): Promise<{
    [mintUrl: string]: Amount;
  }>;
  /**
   * Gets spendable balances for trusted mints only.
   * @returns An object mapping trusted mint URLs to their spendable balances
   */
  getTrustedSpendableBalances(): Promise<{
    [mintUrl: string]: Amount;
  }>;
  /**
   * Gets balance breakdowns for trusted mints only.
   * @returns An object mapping trusted mint URLs to their balance breakdowns
   */
  getTrustedBalancesBreakdown(): Promise<BalancesBreakdownByMint>;
  private getSingleBalanceUnit;
  private emptyBalanceSnapshot;
  private snapshotToBreakdown;
  setProofState(mintUrl: string, secrets: string[], state: 'inflight' | 'ready' | 'spent'): Promise<void>;
  /**
   * Reserve proofs for an operation.
   * Validates that proofs are available (ready and not already reserved) before reserving.
   * Emits 'proofs:reserved' event on success.
   *
   * @throws ProofOperationError if any proof is not available for reservation
   */
  reserveProofs(mintUrl: string, secrets: string[], operationId: string, options?: {
    unit?: string;
  }): Promise<UnitAmount>;
  /**
   * Release proofs from an operation.
   * Clears the reservation so proofs become available again.
   * Emits 'proofs:released' event on success.
   */
  releaseProofs(mintUrl: string, secrets: string[]): Promise<void>;
  /**
   * Restore proofs to ready state and clear their operation reservation.
   * Used during rollback when inflight proofs need to be made available again.
   * This sets state to 'ready' and clears usedByOperationId.
   */
  restoreProofsToReady(mintUrl: string, secrets: string[]): Promise<void>;
  deleteProofs(mintUrl: string, secrets: string[]): Promise<void>;
  wipeProofsByKeysetId(mintUrl: string, keysetId: string): Promise<void>;
  /**
   * Select proofs to send for a given amount.
   * Uses the wallet's proof selection algorithm to choose optimal denominations.
   * Only available proofs are considered (ready and not reserved by another operation).
   *
   * @param mintUrl - The mint URL to select proofs from
   * @param amount - The amount to send
   * @param includeFees - Whether to include fees in the selection (default: true)
   * @returns The selected proofs
   * @throws ProofValidationError if insufficient balance to cover the amount
   */
  selectProofsToSend(mintUrl: string, intent: UnitAmount, includeFees?: boolean): Promise<Proof[]>;
  private groupProofsByKeysetId;
  getProofsByKeysetId(mintUrl: string, keysetId: string, filter?: ProofUnitFilter): Promise<CoreProof[]>;
  hasProofsForKeyset(mintUrl: string, keysetId: string): Promise<boolean>;
  prepareProofsForReceiving(proofs: Proof[]): Promise<Proof[]>;
  createBlankOutputs(mintUrl: string, intent: UnitAmount): Promise<OutputDataLike[]>;
  /**
   * Unblind change signatures and save the resulting proofs.
   * Used after melt operations to process change returned by the mint.
   *
   * @param mintUrl - The mint URL
   * @param outputData - The output data used to create blank outputs for change
   * @param changeSignatures - The blinded signatures returned by the mint
   * @param keys - The mint keys for unblinding
   * @param options - Optional settings including createdByOperationId
   * @returns The saved change proofs
   */
  unblindAndSaveChangeProofs(mintUrl: string, outputData: OutputDataLike[], changeSignatures: SerializedBlindedSignature[], options: {
    unit: string;
    createdByOperationId?: string;
  }): Promise<CoreProof[]>;
  /**
   * Recover proofs from a completed swap using the mint's restore endpoint.
   * This is used when a swap succeeded but proofs were not saved (e.g., crash recovery).
   *
   * First checks if the proofs are still unspent before attempting recovery.
   * Only unspent proofs will be recovered and saved.
   *
   * @param mintUrl - The mint URL
   * @param serializedOutputData - The serialized output data containing secrets and blinding factors
   * @param options - Optional metadata to attach to recovered proofs
   * @returns The recovered proofs (only unspent ones)
   */
  recoverProofsFromOutputData(mintUrl: string, serializedOutputData: SerializedOutputData, options: {
    unit: string;
    createdByOperationId?: string;
    persistRecoveredProofs?: boolean;
  }): Promise<Proof[]>;
}
//#endregion
//#region operations/melt/MeltMethodHandler.d.ts
/**
 * Registry of supported melt methods and their public input payload shapes.
 * Extend via declaration merging if you need to add methods externally.
 */
interface MeltMethodInputDefinitions {
  bolt11: {
    invoice: string;
    amountSats?: AmountLike;
  };
  bolt12: {
    offer: string;
    amountSats?: AmountLike;
  };
  onchain: {
    address: string;
    amountSats: AmountLike;
  };
}
/**
 * Registry of supported melt methods and their normalized operation payload shapes.
 * Amount values are normalized at the operation boundary.
 */
interface MeltMethodDefinitions {
  bolt11: {
    invoice: string;
    amountSats?: Amount;
  };
  bolt12: {
    offer: string;
    amountSats?: Amount;
  };
  onchain: {
    address: string;
    amountSats: Amount;
    feeIndex?: number;
  };
}
type MeltMethod = keyof MeltMethodDefinitions;
type MeltMethodData<M extends MeltMethod = MeltMethod> = MeltMethodDefinitions[M];
type OptionalMethodMeltQuote<T extends MeltQuoteBaseResponse> = Omit<T, 'method'> & Partial<Pick<MeltQuoteBaseResponse, 'method'>>;
/** Accept v4 caller snapshots while cashu-ts v5 owns normalization of live mint responses. */
type CompatibleMeltQuoteBolt11Response = OptionalMethodMeltQuote<MeltQuoteBolt11Response>;
type CompatibleMeltQuoteBolt12Response = OptionalMethodMeltQuote<MeltQuoteBolt12Response>;
type CompatibleMeltQuoteOnchainResponse = OptionalMethodMeltQuote<MeltQuoteOnchainResponse>;
interface MeltMethodQuoteDefinitions {
  bolt11: CompatibleMeltQuoteBolt11Response;
  bolt12: CompatibleMeltQuoteBolt12Response;
  onchain: CompatibleMeltQuoteOnchainResponse;
}
type MeltMethodInputData<M extends MeltMethod = MeltMethod> = M extends keyof MeltMethodInputDefinitions ? MeltMethodInputDefinitions[M] : never;
type MeltMethodRemoteState<M extends MeltMethod = MeltMethod> = MeltMethodQuoteDefinitions[M]['state'];
type MeltMethodQuoteSnapshot<M extends MeltMethod = MeltMethod> = MeltMethodQuoteDefinitions[M];
interface MeltMethodMeta<M extends MeltMethod = MeltMethod> {
  method: M;
  methodData: MeltMethodData<M>;
}
declare function normalizeMeltMethodData<M extends MeltMethod>(methodData: MeltMethodInputData<M> | MeltMethodData<M>): MeltMethodData<M>;
interface BaseHandlerDeps {
  proofRepository: ProofRepository;
  proofService: ProofService;
  walletService: WalletService;
  mintService: MintService;
  mintAdapter: MintAdapter;
  eventBus: EventBus<CoreEvents>;
  logger?: Logger;
}
interface CreateMeltQuoteContext<M extends MeltMethod = MeltMethod> extends BaseHandlerDeps {
  mintUrl: string;
  methodData: MeltMethodData<M>;
  unit: string;
  wallet: Wallet;
}
interface FetchRemoteMeltQuoteContext<M extends MeltMethod = MeltMethod> extends BaseHandlerDeps {
  quote: MeltQuote<M>;
}
interface BasePrepareContext<M extends MeltMethod = MeltMethod> extends BaseHandlerDeps {
  operation: InitMeltOperation & MeltMethodMeta<M>;
  wallet: Wallet;
  quote: MeltMethodQuoteSnapshot<M>;
}
interface PreparedContext<M extends MeltMethod = MeltMethod> extends BaseHandlerDeps {
  operation: PreparedMeltOperation & MeltMethodMeta<M>;
  wallet: Wallet;
}
interface ExecuteContext<M extends MeltMethod = MeltMethod> extends BaseHandlerDeps {
  operation: ExecutingMeltOperation & MeltMethodMeta<M>;
  wallet: Wallet;
  reservedProofs: Proof[];
}
interface PendingContext<M extends MeltMethod = MeltMethod> extends BaseHandlerDeps {
  operation: PendingMeltOperation & MeltMethodMeta<M>;
  wallet: Wallet;
  canonicalQuote?: MeltQuote<M>;
}
interface FinalizeContext<M extends MeltMethod = MeltMethod> extends BaseHandlerDeps {
  operation: PendingMeltOperation & MeltMethodMeta<M>;
  canonicalQuote?: MeltQuote<M>;
}
type FinalizeResult<M extends MeltMethod = MeltMethod> = {
  /** Total amount returned as change by the mint */changeAmount?: Amount; /** Actual fee impact after settlement */
  effectiveFee?: Amount; /** Method-specific data that may be available once settlement completes */
  finalizedData?: MeltMethodFinalizedData<M>;
};
interface RollbackContext<M extends MeltMethod = MeltMethod> extends BaseHandlerDeps {
  operation: PreparedOrLaterOperation & MeltMethodMeta<M>;
  wallet: Wallet;
}
interface RecoverExecutingContext<M extends MeltMethod = MeltMethod> extends BaseHandlerDeps {
  operation: ExecutingMeltOperation & MeltMethodMeta<M>;
  wallet: Wallet;
}
type ExecutionResult<M extends MeltMethod = MeltMethod> = {
  status: 'PAID';
  finalized: FinalizedMeltOperation<M>;
  sendProofs?: Proof[];
  keepProofs?: Proof[];
} | {
  status: 'PENDING';
  pending: PendingMeltOperation & MeltMethodMeta<M>;
  sendProofs?: Proof[];
  keepProofs?: Proof[];
} | {
  status: 'FAILED';
  failed: FailedMeltOperation & MeltMethodMeta<M>;
  sendProofs?: Proof[];
  keepProofs?: Proof[];
};
type PendingCheckResult = 'finalize' | 'stay_pending' | 'rollback';
interface MeltMethodHandler<M extends MeltMethod = MeltMethod> {
  createQuote(ctx: CreateMeltQuoteContext<M>): Promise<MeltQuote<M>>;
  fetchRemoteQuote(ctx: FetchRemoteMeltQuoteContext<M>): Promise<MeltQuote<M>>;
  prepare(ctx: BasePrepareContext<M>): Promise<PreparedMeltOperation & MeltMethodMeta<M>>;
  execute(ctx: ExecuteContext<M>): Promise<ExecutionResult<M>>;
  finalize?(ctx: FinalizeContext<M>): Promise<FinalizeResult<M>>;
  rollback?(ctx: RollbackContext<M>): Promise<void>;
  checkPending?(ctx: PendingContext<M>): Promise<PendingCheckResult>;
  /**
   * Recover an executing operation that failed mid-execution.
   * Handlers must implement this method to handle recovery logic.
   */
  recoverExecuting(ctx: RecoverExecutingContext<M>): Promise<ExecutionResult<M>>;
}
type MeltMethodHandlerRegistry = Record<MeltMethod, MeltMethodHandler<any>>;
//#endregion
//#region operations/melt/MeltOperation.d.ts
/**
 * State machine for melt operations:
 *
 * init ──► prepared ──► executing ──► pending ──► finalized
 *   │         │            │            │            │
 *   │         │            └────────────┴────────────┘ (if PAID)
 *   │         │            │            │
 *   │         │            │            └──► rolling_back ──► rolled_back
 *   │         │            │                      │
 *   └─────────┴────────────┴──────────────────────┴──► rolled_back
 *
 * - init: Operation created, nothing reserved yet
 * - prepared: Proofs reserved, fees calculated, change outputs created, ready to execute
 * - executing: Swap/melt in progress
 * - pending: Melt started, payment inflight (only if PENDING response)
 * - finalized: melt successful, change claimed, operation finalized (can be reached directly from executing if PAID)
 * - failed: melt failed, proofs reclaimed
 * - rolling_back: Rollback in progress (reclaim swap being executed)
 * - rolled_back: Operation cancelled, proofs reclaimed
 */
type MeltOperationState = 'init' | 'prepared' | 'executing' | 'pending' | 'failed' | 'finalized' | 'rolling_back' | 'rolled_back';
/**
 * Base fields present in all melt operations
 */
interface MeltOperationBase extends MeltMethodMeta {
  /** Unique identifier for this operation */
  id: string;
  /** The mint URL for this operation */
  mintUrl: string;
  /** Unit for all amounts, proofs, quotes, outputs, and change in this operation. */
  unit: string;
  /** Timestamp when the operation was created */
  createdAt: number;
  /** Timestamp when the operation was last updated */
  updatedAt: number;
  /** Error message if the operation failed */
  error?: string;
}
/**
 * Data set during the prepare phase
 */
interface PreparedData {
  /** Whether the operation requires a swap (false = exact match melt) */
  needsSwap: boolean;
  /** The amount requested to melt (before fees) */
  amount: Amount;
  /** Calculated fee for the swap (0 if exact match) */
  fee_reserve: Amount;
  /** The ID of the quote used for the melt operation */
  quoteId: string;
  /** The fee for the swap (0 if exact match) */
  swap_fee: Amount;
  /** Total amount of input proofs selected */
  inputAmount: Amount;
  /** Secrets of proofs reserved as input for this operation */
  inputProofSecrets: string[];
  /**
   * Serialized OutputData (change) for the melt operation.
   */
  changeOutputData: SerializedOutputData;
  /**
   * Serialized OutputData (swap) for the melt operation.
   */
  swapOutputData?: SerializedOutputData;
}
/**
 * Method-specific data that may be available once a melt has settled.
 */
interface MeltMethodFinalizedDataMap {
  bolt11: {
    preimage?: string;
    outpoint?: never;
  };
  bolt12: {
    preimage?: string;
    outpoint?: never;
  };
  onchain: {
    preimage?: never;
    outpoint?: string;
  };
}
type MeltMethodFinalizedData<M extends MeltMethod = MeltMethod> = MeltMethodFinalizedDataMap[M];
/**
 * Initial state - operation just created, nothing reserved yet
 */
interface InitMeltOperation extends MeltOperationBase {
  state: 'init';
  /** Existing canonical quote to prepare against. */
  quoteId?: string;
}
/**
 * Prepared state - proofs reserved, outputs calculated, ready to execute
 */
interface PreparedMeltOperation extends MeltOperationBase, PreparedData {
  state: 'prepared';
}
/**
 * Executing state - swap/token creation in progress
 */
interface ExecutingMeltOperation extends MeltOperationBase, PreparedData {
  state: 'executing';
}
/**
 * Pending state - token returned, awaiting confirmation that proofs are spent
 */
interface PendingMeltOperation extends MeltOperationBase, PreparedData {
  state: 'pending';
}
/**
 * Finalized state - sent proofs confirmed spent, operation finalized.
 * Contains actual settlement amounts after the melt is complete.
 */
interface FinalizedMeltOperationBase extends MeltOperationBase, PreparedData {
  state: 'finalized';
  /**
   * Total amount returned as change by the mint.
   * This is the sum of change proofs received from the melt operation.
   * May be 0 if no change was returned.
   * May be undefined for legacy operations finalized before settlement tracking was added.
   */
  changeAmount?: Amount;
  /**
   * Actual fee impact after settlement.
   * Calculated as: inputAmount - amount - changeAmount
   * (total input proofs value - melt amount - change returned)
   * This represents the actual cost paid for the melt, which may differ from fee_reserve.
   * May be undefined for legacy operations finalized before settlement tracking was added.
   */
  effectiveFee?: Amount;
}
type FinalizedMeltOperation<M extends MeltMethod = MeltMethod> = FinalizedMeltOperationBase & MeltMethodMeta<M> & {
  finalizedData?: MeltMethodFinalizedData<M>;
};
/**
 * Failed state - melt failed, proofs reclaimed
 */
interface FailedMeltOperation extends MeltOperationBase, PreparedData {
  state: 'failed';
}
/**
 * Rolling back state - rollback in progress, reclaim swap being executed.
 * This is a transient state used to prevent race conditions with ProofStateWatcher.
 * Only used when rolling back from 'pending' state (which requires a reclaim swap).
 */
interface RollingBackMeltOperation extends MeltOperationBase, PreparedData {
  state: 'rolling_back';
}
/**
 * Rolled back state - operation cancelled, proofs reclaimed
 * Can be rolled back from prepared, executing, or pending states
 */
interface RolledBackMeltOperation extends MeltOperationBase, PreparedData {
  state: 'rolled_back';
}
/**
 * Discriminated union of all melt operation states.
 * TypeScript will narrow the type based on the `state` field.
 */
type MeltOperation = InitMeltOperation | PreparedMeltOperation | ExecutingMeltOperation | PendingMeltOperation | FinalizedMeltOperation | FailedMeltOperation | RollingBackMeltOperation | RolledBackMeltOperation;
/**
 * Any operation that has been prepared (has PreparedData)
 */
type PreparedOrLaterOperation = PreparedMeltOperation | ExecutingMeltOperation | PendingMeltOperation | FinalizedMeltOperation | FailedMeltOperation | RollingBackMeltOperation | RolledBackMeltOperation;
/**
 * Terminal states - operation is finished
 * Note: 'rolling_back' is NOT terminal - it's a transient state that needs recovery
 */
type TerminalMeltOperation = FinalizedMeltOperation | RolledBackMeltOperation | FailedMeltOperation;
declare function isInitOperation(op: MeltOperation): op is InitMeltOperation;
declare function isPreparedOperation(op: MeltOperation): op is PreparedMeltOperation;
declare function isExecutingOperation(op: MeltOperation): op is ExecutingMeltOperation;
declare function isPendingOperation(op: MeltOperation): op is PendingMeltOperation;
declare function isFinalizedOperation(op: MeltOperation): op is FinalizedMeltOperation;
declare function isRollingBackOperation(op: MeltOperation): op is RollingBackMeltOperation;
declare function isRolledBackOperation(op: MeltOperation): op is RolledBackMeltOperation;
/**
 * Check if operation has PreparedData (any state after init)
 */
declare function hasPreparedData(op: MeltOperation): op is PreparedOrLaterOperation;
/**
 * Check if operation is in a terminal state
 */
declare function isTerminalOperation(op: MeltOperation): op is TerminalMeltOperation;
/**
 * Creates a new SendOperation in init state
 */
declare function createMeltOperation(id: string, mintUrl: string, meta: MeltMethodMeta, unit?: string, options?: {
  quoteId?: string;
}): InitMeltOperation;
//#endregion
//#region models/History.d.ts
type HistoryType = 'mint' | 'melt' | 'send' | 'receive';
type BaseHistoryEntry = {
  id: string;
  type: HistoryType;
  createdAt: number;
  updatedAt: number;
  mintUrl: string;
  unit: string;
  metadata?: Record<string, string>;
  error?: string;
};
type OperationHistoryBase = BaseHistoryEntry & {
  source: 'operation';
  operationId: string;
};
type MintHistoryState = Exclude<MintOperationState, 'init'>;
type MeltHistoryState = Exclude<MeltOperationState, 'init' | 'failed'>;
type SendHistoryState = Exclude<SendOperationState, 'init'>;
type ReceiveHistoryState = Extract<ReceiveOperationState, 'finalized' | 'rolled_back'>;
type MintHistoryEntry = OperationHistoryBase & {
  type: 'mint';
  paymentRequest: string;
  quoteId: string;
  state: MintHistoryState;
  amount: Amount;
  remoteState?: string;
};
type MeltHistoryEntry = OperationHistoryBase & {
  type: 'melt';
  quoteId: string;
  state: MeltHistoryState;
  amount: Amount;
};
type SendHistoryEntry = OperationHistoryBase & {
  type: 'send';
  amount: Amount;
  state: SendHistoryState; /** Token is only available after execute (state >= pending) */
  token?: Token;
};
type ReceiveHistoryEntry = OperationHistoryBase & {
  type: 'receive';
  amount: Amount;
  state: ReceiveHistoryState;
  token?: Token;
};
type OperationHistoryEntry = MintHistoryEntry | MeltHistoryEntry | SendHistoryEntry | ReceiveHistoryEntry;
type LegacyMintHistoryState = MintQuoteState | string;
type LegacyMeltHistoryState = MeltQuoteState | string;
type LegacySendHistoryState = 'prepared' | 'pending' | 'finalized' | 'rolledBack' | string;
type LegacyReceiveHistoryState = 'prepared' | 'finalized' | 'rolledBack' | string;
type LegacyHistoryBase = BaseHistoryEntry & {
  source: 'legacy';
  legacyHistoryId: string;
  operationId?: string;
};
type LegacyMintHistoryEntry = LegacyHistoryBase & {
  type: 'mint';
  paymentRequest: string;
  quoteId: string;
  state: LegacyMintHistoryState;
  amount: Amount;
};
type LegacyMeltHistoryEntry = LegacyHistoryBase & {
  type: 'melt';
  quoteId: string;
  state: LegacyMeltHistoryState;
  amount: Amount;
};
type LegacySendHistoryEntry = LegacyHistoryBase & {
  type: 'send';
  amount: Amount;
  state: LegacySendHistoryState;
  token?: Token;
};
type LegacyReceiveHistoryEntry = LegacyHistoryBase & {
  type: 'receive';
  amount: Amount;
  state: LegacyReceiveHistoryState;
  token?: Token;
};
type LegacyHistoryEntry = LegacyMintHistoryEntry | LegacyMeltHistoryEntry | LegacySendHistoryEntry | LegacyReceiveHistoryEntry;
type HistoryEntry = OperationHistoryEntry | LegacyHistoryEntry;
type LegacyHistoryRowInput = {
  legacyHistoryId: string | number;
  type: HistoryType;
  createdAt: number;
  mintUrl: string;
  unit: string;
  amount: Amount;
  quoteId?: string | null;
  state?: string | null;
  paymentRequest?: string | null;
  token?: Token;
  metadata?: Record<string, string>;
  operationId?: string | null;
};
declare function isOperationHistoryEntry(entry: HistoryEntry): entry is OperationHistoryEntry;
declare function isLegacyHistoryEntry(entry: HistoryEntry): entry is LegacyHistoryEntry;
declare function operationHistoryId(type: HistoryType, operationId: string): string;
declare function legacyHistoryId(legacyId: string | number): string;
declare function parseHistoryEntryId(id: string): {
  source: 'operation';
  type: HistoryType;
  operationId: string;
} | {
  source: 'legacy';
  legacyHistoryId: string;
} | null;
declare function compareHistoryEntries(a: HistoryEntry, b: HistoryEntry): number;
declare function projectSendOperation(operation: SendOperation): SendHistoryEntry | null;
declare function projectMeltOperation(operation: MeltOperation): MeltHistoryEntry | null;
declare function projectMintOperation(operation: MintOperation): MintHistoryEntry | null;
declare function projectReceiveOperation(operation: ReceiveOperation): ReceiveHistoryEntry | null;
declare function projectOperationToHistoryEntry(type: HistoryType, operation: SendOperation | MeltOperation | MintOperation | ReceiveOperation): OperationHistoryEntry | null;
declare function projectLegacyHistoryRow(row: LegacyHistoryRowInput): LegacyHistoryEntry;
//#endregion
//#region repositories/memory/MemoryRepositories.d.ts
declare class MemoryRepositories implements Repositories {
  mintRepository: MintRepository;
  keyRingRepository: KeyRingRepository;
  counterRepository: CounterRepository;
  keysetRepository: KeysetRepository;
  proofRepository: ProofRepository;
  mintQuoteRepository: MintQuoteRepository;
  legacyMintQuoteRepository: LegacyMintQuoteRepository;
  meltQuoteRepository: MeltQuoteRepository;
  historyRepository: HistoryProjectionRepository;
  sendOperationRepository: SendOperationRepository;
  meltOperationRepository: MeltOperationRepository;
  authSessionRepository: AuthSessionRepository;
  mintOperationRepository: MintOperationRepository;
  receiveOperationRepository: ReceiveOperationRepository;
  paymentRequestReceiveOperationRepository: PaymentRequestReceiveOperationRepository;
  paymentRequestReceiveAttemptRepository: PaymentRequestReceiveAttemptRepository;
  constructor();
  init(): Promise<void>;
  withTransaction<T>(fn: (repos: RepositoryTransactionScope) => Promise<T>): Promise<T>;
}
//#endregion
//#region repositories/index.d.ts
interface ProofUnitFilter {
  unit?: string;
  units?: string[];
}
interface MintRepository {
  isTrustedMint(mintUrl: string): Promise<boolean>;
  getMintByUrl(mintUrl: string): Promise<Mint$1>;
  getAllMints(): Promise<Mint$1[]>;
  getAllTrustedMints(): Promise<Mint$1[]>;
  addNewMint(mint: Mint$1): Promise<void>;
  addOrUpdateMint(mint: Mint$1): Promise<void>;
  updateMint(mint: Mint$1): Promise<void>;
  setMintTrusted(mintUrl: string, trusted: boolean): Promise<void>;
  deleteMint(mintUrl: string): Promise<void>;
}
interface KeysetRepository {
  getKeysetsByMintUrl(mintUrl: string): Promise<Keyset[]>;
  getKeysetById(mintUrl: string, id: string): Promise<Keyset | null>;
  updateKeyset(keyset: Omit<Keyset, 'keypairs' | 'updatedAt'>): Promise<void>;
  addKeyset(keyset: Omit<Keyset, 'updatedAt'>): Promise<void>;
  deleteKeyset(mintUrl: string, keysetId: string): Promise<void>;
}
interface CounterRepository {
  getCounter(mintUrl: string, keysetId: string): Promise<Counter | null>;
  setCounter(mintUrl: string, keysetId: string, counter: number): Promise<void>;
}
interface ProofRepository {
  saveProofs(mintUrl: string, proofs: CoreProof[]): Promise<void>;
  getReadyProofs(mintUrl: string, filter?: ProofUnitFilter): Promise<CoreProof[]>;
  /**
   * Retrieves all proofs marked as inflight. Can be optionally filtered by a list of mint URLs.
   */
  getInflightProofs(mintUrls?: string[], filter?: ProofUnitFilter): Promise<CoreProof[]>;
  getAllReadyProofs(filter?: ProofUnitFilter): Promise<CoreProof[]>;
  setProofState(mintUrl: string, secrets: string[], state: ProofState): Promise<void>;
  deleteProofs(mintUrl: string, secrets: string[]): Promise<void>;
  getProofsByKeysetId(mintUrl: string, keysetId: string, filter?: ProofUnitFilter): Promise<CoreProof[]>;
  wipeProofsByKeysetId(mintUrl: string, keysetId: string): Promise<void>;
  /**
   * Reserve proofs for an operation by setting usedByOperationId.
   * Only proofs that are 'ready' and not already reserved can be reserved.
   */
  reserveProofs(mintUrl: string, secrets: string[], operationId: string): Promise<void>;
  /**
   * Release proofs from an operation by clearing usedByOperationId.
   */
  releaseProofs(mintUrl: string, secrets: string[]): Promise<void>;
  /**
   * Set the createdByOperationId for proofs.
   */
  setCreatedByOperation(mintUrl: string, secrets: string[], operationId: string): Promise<void>;
  /**
   * Get a single proof by its secret.
   */
  getProofBySecret(mintUrl: string, secret: string): Promise<CoreProof | null>;
  /**
   * Get proofs matching a batch of secrets for a mint.
   */
  getProofsBySecrets(mintUrl: string, secrets: string[]): Promise<CoreProof[]>;
  /**
   * Get proofs associated with a specific operation (as input or output).
   */
  getProofsByOperationId(mintUrl: string, operationId: string): Promise<CoreProof[]>;
  /**
   * Get available (ready and not reserved) proofs for a mint.
   * This filters out proofs that have usedByOperationId set.
   */
  getAvailableProofs(mintUrl: string, filter?: ProofUnitFilter): Promise<CoreProof[]>;
  /**
   * Get all proofs that are reserved (have usedByOperationId set) and are still in ready state.
   * Used for detecting orphaned reservations during recovery.
   */
  getReservedProofs(): Promise<CoreProof[]>;
}
/**
 * Stores canonical mint quotes.
 *
 * Public mint quote identity is methodless: `{ mintUrl, quoteId }` after mint URL normalization.
 * Method-scoped APIs address the concrete storage row once the quote method is known. Adapters must
 * reject upserts that would create two mint quotes with the same `{ mintUrl, quoteId }` for
 * different methods at the same normalized mint URL. Melt quotes use a separate identity namespace.
 */
interface MintQuoteRepository {
  /**
   * Look up a mint quote by its public methodless identity, normalizing `identity.mintUrl` first.
   *
   * Implementations should return the single matching mint quote, return `null` when none exists,
   * and report a quote identity conflict if stored data contains multiple methods for the same
   * normalized `{ mintUrl, quoteId }`.
   */
  getMintQuoteById(identity: QuoteIdentity): Promise<MintQuote | null>;
  /**
   * Look up the exact method-scoped mint quote row, normalizing `mintUrl` before comparison.
   */
  getMintQuote(mintUrl: string, method: string, quoteId: string): Promise<MintQuote | null>;
  /**
   * Insert or update the exact method-scoped mint quote row after normalizing `quote.mintUrl`.
   *
   * Upserting the same normalized `{ mintUrl, method, quoteId }` updates that quote. Upserting a
   * different method with the same normalized `{ mintUrl, quoteId }` must fail with a quote
   * identity conflict instead of creating an ambiguous methodless public identity.
   */
  upsertMintQuote(quote: MintQuote): Promise<void>;
  /**
   * Update canonical BOLT11 accounting from a legacy state observation.
   *
   * @deprecated Persist a canonical quote observation with `amountPaid` and `amountIssued`.
   */
  setMintQuoteState(mintUrl: string, method: string, quoteId: string, state: MintMethodRemoteState, observedAt?: number): Promise<void>;
  getPendingMintQuotes(method?: string): Promise<MintQuote[]>;
}
interface LegacyMintQuoteRepository {
  getPendingLegacyMintQuotes(mintUrl?: string): Promise<MintQuote[]>;
}
/**
 * Stores canonical melt quotes.
 *
 * Public melt quote identity is methodless: `{ mintUrl, quoteId }` after mint URL normalization.
 * Method-scoped APIs address the concrete storage row once the quote method is known. Adapters must
 * reject upserts that would create two melt quotes with the same `{ mintUrl, quoteId }` for
 * different methods at the same normalized mint URL. Mint quotes use a separate identity namespace.
 */
interface MeltQuoteRepository {
  /**
   * Look up a melt quote by its public methodless identity, normalizing `identity.mintUrl` first.
   *
   * Implementations should return the single matching melt quote, return `null` when none exists,
   * and report a quote identity conflict if stored data contains multiple methods for the same
   * normalized `{ mintUrl, quoteId }`.
   */
  getMeltQuoteById(identity: QuoteIdentity): Promise<MeltQuote | null>;
  /**
   * Look up the exact method-scoped melt quote row, normalizing `mintUrl` before comparison.
   */
  getMeltQuote(mintUrl: string, method: string, quoteId: string): Promise<MeltQuote | null>;
  /**
   * Insert or update the exact method-scoped melt quote row after normalizing `quote.mintUrl`.
   *
   * Upserting the same normalized `{ mintUrl, method, quoteId }` updates that quote. Upserting a
   * different method with the same normalized `{ mintUrl, quoteId }` must fail with a quote
   * identity conflict instead of creating an ambiguous methodless public identity. Returns the
   * canonical persisted quote after applying repository normalization.
   */
  upsertMeltQuote(quote: MeltQuote): Promise<MeltQuote>;
  getPendingMeltQuotes(method?: string): Promise<MeltQuote[]>;
}
interface KeyRingRepository {
  getPersistedKeyPair(publicKey: string, purpose?: KeypairPurpose): Promise<Keypair | null>;
  setPersistedKeyPair(keyPair: Keypair): Promise<void>;
  deletePersistedKeyPair(publicKey: string, purpose?: KeypairPurpose): Promise<void>;
  getAllPersistedKeyPairs(purpose?: KeypairPurpose): Promise<Keypair[]>;
  getLatestKeyPair(purpose?: KeypairPurpose): Promise<Keypair | null>;
  /**
   * Derive and persist the next keypair for `purpose` atomically with its durable high-water mark.
   *
   * Implementations invoke `derive` synchronously inside a writer transaction and resolve only
   * after both the returned keypair and the high-water mark have committed. If derivation,
   * persistence, or commit fails, neither value may remain persisted.
   */
  deriveAndPersistKeyPair(purpose: KeypairPurpose, derive: (derivationIndex: number) => Pick<Keypair, 'publicKeyHex' | 'secretKey'>): Promise<Keypair>;
}
interface HistoryProjectionRepository {
  getPaginatedHistoryEntries(limit: number, offset: number): Promise<HistoryEntry[]>;
  getHistoryEntryById(id: string): Promise<HistoryEntry | null>;
}
type HistoryRepository = HistoryProjectionRepository;
interface SendOperationRepository {
  /** Create a new send operation */
  create(operation: SendOperation): Promise<void>;
  /** Update an existing send operation */
  update(operation: SendOperation): Promise<void>;
  /** Get a send operation by ID */
  getById(id: string): Promise<SendOperation | null>;
  /** Get all send operations in a specific state */
  getByState(state: SendOperationState): Promise<SendOperation[]>;
  /** Get all in-flight operations (state in ['executing', 'pending', 'rolling_back']) */
  getPending(): Promise<SendOperation[]>;
  /** Get all operations for a specific mint */
  getByMintUrl(mintUrl: string): Promise<SendOperation[]>;
  /** Delete a send operation */
  delete(id: string): Promise<void>;
}
interface MeltOperationRepository {
  /** Create a new melt operation */
  create(operation: MeltOperation): Promise<void>;
  /** Update an existing melt operation */
  update(operation: MeltOperation): Promise<void>;
  /** Get a melt operation by ID */
  getById(id: string): Promise<MeltOperation | null>;
  /** Get all melt operations in a specific state */
  getByState(state: MeltOperationState): Promise<MeltOperation[]>;
  /** Get all pending operations (state in ['executing', 'pending']) */
  getPending(): Promise<MeltOperation[]>;
  /** Get all operations for a specific mint */
  getByMintUrl(mintUrl: string): Promise<MeltOperation[]>;
  /** Get all operations for a mint/quote pair */
  getByQuoteId(mintUrl: string, quoteId: string): Promise<MeltOperation[]>;
  /** Delete a melt operation */
  delete(id: string): Promise<void>;
}
interface AuthSessionRepository {
  getSession(mintUrl: string): Promise<AuthSession | null>;
  saveSession(session: AuthSession): Promise<void>;
  deleteSession(mintUrl: string): Promise<void>;
  getAllSessions(): Promise<AuthSession[]>;
}
interface MintOperationRepository {
  /** Create a new mint operation */
  create(operation: MintOperation): Promise<void>;
  /** Update an existing mint operation */
  update(operation: MintOperation): Promise<void>;
  /** Get a mint operation by ID */
  getById(id: string): Promise<MintOperation | null>;
  /** Get all mint operations in a specific state */
  getByState(state: MintOperationState): Promise<MintOperation[]>;
  /** Get all in-flight operations (state in ['pending', 'executing']) */
  getPending(): Promise<MintOperation[]>;
  /** Get all operations for a specific mint */
  getByMintUrl(mintUrl: string): Promise<MintOperation[]>;
  /** Get all operations for a mint/method/quote tuple */
  getByQuoteId(mintUrl: string, method: string, quoteId: string): Promise<MintOperation[]>;
  /** Delete a mint operation */
  delete(id: string): Promise<void>;
}
interface ReceiveOperationRepository {
  /** Create a new receive operation */
  create(operation: ReceiveOperation): Promise<void>;
  /** Update an existing receive operation */
  update(operation: ReceiveOperation): Promise<void>;
  /** Get a receive operation by ID */
  getById(id: string): Promise<ReceiveOperation | null>;
  /** Get all receive operations in a specific state */
  getByState(state: ReceiveOperationState): Promise<ReceiveOperation[]>;
  /** Get all pending operations (state in ['executing']) */
  getPending(): Promise<ReceiveOperation[]>;
  /** Get all operations for a specific mint */
  getByMintUrl(mintUrl: string): Promise<ReceiveOperation[]>;
  /** Get a receive operation created for a payment request receive attempt. */
  getByPaymentRequestAttemptId(attemptId: string): Promise<ReceiveOperation | null>;
  /** Delete a receive operation */
  delete(id: string): Promise<void>;
}
interface PaymentRequestReceiveOperationRepository {
  create(operation: PaymentRequestReceiveOperation): Promise<void>;
  update(operation: PaymentRequestReceiveOperation): Promise<void>;
  getById(id: string): Promise<PaymentRequestReceiveOperation | null>;
  getByState(state: PaymentRequestReceiveState): Promise<PaymentRequestReceiveOperation[]>;
  getActiveByRequestId(requestId: string): Promise<PaymentRequestReceiveOperation[]>;
  list(filter?: {
    state?: PaymentRequestReceiveState;
  }): Promise<PaymentRequestReceiveOperation[]>;
}
interface PaymentRequestReceiveAttemptRepository {
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
interface RepositoriesBase {
  mintRepository: MintRepository;
  keyRingRepository: KeyRingRepository;
  counterRepository: CounterRepository;
  keysetRepository: KeysetRepository;
  proofRepository: ProofRepository;
  mintQuoteRepository: MintQuoteRepository;
  legacyMintQuoteRepository: LegacyMintQuoteRepository;
  meltQuoteRepository: MeltQuoteRepository;
  historyRepository: HistoryProjectionRepository;
  sendOperationRepository: SendOperationRepository;
  meltOperationRepository: MeltOperationRepository;
  authSessionRepository: AuthSessionRepository;
  mintOperationRepository: MintOperationRepository;
  receiveOperationRepository: ReceiveOperationRepository;
  paymentRequestReceiveOperationRepository: PaymentRequestReceiveOperationRepository;
  paymentRequestReceiveAttemptRepository: PaymentRequestReceiveAttemptRepository;
}
interface Repositories extends RepositoriesBase {
  init(): Promise<void>;
  withTransaction<T>(fn: (repos: RepositoryTransactionScope) => Promise<T>): Promise<T>;
}
type RepositoryTransactionScope = Omit<RepositoriesBase, 'keyRingRepository'> & {
  keyRingRepository: Omit<KeyRingRepository, 'deriveAndPersistKeyPair'>;
};
//#endregion
export { projectReceiveOperation as $, assertUnitAmount as $i, UnitMismatchError as $n, FetchRemoteMintQuoteContext as $r, ProofService as $t, LegacyReceiveHistoryEntry as A, sumAmounts as Aa, isStatefulMintQuote as Ai, PaymentRequestUnsupportedSpendingCondition as An, MintQuoteRef as Ar, CreateMeltQuoteContext as At, ReceiveHistoryState as B, BalancesByUnit as Ba, MintOperationFailure as Bi, HttpResponseError as Bn, WebSocketFactory as Br, MeltMethodHandlerRegistry as Bt, HistoryType as C, getSecretsFromSerializedOutputData as Ca, OnchainMintQuote as Ci, RolledBackReceiveOperation as Cn, TerminalSendOperation as Cr, isRollingBackOperation as Ct, LegacyMeltHistoryState as D, serializeOutput as Da, getMintQuoteAvailableAmount as Di, PaymentRequestP2pkRequirement as Dn, MeltHandlerProvider as Dr, CompatibleMeltQuoteBolt11Response as Dt, LegacyMeltHistoryEntry as E, serializeBlindedSignatures as Ea, getMintQuoteAmount as Ei, PaymentRequestMalformedSpendingCondition as En, QuoteMeltResponse as Er, BasePrepareContext as Et, MeltHistoryState as F, BalanceQuery as Fa, ExecutingMintOperation as Fi, HistoryService as Fn, meltQuoteFromBolt11Response as Fr, FinalizeResult as Ft, isOperationHistoryEntry as G, AuthSession as Ga, createMintOperation as Gi, MintQuoteValidationError as Gn, PaymentMethodCapability as Gr, MeltMethodQuoteSnapshot as Gt, SendHistoryState as H, MintInfo as Ha, PendingMintOperation as Hi, MintFetchError as Hn, CheckPaymentMethodCapabilityInput as Hr, MeltMethodInputDefinitions as Ht, MintHistoryEntry as I, BalanceSnapshot as Ia, FailedMintOperation as Ii, AuthService as In, meltQuoteFromBolt12Response as Ir, MeltMethod as It, parseHistoryEntryId as J, isTerminalOperation$1 as Ji, PaymentRequestError as Jn, CompatibleMintQuoteBolt11Response as Jr, PendingContext as Jt, legacyHistoryId as K, getOutputProofSecrets as Ki, NetworkError as Kn, PaymentMethodCapabilityCheck as Kr, MeltMethodRemoteState as Kt, MintHistoryState as L, BalancesBreakdownByMint as La, FinalizedMintOperation as Li, AuthSessionError as Ln, meltQuoteFromOnchainResponse as Lr, MeltMethodData as Lt, LegacySendHistoryEntry as M, LogLevel as Ma, mintQuoteFromBolt12Response as Mi, ResolvedPaymentRequest as Mn, BoltMeltQuote as Mr, ExecutionResult as Mt, LegacySendHistoryState as N, Logger as Na, mintQuoteFromOnchainResponse as Ni, ExecuteSendOptions as Nn, MeltQuote as Nr, FetchRemoteMeltQuoteContext as Nt, LegacyMintHistoryEntry as O, serializeOutputData as Oa, getMintQuoteRemoteState as Oi, PaymentRequestService as On, SubscriptionManager as Or, CompatibleMeltQuoteBolt12Response as Ot, MeltHistoryEntry as P, BalanceBreakdown as Pa, mintQuoteToMethodSnapshot as Pi, SendOperationService as Pn, OnchainMeltQuote as Pr, FinalizeContext as Pt, projectOperationToHistoryEntry as Q, assertSameUnit as Qi, TokenValidationError as Qn, ExecuteContext$2 as Qr, normalizeMeltMethodData as Qt, OperationHistoryEntry as R, BalancesByMint as Ra, InitMintOperation as Ri, AuthSessionExpiredError as Rn, meltQuoteToMethodSnapshot as Rr, MeltMethodDefinitions as Rt, HistoryEntry as S, deserializeToken as Sa, MintQuoteOnchainResponse$1 as Si, ReceiveOperationState as Sn, SendOperationState as Sr, isRolledBackOperation as St, LegacyHistoryRowInput as T, serializeAmount as Ta, deriveBolt11MintQuoteState as Ti, PaymentRequestExecutionResult as Tn, BoltMeltQuoteState as Tr, BaseHandlerDeps as Tt, compareHistoryEntries as U, ProofState as Ua, PendingOrLaterOperation as Ui, MintOperationError as Un, ListPaymentMethodCapabilitiesInput as Ur, MeltMethodMeta as Ut, SendHistoryEntry as V, CoreProof as Va, MintOperationState as Vi, KeysetSyncError as Vn, WebSocketLike as Vr, MeltMethodInputData as Vt, isLegacyHistoryEntry as W, MintQuoteState as Wa, TerminalMintOperation as Wi, MintQuoteKeyError as Wn, MintService as Wr, MeltMethodQuoteDefinitions as Wt, projectMeltOperation as X, UnitAmount as Xi, ProofValidationError as Xn, CompatibleMintQuoteOnchainResponse as Xr, RecoverExecutingContext as Xt, projectLegacyHistoryRow as Y, DEFAULT_UNIT as Yi, ProofOperationError as Yn, CompatibleMintQuoteBolt12Response as Yr, PreparedContext as Yt, projectMintOperation as Z, UnitAmountLike as Zi, QuoteIdentityConflictError as Zn, CreateMintQuoteContext as Zr, RollbackContext as Zt, ReceiveOperationRepository as _, StoredBlindedSignature as _a, RecoverExecutingContext$2 as _i, FinalizedReceiveOperation as _n, PendingSendOperation as _r, isExecutingOperation as _t, KeyRingRepository as a, sameUnitAmount as aa, MintMethodHandler as ai, PaymentRequestReceiveClaimResult as an, ClaimMintQuoteOptions as ar, MeltMethodFinalizedData as at, SendOperationRepository as b, deserializeOutput as ba, Bolt12MintQuote as bi, ReceiveOperation as bn, RollingBackSendOperation as br, isPendingOperation as bt, MeltOperationRepository as c, Keyset as ca, MintMethodQuoteData as ci, PaymentRequestReceiveAttempt as cn, MintHandlerProvider as cr, MeltOperationState as ct, MintQuoteRepository as d, EventBus as da, MintMethodRemoteState as di, PaymentRequestReceiveSource as dn, P2pkSendOptions as dr, PreparedOrLaterOperation as dt, isUnitAmountLikeObject as ea, MintExecutionResult as ei, CounterService as en, UnitValidationError as er, projectSendOperation as et, MintRepository as f, EventHandler as fa, PendingContext$2 as fi, PaymentRequestReceiveState as fn, SendMethod as fr, RolledBackMeltOperation as ft, ProofUnitFilter as g, StoredBlindedMessage as ga, PrepareContext as gi, ExecutingReceiveOperation as gn, InitSendOperation as gr, hasPreparedData as gt, ProofRepository as h, SerializedOutputData as ha, PendingMintObservationResult as hi, TokenService as hn, FinalizedSendOperation as hr, createMeltOperation as ht, HistoryRepository as i, parseUnitAmount as ia, MintMethodDefinitions as ii, CreatePaymentRequestReceiveInput as in, KeypairPurpose as ir, InitMeltOperation as it, LegacyReceiveHistoryState as j, toAmount as ja, mintQuoteFromBolt11Response as ji, PreparedPaymentRequest as jn, QuoteIdentity as jr, ExecuteContext as jt, LegacyMintHistoryState as k, stringifyJson as ka, isMintQuotePending as ki, PaymentRequestSpendingConditionRequirement as kn, MeltQuoteRef as kr, CompatibleMeltQuoteOnchainResponse as kt, MeltQuoteRepository as l, KeysetKeypairs as la, MintMethodQuoteImportSnapshot as li, PaymentRequestReceiveAttemptState as ln, DefaultSendMethodData as lr, PendingMeltOperation as lt, PaymentRequestReceiveOperationRepository as m, SerializedOutput as ma, PendingMintCheckResult as mi, ReceiveOperationService as mn, ExecutingSendOperation as mr, TerminalMeltOperation as mt, CounterRepository as n, normalizeUnitAmount as na, MintMethodCreateQuoteData as ni, MeltOperationService as nn, KeyRingService as nr, FailedMeltOperation as nt, KeysetRepository as o, WalletService as oa, MintMethodHandlerRegistry as oi, PaymentRequestReceiveService as on, MintOperationService as or, MeltMethodFinalizedDataMap as ot, PaymentRequestReceiveAttemptRepository as p, Counter as pa, PendingMintCheckCategory as pi, PaymentRequestReceiveTransport as pn, SendMethodData as pr, RollingBackMeltOperation as pt, operationHistoryId as q, hasPendingData as qi, OperationInProgressError as qn, BaseHandlerDeps$2 as qr, PendingCheckResult as qt, HistoryProjectionRepository as r, normalizeUnitList as ra, MintMethodData as ri, WalletRestoreService as rn, Keypair as rr, FinalizedMeltOperation as rt, LegacyMintQuoteRepository as s, SeedService as sa, MintMethodMeta as si, ParsedPaymentRequestPayload as sn, QuoteLifecycle as sr, MeltOperation as st, AuthSessionRepository as t, normalizeUnit as ta, MintMethod as ti, CoreEvents as tn, UnknownMintError as tr, ExecutingMeltOperation as tt, MintOperationRepository as u, Mint$1 as ua, MintMethodQuoteSnapshot as ui, PaymentRequestReceiveOperation as un, P2pkSendMethodData as ur, PreparedMeltOperation as ut, Repositories as v, deserializeAmount as va, RecoverExecutingResult as vi, InitReceiveOperation as vn, PreparedSendOperation as vr, isFinalizedOperation as vt, LegacyHistoryEntry as w, normalizeMintUrl as wa, applyBolt11MintQuoteStateFallback as wi, TerminalReceiveOperation as wn, BaseQuoteMeltHandler as wr, isTerminalOperation as wt, MemoryRepositories as x, deserializeOutputData as xa, MintQuote as xi, ReceiveOperationSource as xn, SendOperation as xr, isPreparedOperation as xt, RepositoryTransactionScope as y, deserializeBlindedSignatures as ya, Bolt11MintQuote as yi, PreparedReceiveOperation as yn, RolledBackSendOperation as yr, isInitOperation as yt, ReceiveHistoryEntry as z, BalancesByMintAndUnit as za, MintOperation as zi, DerivationIndexExhaustedError as zn, resolveOnchainMeltFeeOption as zr, MeltMethodHandler as zt };