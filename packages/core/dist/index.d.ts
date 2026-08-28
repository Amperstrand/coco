import { $ as projectReceiveOperation, $i as assertUnitAmount, $n as UnitMismatchError, $t as ProofService, A as LegacyReceiveHistoryEntry, Aa as sumAmounts, Ai as isStatefulMintQuote, An as PaymentRequestUnsupportedSpendingCondition, Ar as MintQuoteRef, B as ReceiveHistoryState, Ba as BalancesByUnit, Bi as MintOperationFailure, Bn as HttpResponseError, Br as WebSocketFactory, C as HistoryType, Ci as OnchainMintQuote, Cn as RolledBackReceiveOperation, Cr as TerminalSendOperation, D as LegacyMeltHistoryState, Di as getMintQuoteAvailableAmount, Dn as PaymentRequestP2pkRequirement, Dr as MeltHandlerProvider, E as LegacyMeltHistoryEntry, Ei as getMintQuoteAmount, En as PaymentRequestMalformedSpendingCondition, Er as QuoteMeltResponse, F as MeltHistoryState, Fa as BalanceQuery, Fi as ExecutingMintOperation, Fn as HistoryService, Fr as meltQuoteFromBolt11Response, G as isOperationHistoryEntry, Ga as AuthSession, Gn as MintQuoteValidationError, Gr as PaymentMethodCapability, Gt as MeltMethodQuoteSnapshot, H as SendHistoryState, Ha as MintInfo, Hi as PendingMintOperation, Hn as MintFetchError, Hr as CheckPaymentMethodCapabilityInput, I as MintHistoryEntry, Ia as BalanceSnapshot, Ii as FailedMintOperation, In as AuthService, Ir as meltQuoteFromBolt12Response, It as MeltMethod, J as parseHistoryEntryId, Jn as PaymentRequestError, K as legacyHistoryId, Kn as NetworkError, Kr as PaymentMethodCapabilityCheck, Kt as MeltMethodRemoteState, L as MintHistoryState, La as BalancesBreakdownByMint, Li as FinalizedMintOperation, Ln as AuthSessionError, Lr as meltQuoteFromOnchainResponse, Lt as MeltMethodData, M as LegacySendHistoryEntry, Ma as LogLevel, Mi as mintQuoteFromBolt12Response, Mn as ResolvedPaymentRequest, Mr as BoltMeltQuote, N as LegacySendHistoryState, Na as Logger, Ni as mintQuoteFromOnchainResponse, Nn as ExecuteSendOptions, Nr as MeltQuote, O as LegacyMintHistoryEntry, Oi as getMintQuoteRemoteState, On as PaymentRequestService, Or as SubscriptionManager, P as MeltHistoryEntry, Pa as BalanceBreakdown, Pi as mintQuoteToMethodSnapshot, Pn as SendOperationService, Pr as OnchainMeltQuote, Q as projectOperationToHistoryEntry, Qi as assertSameUnit, Qn as TokenValidationError, R as OperationHistoryEntry, Ra as BalancesByMint, Ri as InitMintOperation, Rn as AuthSessionExpiredError, Rr as meltQuoteToMethodSnapshot, S as HistoryEntry, Si as MintQuoteOnchainResponse, Sn as ReceiveOperationState, Sr as SendOperationState, T as LegacyHistoryRowInput, Ti as deriveBolt11MintQuoteState, Tn as PaymentRequestExecutionResult, Tr as BoltMeltQuoteState, U as compareHistoryEntries, Ua as ProofState, Un as MintOperationError, Ur as ListPaymentMethodCapabilitiesInput, V as SendHistoryEntry, Va as CoreProof, Vi as MintOperationState, Vn as KeysetSyncError, Vr as WebSocketLike, Vt as MeltMethodInputData, W as isLegacyHistoryEntry, Wa as MintQuoteState, Wi as TerminalMintOperation, Wn as MintQuoteKeyError, Wr as MintService, X as projectMeltOperation, Xi as UnitAmount, Xn as ProofValidationError, Y as projectLegacyHistoryRow, Yi as DEFAULT_UNIT, Yn as ProofOperationError, Z as projectMintOperation, Zi as UnitAmountLike, Zn as QuoteIdentityConflictError, _n as FinalizedReceiveOperation, _r as PendingSendOperation, aa as sameUnitAmount, ai as MintMethodHandler, an as PaymentRequestReceiveClaimResult, at as MeltMethodFinalizedData, bi as Bolt12MintQuote, bn as ReceiveOperation, br as RollingBackSendOperation, ca as Keyset, ci as MintMethodQuoteData, cn as PaymentRequestReceiveAttempt, cr as MintHandlerProvider, ct as MeltOperationState, di as MintMethodRemoteState, dn as PaymentRequestReceiveSource, dr as P2pkSendOptions, ea as isUnitAmountLikeObject, er as UnitValidationError, et as projectSendOperation, fa as EventHandler, fn as PaymentRequestReceiveState, fr as SendMethod, ft as RolledBackMeltOperation, gn as ExecutingReceiveOperation, gr as InitSendOperation, hn as TokenService, hr as FinalizedSendOperation, ia as parseUnitAmount, in as CreatePaymentRequestReceiveInput, ir as KeypairPurpose, it as InitMeltOperation, j as LegacyReceiveHistoryState, ja as toAmount, ji as mintQuoteFromBolt11Response, jn as PreparedPaymentRequest, jr as QuoteIdentity, k as LegacyMintHistoryState, ki as isMintQuotePending, kn as PaymentRequestSpendingConditionRequirement, kr as MeltQuoteRef, la as KeysetKeypairs, li as MintMethodQuoteImportSnapshot, ln as PaymentRequestReceiveAttemptState, lr as DefaultSendMethodData, lt as PendingMeltOperation, mi as PendingMintCheckResult, mn as ReceiveOperationService, mr as ExecutingSendOperation, mt as TerminalMeltOperation, na as normalizeUnitAmount, ni as MintMethodCreateQuoteData, nr as KeyRingService, nt as FailedMeltOperation, oa as WalletService, on as PaymentRequestReceiveService, or as MintOperationService, pa as Counter, pn as PaymentRequestReceiveTransport, pr as SendMethodData, pt as RollingBackMeltOperation, q as operationHistoryId, qn as OperationInProgressError, ra as normalizeUnitList, ri as MintMethodData, rn as WalletRestoreService, rr as Keypair, rt as FinalizedMeltOperation, sn as ParsedPaymentRequestPayload, st as MeltOperation, ta as normalizeUnit, ti as MintMethod, tn as CoreEvents, tr as UnknownMintError, tt as ExecutingMeltOperation, ua as Mint, ui as MintMethodQuoteSnapshot, un as PaymentRequestReceiveOperation, ur as P2pkSendMethodData, ut as PreparedMeltOperation, v as Repositories, vn as InitReceiveOperation, vr as PreparedSendOperation, w as LegacyHistoryEntry, wa as normalizeMintUrl, wi as applyBolt11MintQuoteStateFallback, wn as TerminalReceiveOperation, wr as BaseQuoteMeltHandler, x as MemoryRepositories, xi as MintQuote, xn as ReceiveOperationSource, xr as SendOperation, yi as Bolt11MintQuote, yn as PreparedReceiveOperation, yr as RolledBackSendOperation, z as ReceiveHistoryEntry, za as BalancesByMintAndUnit, zi as MintOperation, zn as DerivationIndexExhaustedError, zr as resolveOnchainMeltFeeOption, zt as MeltMethodHandler } from "./index-C8of_eP9.js";
import "./index-BoGG5KAY.js";
import { C as MeltRecoveryApi, S as MeltOpsApi, _ as MeltQuoteApi, b as DefaultSupportedMeltMethod, c as PluginExtensions, d as CreateMeltQuoteInput, f as CreateMintQuoteInput, g as ListPendingMintQuotesInput, h as ListPendingMeltQuotesInput, m as ImportMintQuoteInput, o as Plugin, p as DefaultSupportedMintQuoteMethod, v as MintQuoteApi, w as PrepareMeltInput, x as MeltDiagnosticsApi, y as QuoteApi } from "./plugin-B2hh0g3L.js";
import * as _cashu_cashu_ts0 from "@cashu/cashu-ts";
import { Amount, AmountLike, AmountLike as AmountLike$1, AuthProvider, OutputDataCreator, OutputDataCreator as OutputDataCreator$1, OutputDataLike, PaymentRequest, PaymentRequestPayload, Token, getDecodedToken, getEncodedToken, getTokenMetadata } from "@cashu/cashu-ts";

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
  /** Check whether a mint supports one method/unit pair for minting or melting. */
  checkPaymentMethodCapability(input: CheckPaymentMethodCapabilityInput): Promise<PaymentMethodCapabilityCheck>;
  /** List enabled Payment Method Capabilities advertised by NUT-04/NUT-05 mint metadata. */
  listPaymentMethodCapabilities(input: ListPaymentMethodCapabilitiesInput): Promise<PaymentMethodCapability[]>;
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
  /** Force a default send to swap proofs even when an exact match is available. */
  forceSwap?: boolean;
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
   * state is always reloaded before execution. When provided, `options.memo`
   * is trimmed and persisted on the returned token; whitespace-only memos are omitted.
   */
  execute(operationOrId: SendOperation | string, options?: ExecuteSendOptions): Promise<{
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
//#region api/MintOpsApi.d.ts
/**
 * Mint methods supported by the default `Manager` wiring. Extensible via
 * declaration merging on `MintMethodDefinitions`; custom handlers must be
 * registered with `manager.registerMintMethod()` before use.
 */
type DefaultSupportedMintMethod = MintMethod;
type PrepareMintInput<TSupported extends MintMethod = DefaultSupportedMintMethod> = {
  /** Existing canonical mint quote or structural quote reference. */quote: MintQuoteRef<TSupported>; /** Amount to mint using the canonical quote's stored unit. */
  amount: AmountLike$1;
};
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
   * Executes or resumes a mint operation and returns its latest persisted state.
   *
   * Concurrent calls join active local execution, while terminal outcomes are returned as-is.
   */
  execute(operationOrId: MintOperation | string): Promise<MintOperation>;
  /** Returns a mint operation by ID, or `null` when it does not exist. */
  get(operationId: string): Promise<MintOperation | null>;
  /** Lists mint operations for a mint URL and quote ID. */
  listByQuote(input: QuoteIdentity): Promise<MintOperation[]>;
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
  private requireOperation;
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
   * Optional session-wide strategy used only to construct Cashu output material.
   * Defaults to the standard cashu-ts implementation.
   *
   * This does not customize persisted output reconstruction or guarantee custom proof conversion
   * after serialization. Coco persists only the standard `OutputDataLike` fields and may later
   * reconstruct a cashu-ts `OutputData`, whose built-in `toProof()` implementation is then used. A
   * custom result must still satisfy `OutputDataLike`, but its object identity and `toProof()`
   * implementation are not preserved across serialization.
   */
  outputDataCreator?: OutputDataCreator$1;
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
    }; /** Melt quote watcher (enabled by default) */
    meltQuoteWatcher?: {
      disabled?: boolean;
      watchExistingPendingQuotesOnStart?: boolean;
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
    }; /** Melt settlement processor (enabled by default) */
    meltSettlementProcessor?: {
      disabled?: boolean;
      initializeExistingPendingOperationsOnStart?: boolean;
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
type CocoInitializationCleanupState = 'confirmed' | 'unconfirmed';
/**
 * Reports a failed `initializeCoco()` call and whether its partially initialized Manager was
 * disposed successfully.
 */
declare class CocoInitializationError extends Error {
  readonly cleanupState: CocoInitializationCleanupState;
  constructor(message: string, cleanupState: CocoInitializationCleanupState, cause: unknown);
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
  private meltQuoteWatcher?;
  private meltSettlementProcessor?;
  private legacyMintQuoteRepository;
  private quoteLifecycle;
  private mintHandlerProvider;
  private meltHandlerProvider;
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
  private disposed;
  private disposePromise?;
  private readonly outputDataCreator?;
  constructor(repositories: Repositories, seedGetter: () => Promise<Uint8Array>, logger?: Logger, webSocketFactory?: WebSocketFactory, plugins?: Plugin[], watchers?: CocoConfig['watchers'], processors?: CocoConfig['processors'], subscriptions?: CocoConfig['subscriptions'], outputDataCreator?: OutputDataCreator$1);
  on<E extends keyof CoreEvents>(event: E, handler: (payload: CoreEvents[E]) => void | Promise<void>): () => void;
  once<E extends keyof CoreEvents>(event: E, handler: (payload: CoreEvents[E]) => void | Promise<void>): () => void;
  use(plugin: Plugin): void;
  /**
   * Initialize the plugin system.
   * This is called automatically by `initializeCoco()`.
   * Only call this directly if you instantiate Manager without using the factory.
   */
  initPlugins(): Promise<void>;
  /**
   * Register a custom payment-method handler for a mint (deposit) method.
   *
   * Custom methods beyond the built-ins (`bolt11`, `bolt12`, `onchain`) must be
   * added to the method registries via declaration merging on
   * `MintMethodDefinitions` / `MintMethodInputDefinitions` before handlers can
   * be typed against them. Registration can happen at any time: quote and
   * operation services resolve handlers per call.
   */
  registerMintMethod<M extends MintMethod>(method: M, handler: MintMethodHandler<M>): void;
  /**
   * Register a custom payment-method handler for a melt (withdraw) method.
   *
   * Custom methods beyond the built-ins (`bolt11`, `bolt12`, `onchain`) must be
   * added to the method registries via declaration merging on
   * `MeltMethodDefinitions` / `MeltMethodInputDefinitions` before handlers can
   * be typed against them. Registration can happen at any time: quote and
   * operation services resolve handlers per call.
   */
  registerMeltMethod<M extends MeltMethod>(method: M, handler: MeltMethodHandler<M>): void;
  dispose(): Promise<void>;
  private disposeOwnedResources;
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
  enableMeltQuoteWatcher(options?: {
    watchExistingPendingQuotesOnStart?: boolean;
  }): Promise<void>;
  disableMeltQuoteWatcher(): Promise<void>;
  enableMeltSettlementProcessor(options?: {
    initializeExistingPendingOperationsOnStart?: boolean;
  }): Promise<boolean>;
  disableMeltSettlementProcessor(): Promise<void>;
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
export { Amount, type AmountLike, AuthApi, AuthSession, AuthSessionError, AuthSessionExpiredError, type BalanceBreakdown, type BalanceQuery, type BalanceSnapshot, type BalancesBreakdownByMint, type BalancesByMint, type BalancesByMintAndUnit, type BalancesByUnit, BaseQuoteMeltHandler, Bolt11MintQuote, Bolt12MintQuote, BoltMeltQuote, type BoltMeltQuoteState, CocoConfig, CocoInitializationCleanupState, CocoInitializationError, ConsoleLogger, type CoreEvents, type CoreProof, Counter, CreateIncomingPaymentRequestInput, CreateMeltQuoteInput, CreateMintQuoteInput, DEFAULT_UNIT, type DefaultSendMethodData, DefaultSupportedMeltMethod, DefaultSupportedMintMethod, DefaultSupportedMintQuoteMethod, DerivationIndexExhaustedError, type EventHandler, type ExecutingMeltOperation, type ExecutingMintOperation, type ExecutingReceiveOperation, type ExecutingSendOperation, type FailedMeltOperation, type FailedMintOperation, type FinalizedMeltOperation, type FinalizedMintOperation, type FinalizedReceiveOperation, type FinalizedSendOperation, HistoryApi, HistoryEntry, HistoryType, HttpResponseError, ImportMintQuoteInput, IncomingPaymentRequestsApi, type InitMeltOperation, type InitMintOperation, type InitReceiveOperation, type InitSendOperation, KeyRingApi, Keypair, KeypairPurpose, Keyset, KeysetKeypairs, KeysetSyncError, LegacyHistoryEntry, LegacyHistoryRowInput, LegacyMeltHistoryEntry, LegacyMeltHistoryState, LegacyMintHistoryEntry, LegacyMintHistoryState, LegacyReceiveHistoryEntry, LegacyReceiveHistoryState, LegacySendHistoryEntry, LegacySendHistoryState, ListPendingMeltQuotesInput, ListPendingMintQuotesInput, type Logger, Manager, MeltDiagnosticsApi, MeltHandlerProvider, MeltHistoryEntry, MeltHistoryState, type MeltMethod, type MeltMethodData, type MeltMethodFinalizedData, type MeltMethodHandler, type MeltMethodInputData, type MeltMethodQuoteSnapshot, type MeltMethodRemoteState, type MeltOperation, type MeltOperationState, MeltOpsApi, MeltQuote, MeltQuoteApi, MeltQuoteRef, MeltRecoveryApi, MemoryRepositories, Mint, MintApi, MintDiagnosticsApi, MintFetchError, MintHandlerProvider, MintHistoryEntry, MintHistoryState, type MintMethod, type MintMethodCreateQuoteData, type MintMethodData, type MintMethodHandler, type MintMethodQuoteData, type MintMethodQuoteImportSnapshot, type MintMethodQuoteSnapshot, type MintMethodRemoteState, type MintOperation, MintOperationError, type MintOperationFailure, type MintOperationState, MintOpsApi, MintQuote, MintQuoteApi, MintQuoteKeyError, MintQuoteOnchainResponse, MintQuoteRef, MintQuoteState, MintQuoteValidationError, MintRecoveryApi, NetworkError, OnchainMeltQuote, OnchainMintQuote, OperationHistoryEntry, OperationInProgressError, OpsApi, type OutputDataCreator, type OutputDataLike, type P2pkSendMethodData, type P2pkSendOptions, type ParsedPaymentRequestPayload, PaymentRequestError, type PaymentRequestMalformedSpendingCondition, type PaymentRequestP2pkRequirement, type PaymentRequestReceiveAttempt, type PaymentRequestReceiveAttemptState, type PaymentRequestReceiveOperation, type PaymentRequestReceiveSource, type PaymentRequestReceiveState, type PaymentRequestReceiveTransport, type PaymentRequestSpendingConditionRequirement, type PaymentRequestUnsupportedSpendingCondition, PaymentRequestsApi, type PendingMeltOperation, type PendingMintOperation, type PendingSendOperation, PrepareMeltInput, PrepareMintInput, PrepareReceiveInput, PrepareSendInput, type PreparedMeltOperation, type PreparedReceiveOperation, type PreparedSendOperation, ProofOperationError, type ProofState, ProofValidationError, QuoteApi, QuoteIdentity, QuoteIdentityConflictError, type QuoteMeltResponse, ReceiveDiagnosticsApi, ReceiveHistoryEntry, ReceiveHistoryState, type ReceiveOperation, type ReceiveOperationSource, type ReceiveOperationState, ReceiveOpsApi, ReceiveRecoveryApi, type RolledBackMeltOperation, type RolledBackReceiveOperation, type RolledBackSendOperation, type RollingBackMeltOperation, type RollingBackSendOperation, SendDiagnosticsApi, SendHistoryEntry, SendHistoryState, type SendMethod, type SendMethodData, type SendOperation, type SendOperationState, SendOpsApi, SendRecoveryApi, SendTarget, type TerminalMeltOperation, type TerminalMintOperation, type TerminalReceiveOperation, type TerminalSendOperation, TokenValidationError, UnitAmount, UnitAmountLike, UnitMismatchError, UnitValidationError, UnknownMintError, WalletApi, WalletBalancesApi, WalletRestoreOptions, WalletSweepOptions, type WebSocketFactory, type WebSocketLike, applyBolt11MintQuoteStateFallback, assertSameUnit, assertUnitAmount, compareHistoryEntries, deriveBolt11MintQuoteState, getDecodedToken, getEncodedToken, getMintQuoteAmount, getMintQuoteAvailableAmount, getMintQuoteRemoteState, getTokenMetadata, initializeCoco, isLegacyHistoryEntry, isMintQuotePending, isOperationHistoryEntry, isStatefulMintQuote, isUnitAmountLikeObject, legacyHistoryId, meltQuoteFromBolt11Response, meltQuoteFromBolt12Response, meltQuoteFromOnchainResponse, meltQuoteToMethodSnapshot, mintQuoteFromBolt11Response, mintQuoteFromBolt12Response, mintQuoteFromOnchainResponse, mintQuoteToMethodSnapshot, normalizeMintUrl, normalizeUnit, normalizeUnitAmount, normalizeUnitList, operationHistoryId, parseHistoryEntryId, parseUnitAmount, projectLegacyHistoryRow, projectMeltOperation, projectMintOperation, projectOperationToHistoryEntry, projectReceiveOperation, projectSendOperation, resolveOnchainMeltFeeOption, sameUnitAmount, sumAmounts, toAmount };