import type {
  PaymentRequestReceiveAttempt,
  PaymentRequestReceiveAttemptRepository,
  PaymentRequestReceiveAttemptState,
  PaymentRequestReceiveOperation,
  PaymentRequestReceiveOperationRepository,
  PaymentRequestReceiveState,
  PaymentRequestReceiveTransport,
} from '@cashu/coco-core';
import { deserializeAmount, serializeAmount } from '@cashu/coco-core';
import { D1Db, getUnixTimeSeconds } from '../db.ts';

interface OperationRow {
  id: string;
  requestId: string | null;
  encodedRequest: string;
  state: PaymentRequestReceiveState;
  transport: PaymentRequestReceiveTransport;
  amount: string | number;
  unit: string;
  mintsJson: string;
  singleUse: number;
  description: string | null;
  createdAt: number;
  updatedAt: number;
  error: string | null;
  completedAt: number | null;
}

interface AttemptRow {
  id: string;
  requestOperationId: string;
  requestId: string | null;
  transport: PaymentRequestReceiveTransport;
  transportMessageId: string | null;
  payloadHash: string;
  senderPubkey: string | null;
  memo: string | null;
  mintUrl: string;
  unit: string;
  grossAmount: string | number;
  fee: string | number | null;
  netAmount: string | number | null;
  receiveOperationId: string | null;
  state: PaymentRequestReceiveAttemptState;
  error: string | null;
  payloadJson: string | null;
  createdAt: number;
  updatedAt: number;
}

function operationToRow(operation: PaymentRequestReceiveOperation): OperationRow {
  return {
    id: operation.id,
    requestId: operation.requestId ?? null,
    encodedRequest: operation.encodedRequest,
    state: operation.state,
    transport: operation.transport,
    amount: serializeAmount(operation.amount),
    unit: operation.unit,
    mintsJson: JSON.stringify(operation.mints),
    singleUse: operation.singleUse ? 1 : 0,
    description: operation.description ?? null,
    createdAt: Math.floor(operation.createdAt / 1000),
    updatedAt: Math.floor(operation.updatedAt / 1000),
    error: operation.error ?? null,
    completedAt: operation.completedAt ? Math.floor(operation.completedAt / 1000) : null,
  };
}

function rowToOperation(row: OperationRow): PaymentRequestReceiveOperation {
  return {
    id: row.id,
    requestId: row.requestId ?? undefined,
    encodedRequest: row.encodedRequest,
    state: row.state,
    transport: row.transport,
    amount: deserializeAmount(row.amount),
    unit: row.unit,
    mints: JSON.parse(row.mintsJson) as string[],
    singleUse: row.singleUse === 1,
    description: row.description ?? undefined,
    createdAt: row.createdAt * 1000,
    updatedAt: row.updatedAt * 1000,
    error: row.error ?? undefined,
    completedAt: row.completedAt ? row.completedAt * 1000 : undefined,
  };
}

function attemptToRow(attempt: PaymentRequestReceiveAttempt): AttemptRow {
  return {
    id: attempt.id,
    requestOperationId: attempt.requestOperationId,
    requestId: attempt.requestId ?? null,
    transport: attempt.transport,
    transportMessageId: attempt.transportMessageId ?? null,
    payloadHash: attempt.payloadHash,
    senderPubkey: attempt.senderPubkey ?? null,
    memo: attempt.memo ?? null,
    mintUrl: attempt.mintUrl,
    unit: attempt.unit,
    grossAmount: serializeAmount(attempt.grossAmount),
    fee: attempt.fee ? serializeAmount(attempt.fee) : null,
    netAmount: attempt.netAmount ? serializeAmount(attempt.netAmount) : null,
    receiveOperationId: attempt.receiveOperationId ?? null,
    state: attempt.state,
    error: attempt.error ?? null,
    payloadJson: attempt.payload ? JSON.stringify(attempt.payload) : null,
    createdAt: Math.floor(attempt.createdAt / 1000),
    updatedAt: Math.floor(attempt.updatedAt / 1000),
  };
}

