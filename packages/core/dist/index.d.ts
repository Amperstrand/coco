import * as _cashu_cashu_ts0 from "@cashu/cashu-ts";
import { Amount, Amount as Amount$1, AmountLike, AmountLike as AmountLike$1, AuthProvider, GetKeysetsResponse, MeltQuoteBolt11Response, MeltQuoteBolt12Response, MeltQuoteOnchainFeeOption, MeltQuoteOnchainResponse, MeltQuoteState, Mint as Mint$1, MintKeys, MintKeyset, MintQuoteBolt11Response, MintQuoteBolt12Response, MintQuoteOnchainResponse as MintQuoteOnchainResponse$1, NUT10Option, OutputData, PaymentRequest, PaymentRequestPayload, PaymentRequestTransport as PaymentRequestTransport$1, PaymentRequestTransportType, Proof, SerializedBlindedSignature, Token, TokenResponse, Wallet, getDecodedToken, getEncodedToken, getTokenMetadata } from "@cashu/cashu-ts";

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
type MintQuoteState = 'UNPAID' | 'PAID' | 'ISSUED';
//#endregion
//#region types.d.ts
type MintInfo = Awaited<ReturnType<Mint$1['getInfo']>>;
type ProofState = 'inflight' | 'ready' | 'spent';
interface BalanceSnapshot {
  spendable: Amount$1;
  reserved: Amount$1;
  total: Amount$1;
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
  ready: Amount$1;
  reserved: Amount$1;
  total: Amount$1;
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
}
/**
 * Serialized form of OutputData for keep and send (JSON-safe)
 */
interface SerializedOutputData {
  keep: SerializedOutput[];
  send: SerializedOutput[];
}
declare function toAmount(value: AmountLike$1): Amount$1;
declare function sumAmounts(values: Iterable<AmountLike$1>): Amount$1;
declare function serializeAmount(value: AmountLike$1): string;
declare function stringifyJson(value: unknown): string;
declare function deserializeAmount(value: string | number | bigint | Amount$1): Amount$1;
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
interface Mint {
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
  constructor(mintService: MintService, seedService: SeedService, requestProvider: MintRequestProvider, logger?: Logger, authProviderGetter?: (mintUrl: string) => AuthProvider | undefined);
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
  amount: Amount$1;
  unit: string;
}
type UnitAmountLike = AmountLike$1 | {
  amount: AmountLike$1;
  unit: string;
};
declare function isUnitAmountLikeObject(input: UnitAmountLike): input is {
  amount: AmountLike$1;
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
 * - failed: Operation reached a terminal non-issued state (for example, quote expiry)
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
  amount: Amount$1;
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
//#endregion
//#region models/MintQuote.d.ts
type MintQuoteOnchainResponse = MintMethodQuoteSnapshot<'onchain'>;
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
  quoteData: MintMethodQuoteData<M>;
  createdAt: number;
  updatedAt: number;
}
type Bolt11MintQuote = MintQuoteBase<'bolt11'> & {
  amount: Amount$1;
  state: MintMethodRemoteState<'bolt11'>;
  lastObservedRemoteState?: MintMethodRemoteState<'bolt11'>;
  lastObservedRemoteStateAt?: number;
  reusable: false;
};
type OnchainMintQuote = MintQuoteBase<'onchain'> & {
  amount?: never;
  state?: never;
  lastObservedRemoteState?: never;
  lastObservedRemoteStateAt?: number;
  reusable: true;
};
type Bolt12MintQuote = MintQuoteBase<'bolt12'> & {
  amount?: Amount$1;
  state?: never;
  lastObservedRemoteState?: never;
  lastObservedRemoteStateAt?: number;
  reusable: true;
};
type MintQuote<M extends MintMethod = MintMethod> = M extends 'bolt11' ? Bolt11MintQuote : M extends 'onchain' ? OnchainMintQuote : M extends 'bolt12' ? Bolt12MintQuote : never;
declare function isStatefulMintQuote(quote: MintQuote): quote is MintQuote<'bolt11'>;
declare function getMintQuoteRemoteState(quote: MintQuote): MintMethodRemoteState<'bolt11'> | undefined;
/**
 * Returns the fixed mint operation amount for stateful quotes.
 *
 * Reusable quote metadata may include a payment amount, such as a fixed BOLT12
 * offer amount, but that does not constrain the later mint operation amount.
 */
declare function getMintQuoteAmount(quote: MintQuote): Amount$1 | undefined;
declare function getMintQuoteAvailableAmount(quote: MintQuote): Amount$1;
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
/**
 * Registry of supported mint methods and payload shapes.
 * Extend via declaration merging to support additional methods.
 */
interface MintMethodDefinitions {
  bolt11: {
    methodData: Record<string, never>;
    createQuoteData: {
      amount: UnitAmount;
    };
    quoteData: {
      amount: Amount$1;
    };
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
      amountPaid: Amount$1;
      amountIssued: Amount$1;
    };
    remoteState: never;
    quote: MintQuoteOnchainResponse$1;
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
      amount?: Amount$1;
      amountPaid: Amount$1;
      amountIssued: Amount$1;
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
}
interface PendingContext$2<M extends MintMethod = MintMethod> extends BaseHandlerDeps$2 {
  operation: PendingMintOperation<M>;
  wallet: Wallet;
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
  observedRemoteState?: MintMethodRemoteState<M>;
  observedRemoteStateAt: number;
  quoteSnapshot?: MintMethodQuoteSnapshot<M>;
  category: PendingMintCheckCategory;
  terminalFailure?: MintOperationFailure;
}
interface MintMethodHandler<M extends MintMethod = MintMethod> {
  createQuote(ctx: CreateMintQuoteContext<M>): Promise<MintQuote<M>>;
  fetchRemoteQuote(ctx: FetchRemoteMintQuoteContext<M>): Promise<MintQuote<M>>;
  validateQuoteForPrepare?(quote: MintQuote<M>): Promise<void> | void;
  prepare(ctx: PrepareContext<M>): Promise<PendingMintOperation<M>>;
  execute(ctx: ExecuteContext$2<M>): Promise<MintExecutionResult>;
  recoverExecuting(ctx: RecoverExecutingContext$2<M>): Promise<RecoverExecutingResult>;
  checkPending(ctx: PendingContext$2<M>): Promise<PendingMintCheckResult<M>>;
}
type MintMethodHandlerRegistry = { [M in MintMethod]: MintMethodHandler<M> };
//#endregion
//#region infra/MintAdapter.d.ts
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
  checkMintQuote<M extends MintMethod>(mintUrl: string, method: M, quoteId: string): Promise<MintMethodQuoteSnapshot<M>>;
  checkMeltQuote(mintUrl: string, quoteId: string): Promise<MeltQuoteBolt11Response>;
  checkMeltQuoteBolt12(mintUrl: string, quoteId: string): Promise<MeltQuoteBolt12Response>;
  checkMeltQuoteOnchain(mintUrl: string, quoteId: string): Promise<MeltQuoteOnchainResponse>;
  checkMeltQuoteState(mintUrl: string, quoteId: string): Promise<MeltQuoteBolt11Response['state']>;
  checkMeltQuoteBolt12State(mintUrl: string, quoteId: string): Promise<MeltQuoteBolt12Response['state']>;
  checkMeltQuoteOnchainState(mintUrl: string, quoteId: string): Promise<MeltQuoteOnchainResponse['state']>;
  checkProofStates(mintUrl: string, Ys: string[]): Promise<_cashu_cashu_ts0.ProofState[]>;
  customMeltBolt11(mintUrl: string, proofsToSend: Proof[], changeOutputs: OutputData[], quoteId: string): Promise<MeltQuoteBolt11Response>;
  customMeltBolt12(mintUrl: string, proofsToSend: Proof[], changeOutputs: OutputData[], quoteId: string): Promise<MeltQuoteBolt12Response>;
  customMeltOnchain(mintUrl: string, proofsToSend: Proof[], changeOutputs: OutputData[], quoteId: string, feeIndex: number): Promise<MeltQuoteOnchainResponse>;
}
//#endregion
//#region services/MintService.d.ts
interface MethodUnitCapability {
  supported: boolean;
  disabled: boolean;
  nut: 4 | 5;
  method: string;
  unit: string;
  minAmount?: Amount$1 | null;
  maxAmount?: Amount$1 | null;
  options?: unknown;
  legacySatAllowed?: boolean;
  reason?: string;
}
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
    mint: Mint;
    keysets: Keyset[];
  }>;
  updateMintData(mintUrl: string): Promise<{
    mint: Mint;
    keysets: Keyset[];
  }>;
  isTrustedMint(mintUrl: string): Promise<boolean>;
  ensureUpdatedMint(mintUrl: string): Promise<{
    mint: Mint;
    keysets: Keyset[];
  }>;
  deleteMint(mintUrl: string): Promise<void>;
  getMintInfo(mintUrl: string): Promise<MintInfo>;
  getMintMethodUnitCapability(mintUrl: string, nut: 4 | 5, method: string, unit: string): Promise<MethodUnitCapability>;
  assertMethodUnitSupported(mintUrl: string, nut: 4 | 5, method: string, scope: string | UnitAmount): Promise<void>;
  getAllMints(): Promise<Mint[]>;
  getAllTrustedMints(): Promise<Mint[]>;
  trustMint(mintUrl: string): Promise<void>;
  untrustMint(mintUrl: string): Promise<void>;
  private getNutMethodSettings;
  private assertMethodCapabilityNut;
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
interface WsConnectionManagerOptions {
  /**
   * If true, don't attempt to reconnect after close/error.
   * Useful when another mechanism (e.g., polling) handles recovery.
   * Default: false
   */
  disableReconnect?: boolean;
}
declare class WsConnectionManager {
  private readonly wsFactory;
  private readonly sockets;
  private readonly isOpenByMint;
  private readonly sendQueueByMint;
  private readonly logger?;
  private readonly listenersByMint;
  private readonly reconnectAttemptsByMint;
  private readonly reconnectTimeoutByMint;
  private readonly options;
  private paused;
  constructor(wsFactory: WebSocketFactory, logger?: Logger, options?: WsConnectionManagerOptions);
  private buildWsUrl;
  private ensureSocket;
  private scheduleReconnect;
  on(mintUrl: string, type: 'open' | 'message' | 'error' | 'close', listener: (event: any) => void): void;
  off(mintUrl: string, type: 'open' | 'message' | 'error' | 'close', listener: (event: any) => void): void;
  send(mintUrl: string, message: unknown): void;
  closeAll(): void;
  closeMint(mintUrl: string): void;
  pause(): void;
  resume(): void;
}
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
  private readonly options;
  private paused;
  constructor(wsFactoryOrManager: WebSocketFactory | RealTimeTransport, mintAdapter: MintAdapter, logger?: Logger, options?: SubscriptionManagerOptions);
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
  amount: Amount$1;
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
  fee_reserve: Amount$1;
  payment_preimage?: string | null;
}
interface OnchainMeltQuote extends MeltQuoteBase<'onchain'> {
  fee_options: MeltQuoteOnchainFeeOption[];
  outpoint?: string;
}
type MeltQuote<M extends MeltMethod = MeltMethod> = M extends 'onchain' ? OnchainMeltQuote : M extends BoltMeltMethod ? BoltMeltQuote<M> : never;
declare function meltQuoteFromBolt11Response(mintUrl: string, quote: MeltQuoteBolt11Response, options?: {
  now?: number;
}): MeltQuote<'bolt11'>;
declare function meltQuoteFromBolt12Response(mintUrl: string, quote: MeltQuoteBolt12Response, options?: {
  now?: number;
}): MeltQuote<'bolt12'>;
declare function meltQuoteFromOnchainResponse(mintUrl: string, quote: MeltQuoteOnchainResponse, options?: {
  now?: number;
}): MeltQuote<'onchain'>;
declare function meltQuoteToMethodSnapshot<M extends MeltMethod>(quote: MeltQuote<M>): MeltMethodQuoteSnapshot<M>;
declare function resolveOnchainMeltFeeOption(quote: MeltQuote<'onchain'>, feeIndex?: number): {
  feeIndex: number;
  feeOption: MeltQuoteOnchainFeeOption;
};
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
  amount: Amount$1;
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
  fee: Amount$1;
  /** Total amount of input proofs selected */
  inputAmount: Amount$1;
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
type PreparedOrLaterOperation = PreparedSendOperation | ExecutingSendOperation | PendingSendOperation | FinalizedSendOperation | RollingBackSendOperation | RolledBackSendOperation;
/**
 * Terminal states - operation is finished
 * Note: 'rolling_back' is NOT terminal - it's a transient state that needs recovery
 */
