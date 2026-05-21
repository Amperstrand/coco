import type { OutputData, Proof } from '@cashu/cashu-ts';
import type {
  ExecuteContext,
  FinalizeContext,
  PendingContext,
  RecoverExecutingContext,
} from '@core/operations/melt';
import {
  BaseBoltMeltHandler,
  type BoltMeltQuoteResponse,
  type BoltMeltQuoteState,
} from './BaseBoltMeltHandler.ts';

export class MeltBolt11Handler extends BaseBoltMeltHandler<'bolt11'> {
  protected readonly method = 'bolt11' as const;

  protected executeMelt(
    ctx: ExecuteContext<'bolt11'>,
    proofsToMelt: Proof[],
    changeOutputs: OutputData[],
    quoteId: string,
  ): Promise<BoltMeltQuoteResponse> {
    return ctx.mintAdapter.customMeltBolt11(
      ctx.operation.mintUrl,
      proofsToMelt,
      changeOutputs,
      quoteId,
    );
  }

  protected checkMeltQuote(
    ctx: FinalizeContext<'bolt11'> | RecoverExecutingContext<'bolt11'>,
  ): Promise<BoltMeltQuoteResponse> {
    return ctx.mintAdapter.checkMeltQuote(ctx.operation.mintUrl, ctx.operation.quoteId);
  }

  protected checkMeltQuoteState(
    ctx: PendingContext<'bolt11'> | RecoverExecutingContext<'bolt11'>,
  ): Promise<BoltMeltQuoteState> {
    return ctx.mintAdapter.checkMeltQuoteState(ctx.operation.mintUrl, ctx.operation.quoteId);
  }
}
