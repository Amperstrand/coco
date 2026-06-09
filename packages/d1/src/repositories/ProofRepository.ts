import {
  DEFAULT_UNIT,
  deserializeAmount,
  normalizeUnit,
  serializeAmount,
  type ProofRepository,
  type ProofUnitFilter,
  type CoreProof,
  type ProofState,
} from '@cashu/coco-core';
import { D1Db, getUnixTimeSeconds } from '../db.ts';

interface ProofRow {
  mintUrl: string;
  id: string;
  unit: string | null;
  amount: string | number;
  secret: string;
  C: string;
  dleqJson: string | null;
  witnessJson: string | null;
  state: ProofState;
  usedByOperationId: string | null;
  createdByOperationId: string | null;
}

const MAX_PROOF_SECRET_LOOKUP_BATCH_SIZE = 900;

const PROOF_COLUMNS =
  'mintUrl, id, unit, amount, secret, C, dleqJson, witnessJson, state, usedByOperationId, createdByOperationId';

function normalizeProofUnit(proof: CoreProof): string {
  return normalizeUnit((proof as { unit?: string }).unit);
}

function getUnitFilter(filter?: ProofUnitFilter): string[] | undefined {
  const units = [...(filter?.units ?? []), ...(filter?.unit ? [filter.unit] : [])];
  if (units.length === 0) return undefined;
  return Array.from(new Set(units.map((unit) => normalizeUnit(unit))));
}

function appendUnitFilter(sql: string, params: unknown[], filter?: ProofUnitFilter): string {
  const units = getUnitFilter(filter);
  if (!units || units.length === 0) return sql;
  if (units.length === 1) {
    params.push(units[0]);
    return `${sql} AND unit = ?`;
  }
  params.push(...units);
  return `${sql} AND unit IN (${units.map(() => '?').join(', ')})`;
}

function rowToProof(r: ProofRow): CoreProof {
  const base = {
    id: r.id,
    amount: deserializeAmount(r.amount),
    secret: r.secret,
    C: r.C,
    ...(r.dleqJson ? { dleq: JSON.parse(r.dleqJson) } : {}),
    ...(r.witnessJson ? { witness: JSON.parse(r.witnessJson) } : {}),
  };
  return {
    ...base,
    mintUrl: r.mintUrl,
    unit: normalizeUnit(r.unit ?? undefined, { defaultUnit: DEFAULT_UNIT }),
    state: r.state,
    ...(r.usedByOperationId ? { usedByOperationId: r.usedByOperationId } : {}),
    ...(r.createdByOperationId ? { createdByOperationId: r.createdByOperationId } : {}),
  };
}

export class D1ProofRepository implements ProofRepository {
  private readonly db: D1Db;

  constructor(db: D1Db) {
    this.db = db;
  }