type TerminalSendOperation = FinalizedSendOperation | RolledBackSendOperation;
declare function isInitOperation(op: SendOperation): op is InitSendOperation;
declare function isPreparedOperation(op: SendOperation): op is PreparedSendOperation;
declare function isExecutingOperation(op: SendOperation): op is ExecutingSendOperation;
declare function isPendingOperation(op: SendOperation): op is PendingSendOperation;
declare function isFinalizedOperation(op: SendOperation): op is FinalizedSendOperation;
declare function isRollingBackOperation(op: SendOperation): op is RollingBackSendOperation;
declare function isRolledBackOperation(op: SendOperation): op is RolledBackSendOperation;
/**
 * Check if operation has PreparedData (any state after init)
 */
declare function hasPreparedData(op: SendOperation): op is PreparedOrLaterOperation;
/**
 * Check if operation is in a terminal state
 */
declare function isTerminalOperation(op: SendOperation): op is TerminalSendOperation;
/**
 * Get the secrets of proofs that will be sent (for finalization tracking).
 * - If needsSwap: secrets come from outputData.send
 * - If !needsSwap: secrets are the inputProofSecrets (exact match)
 */
declare function getSendProofSecrets(op: PreparedOrLaterOperation): string[];
/**
 * Get the secrets of proofs we keep (change from swap).
 * - If needsSwap: secrets come from outputData.keep
 * - If !needsSwap: empty (no change proofs)
 */
declare function getKeepProofSecrets(op: PreparedOrLaterOperation): string[];
interface CreateSendOperationOptions<M extends SendMethod = SendMethod> {
  method: M;
  methodData: SendMethodData<M>;
}
/**
 * Creates a new SendOperation in init state
 */
declare function createSendOperation<M extends SendMethod = SendMethod>(id: string, mintUrl: string, amount: UnitAmount, options: CreateSendOperationOptions<M>): InitSendOperation;
//#endregion
//#region operations/send/SendMethodHandler.d.ts
/**
 * Registry of supported send methods and their payload shapes.
 * Extend via declaration merging if you need to add methods externally.
 *
 * Future methods may include:
 * - htlc: { hash: string; timeout: number } - HTLC locked tokens
 */
