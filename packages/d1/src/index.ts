import type {
  Repositories,
  MintRepository,
  KeysetRepository,
  KeyRingRepository,
  CounterRepository,
  ProofRepository,
  MeltQuoteRepository,
  MintQuoteRepository,
  LegacyMintQuoteRepository,
  SendOperationRepository,
  MeltOperationRepository,
  AuthSessionRepository,
  MintOperationRepository,
  PaymentRequestReceiveAttemptRepository,
  PaymentRequestReceiveOperationRepository,
  ReceiveOperationRepository,
  RepositoryTransactionScope,
} from '@cashu/coco-core';
import { D1Db } from './db.ts';
import { ensureSchema } from './schema.ts';
import { D1MintRepository } from './repositories/MintRepository.ts';
import { D1KeysetRepository } from './repositories/KeysetRepository.ts';
import { D1KeyRingRepository } from './repositories/KeyRingRepository.ts';
import { D1CounterRepository } from './repositories/CounterRepository.ts';
import { D1ProofRepository } from './repositories/ProofRepository.ts';
import { D1MeltQuoteRepository } from './repositories/MeltQuoteRepository.ts';
import { D1MintQuoteRepository } from './repositories/MintQuoteRepository.ts';
import { D1LegacyMintQuoteRepository } from './repositories/LegacyMintQuoteRepository.ts';
import { D1HistoryRepository } from './repositories/HistoryRepository.ts';
import { D1SendOperationRepository } from './repositories/SendOperationRepository.ts';
import { D1MeltOperationRepository } from './repositories/MeltOperationRepository.ts';
import { D1AuthSessionRepository } from './repositories/AuthSessionRepository.ts';
import { D1MintOperationRepository } from './repositories/MintOperationRepository.ts';
import { D1ReceiveOperationRepository } from './repositories/ReceiveOperationRepository.ts';
import {
  D1PaymentRequestReceiveAttemptRepository,
  D1PaymentRequestReceiveOperationRepository,
} from './repositories/PaymentRequestReceiveRepository.ts';

export interface D1RepositoriesOptions {
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
export class D1Repositories implements Repositories {
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

  constructor(options: D1RepositoriesOptions) {
    this.db = new D1Db(options.d1Database, options.localName);
    this.mintRepository = new D1MintRepository(this.db);
    this.keyRingRepository = new D1KeyRingRepository(this.db);
    this.counterRepository = new D1CounterRepository(this.db);
    this.keysetRepository = new D1KeysetRepository(this.db);
    this.proofRepository = new D1ProofRepository(this.db);
    this.meltQuoteRepository = new D1MeltQuoteRepository(this.db);
    this.mintQuoteRepository = new D1MintQuoteRepository(this.db);
    this.legacyMintQuoteRepository = new D1LegacyMintQuoteRepository(this.db);
    this.historyRepository = new D1HistoryRepository(this.db);
    this.sendOperationRepository = new D1SendOperationRepository(this.db);
    this.meltOperationRepository = new D1MeltOperationRepository(this.db);
    this.authSessionRepository = new D1AuthSessionRepository(this.db);
    this.mintOperationRepository = new D1MintOperationRepository(this.db);
    this.receiveOperationRepository = new D1ReceiveOperationRepository(this.db);
    this.paymentRequestReceiveOperationRepository =
      new D1PaymentRequestReceiveOperationRepository(this.db);
    this.paymentRequestReceiveAttemptRepository = new D1PaymentRequestReceiveAttemptRepository(
      this.db,
    );
  }

  async init(): Promise<void> {
    await ensureSchema(this.db);
  }

  async withTransaction<T>(fn: (repos: RepositoryTransactionScope) => Promise<T>): Promise<T> {
    // For D1, we create scoped repository instances that share the same db.
    // D1's single-writer model provides serializability for concurrent writes.
    // A future version can collect statements via db.batch() for true atomicity.
    const scopedRepositories: RepositoryTransactionScope = {
      mintRepository: new D1MintRepository(this.db),
      keyRingRepository: new D1KeyRingRepository(this.db),
      counterRepository: new D1CounterRepository(this.db),
      keysetRepository: new D1KeysetRepository(this.db),
      proofRepository: new D1ProofRepository(this.db),
      meltQuoteRepository: new D1MeltQuoteRepository(this.db),
      mintQuoteRepository: new D1MintQuoteRepository(this.db),
      legacyMintQuoteRepository: new D1LegacyMintQuoteRepository(this.db),
      historyRepository: new D1HistoryRepository(this.db),
      sendOperationRepository: new D1SendOperationRepository(this.db),
      meltOperationRepository: new D1MeltOperationRepository(this.db),
      authSessionRepository: new D1AuthSessionRepository(this.db),
      mintOperationRepository: new D1MintOperationRepository(this.db),
      receiveOperationRepository: new D1ReceiveOperationRepository(this.db),
      paymentRequestReceiveOperationRepository:
        new D1PaymentRequestReceiveOperationRepository(this.db),
      paymentRequestReceiveAttemptRepository: new D1PaymentRequestReceiveAttemptRepository(
        this.db,
      ),
    };

    return fn(scopedRepositories);
  }
}

export {
  D1Db,
  ensureSchema,
  D1MintRepository,
  D1KeyRingRepository,
  D1KeysetRepository,
  D1CounterRepository,
  D1ProofRepository,
  D1MeltQuoteRepository,
  D1MintQuoteRepository,
  D1LegacyMintQuoteRepository,
  D1HistoryRepository,
  D1SendOperationRepository,
  D1MeltOperationRepository,
  D1AuthSessionRepository,
  D1MintOperationRepository,
  D1ReceiveOperationRepository,
  D1PaymentRequestReceiveOperationRepository,
  D1PaymentRequestReceiveAttemptRepository,
};