  async saveProofs(mintUrl: string, proofs: CoreProof[]): Promise<void> {
    if (!proofs || proofs.length === 0) return;
    const now = getUnixTimeSeconds();
    const normalizedProofs = proofs.map((proof) => ({
      ...proof,
      unit: normalizeProofUnit(proof),
    }));

    // Batch existence check using IN clause (chunked for D1 query size limits)
    for (let i = 0; i < normalizedProofs.length; i += MAX_PROOF_SECRET_LOOKUP_BATCH_SIZE) {
      const chunk = normalizedProofs.slice(i, i + MAX_PROOF_SECRET_LOOKUP_BATCH_SIZE);
      const secrets = chunk.map((p) => p.secret);
      const placeholders = secrets.map(() => '?').join(', ');
      const existing = await this.db.all<{ secret: string }>(
        `SELECT secret FROM coco_cashu_proofs WHERE local_name = ? AND mintUrl = ? AND secret IN (${placeholders})`,
        [this.db.localName, mintUrl, ...secrets],
      );
      if (existing.length > 0) {
        throw new Error(
          `Proofs with secrets already exist: ${existing.map((r) => r.secret).join(', ')}`,
        );
      }
    }

    // Batch INSERT via db.batch() — single atomic round-trip instead of N sequential INSERTs
    const insertSql =
      'INSERT INTO coco_cashu_proofs (local_name, mintUrl, id, unit, amount, secret, C, dleqJson, witnessJson, state, createdAt, usedByOperationId, createdByOperationId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const stmts = normalizedProofs.map((p) => {
      const dleqJson = p.dleq ? JSON.stringify(p.dleq) : null;
      const witnessJson = p.witness ? JSON.stringify(p.witness) : null;
      return this.db
        .prepare(insertSql)
        .bind(
          this.db.localName,
          mintUrl,
          p.id,
          p.unit,
          serializeAmount(p.amount),
          p.secret,
          p.C,
          dleqJson,
          witnessJson,
          p.state,
          now,
          p.usedByOperationId ?? null,
          p.createdByOperationId ?? null,
        );
    });
    await this.db.batch(stmts);
  }

  async getReadyProofs(mintUrl: string, filter?: ProofUnitFilter): Promise<CoreProof[]> {
    const params: unknown[] = [this.db.localName, mintUrl];
    const rows = await this.db.all<ProofRow>(
      appendUnitFilter(
        `SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND mintUrl = ? AND state = 'ready'`,
        params,
        filter,
      ),
      params,
    );
    return rows.map(rowToProof);
  }

  async getInflightProofs(mintUrls?: string[], filter?: ProofUnitFilter): Promise<CoreProof[]> {
    if (!mintUrls || mintUrls.length === 0) {
      const params: unknown[] = [this.db.localName];
      const rows = await this.db.all<ProofRow>(
        appendUnitFilter(
          `SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND state = 'inflight'`,
          params,
          filter,
        ),
        params,
      );
      return rows.map(rowToProof);
    }
    const mintUrlList = mintUrls.map((url) => url.trim()).filter((url) => url.length > 0);
    if (mintUrlList.length === 0) return [];
    const uniqueMintUrls = Array.from(new Set(mintUrlList));
    const placeholders = uniqueMintUrls.map(() => '?').join(', ');
    const params: unknown[] = [this.db.localName, ...uniqueMintUrls];
    const rows = await this.db.all<ProofRow>(
      appendUnitFilter(
        `SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND state = 'inflight' AND mintUrl IN (${placeholders})`,
        params,
        filter,
      ),
      params,
    );
    return rows.map(rowToProof);
  }

  async getAllReadyProofs(filter?: ProofUnitFilter): Promise<CoreProof[]> {
    const params: unknown[] = [this.db.localName];
    const rows = await this.db.all<ProofRow>(
      appendUnitFilter(
        `SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND state = 'ready'`,
        params,
        filter,
      ),
      params,
    );
    return rows.map(rowToProof);
  }

  async getProofsByKeysetId(
    mintUrl: string,
    keysetId: string,
    filter?: ProofUnitFilter,
  ): Promise<CoreProof[]> {
    const params: unknown[] = [this.db.localName, mintUrl, keysetId];
    const rows = await this.db.all<ProofRow>(
      appendUnitFilter(
        `SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND mintUrl = ? AND id = ? AND state = 'ready'`,
        params,
        filter,
      ),
      params,
    );
    return rows.map(rowToProof);
  }

  async setProofState(mintUrl: string, secrets: string[], state: ProofState): Promise<void> {
    if (!secrets || secrets.length === 0) return;
    const stmts = secrets.map((s) =>
      this.db
        .prepare('UPDATE coco_cashu_proofs SET state = ? WHERE local_name = ? AND mintUrl = ? AND secret = ?')
        .bind(state, this.db.localName, mintUrl, s),
    );
    await this.db.batch(stmts);
  }

  async deleteProofs(mintUrl: string, secrets: string[]): Promise<void> {
    if (!secrets || secrets.length === 0) return;
    const stmts = secrets.map((s) =>
      this.db
        .prepare('DELETE FROM coco_cashu_proofs WHERE local_name = ? AND mintUrl = ? AND secret = ?')
        .bind(this.db.localName, mintUrl, s),
    );
    await this.db.batch(stmts);
  }

  async wipeProofsByKeysetId(mintUrl: string, keysetId: string): Promise<void> {
    await this.db.run('DELETE FROM coco_cashu_proofs WHERE local_name = ? AND mintUrl = ? AND id = ?;', [
      this.db.localName,
      mintUrl,
      keysetId,
    ]);
  }

  async reserveProofs(mintUrl: string, secrets: string[], operationId: string): Promise<void> {
    if (!secrets || secrets.length === 0) return;

    // Atomic conditional UPDATE — only reserves if state='ready' AND usedByOperationId IS NULL.
    // This eliminates the TOCTOU race that existed with the previous SELECT→UPDATE pattern.
    const stmts = secrets.map((secret) =>
      this.db
        .prepare(
          "UPDATE coco_cashu_proofs SET usedByOperationId = ? WHERE local_name = ? AND mintUrl = ? AND secret = ? AND state = 'ready' AND usedByOperationId IS NULL",
        )
        .bind(operationId, this.db.localName, mintUrl, secret),
    );

    const results = await this.db.batch(stmts);

    // Verify all proofs were reserved — meta.changes > 0 means the WHERE matched
    for (let i = 0; i < results.length; i++) {
      if (!results[i]?.meta?.changes) {
        // Partial reservation — release any already-reserved proofs before failing
        if (i > 0) {
          const releaseStmts = secrets.slice(0, i).map((secret) =>
            this.db
              .prepare(
                'UPDATE coco_cashu_proofs SET usedByOperationId = NULL WHERE local_name = ? AND mintUrl = ? AND secret = ?',
              )
              .bind(this.db.localName, mintUrl, secret),
          );
          await this.db.batch(releaseStmts);
        }
        throw new Error(`Proof is not available for reservation: ${secrets[i]}`);
      }
    }
  }

  async releaseProofs(mintUrl: string, secrets: string[]): Promise<void> {
    if (!secrets || secrets.length === 0) return;
    const stmts = secrets.map((s) =>
      this.db
        .prepare('UPDATE coco_cashu_proofs SET usedByOperationId = NULL WHERE local_name = ? AND mintUrl = ? AND secret = ?')
        .bind(this.db.localName, mintUrl, s),
    );
    await this.db.batch(stmts);
  }

  async setCreatedByOperation(
    mintUrl: string,
    secrets: string[],
    operationId: string,
  ): Promise<void> {
    if (!secrets || secrets.length === 0) return;
    const stmts = secrets.map((s) =>
      this.db
        .prepare('UPDATE coco_cashu_proofs SET createdByOperationId = ? WHERE local_name = ? AND mintUrl = ? AND secret = ?')
        .bind(operationId, this.db.localName, mintUrl, s),
    );
    await this.db.batch(stmts);
  }

  async getProofBySecret(mintUrl: string, secret: string): Promise<CoreProof | null> {
    const row = await this.db.get<ProofRow>(
      `SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND mintUrl = ? AND secret = ?`,
      [this.db.localName, mintUrl, secret],
    );
    return row ? rowToProof(row) : null;
  }

  async getProofsBySecrets(mintUrl: string, secrets: string[]): Promise<CoreProof[]> {
    if (!secrets || secrets.length === 0) {
      return [];
    }

    const uniqueSecrets = Array.from(new Set(secrets));
    const proofsBySecret = new Map<string, CoreProof>();

    for (let i = 0; i < uniqueSecrets.length; i += MAX_PROOF_SECRET_LOOKUP_BATCH_SIZE) {
      const secretBatch = uniqueSecrets.slice(i, i + MAX_PROOF_SECRET_LOOKUP_BATCH_SIZE);
      const placeholders = secretBatch.map(() => '?').join(', ');
      const rows = await this.db.all<ProofRow>(
        `SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND mintUrl = ? AND secret IN (${placeholders})`,
        [this.db.localName, mintUrl, ...secretBatch],
      );

      for (const row of rows) {
        proofsBySecret.set(row.secret, rowToProof(row));
      }
    }

    return uniqueSecrets.flatMap((secret) => {
      const proof = proofsBySecret.get(secret);
      return proof ? [proof] : [];
    });
  }

  async getProofsByOperationId(mintUrl: string, operationId: string): Promise<CoreProof[]> {
    const rows = await this.db.all<ProofRow>(
      `SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND mintUrl = ? AND (usedByOperationId = ? OR createdByOperationId = ?)`,
      [this.db.localName, mintUrl, operationId, operationId],
    );
    return rows.map(rowToProof);
  }

  async getAvailableProofs(mintUrl: string, filter?: ProofUnitFilter): Promise<CoreProof[]> {
    const params: unknown[] = [this.db.localName, mintUrl];
    const rows = await this.db.all<ProofRow>(
      appendUnitFilter(
        `SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND mintUrl = ? AND state = 'ready' AND usedByOperationId IS NULL`,
        params,
        filter,
      ),
      params,
    );
    return rows.map(rowToProof);
  }

  async getReservedProofs(): Promise<CoreProof[]> {
    const rows = await this.db.all<ProofRow>(
      `SELECT ${PROOF_COLUMNS} FROM coco_cashu_proofs WHERE local_name = ? AND state = 'ready' AND usedByOperationId IS NOT NULL`,
      [this.db.localName],
    );
    return rows.map(rowToProof);
  }
}
