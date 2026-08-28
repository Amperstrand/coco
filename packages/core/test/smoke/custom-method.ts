import {
  initializeCoco,
  MemoryRepositories,
  MeltHandlerProvider,
  MintHandlerProvider,
  BaseQuoteMeltHandler,
  type Manager,
  type MintMethodHandler,
} from '@cashu/coco-core';
import { Amount } from '@cashu/cashu-ts';
import type {
  MeltMethodDefinitions,
  MeltMethodInputDefinitions,
  MeltMethodQuoteDefinitions,
} from '@cashu/coco-core/operations/melt';
import type { MintMethodDefinitions } from '@cashu/coco-core/operations/mint';

declare module '@cashu/coco-core/operations/melt' {
  interface MeltMethodInputDefinitions {
    branch: { amount: number; description?: string };
  }
  interface MeltMethodDefinitions {
    branch: { amount: Amount };
  }
  interface MeltMethodQuoteDefinitions {
    branch: {
      quote: string;
      amount: number;
      request: string;
      state: 'UNPAID' | 'PENDING' | 'PAID';
      expiry: number;
      payment_preimage?: string | null;
    };
  }
}

declare module '@cashu/coco-core/operations/mint' {
  interface MintMethodDefinitions {
    branch: {
      methodData: Record<string, never>;
      createQuoteData: {
        amount: { unit: string; value: number };
        description?: string;
        locked?: boolean;
      };
      quoteData: { request: string };
      remoteState: 'UNPAID' | 'PAID' | 'ISSUED';
      quote: {
        quote: string;
        amount: number;
        request: string;
        state: 'UNPAID' | 'PAID';
        expiry: number;
      };
    };
  }
}

class MeltBranchHandler extends BaseQuoteMeltHandler<'branch'> {
  protected readonly method = 'branch' as const;

  protected createRemoteQuote(): Promise<never> {
    throw new Error('smoke test');
  }
  protected fetchRemoteMeltQuote(): Promise<never> {
    throw new Error('smoke test');
  }
  protected executeMelt(): Promise<never> {
    throw new Error('smoke test');
  }
  protected checkMeltQuote(): Promise<never> {
    throw new Error('smoke test');
  }
  protected checkMeltQuoteState(): Promise<'UNPAID' | 'PENDING' | 'PAID'> {
    throw new Error('smoke test');
  }
  protected getFeeReserveForQuote(): Amount {
    throw new Error('smoke test');
  }
  protected buildFinalizedData() {
    return undefined;
  }
}

const mintHandler: MintMethodHandler<'branch'> = {
  createQuote: () => {
    throw new Error('smoke test');
  },
  fetchRemoteQuote: () => {
    throw new Error('smoke test');
  },
  prepare: () => {
    throw new Error('smoke test');
  },
  execute: () => {
    throw new Error('smoke test');
  },
  recoverExecuting: () => {
    throw new Error('smoke test');
  },
  checkPending: () => {
    throw new Error('smoke test');
  },
};

async function main(): Promise<void> {
  const repo = new MemoryRepositories();
  const coco: Manager = await initializeCoco({
    repo,
    seedGetter: () => Promise.resolve(new Uint8Array(64).fill(1)),
  });
  coco.registerMeltMethod('branch', new MeltBranchHandler());
  coco.registerMintMethod('branch', mintHandler);
  await coco.dispose();

  void MeltHandlerProvider;
  void MintHandlerProvider;

  const meltQuoteInput: Parameters<Manager['quotes']['melt']['create']>[0] = {
    mintUrl: 'https://giftcard.cashu.exchange',
    method: 'branch',
    methodData: { amount: 500 },
    unit: 'nok',
  };
  void meltQuoteInput;

  const mintQuoteInput: Parameters<Manager['quotes']['mint']['create']>[0] = {
    mintUrl: 'https://giftcard.cashu.exchange',
    method: 'branch',
    amount: 500,
    unit: 'nok',
    description: 'smoke',
  };
  void mintQuoteInput;

  console.log('smoke ok: types compile, handlers register, API accepts branch');
}

void main();
