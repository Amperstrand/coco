import { BalanceQuery } from '@cashu/coco-core';
import { BalancesByMint } from '@cashu/coco-core';
import { BalancesByMintAndUnit } from '@cashu/coco-core';
import { BalancesByUnit } from '@cashu/coco-core';
import { BalanceSnapshot } from '@cashu/coco-core';
import { CocoConfig } from '@cashu/coco-core';
import { Context } from 'react';
import { HistoryEntry } from '@cashu/coco-core';
import { JSX } from 'react/jsx-runtime';
import { Manager } from '@cashu/coco-core';
import { MeltOperation } from '@cashu/coco-core';
import { Mint } from '@cashu/coco-core';
import { PreparedSendOperation } from '@cashu/coco-core';
import { ReceiveOperation } from '@cashu/coco-core';
import { SendOperation } from '@cashu/coco-core';

export declare type AddMintOptions = {
    trusted?: boolean;
};

export declare type BalanceContextValue = {
    balances: WalletBalancesValue;
};

export declare const BalanceCtx: Context<BalanceContextValue | undefined>;

export declare const BalanceProvider: ({ children }: {
    children: React.ReactNode;
}) => JSX.Element;

export declare const CocoCashuProvider: (props: CocoCashuProviderProps) => JSX.Element;

declare type CocoCashuProviderBaseProps = {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    errorFallback?: React.ReactNode | ((error: Error) => React.ReactNode);
};

export declare type CocoCashuProviderProps = CocoCashuProviderBaseProps & ({
    config: CocoConfig;
    manager?: never;
} | {
    manager: Manager;
    config?: never;
});

/**
 * Creates a Coco seed getter backed by browser localStorage.
 *
 * The returned getter reads or creates the seed once, then serves it from its
 * closure on later calls.
 *
 * @warning This is an opt-in convenience helper for development, demos, or applications that
 * accept localStorage's security model. Any JavaScript running on the same origin can read or
 * replace the Wallet Seed. Do not use it for Wallets that hold real funds. For production, provide
 * a `seedGetter` backed by storage appropriate for your application's threat model.
 */
export declare const localStorageSeedGetter: (config?: LocalStorageSeedGetterConfig) => () => Promise<Uint8Array>;

export declare type LocalStorageSeedGetterConfig = {
    storageKey?: string;
};

export declare type ManagerContextValue = {
    manager: Manager | null;
    ready: boolean;
    error: Error | null;
    waitUntilReady: () => Promise<Manager>;
};

export declare const ManagerCtx: Context<ManagerContextValue>;

/**
 * Renders children only when manager is initialized.
 * Optionally accepts a fallback (e.g., spinner or null) while initializing,
 * and an errorFallback for error state.
 */
export declare const ManagerGate: ({ children, fallback, errorFallback, }: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    errorFallback?: React.ReactNode;
}) => JSX.Element;

export declare const ManagerProvider: ({ manager, children, }: {
    manager: Manager;
    children: React.ReactNode;
}) => JSX.Element;

export declare type MeltOperationByQuoteInput = Parameters<MeltOps['getByQuote']>[0];

export declare type MeltOperationByQuoteResult = Awaited<ReturnType<MeltOps['getByQuote']>>;

export declare type MeltOperationExecuteResult = Awaited<ReturnType<MeltOps['execute']>>;

export declare type MeltOperationListByQuoteInput = Parameters<MeltOps['listByQuote']>[0];

export declare type MeltOperationListByQuoteResult = Awaited<ReturnType<MeltOps['listByQuote']>>;

export declare type MeltOperationPrepareInput = Parameters<MeltOps['prepare']>[0];

export declare type MeltOperationPrepareResult = Awaited<ReturnType<MeltOps['prepare']>>;

declare type MeltOps = Manager['ops']['melt'];

export declare type MintContextValue = {
    /** All mints (trusted and untrusted) */
    mints: Mint[];
    /** Only trusted mints */
    trustedMints: Mint[];
    /** Add a new mint. By default, mints are added as untrusted. */
    addNewMint: (mintUrl: string, options?: AddMintOptions) => Promise<void>;
    /** Mark a mint as trusted */
    trustMint: (mintUrl: string) => Promise<void>;
    /** Mark a mint as untrusted */
    untrustMint: (mintUrl: string) => Promise<void>;
    /** Check if a mint is trusted */
    isTrustedMint: (mintUrl: string) => Promise<boolean>;
};

export declare const MintCtx: Context<MintContextValue | undefined>;

declare type MintOperation = NonNullable<Awaited<ReturnType<MintOps['get']>>>;

export declare type MintOperationCheckPaymentResult = Awaited<ReturnType<MintOps['checkPayment']>>;

export declare type MintOperationExecuteResult = Awaited<ReturnType<MintOps['execute']>>;

export declare type MintOperationFinalizeResult = Awaited<ReturnType<MintOps['finalize']>>;

export declare type MintOperationListByQuoteInput = Parameters<MintOps['listByQuote']>[0];

export declare type MintOperationListByQuoteResult = Awaited<ReturnType<MintOps['listByQuote']>>;

export declare type MintOperationPendingList = Awaited<ReturnType<MintOps['listPending']>>;

export declare type MintOperationPrepareInput = Parameters<MintOps['prepare']>[0];

export declare type MintOperationPrepareResult = Awaited<ReturnType<MintOps['prepare']>>;

declare type MintOps = Manager['ops']['mint'];

export declare const MintProvider: ({ children }: {
    children: React.ReactNode;
}) => JSX.Element;