interface SendMethodDefinitions {
  default: Record<string, never>;
  p2pk: {
    pubkey: string;
  };
}
type SendMethod = keyof SendMethodDefinitions;
type SendMethodData<M extends SendMethod = SendMethod> = SendMethodDefinitions[M];
interface BaseHandlerDeps {
  proofRepository: ProofRepository;
  proofService: ProofService;
  walletService: WalletService;
  mintService: MintService;
  eventBus: EventBus<CoreEvents>;
  logger?: Logger;
}
interface BasePrepareContext extends BaseHandlerDeps {
  operation: InitSendOperation;
  wallet: Wallet;
}
interface PreparedContext extends BaseHandlerDeps {
  operation: PreparedSendOperation;
  wallet: Wallet;
}
interface ExecuteContext extends BaseHandlerDeps {
  operation: ExecutingSendOperation;
  wallet: Wallet;
  reservedProofs: Proof[];
}
interface PendingContext extends BaseHandlerDeps {
  operation: PendingSendOperation;
  wallet: Wallet;
}
interface FinalizeContext extends BaseHandlerDeps {
  operation: PendingSendOperation;
}
interface RollbackContext extends BaseHandlerDeps {
  operation: PreparedOrLaterOperation;
  wallet: Wallet;
}
interface RecoverExecutingContext extends BaseHandlerDeps {
  operation: ExecutingSendOperation;
  wallet: Wallet;
}
type ExecutionResult = {
  status: 'PENDING';
  pending: PendingSendOperation;
  token?: Token;
} | {
  status: 'FAILED';
  failed: RolledBackSendOperation;
};
type PendingCheckResult = 'finalize' | 'stay_pending' | 'rollback';
interface SendMethodHandler<M extends SendMethod = SendMethod> {
  prepare(ctx: BasePrepareContext): Promise<PreparedSendOperation>;
  execute(ctx: ExecuteContext): Promise<ExecutionResult>;
  finalize?(ctx: FinalizeContext): Promise<void>;
  rollback?(ctx: RollbackContext): Promise<void>;
  checkPending?(ctx: PendingContext): Promise<PendingCheckResult>;
  /**
   * Recover an executing operation that failed mid-execution.
   * Handlers must implement this method to handle recovery logic.
   */
  recoverExecuting(ctx: RecoverExecutingContext): Promise<ExecutionResult>;
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
  constructor(deps: QuoteLifecycleDeps);
  private buildDeps;
  createMintQuote(mintUrl: string, intent: UnitAmount, method?: 'bolt11'): Promise<MintQuote>;
  createMintQuote<M extends MintMethod>(mintUrl: string, method: M, createQuoteData: MintMethodCreateQuoteData<M>): Promise<MintQuote<M>>;
  getMintQuote(mintUrl: string, method: MintMethod, quoteId: string): Promise<MintQuote | null>;
  getPendingMintQuotes(method?: MintMethod): Promise<MintQuote[]>;
  refreshMintQuote(mintUrl: string, method: MintMethod, quoteId: string): Promise<MintQuote>;
  requireMintQuoteForPrepare(mintUrl: string, method: MintMethod, quoteId: string, expectedUnit?: string): Promise<MintQuote>;
  loadMintQuoteSnapshotForOperation(op: InitMintOperation): Promise<MintMethodQuoteSnapshot>;
  importMintQuote<M extends MintMethod>(mintUrl: string, method: M, quote: MintMethodQuoteSnapshot<M>): Promise<MintQuote<M>>;
  private resolveAndPersistMintQuoteSnapshot;
  recordMintQuoteSnapshot(mintUrl: string, method: MintMethod, snapshot: MintMethodQuoteSnapshot): Promise<MintQuote>;
  recordMintQuoteObservation(operation: PendingOrLaterOperation, state: MintMethodRemoteState, observedAt?: number): Promise<MintQuote>;
  createMeltQuote(mintUrl: string, method: MeltMethod, methodData: MeltMethodInputData, unit?: string): Promise<MeltQuote>;
  getMeltQuote(mintUrl: string, method: MeltMethod, quoteId: string): Promise<MeltQuote | null>;
  getPendingMeltQuotes(method?: MeltMethod): Promise<MeltQuote[]>;
  refreshMeltQuote(mintUrl: string, method: MeltMethod, quoteId: string): Promise<MeltQuote>;
  requireMeltQuoteForPrepare(mintUrl: string, method: MeltMethod, quoteId: string, expectedUnit?: string): Promise<MeltQuote>;
  loadMeltQuoteSnapshotForOperation(op: InitMeltOperation): Promise<MeltMethodQuoteSnapshot>;
  private persistCanonicalMintQuote;
  private emitMintQuoteUpdatedIfNeeded;
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
  prepare(mintUrl: string, method: MintMethod, quoteId: string, methodData?: MintMethodData, expectedUnit?: string, explicitAmount?: UnitAmount): Promise<PendingMintOperation>;
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
  /** @internal Used by the mint operation processor to suppress no-op reusable quote claims. */
  hasLocallyClaimableMintQuoteBalance(mintUrl: string, method: MintMethod, quoteId: string): Promise<boolean>;
  private claimReusableQuoteOperation;
  private createAutoClaimOperation;
  private getLocallyClaimableQuoteAmount;
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
//#region logging/ConsoleLogger.d.ts
type ConsoleLoggerOptions = {
  level?: LogLevel;
};
declare class ConsoleLogger implements Logger {
  private prefix;
  private level;
  private static readonly levelPriority;
  constructor(prefix?: string, options?: ConsoleLoggerOptions);
  private shouldLog;
  error(message: string, ...meta: unknown[]): void;
  warn(message: string, ...meta: unknown[]): void;
  info(message: string, ...meta: unknown[]): void;
  debug(message: string, ...meta: unknown[]): void;
  log(level: LogLevel, message: string, ...meta: unknown[]): void;
  child(bindings: Record<string, unknown>): Logger;
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
 * This error is thrown when a HTTP response is not 2XX nor a protocol error.
 */
declare class HttpResponseError extends Error {
  status: number;
  constructor(message: string, status: number);
}
/**
 * This error is thrown when a network request fails.
 */
declare class NetworkError extends Error {
  constructor(message: string);
}
/**
 * This error is thrown when a protocol error occurs per Cashu NUT-00 error codes.
 */
declare class MintOperationError extends HttpResponseError {
  code: number;
  constructor(code: number, detail: string);
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
//#region operations/send/SendOperationService.d.ts
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
   *
   * If execution fails after transitioning to 'executing' state,
   * automatically attempts to recover the operation.
   * Throws if the operation is already in progress.
   *
   * Delegates to the appropriate handler based on the operation method.
   */
  execute(operation: PreparedSendOperation): Promise<{
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
  private recoverRollingBackOperation;
  private retryRollback;
  private forceFailRollingBack;
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
type PaymentRequestTransport = InbandPaymentRequestTransport | HttpPaymentRequestTransport | NostrPaymentRequestTransport;
type ResolvedPaymentRequest = {
  paymentRequest: PaymentRequest;
  payableMints: string[];
  allowedMints: string[];
  amount?: Amount$1;
  unit: string;
  transport: PaymentRequestTransport;
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
type InbandTransport = InbandPaymentRequestTransport;
type HttpTransport = HttpPaymentRequestTransport;
type NostrTransport = NostrPaymentRequestTransport;
type Transport = PaymentRequestTransport;
declare class PaymentRequestService {
  private readonly sendOperationService;
  private readonly proofService;
  private readonly logger?;
  constructor(sendOperationService: SendOperationService, proofService: ProofService, logger?: Logger);
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
  amount: Amount$1;
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
  fee: Amount$1;
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
  constructor(receiveOperationRepository: ReceiveOperationRepository, proofRepository: ProofRepository, proofService: ProofService, mintService: MintService, walletService: WalletService, mintAdapter: MintAdapter, tokenService: TokenService, eventBus: EventBus<CoreEvents>, logger?: Logger);
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
  amount: Amount$1;
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
  grossAmount: Amount$1;
  fee?: Amount$1;
  netAmount?: Amount$1;
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
  amount: Amount$1;
  unit: string;
  mints: string[];
  description?: string;
  singleUse: boolean;
}
interface PaymentRequestReceiveTransportHandler {
  readonly type: Exclude<PaymentRequestReceiveTransport, 'inband'>;
  createRequestTransport?(input: PaymentRequestReceiveTransportCreateInput): Promise<PaymentRequestTransport$1> | PaymentRequestTransport$1;
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
type CashuPaymentRequestTransportInput = PaymentRequestTransport$1 | {
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
  private readonly restoreBatchSize;
  private readonly restoreGapLimit;
  private readonly restoreStartCounter;
  constructor(proofService: ProofService, counterService: CounterService, walletService: WalletService, requestProvider: MintRequestProvider, logger?: Logger);
  sweepKeyset(mintUrl: string, keysetId: string, bip39seed: Uint8Array, unit?: string): Promise<void>;
  /**
   * Restore and persist proofs for a single keyset.
   * Enforces the invariant: restored proofs must be >= previously stored proofs.
   * Throws on any validation or persistence error. No transactions are used here.
   */
  restoreKeyset(mintUrl: string, wallet: Wallet, keysetId: string, unit?: string): Promise<void>;
}
//#endregion
//#region services/watchers/MintOperationWatcherService.d.ts
interface MintOperationWatcherOptions {
  watchExistingPendingOnStart?: boolean;
  watchExistingPendingQuotesOnStart?: boolean;
}
declare class MintOperationWatcherService {
  private readonly subs;
  private readonly mintService;
  private readonly mintOperations;
  private readonly quoteLifecycle;
  private readonly bus;
  private readonly logger?;
  private readonly options;
  private running;
  private watchRecordByKey;
  private keyByOperationId;
  private offQuoteUpdated?;
  private offPending?;
  private offExecuting?;
  private offFinalized?;
  private offUntrusted?;
  constructor(subs: SubscriptionManager, mintService: MintService, mintOperations: MintOperationService, quoteLifecycle: QuoteLifecycle, bus: EventBus<CoreEvents>, logger?: Logger, options?: MintOperationWatcherOptions);
  isRunning(): boolean;
  start(): Promise<void>;
  stop(): Promise<void>;
  private watchOperations;
  private watchMintQuotes;
  private getPolicy;
  private ensureWatchRecord;
  private addInterest;
  private handleSubscriptionPayload;
  private findRecordForPayload;
  private stopWatching;
  private stopWatchingOperation;
  private shouldStopWatchingWithoutInterest;
  private removeWatchRecord;
  stopWatchingMint(mintUrl: string): Promise<void>;
}
//#endregion
//#region services/watchers/MintOperationProcessor.d.ts
interface OperationHandler {
  process(mintUrl: string, operationId: string): Promise<void>;
}
interface MintOperationProcessorOptions {
  processIntervalMs?: number;
  maxRetries?: number;
  baseRetryDelayMs?: number;
  initialEnqueueDelayMs?: number;
  autoClaimMintQuotes?: boolean;
}
declare class MintOperationProcessor {
  private readonly mintOperations;
  private readonly quoteLifecycle;
  private readonly bus;
  private readonly logger?;
  private running;
  private queue;
  private processing;
  private processingTimer?;
  private offQuoteUpdated?;
  private offPending?;
  private offRequeue?;
  private offUntrusted?;
  private claimingQuotes;
  private claimTasks;
  private handlers;
  private readonly processIntervalMs;
  private readonly maxRetries;
  private readonly baseRetryDelayMs;
  private readonly initialEnqueueDelayMs;
  private readonly autoClaimMintQuotes;
  constructor(mintOperations: MintOperationService, quoteLifecycle: QuoteLifecycle, bus: EventBus<CoreEvents>, logger?: Logger, options?: MintOperationProcessorOptions);
  registerHandler(method: string, handler: OperationHandler): void;
  isRunning(): boolean;
  start(): Promise<void>;
  stop(): Promise<void>;
  /**
   * Wait for the queue to be empty and all processing to complete.
   * Useful for CLI applications that want to ensure all queued operations are processed before exiting.
   */
  waitForCompletion(): Promise<void>;
  /**
   * Remove all queued items for a specific mint.
   * Called when a mint is untrusted to stop processing its operations.
   */
  clearMintFromQueue(mintUrl: string): void;
  private enqueue;
  private scheduleNextProcess;
  private scheduleQuoteClaim;
  private schedulePendingQuoteClaims;
  private processNext;
  private processItem;
  private handleProcessingError;
}
//#endregion
//#region services/watchers/ProofStateWatcherService.d.ts
interface ProofStateWatcherOptions {
  watchExistingInflightOnStart?: boolean;
}
declare class ProofStateWatcherService {
  private readonly subs;
  private readonly mintService;
  private readonly proofs;
  private readonly proofRepository;
  private readonly bus;
  private readonly logger?;
  private readonly options;
  private sendOperationService?;
  private running;
  private unsubscribeByKey;
  private inflightByKey;
  private offProofsStateChanged?;
  private offProofsSaved?;
  private offUntrusted?;
  constructor(subs: SubscriptionManager, mintService: MintService, proofs: ProofService, proofRepository: ProofRepository, bus: EventBus<CoreEvents>, logger?: Logger, options?: ProofStateWatcherOptions);
  /**
   * Set the SendOperationService for auto-finalizing send operations.
   * This is set after construction to avoid circular dependencies.
   */
  setSendOperationService(service: SendOperationService): void;
  isRunning(): boolean;
  start(): Promise<void>;
  stop(): Promise<void>;
  watchProof(mintUrl: string, secrets: string[]): Promise<void>;
  private bootstrapInflightProofs;
  private stopWatching;
  stopWatchingMint(mintUrl: string): Promise<void>;
  /**
   * Check if a spent proof is part of a send operation and finalize it if all send proofs are spent.
   */
  private tryFinalizeSendOperation;
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
  init(mintUrl: string, method: MeltMethod, methodData: MeltMethodInputData, unit?: string, options?: {
    quoteId?: string;
  }): Promise<InitMeltOperation>;
  private createQuoteBoundInitOperation;
  private getTrackedOperationForQuote;
  prepareExistingQuote(mintUrl: string, method: MeltMethod, quoteId: string, options?: {
    expectedUnit?: string;
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
  finalize(operationId: string): Promise<FinalizeResult>;
  rollback(operationId: string, reason?: string): Promise<void>;
  /**
   * Recover pending operations on startup.
   * This should be called during initialization.
   * Throws if recovery is already in progress.
   */
  recoverPendingOperations(): Promise<void>;
  private recoverRollingBackOperation;
  checkPendingOperation(operationId: string): Promise<PendingCheckResult$1>;
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
  listOperationsByQuote(mintUrl: string, quoteId: string): Promise<MeltOperation[]>;
  getPendingOperations(): Promise<MeltOperation[]>;
  getPreparedOperations(): Promise<PreparedMeltOperation[]>;
}
//#endregion
//#region events/types.d.ts
interface CoreEvents {
  'mint:added': {
    mint: Mint;
    keysets: Keyset[];
  };
  'mint:updated': {
    mint: Mint;
    keysets: Keyset[];
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
  /** Emitted when send operation is executed (token created) this one should be cleaned up in the future */
  'send:created': {
    mintUrl: string;
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
    operation: MintOperation;
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
  constructor(counterService: CounterService, proofRepository: ProofRepository, walletService: WalletService, mintService: MintService, keyRingService: KeyRingService, seedService: SeedService, logger?: Logger, eventBus?: EventBus<CoreEvents>);
  /**
   * Calculates the send amount including receiver fees.
   * This is used when the sender pays fees for the receiver.
   */
  calculateSendAmountWithFees(mintUrl: string, intent: UnitAmount): Promise<Amount$1>;
  checkInflightProofs(): Promise<void>;
  createOutputsAndIncrementCounters(mintUrl: string, amount: {
    keep: UnitAmount;
    send: UnitAmount;
  }, options?: {
    includeFees?: boolean;
  }): Promise<{
    keep: OutputData[];
    send: OutputData[];
    sendAmount: Amount$1;
    keepAmount: Amount$1;
  }>;
  saveProofs(mintUrl: string, proofs: CoreProof[]): Promise<void>;
  getReadyProofs(mintUrl: string, filter?: ProofUnitFilter): Promise<CoreProof[]>;
  getAllReadyProofs(filter?: ProofUnitFilter): Promise<CoreProof[]>;
  /**
   * Gets the total balance for a single mint.
   * @param mintUrl - The URL of the mint
   * @returns The total balance for the mint
   */
  getBalance(mintUrl: string): Promise<Amount$1>;
  /**
   * Gets the spendable balance for a single mint.
   * @param mintUrl - The URL of the mint
   * @returns The spendable balance for the mint
   */
  getSpendableBalance(mintUrl: string): Promise<Amount$1>;
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
    [mintUrl: string]: Amount$1;
  }>;
  /**
   * Gets spendable balances for all mints.
   * @returns An object mapping mint URLs to their spendable balances
   */
  getSpendableBalances(): Promise<{
    [mintUrl: string]: Amount$1;
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
    [mintUrl: string]: Amount$1;
  }>;
  /**
   * Gets spendable balances for trusted mints only.
   * @returns An object mapping trusted mint URLs to their spendable balances
   */
  getTrustedSpendableBalances(): Promise<{
    [mintUrl: string]: Amount$1;
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
  /**
   * Reclaim proofs that are still unspent on the mint.
   * Checks proof states via mint API, then swaps unspent ones back to new proofs.
   * This is the CDK-inspired recovery primitive for deterministic crash recovery.
   *
   * Returns the number of proofs successfully reclaimed.
   */
  reclaimUnspent(mintUrl: string, secrets: string[], unit?: string): Promise<{
    reclaimed: number;
    spent: number;
    unreachable: boolean;
  }>;
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
  createBlankOutputs(mintUrl: string, intent: UnitAmount): Promise<OutputData[]>;
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
  unblindAndSaveChangeProofs(mintUrl: string, outputData: OutputData[], changeSignatures: SerializedBlindedSignature[], options: {
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
    amountSats?: AmountLike$1;
  };
  bolt12: {
    offer: string;
    amountSats?: AmountLike$1;
  };
  onchain: {
    address: string;
    amountSats: AmountLike$1;
  };
}
/**
 * Registry of supported melt methods and their normalized operation payload shapes.
 * Amount values are normalized at the operation boundary.
 */
interface MeltMethodDefinitions {
  bolt11: {
    invoice: string;
    amountSats?: Amount$1;
  };
  bolt12: {
    offer: string;
    amountSats?: Amount$1;
  };
  onchain: {
    address: string;
    amountSats: Amount$1;
    feeIndex?: number;
  };
}
type MeltMethod = keyof MeltMethodDefinitions;
type MeltMethodData<M extends MeltMethod = MeltMethod> = MeltMethodDefinitions[M];
interface MeltMethodQuoteDefinitions {
  bolt11: MeltQuoteBolt11Response;
  bolt12: MeltQuoteBolt12Response;
  onchain: MeltQuoteOnchainResponse;
}
type MeltMethodInputData<M extends MeltMethod = MeltMethod> = M extends keyof MeltMethodInputDefinitions ? MeltMethodInputDefinitions[M] : never;
type MeltMethodRemoteState<M extends MeltMethod = MeltMethod> = MeltMethodQuoteDefinitions[M]['state'];
type MeltMethodQuoteSnapshot<M extends MeltMethod = MeltMethod> = MeltMethodQuoteDefinitions[M];
interface MeltMethodMeta<M extends MeltMethod = MeltMethod> {
  method: M;
  methodData: MeltMethodData<M>;
}
declare function normalizeMeltMethodData<M extends MeltMethod>(methodData: MeltMethodInputData<M> | MeltMethodData<M>): MeltMethodData<M>;
interface BaseHandlerDeps$1 {
  proofRepository: ProofRepository;
  proofService: ProofService;
  walletService: WalletService;
  mintService: MintService;
  mintAdapter: MintAdapter;
  eventBus: EventBus<CoreEvents>;
  logger?: Logger;
}
interface CreateMeltQuoteContext<M extends MeltMethod = MeltMethod> extends BaseHandlerDeps$1 {
  mintUrl: string;
  methodData: MeltMethodData<M>;
  unit: string;
  wallet: Wallet;
}
interface FetchRemoteMeltQuoteContext<M extends MeltMethod = MeltMethod> extends BaseHandlerDeps$1 {
  quote: MeltQuote<M>;
}
interface BasePrepareContext$1<M extends MeltMethod = MeltMethod> extends BaseHandlerDeps$1 {
  operation: InitMeltOperation & MeltMethodMeta<M>;
  wallet: Wallet;
  quote: MeltMethodQuoteSnapshot<M>;
}
interface ExecuteContext$1<M extends MeltMethod = MeltMethod> extends BaseHandlerDeps$1 {
  operation: ExecutingMeltOperation & MeltMethodMeta<M>;
  wallet: Wallet;
  reservedProofs: Proof[];
}
interface PendingContext$1<M extends MeltMethod = MeltMethod> extends BaseHandlerDeps$1 {
  operation: PendingMeltOperation & MeltMethodMeta<M>;
  wallet: Wallet;
}
interface FinalizeContext$1<M extends MeltMethod = MeltMethod> extends BaseHandlerDeps$1 {
  operation: PendingMeltOperation & MeltMethodMeta<M>;
}
type FinalizeResult<M extends MeltMethod = MeltMethod> = {
  /** Total amount returned as change by the mint */changeAmount?: Amount$1; /** Actual fee impact after settlement */
  effectiveFee?: Amount$1; /** Method-specific data that may be available once settlement completes */
  finalizedData?: MeltMethodFinalizedData<M>;
};
interface RollbackContext$1<M extends MeltMethod = MeltMethod> extends BaseHandlerDeps$1 {
  operation: PreparedOrLaterOperation$1 & MeltMethodMeta<M>;
  wallet: Wallet;
}
interface RecoverExecutingContext$1<M extends MeltMethod = MeltMethod> extends BaseHandlerDeps$1 {
  operation: ExecutingMeltOperation & MeltMethodMeta<M>;
  wallet: Wallet;
}
type ExecutionResult$1<M extends MeltMethod = MeltMethod> = {
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
type PendingCheckResult$1 = 'finalize' | 'stay_pending' | 'rollback';
interface MeltMethodHandler<M extends MeltMethod = MeltMethod> {
  createQuote(ctx: CreateMeltQuoteContext<M>): Promise<MeltQuote<M>>;
  fetchRemoteQuote(ctx: FetchRemoteMeltQuoteContext<M>): Promise<MeltQuote<M>>;
  prepare(ctx: BasePrepareContext$1<M>): Promise<PreparedMeltOperation & MeltMethodMeta<M>>;
  execute(ctx: ExecuteContext$1<M>): Promise<ExecutionResult$1<M>>;
  finalize?(ctx: FinalizeContext$1<M>): Promise<FinalizeResult<M>>;
  rollback?(ctx: RollbackContext$1<M>): Promise<void>;
  checkPending?(ctx: PendingContext$1<M>): Promise<PendingCheckResult$1>;
  /**
   * Recover an executing operation that failed mid-execution.
   * Handlers must implement this method to handle recovery logic.
   */
  recoverExecuting(ctx: RecoverExecutingContext$1<M>): Promise<ExecutionResult$1<M>>;
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
  amount: Amount$1;
  /** Calculated fee for the swap (0 if exact match) */
  fee_reserve: Amount$1;
  /** The ID of the quote used for the melt operation */
  quoteId: string;
  /** The fee for the swap (0 if exact match) */
  swap_fee: Amount$1;
  /** Total amount of input proofs selected */
  inputAmount: Amount$1;
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
  changeAmount?: Amount$1;
  /**
   * Actual fee impact after settlement.
   * Calculated as: inputAmount - amount - changeAmount
   * (total input proofs value - melt amount - change returned)
   * This represents the actual cost paid for the melt, which may differ from fee_reserve.
   * May be undefined for legacy operations finalized before settlement tracking was added.
   */
  effectiveFee?: Amount$1;
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
type PreparedOrLaterOperation$1 = PreparedMeltOperation | ExecutingMeltOperation | PendingMeltOperation | FinalizedMeltOperation | FailedMeltOperation | RollingBackMeltOperation | RolledBackMeltOperation;
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
  amount: Amount$1;
  remoteState?: string;
};
type MeltHistoryEntry = OperationHistoryBase & {
  type: 'melt';
  quoteId: string;
  state: MeltHistoryState;
  amount: Amount$1;
};
type SendHistoryEntry = OperationHistoryBase & {
  type: 'send';
  amount: Amount$1;
  state: SendHistoryState; /** Token is only available after execute (state >= pending) */
  token?: Token;
};
type ReceiveHistoryEntry = OperationHistoryBase & {
  type: 'receive';
  amount: Amount$1;
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
  amount: Amount$1;
};
type LegacyMeltHistoryEntry = LegacyHistoryBase & {
  type: 'melt';
  quoteId: string;
  state: LegacyMeltHistoryState;
  amount: Amount$1;
};
type LegacySendHistoryEntry = LegacyHistoryBase & {
  type: 'send';
  amount: Amount$1;
  state: LegacySendHistoryState;
  token?: Token;
};
type LegacyReceiveHistoryEntry = LegacyHistoryBase & {
  type: 'receive';
  amount: Amount$1;
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
  amount: Amount$1;
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
//#region repositories/memory/MemoryAuthSessionRepository.d.ts
declare class MemoryAuthSessionRepository implements AuthSessionRepository {
  private readonly sessions;
  getSession(mintUrl: string): Promise<AuthSession | null>;
  saveSession(session: AuthSession): Promise<void>;
  deleteSession(mintUrl: string): Promise<void>;
  getAllSessions(): Promise<AuthSession[]>;
}
//#endregion
//#region repositories/memory/MemoryCounterRepository.d.ts
declare class MemoryCounterRepository implements CounterRepository {
  private counters;
  private key;
  getCounter(mintUrl: string, keysetId: string): Promise<Counter | null>;
  setCounter(mintUrl: string, keysetId: string, counter: number): Promise<void>;
}
//#endregion
//#region repositories/memory/MemoryMeltOperationRepository.d.ts
declare class MemoryMeltOperationRepository implements MeltOperationRepository {
  private readonly operations;
  create(operation: MeltOperation): Promise<void>;
  update(operation: MeltOperation): Promise<void>;
  getById(id: string): Promise<MeltOperation | null>;
  getByState(state: MeltOperationState): Promise<MeltOperation[]>;
  getPending(): Promise<MeltOperation[]>;
  getByMintUrl(mintUrl: string): Promise<MeltOperation[]>;
  getByQuoteId(mintUrl: string, quoteId: string): Promise<MeltOperation[]>;
  getAll(): Promise<MeltOperation[]>;
  delete(id: string): Promise<void>;
  private assertNoDuplicateQuoteOperation;
}
//#endregion
//#region repositories/memory/MemoryMintOperationRepository.d.ts
declare class MemoryMintOperationRepository implements MintOperationRepository {
  private readonly operations;
  create(operation: MintOperation): Promise<void>;
  update(operation: MintOperation): Promise<void>;
  getById(id: string): Promise<MintOperation | null>;
  getByState(state: MintOperationState): Promise<MintOperation[]>;
  getPending(): Promise<MintOperation[]>;
  getByMintUrl(mintUrl: string): Promise<MintOperation[]>;
  getByQuoteId(mintUrl: string, method: string, quoteId: string): Promise<MintOperation[]>;
  getAll(): Promise<MintOperation[]>;
  delete(id: string): Promise<void>;
}
//#endregion
//#region repositories/memory/MemoryReceiveOperationRepository.d.ts
declare class MemoryReceiveOperationRepository implements ReceiveOperationRepository {
  private readonly operations;
  create(operation: ReceiveOperation): Promise<void>;
  update(operation: ReceiveOperation): Promise<void>;
  getById(id: string): Promise<ReceiveOperation | null>;
  getByState(state: ReceiveOperationState): Promise<ReceiveOperation[]>;
  getPending(): Promise<ReceiveOperation[]>;
  getByMintUrl(mintUrl: string): Promise<ReceiveOperation[]>;
  getByPaymentRequestAttemptId(attemptId: string): Promise<ReceiveOperation | null>;
  getAll(): Promise<ReceiveOperation[]>;
  delete(id: string): Promise<void>;
}
//#endregion
//#region repositories/memory/MemorySendOperationRepository.d.ts
declare class MemorySendOperationRepository implements SendOperationRepository {
  private readonly operations;
  create(operation: SendOperation): Promise<void>;
  update(operation: SendOperation): Promise<void>;
  getById(id: string): Promise<SendOperation | null>;
  getByState(state: SendOperationState): Promise<SendOperation[]>;
  getPending(): Promise<SendOperation[]>;
  getByMintUrl(mintUrl: string): Promise<SendOperation[]>;
  getAll(): Promise<SendOperation[]>;
  delete(id: string): Promise<void>;
}
//#endregion
//#region repositories/memory/MemoryHistoryRepository.d.ts
type OperationRepositories = {
  sendOperationRepository?: MemorySendOperationRepository;
  meltOperationRepository?: MemoryMeltOperationRepository;
  mintOperationRepository?: MemoryMintOperationRepository;
  mintQuoteRepository?: MintQuoteRepository;
  receiveOperationRepository?: MemoryReceiveOperationRepository;
};
declare class MemoryHistoryRepository implements HistoryProjectionRepository {
  private readonly operationRepositories;
  private readonly legacyEntries;
  constructor(operationRepositories?: OperationRepositories);
  getPaginatedHistoryEntries(limit: number, offset: number): Promise<HistoryEntry[]>;
  getHistoryEntryById(id: string): Promise<HistoryEntry | null>;
  addLegacyHistoryEntry(history: LegacyHistoryRowInput): Promise<LegacyHistoryEntry>;
  getSendHistoryEntry(mintUrl: string, operationId: string): Promise<SendHistoryEntry | null>;
  getReceiveHistoryEntry(mintUrl: string, operationId: string): Promise<ReceiveHistoryEntry | null>;
  private getProjectedEntries;
  private getOperationEntries;
  private projectOperationById;
  private projectMintOperation;
  private dedupeLegacyEntries;
  private operationKey;
  private quoteKey;
}
//#endregion
//#region repositories/memory/MemoryKeyRingRepository.d.ts
declare class MemoryKeyRingRepository implements KeyRingRepository {
  private keyPairs;
  private insertionOrder;
  getPersistedKeyPair(publicKey: string, purpose?: KeypairPurpose): Promise<Keypair | null>;
  setPersistedKeyPair(keyPair: Keypair): Promise<void>;
  deletePersistedKeyPair(publicKey: string, purpose?: KeypairPurpose): Promise<void>;
  getAllPersistedKeyPairs(purpose?: KeypairPurpose): Promise<Keypair[]>;
  getLatestKeyPair(purpose?: KeypairPurpose): Promise<Keypair | null>;
  getLastDerivationIndex(purpose?: KeypairPurpose): Promise<number>;
}
//#endregion
//#region repositories/memory/MemoryKeysetRepository.d.ts
declare class MemoryKeysetRepository implements KeysetRepository {
  private keysetsByMint;
  private getMintMap;
  getKeysetsByMintUrl(mintUrl: string): Promise<Keyset[]>;
  getKeysetById(mintUrl: string, id: string): Promise<Keyset | null>;
  updateKeyset(keyset: Omit<Keyset, 'keypairs' | 'updatedAt'>): Promise<void>;
  addKeyset(keyset: Omit<Keyset, 'updatedAt'>): Promise<void>;
  deleteKeyset(mintUrl: string, keysetId: string): Promise<void>;
}
//#endregion
//#region repositories/memory/MemoryMintQuoteRepository.d.ts
declare class MemoryMintQuoteRepository implements MintQuoteRepository {
  private readonly quotes;
  private makeKey;
  getMintQuote(mintUrl: string, method: string, quoteId: string): Promise<MintQuote | null>;
  upsertMintQuote(quote: MintQuote): Promise<void>;
  setMintQuoteState(mintUrl: string, method: string, quoteId: string, state: MintMethodRemoteState, observedAt?: number): Promise<void>;
  getPendingMintQuotes(method?: string): Promise<MintQuote[]>;
}
//#endregion
//#region repositories/memory/MemoryLegacyMintQuoteRepository.d.ts
declare class MemoryLegacyMintQuoteRepository implements LegacyMintQuoteRepository {
  private readonly quotes;
  private makeKey;
  upsertMintQuote(quote: MintQuote): Promise<void>;
  getPendingLegacyMintQuotes(mintUrl?: string): Promise<MintQuote[]>;
}
//#endregion
//#region repositories/memory/MemoryMintRepository.d.ts
declare class MemoryMintRepository implements MintRepository {
  private mints;
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
//#region repositories/memory/MemoryProofRepository.d.ts
declare class MemoryProofRepository implements ProofRepository {
  private proofsByMint;
  private getMintMap;
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
//#region repositories/memory/MemoryMeltQuoteRepository.d.ts
declare class MemoryMeltQuoteRepository implements MeltQuoteRepository {
  private readonly quotes;
  private makeKey;
  getMeltQuote(mintUrl: string, method: string, quoteId: string): Promise<MeltQuote | null>;
  upsertMeltQuote(quote: MeltQuote): Promise<void>;
  getPendingMeltQuotes(method?: string): Promise<MeltQuote[]>;
}
//#endregion
//#region repositories/memory/MemoryPaymentRequestReceiveRepository.d.ts
declare class MemoryPaymentRequestReceiveOperationRepository implements PaymentRequestReceiveOperationRepository {
  private readonly operations;
  create(operation: PaymentRequestReceiveOperation): Promise<void>;
  update(operation: PaymentRequestReceiveOperation): Promise<void>;
  getById(id: string): Promise<PaymentRequestReceiveOperation | null>;
  getByState(state: PaymentRequestReceiveState): Promise<PaymentRequestReceiveOperation[]>;
  getActiveByRequestId(requestId: string): Promise<PaymentRequestReceiveOperation[]>;
  list(filter?: {
    state?: PaymentRequestReceiveState;
  }): Promise<PaymentRequestReceiveOperation[]>;
}
declare class MemoryPaymentRequestReceiveAttemptRepository implements PaymentRequestReceiveAttemptRepository {
  private readonly attempts;
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
//#region repositories/index.d.ts
interface ProofUnitFilter {
  unit?: string;
  units?: string[];
}
interface MintRepository {
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
interface MintQuoteRepository {
  getMintQuote(mintUrl: string, method: string, quoteId: string): Promise<MintQuote | null>;
  upsertMintQuote(quote: MintQuote): Promise<void>;
  setMintQuoteState(mintUrl: string, method: string, quoteId: string, state: MintMethodRemoteState, observedAt?: number): Promise<void>;
  getPendingMintQuotes(method?: string): Promise<MintQuote[]>;
}
interface LegacyMintQuoteRepository {
  getPendingLegacyMintQuotes(mintUrl?: string): Promise<MintQuote[]>;
}
interface MeltQuoteRepository {
  getMeltQuote(mintUrl: string, method: string, quoteId: string): Promise<MeltQuote | null>;
  upsertMeltQuote(quote: MeltQuote): Promise<void>;
  getPendingMeltQuotes(method?: string): Promise<MeltQuote[]>;
}
interface KeyRingRepository {
  getPersistedKeyPair(publicKey: string, purpose?: KeypairPurpose): Promise<Keypair | null>;
  setPersistedKeyPair(keyPair: Keypair): Promise<void>;
  deletePersistedKeyPair(publicKey: string, purpose?: KeypairPurpose): Promise<void>;
  getAllPersistedKeyPairs(purpose?: KeypairPurpose): Promise<Keypair[]>;
  getLatestKeyPair(purpose?: KeypairPurpose): Promise<Keypair | null>;
  getLastDerivationIndex(purpose?: KeypairPurpose): Promise<number>;
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
type RepositoryTransactionScope = RepositoriesBase;
//#endregion
//#region api/WalletBalancesApi.d.ts
declare class WalletBalancesApi {
  private readonly proofService;
  constructor(proofService: ProofService);
  byMint(scope?: BalanceQuery): Promise<BalancesByMint>;
  byMintAndUnit(scope?: BalanceQuery): Promise<BalancesByMintAndUnit>;
  byUnit(scope?: BalanceQuery): Promise<BalancesByUnit>;
  total(scope?: BalanceQuery): Promise<BalanceSnapshot>;
  totalByUnit(scope?: BalanceQuery): Promise<BalancesByUnit>;
}
//#endregion
//#region api/WalletApi.d.ts
interface WalletRestoreOptions {
  /**
   * Optional unit filter. Units are normalized to lowercase.
   * Omit this to restore every keyset unit known by the mint.
   */
  units?: string[];
}
interface WalletSweepOptions {
  /**
   * Optional unit filter. Units are normalized to lowercase.
   * Omit this to sweep every keyset unit known by the mint.
   */
  units?: string[];
}
declare class WalletApi {
  private mintService;
  private walletService;
  private proofService;
  private walletRestoreService;
  private receiveOperationService;
  private readonly tokenService;
  private readonly logger?;
  readonly balances: WalletBalancesApi;
  constructor(mintService: MintService, walletService: WalletService, proofService: ProofService, walletRestoreService: WalletRestoreService, receiveOperationService: ReceiveOperationService, tokenService: TokenService, logger?: Logger);
  /**
   * Receive a token in one shot.
   *
   * For a multi-step receive flow (review fees/amounts before committing),
   * use `manager.ops.receive.prepare()` and `manager.ops.receive.execute()`.
   */
  receive(token: Token | string): Promise<void>;
  restore(mintUrl: string, options?: WalletRestoreOptions): Promise<void>;
  /**
   * Sweeps a mint by sweeping each keyset and adds the swept proofs to the wallet
   * @param mintUrl - The URL of the mint to sweep
   * @param bip39seed - The BIP39 seed of the wallet to sweep
   */
  sweep(mintUrl: string, bip39seed: Uint8Array, options?: WalletSweepOptions): Promise<void>;
  /**
   * Decode a token string into a Token object.
   * If mintUrl is provided, decodes token with mint keysets (supports all token formats).
   * If no mintUrl, attempts to decode using wallet's known keysets (may fail for some token formats).
   *
   * Note: For reliable decoding of all token formats, provide a mintUrl.
   *
   * @param tokenString - The encoded token string to decode
   * @param mintUrl - Optional mint URL to use for decoding (provides access to mint keysets for decoding)
   * @returns The decoded Token or array of Proofs
   */
  decodeToken(tokenString: string, mintUrl?: string): Promise<Token>;
  /**
   * Encode a token to a string.
   * @param token - The token to encode
   * @param opts - Optional encoding options
   * @returns Encoded token string
   */
  encodeToken(token: Token, opts?: {
    removeDleq?: boolean;
  }): string;
  /**
   * Encode a PaymentRequest to a string.
   * @param paymentRequest - The PaymentRequest to encode
   * @param version - Encoding version ('creqA' for base64 text, 'creqB' for bech32m binary). Defaults to 'creqA'.
   * @returns Encoded payment request string
   */
  encodePaymentRequest(paymentRequest: PaymentRequest, version?: 'creqA' | 'creqB'): string;
  private getUnitFilter;
  private getUnitScopedKeysets;
}
//#endregion
//#region api/MintApi.d.ts
declare class MintApi {
  private readonly mintService;
  constructor(mintService: MintService);
  addMint(mintUrl: string, options?: {
    trusted?: boolean;
  }): Promise<{
    mint: Mint;
    keysets: Keyset[];
  }>;
  getMintInfo(mintUrl: string): Promise<MintInfo>;
  isTrustedMint(mintUrl: string): Promise<boolean>;
  getAllMints(): Promise<Mint[]>;
  getAllTrustedMints(): Promise<Mint[]>;
  trustMint(mintUrl: string): Promise<void>;
  untrustMint(mintUrl: string): Promise<void>;
}
//#endregion
//#region api/KeyRingApi.d.ts
declare class KeyRingApi {
  private readonly keyRingService;
  constructor(keyRingService: KeyRingService);
  /**
   * Generates a new keypair and stores it in the keyring.
   * @param dumpSecretKey - If true, returns the full keypair including the secret key.
   *                        If false or omitted, returns only the public key.
   *                        WARNING: The secret key is sensitive cryptographic material. Handle with care.
   * @returns The full keypair (if dumpSecretKey is true) or just the public key (if false/omitted)
   */
  generateKeyPair(): Promise<{
    publicKeyHex: string;
  }>;
  generateKeyPair(dumpSecretKey: true): Promise<Keypair>;
  generateKeyPair(dumpSecretKey: false): Promise<{
    publicKeyHex: string;
  }>;
  /**
   * Adds an existing keypair to the keyring using a secret key.
   * @param secretKey - The 32-byte secret key as Uint8Array
   */
  addKeyPair(secretKey: Uint8Array): Promise<Keypair>;
  /**
   * Removes a keypair from the keyring.
   * @param publicKey - The public key (hex string) of the keypair to remove
   */
  removeKeyPair(publicKey: string): Promise<void>;
  /**
   * Retrieves a specific keypair by its public key.
   * @param publicKey - The public key (hex string) to look up
   * @returns The keypair if found, null otherwise
   */
  getKeyPair(publicKey: string): Promise<Keypair | null>;
  /**
   * Gets the most recently added keypair.
   * @returns The latest keypair if any exist, null otherwise
   */
  getLatestKeyPair(): Promise<Keypair | null>;
  /**
   * Gets all keypairs stored in the keyring.
   * @returns Array of all keypairs
   */
  getAllKeyPairs(): Promise<Keypair[]>;
}
//#endregion
//#region api/SubscriptionApi.d.ts
declare class SubscriptionApi {
  private readonly subs;
  private readonly logger?;
  constructor(subs: SubscriptionManager, logger?: Logger);
  awaitMintQuotePaid(mintUrl: string, quoteId: string, method?: 'bolt11' | 'onchain' | 'bolt12'): Promise<unknown>;
  awaitMeltQuotePaid(mintUrl: string, quoteId: string, method?: 'bolt11' | 'onchain' | 'bolt12'): Promise<unknown>;
  private awaitFirstNotification;
}
//#endregion
//#region api/HistoryApi.d.ts
declare class HistoryApi {
  private historyService;
  constructor(historyService: HistoryService);
  getPaginatedHistory(offset?: number, limit?: number): Promise<HistoryEntry[]>;
  getHistoryEntryById(id: string): Promise<HistoryEntry | null>;
  getOperationIdForHistoryEntry(id: string): Promise<string | null>;
}
//#endregion
//#region api/AuthApi.d.ts
/**
 * Public API for NUT-21/22 authentication.
 *
 * Thin wrapper that delegates to AuthService,
 * consistent with the other Api → Service pattern.
 */
declare class AuthApi {
  private readonly authService;
  constructor(authService: AuthService);
  startDeviceAuth(mintUrl: string): Promise<{
    verification_uri: string;
    verification_uri_complete: string | undefined;
    user_code: string;
    poll: () => Promise<_cashu_cashu_ts0.TokenResponse>;
    cancel: () => void;
  }>;
  login(mintUrl: string, tokens: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  }): Promise<AuthSession>;
  restore(mintUrl: string): Promise<boolean>;
  logout(mintUrl: string): Promise<void>;
  getSession(mintUrl: string): Promise<AuthSession>;
  hasSession(mintUrl: string): Promise<boolean>;
  getAuthProvider(mintUrl: string): AuthProvider | undefined;
  getPoolSize(mintUrl: string): number;
}
//#endregion
//#region api/SendOpsApi.d.ts
type NonDefaultSendMethod = Exclude<SendMethod, 'default'>;
type SendTarget = { [M in NonDefaultSendMethod]: {
  type: M;
} & SendMethodData<M> }[NonDefaultSendMethod];
interface PrepareSendInput {
  /** Mint to send from. */
  mintUrl: string;
  /** Amount to send. Bare amounts use `sat` unless `unit` is set. */
  amount: UnitAmountLike;
  /** Unit to send. */
  unit?: string;
  /** Optional non-default send target, for example a P2PK recipient. */
  target?: SendTarget;
}
interface SendRecoveryApi {
  /** Runs the startup-style recovery sweep for send operations. */
  run(): Promise<void>;
  /** Returns true while a recovery sweep is running. */
  inProgress(): boolean;
}
interface SendDiagnosticsApi {
  /** Returns true while an operation is currently locked by the service. */
  isLocked(operationId: string): boolean;
}
/**
 * Operation-oriented API for send workflows.
 *
 * This API exposes the send lifecycle explicitly:
 * 1. `prepare()` to create and reserve inputs
 * 2. `execute()` to produce the outgoing token
 * 3. `refresh()` to re-check pending operations
 * 4. `cancel()` or `reclaim()` to roll back when allowed
 */
declare class SendOpsApi {
  private readonly sendOperationService;
  /** Recovery helpers for send operations. */
  readonly recovery: SendRecoveryApi;
  /** Lightweight diagnostics for send operations. */
  readonly diagnostics: SendDiagnosticsApi;
  constructor(sendOperationService: SendOperationService);
  /**
   * Creates a prepared send operation without executing it.
   *
   * Use this to inspect the operation, fee impact, and target configuration
   * before producing the outgoing token.
   */
  prepare(input: PrepareSendInput): Promise<PreparedSendOperation>;
  /**
   * Executes a prepared send operation and returns the shareable token.
   *
   * Accepts either a prepared operation object or its ID. The latest operation
   * state is always reloaded before execution.
   */
  execute(operationOrId: SendOperation | string): Promise<{
    operation: PendingSendOperation;
    token: Token;
  }>;
  /** Returns a send operation by ID, or `null` when it does not exist. */
  get(operationId: string): Promise<SendOperation | null>;
  /** Lists send operations that are prepared and ready to execute or cancel. */
  listPrepared(): Promise<PreparedSendOperation[]>;
  /** Lists send operations that are currently in flight. */
  listInFlight(): Promise<SendOperation[]>;
  /**
   * Re-checks a send operation and returns its latest persisted state.
   *
   * Pending operations are actively checked with the service before the updated
   * operation is returned.
   */
  refresh(operationId: string): Promise<SendOperation>;
  /**
   * Cancels a prepared send operation before it has been executed.
   */
  cancel(operationId: string): Promise<void>;
  /**
   * Attempts to reclaim a pending send operation.
   *
   * This is intended for sends that are already in flight but still support
   * rollback according to the underlying send method.
   */
  reclaim(operationId: string): Promise<void>;
  /**
   * Finalizes a pending send operation explicitly.
   *
   * Most callers should rely on proof-state watchers when available, but this
   * method remains useful when the caller knows the token has been claimed.
   */
  finalize(operationId: string): Promise<void>;
  private getCreateOptions;
  private resolveOperation;
  private requireOperation;
}
//#endregion
//#region api/ReceiveOpsApi.d.ts
interface PrepareReceiveInput {
  /** Token to receive, either encoded or already decoded. */
  token: Token | string;
}
interface ReceiveRecoveryApi {
  /** Runs the startup-style recovery sweep for receive operations. */
  run(): Promise<void>;
  /** Returns true while a recovery sweep is running. */
  inProgress(): boolean;
}
interface ReceiveDiagnosticsApi {
  /** Returns true while an operation is currently locked by the service. */
  isLocked(operationId: string): boolean;
}
/**
 * Operation-oriented API for receive workflows.
 *
 * This API exposes receiving as an explicit lifecycle so callers can inspect,
 * resume, and cancel operations instead of relying only on a one-shot receive
 * call.
 */
declare class ReceiveOpsApi {
  private readonly receiveOperationService;
  /** Recovery helpers for receive operations. */
  readonly recovery: ReceiveRecoveryApi;
  /** Lightweight diagnostics for receive operations. */
  readonly diagnostics: ReceiveDiagnosticsApi;
  constructor(receiveOperationService: ReceiveOperationService);
  /**
   * Decodes and validates a token, then prepares a receive operation without
   * executing it.
   */
  prepare(input: PrepareReceiveInput): Promise<PreparedReceiveOperation>;
  /**
   * Executes a prepared receive operation.
   *
   * Accepts either a prepared operation object or its ID. The latest operation
   * state is always reloaded before execution.
   */
  execute(operationOrId: ReceiveOperation | string): Promise<FinalizedReceiveOperation>;
  /** Returns a receive operation by ID, or `null` when it does not exist. */
  get(operationId: string): Promise<ReceiveOperation | null>;
  /** Lists receive operations that are prepared and ready to execute or cancel. */
  listPrepared(): Promise<PreparedReceiveOperation[]>;
  /** Lists receive operations that are currently in flight. */
  listInFlight(): Promise<ReceiveOperation[]>;
  /**
   * Re-checks a receive operation and returns its latest persisted state.
   *
   * Executing operations are actively recovered before the updated operation is
   * returned.
   */
  refresh(operationId: string): Promise<ReceiveOperation>;
  /**
   * Cancels a receive operation that has not completed yet.
   *
   * Only `init` and `prepared` receive operations can be cancelled.
   */
  cancel(operationId: string, reason?: string): Promise<void>;
  private resolveOperation;
  private requireOperation;
}
//#endregion
//#region api/MeltOpsApi.d.ts
/** Melt methods supported by the default `Manager` wiring. */
type DefaultSupportedMeltMethod = 'bolt11' | 'bolt12' | 'onchain';
type PrepareMeltInput<TSupported extends MeltMethod = DefaultSupportedMeltMethod> = { [M in TSupported]: {
  /** Mint that will execute the melt. */mintUrl: string; /** Melt method to prepare, for example `bolt11`. */
  method: M; /** Existing canonical melt quote ID to prepare against. */
  quoteId: string; /** Unit to melt. Defaults to `sat`. */
  unit?: string;
} & (M extends 'onchain' ? {
  feeIndex?: number;
} : {}) }[TSupported];
type GetMeltByQuoteInput<TSupported extends MeltMethod = DefaultSupportedMeltMethod> = { [M in TSupported]: {
  /** Mint that owns the melt operation. */mintUrl: string; /** Melt method to resolve, for example `bolt11`. */
  method: M; /** Canonical melt quote ID. */
  quoteId: string;
} }[TSupported];
interface MeltRecoveryApi {
  /** Runs the startup-style recovery sweep for melt operations. */
  run(): Promise<void>;
  /** Returns true while a recovery sweep is running. */
  inProgress(): boolean;
}
interface MeltDiagnosticsApi {
  /** Returns true while an operation is currently locked by the service. */
  isLocked(operationId: string): boolean;
}
/**
 * Operation-oriented API for melt workflows.
 *
 * This API makes the melt lifecycle explicit so callers can prepare a payment,
 * execute it, inspect or refresh its state, and recover or roll it back when
 * allowed by the underlying method.
 */
declare class MeltOpsApi<TSupported extends MeltMethod = DefaultSupportedMeltMethod> {
  private readonly meltOperationService;
  /** Recovery helpers for melt operations. */
  readonly recovery: MeltRecoveryApi;
  /** Lightweight diagnostics for melt operations. */
  readonly diagnostics: MeltDiagnosticsApi;
  constructor(meltOperationService: MeltOperationService);
  /**
   * Prepares a melt operation against an existing canonical quote without executing it.
   *
   * Use this to inspect the generated operation and any quote-related data
   * before committing to the external payment.
   */
  prepare(input: PrepareMeltInput<TSupported>): Promise<PreparedMeltOperation>;
  /**
   * Executes a prepared melt operation.
   *
   * Accepts either a prepared operation object or its ID. The latest operation
   * state is always reloaded before execution.
   */
  execute(operationOrId: MeltOperation | string): Promise<PendingMeltOperation | FinalizedMeltOperation>;
  /** Returns a melt operation by ID, or `null` when it does not exist. */
  get(operationId: string): Promise<MeltOperation | null>;
  /** Returns a melt operation by mint URL, method, and quote ID, or `null` if not found. */
  getByQuote(input: GetMeltByQuoteInput<TSupported>): Promise<MeltOperation | null>;
  /** Lists melt operations for a mint URL and quote ID. */
  listByQuote(mintUrl: string, quoteId: string): Promise<MeltOperation[]>;
  /** Lists melt operations that are prepared and ready to execute or cancel. */
  listPrepared(): Promise<PreparedMeltOperation[]>;
  /** Lists melt operations that are currently in flight. */
  listInFlight(): Promise<MeltOperation[]>;
  /**
   * Re-checks a melt operation and returns its latest persisted state.
   *
   * Pending operations are actively checked with the service before the updated
   * operation is returned. Executing operations are recovered before returning
   * the updated state.
   */
  refresh(operationId: string): Promise<MeltOperation>;
  /**
   * Cancels a prepared melt operation before payment has entered the pending
   * phase.
   */
  cancel(operationId: string, reason?: string): Promise<void>;
  /**
   * Attempts to reclaim a pending melt operation.
   *
   * This is intended for in-flight melts whose handler determines that rollback
   * is still safe.
   */
  reclaim(operationId: string, reason?: string): Promise<void>;
  /**
   * Finalizes a pending melt operation explicitly.
   *
   * Most callers should prefer `refresh()` unless they already know the melt is
   * ready to finalize.
   */
  finalize(operationId: string): Promise<void>;
  private resolveOperation;
  private requireOperation;
}
//#endregion
//#region api/MintOpsApi.d.ts
/** Mint methods supported by the default `Manager` wiring. */
type DefaultSupportedMintMethod = 'bolt11' | 'onchain' | 'bolt12';
type PrepareExistingQuoteInputCommon = {
  /** Mint that issued the canonical quote. */mintUrl: string; /** Existing canonical mint quote ID to prepare against. */
  quoteId: string; /** Optional expected unit for the quote. */
  unit?: string;
};
type MethodDataInput<M extends MintMethod> = MintMethodData<M> extends Record<string, never> ? {
  /** Method-specific payload required for the selected mint method. */methodData?: MintMethodData<M>;
} : {
  /** Method-specific payload required for the selected mint method. */methodData: MintMethodData<M>;
};
type PrepareMintInput<TSupported extends MintMethod = DefaultSupportedMintMethod> = { [M in TSupported]: PrepareExistingQuoteInputCommon & {
  /** Mint method to prepare, for example `bolt11`. */method: M;
} & (M extends 'onchain' ? {
  /** Amount to withdraw from the reusable onchain quote. */amount: UnitAmountLike;
} : M extends 'bolt12' ? {
  /** Amount to mint from the reusable BOLT12 quote. */amount: UnitAmountLike;
} : {}) & MethodDataInput<M> }[TSupported];
type GetMintByQuoteInput<TSupported extends MintMethod = DefaultSupportedMintMethod> = { [M in TSupported]: {
  /** Mint that owns the mint operation. */mintUrl: string; /** Mint method to resolve, for example `bolt11`. */
  method: M; /** Canonical mint quote ID. */
  quoteId: string;
} }[TSupported];
interface MintRecoveryApi {
  /** Runs the startup-style recovery sweep for mint operations. */
  run(): Promise<void>;
  /** Returns true while a recovery sweep is running. */
  inProgress(): boolean;
}
interface MintDiagnosticsApi {
  /** Returns true while an operation is currently locked by the service. */
  isLocked(operationId: string): boolean;
}
/**
 * Operation-oriented API for quote-backed mint workflows.
 *
 * This API makes the mint lifecycle explicit so callers can move a canonical
 * quote into a durable pending operation, execute it, and inspect its progress.
 */
declare class MintOpsApi<TSupported extends MintMethod = DefaultSupportedMintMethod> {
  private readonly mintOperationService;
  /** Recovery helpers for mint operations. */
  readonly recovery: MintRecoveryApi;
  /** Lightweight diagnostics for mint operations. */
  readonly diagnostics: MintDiagnosticsApi;
  constructor(mintOperationService: MintOperationService);
  /**
   * Prepares a mint operation against an existing canonical quote without executing it.
   */
  prepare(input: PrepareMintInput<TSupported>): Promise<PendingMintOperation>;
  /**
   * Executes a pending mint operation and returns the latest operation state.
   */
  execute(operationOrId: MintOperation | string): Promise<MintOperation>;
  /** Returns a mint operation by ID, or `null` when it does not exist. */
  get(operationId: string): Promise<MintOperation | null>;
  /** Returns a mint operation by mint URL, method, and quote ID, or `null` if not found. */
  getByQuote(input: GetMintByQuoteInput<TSupported>): Promise<MintOperation | null>;
  /** Lists mint operations for a mint URL and quote ID. */
  listByQuote(mintUrl: string, quoteId: string): Promise<MintOperation[]>;
  /** Lists mint operations that are pending redemption or remote settlement. */
  listPending(): Promise<PendingMintOperation[]>;
  /** Lists mint operations that are pending or currently executing. */
  listInFlight(): Promise<MintOperation[]>;
  /**
   * Checks the remote quote state for a pending mint operation.
   * Paid or issued quotes are reconciled immediately.
   */
  checkPayment(operationId: string): Promise<PendingMintCheckResult>;
  /**
   * Re-checks a mint operation and returns its latest persisted state.
   */
  refresh(operationId: string): Promise<MintOperation>;
  /**
   * Attempts to finalize a mint operation explicitly.
   *
   * Pending operations are executed, executing operations are recovered,
   * and terminal operations are returned as-is.
   */
  finalize(operationId: string): Promise<MintOperation>;
  private resolveOperation;
  private requireOperation;
}
//#endregion
//#region api/QuoteApi.d.ts
type DefaultSupportedMintQuoteMethod = 'bolt11' | 'onchain' | 'bolt12';
type DefaultImportableMintQuoteMethod<TSupported extends MintMethod> = Extract<TSupported, 'bolt11'>;
type MintQuoteIdentityInput<M extends MintMethod> = {
  mintUrl: string;
  method: M;
  quoteId: string;
};
type MeltQuoteIdentityInput<M extends MeltMethod> = {
  mintUrl: string;
  method: M;
  quoteId: string;
};
type CreateMintQuoteInput<TSupported extends MintMethod = DefaultSupportedMintQuoteMethod> = { [M in TSupported]: {
  mintUrl: string;
  method: M;
} & (M extends 'bolt11' ? {
  amount: UnitAmountLike;
  unit?: string;
} : M extends 'onchain' ? {
  unit?: string;
} : M extends 'bolt12' ? {
  unit?: string;
  amount?: UnitAmountLike;
  description?: string;
} : never) }[TSupported];
type GetMintQuoteInput<TSupported extends MintMethod = DefaultSupportedMintQuoteMethod> = { [M in TSupported]: MintQuoteIdentityInput<M> }[TSupported];
type ImportMintQuoteInput<TSupported extends MintMethod = DefaultSupportedMintQuoteMethod> = DefaultImportableMintQuoteMethod<TSupported> extends never ? never : { [M in DefaultImportableMintQuoteMethod<TSupported>]: {
  /** Mint that issued the existing quote. */mintUrl: string; /** Existing quote snapshot to persist as canonical quote state. */
  quote: MintMethodQuoteSnapshot<M>; /** Mint method for the quote snapshot. */
  method: M;
} }[DefaultImportableMintQuoteMethod<TSupported>];
type RefreshMintQuoteInput<TSupported extends MintMethod = DefaultSupportedMintQuoteMethod> = GetMintQuoteInput<TSupported>;
type ListPendingMintQuotesInput<TSupported extends MintMethod = DefaultSupportedMintQuoteMethod> = {
  method?: TSupported;
};
type CreateMeltQuoteInput<TSupported extends MeltMethod = DefaultSupportedMeltMethod> = { [M in TSupported]: {
  mintUrl: string;
  method: M;
  methodData: MeltMethodInputData<M>;
  unit?: string;
} }[TSupported];
type GetMeltQuoteInput<TSupported extends MeltMethod = DefaultSupportedMeltMethod> = { [M in TSupported]: MeltQuoteIdentityInput<M> }[TSupported];
type RefreshMeltQuoteInput<TSupported extends MeltMethod = DefaultSupportedMeltMethod> = GetMeltQuoteInput<TSupported>;
type ListPendingMeltQuotesInput<TSupported extends MeltMethod = DefaultSupportedMeltMethod> = {
  method?: TSupported;
};
declare class MintQuoteApi<TSupported extends MintMethod = DefaultSupportedMintQuoteMethod> {
  private readonly quoteLifecycle;
  constructor(quoteLifecycle: QuoteLifecycle);
  create(input: CreateMintQuoteInput<TSupported>): Promise<MintQuote>;
  get(input: GetMintQuoteInput<TSupported>): Promise<MintQuote | null>;
  import(input: ImportMintQuoteInput<TSupported>): Promise<MintQuote>;
  listPending(input?: ListPendingMintQuotesInput<TSupported>): Promise<MintQuote[]>;
  refresh(input: RefreshMintQuoteInput<TSupported>): Promise<MintQuote>;
}
declare class MeltQuoteApi<TSupported extends MeltMethod = DefaultSupportedMeltMethod> {
  private readonly quoteLifecycle;
  constructor(quoteLifecycle: QuoteLifecycle);
  create(input: CreateMeltQuoteInput<TSupported>): Promise<MeltQuote>;
  get(input: GetMeltQuoteInput<TSupported>): Promise<MeltQuote | null>;
  listPending(input?: ListPendingMeltQuotesInput<TSupported>): Promise<MeltQuote[]>;
  refresh(input: RefreshMeltQuoteInput<TSupported>): Promise<MeltQuote>;
}
/**
 * API for durable canonical quote state.
 *
 * Quote rows are not value movements and are separate from operation history.
 */
declare class QuoteApi<TMintSupported extends MintMethod = DefaultSupportedMintQuoteMethod, TMeltSupported extends MeltMethod = DefaultSupportedMeltMethod> {
  readonly mint: MintQuoteApi<TMintSupported>;
  readonly melt: MeltQuoteApi<TMeltSupported>;
  constructor(quoteLifecycle: QuoteLifecycle);
}
//#endregion
//#region api/OpsApi.d.ts
/**
 * Unified entry point for operation-based wallet workflows.
 *
 * This API groups the high-level send, receive, and melt operation APIs under a
 * single object so callers can discover and use the new operation-oriented
 * lifecycle consistently.
 */
declare class OpsApi {
  readonly send: SendOpsApi;
  /**
   * Receive operations for preparing, executing, inspecting, refreshing, and
   * recovering token receives.
   */
  readonly receive: ReceiveOpsApi;
  /**
   * Mint operations for preparing, executing, inspecting, and recovering
   * quote-backed mint flows.
   */
  readonly mint: MintOpsApi;
  /**
   * Melt operations for preparing, executing, inspecting, refreshing, and
   * recovering outbound payment flows such as bolt11 melts.
   */
  readonly melt: MeltOpsApi;
  /**
   * Send operations for preparing, executing, inspecting, refreshing, and
   * recovering token sends.
   */
  constructor(send: SendOpsApi,
  /**
   * Receive operations for preparing, executing, inspecting, refreshing, and
   * recovering token receives.
   */

  receive: ReceiveOpsApi,
  /**
   * Mint operations for preparing, executing, inspecting, and recovering
   * quote-backed mint flows.
   */

  mint: MintOpsApi,
  /**
   * Melt operations for preparing, executing, inspecting, refreshing, and
   * recovering outbound payment flows such as bolt11 melts.
   */

  melt: MeltOpsApi);
}
//#endregion
//#region api/PaymentRequestsApi.d.ts
type CreateIncomingPaymentRequestInput = Omit<CreatePaymentRequestReceiveInput, 'amount' | 'unit'> & {
  /** Amount to request. Bare amounts use `sat` unless `unit` is set. */amount: UnitAmountLike; /** Unit to request. */
  unit?: string;
};
interface IncomingPaymentRequestsApi {
  create(input: CreateIncomingPaymentRequestInput): Promise<PaymentRequestReceiveOperation>;
  cancel(operationId: string, reason?: string): Promise<PaymentRequestReceiveOperation>;
  get(operationId: string): Promise<PaymentRequestReceiveOperation | null>;
  list(filter?: {
    state?: PaymentRequestReceiveState;
  }): Promise<PaymentRequestReceiveOperation[]>;
  claimPayload(operationOrId: PaymentRequestReceiveOperation | string, payload: PaymentRequestPayload | string, source?: PaymentRequestReceiveSource): Promise<PaymentRequestReceiveClaimResult>;
  ingestPayload(payload: PaymentRequestPayload | string, source?: PaymentRequestReceiveSource): Promise<PaymentRequestReceiveClaimResult>;
  readonly recovery: {
    run(): Promise<void>;
  };
  readonly diagnostics: {
    isLocked(operationId: string): boolean;
  };
}
/**
 * API for parsing, preparing, and executing payment requests.
 */
declare class PaymentRequestsApi {
  private readonly paymentRequestService;
  readonly incoming: IncomingPaymentRequestsApi;
  constructor(paymentRequestService: PaymentRequestService, paymentRequestReceiveService: PaymentRequestReceiveService);
  /**
   * Parse and validate an encoded payment request.
   */
  parse(paymentRequest: string): Promise<ResolvedPaymentRequest>;
  /**
   * Prepare a payment request for execution.
   */
  prepare(request: ResolvedPaymentRequest, options: {
    mintUrl: string;
    amount?: UnitAmountLike;
  }): Promise<PreparedPaymentRequest>;
  /**
   * Execute a prepared payment request.
   */
  execute(transaction: PreparedPaymentRequest): Promise<PaymentRequestExecutionResult>;
}
//#endregion
//#region plugins/types.d.ts
type ServiceKey = keyof ServiceMap;
interface ServiceMap {
  mintService: MintService;
  walletService: WalletService;
  proofService: ProofService;
  keyRingService: KeyRingService;
  seedService: SeedService;
  walletRestoreService: WalletRestoreService;
  counterService: CounterService;
  tokenService: TokenService;
  historyService: HistoryService;
  sendOperationService: SendOperationService;
  receiveOperationService: ReceiveOperationService;
  meltOperationService: MeltOperationService;
  mintOperationService: MintOperationService;
  paymentRequestService: PaymentRequestService;
  paymentRequestReceiveService: PaymentRequestReceiveService;
  subscriptions: SubscriptionManager;
  eventBus: EventBus<CoreEvents>;
  logger: Logger;
}
interface PluginContext<Req extends readonly ServiceKey[] = readonly ServiceKey[]> {
  services: Pick<ServiceMap, Req[number]>;
  /**
   * Register an API extension accessible via manager.ext.<key>
   * @param key - Unique identifier for this extension
   * @param api - The API object to expose
   * @throws ExtensionRegistrationError if key is already registered
   */
  registerExtension<K extends string>(key: K, api: unknown): void;
}
type CleanupFn = () => void | Promise<void>;
type Cleanup = void | CleanupFn | Promise<void | CleanupFn>;
interface Plugin<Req extends readonly ServiceKey[] = readonly ServiceKey[]> {
  name: string;
  required: Req;
  optional?: readonly ServiceKey[];
  onInit?(ctx: PluginContext<Req>): Cleanup;
  onReady?(ctx: PluginContext<Req>): Cleanup;
  onDispose?(): void | Promise<void>;
}
/**
 * Base interface for plugin extensions.
 * Plugin authors should augment this interface via module augmentation:
 *
 * @example
 * declare module '@coco/core' {
 *   interface PluginExtensions {
 *     myPlugin: MyPluginApi;
 *   }
 * }
 */
interface PluginExtensions {}
/**
 * Error thrown when a plugin attempts to register an extension key that is already registered.
 */
declare class ExtensionRegistrationError extends Error {
  constructor(pluginName: string, key: string);
}
/**
 * Error thrown when the same plugin instance is registered more than once.
 */
declare class DuplicatePluginRegistrationError extends Error {
  constructor(pluginName: string);
}
//#endregion
//#region Manager.d.ts
/**
 * Configuration options for initializing the Coco Cashu manager
 */
interface CocoConfig {
  /** Repository implementations for data persistence */
  repo: Repositories;
  /** Function that returns the wallet seed as Uint8Array */
  seedGetter: () => Promise<Uint8Array>;
  /** Optional logger instance (defaults to NullLogger) */
  logger?: Logger;
  /** Optional WebSocket factory for real-time subscriptions */
  webSocketFactory?: WebSocketFactory;
  /** Optional plugins to extend functionality */
  plugins?: Plugin[];
  /**
   * Watcher configuration (all enabled by default)
   * - Omit to use defaults (enabled)
   * - Set `disabled: true` to disable
   * - Provide options to customize behavior
   */
  watchers?: {
    /** Mint operation watcher (enabled by default) */mintOperationWatcher?: {
      disabled?: boolean;
      watchExistingPendingOnStart?: boolean;
      watchExistingPendingQuotesOnStart?: boolean;
    }; /** Proof state watcher (enabled by default) */
    proofStateWatcher?: {
      disabled?: boolean; /** When enabled, scan existing inflight proofs on start (default: true) */
      watchExistingInflightOnStart?: boolean;
    };
  };
  /**
   * Processor configuration (all enabled by default)
   * - Omit to use defaults (enabled)
   * - Set `disabled: true` to disable
   * - Provide options to customize behavior
   */
  processors?: {
    /** Mint operation processor (enabled by default) */mintOperationProcessor?: {
      disabled?: boolean;
      processIntervalMs?: number;
      maxRetries?: number;
      baseRetryDelayMs?: number;
      initialEnqueueDelayMs?: number;
      autoClaimMintQuotes?: boolean;
    };
  };
  /**
   * Subscription transport configuration
   * Controls the hybrid WebSocket + polling behavior
   */
  subscriptions?: {
    /**
     * Polling interval (ms) while WebSocket is connected.
     * Only used as backup to catch silent WS failures.
     * Default: 20000 (20 seconds)
     */
    slowPollingIntervalMs?: number;
    /**
     * Polling interval (ms) after WebSocket fails.
     * Used as primary transport when WS is unavailable.
     * Default: 5000 (5 seconds)
     */
    fastPollingIntervalMs?: number;
  };
}
/**
 * Initializes and configures a new Coco Cashu manager instance
 * @param config - Configuration options including repositories, seed, and optional features
 * @returns A fully initialized Manager instance
 */
declare function initializeCoco(config: CocoConfig): Promise<Manager>;
declare class Manager {
  readonly mint: MintApi;
  readonly wallet: WalletApi;
  readonly keyring: KeyRingApi;
  readonly subscription: SubscriptionApi;
  readonly history: HistoryApi;
  readonly auth: AuthApi;
  readonly ops: OpsApi;
  readonly quotes: QuoteApi;
  readonly paymentRequests: PaymentRequestsApi;
  readonly ext: PluginExtensions;
  private mintService;
  private walletService;
  private proofService;
  private walletRestoreService;
  private keyRingService;
  private eventBus;
  private logger;
  readonly subscriptions: SubscriptionManager;
  private mintOperationWatcher?;
  private mintOperationProcessor?;
  private legacyMintQuoteRepository;
  private quoteLifecycle;
  private proofStateWatcher?;
  private historyService;
  private seedService;
  private counterService;
  private tokenService;
  private paymentRequestService;
  private paymentRequestReceiveService;
  private authSessionService;
  private authService;
  private sendOperationService;
  private sendOperationRepository;
  private meltOperationService;
  private meltOperationRepository;
  private mintOperationService;
  private mintOperationRepository;
  private receiveOperationService;
  private receiveOperationRepository;
  private paymentRequestReceiveOperationRepository;
  private paymentRequestReceiveAttemptRepository;
  private proofRepository;
  private readonly pluginHost;
  private subscriptionsPaused;
  private originalWatcherConfig;
  private originalProcessorConfig;
  private readonly mintRequestProvider;
  private readonly mintAdapter;
  constructor(repositories: Repositories, seedGetter: () => Promise<Uint8Array>, logger?: Logger, webSocketFactory?: WebSocketFactory, plugins?: Plugin[], watchers?: CocoConfig['watchers'], processors?: CocoConfig['processors'], subscriptions?: CocoConfig['subscriptions']);
  on<E extends keyof CoreEvents>(event: E, handler: (payload: CoreEvents[E]) => void | Promise<void>): () => void;
  once<E extends keyof CoreEvents>(event: E, handler: (payload: CoreEvents[E]) => void | Promise<void>): () => void;
  use(plugin: Plugin): void;
  /**
   * Initialize the plugin system.
   * This is called automatically by `initializeCoco()`.
   * Only call this directly if you instantiate Manager without using the factory.
   */
  initPlugins(): Promise<void>;
  dispose(): Promise<void>;
  off<E extends keyof CoreEvents>(event: E, handler: (payload: CoreEvents[E]) => void | Promise<void>): void;
  enableMintOperationWatcher(options?: {
    watchExistingPendingOnStart?: boolean;
    watchExistingPendingQuotesOnStart?: boolean;
  }): Promise<void>;
  disableMintOperationWatcher(): Promise<void>;
  enableMintOperationProcessor(options?: {
    processIntervalMs?: number;
    maxRetries?: number;
    baseRetryDelayMs?: number;
    initialEnqueueDelayMs?: number;
    autoClaimMintQuotes?: boolean;
  }): Promise<boolean>;
  disableMintOperationProcessor(): Promise<void>;
  waitForMintOperationProcessor(): Promise<void>;
  enableProofStateWatcher(options?: {
    watchExistingInflightOnStart?: boolean;
  }): Promise<void>;
  disableProofStateWatcher(): Promise<void>;
  recoverPendingMintOperations(): Promise<void>;
  recoverPendingPaymentRequestReceiveAttempts(): Promise<void>;
  reconcileLegacyMintQuotes(mintUrl?: string): Promise<{
    reconciled: string[];
    skipped: string[];
  }>;
  pauseSubscriptions(): Promise<void>;
  resumeSubscriptions(): Promise<void>;
  private getChildLogger;
  requeuePaidMintQuotes(mintUrl?: string): Promise<{
    requeued: string[];
  }>;
  private createEventBus;
  private createSubscriptionManager;
  private buildCoreServices;
  private buildApis;
}
//#endregion
//#region plugins/PluginHost.d.ts
declare class PluginHost {
  private readonly plugins;
  private readonly cleanups;
  private readonly extensions;
  private readonly registeredPlugins;
  private readonly initializedPlugins;
  private readonly readyPlugins;
  private readonly initPromises;
  private readonly readyPromises;
  private services?;
  private initialized;
  private readyPhase;
  use(plugin: Plugin): void;
  init(services: ServiceMap): Promise<void>;
  ready(): Promise<void>;
  dispose(): Promise<void>;
  /**
   * Get all registered plugin extensions
   */
  getExtensions(): Record<string, unknown>;
  private ensureInitialized;
  private ensureReady;
  private runInit;
  private runReady;
  private createContext;
}
//#endregion
export { Amount, type AmountLike, AuthApi, AuthService, AuthSession, AuthSessionError, AuthSessionExpiredError, AuthSessionRepository, AuthSessionService, type BalanceBreakdown, type BalanceQuery, type BalanceSnapshot, type BalancesBreakdownByMint, type BalancesByMint, type BalancesByMintAndUnit, type BalancesByUnit, BaseHandlerDeps, BasePrepareContext, Bolt11MintQuote, Bolt12MintQuote, BoltMeltQuote, Cleanup, CleanupFn, CocoConfig, ConsoleLogger, type CoreProof, Counter, CounterRepository, CounterService, CreateIncomingPaymentRequestInput, CreateMeltQuoteInput, CreateMintQuoteInput, CreatePaymentRequestReceiveInput, CreateSendOperationOptions, DEFAULT_UNIT, DefaultSupportedMeltMethod, DefaultSupportedMintMethod, DefaultSupportedMintQuoteMethod, DuplicatePluginRegistrationError, ExecuteContext, ExecutingSendOperation, ExecutionResult, ExtensionRegistrationError, FinalizeContext, FinalizedSendOperation, GetMeltByQuoteInput, GetMeltQuoteInput, GetMintByQuoteInput, GetMintQuoteInput, HistoryApi, HistoryEntry, HistoryProjectionRepository, HistoryRepository, HistoryService, HistoryType, HttpPaymentRequestExecutionResult, type HttpPaymentRequestTransport, HttpResponseError, type HttpTransport, ImportMintQuoteInput, InbandPaymentRequestExecutionResult, type InbandPaymentRequestTransport, type InbandTransport, IncomingPaymentRequestsApi, InitSendOperation, KeyRingApi, KeyRingRepository, KeyRingService, Keypair, KeypairPurpose, Keyset, KeysetKeypairs, KeysetRepository, KeysetSyncError, LegacyHistoryEntry, LegacyHistoryRowInput, LegacyMeltHistoryEntry, LegacyMeltHistoryState, LegacyMintHistoryEntry, LegacyMintHistoryState, LegacyMintQuoteRepository, LegacyReceiveHistoryEntry, LegacyReceiveHistoryState, LegacySendHistoryEntry, LegacySendHistoryState, ListPendingMeltQuotesInput, ListPendingMintQuotesInput, type Logger, Manager, MeltDiagnosticsApi, MeltHistoryEntry, MeltHistoryState, type MeltMethod, type MeltMethodData, type MeltMethodInputData, type MeltOperation, MeltOperationRepository, MeltOperationService, type MeltOperationState, MeltOpsApi, MeltQuote, MeltQuoteApi, MeltQuoteRepository, MeltRecoveryApi, MemoryAuthSessionRepository, MemoryCounterRepository, MemoryHistoryRepository, MemoryKeyRingRepository, MemoryKeysetRepository, MemoryLegacyMintQuoteRepository, MemoryMeltOperationRepository, MemoryMeltQuoteRepository, MemoryMintOperationRepository, MemoryMintQuoteRepository, MemoryMintRepository, MemoryPaymentRequestReceiveAttemptRepository, MemoryPaymentRequestReceiveOperationRepository, MemoryProofRepository, MemoryReceiveOperationRepository, MemoryRepositories, MemorySendOperationRepository, MethodUnitCapability, Mint, MintApi, MintDiagnosticsApi, MintFetchError, MintHistoryEntry, MintHistoryState, type MintMethod, type MintMethodData, type MintMethodRemoteState, type MintOperation, MintOperationError, MintOperationProcessor, MintOperationProcessorOptions, MintOperationRepository, MintOperationService, type MintOperationState, MintOperationWatcherOptions, MintOperationWatcherService, MintOpsApi, MintQuote, MintQuoteApi, MintQuoteOnchainResponse, MintQuoteRepository, MintQuoteState, MintRecoveryApi, MintRepository, MintService, NetworkError, type NostrPaymentRequestTransport, type NostrTransport, OnchainMeltQuote, OnchainMintQuote, OperationHistoryEntry, OperationInProgressError, OpsApi, ParsedPaymentRequestPayload, PaymentRequestError, PaymentRequestExecutionResult, PaymentRequestReceiveAttempt, PaymentRequestReceiveAttemptRepository, PaymentRequestReceiveAttemptState, PaymentRequestReceiveClaimResult, PaymentRequestReceiveOperation, PaymentRequestReceiveOperationRepository, PaymentRequestReceiveService, PaymentRequestReceiveSource, PaymentRequestReceiveState, PaymentRequestReceiveTransport, type PaymentRequestReceiveTransportCreateInput, type PaymentRequestReceiveTransportHandler, PaymentRequestReceiveTransportHandlerProvider, PaymentRequestReceiveTransportInput, PaymentRequestService, type PaymentRequestTransport, PaymentRequestsApi, PendingCheckResult, PendingContext, type PendingMintCheckCategory, type PendingMintCheckResult, PendingSendOperation, Plugin, PluginContext, PluginExtensions, PluginHost, PrepareMeltInput, PrepareMintInput, PrepareReceiveInput, PrepareSendInput, PreparedContext, PreparedOrLaterOperation, PreparedPaymentRequest, PreparedSendOperation, ProofOperationError, ProofRepository, ProofService, type ProofState, ProofStateWatcherOptions, ProofStateWatcherService, ProofUnitFilter, ProofValidationError, QuoteApi, ReceiveDiagnosticsApi, ReceiveHistoryEntry, ReceiveHistoryState, type ReceiveOperation, ReceiveOperationRepository, ReceiveOperationService, type ReceiveOperationState, ReceiveOpsApi, ReceiveRecoveryApi, RecoverExecutingContext, RefreshMeltQuoteInput, RefreshMintQuoteInput, Repositories, RepositoryTransactionScope, type ResolvedPaymentRequest, RollbackContext, RolledBackSendOperation, RollingBackSendOperation, SeedService, SendDiagnosticsApi, SendHistoryEntry, SendHistoryState, SendMethod, SendMethodData, SendMethodDefinitions, SendMethodHandler, SendMethodHandlerRegistry, SendOperation, SendOperationRepository, SendOperationService, SendOperationState, SendOpsApi, SendRecoveryApi, SendTarget, ServiceKey, ServiceMap, SubscriptionApi, SubscriptionManager, TerminalSendOperation, TokenService, TokenValidationError, type Transport, UnitAmount, UnitAmountLike, UnitMismatchError, UnitValidationError, UnknownMintError, WalletApi, WalletBalancesApi, WalletRestoreOptions, WalletRestoreService, WalletService, WalletSweepOptions, type WebSocketFactory, type WebSocketLike, WsConnectionManager, assertSameUnit, assertUnitAmount, compareHistoryEntries, createSendOperation, deserializeAmount, deserializeToken, getDecodedToken, getEncodedToken, getKeepProofSecrets, getMintQuoteAmount, getMintQuoteAvailableAmount, getMintQuoteRemoteState, getSendProofSecrets, getTokenMetadata, hasPreparedData, initializeCoco, isExecutingOperation, isFinalizedOperation, isInitOperation, isLegacyHistoryEntry, isMintQuotePending, isOperationHistoryEntry, isPendingOperation, isPreparedOperation, isRolledBackOperation, isRollingBackOperation, isStatefulMintQuote, isTerminalOperation, isUnitAmountLikeObject, legacyHistoryId, meltQuoteFromBolt11Response, meltQuoteFromBolt12Response, meltQuoteFromOnchainResponse, meltQuoteToMethodSnapshot, mintQuoteFromBolt11Response, mintQuoteFromBolt12Response, mintQuoteFromOnchainResponse, mintQuoteToMethodSnapshot, normalizeMeltMethodData, normalizeMintUrl, normalizeUnit, normalizeUnitAmount, normalizeUnitList, operationHistoryId, parseHistoryEntryId, parseUnitAmount, projectLegacyHistoryRow, projectMeltOperation, projectMintOperation, projectOperationToHistoryEntry, projectReceiveOperation, projectSendOperation, resolveOnchainMeltFeeOption, sameUnitAmount, serializeAmount, stringifyJson, sumAmounts, toAmount };