function rowToAttempt(row: AttemptRow): PaymentRequestReceiveAttempt {
  const payload = row.payloadJson
    ? (JSON.parse(row.payloadJson) as PaymentRequestReceiveAttempt['payload'])
    : undefined;
  return {
    id: row.id,
    requestOperationId: row.requestOperationId,
    requestId: row.requestId ?? undefined,
    transport: row.transport,
    transportMessageId: row.transportMessageId ?? undefined,
    payloadHash: row.payloadHash,
    senderPubkey: row.senderPubkey ?? undefined,
    memo: row.memo ?? undefined,
    mintUrl: row.mintUrl,
    unit: row.unit,
    grossAmount: deserializeAmount(row.grossAmount),
    fee: row.fee === null ? undefined : deserializeAmount(row.fee),
    netAmount: row.netAmount === null ? undefined : deserializeAmount(row.netAmount),
    receiveOperationId: row.receiveOperationId ?? undefined,
    state: row.state,
    error: row.error ?? undefined,
    payload,
    createdAt: row.createdAt * 1000,
    updatedAt: row.updatedAt * 1000,
  };
}

export class D1PaymentRequestReceiveOperationRepository
  implements PaymentRequestReceiveOperationRepository
{
  constructor(private readonly db: D1Db) {}

  async create(operation: PaymentRequestReceiveOperation): Promise<void> {
    const row = operationToRow(operation);
    await this.db.run(
      `INSERT INTO coco_cashu_payment_request_receive_operations
        (local_name, id, requestId, encodedRequest, state, transport, amount, unit, mintsJson, singleUse, description, createdAt, updatedAt, error, completedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [this.db.localName, ...Object.values(row)],
    );
  }

  async update(operation: PaymentRequestReceiveOperation): Promise<void> {
    const row = operationToRow({ ...operation, updatedAt: Date.now() });
    await this.db.run(
      `UPDATE coco_cashu_payment_request_receive_operations
       SET requestId = ?, encodedRequest = ?, state = ?, transport = ?, amount = ?, unit = ?,
           mintsJson = ?, singleUse = ?, description = ?, updatedAt = ?, error = ?, completedAt = ?
       WHERE local_name = ? AND id = ?`,
      [
        row.requestId,
        row.encodedRequest,
        row.state,
        row.transport,
        row.amount,
        row.unit,
        row.mintsJson,
        row.singleUse,
        row.description,
        getUnixTimeSeconds(),
        row.error,
        row.completedAt,
        this.db.localName,
        row.id,
      ],
    );
  }

  async getById(id: string): Promise<PaymentRequestReceiveOperation | null> {
    const row = await this.db.get<OperationRow>(
      'SELECT * FROM coco_cashu_payment_request_receive_operations WHERE local_name = ? AND id = ?',
      [this.db.localName, id],
    );
    return row ? rowToOperation(row) : null;
  }

  async getByState(state: PaymentRequestReceiveState): Promise<PaymentRequestReceiveOperation[]> {
    const rows = await this.db.all<OperationRow>(
      'SELECT * FROM coco_cashu_payment_request_receive_operations WHERE local_name = ? AND state = ?',
      [this.db.localName, state],
    );
    return rows.map(rowToOperation);
  }

  async getActiveByRequestId(requestId: string): Promise<PaymentRequestReceiveOperation[]> {
    const rows = await this.db.all<OperationRow>(
      "SELECT * FROM coco_cashu_payment_request_receive_operations WHERE local_name = ? AND state = 'active' AND requestId = ?",
      [this.db.localName, requestId],
    );
    return rows.map(rowToOperation);
  }

  async list(filter?: {
    state?: PaymentRequestReceiveState;
  }): Promise<PaymentRequestReceiveOperation[]> {
    const rows = filter?.state
      ? await this.db.all<OperationRow>(
          'SELECT * FROM coco_cashu_payment_request_receive_operations WHERE local_name = ? AND state = ?',
          [this.db.localName, filter.state],
        )
      : await this.db.all<OperationRow>(
          'SELECT * FROM coco_cashu_payment_request_receive_operations WHERE local_name = ?',
          [this.db.localName],
        );
    return rows.map(rowToOperation);
  }
}

export class D1PaymentRequestReceiveAttemptRepository
  implements PaymentRequestReceiveAttemptRepository
{
  constructor(private readonly db: D1Db) {}

  async create(attempt: PaymentRequestReceiveAttempt): Promise<void> {
    const row = attemptToRow(attempt);
    await this.db.run(
      `INSERT INTO coco_cashu_payment_request_receive_attempts
        (local_name, id, requestOperationId, requestId, transport, transportMessageId, payloadHash, senderPubkey,
         memo, mintUrl, unit, grossAmount, fee, netAmount, receiveOperationId, state, error,
         payloadJson, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [this.db.localName, ...Object.values(row)],
    );
  }

  async update(attempt: PaymentRequestReceiveAttempt): Promise<void> {
    const row = attemptToRow({ ...attempt, updatedAt: Date.now() });
    await this.db.run(
      `UPDATE coco_cashu_payment_request_receive_attempts
       SET requestId = ?, transport = ?, transportMessageId = ?, payloadHash = ?, senderPubkey = ?,
           memo = ?, mintUrl = ?, unit = ?, grossAmount = ?, fee = ?, netAmount = ?,
           receiveOperationId = ?, state = ?, error = ?, payloadJson = ?, updatedAt = ?
       WHERE local_name = ? AND id = ?`,
      [
        row.requestId,
        row.transport,
        row.transportMessageId,
        row.payloadHash,
        row.senderPubkey,
        row.memo,
        row.mintUrl,
        row.unit,
        row.grossAmount,
        row.fee,
        row.netAmount,
        row.receiveOperationId,
        row.state,
        row.error,
        row.payloadJson,
        getUnixTimeSeconds(),
        this.db.localName,
        row.id,
      ],
    );
  }

  async getById(id: string): Promise<PaymentRequestReceiveAttempt | null> {
    const row = await this.db.get<AttemptRow>(
      'SELECT * FROM coco_cashu_payment_request_receive_attempts WHERE local_name = ? AND id = ?',
      [this.db.localName, id],
    );
    return row ? rowToAttempt(row) : null;
  }

  async getByRequestOperationId(
    requestOperationId: string,
  ): Promise<PaymentRequestReceiveAttempt[]> {
    const rows = await this.db.all<AttemptRow>(
      'SELECT * FROM coco_cashu_payment_request_receive_attempts WHERE local_name = ? AND requestOperationId = ?',
      [this.db.localName, requestOperationId],
    );
    return rows.map(rowToAttempt);
  }

  async getByReceiveOperationId(
    receiveOperationId: string,
  ): Promise<PaymentRequestReceiveAttempt | null> {
    const row = await this.db.get<AttemptRow>(
      'SELECT * FROM coco_cashu_payment_request_receive_attempts WHERE local_name = ? AND receiveOperationId = ?',
      [this.db.localName, receiveOperationId],
    );
    return row ? rowToAttempt(row) : null;
  }

  async getByTransportMessageId(
    transportMessageId: string,
  ): Promise<PaymentRequestReceiveAttempt | null> {
    const row = await this.db.get<AttemptRow>(
      'SELECT * FROM coco_cashu_payment_request_receive_attempts WHERE local_name = ? AND transportMessageId = ?',
      [this.db.localName, transportMessageId],
    );
    return row ? rowToAttempt(row) : null;
  }

  async getByPayloadHash(
    requestOperationId: string,
    payloadHash: string,
  ): Promise<PaymentRequestReceiveAttempt | null> {
    const row = await this.db.get<AttemptRow>(
      'SELECT * FROM coco_cashu_payment_request_receive_attempts WHERE local_name = ? AND requestOperationId = ? AND payloadHash = ?',
      [this.db.localName, requestOperationId, payloadHash],
    );
    return row ? rowToAttempt(row) : null;
  }

  async getByRequestIdAndPayloadHash(
    requestId: string,
    payloadHash: string,
  ): Promise<PaymentRequestReceiveAttempt | null> {
    const row = await this.db.get<AttemptRow>(
      `SELECT * FROM coco_cashu_payment_request_receive_attempts
       WHERE local_name = ? AND requestId = ? AND payloadHash = ?
       ORDER BY CASE WHEN state = 'finalized' THEN 0 ELSE 1 END, createdAt ASC
       LIMIT 1`,
      [this.db.localName, requestId, payloadHash],
    );
    return row ? rowToAttempt(row) : null;
  }

  async getByState(
    state: PaymentRequestReceiveAttemptState,
  ): Promise<PaymentRequestReceiveAttempt[]> {
    const rows = await this.db.all<AttemptRow>(
      'SELECT * FROM coco_cashu_payment_request_receive_attempts WHERE local_name = ? AND state = ?',
      [this.db.localName, state],
    );
    return rows.map(rowToAttempt);
  }

  async delete(id: string): Promise<void> {
    await this.db.run(
      'DELETE FROM coco_cashu_payment_request_receive_attempts WHERE local_name = ? AND id = ?',
      [this.db.localName, id],
    );
  }
}