export declare type OperationBinding<TOperation extends {
    id: string;
}> = string | TOperation;

export declare interface OperationHookResult<TOperation extends {
    id: string;
}, TExecuteResult> {
    currentOperation: TOperation | null;
    executeResult: TExecuteResult | null;
    status: OperationHookStatus;
    error: Error | null;
    isLoading: boolean;
    isError: boolean;
    refresh(): Promise<TOperation>;
    reset(): void;
}

export declare type OperationHookStatus = 'idle' | 'loading' | 'success' | 'error';

export declare type ReceiveOperationExecuteResult = Awaited<ReturnType<ReceiveOps['execute']>>;

export declare type ReceiveOperationPrepareInput = Parameters<ReceiveOps['prepare']>[0];

export declare type ReceiveOperationPrepareResult = Awaited<ReturnType<ReceiveOps['prepare']>>;

declare type ReceiveOps = Manager['ops']['receive'];

export declare type SendOperationExecuteResult = Awaited<ReturnType<SendOps['execute']>>;

export declare type SendOperationPrepareInput = Parameters<SendOps['prepare']>[0];

declare type SendOps = Manager['ops']['send'];

export declare type TrustedBalanceValue = WalletBalancesValue;

export declare const useBalanceContext: () => BalanceContextValue;

export declare const useBalances: (scope?: BalanceQuery) => {
    balances: WalletBalancesValue;
    refresh: () => Promise<void>;
};

export declare const useManager: () => Manager;

export declare const useManagerContext: () => ManagerContextValue;

export declare function useMeltOperation(initialBinding?: OperationBinding<MeltOperation> | null): UseMeltOperationResult;

export declare interface UseMeltOperationResult extends OperationHookResult<MeltOperation, MeltOperationExecuteResult> {
    prepare(input: MeltOperationPrepareInput): Promise<MeltOperationPrepareResult>;
    execute(): Promise<MeltOperationExecuteResult>;
    cancel(): Promise<void>;
    reclaim(): Promise<void>;
    finalize(): Promise<void>;
    getByQuote(input: MeltOperationByQuoteInput): Promise<MeltOperationByQuoteResult>;
    listByQuote(input: MeltOperationListByQuoteInput): Promise<MeltOperationListByQuoteResult>;
    listPrepared(): Promise<MeltOperationPrepareResult[]>;
    listInFlight(): Promise<MeltOperation[]>;
}

export declare function useMintOperation(initialBinding?: OperationBinding<MintOperation> | null): UseMintOperationResult;

export declare interface UseMintOperationResult extends OperationHookResult<MintOperation, MintOperationExecuteResult> {
    prepare(input: MintOperationPrepareInput): Promise<MintOperationPrepareResult>;
    execute(): Promise<MintOperationExecuteResult>;
    checkPayment(): Promise<MintOperationCheckPaymentResult>;
    finalize(): Promise<MintOperationFinalizeResult>;
    listByQuote(input: MintOperationListByQuoteInput): Promise<MintOperationListByQuoteResult>;
    listPending(): Promise<MintOperationPendingList>;
    listInFlight(): Promise<MintOperation[]>;
}

export declare const useMints: () => MintContextValue;

export declare const usePaginatedHistory: (pageSize?: number) => UsePaginatedHistoryResult;

export declare type UsePaginatedHistoryResult = {
    history: HistoryEntry[];
    loadMore: () => Promise<void>;
    goToPage: (page: number) => Promise<void>;
    refresh: () => Promise<void>;
    hasMore: boolean;
    isFetching: boolean;
};

export declare function useReceiveOperation(initialBinding?: OperationBinding<ReceiveOperation> | null): UseReceiveOperationResult;

export declare interface UseReceiveOperationResult extends OperationHookResult<ReceiveOperation, ReceiveOperationExecuteResult> {
    prepare(input: ReceiveOperationPrepareInput): Promise<ReceiveOperationPrepareResult>;
    execute(): Promise<ReceiveOperationExecuteResult>;
    cancel(): Promise<void>;
    listPrepared(): Promise<ReceiveOperationPrepareResult[]>;
    listInFlight(): Promise<ReceiveOperation[]>;
}

export declare function useSendOperation(initialBinding?: OperationBinding<SendOperation> | null): UseSendOperationResult;

export declare interface UseSendOperationResult extends OperationHookResult<SendOperation, SendOperationExecuteResult> {
    prepare(input: SendOperationPrepareInput): Promise<PreparedSendOperation>;
    execute(): Promise<SendOperationExecuteResult>;
    cancel(): Promise<void>;
    reclaim(): Promise<void>;
    finalize(): Promise<void>;
    listPrepared(): Promise<PreparedSendOperation[]>;
    listInFlight(): Promise<SendOperation[]>;
}

/**
 * Hook that returns balances only for trusted mints.
 * Returns canonical per-mint snapshots plus an aggregated total.
 */
export declare const useTrustedBalance: () => {
    balances: WalletBalancesValue;
    refresh: () => Promise<void>;
};

/**
 * Convenience hook that returns only trusted mints and trust management functions.
 */
export declare const useTrustedMints: () => {
    mints: Mint[];
    trustMint: (mintUrl: string) => Promise<void>;
    untrustMint: (mintUrl: string) => Promise<void>;
    isTrustedMint: (mintUrl: string) => Promise<boolean>;
};

export declare type WalletBalancesValue = {
    byMint: BalancesByMint;
    byMintAndUnit: BalancesByMintAndUnit;
    byUnit: BalancesByUnit;
    total: BalanceSnapshot;
    totalByUnit: BalancesByUnit;
};

export { }
