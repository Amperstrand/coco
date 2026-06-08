import type { AuthSessionRepository, AuthSession } from '@cashu/coco-core';
import { deserializeAmount } from '@cashu/coco-core';
import type { D1Db } from '../db.ts';

interface AuthSessionRow {
  mintUrl: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  scope: string | null;
  batPoolJson: string | null;
}

function parseBatPool(batPoolJson: string | null): AuthSession['batPool'] {
  if (!batPoolJson) return undefined;
  const proofs = JSON.parse(batPoolJson) as AuthSession['batPool'];
  return proofs?.map((proof) => ({
    ...proof,
    amount: deserializeAmount(proof.amount),
  }));
}

function rowToSession(row: AuthSessionRow): AuthSession {
  return {
    mintUrl: row.mintUrl,
    accessToken: row.accessToken,
    refreshToken: row.refreshToken ?? undefined,
    expiresAt: row.expiresAt,
    scope: row.scope ?? undefined,
    batPool: parseBatPool(row.batPoolJson),
  };
}

export class D1AuthSessionRepository implements AuthSessionRepository {
  private readonly db: D1Db;

  constructor(db: D1Db) {
    this.db = db;
  }

  async getSession(mintUrl: string): Promise<AuthSession | null> {
    const row = await this.db.get<AuthSessionRow>(
      'SELECT mintUrl, accessToken, refreshToken, expiresAt, scope, batPoolJson FROM coco_cashu_auth_sessions WHERE local_name = ? AND mintUrl = ? LIMIT 1',
      [this.db.localName, mintUrl],
    );
    if (!row) return null;
    return rowToSession(row);
  }

  async saveSession(session: AuthSession): Promise<void> {
    await this.db.run(
      `INSERT INTO coco_cashu_auth_sessions (local_name, mintUrl, accessToken, refreshToken, expiresAt, scope, batPoolJson)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(local_name, mintUrl) DO UPDATE SET
         accessToken=excluded.accessToken,
         refreshToken=excluded.refreshToken,
         expiresAt=excluded.expiresAt,
         scope=excluded.scope,
         batPoolJson=excluded.batPoolJson`,
      [
        this.db.localName,
        session.mintUrl,
        session.accessToken,
        session.refreshToken ?? null,
        session.expiresAt,
        session.scope ?? null,
        session.batPool ? JSON.stringify(session.batPool) : null,
      ],
    );
  }

  async deleteSession(mintUrl: string): Promise<void> {
    await this.db.run('DELETE FROM coco_cashu_auth_sessions WHERE local_name = ? AND mintUrl = ?', [this.db.localName, mintUrl]);
  }

  async getAllSessions(): Promise<AuthSession[]> {
    const rows = await this.db.all<AuthSessionRow>(
      'SELECT mintUrl, accessToken, refreshToken, expiresAt, scope, batPoolJson FROM coco_cashu_auth_sessions WHERE local_name = ?',
      [this.db.localName],
    );
    return rows.map(rowToSession);
  }
}
