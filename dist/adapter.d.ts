import { Amount, AmountLike, MeltQuoteBolt11Response, MeltQuoteBolt12Response, MeltQuoteOnchainFeeOption, MeltQuoteOnchainResponse, MeltQuoteState, Mint as Mint$1, MintQuoteBolt11Response, MintQuoteBolt12Response, MintQuoteOnchainResponse, OutputData, PaymentRequestPayload, Proof, SerializedBlindedSignature, Token } from "@cashu/cashu-ts";

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
interface BalanceQuery {
  mintUrls?: string[];
  units?: string[];
  trustedOnly?: boolean;
}
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
/**
 * Serialize a single OutputData to JSON-safe format
 */
declare function serializeOutput(output: OutputData): SerializedOutput;
/**
 * Deserialize a single SerializedOutput back to OutputData
 */
declare function deserializeOutput(serialized: SerializedOutput): OutputData;
/**
 * Serialize OutputData arrays for keep and send to JSON-safe format
 */
declare function serializeOutputData(data: {
  keep: OutputData[];
  send: OutputData[];
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
declare function serializeAmount(value: AmountLike): string;
declare function stringifyJson(value: unknown): string;
declare function deserializeAmount(value: string | number | bigint | Amount): Amount;
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
//#region amounts.d.ts
declare const DEFAULT_UNIT = "sat";
interface UnitAmount {
  amount: Amount;
  unit: string;
}
declare function normalizeUnit(unit?: string, options?: {
  defaultUnit?: string;
}): string;
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
//#endregion
//#region models/MintQuote.d.ts
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
  amount: Amount;
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
  amount?: Amount;
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
declare function getMintQuoteAmount(quote: MintQuote): Amount | undefined;
declare function isMintQuotePending(quote: MintQuote): boolean;
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
      amount: Amount;
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
      amountPaid: Amount;
      amountIssued: Amount;
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
      amountPaid: Amount;
      amountIssued: Amount;
    };
    remoteState: never;
    quote: MintQuoteBolt12Response;
  };
}
type MintMethod = keyof MintMethodDefinitions;
type MintMethodData<M extends MintMethod = MintMethod> = MintMethodDefinitions[M]['methodData'];
type MintMethodQuoteData<M extends MintMethod = MintMethod> = MintMethodDefinitions[M]['quoteData'];
type MintMethodRemoteState<M extends MintMethod = MintMethod> = MintMethodDefinitions[M]['remoteState'];
interface MintMethodMeta<M extends MintMethod = MintMethod> {
  method: M;
  methodData: MintMethodData<M>;
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
//#region models/Error.d.ts
declare class QuoteIdentityConflictError extends Error {
  readonly kind: 'mint' | 'melt';
  readonly mintUrl: string;
  readonly quoteId: string;
  readonly methods: readonly string[];
  constructor(kind: 'mint' | 'melt', mintUrl: string, quoteId: string, methods: readonly string[], message?: string);
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
//#endregion
//#region operations/paymentRequestReceive/PaymentRequestReceiveOperation.d.ts
type PaymentRequestReceiveState = 'active' | 'completed' | 'cancelled';
type PaymentRequestReceiveAttemptState = 'received' | 'validating' | 'receiving' | 'finalized' | 'rejected';
type PaymentRequestReceiveTransport = 'inband' | 'nostr' | 'post';
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
interface MeltMethodQuoteDefinitions {
  bolt11: MeltQuoteBolt11Response;
  bolt12: MeltQuoteBolt12Response;
  onchain: MeltQuoteOnchainResponse;
}
type MeltMethodInputData<M extends MeltMethod = MeltMethod> = M extends keyof MeltMethodInputDefinitions ? MeltMethodInputDefinitions[M] : never;
type MeltMethodRemoteState<M extends MeltMethod = MeltMethod> = MeltMethodQuoteDefinitions[M]['state'];
interface MeltMethodMeta<M extends MeltMethod = MeltMethod> {
  method: M;
  methodData: MeltMethodData<M>;
}
declare function normalizeMeltMethodData<M extends MeltMethod>(methodData: MeltMethodInputData<M> | MeltMethodData<M>): MeltMethodData<M>;
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
declare function operationHistoryId(type: HistoryType, operationId: string): string;
declare function parseHistoryEntryId(id: string): {
  source: 'operation';
  type: HistoryType;
  operationId: string;
} | {
  source: 'legacy';
  legacyHistoryId: string;
} | null;
declare function compareHistoryEntries(a: HistoryEntry, b: HistoryEntry): number;
declare function projectLegacyHistoryRow(row: LegacyHistoryRowInput): LegacyHistoryEntry;
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
   * Update state for the exact method-scoped mint quote row.
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
   * identity conflict instead of creating an ambiguous methodless public identity.
   */
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
export { type AuthSession, type AuthSessionRepository, type BalanceQuery, type CoreProof, type Counter, type CounterRepository, DEFAULT_UNIT, type HistoryEntry, type HistoryProjectionRepository, type HistoryRepository, type HistoryType, type KeyRingRepository, type Keypair, type KeypairPurpose, type Keyset, type KeysetRepository, type LegacyHistoryEntry, type LegacyHistoryRowInput, type LegacyMintQuoteRepository, type MeltMethod, type MeltMethodData, type MeltMethodInputData, type MeltMethodRemoteState, type MeltOperation, type MeltOperationRepository, type MeltOperationState, type MeltQuote, type MeltQuoteRef, type MeltQuoteRepository, type Mint, type MintMethod, type MintMethodData, type MintMethodRemoteState, type MintOperation, type MintOperationRepository, type MintOperationState, type MintQuote, type MintQuoteRef, type MintQuoteRepository, type MintRepository, type PaymentRequestReceiveAttempt, type PaymentRequestReceiveAttemptRepository, type PaymentRequestReceiveAttemptState, type PaymentRequestReceiveOperation, type PaymentRequestReceiveOperationRepository, type PaymentRequestReceiveState, type PaymentRequestReceiveTransport, type ProofRepository, type ProofState, type ProofUnitFilter, type QuoteIdentity, QuoteIdentityConflictError, type ReceiveOperation, type ReceiveOperationRepository, type ReceiveOperationState, type Repositories, type RepositoryTransactionScope, type SendMethod, type SendMethodData, type SendOperation, type SendOperationRepository, type SendOperationState, type SerializedOutput, type SerializedOutputData, type StoredBlindedMessage, compareHistoryEntries, deserializeAmount, deserializeOutput, deserializeOutputData, deserializeToken, getMintQuoteAmount, getMintQuoteRemoteState, getSecretsFromSerializedOutputData, isMintQuotePending, isStatefulMintQuote, normalizeMeltMethodData, normalizeMintUrl, normalizeUnit, operationHistoryId, parseHistoryEntryId, projectLegacyHistoryRow, serializeAmount, serializeOutput, serializeOutputData, stringifyJson };